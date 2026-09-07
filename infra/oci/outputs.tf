output "compartment_ocid" {
  value = oci_identity_compartment.racklens.id
}

output "instance_ocid" {
  value = oci_core_instance.racklens.id
}

output "instance_private_ip" {
  value = oci_core_instance.racklens.private_ip
}

output "instance_public_ip_for_egress_only" {
  value       = oci_core_instance.racklens.public_ip
  description = "The NSG exposes no public inbound ports; use OCI Bastion."
}

output "bastion_ocid" {
  value = oci_bastion_bastion.racklens.id
}

output "evaluation_bucket" {
  value = oci_objectstorage_bucket.evaluations.name
}

output "post_apply" {
  value = "Wait for cloud-init, create a Bastion managed SSH session to ${oci_core_instance.racklens.private_ip}:22, then run sudo /opt/racklens/infra/oci/scripts/configure-secrets.sh"
}
