import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Resource } from '../common/decorators/resource.decorator';
import { AcademicsService } from './academics.service';
import {
  AcademicCalendarQueryDto,
  SubjectListQueryDto,
  SubmitAssignmentDto,
} from './dto/academics.dto';

@ApiTags('academics')
@ApiBearerAuth()
@Roles('student')
@Controller('academics')
export class AcademicsController {
  constructor(private readonly academics: AcademicsService) {}

  @Get('departments')
  @Resource('academics-departments')
  @ApiOperation({ summary: 'List reference departments' })
  listDepartments() {
    return this.academics.listDepartments();
  }

  @Get('semesters')
  @Resource('academics-semesters')
  @ApiOperation({ summary: 'List reference semesters' })
  listSemesters() {
    return this.academics.listSemesters();
  }

  @Get('subjects')
  @Resource('academics-subjects')
  @ApiOperation({ summary: 'List subjects, optionally filtered by department / semester' })
  listSubjects(@Query() query: SubjectListQueryDto) {
    return this.academics.listSubjects(query);
  }

  @Get('subjects/:id/materials')
  @Resource('academics-materials')
  @ApiOperation({ summary: 'Study materials for a subject' })
  getSubjectMaterials(@Param('id') id: string) {
    return this.academics.getSubjectMaterials(id);
  }

  @Get('subjects/:id/timetable')
  @Resource('academics-timetable')
  @ApiOperation({ summary: 'Timetable slots for a subject' })
  getSubjectTimetable(@Param('id') id: string) {
    return this.academics.getSubjectTimetable(id);
  }

  @Get('exams/me')
  @Resource('academics-exams')
  @ApiOperation({ summary: 'Exams for the current student (department + current semester)' })
  listMyExams(@CurrentUser() user: AuthenticatedUser) {
    return this.academics.listMyExams(user.id);
  }

  @Get('assignments/me')
  @Resource('academics-assignments')
  @ApiOperation({ summary: 'Assignments for the current student, with submission status' })
  listMyAssignments(@CurrentUser() user: AuthenticatedUser) {
    return this.academics.listMyAssignments(user.id);
  }

  @Post('assignments/:id/submit')
  @Resource('academics-assignments')
  @ApiOperation({ summary: 'Submit (or resubmit) an assignment' })
  submitAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.academics.submitAssignment(user.id, id, dto);
  }

  @Get('attendance/me')
  @Resource('academics-attendance')
  @ApiOperation({ summary: 'Attendance summary per subject for the current student' })
  getMyAttendance(@CurrentUser() user: AuthenticatedUser) {
    return this.academics.getMyAttendance(user.id);
  }

  @Get('marks/me')
  @Resource('academics-marks')
  @ApiOperation({ summary: 'Internal marks for the current student' })
  getMyMarks(@CurrentUser() user: AuthenticatedUser) {
    return this.academics.getMyMarks(user.id);
  }

  @Get('gpa/me')
  @Resource('academics-gpa')
  @ApiOperation({ summary: 'Current-semester GPA for the current student' })
  getMyGpa(@CurrentUser() user: AuthenticatedUser) {
    return this.academics.getMyGpa(user.id);
  }

  @Get('cgpa/me')
  @Resource('academics-cgpa')
  @ApiOperation({ summary: 'Cumulative GPA across all semesters' })
  getMyCgpa(@CurrentUser() user: AuthenticatedUser) {
    return this.academics.getMyCgpa(user.id);
  }

  @Get('calendar')
  @Resource('academics-calendar')
  @ApiOperation({ summary: 'Academic calendar events (filter by date range / type)' })
  listCalendarEvents(@Query() query: AcademicCalendarQueryDto) {
    return this.academics.listCalendarEvents(query);
  }
}
