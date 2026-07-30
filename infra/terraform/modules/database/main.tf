resource "aws_security_group" "this" {
  name        = "xkill-${var.environment}-rds"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    cidr_blocks     = var.allowed_cidr_blocks
    security_groups = var.allowed_security_group_ids
    self            = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "xkill-${var.environment}-rds"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_db_subnet_group" "this" {
  name        = "xkill-${var.environment}-db-subnet"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name        = "xkill-${var.environment}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_db_instance" "this" {
  identifier             = "xkill-${var.environment}"
  engine                 = "postgres"
  engine_version         = var.engine_version
  instance_class         = var.instance_class
  allocated_storage      = var.allocated_storage
  max_allocated_storage  = var.max_allocated_storage
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  multi_az               = var.multi_az
  backup_retention_period = var.backup_retention_period
  deletion_protection    = var.deletion_protection
  skip_final_snapshot    = var.skip_final_snapshot

  tags = {
    Name        = "xkill-${var.environment}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}
