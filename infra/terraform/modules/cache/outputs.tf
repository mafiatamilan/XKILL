output "endpoint" {
  description = "The primary endpoint of the Redis cluster"
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint" {
  description = "The reader endpoint of the Redis cluster"
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  description = "The port of the Redis cluster"
  value       = aws_elasticache_replication_group.this.port
}

output "security_group_id" {
  description = "The ID of the Redis security group"
  value       = aws_security_group.this.id
}
