import { NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repository: Record<string, jest.Mock>;

  beforeEach(() => {
    repository = {
      getStudentProfile: jest.fn(),
      getStudentAcademicStats: jest.fn(),
      getStudentDsaStats: jest.fn(),
      getStudentGamificationStats: jest.fn(),
      getStudentPlacementStats: jest.fn(),
      getStudentCertificates: jest.fn(),
      getStudentInterviewStats: jest.fn(),
      getRecruiterProfile: jest.fn(),
      getRecruiterJobStats: jest.fn(),
      getRecruiterApplicationStats: jest.fn(),
      getRecruiterHiringFunnel: jest.fn(),
      getFacultyProfile: jest.fn(),
      getFacultySubjectStats: jest.fn(),
      getFacultyStudentPerformance: jest.fn(),
      getFacultyAttendanceOverview: jest.fn(),
      getPlacementOverview: jest.fn(),
      getPlacementByDepartment: jest.fn(),
      getTopRecruiters: jest.fn(),
      getCollegeOverview: jest.fn(),
      getDepartmentStats: jest.fn(),
      getRevenueOverview: jest.fn(),
      executeCustomReport: jest.fn(),
    };

    service = new AnalyticsService(repository as unknown as AnalyticsRepository);
  });

  describe('getStudentAnalytics', () => {
    it('returns comprehensive student analytics', async () => {
      repository.getStudentProfile.mockResolvedValue({
        userId: 's1',
        department: 'Computer Science',
        user: { fullName: 'John', email: 'john@test.com', createdAt: new Date() },
      });
      repository.getStudentAcademicStats.mockResolvedValue({
        attendanceRate: 85,
        totalClasses: 100,
        presentCount: 85,
        averageMarks: 78,
        highestMarks: 95,
        totalExams: 5,
        assignmentSubmissions: 10,
      });
      repository.getStudentDsaStats.mockResolvedValue({
        totalSubmissions: 50,
        solvedProblems: 30,
        currentRating: 1400,
        currentTier: 'Intermediate',
      });
      repository.getStudentGamificationStats.mockResolvedValue({
        totalXp: 500,
        currentStreak: 5,
        longestStreak: 15,
        badgesEarned: 3,
      });
      repository.getStudentPlacementStats.mockResolvedValue({
        readinessScore: 75,
        jobApplications: 5,
        savedJobs: 10,
      });
      repository.getStudentCertificates.mockResolvedValue({
        totalCertificates: 2,
        activeCertificates: 2,
        revokedCertificates: 0,
      });
      repository.getStudentInterviewStats.mockResolvedValue({
        totalSessions: 3,
        completedSessions: 2,
        averageScore: 70,
      });

      const result = await service.getStudentAnalytics('s1');
      expect(result.studentId).toBe('s1');
      expect(result.studentName).toBe('John');
      expect(result.department).toBe('Computer Science');
      expect(result.academics.attendanceRate).toBe(85);
      expect(result.dsa.currentTier).toBe('Intermediate');
      expect(result.gamification.totalXp).toBe(500);
    });

    it('throws NotFoundException for unknown student', async () => {
      repository.getStudentProfile.mockResolvedValue(null);
      await expect(service.getStudentAnalytics('unknown')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getRecruiterAnalytics', () => {
    it('returns recruiter hiring analytics', async () => {
      repository.getRecruiterProfile.mockResolvedValue({
        userId: 'r1',
        user: { fullName: 'Recruiter', email: 'r@test.com' },
        company: { name: 'TechCorp' },
      });
      repository.getRecruiterJobStats.mockResolvedValue({
        totalJobs: 5,
        activeJobs: 3,
        totalApplications: 50,
      });
      repository.getRecruiterApplicationStats.mockResolvedValue({
        total: 50,
        byStatus: [
          { status: 'pending', count: 30 },
          { status: 'shortlisted', count: 20 },
        ],
      });
      repository.getRecruiterHiringFunnel.mockResolvedValue({
        shortlisted: 20,
        interviewed: 10,
        offered: 5,
      });

      const result = await service.getRecruiterAnalytics('r1');
      expect(result.recruiterId).toBe('r1');
      expect(result.company).toBe('TechCorp');
      expect(result.jobs.totalJobs).toBe(5);
      expect(result.hiringFunnel.offered).toBe(5);
    });

    it('throws NotFoundException for unknown recruiter', async () => {
      repository.getRecruiterProfile.mockResolvedValue(null);
      await expect(service.getRecruiterAnalytics('unknown')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getFacultyAnalytics', () => {
    it('returns faculty teaching analytics', async () => {
      repository.getFacultyProfile.mockResolvedValue({
        id: 'f1',
        fullName: 'Prof Smith',
        email: 'smith@test.com',
        facultySubjects: [{ id: 's1', name: 'DSA', code: 'CS101' }],
      });
      repository.getFacultySubjectStats.mockResolvedValue([
        {
          subjectId: 's1',
          name: 'DSA',
          code: 'CS101',
          attendanceRecords: 100,
          exams: 5,
          assignments: 10,
        },
      ]);
      repository.getFacultyStudentPerformance.mockResolvedValue([
        { studentId: 'st1', studentName: 'Alice', averageMarks: 90, examCount: 5 },
      ]);
      repository.getFacultyAttendanceOverview.mockResolvedValue({
        totalRecords: 100,
        presentCount: 85,
        attendanceRate: 85,
        byStatus: [
          { status: 'present', count: 85 },
          { status: 'absent', count: 15 },
        ],
      });

      const result = await service.getFacultyAnalytics('f1');
      expect(result.facultyId).toBe('f1');
      expect(result.subjects.length).toBe(1);
      expect(result.attendance.attendanceRate).toBe(85);
    });

    it('throws NotFoundException for unknown faculty', async () => {
      repository.getFacultyProfile.mockResolvedValue(null);
      await expect(service.getFacultyAnalytics('unknown')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getPlacementAnalytics', () => {
    it('returns placement analytics', async () => {
      repository.getPlacementOverview.mockResolvedValue({
        totalDrives: 10,
        activeDrives: 3,
        placedStudents: 50,
        totalOffers: 60,
        offersByStatus: [{ status: 'joined', count: 50 }],
      });
      repository.getPlacementByDepartment.mockResolvedValue([
        {
          departmentId: 'd1',
          departmentName: 'CS',
          totalStudents: 100,
          placedStudents: 40,
          placementRate: 40,
        },
      ]);
      repository.getTopRecruiters.mockResolvedValue([
        {
          companyId: 'c1',
          companyName: 'TechCorp',
          totalApplications: 100,
          totalOffers: 30,
          placedCount: 25,
          averageCtc: 8,
        },
      ]);

      const result = await service.getPlacementAnalytics();
      expect(result.overview.totalDrives).toBe(10);
      expect(result.byDepartment.length).toBe(1);
      expect(result.topRecruiters.length).toBe(1);
    });
  });

  describe('getCollegeAnalytics', () => {
    it('returns college analytics', async () => {
      repository.getCollegeOverview.mockResolvedValue({
        totalStudents: 500,
        totalFaculty: 30,
        totalDepartments: 5,
        departments: [],
      });
      repository.getDepartmentStats.mockResolvedValue([
        { departmentId: 'd1', departmentName: 'CS', studentCount: 100 },
      ]);

      const result = await service.getCollegeAnalytics();
      expect(result.overview.totalStudents).toBe(500);
      expect(result.departments.length).toBe(1);
    });
  });

  describe('getRevenueAnalytics', () => {
    it('returns revenue overview', async () => {
      repository.getRevenueOverview.mockResolvedValue({
        totalCertificates: 100,
        recentCertificates: 10,
        totalBookings: 25,
      });

      const result = await service.getRevenueAnalytics();
      expect(result.totalCertificates).toBe(100);
    });
  });

  describe('generateCustomReport', () => {
    it('generates JSON report', async () => {
      repository.executeCustomReport.mockResolvedValue({
        entity: 'user',
        count: 2,
        data: [{ id: 'u1' }, { id: 'u2' }],
      });

      const result = await service.generateCustomReport({
        entity: 'user',
        format: 'json',
      });
      expect(result.format).toBe('json');
      expect(result.count).toBe(2);
    });

    it('generates CSV report', async () => {
      repository.executeCustomReport.mockResolvedValue({
        entity: 'user',
        count: 2,
        data: [
          { id: 'u1', name: 'John' },
          { id: 'u2', name: 'Jane' },
        ],
      });

      const result = await service.generateCustomReport({
        entity: 'user',
        format: 'csv',
      });
      expect(result.format).toBe('csv');
      expect('csv' in result).toBe(true);
    });
  });
});
