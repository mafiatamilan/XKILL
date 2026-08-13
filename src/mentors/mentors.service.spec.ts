import { Test, TestingModule } from '@nestjs/testing';
import { MentorsService } from './mentors.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('MentorsService', () => {
  let service: MentorsService;
  let prisma: {
    mentorProfile: Record<string, jest.Mock>;
    mentorAvailability: Record<string, jest.Mock>;
    booking: Record<string, jest.Mock>;
    mentorPayment: Record<string, jest.Mock>;
    review: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      mentorProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      mentorAvailability: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      booking: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      mentorPayment: {
        create: jest.fn(),
        update: jest.fn(),
      },
      review: {
        create: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MentorsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(MentorsService);
  });

  describe('bookMentor', () => {
    it('creates booking for available slot', async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue({
        id: 'm1',
        userId: 'u1',
        isAvailable: true,
        hourlyRate: 500,
      });
      prisma.mentorAvailability.findUnique.mockResolvedValue({
        id: 'slot1',
        mentorId: 'm1',
        dayOfWeek: 3,
        startTime: '10:00',
        endTime: '11:00',
      });
      prisma.booking.findFirst.mockResolvedValue(null); // no conflict
      prisma.booking.create.mockResolvedValue({
        id: 'b1',
        mentorId: 'm1',
        studentId: 's1',
        mentor: { user: { fullName: 'Mentor' } },
      });
      prisma.mentorPayment.create.mockResolvedValue({});

      const result = await service.bookMentor('s1', 'm1', {
        availabilityId: 'slot1',
        scheduledDate: '2026-08-19', // Wednesday
        topic: 'System Design',
      });

      expect(result.id).toBe('b1');
      expect(prisma.mentorPayment.create).toHaveBeenCalled();
    });

    it('throws ConflictException on double-booking', async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue({
        id: 'm1',
        isAvailable: true,
        hourlyRate: 500,
      });
      prisma.mentorAvailability.findUnique.mockResolvedValue({
        id: 'slot1',
        mentorId: 'm1',
        dayOfWeek: 3,
        startTime: '10:00',
        endTime: '11:00',
      });
      prisma.booking.findFirst.mockResolvedValue({ id: 'existing' }); // conflict

      await expect(
        service.bookMentor('s1', 'm1', {
          availabilityId: 'slot1',
          scheduledDate: '2026-08-19', // Wednesday = dayOfWeek 3
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws when mentor is unavailable', async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue({
        id: 'm1',
        isAvailable: false,
      });

      await expect(
        service.bookMentor('s1', 'm1', {
          availabilityId: 'slot1',
          scheduledDate: '2026-08-20',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when date does not match day of week', async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue({
        id: 'm1',
        isAvailable: true,
        hourlyRate: 500,
      });
      prisma.mentorAvailability.findUnique.mockResolvedValue({
        id: 'slot1',
        mentorId: 'm1',
        dayOfWeek: 3,
        startTime: '10:00',
        endTime: '11:00',
      });

      // 2026-08-21 is a Friday (day 5), not Wednesday (day 3)
      await expect(
        service.bookMentor('s1', 'm1', {
          availabilityId: 'slot1',
          scheduledDate: '2026-08-21',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('concurrent booking prevention', () => {
    it('prevents double-booking when two students try simultaneously', async () => {
      prisma.mentorProfile.findUnique.mockResolvedValue({
        id: 'm1',
        isAvailable: true,
        hourlyRate: 500,
      });
      prisma.mentorAvailability.findUnique.mockResolvedValue({
        id: 'slot1',
        mentorId: 'm1',
        dayOfWeek: 3,
        startTime: '10:00',
        endTime: '11:00',
      });

      // First call succeeds, second sees conflict
      // findFirst is called twice per bookMentor (mentor conflict, then student conflict)
      let callCount = 0;
      prisma.booking.findFirst.mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) return null; // s1: both checks pass
        return { id: 'conflict' }; // s2: mentor conflict check fails
      });

      prisma.booking.create.mockResolvedValue({
        id: 'b1',
        mentorId: 'm1',
        studentId: 's1',
        mentor: { user: { fullName: 'Mentor' } },
      });
      prisma.mentorPayment.create.mockResolvedValue({});

      // First booking succeeds (2026-08-19 is a Wednesday = dayOfWeek 3)
      // First booking succeeds (2026-08-19 is Wednesday = dayOfWeek 3)
      const result1 = await service.bookMentor('s1', 'm1', {
        availabilityId: 'slot1',
        scheduledDate: '2026-08-19',
      });
      expect(result1.id).toBe('b1');

      // Second booking fails with conflict (also Wednesday)
      await expect(
        service.bookMentor('s2', 'm1', {
          availabilityId: 'slot1',
          scheduledDate: '2026-08-19',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('reviewMentor', () => {
    it('creates review and updates mentor rating', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        studentId: 's1',
        mentorId: 'm1',
        status: 'completed',
        review: null,
      });
      prisma.review.create.mockResolvedValue({ id: 'r1', rating: 5 });
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { rating: 10 } });
      prisma.mentorProfile.update.mockResolvedValue({});

      const result = await service.reviewMentor('b1', 's1', { rating: 5, comment: 'Great!' });
      expect(result.rating).toBe(5);
      expect(prisma.mentorProfile.update).toHaveBeenCalled();
    });

    it('throws when booking not completed', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        studentId: 's1',
        status: 'pending',
        review: null,
      });

      await expect(service.reviewMentor('b1', 's1', { rating: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when review already exists', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: 'b1',
        studentId: 's1',
        status: 'completed',
        review: { id: 'r1' },
      });

      await expect(service.reviewMentor('b1', 's1', { rating: 5 })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
