import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';

@ApiTags('Search & Discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'search', version: 'v1' })
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @Roles('student', 'faculty', 'college_admin', 'recruiter', 'tpo', 'admin')
  @Resource('search')
  @ApiOperation({ summary: 'Unified search across problems, jobs, mentors, students, companies' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async search(@Query() query: SearchQueryDto) {
    return this.service.search(query.q, query.type, query.limit ?? 20, query.minSimilarity ?? 0.1);
  }
}
