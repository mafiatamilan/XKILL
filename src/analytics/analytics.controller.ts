import { Controller, Get, Post, Param, Body, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { CustomReportDto } from './dto/analytics.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';

@ApiTags('Analytics & Reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'analytics', version: 'v1' })
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('student/:id')
  @Roles('admin', 'college_admin', 'faculty', 'tpo')
  @Resource('analytics')
  @ApiOperation({ summary: 'Get comprehensive student analytics' })
  @ApiResponse({ status: 200, description: 'Student analytics returned' })
  async getStudentAnalytics(@Param('id') id: string) {
    return this.service.getStudentAnalytics(id);
  }

  @Get('recruiter/:id')
  @Roles('admin', 'recruiter')
  @Resource('analytics')
  @ApiOperation({ summary: 'Get recruiter hiring analytics' })
  @ApiResponse({ status: 200, description: 'Recruiter analytics returned' })
  async getRecruiterAnalytics(@Param('id') id: string) {
    return this.service.getRecruiterAnalytics(id);
  }

  @Get('faculty/:id')
  @Roles('admin', 'college_admin', 'faculty')
  @Resource('analytics')
  @ApiOperation({ summary: 'Get faculty teaching analytics' })
  @ApiResponse({ status: 200, description: 'Faculty analytics returned' })
  async getFacultyAnalytics(@Param('id') id: string) {
    return this.service.getFacultyAnalytics(id);
  }

  @Get('placement')
  @Roles('admin', 'college_admin', 'tpo')
  @Resource('analytics')
  @ApiOperation({ summary: 'Get placement analytics' })
  @ApiResponse({ status: 200, description: 'Placement analytics returned' })
  async getPlacementAnalytics() {
    return this.service.getPlacementAnalytics();
  }

  @Get('college/:id')
  @Roles('admin', 'college_admin')
  @Resource('analytics')
  @ApiOperation({ summary: 'Get college analytics' })
  @ApiResponse({ status: 200, description: 'College analytics returned' })
  async getCollegeAnalytics(@Param('id') id: string) {
    return this.service.getCollegeAnalytics(id);
  }

  @Get('revenue')
  @Roles('admin')
  @Resource('analytics')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiResponse({ status: 200, description: 'Revenue analytics returned' })
  async getRevenueAnalytics() {
    return this.service.getRevenueAnalytics();
  }

  @Post('custom-report')
  @Roles('admin', 'college_admin', 'tpo')
  @Resource('analytics')
  @ApiOperation({ summary: 'Generate a custom report (JSON or CSV)' })
  @ApiResponse({ status: 201, description: 'Custom report generated' })
  async generateCustomReport(@Body() dto: CustomReportDto, @Res() res: Response) {
    const result = await this.service.generateCustomReport(dto);

    if (dto.format === 'csv' && 'csv' in result) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${dto.entity}-report.csv"`);
      return res.send((result as { csv: string }).csv);
    }

    return res.json(result);
  }
}
