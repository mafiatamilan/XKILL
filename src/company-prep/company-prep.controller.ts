import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Resource } from '../common/decorators/resource.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CompanyPrepService } from './company-prep.service';
import {
  CreateCompanyPrepPathDto,
  UpdateCompanyPrepPathDto,
  CreateHiringPatternDto,
  UpdateHiringPatternDto,
  CreateInterviewQuestionDto,
  UpdateInterviewQuestionDto,
  CreateOnlineAssessmentDto,
  UpdateOnlineAssessmentDto,
  CreateSalaryInsightDto,
  UpdateSalaryInsightDto,
  CreatePrepTimelineDto,
  UpdatePrepTimelineDto,
} from './dto/company-prep.dto';

@ApiTags('company-prep')
@Controller('company-prep')
export class CompanyPrepController {
  constructor(private readonly service: CompanyPrepService) {}

  // ---------- Company CRUD ----------

  @Post()
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Create company prep path' })
  createCompany(@Body() dto: CreateCompanyPrepPathDto) {
    return this.service.createCompany(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List companies with prep paths' })
  listCompanies(
    @Query('q') q?: string,
    @Query('industry') industry?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listCompanies({
      q,
      industry,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search companies' })
  searchCompanies(
    @Query('q') q?: string,
    @Query('industry') industry?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listCompanies({
      q,
      industry,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get full company prep path' })
  getPrepPath(@Param('slug') slug: string) {
    return this.service.getFullPrepPath(slug);
  }

  @Put(':slug')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Update company prep path' })
  updateCompany(@Param('slug') slug: string, @Body() dto: UpdateCompanyPrepPathDto) {
    return this.service.updateCompany(slug, dto);
  }

  @Delete(':slug')
  @ApiBearerAuth()
  @Roles('admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Delete company prep path' })
  deleteCompany(@Param('slug') slug: string) {
    return this.service.deleteCompany(slug);
  }

  // ---------- Hiring Patterns ----------

  @Post(':slug/hiring-patterns')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Add hiring pattern round' })
  addHiringPattern(@Param('slug') slug: string, @Body() dto: CreateHiringPatternDto) {
    return this.service.addHiringPattern(slug, dto);
  }

  @Get(':slug/hiring-patterns')
  @Public()
  @ApiOperation({ summary: 'List hiring patterns' })
  listHiringPatterns(@Param('slug') slug: string) {
    return this.service.listHiringPatterns(slug);
  }

  @Put(':slug/hiring-patterns/:id')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Update hiring pattern' })
  updateHiringPattern(@Param('id') id: string, @Body() dto: UpdateHiringPatternDto) {
    return this.service.updateHiringPattern(id, dto);
  }

  @Delete(':slug/hiring-patterns/:id')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Delete hiring pattern' })
  deleteHiringPattern(@Param('id') id: string) {
    return this.service.deleteHiringPattern(id);
  }

  // ---------- Interview Questions ----------

  @Post(':slug/questions')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Add interview question' })
  addInterviewQuestion(@Param('slug') slug: string, @Body() dto: CreateInterviewQuestionDto) {
    return this.service.addInterviewQuestion(slug, dto);
  }

  @Get(':slug/questions')
  @Public()
  @ApiOperation({ summary: 'List interview questions' })
  listInterviewQuestions(@Param('slug') slug: string, @Query('category') category?: string) {
    return this.service.listInterviewQuestions(slug, category);
  }

  @Put(':slug/questions/:id')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Update interview question' })
  updateInterviewQuestion(@Param('id') id: string, @Body() dto: UpdateInterviewQuestionDto) {
    return this.service.updateInterviewQuestion(id, dto);
  }

  @Delete(':slug/questions/:id')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Delete interview question' })
  deleteInterviewQuestion(@Param('id') id: string) {
    return this.service.deleteInterviewQuestion(id);
  }

  // ---------- Online Assessments ----------

  @Post(':slug/assessments')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Add online assessment' })
  addOnlineAssessment(@Param('slug') slug: string, @Body() dto: CreateOnlineAssessmentDto) {
    return this.service.addOnlineAssessment(slug, dto);
  }

  @Get(':slug/assessments')
  @Public()
  @ApiOperation({ summary: 'List online assessments' })
  listOnlineAssessments(@Param('slug') slug: string) {
    return this.service.listOnlineAssessments(slug);
  }

  @Put(':slug/assessments/:id')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Update online assessment' })
  updateOnlineAssessment(@Param('id') id: string, @Body() dto: UpdateOnlineAssessmentDto) {
    return this.service.updateOnlineAssessment(id, dto);
  }

  @Delete(':slug/assessments/:id')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Delete online assessment' })
  deleteOnlineAssessment(@Param('id') id: string) {
    return this.service.deleteOnlineAssessment(id);
  }

  // ---------- Salary Insights ----------

  @Post(':slug/salary-insights')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Add salary insight' })
  addSalaryInsight(@Param('slug') slug: string, @Body() dto: CreateSalaryInsightDto) {
    return this.service.addSalaryInsight(slug, dto);
  }

  @Get(':slug/salary-insights')
  @Public()
  @ApiOperation({ summary: 'List salary insights' })
  listSalaryInsights(@Param('slug') slug: string) {
    return this.service.listSalaryInsights(slug);
  }

  @Put(':slug/salary-insights/:id')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Update salary insight' })
  updateSalaryInsight(@Param('id') id: string, @Body() dto: UpdateSalaryInsightDto) {
    return this.service.updateSalaryInsight(id, dto);
  }

  @Delete(':slug/salary-insights/:id')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Delete salary insight' })
  deleteSalaryInsight(@Param('id') id: string) {
    return this.service.deleteSalaryInsight(id);
  }

  // ---------- Prep Timelines ----------

  @Post(':slug/timelines')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Add prep timeline week' })
  addPrepTimeline(@Param('slug') slug: string, @Body() dto: CreatePrepTimelineDto) {
    return this.service.addPrepTimeline(slug, dto);
  }

  @Get(':slug/timelines')
  @Public()
  @ApiOperation({ summary: 'List prep timelines' })
  listPrepTimelines(@Param('slug') slug: string) {
    return this.service.listPrepTimelines(slug);
  }

  @Put(':slug/timelines/:id')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Update prep timeline' })
  updatePrepTimeline(@Param('id') id: string, @Body() dto: UpdatePrepTimelineDto) {
    return this.service.updatePrepTimeline(id, dto);
  }

  @Delete(':slug/timelines/:id')
  @ApiBearerAuth()
  @Roles('college_admin', 'admin')
  @Resource('company-prep')
  @ApiOperation({ summary: 'Delete prep timeline' })
  deletePrepTimeline(@Param('id') id: string) {
    return this.service.deletePrepTimeline(id);
  }
}
