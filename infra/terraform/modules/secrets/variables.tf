variable "environment" {
  description = "Environment name for tagging"
  type        = string
}

variable "secrets" {
  description = "Map of secret names to their initial values (plaintext or JSON)"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "json_file_path" {
  description = "Path to a local JSON file containing secrets (name: value pairs)"
  type        = string
  default     = null
}

variable "recovery_window_in_days" {
  description = "Number of days that AWS Secrets Manager waits before deleting a secret"
  type        = number
  default     = 7
}
