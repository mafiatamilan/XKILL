output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = { for k, s in aws_subnet.public : k => s.id }
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = { for k, s in aws_subnet.private : k => s.id }
}

output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways"
  value       = { for k, n in aws_nat_gateway.this : k => n.id }
}
