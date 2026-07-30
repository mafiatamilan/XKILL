variable "region" {
  description = "AWS region for bootstrap resources"
  type        = string
}

variable "bucket_name" {
  description = "Name of the S3 bucket for Terraform remote state"
  type        = string
}

variable "table_name" {
  description = "Name of the DynamoDB table for state locking"
  type        = string
  default     = "xkill-terraform-state-lock"
}
