variable "environment" {
  description = "Environment name for tagging"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for security groups and ALB"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for the ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "image" {
  description = "Docker image URI for the task definition"
  type        = string
}

variable "cpu" {
  description = "CPU units for the Fargate task"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory in MiB for the Fargate task"
  type        = number
  default     = 512
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 80
}

variable "desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

variable "min_capacity" {
  description = "Minimum number of tasks for autoscaling"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks for autoscaling"
  type        = number
  default     = 5
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

variable "health_check_path" {
  description = "Path for ALB health check"
  type        = string
  default     = "/health"
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS listener"
  type        = string
  default     = null
}

variable "domain_name" {
  description = "Domain name for the ALB"
  type        = string
  default     = null
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}
