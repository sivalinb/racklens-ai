variable "tenancy_ocid" {
  description = "OCI tenancy OCID shown in the Tenancy details page."
  type        = string
}

variable "region" {
  description = "Home region in which to create the lab, for example us-phoenix-1."
  type        = string
}

variable "ssh_public_key" {
  description = "Public SSH key only. Never provide a private key."
  type        = string
}

variable "operator_cidr" {
  description = "Your current public IP as a single-host CIDR, for example 203.0.113.4/32."
  type        = string
  validation {
    condition     = can(cidrhost(var.operator_cidr, 0)) && endswith(var.operator_cidr, "/32")
    error_message = "operator_cidr must be a single IPv4 /32 CIDR."
  }
}

variable "budget_alert_email" {
  description = "Email for $1 and $5 monthly budget alerts. Leave blank to skip budget resources."
  type        = string
  default     = ""
}

variable "parent_compartment_ocid" {
  description = "Parent compartment. Defaults to the tenancy root."
  type        = string
  default     = ""
}

variable "availability_domain_index" {
  description = "Try another index if A1 capacity is unavailable."
  type        = number
  default     = 0
}

variable "repository_url" {
  description = "Public RackLens repository cloned by cloud-init."
  type        = string
  default     = "https://github.com/sivalinb/racklens-ai.git"
}

variable "repository_ref" {
  description = "Git branch or tag deployed to OCI."
  type        = string
  default     = "main"
}

variable "oci_auth" {
  description = "Cloud Shell Terraform uses InstancePrincipal with its on-behalf-of-user delegation token; use SecurityToken or APIKey only with a configured OCI CLI profile."
  type        = string
  default     = "InstancePrincipal"
}

variable "oci_profile" {
  description = "OCI CLI config profile used by Terraform."
  type        = string
  default     = "DEFAULT"
}
