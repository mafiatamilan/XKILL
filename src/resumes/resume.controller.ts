import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { ResumeService } from './resume.service';
import {
  AtsAnalysisDto,
  CreateResumeDto,
  ResumeExportQueryDto,
  ResumeListQueryDto,
  UpdateResumeDto,
} from './dto/resume.dto';

@ApiTags('resumes')
@ApiBearerAuth()
@Roles('student')
@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumes: ResumeService) {}

  @Get('templates')
  @Resource('resume-templates')
  @ApiOperation({ summary: 'List available resume templates (seeded)' })
  listTemplates() {
    return this.resumes.listTemplates();
  }

  @Post()
  @Resource('resumes')
  @ApiOperation({
    summary:
      'Create a resume and auto-snapshot its first version (version 1). Requires a valid templateId.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateResumeDto) {
    return this.resumes.createResume(user.id, dto as never, user.email);
  }

  @Get()
  @Resource('resumes')
  @ApiOperation({ summary: 'List my resumes (paginated)' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ResumeListQueryDto) {
    return this.resumes.listResumes(user.id, query.page, query.limit);
  }

  @Get(':id')
  @Resource('resumes')
  @ApiOperation({ summary: 'Get one of my resumes with its full content' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resumes.getResume(user.id, id);
  }

  @Patch(':id')
  @Resource('resumes')
  @ApiOperation({
    summary:
      'Update a resume. Content changes auto-snapshot a new ResumeVersion (history is never rewritten).',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateResumeDto,
  ) {
    return this.resumes.updateResume(user.id, id, dto as never, user.email);
  }

  @Delete(':id')
  @Resource('resumes')
  @ApiOperation({ summary: 'Delete one of my resumes' })
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resumes.deleteResume(user.id, id, user.email);
  }

  @Post(':id/ats-analysis')
  @Resource('resume-ats')
  @ApiOperation({
    summary:
      'Run ATS analysis: deterministic structural score + AI-generated suggestions. Optionally pass a jobDescription for keyword overlap.',
  })
  runAtsAnalysis(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AtsAnalysisDto,
  ) {
    return this.resumes.runAtsAnalysis(user.id, id, dto, user.email);
  }

  @Get(':id/score')
  @Resource('resume-ats')
  @ApiOperation({ summary: 'Get the persisted deterministic ATS score (no AI re-run)' })
  getScore(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resumes.getScore(user.id, id);
  }

  @Get(':id/suggestions')
  @Resource('resume-ats')
  @ApiOperation({ summary: 'Get the persisted AI ATS suggestions' })
  getSuggestions(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resumes.getSuggestions(user.id, id);
  }

  @Get(':id/export')
  @Resource('resumes')
  @Header('Content-Disposition', 'attachment')
  @ApiOperation({
    summary:
      'Export the resume as PDF or DOCX, generated on demand from current (or `?versionId=`) content.',
  })
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ResumeExportQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.resumes.exportResume(user.id, id, query.format, query.versionId);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="resume-${id}.${result.extension}"`);
    res.send(result.buffer);
  }

  @Get(':id/versions')
  @Resource('resume-versions')
  @ApiOperation({ summary: 'List resume version history (paginated)' })
  listVersions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ResumeListQueryDto,
  ) {
    return this.resumes.listVersions(user.id, id, query.page, query.limit);
  }

  @Post(':id/versions/:versionId/restore')
  @Resource('resume-versions')
  @ApiOperation({
    summary:
      'Restore a previous version. Creates a NEW version from the restored content — history is preserved, nothing is overwritten or deleted.',
  })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.resumes.restoreVersion(user.id, id, versionId, user.email);
  }
}
