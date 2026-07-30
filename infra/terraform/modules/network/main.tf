locals {
  nat_gateway_count = var.single_nat_gateway ? 1 : length(var.azs)
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "xkill-${var.environment}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name        = "xkill-${var.environment}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_subnet" "public" {
  for_each = { for idx, cidr in var.public_subnet_cidrs : idx => {
    cidr = cidr
    az   = var.azs[idx]
  } }

  vpc_id                  = aws_vpc.this.id
  cidr_block              = each.value.cidr
  availability_zone       = each.value.az
  map_public_ip_on_launch = true

  tags = {
    Name        = "xkill-${var.environment}-public-${each.value.az}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_subnet" "private" {
  for_each = { for idx, cidr in var.private_subnet_cidrs : idx => {
    cidr = cidr
    az   = var.azs[idx]
  } }

  vpc_id            = aws_vpc.this.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name        = "xkill-${var.environment}-private-${each.value.az}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_eip" "nat" {
  for_each = { for idx in range(local.nat_gateway_count) : idx => idx }

  domain = "vpc"

  tags = {
    Name        = "xkill-${var.environment}-nat-${each.key}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_nat_gateway" "this" {
  for_each = { for idx in range(local.nat_gateway_count) : idx => idx }

  allocation_id = aws_eip.nat[each.key].id
  subnet_id     = aws_subnet.public[each.key].id

  tags = {
    Name        = "xkill-${var.environment}-nat-${each.key}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = {
    Name        = "xkill-${var.environment}-public"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_route_table" "private" {
  for_each = { for idx in range(local.nat_gateway_count) : idx => idx }

  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this[each.key].id
  }

  tags = {
    Name        = "xkill-${var.environment}-private-${each.key}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_route_table_association" "public" {
  for_each = aws_subnet.public

  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  for_each = aws_subnet.private

  subnet_id      = each.value.id
  route_table_id = local.nat_gateway_count == 1 ? aws_route_table.private["0"].id : aws_route_table.private[each.key].id
}
