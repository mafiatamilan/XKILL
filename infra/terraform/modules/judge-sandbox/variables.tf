variable "environment" {
  description = "Environment name for tagging"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for the security group"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "service_name" {
  description = "Name of the judge sandbox service"
  type        = string
  default     = "judge-sandbox"
}

variable "image" {
  description = "Docker image URI for the judge sandbox task"
  type        = string
}

variable "cpu" {
  description = "CPU units for the Fargate task"
  type        = number
  default     = 1024
}

variable "memory" {
  description = "Memory in MiB for the Fargate task"
  type        = number
  default     = 2048
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 0
}

variable "min_capacity" {
  description = "Minimum number of tasks for autoscaling"
  type        = number
  default     = 0
}

variable "max_capacity" {
  description = "Maximum number of tasks for autoscaling"
  type        = number
  default     = 10
}

variable "env_vars" {
  description = "List of environment variables for the container"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "secrets" {
  description = "List of secrets for the container"
  type = list(object({
    name      = string
    value_from = string
  }))
  default = []
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to send traffic to judge sandbox"
  type        = list(string)
  default     = []
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}
