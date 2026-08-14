import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { RecruiterService } from './recruiter.service';
import {
  CreateRecruiterProfileDto,
  UpdateRecruiterProfileDto,
  CreateShortlistDto,
  UpdateShortlistStatusDto,
  CreateInterviewScheduleDto,
  UpdateInterviewScheduleDto,
} from './dto/recruiter.dto';

@ApiTags('recruiter')
@Controller('recruiter')
export class RecruiterController {
  constructor(private readonly service: RecruiterService) {}

  // ---------- Profile ----------

  @Post('profile')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'Create recruiter profile' })
  createProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRecruiterProfileDto) {
    return this.service.createProfile(user.id, dto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'Get my recruiter profile' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getProfile(user.id);
  }

  @Put('profile')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'Update recruiter profile' })
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateRecruiterProfileDto) {
    return this.service.updateProfile(user.id, dto);
  }

  // ---------- Dashboard ----------

  @Get('dashboard')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'Get recruiter dashboard' })
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getDashboard(user.id);
  }

  // ---------- Candidates ----------

  @Get('candidates/search')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'Search candidates' })
  searchCandidates(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') q?: string,
    @Query('skills') skills?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.searchCandidates({
      q,
      skills,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ---------- Shortlist ----------

  @Post('shortlist/:candidateId')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'Shortlist a candidate' })
  shortlistCandidate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('candidateId') candidateId: string,
    @Body() dto: CreateShortlistDto,
  ) {
    return this.service.shortlistCandidate(user.id, candidateId, dto);
  }

  @Get('shortlist')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'List my shortlisted candidates' })
  listShortlists(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listShortlists(user.id);
  }

  @Put('shortlist/:id/status')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'Update shortlist status' })
  updateShortlistStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateShortlistStatusDto,
  ) {
    return this.service.updateShortlistStatus(id, user.id, dto);
  }

  // ---------- Interviews ----------

  @Post('interviews')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'Schedule an interview' })
  createInterview(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInterviewScheduleDto) {
    return this.service.createInterview(user.id, dto);
  }

  @Get('interviews')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'List my interviews' })
  listInterviews(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: string) {
    return this.service.listInterviews(user.id, status);
  }

  @Put('interviews/:id')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'Update interview' })
  updateInterview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateInterviewScheduleDto,
  ) {
    return this.service.updateInterview(id, user.id, dto);
  }

  @Delete('interviews/:id')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'Cancel interview' })
  deleteInterview(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.deleteInterview(id, user.id);
  }

  // ---------- Analytics ----------

  @Get('analytics')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('recruiter')
  @ApiOperation({ summary: 'Get hiring analytics' })
  getAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getAnalytics(user.id);
  }
}
