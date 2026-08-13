import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildPaginationMeta } from '../common/pagination/pagination.dto';
import {
  CreateMentorProfileDto,
  UpdateMentorProfileDto,
  CreateAvailabilityDto,
  BookMentorDto,
  ReviewMentorDto,
  MentorSearchQueryDto,
} from './dto/mentors.dto';

@Injectable()
export class MentorsService {
  private readonly logger = new Logger(MentorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Mentor Profile ─────────────────────────────────────────────

  async createProfile(userId: string, dto: CreateMentorProfileDto) {
    const existing = await this.prisma.mentorProfile.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException({
        code: 'PROFILE_EXISTS',
        message: 'Mentor profile already exists',
      });
    }

    return this.prisma.mentorProfile.create({
      data: { userId, ...dto },
    });
  }

  async getProfile(mentorId: string) {
    const profile = await this.prisma.mentorProfile.findUnique({
      where: { id: mentorId },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
        availability: { where: { isActive: true } },
        _count: { select: { bookings: true, reviews: true } },
      },
    });
    if (!profile) {
      throw new NotFoundException({ code: 'MENTOR_NOT_FOUND', message: 'Mentor not found' });
    }
    return profile;
  }

  async updateProfile(mentorId: string, userId: string, dto: UpdateMentorProfileDto) {
    const existing = await this.prisma.mentorProfile.findUnique({ where: { id: mentorId } });
    if (!existing) {
      throw new NotFoundException({ code: 'MENTOR_NOT_FOUND', message: 'Mentor not found' });
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException({
        code: 'NOT_MENTOR',
        message: 'You can only update your own profile',
      });
    }

    return this.prisma.mentorProfile.update({
      where: { id: mentorId },
      data: dto,
    });
  }

  async searchMentors(query: MentorSearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MentorProfileWhereInput = { isAvailable: true };

    if (query.q) {
      where.OR = [
        { headline: { contains: query.q, mode: 'insensitive' } },
        { bio: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.expertise) {
      where.expertise = { has: query.expertise };
    }

    const [data, total] = await Promise.all([
      this.prisma.mentorProfile.findMany({
        where,
        include: {
          user: { select: { fullName: true, avatarUrl: true } },
          _count: { select: { bookings: true, reviews: true } },
        },
        orderBy: { rating: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.mentorProfile.count({ where }),
    ]);

    return {
      data: data.map((m) => ({
        ...m,
        bookingCount: m._count.bookings,
        reviewCount: m._count.reviews,
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // ─── Availability ───────────────────────────────────────────────

  async getAvailability(mentorId: string) {
    const mentor = await this.prisma.mentorProfile.findUnique({ where: { id: mentorId } });
    if (!mentor) {
      throw new NotFoundException({ code: 'MENTOR_NOT_FOUND', message: 'Mentor not found' });
    }

    return this.prisma.mentorAvailability.findMany({
      where: { mentorId, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async addAvailability(mentorId: string, userId: string, dto: CreateAvailabilityDto) {
    const mentor = await this.prisma.mentorProfile.findUnique({ where: { id: mentorId } });
    if (!mentor) {
      throw new NotFoundException({ code: 'MENTOR_NOT_FOUND', message: 'Mentor not found' });
    }
    if (mentor.userId !== userId) {
      throw new ForbiddenException({
        code: 'NOT_MENTOR',
        message: 'You can only manage your own availability',
      });
    }

    const existing = await this.prisma.mentorAvailability.findUnique({
      where: {
        mentorId_dayOfWeek_startTime: {
          mentorId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
        },
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'SLOT_EXISTS',
        message: 'Availability slot already exists',
      });
    }

    return this.prisma.mentorAvailability.create({
      data: { mentorId, ...dto },
    });
  }

  // ─── Booking (with double-booking prevention) ──────────────────

  async bookMentor(studentId: string, mentorId: string, dto: BookMentorDto) {
    const mentor = await this.prisma.mentorProfile.findUnique({ where: { id: mentorId } });
    if (!mentor) {
      throw new NotFoundException({ code: 'MENTOR_NOT_FOUND', message: 'Mentor not found' });
    }
    if (!mentor.isAvailable) {
      throw new BadRequestException({
        code: 'MENTOR_UNAVAILABLE',
        message: 'Mentor is not currently available',
      });
    }

    // Verify availability slot exists
    const slot = await this.prisma.mentorAvailability.findUnique({
      where: { id: dto.availabilityId },
    });
    if (!slot || slot.mentorId !== mentorId) {
      throw new BadRequestException({ code: 'INVALID_SLOT', message: 'Invalid availability slot' });
    }

    // Check date matches day of week
    const bookingDate = new Date(dto.scheduledDate);
    if (bookingDate.getUTCDay() !== slot.dayOfWeek) {
      throw new BadRequestException({
        code: 'DATE_MISMATCH',
        message: 'Selected date does not match the availability day',
      });
    }

    // Double-booking prevention: check for existing booking on same slot
    const conflict = await this.prisma.booking.findFirst({
      where: {
        mentorId,
        scheduledDate: bookingDate,
        startTime: slot.startTime,
        status: { notIn: ['cancelled'] },
      },
    });
    if (conflict) {
      throw new ConflictException({
        code: 'SLOT_BOOKED',
        message: 'This time slot is already booked',
      });
    }

    // Also prevent student from double-booking themselves at the same time
    const studentConflict = await this.prisma.booking.findFirst({
      where: {
        studentId,
        scheduledDate: bookingDate,
        startTime: slot.startTime,
        status: { notIn: ['cancelled'] },
      },
    });
    if (studentConflict) {
      throw new ConflictException({
        code: 'STUDENT_DOUBLE_BOOKED',
        message: 'You already have a booking at this time',
      });
    }

    const booking = await this.prisma.booking.create({
      data: {
        mentorId,
        studentId,
        scheduledDate: bookingDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        topic: dto.topic,
        notes: dto.notes,
      },
      include: {
        mentor: { include: { user: { select: { fullName: true } } } },
      },
    });

    // Create pending payment
    await this.prisma.mentorPayment.create({
      data: {
        bookingId: booking.id,
        amount: mentor.hourlyRate,
      },
    });

    this.logger.log(`Booking created: ${booking.id} by student ${studentId}`);
    return booking;
  }

  async listMyBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { studentId: userId },
      include: {
        mentor: {
          include: { user: { select: { fullName: true, avatarUrl: true } } },
        },
        payment: true,
        review: true,
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  async completeBooking(bookingId: string, userId: string) {
    const profile = await this.prisma.mentorProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new BadRequestException({ code: 'NOT_MENTOR', message: 'You are not a mentor' });
    }
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    }
    if (booking.mentorId !== profile.id) {
      throw new ForbiddenException({
        code: 'NOT_MENTOR',
        message: 'Only the mentor can mark a booking as completed',
      });
    }
    if (booking.status !== 'confirmed') {
      throw new BadRequestException({
        code: 'NOT_CONFIRMED',
        message: 'Booking must be confirmed before completing',
      });
    }
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'completed' },
    });
  }

  async payBooking(bookingId: string, studentId: string, paymentId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    }
    if (booking.studentId !== studentId) {
      throw new ForbiddenException({
        code: 'NOT_STUDENT',
        message: 'You can only pay for your own bookings',
      });
    }
    if (!booking.payment) {
      throw new BadRequestException({ code: 'NO_PAYMENT', message: 'No payment record found' });
    }
    if (booking.payment.status === 'completed') {
      throw new BadRequestException({ code: 'ALREADY_PAID', message: 'Booking already paid' });
    }

    await this.prisma.mentorPayment.update({
      where: { id: booking.payment.id },
      data: { status: 'completed', paidAt: new Date() },
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'confirmed' },
    });

    return { success: true, paymentId };
  }

  async reviewMentor(bookingId: string, studentId: string, dto: ReviewMentorDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { review: true },
    });
    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking not found' });
    }
    if (booking.studentId !== studentId) {
      throw new ForbiddenException({
        code: 'NOT_STUDENT',
        message: 'You can only review your own bookings',
      });
    }
    if (booking.status !== 'completed') {
      throw new BadRequestException({
        code: 'NOT_COMPLETED',
        message: 'Can only review completed bookings',
      });
    }
    if (booking.review) {
      throw new ConflictException({
        code: 'REVIEW_EXISTS',
        message: 'Review already exists for this booking',
      });
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const r = await tx.review.create({
        data: {
          bookingId,
          mentorId: booking.mentorId,
          studentId,
          rating: dto.rating,
          comment: dto.comment,
        },
      });

      // Update mentor's average rating
      const agg = await tx.review.aggregate({
        where: { mentorId: booking.mentorId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.mentorProfile.update({
        where: { id: booking.mentorId },
        data: {
          rating: agg._avg.rating ?? 0,
          totalReviews: agg._count.rating,
        },
      });

      return r;
    });

    return review;
  }
}
