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
  tenancy_ocid        = var.tenancy_ocid
  region              = var.region
  auth                = var.oci_auth
  config_file_profile = var.oci_profile
}
