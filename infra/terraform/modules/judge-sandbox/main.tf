locals {
  prefix = "xkill-${var.environment}-${var.service_name}"
}

resource "aws_ecs_cluster" "this" {
  name = local.prefix

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = local.prefix
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_cloudwatch_log_group" "this" {
  name = "/ecs/${local.prefix}"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${local.prefix}-logs"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_ecs_task_definition" "this" {
  family                   = local.prefix
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = var.service_name
      image     = var.image
      essential = true
      environment  = var.env_vars
      secrets      = length(var.secrets) > 0 ? var.secrets : null
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = var.service_name
        }
      }
      linuxParameters = {
        capabilities = {
          add = ["SYS_PTRACE"]
        }
      }
    }
  ])

  tags = {
    Name        = local.prefix
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

data "aws_region" "current" {}

resource "aws_iam_role" "execution" {
  name_prefix = "${local.prefix}-exec-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${local.prefix}-execution"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task" {
  name_prefix = "${local.prefix}-task-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${local.prefix}-task"
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_security_group" "this" {
  name_prefix = "${local.prefix}-"
  description = "Security group for judge sandbox - no outbound egress"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    self            = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = []
  }

  tags = {
    Name        = local.prefix
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.this.id]
    assign_public_ip = false
  }

  tags = {
    Name        = local.prefix
    Environment = var.environment
    Project     = "xkill"
    ManagedBy   = "Terraform"
  }
}

resource "aws_appautoscaling_target" "this" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.this.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${local.prefix}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this.resource_id
  scalable_dimension = aws_appautoscaling_target.this.scalable_dimension
  service_namespace  = aws_appautoscaling_target.this.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
