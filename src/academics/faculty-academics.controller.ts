import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Ip,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';
import { FacultyAcademicsService } from './faculty-academics.service';
import {
  BulkMarksDto,
  CreateAssignmentDto,
  CreateExamDto,
  CreateMaterialDto,
  CreateQuestionDto,
  CreateSubjectDto,
  MarkAttendanceDto,
  UpdateAssignmentDto,
  UpdateExamDto,
  UpdateMaterialDto,
  UpdateQuestionDto,
  UpdateSubjectDto,
} from './dto/academics.dto';

@ApiTags('faculty')
@ApiBearerAuth()
@Roles('faculty')
@Controller('faculty')
export class FacultyController {
  constructor(private readonly faculty: FacultyAcademicsService) {}

  // ---- Subjects ----

  @Get('subjects')
  @Resource('faculty-subjects')
  @ApiOperation({ summary: 'List subjects assigned to the current faculty member' })
  listSubjects(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.faculty.listMySubjects(user.id, query.page, query.limit);
  }

  @Get('subjects/:id')
  @Resource('faculty-subjects')
  @ApiOperation({ summary: 'Get one of the faculty member own subjects' })
  getSubject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.faculty.getSubject(user.id, id);
  }

  @Post('subjects')
  @Resource('faculty-subjects')
  @ApiOperation({ summary: 'Create a subject assigned to the current faculty member' })
  createSubject(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubjectDto,
    @Ip() ip: string,
  ) {
    return this.faculty.createSubject(user.id, dto, ip);
  }

  @Patch('subjects/:id')
  @Resource('faculty-subjects')
  @ApiOperation({ summary: 'Update an assigned subject' })
  updateSubject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
    @Ip() ip: string,
  ) {
    return this.faculty.updateSubject(user.id, id, dto as unknown as Record<string, unknown>, ip);
  }

  @Delete('subjects/:id')
  @HttpCode(204)
  @Resource('faculty-subjects')
  @ApiOperation({ summary: 'Delete an assigned subject' })
  async deleteSubject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Ip() ip: string,
  ): Promise<void> {
    await this.faculty.deleteSubject(user.id, id, ip);
  }

  // ---- Materials ----

  @Get('subjects/:id/materials')
  @Resource('faculty-materials')
  @ApiOperation({ summary: 'List study materials for an assigned subject' })
  listMaterials(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.faculty.listMaterials(user.id, id);
  }

  @Post('subjects/:id/materials')
  @Resource('faculty-materials')
  @ApiOperation({ summary: 'Add study material to an assigned subject' })
  createMaterial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateMaterialDto,
    @Ip() ip: string,
  ) {
    return this.faculty.createMaterial(user.id, id, dto, ip);
  }

  @Patch('materials/:materialId')
  @Resource('faculty-materials')
  @ApiOperation({ summary: 'Update a study material' })
  updateMaterial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('materialId') materialId: string,
    @Body() dto: UpdateMaterialDto,
    @Ip() ip: string,
  ) {
    return this.faculty.updateMaterial(
      user.id,
      materialId,
      dto as unknown as Record<string, unknown>,
      ip,
    );
  }

  @Delete('materials/:materialId')
  @HttpCode(204)
  @Resource('faculty-materials')
  @ApiOperation({ summary: 'Delete a study material' })
  async deleteMaterial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('materialId') materialId: string,
    @Ip() ip: string,
  ): Promise<void> {
    await this.faculty.deleteMaterial(user.id, materialId, ip);
  }

  // ---- Attendance ----

  @Post('attendance')
  @Resource('faculty-attendance')
  @ApiOperation({ summary: 'Mark a session attendance (batch upsert, transactional)' })
  markAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MarkAttendanceDto,
    @Ip() ip: string,
  ) {
    return this.faculty.markAttendance(user.id, dto, ip);
  }

  @Get('attendance')
  @Resource('faculty-attendance')
  @ApiOperation({ summary: 'List attendance records for an assigned subject' })
  getAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query('subjectId') subjectId: string,
    @Query('sessionDate') sessionDate?: string,
  ) {
    return this.faculty.getAttendance(user.id, subjectId, sessionDate);
  }

  // ---- Assignments ----

  @Get('subjects/:id/assignments')
  @Resource('faculty-assignments')
  @ApiOperation({ summary: 'List assignments for an assigned subject' })
  listAssignments(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.faculty.listAssignments(user.id, id);
  }

  @Post('subjects/:id/assignments')
  @Resource('faculty-assignments')
  @ApiOperation({ summary: 'Create an assignment for an assigned subject' })
  createAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateAssignmentDto,
    @Ip() ip: string,
  ) {
    return this.faculty.createAssignment(user.id, id, dto, ip);
  }

  @Patch('assignments/:assignmentId')
  @Resource('faculty-assignments')
  @ApiOperation({ summary: 'Update an assignment' })
  updateAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @Ip() ip: string,
  ) {
    return this.faculty.updateAssignment(
      user.id,
      assignmentId,
      dto as unknown as Record<string, unknown>,
      ip,
    );
  }

  @Delete('assignments/:assignmentId')
  @HttpCode(204)
  @Resource('faculty-assignments')
  @ApiOperation({ summary: 'Delete an assignment' })
  async deleteAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
    @Ip() ip: string,
  ): Promise<void> {
    await this.faculty.deleteAssignment(user.id, assignmentId, ip);
  }

  // ---- Exams ----

  @Get('subjects/:id/exams')
  @Resource('faculty-exams')
  @ApiOperation({ summary: 'List exams for an assigned subject' })
  listExams(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.faculty.listExams(user.id, id);
  }

  @Post('subjects/:id/exams')
  @Resource('faculty-exams')
  @ApiOperation({ summary: 'Create an exam for an assigned subject' })
  createExam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateExamDto,
    @Ip() ip: string,
  ) {
    return this.faculty.createExam(user.id, id, dto, ip);
  }

  @Patch('exams/:examId')
  @Resource('faculty-exams')
  @ApiOperation({ summary: 'Update an exam' })
  updateExam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('examId') examId: string,
    @Body() dto: UpdateExamDto,
    @Ip() ip: string,
  ) {
    return this.faculty.updateExam(user.id, examId, dto as unknown as Record<string, unknown>, ip);
  }

  @Delete('exams/:examId')
  @HttpCode(204)
  @Resource('faculty-exams')
  @ApiOperation({ summary: 'Delete an exam' })
  async deleteExam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('examId') examId: string,
    @Ip() ip: string,
  ): Promise<void> {
    await this.faculty.deleteExam(user.id, examId, ip);
  }

  // ---- Marks ----

  @Post('exams/:examId/marks')
  @Resource('faculty-marks')
  @ApiOperation({
    summary: 'Bulk enter exam marks (transactional — partial failure rolls back the batch)',
  })
  enterBulkMarks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('examId') examId: string,
    @Body() dto: BulkMarksDto,
    @Ip() ip: string,
  ) {
    return this.faculty.enterBulkMarks(user.id, examId, dto, ip);
  }

  @Get('exams/:examId/marks')
  @Resource('faculty-marks')
  @ApiOperation({ summary: 'List marks entered for an exam (gradebook)' })
  getExamMarks(@CurrentUser() user: AuthenticatedUser, @Param('examId') examId: string) {
    return this.faculty.getExamMarks(user.id, examId);
  }

  // ---- Student analytics ----

  @Get('students/:studentId/analytics')
  @Resource('faculty-analytics')
  @ApiOperation({
    summary: 'Attendance + GPA analytics for a student, scoped to the faculty subjects',
  })
  getStudentAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ) {
    return this.faculty.getStudentAnalytics(user.id, studentId);
  }

  // ---- Question bank ----

  @Get('subjects/:id/question-bank')
  @Resource('faculty-question-bank')
  @ApiOperation({ summary: 'List question-bank items for an assigned subject' })
  listQuestions(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.faculty.listQuestions(user.id, id);
  }

  @Post('subjects/:id/question-bank')
  @Resource('faculty-question-bank')
  @ApiOperation({ summary: 'Add a question-bank item to an assigned subject' })
  createQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateQuestionDto,
    @Ip() ip: string,
  ) {
    return this.faculty.createQuestion(user.id, id, dto, ip);
  }

  @Patch('question-bank/:questionId')
  @Resource('faculty-question-bank')
  @ApiOperation({ summary: 'Update a question-bank item' })
  updateQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
    @Ip() ip: string,
  ) {
    return this.faculty.updateQuestion(
      user.id,
      questionId,
      dto as unknown as Record<string, unknown>,
      ip,
    );
  }

  @Delete('question-bank/:questionId')
  @HttpCode(204)
  @Resource('faculty-question-bank')
  @ApiOperation({ summary: 'Delete a question-bank item' })
  async deleteQuestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('questionId') questionId: string,
    @Ip() ip: string,
  ): Promise<void> {
    await this.faculty.deleteQuestion(user.id, questionId, ip);
  }
}
