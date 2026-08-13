import { Controller, Get, Post, Put, Param, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { Public } from '../common/decorators/public.decorator';
import { MentorsService } from './mentors.service';
import {
  CreateMentorProfileDto,
  UpdateMentorProfileDto,
  CreateAvailabilityDto,
  BookMentorDto,
  PayBookingDto,
  ReviewMentorDto,
  MentorSearchQueryDto,
} from './dto/mentors.dto';

@ApiTags('mentors')
@Controller('mentors')
export class MentorsController {
  constructor(private readonly mentors: MentorsService) {}

  @Post('profile')
  @ApiBearerAuth()
  @Roles('student', 'faculty')
  @Resource('mentors')
  @ApiOperation({ summary: 'Create mentor profile' })
  createProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMentorProfileDto) {
    return this.mentors.createProfile(user.id, dto);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search mentors' })
  searchMentors(@Query() query: MentorSearchQueryDto) {
    return this.mentors.searchMentors(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get mentor profile' })
  getProfile(@Param('id') id: string) {
    return this.mentors.getProfile(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Resource('mentors')
  @ApiOperation({ summary: 'Update mentor profile' })
  updateProfile(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMentorProfileDto,
  ) {
    return this.mentors.updateProfile(id, user.id, dto);
  }

  @Get(':id/availability')
  @Public()
  @ApiOperation({ summary: 'Get mentor availability' })
  getAvailability(@Param('id') id: string) {
    return this.mentors.getAvailability(id);
  }

  @Post(':id/availability')
  @ApiBearerAuth()
  @Resource('mentors')
  @ApiOperation({ summary: 'Add availability slot' })
  addAvailability(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.mentors.addAvailability(id, user.id, dto);
  }

  @Post(':id/book')
  @ApiBearerAuth()
  @Roles('student')
  @Resource('mentors')
  @ApiOperation({ summary: 'Book a mentor session' })
  bookMentor(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BookMentorDto,
  ) {
    return this.mentors.bookMentor(user.id, id, dto);
  }
}

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly mentors: MentorsService) {}

  @Get('me')
  @ApiBearerAuth()
  @Roles('student')
  @Resource('bookings')
  @ApiOperation({ summary: 'List my bookings' })
  listMyBookings(@CurrentUser() user: AuthenticatedUser) {
    return this.mentors.listMyBookings(user.id);
  }

  @Post(':id/pay')
  @ApiBearerAuth()
  @Roles('student')
  @Resource('bookings')
  @ApiOperation({ summary: 'Pay for a booking' })
  payBooking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PayBookingDto,
  ) {
    return this.mentors.payBooking(id, user.id, dto.paymentId);
  }

  @Post(':id/review')
  @ApiBearerAuth()
  @Roles('student')
  @Resource('bookings')
  @ApiOperation({ summary: 'Review a completed booking' })
  reviewMentor(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReviewMentorDto,
  ) {
    return this.mentors.reviewMentor(id, user.id, dto);
  }

  @Post(':id/complete')
  @ApiBearerAuth()
  @Resource('bookings')
  @ApiOperation({ summary: 'Mark booking as completed (mentor only)' })
  completeBooking(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mentors.completeBooking(id, user.id);
  }
}
