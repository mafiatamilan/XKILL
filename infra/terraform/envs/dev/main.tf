terraform {
  required_version = "~> 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "xkill-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "xkill-terraform-state-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = merge(var.tags, {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
    })
  }
}

provider "aws" {
  alias  = "acm"
  region = "us-east-1"

  default_tags {
    tags = merge(var.tags, {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "Terraform"
    })
  }
}

module "network" {
  source = "../../modules/network"

  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  azs                  = var.azs
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  single_nat_gateway   = var.single_nat_gateway
}

module "database" {
  source = "../../modules/database"

  environment              = var.environment
  vpc_id                   = module.network.vpc_id
  private_subnet_ids       = values(module.network.private_subnet_ids)
  db_name                  = var.db_name
  db_username              = var.db_username
  db_password              = var.db_password
  instance_class           = var.db_instance_class
  multi_az                 = var.db_multi_az
  deletion_protection      = var.db_deletion_protection
  skip_final_snapshot      = var.db_skip_final_snapshot
  allowed_security_group_ids = [module.compute.security_group_id]
}

module "cache" {
  source = "../../modules/cache"

  environment              = var.environment
  vpc_id                   = module.network.vpc_id
  private_subnet_ids       = values(module.network.private_subnet_ids)
  node_type                = var.redis_node_type
  cluster_mode_enabled     = var.redis_cluster_mode_enabled
  allowed_security_group_ids = [module.compute.security_group_id]
}

module "storage" {
  source = "../../modules/storage"

  environment = var.environment
  buckets     = var.bucket_configs
}

module "compute" {
  source = "../../modules/compute"

  environment        = var.environment
  vpc_id             = module.network.vpc_id
  public_subnet_ids  = values(module.network.public_subnet_ids)
  private_subnet_ids = values(module.network.private_subnet_ids)
  service_name       = "api"
  image              = var.api_image
  cpu                = var.api_cpu
  memory             = var.api_memory
  desired_count      = var.api_desired_count
  min_capacity       = var.api_min_capacity
  max_capacity       = var.api_max_capacity
  container_port     = 8080
  health_check_path  = "/health"
  env_vars = [
    { name = "DB_HOST", value = module.database.endpoint },
    { name = "DB_PORT", value = tostring(module.database.port) },
    { name = "DB_NAME", value = module.database.db_name },
    { name = "DB_USER", value = module.database.db_username },
    { name = "REDIS_HOST", value = module.cache.endpoint },
    { name = "REDIS_PORT", value = tostring(module.cache.port) },
    { name = "ENVIRONMENT", value = var.environment },
  ]
}

module "judge_sandbox" {
  source = "../../modules/judge-sandbox"

  environment              = var.environment
  vpc_id                   = module.network.vpc_id
  private_subnet_ids       = values(module.network.private_subnet_ids)
  service_name             = "judge-sandbox"
  image                    = var.judge_image
  cpu                      = var.judge_cpu
  memory                   = var.judge_memory
  desired_count            = var.judge_desired_count
  min_capacity             = var.judge_min_capacity
  max_capacity             = var.judge_max_capacity
  allowed_security_group_ids = [module.compute.security_group_id]
}

module "secrets" {
  source = "../../modules/secrets"

  environment = var.environment
  secrets     = var.secrets
}

module "oidc_github" {
  count = var.github_org != null && var.github_repo != null ? 1 : 0

  source = "../../modules/oidc-github"

  environment = var.environment
  github_org  = var.github_org
  github_repo = var.github_repo
  additional_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonECS_FullAccess",
    "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
    "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess",
  ]
}

module "dns_cdn" {
  count = var.domain_name != null ? 1 : 0

  source = "../../modules/dns-cdn"

  environment          = var.environment
  domain_name          = var.domain_name
  alb_dns_name         = module.compute.alb_dns
  alb_zone_id          = module.compute.alb_zone_id
  cloudfront_price_class = "PriceClass_100"
  waf_enabled          = false

  providers = {
    aws.acm = aws.acm
  }
}
