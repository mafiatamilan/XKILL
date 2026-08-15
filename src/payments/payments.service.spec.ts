import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { mockConfig } from '../testing/mocks';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let repo: Record<string, jest.Mock>;

  const testConfig = mockConfig({
    razorpay: { keyId: '', keySecret: '', webhookSecret: '' },
  });

  beforeEach(() => {
    repo = {
      findPlans: jest.fn(),
      findPlanById: jest.fn(),
      createPlan: jest.fn(),
      updatePlan: jest.fn(),
      findActiveSubscription: jest.fn(),
      findSubscriptionById: jest.fn(),
      findSubscriptionByRazorpayId: jest.fn(),
      createSubscription: jest.fn(),
      updateSubscription: jest.fn(),
      findInvoices: jest.fn(),
      findInvoiceById: jest.fn(),
      findInvoiceByRazorpayOrder: jest.fn(),
      createInvoice: jest.fn(),
      updateInvoice: jest.fn(),
      findCouponByCode: jest.fn(),
      createCoupon: jest.fn(),
      incrementCouponUsage: jest.fn(),
      findCoupons: jest.fn(),
      createRefund: jest.fn(),
      updateRefund: jest.fn(),
      findRefundById: jest.fn(),
      findRefundByRazorpayId: jest.fn(),
      findWebhookEvent: jest.fn(),
      logWebhookEvent: jest.fn(),
    };

    service = new PaymentsService(repo as unknown as PaymentsRepository, testConfig);
  });

  describe('listPlans', () => {
    it('returns all active plans', async () => {
      repo.findPlans.mockResolvedValue([{ id: 'p1', name: 'Pro' }]);
      const result = await service.listPlans();
      expect(result).toHaveLength(1);
      expect(repo.findPlans).toHaveBeenCalledWith();
    });
  });

  describe('getPlan', () => {
    it('returns plan by id', async () => {
      repo.findPlanById.mockResolvedValue({ id: 'p1', name: 'Pro' });
      const result = await service.getPlan('p1');
      expect(result.id).toBe('p1');
    });

    it('throws NotFoundException for unknown plan', async () => {
      repo.findPlanById.mockResolvedValue(null);
      await expect(service.getPlan('unknown')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createPlan', () => {
    it('creates a plan with defaults', async () => {
      repo.createPlan.mockResolvedValue({ id: 'new', name: 'Basic' });
      const result = await service.createPlan({ name: 'Basic', amount: 199 });
      expect(result.id).toBe('new');
      expect(repo.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Basic', amount: 199, isActive: true }),
      );
    });
  });

  describe('subscribe', () => {
    it('creates subscription and pending invoice', async () => {
      repo.findPlanById.mockResolvedValue({
        id: 'p1',
        name: 'Pro',
        amount: 499,
        currency: 'INR',
        isActive: true,
        interval: 1,
        intervalUnit: 'monthly',
      });
      repo.findActiveSubscription.mockResolvedValue(null);
      repo.createInvoice.mockResolvedValue({ id: 'inv1', status: 'pending' });
      repo.createSubscription.mockResolvedValue({ id: 'sub1', status: 'active' });
      repo.updateInvoice.mockResolvedValue({});

      const result = await service.subscribe('user1', 'p1');
      expect(result.subscription.status).toBe('active');
      expect(repo.createInvoice).toHaveBeenCalled();
      expect(repo.createSubscription).toHaveBeenCalled();
    });

    it('throws ConflictException if active subscription exists', async () => {
      repo.findPlanById.mockResolvedValue({
        id: 'p1',
        name: 'Pro',
        amount: 499,
        currency: 'INR',
        isActive: true,
      });
      repo.findActiveSubscription.mockResolvedValue({ id: 'existing' });

      await expect(service.subscribe('user1', 'p1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws BadRequestException if plan is inactive', async () => {
      repo.findPlanById.mockResolvedValue({ id: 'p1', name: 'Pro', amount: 499, isActive: false });
      repo.findActiveSubscription.mockResolvedValue(null);

      await expect(service.subscribe('user1', 'p1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('applies coupon discount', async () => {
      repo.findPlanById.mockResolvedValue({
        id: 'p1',
        name: 'Pro',
        amount: 1000,
        currency: 'INR',
        isActive: true,
        interval: 1,
        intervalUnit: 'monthly',
      });
      repo.findActiveSubscription.mockResolvedValue(null);
      repo.findCouponByCode.mockResolvedValue({
        id: 'c1',
        code: 'SAVE20',
        discountType: 'percentage',
        discountValue: 20,
        maxUses: null,
        usedCount: 0,
        minAmount: null,
        planId: null,
        isActive: true,
        expiresAt: null,
      });
      repo.incrementCouponUsage.mockResolvedValue({});
      repo.createInvoice.mockResolvedValue({ id: 'inv1', status: 'pending', amount: 800 });
      repo.createSubscription.mockResolvedValue({ id: 'sub1', status: 'active' });
      repo.updateInvoice.mockResolvedValue({});

      const result = await service.subscribe('user1', 'p1', 'SAVE20');
      expect(result.invoice.amount).toBe(800); // 1000 - 20%
    });
  });

  describe('cancel', () => {
    it('cancels immediately', async () => {
      repo.findSubscriptionById.mockResolvedValue({
        id: 'sub1',
        userId: 'user1',
        status: 'active',
        razorpaySubscriptionId: null,
      });
      repo.updateSubscription.mockResolvedValue({});

      await service.cancel('user1', 'sub1', true);
      expect(repo.updateSubscription).toHaveBeenCalledWith(
        'sub1',
        expect.objectContaining({ status: 'cancelled' }),
      );
    });

    it('cancels at period end', async () => {
      repo.findSubscriptionById.mockResolvedValue({
        id: 'sub1',
        userId: 'user1',
        status: 'active',
        razorpaySubscriptionId: null,
      });
      repo.updateSubscription.mockResolvedValue({});

      await service.cancel('user1', 'sub1', false);
      expect(repo.updateSubscription).toHaveBeenCalledWith(
        'sub1',
        expect.objectContaining({ cancelAtPeriodEnd: true }),
      );
    });

    it('throws NotFoundException for wrong user', async () => {
      repo.findSubscriptionById.mockResolvedValue({
        id: 'sub1',
        userId: 'other',
        status: 'active',
      });
      await expect(service.cancel('user1', 'sub1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException if already cancelled', async () => {
      repo.findSubscriptionById.mockResolvedValue({
        id: 'sub1',
        userId: 'user1',
        status: 'cancelled',
      });
      await expect(service.cancel('user1', 'sub1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('listInvoices', () => {
    it('returns paginated invoices', async () => {
      repo.findInvoices.mockResolvedValue({
        data: [{ id: 'inv1' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      });
      const result = await service.listInvoices('user1', 1, 20);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('createCoupon', () => {
    it('creates a coupon', async () => {
      repo.findCouponByCode.mockResolvedValue(null);
      repo.createCoupon.mockResolvedValue({ id: 'c1', code: 'SAVE20' });

      const result = await service.createCoupon({
        code: 'SAVE20',
        discountType: 'percentage',
        discountValue: 20,
      });
      expect(result.code).toBe('SAVE20');
    });

    it('throws ConflictException for duplicate code', async () => {
      repo.findCouponByCode.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createCoupon({ code: 'SAVE20', discountType: 'percentage', discountValue: 20 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('applyCoupon', () => {
    it('calculates percentage discount', async () => {
      repo.findPlanById.mockResolvedValue({ id: 'p1', amount: 1000, isActive: true });
      repo.findCouponByCode.mockResolvedValue({
        id: 'c1',
        code: 'SAVE20',
        discountType: 'percentage',
        discountValue: 20,
        maxUses: null,
        usedCount: 0,
        minAmount: null,
        planId: null,
        isActive: true,
        expiresAt: null,
      });

      const result = await service.applyCoupon('SAVE20', 'p1');
      expect(result.discountAmount).toBe(200);
      expect(result.finalAmount).toBe(800);
    });

    it('calculates fixed discount', async () => {
      repo.findPlanById.mockResolvedValue({ id: 'p1', amount: 1000, isActive: true });
      repo.findCouponByCode.mockResolvedValue({
        id: 'c1',
        code: 'FLAT50',
        discountType: 'fixed',
        discountValue: 50,
        maxUses: null,
        usedCount: 0,
        minAmount: null,
        planId: null,
        isActive: true,
        expiresAt: null,
      });

      const result = await service.applyCoupon('FLAT50', 'p1');
      expect(result.discountAmount).toBe(50);
      expect(result.finalAmount).toBe(950);
    });

    it('throws for expired coupon', async () => {
      repo.findPlanById.mockResolvedValue({ id: 'p1', amount: 1000, isActive: true });
      repo.findCouponByCode.mockResolvedValue({
        id: 'c1',
        code: 'OLD',
        discountType: 'percentage',
        discountValue: 10,
        maxUses: null,
        usedCount: 0,
        minAmount: null,
        planId: null,
        isActive: true,
        expiresAt: new Date('2020-01-01'),
      });

      await expect(service.applyCoupon('OLD', 'p1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws for plan-restricted coupon on wrong plan', async () => {
      repo.findPlanById.mockResolvedValue({ id: 'p1', amount: 1000, isActive: true });
      repo.findCouponByCode.mockResolvedValue({
        id: 'c1',
        code: 'SPECIFIC',
        discountType: 'percentage',
        discountValue: 10,
        maxUses: null,
        usedCount: 0,
        minAmount: null,
        planId: 'other-plan',
        isActive: true,
        expiresAt: null,
      });

      await expect(service.applyCoupon('SPECIFIC', 'p1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('requestRefund', () => {
    it('creates refund for paid invoice', async () => {
      repo.findInvoiceById.mockResolvedValue({
        id: 'inv1',
        userId: 'user1',
        status: 'paid',
        amount: 500,
        razorpayPaymentId: null,
        subscriptionId: null,
      });
      repo.createRefund.mockResolvedValue({ id: 'r1', status: 'pending' });
      repo.updateInvoice.mockResolvedValue({});

      const result = await service.requestRefund('user1', 'inv1', 'Changed mind');
      expect(result.status).toBe('pending');
    });

    it('throws for unpaid invoice', async () => {
      repo.findInvoiceById.mockResolvedValue({ id: 'inv1', userId: 'user1', status: 'pending' });
      await expect(service.requestRefund('user1', 'inv1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws for wrong user', async () => {
      repo.findInvoiceById.mockResolvedValue({ id: 'inv1', userId: 'other', status: 'paid' });
      await expect(service.requestRefund('user1', 'inv1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('verifyWebhookSignature', () => {
    it('returns true when no secret configured', () => {
      const result = service.verifyWebhookSignature('body', 'sig');
      expect(result).toBe(true);
    });
  });

  describe('handleWebhook', () => {
    it('skips duplicate events', async () => {
      repo.findWebhookEvent.mockResolvedValue(true);
      const result = await service.handleWebhook('subscription.charged', {}, 'evt_1');
      expect(result.processed).toBe(false);
    });

    it('processes new events', async () => {
      repo.findWebhookEvent.mockResolvedValue(false);
      repo.logWebhookEvent.mockResolvedValue({});
      const result = await service.handleWebhook('subscription.charged', {}, 'evt_2');
      expect(result.processed).toBe(true);
      expect(repo.logWebhookEvent).toHaveBeenCalled();
    });
  });
});
