import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Plans ──────────────────────────────────────────────────────────────

  async findPlans(where: { isActive?: boolean } = {}) {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: where.isActive ?? true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findPlanById(id: string) {
    return this.prisma.subscriptionPlan.findUnique({ where: { id } });
  }

  async createPlan(data: Prisma.SubscriptionPlanCreateInput) {
    return this.prisma.subscriptionPlan.create({ data });
  }

  async updatePlan(id: string, data: Prisma.SubscriptionPlanUpdateInput) {
    return this.prisma.subscriptionPlan.update({ where: { id }, data });
  }

  // ── Subscriptions ─────────────────────────────────────────────────────

  async findActiveSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['active', 'past_due'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSubscriptionById(id: string) {
    return this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });
  }

  async findSubscriptionByRazorpayId(razorpaySubscriptionId: string) {
    return this.prisma.subscription.findUnique({
      where: { razorpaySubscriptionId },
      include: { plan: true },
    });
  }

  async createSubscription(data: Prisma.SubscriptionCreateInput) {
    return this.prisma.subscription.create({ data });
  }

  async updateSubscription(id: string, data: Prisma.SubscriptionUpdateInput) {
    return this.prisma.subscription.update({ where: { id }, data });
  }

  // ── Invoices ──────────────────────────────────────────────────────────

  async findInvoices(userId: string, options: { page?: number; limit?: number } = {}) {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where: { userId } }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findInvoiceById(id: string) {
    return this.prisma.invoice.findUnique({ where: { id } });
  }

  async findInvoiceByRazorpayOrder(razorpayOrderId: string) {
    return this.prisma.invoice.findFirst({ where: { razorpayOrderId } });
  }

  async createInvoice(data: Prisma.InvoiceCreateInput) {
    return this.prisma.invoice.create({ data });
  }

  async updateInvoice(id: string, data: Prisma.InvoiceUpdateInput) {
    return this.prisma.invoice.update({ where: { id }, data });
  }

  // ── Coupons ───────────────────────────────────────────────────────────

  async findCouponByCode(code: string) {
    return this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  }

  async createCoupon(data: Prisma.CouponCreateInput) {
    return this.prisma.coupon.create({ data });
  }

  async incrementCouponUsage(id: string) {
    return this.prisma.coupon.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  }

  async findCoupons(where: { isActive?: boolean } = {}) {
    return this.prisma.coupon.findMany({
      where: { isActive: where.isActive ?? true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Refunds ───────────────────────────────────────────────────────────

  async createRefund(data: Prisma.RefundCreateInput) {
    return this.prisma.refund.create({ data });
  }

  async updateRefund(id: string, data: Prisma.RefundUpdateInput) {
    return this.prisma.refund.update({ where: { id }, data });
  }

  async findRefundById(id: string) {
    return this.prisma.refund.findUnique({ where: { id } });
  }

  async findRefundByRazorpayId(razorpayRefundId: string) {
    return this.prisma.refund.findUnique({ where: { razorpayRefundId } });
  }

  // ── Webhook idempotency ──────────────────────────────────────────────

  async findWebhookEvent(eventId: string): Promise<boolean> {
    const log = await this.prisma.auditLog.findFirst({
      where: { entityType: 'webhook_event', entityId: eventId },
    });
    return log !== null;
  }

  async logWebhookEvent(eventId: string, event: string, payload: Record<string, unknown>) {
    await this.prisma.auditLog.create({
      data: {
        entityType: 'webhook_event',
        entityId: eventId,
        action: event,
        after: payload as unknown as Prisma.InputJsonValue,
        userId: null,
      },
    });
  }
}
