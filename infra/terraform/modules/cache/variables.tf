variable "environment" {
  description = "Environment name for tagging"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for the security group"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the cache subnet group"
  type        = list(string)
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "num_cache_nodes" {
  description = "Number of cache nodes (if cluster mode is disabled)"
  type        = number
  default     = 1
}

variable "cluster_mode_enabled" {
  description = "Whether to enable cluster mode"
  type        = bool
  default     = false
}

variable "num_shards" {
  description = "Number of shards (cluster mode only)"
  type        = number
  default     = 1
}

variable "replicas_per_shard" {
  description = "Replicas per shard (cluster mode only)"
  type        = number
  default     = 1
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the cache"
  type        = list(string)
  default     = []
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to access the cache"
  type        = list(string)
  default     = []
}
