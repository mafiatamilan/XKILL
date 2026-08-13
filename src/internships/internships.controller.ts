import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { Public } from '../common/decorators/public.decorator';
import { InternshipsService } from './internships.service';
import {
  CreateInternshipDto,
  UpdateInternshipDto,
  ApplyInternshipDto,
  InternshipSearchQueryDto,
} from './dto/internships.dto';

@ApiTags('internships')
@Controller('internships')
export class InternshipsController {
  constructor(private readonly internships: InternshipsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('internships')
  @ApiOperation({ summary: 'Create an internship listing' })
  createInternship(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInternshipDto) {
    return this.internships.createInternship(user.id, dto);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search internship listings' })
  searchInternships(@Query() query: InternshipSearchQueryDto) {
    return this.internships.searchInternships(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get internship listing by ID' })
  getInternship(@Param('id') id: string) {
    return this.internships.getInternshipById(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('internships')
  @ApiOperation({ summary: 'Update an internship listing' })
  updateInternship(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateInternshipDto,
  ) {
    return this.internships.updateInternship(id, user.id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('recruiter')
  @Resource('internships')
  @ApiOperation({ summary: 'Delete an internship listing' })
  deleteInternship(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.internships.deleteInternship(id, user.id);
  }

  @Post(':id/apply')
  @ApiBearerAuth()
  @Roles('student')
  @Resource('internships')
  @ApiOperation({ summary: 'Apply to an internship' })
  applyToInternship(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyInternshipDto,
  ) {
    return this.internships.applyToInternship(id, user.id, dto);
  }

  @Get(':id/certificate')
  @ApiBearerAuth()
  @Roles('student')
  @Resource('internships')
  @ApiOperation({ summary: 'Get internship completion certificate' })
  getCertificate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.internships.getInternshipCertificate(id, user.id);
  }
}
