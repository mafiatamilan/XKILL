output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.this.name
}

output "service_arn" {
  description = "ARN of the ECS service"
  value       = aws_ecs_service.this.id
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.this.name
}

output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.this.arn
}

output "task_role_arn" {
  description = "ARN of the task IAM role"
  value       = aws_iam_role.task.arn
}

output "task_role_name" {
  description = "Name of the task IAM role"
  value       = aws_iam_role.task.name
}

output "execution_role_arn" {
  description = "ARN of the execution IAM role"
  value       = aws_iam_role.execution.arn
}

output "alb_dns" {
  description = "DNS name of the ALB"
  value       = aws_lb.this.dns_name
}

output "alb_arn" {
  description = "ARN of the ALB"
  value       = aws_lb.this.arn
}

output "alb_zone_id" {
  description = "Route53 zone ID of the ALB"
  value       = aws_lb.this.zone_id
}

output "security_group_id" {
  description = "ID of the ECS tasks security group"
  value       = aws_security_group.ecs.id
}

output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.this.name
}
