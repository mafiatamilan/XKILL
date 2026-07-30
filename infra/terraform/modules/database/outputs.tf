output "endpoint" {
  description = "The connection endpoint of the RDS instance"
  value       = aws_db_instance.this.endpoint
}

output "port" {
  description = "The port of the RDS instance"
  value       = aws_db_instance.this.port
}

output "security_group_id" {
  description = "The ID of the RDS security group"
  value       = aws_security_group.this.id
}

output "db_name" {
  description = "The name of the database"
  value       = aws_db_instance.this.db_name
}

output "db_username" {
  description = "The master username"
  value       = aws_db_instance.this.username
}

output "arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.this.arn
}
