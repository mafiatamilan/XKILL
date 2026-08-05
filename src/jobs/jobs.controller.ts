import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JobsService } from './jobs.service';
import {
  CreateJobListingDto,
  UpdateJobListingDto,
  ApplyToJobDto,
  JobSearchQueryDto,
} from './dto/jobs.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('jobs')
  @ApiOperation({ summary: 'Create a job listing' })
  createJob(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateJobListingDto) {
    return this.jobs.createJob(user.id, dto);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search job listings with filters' })
  searchJobs(@Query() query: JobSearchQueryDto) {
    return this.jobs.searchJobs(query);
  }

  @Get('me/applications')
  @ApiBearerAuth()
  @Roles('student')
  @Resource('jobs')
  @ApiOperation({ summary: 'List my job applications' })
  listMyApplications(@CurrentUser() user: AuthenticatedUser) {
    return this.jobs.listMyApplications(user.id);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get job listing by ID' })
  getJob(@Param('id') id: string) {
    return this.jobs.getJobById(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('jobs')
  @ApiOperation({ summary: 'Update a job listing' })
  updateJob(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateJobListingDto,
  ) {
    return this.jobs.updateJob(id, user.id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('jobs')
  @ApiOperation({ summary: 'Delete a job listing' })
  deleteJob(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.jobs.deleteJob(id, user.id);
  }

  @Post(':id/apply')
  @ApiBearerAuth()
  @Roles('student')
  @Resource('jobs')
  @ApiOperation({ summary: 'Apply to a job listing' })
  applyToJob(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyToJobDto,
  ) {
    return this.jobs.applyToJob(id, user.id, dto);
  }

  @Post(':id/save')
  @ApiBearerAuth()
  @Roles('student')
  @Resource('jobs')
  @ApiOperation({ summary: 'Save a job listing' })
  saveJob(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.jobs.saveJob(id, user.id);
  }

  @Delete(':id/save')
  @ApiBearerAuth()
  @Roles('student')
  @Resource('jobs')
  @ApiOperation({ summary: 'Unsave a job listing' })
  unsaveJob(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.jobs.unsaveJob(id, user.id);
  }

  @Get(':id/eligibility-check')
  @ApiBearerAuth()
  @Roles('student')
  @Resource('jobs')
  @ApiOperation({ summary: 'Check eligibility for a job' })
  checkEligibility(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.jobs.checkEligibility(id, user.id);
  }

  @Post(':id/contact-recruiter')
  @ApiBearerAuth()
  @Roles('student')
  @Resource('jobs')
  @ApiOperation({ summary: 'Get recruiter contact info for a job' })
  contactRecruiter(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.jobs.contactRecruiter(id, user.id);
  }
}

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly jobs: JobsService) {}

  @Get(':id/profile')
  @Public()
  @ApiOperation({ summary: 'Get company profile' })
  getCompanyProfile(@Param('id') id: string) {
    return this.jobs.getCompanyProfile(id);
  }
}
