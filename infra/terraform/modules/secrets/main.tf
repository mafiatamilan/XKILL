locals {
  secrets_map = var.json_file_path != null ? jsondecode(file(var.json_file_path)) : var.secrets
}

resource "aws_secretsmanager_secret" "this" {
  for_each = local.secrets_map

  name                    = "xkill/${var.environment}/${each.key}"
  recovery_window_in_days = var.recovery_window_in_days

  tags = {
    Name        = "xkill/${var.environment}/${each.key}"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_secretsmanager_secret_version" "this" {
  for_each = local.secrets_map

  secret_id     = aws_secretsmanager_secret.this[each.key].id
  secret_string = each.value
}
