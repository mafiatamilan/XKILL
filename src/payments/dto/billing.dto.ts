import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsBoolean,
  Min,
  Max,
  IsDateString,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Plans ──────────────────────────────────────────────────────────────────

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro Monthly' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Full access to all premium features' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 499, description: 'Amount in INR' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  interval?: number;

  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly', 'yearly'], default: 'monthly' })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  intervalUnit?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  features?: string[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class PlanResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string | null;
  @ApiProperty() amount: number;
  @ApiProperty() currency: string;
  @ApiProperty() interval: number;
  @ApiProperty() intervalUnit: string;
  @ApiProperty({ type: [String] }) features: string[];
  @ApiProperty() isActive: boolean;
  @ApiProperty() sortOrder: number;
}

// ── Subscriptions ──────────────────────────────────────────────────────────

export class SubscribeDto {
  @ApiProperty({ description: 'Plan ID to subscribe to' })
  @IsString()
  planId: string;

  @ApiPropertyOptional({ description: 'Coupon code to apply' })
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Cancel immediately or at period end', default: false })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;
}

export class SubscriptionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() planId: string;
  @ApiProperty() status: string;
  @ApiProperty() currentPeriodStart: Date | null;
  @ApiProperty() currentPeriodEnd: Date | null;
  @ApiProperty() cancelAtPeriodEnd: boolean;
  @ApiProperty() createdAt: Date;
}

// ── Invoices ───────────────────────────────────────────────────────────────

export class InvoiceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() amount: number;
  @ApiProperty() currency: string;
  @ApiProperty() status: string;
  @ApiProperty() description: string | null;
  @ApiProperty() dueDate: Date | null;
  @ApiProperty() paidAt: Date | null;
  @ApiProperty() createdAt: Date;
}

// ── Coupons ────────────────────────────────────────────────────────────────

export class CreateCouponDto {
  @ApiProperty({ example: 'WELCOME20' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: '20% off first month' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['percentage', 'fixed'] })
  @IsIn(['percentage', 'fixed'])
  discountType: string;

  @ApiProperty({ example: 20, description: 'Percentage (0-100) or fixed amount in INR' })
  @IsNumber()
  @Min(1)
  @Max(100000)
  discountValue: number;

  @ApiPropertyOptional({ description: 'Maximum number of uses (null = unlimited)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Minimum order amount in INR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Restrict to a specific plan (null = all plans)' })
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ description: 'Expiration date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ApplyCouponDto {
  @ApiProperty({ example: 'WELCOME20' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Plan ID to apply coupon to' })
  @IsString()
  planId: string;
}

export class CouponResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() description: string | null;
  @ApiProperty() discountType: string;
  @ApiProperty() discountValue: number;
  @ApiProperty() maxUses: number | null;
  @ApiProperty() usedCount: number;
  @ApiProperty() minAmount: number | null;
  @ApiProperty() planId: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() expiresAt: Date | null;
}

export class CouponCalculationDto {
  @ApiProperty() code: string;
  @ApiProperty() discountType: string;
  @ApiProperty() discountValue: number;
  @ApiProperty() originalAmount: number;
  @ApiProperty() discountAmount: number;
  @ApiProperty() finalAmount: number;
}

// ── Refunds ────────────────────────────────────────────────────────────────

export class RequestRefundDto {
  @ApiProperty({ description: 'Invoice ID to refund' })
  @IsString()
  invoiceId: string;

  @ApiPropertyOptional({ description: 'Reason for refund' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RefundResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() invoiceId: string | null;
  @ApiProperty() amount: number;
  @ApiProperty() reason: string | null;
  @ApiProperty() status: string;
  @ApiProperty() processedAt: Date | null;
  @ApiProperty() createdAt: Date;
}

// ── Webhook ────────────────────────────────────────────────────────────────

export class RazorpayWebhookDto {
  @ApiProperty({ description: 'Raw webhook event payload' })
  event: string;

  @ApiProperty()
  payload: Record<string, unknown>;
}
