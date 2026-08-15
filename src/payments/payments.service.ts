import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { PaymentsRepository } from './payments.repository';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private razorpay: any = null;

  constructor(
    private readonly repo: PaymentsRepository,
    private readonly config: AppConfigService,
  ) {
    const { keyId, keySecret } = this.config.get().razorpay;
    if (keyId && keySecret) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Razorpay = require('razorpay');
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
  }

  // ── Plans ──────────────────────────────────────────────────────────────

  async listPlans() {
    return this.repo.findPlans();
  }

  async getPlan(id: string) {
    const plan = await this.repo.findPlanById(id);
    if (!plan) throw new NotFoundException('PLAN_NOT_FOUND');
    return plan;
  }

  async createPlan(input: {
    name: string;
    description?: string;
    amount: number;
    currency?: string;
    interval?: number;
    intervalUnit?: string;
    features?: string[];
    sortOrder?: number;
  }) {
    return this.repo.createPlan({
      name: input.name,
      description: input.description ?? null,
      amount: input.amount,
      currency: input.currency ?? 'INR',
      interval: input.interval ?? 1,
      intervalUnit: input.intervalUnit ?? 'monthly',
      features: input.features ?? [],
      isActive: true,
      sortOrder: input.sortOrder ?? 0,
    });
  }

  async updatePlan(id: string, input: Record<string, unknown>) {
    await this.getPlan(id);
    return this.repo.updatePlan(id, input);
  }

  // ── Subscriptions ─────────────────────────────────────────────────────

  async subscribe(userId: string, planId: string, couponCode?: string) {
    const plan = await this.getPlan(planId);
    if (!plan.isActive) throw new BadRequestException('PLAN_NOT_ACTIVE');

    const existing = await this.repo.findActiveSubscription(userId);
    if (existing) throw new ConflictException('ACTIVE_SUBSCRIPTION_EXISTS');

    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      appliedCoupon = await this.validateCoupon(couponCode, planId, plan.amount);
      discountAmount = appliedCoupon.discountAmount;
    }

    const finalAmount = Math.max(1, plan.amount - discountAmount);

    const invoice = await this.repo.createInvoice({
      user: { connect: { id: userId } },
      plan: { connect: { id: planId } },
      amount: finalAmount,
      currency: plan.currency,
      status: 'pending',
      description: `Subscription to ${plan.name}${appliedCoupon ? ` (coupon: ${appliedCoupon.code})` : ''}`,
    });

    let razorpaySubscriptionId: string | null = null;
    let razorpayCustomerId: string | null = null;

    if (this.razorpay) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const customer = await (this.razorpay as any).customers.create({
          name: `User ${userId}`,
        });
        razorpayCustomerId = customer.id;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = await (this.razorpay as any).subscriptions.create({
          plan_id: plan.razorpayPlanId ?? `plan_${plan.id}`,
          total_count: 12,
          customer_notify: 1,
          notes: { userId, planId },
        });
        razorpaySubscriptionId = subscription.id;
      } catch (err) {
        this.logger.warn(`Razorpay subscription creation failed: ${(err as Error).message}`);
      }
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.intervalUnit === 'monthly') periodEnd.setMonth(periodEnd.getMonth() + plan.interval);
    else if (plan.intervalUnit === 'yearly')
      periodEnd.setFullYear(periodEnd.getFullYear() + plan.interval);
    else if (plan.intervalUnit === 'weekly')
      periodEnd.setDate(periodEnd.getDate() + 7 * plan.interval);
    else periodEnd.setDate(periodEnd.getDate() + plan.interval);

    const subscription = await this.repo.createSubscription({
      user: { connect: { id: userId } },
      plan: { connect: { id: planId } },
      razorpaySubscriptionId,
      razorpayCustomerId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });

    if (appliedCoupon) {
      await this.repo.incrementCouponUsage(appliedCoupon.id);
    }

    await this.repo.updateInvoice(invoice.id, {
      subscription: { connect: { id: subscription.id } },
    });

    return { subscription, invoice, razorpaySubscriptionId };
  }

  async cancel(userId: string, subscriptionId: string, immediate = false) {
    const sub = await this.repo.findSubscriptionById(subscriptionId);
    if (!sub) throw new NotFoundException('SUBSCRIPTION_NOT_FOUND');
    if (sub.userId !== userId) throw new NotFoundException('SUBSCRIPTION_NOT_FOUND');
    if (sub.status === 'cancelled') throw new BadRequestException('SUBSCRIPTION_ALREADY_CANCELLED');

    if (immediate) {
      await this.repo.updateSubscription(subscriptionId, {
        status: 'cancelled',
        cancelledAt: new Date(),
      });
    } else {
      await this.repo.updateSubscription(subscriptionId, {
        cancelAtPeriodEnd: true,
      });
    }

    if (this.razorpay && sub.razorpaySubscriptionId) {
      try {
        if (immediate) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (this.razorpay as any).subscriptions.cancel(sub.razorpaySubscriptionId);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (this.razorpay as any).subscriptions.update(sub.razorpaySubscriptionId, {
            schedule_change_at: 'cycle_end',
          });
        }
      } catch (err) {
        this.logger.warn(`Razorpay cancel failed: ${(err as Error).message}`);
      }
    }

    return this.repo.findSubscriptionById(subscriptionId);
  }

  async getMySubscription(userId: string) {
    const sub = await this.repo.findActiveSubscription(userId);
    return sub ?? null;
  }

  // ── Invoices ──────────────────────────────────────────────────────────

  async listInvoices(userId: string, page?: number, limit?: number) {
    return this.repo.findInvoices(userId, { page, limit });
  }

  async getInvoiceHistory(userId: string) {
    const { data, meta } = await this.repo.findInvoices(userId, { limit: 50 });
    return { invoices: data, meta };
  }

  // ── Coupons ───────────────────────────────────────────────────────────

  async createCoupon(input: {
    code: string;
    description?: string;
    discountType: string;
    discountValue: number;
    maxUses?: number;
    minAmount?: number;
    planId?: string;
    expiresAt?: string;
  }) {
    const existing = await this.repo.findCouponByCode(input.code);
    if (existing) throw new ConflictException('COUPON_CODE_EXISTS');

    return this.repo.createCoupon({
      code: input.code.toUpperCase(),
      description: input.description ?? null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      maxUses: input.maxUses ?? null,
      minAmount: input.minAmount ?? null,
      planId: input.planId ?? null,
      isActive: true,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });
  }

  async applyCoupon(code: string, planId: string) {
    const plan = await this.getPlan(planId);
    const coupon = await this.repo.findCouponByCode(code);
    if (!coupon) throw new NotFoundException('COUPON_NOT_FOUND');
    if (!coupon.isActive) throw new BadRequestException('COUPON_INACTIVE');
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      throw new BadRequestException('COUPON_EXPIRED');
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
      throw new BadRequestException('COUPON_MAX_USES_REACHED');
    if (coupon.planId && coupon.planId !== planId)
      throw new BadRequestException('COUPON_NOT_VALID_FOR_PLAN');
    if (coupon.minAmount && coupon.minAmount > plan.amount)
      throw new BadRequestException('COUPON_MIN_AMOUNT_NOT_MET');

    const discountAmount =
      coupon.discountType === 'percentage'
        ? Math.round((plan.amount * coupon.discountValue) / 100)
        : coupon.discountValue;

    const finalAmount = Math.max(1, plan.amount - discountAmount);

    return {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      originalAmount: plan.amount,
      discountAmount,
      finalAmount,
    };
  }

  async listCoupons() {
    return this.repo.findCoupons();
  }

  private async validateCoupon(code: string, planId: string, amount: number) {
    const coupon = await this.repo.findCouponByCode(code);
    if (!coupon) throw new NotFoundException('COUPON_NOT_FOUND');
    if (!coupon.isActive) throw new BadRequestException('COUPON_INACTIVE');
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      throw new BadRequestException('COUPON_EXPIRED');
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
      throw new BadRequestException('COUPON_MAX_USES_REACHED');
    if (coupon.planId && coupon.planId !== planId)
      throw new BadRequestException('COUPON_NOT_VALID_FOR_PLAN');
    if (coupon.minAmount && coupon.minAmount > amount)
      throw new BadRequestException('COUPON_MIN_AMOUNT_NOT_MET');

    const discountAmount =
      coupon.discountType === 'percentage'
        ? Math.round((amount * coupon.discountValue) / 100)
        : coupon.discountValue;

    return { id: coupon.id, code: coupon.code, discountAmount };
  }

  // ── Refunds ───────────────────────────────────────────────────────────

  async requestRefund(userId: string, invoiceId: string, reason?: string) {
    const invoice = await this.repo.findInvoiceById(invoiceId);
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    if (invoice.userId !== userId) throw new NotFoundException('INVOICE_NOT_FOUND');
    if (invoice.status !== 'paid') throw new BadRequestException('INVOICE_NOT_REFUNDABLE');

    const existingRefund = await this.repo.findRefundById(invoiceId);
    if (existingRefund) throw new ConflictException('REFUND_ALREADY_REQUESTED');

    let razorpayRefundId: string | null = null;

    if (this.razorpay && invoice.razorpayPaymentId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const refund = await (this.razorpay as any).payments.refund(invoice.razorpayPaymentId, {
          amount: invoice.amount * 100,
          notes: { reason: reason ?? 'Refund requested' },
        });
        razorpayRefundId = refund.id;
      } catch (err) {
        this.logger.warn(`Razorpay refund failed: ${(err as Error).message}`);
      }
    }

    const refund = await this.repo.createRefund({
      user: { connect: { id: userId } },
      invoice: { connect: { id: invoiceId } },
      subscription: invoice.subscriptionId
        ? { connect: { id: invoice.subscriptionId } }
        : undefined,
      razorpayRefundId,
      amount: invoice.amount,
      reason: reason ?? null,
      status: 'pending',
    });

    await this.repo.updateInvoice(invoiceId, { status: 'refunded' });

    return refund;
  }

  // ── Webhook ───────────────────────────────────────────────────────────

  verifyWebhookSignature(body: string, signature: string): boolean {
    const secret = this.config.get().razorpay.webhookSecret;
    if (!secret) {
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET not configured — skipping verification');
      return true;
    }
    return validateWebhookSignature(body, signature, secret);
  }

  async handleWebhook(event: string, payload: Record<string, unknown>, eventId: string) {
    const alreadyProcessed = await this.repo.findWebhookEvent(eventId);
    if (alreadyProcessed) {
      this.logger.log(`Webhook ${eventId} already processed — skipping`);
      return { processed: false, reason: 'duplicate' };
    }

    this.logger.log(`Processing webhook: ${event} (${eventId})`);

    switch (event) {
      case 'subscription.activated':
      case 'subscription.charged':
        await this.handleSubscriptionCharged(payload);
        break;
      case 'subscription.cancelled':
        await this.handleSubscriptionCancelled(payload);
        break;
      case 'subscription.paused':
        await this.handleSubscriptionPaused(payload);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(payload);
        break;
      case 'refund.created':
      case 'refund.processed':
        await this.handleRefundProcessed(payload);
        break;
      default:
        this.logger.log(`Unhandled webhook event: ${event}`);
    }

    await this.repo.logWebhookEvent(eventId, event, payload);
    return { processed: true };
  }

  private async handleSubscriptionCharged(payload: Record<string, unknown>) {
    const sub = payload.subscription as Record<string, unknown> | undefined;
    const payment = payload.payment as Record<string, unknown> | undefined;
    if (!sub?.id) return;

    const subscription = await this.repo.findSubscriptionByRazorpayId(sub.id as string);
    if (!subscription) return;

    await this.repo.updateSubscription(subscription.id, {
      status: 'active',
      currentPeriodStart: new Date((sub.current_start as number) * 1000),
      currentPeriodEnd: new Date((sub.current_end as number) * 1000),
    });

    if (payment?.id) {
      const pendingInvoice = await this.repo.findInvoices(subscription.userId, {
        page: 1,
        limit: 1,
      });
      const unpaid = pendingInvoice.data.find((i) => i.status === 'pending');
      if (unpaid) {
        await this.repo.updateInvoice(unpaid.id, {
          status: 'paid',
          razorpayPaymentId: payment.id as string,
          paidAt: new Date(),
        });
      }
    }
  }

  private async handleSubscriptionCancelled(payload: Record<string, unknown>) {
    const sub = payload.subscription as Record<string, unknown> | undefined;
    if (!sub?.id) return;

    const subscription = await this.repo.findSubscriptionByRazorpayId(sub.id as string);
    if (!subscription) return;

    await this.repo.updateSubscription(subscription.id, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });
  }

  private async handleSubscriptionPaused(payload: Record<string, unknown>) {
    const sub = payload.subscription as Record<string, unknown> | undefined;
    if (!sub?.id) return;

    const subscription = await this.repo.findSubscriptionByRazorpayId(sub.id as string);
    if (!subscription) return;

    await this.repo.updateSubscription(subscription.id, { status: 'paused' });
  }

  private async handlePaymentFailed(payload: Record<string, unknown>) {
    const payment = payload.payment as Record<string, unknown> | undefined;
    if (!payment?.id) return;

    const invoice = await this.repo.findInvoiceByRazorpayOrder(payment.order_id as string);
    if (invoice) {
      await this.repo.updateInvoice(invoice.id, { status: 'failed' });
    }
  }

  private async handleRefundProcessed(payload: Record<string, unknown>) {
    const refund = payload.refund as Record<string, unknown> | undefined;
    if (!refund?.id) return;

    const localRefund = await this.repo.findRefundByRazorpayId(refund.id as string);
    if (localRefund) {
      await this.repo.updateRefund(localRefund.id, {
        status: 'processed',
        processedAt: new Date(),
      });
    }
  }
}
