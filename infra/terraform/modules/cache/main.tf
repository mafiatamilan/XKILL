resource "aws_security_group" "this" {
  name        = "xkill-${var.environment}-redis"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    cidr_blocks     = var.allowed_cidr_blocks
    security_groups = var.allowed_security_group_ids
    self            = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "xkill-${var.environment}-redis"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_elasticache_subnet_group" "this" {
  name        = "xkill-${var.environment}-redis-subnet"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name        = "xkill-${var.environment}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id        = "xkill-${var.environment}"
  description                 = "Redis cluster for xkill ${var.environment}"
  node_type                   = var.node_type
  engine                      = "redis"
  engine_version              = var.engine_version
  port                        = 6379
  subnet_group_name           = aws_elasticache_subnet_group.this.name
  security_group_ids          = [aws_security_group.this.id]
  automatic_failover_enabled  = var.cluster_mode_enabled
  multi_az_enabled            = var.cluster_mode_enabled

  dynamic "cluster_mode" {
    for_each = var.cluster_mode_enabled ? [1] : []
    content {
      replicas_per_node_group = var.replicas_per_shard
      num_node_groups         = var.num_shards
    }
  }

  number_cache_clusters = var.cluster_mode_enabled ? null : var.num_cache_nodes

  tags = {
    Name        = "xkill-${var.environment}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}
