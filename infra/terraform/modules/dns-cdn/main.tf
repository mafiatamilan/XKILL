locals {
  subdomain = var.environment == "prod" ? var.domain_name : "${var.environment}.${var.domain_name}"
}

resource "aws_route53_zone" "this" {
  name = local.subdomain

  tags = {
    Name        = local.subdomain
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_acm_certificate" "cloudfront" {
  domain_name       = local.subdomain
  validation_method = "DNS"
  provider          = aws.acm

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${local.subdomain}-cloudfront"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = aws_route53_zone.this.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "cloudfront" {
  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
  provider                = aws.acm
  timeouts {
    create = "10m"
  }
}

resource "aws_wafv2_web_acl" "this" {
  count = var.waf_enabled ? 1 : 0

  name        = "xkill-${var.environment}-waf"
  description = "WAF ACL for xkill ${var.environment}"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "xkill-${var.environment}-common-rules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesAmazonIpReputationList"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "xkill-${var.environment}-ip-reputation"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "xkill-${var.environment}-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "xkill-${var.environment}-waf"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_cloudfront_distribution" "this" {
  aliases = [local.subdomain]

  origin {
    domain_name = var.alb_dns_name
    origin_id   = "alb-${var.environment}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_keepalive_timeout = 60
      origin_read_timeout      = 60
    }
    origin_access_control_id = aws_cloudfront_origin_access_control.default.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "xkill ${var.environment} CloudFront distribution"
  price_class         = var.cloudfront_price_class
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-${var.environment}"

    forwarded_values {
      query_string = true
      headers      = ["*"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0

    compress = true
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cloudfront.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  web_acl_id = var.waf_enabled ? aws_wafv2_web_acl.this[0].arn : null

  tags = {
    Name        = "xkill-${var.environment}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_cloudfront_origin_access_control" "default" {
  name                              = "xkill-${var.environment}-oac"
  description                       = "OAC for ${var.environment}"
  origin_access_control_origin_type = "elb"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_route53_record" "alb" {
  zone_id = aws_route53_zone.this.zone_id
  name    = local.subdomain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}
