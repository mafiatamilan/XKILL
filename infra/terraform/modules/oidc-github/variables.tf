variable "environment" {
  description = "Environment name for tagging"
  type        = string
}

variable "github_org" {
  description = "GitHub organization name"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "role_name" {
  description = "Name of the IAM role"
  type        = string
  default     = null
}

variable "additional_policy_arns" {
  description = "List of additional IAM policy ARNs to attach to the role"
  type        = list(string)
  default     = []
}
