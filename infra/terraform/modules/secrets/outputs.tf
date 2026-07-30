output "secret_arns" {
  description = "Map of secret names to their ARNs"
  value       = { for k, s in aws_secretsmanager_secret.this : k => s.arn }
}

output "secret_ids" {
  description = "Map of secret names to their IDs"
  value       = { for k, s in aws_secretsmanager_secret.this : k => s.id }
}
