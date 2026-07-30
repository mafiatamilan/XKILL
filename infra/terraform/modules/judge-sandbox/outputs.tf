output "security_group_id" {
  description = "ID of the judge sandbox security group"
  value       = aws_security_group.this.id
}

output "task_role_arn" {
  description = "ARN of the judge sandbox task IAM role"
  value       = aws_iam_role.task.arn
}

output "task_role_name" {
  description = "Name of the judge sandbox task IAM role"
  value       = aws_iam_role.task.name
}

output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.this.name
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.this.name
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.this.name
}
