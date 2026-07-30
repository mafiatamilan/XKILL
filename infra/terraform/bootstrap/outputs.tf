output "bucket_id" {
  description = "ID of the S3 bucket for remote state"
  value       = aws_s3_bucket.state.id
}

output "table_name" {
  description = "Name of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.state_lock.name
}
