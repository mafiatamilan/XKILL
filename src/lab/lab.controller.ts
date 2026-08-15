import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { LabService } from './lab.service';
import {
  CreateLabSubjectDto,
  UpdateLabSubjectDto,
  CreateLabExperimentDto,
  UpdateLabExperimentDto,
  SubmitExperimentDto,
  CreateProgrammingAssignmentDto,
  CreatePracticalExamDto,
  CreateVivaDto,
  CreateMiniProjectDto,
  MarkAttendanceDto,
  CreateCourseOutcomeDto,
  CreateProgramOutcomeDto,
  CreateCoPoMappingDto,
  LabPaginationDto,
} from './dto/lab.dto';

@ApiTags('College Programming Lab')
@ApiBearerAuth()
@Controller('lab')
export class LabController {
  constructor(private readonly service: LabService) {}

  // ── Subjects ──

  @Get('subjects')
  @Roles('student', 'faculty', 'admin')
  @Resource('lab-subjects')
  @ApiOperation({ summary: 'List lab subjects' })
  listSubjects(@Query() query: LabPaginationDto) {
    return this.service.listSubjects(query.page, query.limit);
  }

  @Get('subjects/:id')
  @Roles('student', 'faculty', 'admin')
  @Resource('lab-subjects')
  @ApiOperation({ summary: 'Get a lab subject' })
  getSubject(@Param('id') id: string) {
    return this.service.getSubject(id);
  }

  @Post('subjects')
  @Roles('faculty', 'admin')
  @Resource('lab-subjects')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a lab subject' })
  createSubject(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLabSubjectDto) {
    return this.service.createSubject(user.id, dto);
  }

  @Put('subjects/:id')
  @Roles('faculty', 'admin')
  @Resource('lab-subjects')
  @ApiOperation({ summary: 'Update a lab subject' })
  updateSubject(@Param('id') id: string, @Body() dto: UpdateLabSubjectDto) {
    return this.service.updateSubject(id, dto);
  }

  @Delete('subjects/:id')
  @Roles('faculty', 'admin')
  @Resource('lab-subjects')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lab subject' })
  deleteSubject(@Param('id') id: string) {
    return this.service.deleteSubject(id);
  }

  // ── Experiments ──

  @Get('subjects/:subjectId/experiments')
  @Roles('student', 'faculty', 'admin')
  @Resource('lab-experiments')
  @ApiOperation({ summary: 'List experiments for a subject' })
  listExperiments(@Param('subjectId') subjectId: string) {
    return this.service.listExperiments(subjectId);
  }

  @Get('experiments/:id')
  @Roles('student', 'faculty', 'admin')
  @Resource('lab-experiments')
  @ApiOperation({ summary: 'Get an experiment' })
  getExperiment(@Param('id') id: string) {
    return this.service.getExperiment(id);
  }

  @Post('subjects/:subjectId/experiments')
  @Roles('faculty', 'admin')
  @Resource('lab-experiments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an experiment' })
  createExperiment(@Param('subjectId') subjectId: string, @Body() dto: CreateLabExperimentDto) {
    return this.service.createExperiment(subjectId, dto);
  }

  @Put('experiments/:id')
  @Roles('faculty', 'admin')
  @Resource('lab-experiments')
  @ApiOperation({ summary: 'Update an experiment' })
  updateExperiment(@Param('id') id: string, @Body() dto: UpdateLabExperimentDto) {
    return this.service.updateExperiment(id, dto);
  }

  @Delete('experiments/:id')
  @Roles('faculty', 'admin')
  @Resource('lab-experiments')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an experiment' })
  deleteExperiment(@Param('id') id: string) {
    return this.service.deleteExperiment(id);
  }

  // ── Submissions ──

  @Post('experiments/:id/submit')
  @Roles('student')
  @Resource('lab-submissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit code for an experiment' })
  submitExperiment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitExperimentDto,
  ) {
    return this.service.submitExperiment(id, user.id, dto);
  }

  @Get('submissions/:id/results')
  @Roles('student', 'faculty', 'admin')
  @Resource('lab-submissions')
  @ApiOperation({ summary: 'Get submission results' })
  getSubmissionResults(@Param('id') id: string) {
    return this.service.getSubmissionResults(id);
  }

  @Post('submissions/:id/evaluate')
  @Roles('faculty', 'admin')
  @Resource('lab-submissions')
  @ApiOperation({ summary: 'Evaluate a submission' })
  evaluateSubmission(
    @Param('id') id: string,
    @Body()
    dto: {
      compilationScore?: number;
      correctnessScore?: number;
      efficiencyScore?: number;
      codingStandardsScore?: number;
      documentationScore?: number;
      feedback?: string;
    },
  ) {
    return this.service.evaluateSubmission(id, dto);
  }

  // ── Assignments ──

  @Get('subjects/:subjectId/assignments')
  @Roles('student', 'faculty', 'admin')
  @Resource('lab-assignments')
  @ApiOperation({ summary: 'List assignments' })
  listAssignments(@Param('subjectId') subjectId: string) {
    return this.service.listAssignments(subjectId);
  }

  @Post('subjects/:subjectId/assignments')
  @Roles('faculty', 'admin')
  @Resource('lab-assignments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an assignment' })
  createAssignment(
    @Param('subjectId') subjectId: string,
    @Body() dto: CreateProgrammingAssignmentDto,
  ) {
    return this.service.createAssignment(subjectId, dto);
  }

  // ── Practical Exams ──

  @Get('subjects/:subjectId/exams')
  @Roles('student', 'faculty', 'admin')
  @Resource('lab-exams')
  @ApiOperation({ summary: 'List practical exams' })
  listExams(@Param('subjectId') subjectId: string) {
    return this.service.listExams(subjectId);
  }

  @Post('subjects/:subjectId/exams')
  @Roles('faculty', 'admin')
  @Resource('lab-exams')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a practical exam' })
  createExam(@Param('subjectId') subjectId: string, @Body() dto: CreatePracticalExamDto) {
    return this.service.createExam(subjectId, dto);
  }

  @Post('exams/:id/start-session')
  @Roles('student')
  @Resource('lab-exams')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start an exam session' })
  startExamSession(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.startExamSession(id, user.id);
  }

  @Post('exams/:id/submit')
  @Roles('student')
  @Resource('lab-exams')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Submit exam' })
  submitExam(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.submitExam(id, user.id);
  }

  // ── Viva ──

  @Get('subjects/:subjectId/vivas')
  @Roles('student', 'faculty', 'admin')
  @Resource('lab-vivas')
  @ApiOperation({ summary: 'List viva records' })
  listVivas(@Param('subjectId') subjectId: string) {
    return this.service.listVivas(subjectId);
  }

  @Post('subjects/:subjectId/vivas')
  @Roles('faculty', 'admin')
  @Resource('lab-vivas')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a viva record' })
  createViva(@Param('subjectId') subjectId: string, @Body() dto: CreateVivaDto) {
    return this.service.createViva(subjectId, dto);
  }

  // ── Mini Projects ──

  @Get('subjects/:subjectId/projects')
  @Roles('student', 'faculty', 'admin')
  @Resource('lab-projects')
  @ApiOperation({ summary: 'List mini projects' })
  listMiniProjects(@Param('subjectId') subjectId: string) {
    return this.service.listMiniProjects(subjectId);
  }

  @Post('subjects/:subjectId/projects')
  @Roles('student', 'faculty', 'admin')
  @Resource('lab-projects')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a mini project' })
  createMiniProject(@Param('subjectId') subjectId: string, @Body() dto: CreateMiniProjectDto) {
    return this.service.createMiniProject(subjectId, dto);
  }

  @Put('projects/:id')
  @Roles('faculty', 'admin')
  @Resource('lab-projects')
  @ApiOperation({ summary: 'Evaluate a mini project' })
  evaluateMiniProject(
    @Param('id') id: string,
    @Body() dto: { evaluationScore: number; evaluationFeedback: string },
  ) {
    return this.service.evaluateMiniProject(id, dto);
  }

  // ── Attendance ──

  @Get('subjects/:subjectId/attendance')
  @Roles('student', 'faculty', 'admin')
  @Resource('lab-attendance')
  @ApiOperation({ summary: 'List attendance' })
  listAttendance(@Param('subjectId') subjectId: string, @Query('studentId') studentId?: string) {
    return this.service.listAttendance(subjectId, studentId);
  }

  @Post('subjects/:subjectId/attendance')
  @Roles('student')
  @Resource('lab-attendance')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mark attendance' })
  markAttendance(
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.service.markAttendance(subjectId, user.id, dto);
  }

  // ── OBE ──

  @Get('subjects/:subjectId/obe/course-outcomes')
  @Roles('faculty', 'admin')
  @Resource('lab-obe')
  @ApiOperation({ summary: 'List course outcomes' })
  listCourseOutcomes(@Param('subjectId') subjectId: string) {
    return this.service.listCourseOutcomes(subjectId);
  }

  @Post('subjects/:subjectId/obe/course-outcomes')
  @Roles('faculty', 'admin')
  @Resource('lab-obe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a course outcome' })
  createCourseOutcome(@Param('subjectId') subjectId: string, @Body() dto: CreateCourseOutcomeDto) {
    return this.service.createCourseOutcome(subjectId, dto);
  }

  @Get('obe/program-outcomes')
  @Roles('faculty', 'admin')
  @Resource('lab-obe')
  @ApiOperation({ summary: 'List program outcomes' })
  listProgramOutcomes() {
    return this.service.listProgramOutcomes();
  }

  @Post('obe/program-outcomes')
  @Roles('faculty', 'admin')
  @Resource('lab-obe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a program outcome' })
  createProgramOutcome(@Body() dto: CreateProgramOutcomeDto) {
    return this.service.createProgramOutcome(dto);
  }

  @Post('obe/co-po-mapping')
  @Roles('faculty', 'admin')
  @Resource('lab-obe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create/update CO-PO mapping' })
  createCoPoMapping(@Body() dto: CreateCoPoMappingDto) {
    return this.service.createCoPoMapping(dto);
  }

  @Get('subjects/:subjectId/obe/attainment-report')
  @Roles('faculty', 'admin')
  @Resource('lab-obe')
  @ApiOperation({ summary: 'Get CO-PO attainment report' })
  getAttainmentReport(@Param('subjectId') subjectId: string) {
    return this.service.getAttainmentReport(subjectId);
  }

  // ── Analytics ──

  @Get('faculty/analytics')
  @Roles('faculty', 'admin')
  @Resource('lab-analytics')
  @ApiOperation({ summary: 'Get faculty analytics' })
  getFacultyAnalytics(@Query('subjectId') subjectId: string) {
    return this.service.getFacultyAnalytics(subjectId);
  }

  @Get('student/analytics')
  @Roles('student')
  @Resource('lab-analytics')
  @ApiOperation({ summary: 'Get student analytics' })
  getStudentAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getStudentAnalytics(user.id);
  }

  @Get('semester-dashboard')
  @Roles('student')
  @Resource('lab-analytics')
  @ApiOperation({ summary: 'Get semester dashboard' })
  getSemesterDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getSemesterDashboard(user.id);
  }
}
