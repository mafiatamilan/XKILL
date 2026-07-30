variable "environment" {
  description = "Environment name for tagging"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application (e.g., xkill.io)"
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the ALB"
  type        = string
}

variable "alb_zone_id" {
  description = "Route53 zone ID of the ALB"
  type        = string
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}

variable "waf_enabled" {
  description = "Whether to enable WAF association"
  type        = bool
  default     = true
}
