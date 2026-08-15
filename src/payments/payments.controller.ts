import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import {
  CreatePlanDto,
  UpdatePlanDto,
  SubscribeDto,
  CancelSubscriptionDto,
  CreateCouponDto,
  ApplyCouponDto,
  RequestRefundDto,
} from './dto/billing.dto';

@ApiTags('Billing & Payments')
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly payments: PaymentsService) {}

  // ── Plans ──────────────────────────────────────────────────────────────

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'List all active subscription plans' })
  async listPlans() {
    return this.payments.listPlans();
  }

  @Post('plans')
  @Roles('admin', 'college_admin')
  @Resource('billing-plans')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new subscription plan (admin)' })
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.payments.createPlan(dto);
  }

  @Patch('plans/:id')
  @Roles('admin')
  @Resource('billing-plans')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subscription plan (admin)' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.payments.updatePlan(id, dto as Record<string, unknown>);
  }

  // ── Subscriptions ─────────────────────────────────────────────────────

  @Post('subscribe')
  @Roles('student')
  @Resource('subscriptions')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subscribe to a plan' })
  async subscribe(@CurrentUser('id') userId: string, @Body() dto: SubscribeDto) {
    return this.payments.subscribe(userId, dto.planId, dto.couponCode);
  }

  @Post('cancel')
  @Roles('student')
  @Resource('subscriptions')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel current subscription' })
  async cancel(@CurrentUser('id') userId: string, @Body() dto: CancelSubscriptionDto) {
    const sub = await this.payments.getMySubscription(userId);
    if (!sub)
      throw new (await import('@nestjs/common')).NotFoundException('NO_ACTIVE_SUBSCRIPTION');
    return this.payments.cancel(userId, sub.id, dto.immediate);
  }

  @Get('subscription/me')
  @Roles('student')
  @Resource('subscriptions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user active subscription' })
  async getMySubscription(@CurrentUser('id') userId: string) {
    return this.payments.getMySubscription(userId);
  }

  // ── Invoices ──────────────────────────────────────────────────────────

  @Get('invoices')
  @Roles('student')
  @Resource('billing-invoices')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List invoices (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listInvoices(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.payments.listInvoices(userId, page ? +page : undefined, limit ? +limit : undefined);
  }

  @Get('history')
  @Roles('student')
  @Resource('billing-invoices')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get billing history (invoices)' })
  async getBillingHistory(@CurrentUser('id') userId: string) {
    return this.payments.getInvoiceHistory(userId);
  }

  // ── Coupons ───────────────────────────────────────────────────────────

  @Post('coupons')
  @Roles('admin')
  @Resource('coupons')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a coupon (admin)' })
  async createCoupon(@Body() dto: CreateCouponDto) {
    return this.payments.createCoupon(dto);
  }

  @Post('coupons/apply')
  @Roles('student')
  @Resource('coupons')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate coupon discount for a plan' })
  async applyCoupon(@Body() dto: ApplyCouponDto) {
    return this.payments.applyCoupon(dto.code, dto.planId);
  }

  @Get('coupons')
  @Roles('admin')
  @Resource('coupons')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all coupons (admin)' })
  async listCoupons() {
    return this.payments.listCoupons();
  }

  // ── Refunds ───────────────────────────────────────────────────────────

  @Post('refund')
  @Roles('admin')
  @Resource('refunds')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a refund for an invoice (admin)' })
  async requestRefund(@Body() dto: RequestRefundDto) {
    return this.payments.requestRefund('system', dto.invoiceId, dto.reason);
  }

  // ── Webhook ───────────────────────────────────────────────────────────

  @Post('webhooks/razorpay')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook handler (signature-verified, idempotent)' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleWebhook(@Req() req: any, @Body() body: Record<string, unknown>) {
    const signature = req.headers?.['x-razorpay-signature'] as string;
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(body);

    if (!this.payments.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Webhook signature verification failed');
      throw new (await import('@nestjs/common')).BadRequestException('INVALID_WEBHOOK_SIGNATURE');
    }

    const event = body.event as string;
    const eventId = ((body as Record<string, unknown>).id as string) ?? `${event}_${Date.now()}`;
    const payload = body.payload as Record<string, unknown>;

    return this.payments.handleWebhook(event, payload ?? body, eventId);
  }
}
