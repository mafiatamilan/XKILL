variable "region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

variable "project" {
  description = "Project name"
  type        = string
  default     = "xkill"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.1.0.0/16"
}

variable "azs" {
  description = "List of Availability Zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.1.10.0/24", "10.1.11.0/24", "10.1.12.0/24"]
}

variable "single_nat_gateway" {
  description = "Whether to use a single NAT Gateway"
  type        = bool
  default     = false
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.large"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "xkill"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "xkill_admin"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "db_multi_az" {
  description = "Whether to enable Multi-AZ for RDS"
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Whether to enable deletion protection for RDS"
  type        = bool
  default     = true
}

variable "db_skip_final_snapshot" {
  description = "Whether to skip the final snapshot on RDS deletion"
  type        = bool
  default     = false
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.small"
}

variable "redis_cluster_mode_enabled" {
  description = "Whether to enable cluster mode for Redis"
  type        = bool
  default     = false
}

variable "api_image" {
  description = "Docker image URI for the API service"
  type        = string
}

variable "api_cpu" {
  description = "CPU units for the API Fargate task"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory in MiB for the API Fargate task"
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 2
}

variable "api_min_capacity" {
  description = "Minimum number of API tasks for autoscaling"
  type        = number
  default     = 2
}

variable "api_max_capacity" {
  description = "Maximum number of API tasks for autoscaling"
  type        = number
  default     = 10
}

variable "judge_image" {
  description = "Docker image URI for the judge sandbox service"
  type        = string
}

variable "judge_cpu" {
  description = "CPU units for the judge Fargate task"
  type        = number
  default     = 1024
}

variable "judge_memory" {
  description = "Memory in MiB for the judge Fargate task"
  type        = number
  default     = 2048
}

variable "judge_desired_count" {
  description = "Desired number of judge tasks"
  type        = number
  default     = 1
}

variable "judge_min_capacity" {
  description = "Minimum number of judge tasks for autoscaling"
  type        = number
  default     = 1
}

variable "judge_max_capacity" {
  description = "Maximum number of judge tasks for autoscaling"
  type        = number
  default     = 20
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = null
}

variable "bucket_configs" {
  description = "Map of S3 bucket configurations"
  type = map(object({
    versioning_enabled        = optional(bool, true)
    force_destroy             = optional(bool, false)
    lifecycle_rule_enabled    = optional(bool, false)
    lifecycle_expiration_days = optional(number, 90)
  }))
  default = {
    "xkill-uploads-staging" = {
      versioning_enabled = true
      force_destroy      = false
    }
    "xkill-assets-staging" = {
      versioning_enabled = true
      force_destroy      = false
    }
    "xkill-logs-staging" = {
      versioning_enabled         = true
      force_destroy              = false
      lifecycle_rule_enabled     = true
      lifecycle_expiration_days  = 90
    }
  }
}

variable "secrets" {
  description = "Map of secret names to their initial values"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "github_org" {
  description = "GitHub organization name"
  type        = string
  default     = null
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}
