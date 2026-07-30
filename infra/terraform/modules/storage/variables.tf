variable "environment" {
  description = "Environment name for tagging"
  type        = string
}

variable "buckets" {
  description = "Map of bucket names to bucket configuration"
  type = map(object({
    versioning_enabled       = optional(bool, true)
    force_destroy            = optional(bool, false)
    lifecycle_rule_enabled   = optional(bool, false)
    lifecycle_expiration_days = optional(number, 90)
  }))
}
