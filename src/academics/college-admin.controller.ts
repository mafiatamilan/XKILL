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
import { CollegeAdminService } from './college-admin.service';
import {
  AcademicReportsQueryDto,
  CreateAdminUserDto,
  CreateDepartmentDto,
  CreateSemesterDto,
  UpdateAdminUserDto,
  UpdateDepartmentDto,
} from './dto/academics.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('college_admin')
@Controller('admin')
export class CollegeAdminController {
  constructor(private readonly admin: CollegeAdminService) {}

  // ---- Departments ----

  @Get('departments')
  @Resource('departments')
  @ApiOperation({ summary: 'List college departments' })
  listDepartments(@Query() query: PaginationQueryDto) {
    return this.admin.listDepartments(query.page, query.limit);
  }

  @Post('departments')
  @Resource('departments')
  @ApiOperation({ summary: 'Create a department' })
  createDepartment(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateDepartmentDto,
    @Ip() ip: string,
  ) {
    return this.admin.createDepartment(admin.id, dto, ip);
  }

  @Patch('departments/:id')
  @Resource('departments')
  @ApiOperation({ summary: 'Update a department' })
  updateDepartment(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Ip() ip: string,
  ) {
    return this.admin.updateDepartment(admin.id, id, dto as unknown as Record<string, unknown>, ip);
  }

  @Delete('departments/:id')
  @HttpCode(204)
  @Resource('departments')
  @ApiOperation({ summary: 'Delete a department' })
  async deleteDepartment(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Ip() ip: string,
  ): Promise<void> {
    await this.admin.deleteDepartment(admin.id, id, ip);
  }

  // ---- Semesters ----

  @Post('semesters')
  @Resource('departments')
  @ApiOperation({ summary: 'Create a semester (admin convenience)' })
  createSemester(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateSemesterDto,
    @Ip() ip: string,
  ) {
    return this.admin.createSemester(admin.id, dto, ip);
  }

  // ---- Courses ----

  @Get('courses')
  @Resource('courses')
  @ApiOperation({ summary: 'List courses (subjects) across departments' })
  listCourses(@Query() query: PaginationQueryDto) {
    return this.admin.listCourses({ search: query.search, page: query.page, limit: query.limit });
  }

  @Post('courses')
  @Resource('courses')
  @ApiOperation({ summary: 'Create a course (subject)' })
  createCourse(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: Record<string, unknown>,
    @Ip() ip: string,
  ) {
    return this.admin.createCourse(admin.id, dto as never, ip);
  }

  @Patch('courses/:id')
  @Resource('courses')
  @ApiOperation({ summary: 'Update a course' })
  updateCourse(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
    @Ip() ip: string,
  ) {
    return this.admin.updateCourse(admin.id, id, dto, ip);
  }

  @Delete('courses/:id')
  @HttpCode(204)
  @Resource('courses')
  @ApiOperation({ summary: 'Delete a course' })
  async deleteCourse(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Ip() ip: string,
  ): Promise<void> {
    await this.admin.deleteCourse(admin.id, id, ip);
  }

  // ---- Faculty accounts ----

  @Get('faculty')
  @Resource('faculty')
  @ApiOperation({ summary: 'List faculty accounts' })
  listFaculty(@Query() query: PaginationQueryDto) {
    return this.admin.listUsersByRole('faculty', {
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post('faculty')
  @Resource('faculty')
  @ApiOperation({ summary: 'Create a faculty account' })
  createFaculty(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateAdminUserDto,
    @Ip() ip: string,
  ) {
    return this.admin.createUser(admin.id, 'faculty', dto, ip);
  }

  @Patch('faculty/:id')
  @Resource('faculty')
  @ApiOperation({ summary: 'Update a faculty account' })
  updateFaculty(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @Ip() ip: string,
  ) {
    return this.admin.updateUser(
      admin.id,
      id,
      dto as unknown as { fullName?: string; isActive?: 0 | 1 },
      ip,
    );
  }

  // ---- Student accounts ----

  @Get('students')
  @Resource('students')
  @ApiOperation({ summary: 'List student accounts' })
  listStudents(@Query() query: PaginationQueryDto) {
    return this.admin.listUsersByRole('student', {
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post('students')
  @Resource('students')
  @ApiOperation({ summary: 'Create a student account' })
  createStudent(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateAdminUserDto,
    @Ip() ip: string,
  ) {
    return this.admin.createUser(admin.id, 'student', dto, ip);
  }

  @Patch('students/:id')
  @Resource('students')
  @ApiOperation({ summary: 'Update a student account' })
  updateStudent(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @Ip() ip: string,
  ) {
    return this.admin.updateUser(
      admin.id,
      id,
      dto as unknown as { fullName?: string; isActive?: 0 | 1 },
      ip,
    );
  }

  // ---- Reports ----

  @Get('academic-reports')
  @Resource('academic-reports')
  @ApiOperation({
    summary: 'Aggregate academic reports (students, attendance, marks per department)',
  })
  getAcademicReports(@Query() query: AcademicReportsQueryDto) {
    return this.admin.getAcademicReports(query);
  }
}
