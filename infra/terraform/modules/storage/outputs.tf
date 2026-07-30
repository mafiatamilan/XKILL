output "bucket_map" {
  description = "Map of bucket names to bucket IDs and ARNs"
  value = {
    for k, b in aws_s3_bucket.this : k => {
      id  = b.id
      arn = b.arn
    }
  }
}

output "bucket_ids" {
  description = "List of bucket IDs"
  value       = [for b in aws_s3_bucket.this : b.id]
}

output "bucket_arns" {
  description = "List of bucket ARNs"
  value       = [for b in aws_s3_bucket.this : b.arn]
}
