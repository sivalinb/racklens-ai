terraform {
  required_version = ">= 1.6.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 8.29"
    }
  }
}

provider "oci" {
  tenancy_ocid        = var.oci_auth == "InstancePrincipal" ? null : var.tenancy_ocid
  region              = var.region
  auth                = var.oci_auth
  config_file_profile = contains(["APIKey", "SecurityToken"], var.oci_auth) ? var.oci_profile : null
}
