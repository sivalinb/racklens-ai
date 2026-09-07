locals {
  parent_compartment_id = var.parent_compartment_ocid != "" ? var.parent_compartment_ocid : var.tenancy_ocid
  name_prefix           = "racklens"
  budget_enabled        = var.budget_alert_email != ""
}

resource "oci_identity_compartment" "racklens" {
  compartment_id = local.parent_compartment_id
  name           = "racklens-lab"
  description    = "Isolated Always Free RackLens AI reliability lab"
  enable_delete  = true
}

data "oci_identity_availability_domains" "available" {
  compartment_id = var.tenancy_ocid
}

data "oci_core_images" "oracle_linux" {
  compartment_id           = oci_identity_compartment.racklens.id
  operating_system         = "Oracle Linux"
  operating_system_version = "9"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_vcn" "racklens" {
  compartment_id = oci_identity_compartment.racklens.id
  cidr_blocks    = ["10.20.0.0/16"]
  display_name   = "racklens-vcn"
  dns_label      = "racklens"
}

resource "oci_core_internet_gateway" "racklens" {
  compartment_id = oci_identity_compartment.racklens.id
  vcn_id         = oci_core_vcn.racklens.id
  display_name   = "racklens-egress"
  enabled        = true
}

resource "oci_core_route_table" "racklens" {
  compartment_id = oci_identity_compartment.racklens.id
  vcn_id         = oci_core_vcn.racklens.id
  display_name   = "racklens-public-route"
  route_rules {
    network_entity_id = oci_core_internet_gateway.racklens.id
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
  }
}

resource "oci_core_network_security_group" "racklens" {
  compartment_id = oci_identity_compartment.racklens.id
  vcn_id         = oci_core_vcn.racklens.id
  display_name   = "racklens-no-public-ingress"
}

resource "oci_core_network_security_group_security_rule" "egress" {
  network_security_group_id = oci_core_network_security_group.racklens.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  description               = "Outbound HTTPS, package and image access"
}

resource "oci_core_network_security_group_security_rule" "bastion_ssh" {
  network_security_group_id = oci_core_network_security_group.racklens.id
  direction                 = "INGRESS"
  protocol                  = "6"
  source                    = oci_core_vcn.racklens.cidr_blocks[0]
  source_type               = "CIDR_BLOCK"
  description               = "SSH from OCI Bastion inside the VCN only"
  tcp_options {
    destination_port_range {
      min = 22
      max = 22
    }
  }
}

resource "oci_core_subnet" "racklens" {
  compartment_id             = oci_identity_compartment.racklens.id
  vcn_id                     = oci_core_vcn.racklens.id
  cidr_block                 = "10.20.10.0/24"
  display_name               = "racklens-subnet"
  dns_label                  = "edge"
  route_table_id             = oci_core_route_table.racklens.id
  prohibit_public_ip_on_vnic = false
  security_list_ids          = []
}

resource "oci_objectstorage_bucket" "evaluations" {
  compartment_id = oci_identity_compartment.racklens.id
  namespace      = data.oci_objectstorage_namespace.current.namespace
  name           = "racklens-evaluations-${substr(oci_identity_compartment.racklens.id, -8, 8)}"
  access_type    = "NoPublicAccess"
  versioning     = "Enabled"
  storage_tier   = "Standard"
}

data "oci_objectstorage_namespace" "current" {
  compartment_id = var.tenancy_ocid
}

resource "oci_core_instance" "racklens" {
  availability_domain = data.oci_identity_availability_domains.available.availability_domains[var.availability_domain_index].name
  compartment_id      = oci_identity_compartment.racklens.id
  display_name        = "racklens-edge"
  shape               = "VM.Standard.A1.Flex"
  shape_config {
    ocpus         = 2
    memory_in_gbs = 12
  }
  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.oracle_linux.images[0].id
    boot_volume_size_in_gbs = 100
  }
  create_vnic_details {
    subnet_id        = oci_core_subnet.racklens.id
    assign_public_ip = true
    nsg_ids          = [oci_core_network_security_group.racklens.id]
    display_name     = "racklens-edge-vnic"
    hostname_label   = "racklens-edge"
  }
  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data = base64encode(templatefile("${path.module}/cloud-init.yaml.tftpl", {
      repository_url = var.repository_url
      repository_ref = var.repository_ref
    }))
  }
  instance_options {
    are_legacy_imds_endpoints_disabled = true
  }
  preserve_boot_volume = false
}

resource "oci_bastion_bastion" "racklens" {
  compartment_id               = oci_identity_compartment.racklens.id
  target_subnet_id             = oci_core_subnet.racklens.id
  name                         = "racklens-bastion"
  bastion_type                 = "STANDARD"
  client_cidr_block_allow_list = [var.operator_cidr]
  max_session_ttl_in_seconds   = 10800
}

resource "oci_identity_dynamic_group" "racklens" {
  compartment_id = var.tenancy_ocid
  name           = "racklens-edge-${substr(oci_identity_compartment.racklens.id, -8, 8)}"
  description    = "RackLens edge instance principal"
  matching_rule  = "ALL {instance.id = '${oci_core_instance.racklens.id}'}"
}

resource "oci_identity_policy" "racklens" {
  compartment_id = var.tenancy_ocid
  name           = "racklens-edge-policy-${substr(oci_identity_compartment.racklens.id, -8, 8)}"
  description    = "Least-privilege evidence and custom metric publishing"
  statements = [
    "Allow dynamic-group ${oci_identity_dynamic_group.racklens.name} to manage objects in compartment id ${oci_identity_compartment.racklens.id} where target.bucket.name = '${oci_objectstorage_bucket.evaluations.name}'",
    "Allow dynamic-group ${oci_identity_dynamic_group.racklens.name} to use metrics in compartment id ${oci_identity_compartment.racklens.id}",
  ]
}

resource "oci_budget_budget" "racklens" {
  count          = local.budget_enabled ? 1 : 0
  compartment_id = var.tenancy_ocid
  amount         = 5
  reset_period   = "MONTHLY"
  description    = "RackLens guardrail; architecture targets Always Free limits"
  display_name   = "racklens-monthly-guardrail"
  target_type    = "COMPARTMENT"
  targets        = [oci_identity_compartment.racklens.id]
}

resource "oci_budget_alert_rule" "one_dollar" {
  count          = local.budget_enabled ? 1 : 0
  budget_id      = oci_budget_budget.racklens[0].id
  type           = "ACTUAL"
  threshold      = 1
  threshold_type = "ABSOLUTE"
  recipients     = var.budget_alert_email
  description    = "Warn as soon as RackLens actual spend reaches $1"
  display_name   = "racklens-one-dollar-warning"
}

resource "oci_budget_alert_rule" "five_dollars" {
  count          = local.budget_enabled ? 1 : 0
  budget_id      = oci_budget_budget.racklens[0].id
  type           = "ACTUAL"
  threshold      = 5
  threshold_type = "ABSOLUTE"
  recipients     = var.budget_alert_email
  description    = "Critical warning when RackLens actual spend reaches $5"
  display_name   = "racklens-five-dollar-warning"
}
