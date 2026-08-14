import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { TpoService } from './tpo.service';
import {
  CreateCompanyDriveDto,
  UpdateCompanyDriveDto,
  CreateEligibilityCriteriaDto,
  CreateOfferRecordDto,
  UpdateOfferRecordDto,
  CreateTpoInterviewDto,
  UpdateTpoInterviewDto,
  CreatePlacementReportDto,
} from './dto/tpo.dto';

@ApiTags('tpo')
@Controller('tpo')
export class TpoController {
  constructor(private readonly service: TpoService) {}

  // ---------- Dashboard ----------

  @Get('dashboard')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Get TPO dashboard' })
  getDashboard() {
    return this.service.getDashboard();
  }

  // ---------- Company Drives ----------

  @Post('company-drives')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Create company drive' })
  createDrive(@Body() dto: CreateCompanyDriveDto) {
    return this.service.createDrive(dto);
  }

  @Get('company-drives')
  @ApiBearerAuth()
  @Roles('tpo', 'admin', 'student')
  @Resource('tpo')
  @ApiOperation({ summary: 'List company drives' })
  listDrives(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listDrives({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('company-drives/:id')
  @ApiBearerAuth()
  @Roles('tpo', 'admin', 'student')
  @Resource('tpo')
  @ApiOperation({ summary: 'Get company drive details' })
  getDrive(@Param('id') id: string) {
    return this.service.getDrive(id);
  }

  @Put('company-drives/:id')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Update company drive' })
  updateDrive(@Param('id') id: string, @Body() dto: UpdateCompanyDriveDto) {
    return this.service.updateDrive(id, dto);
  }

  @Delete('company-drives/:id')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Delete company drive' })
  deleteDrive(@Param('id') id: string) {
    return this.service.deleteDrive(id);
  }

  // ---------- Eligibility ----------

  @Post('company-drives/:driveId/eligibility')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Add eligibility criteria' })
  addEligibility(@Param('driveId') driveId: string, @Body() dto: CreateEligibilityCriteriaDto) {
    return this.service.addEligibility(driveId, dto);
  }

  @Get('company-drives/:driveId/eligibility')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'List eligibility criteria' })
  listEligibilities(@Param('driveId') driveId: string) {
    return this.service.listEligibilities(driveId);
  }

  @Get('students/eligibility')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Check student eligibility for a drive' })
  checkEligibility(@Query('driveId') driveId: string) {
    return this.service.checkEligibility(driveId);
  }

  // ---------- Offers ----------

  @Post('company-drives/:driveId/offers')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Create offer record' })
  createOffer(@Param('driveId') driveId: string, @Body() dto: CreateOfferRecordDto) {
    return this.service.createOffer(driveId, dto);
  }

  @Get('company-drives/:driveId/offers')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'List offer records' })
  listOffers(@Param('driveId') driveId: string, @Query('status') status?: string) {
    return this.service.listOffers(driveId, status);
  }

  @Put('offers/:id')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Update offer record' })
  updateOffer(@Param('id') id: string, @Body() dto: UpdateOfferRecordDto) {
    return this.service.updateOffer(id, dto);
  }

  // ---------- Interviews ----------

  @Post('company-drives/:driveId/interviews')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Schedule TPO interview' })
  createInterview(@Param('driveId') driveId: string, @Body() dto: CreateTpoInterviewDto) {
    return this.service.createInterview(driveId, dto);
  }

  @Get('company-drives/:driveId/interviews')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'List TPO interviews' })
  listInterviews(@Param('driveId') driveId: string, @Query('status') status?: string) {
    return this.service.listInterviews(driveId, status);
  }

  @Put('interviews/:id')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Update TPO interview' })
  updateInterview(@Param('id') id: string, @Body() dto: UpdateTpoInterviewDto) {
    return this.service.updateInterview(id, dto);
  }

  // ---------- Placement Reports ----------

  @Post('placement-reports')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Create placement report' })
  createPlacementReport(@Body() dto: CreatePlacementReportDto) {
    return this.service.createPlacementReport(dto);
  }

  @Get('placement-reports')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'List placement reports' })
  listPlacementReports(@Query('academicYear') academicYear?: string) {
    return this.service.listPlacementReports(academicYear);
  }

  // ---------- Department Stats ----------

  @Get('department-stats')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Get department-wise placement stats' })
  getDepartmentStats() {
    return this.service.getDepartmentStats();
  }

  // ---------- Recruiters Coordination ----------

  @Post('recruiters/:recruiterId/coordinate')
  @ApiBearerAuth()
  @Roles('tpo', 'admin')
  @Resource('tpo')
  @ApiOperation({ summary: 'Coordinate recruiter with a drive' })
  coordinateRecruiter(@Param('recruiterId') recruiterId: string, @Body('driveId') driveId: string) {
    return this.service.coordinateRecruiter(recruiterId, driveId);
  }
}
