output "cloudfront_domain" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.domain_name
}

output "cloudfront_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.this.id
}

output "route53_zone_id" {
  description = "ID of the Route53 hosted zone"
  value       = aws_route53_zone.this.zone_id
}

output "route53_zone_name" {
  description = "Name of the Route53 hosted zone"
  value       = aws_route53_zone.this.name
}

output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.cloudfront.arn
}

output "waf_acl_arn" {
  description = "ARN of the WAF web ACL"
  value       = var.waf_enabled ? aws_wafv2_web_acl.this[0].arn : null
}
