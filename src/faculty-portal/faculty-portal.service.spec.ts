import { Test, TestingModule } from '@nestjs/testing';
import { FacultyPortalService } from './faculty-portal.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';

describe('FacultyPortalService', () => {
  let service: FacultyPortalService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let notificationService: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      attendanceRecord: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      assignmentSubmission: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      exam: {
        count: jest.fn(),
      },
      internalMark: {
        aggregate: jest.fn(),
      },
    } as unknown as Record<string, Record<string, jest.Mock>>;

    notificationService = {
      broadcast: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacultyPortalService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(FacultyPortalService);
  });

  describe('getDashboard', () => {
    it('returns dashboard with subjects and stats', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'f1',
        facultySubjects: [{ id: 's1', name: 'DSA', code: 'CS101' }],
      });
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { studentId: 'u1' },
        { studentId: 'u2' },
      ]);
      prisma.assignmentSubmission.count.mockResolvedValue(3);
      prisma.exam.count.mockResolvedValue(2);
      prisma.assignmentSubmission.findMany.mockResolvedValue([]);

      const result = await service.getDashboard('f1');
      expect(result.subjects.length).toBe(1);
      expect(result.totalStudents).toBe(2);
      expect(result.pendingAssignments).toBe(3);
      expect(result.upcomingExams).toBe(2);
    });
  });

  describe('getReports', () => {
    it('returns subject-wise reports', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'f1',
        facultySubjects: [{ id: 's1', name: 'DSA', code: 'CS101' }],
      });
      prisma.attendanceRecord.groupBy.mockResolvedValue([
        { status: 'present', _count: { id: 80 } },
        { status: 'absent', _count: { id: 20 } },
      ]);
      prisma.internalMark.aggregate.mockResolvedValue({
        _avg: { marksObtained: 75 },
        _count: { id: 50 },
      });
      prisma.exam.count.mockResolvedValue(3);

      const result = await service.getReports('f1');
      expect(result.subjects.length).toBe(1);
      expect(result.subjects[0].averageMarks).toBe(75);
      expect(result.subjects[0].examCount).toBe(3);
    });
  });

  describe('broadcastNotification', () => {
    it('sends notification to all students', async () => {
      notificationService.broadcast.mockResolvedValue({
        totalRecipients: 2,
        title: 'Exam Update',
      });

      const result = await service.broadcastNotification('f1', {
        title: 'Exam Update',
        message: 'Midterm rescheduled',
      });
      expect(result.sentTo).toBe(2);
      expect(result.title).toBe('Exam Update');
      expect(notificationService.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Exam Update', channel: 'in_app' }),
        'f1',
      );
    });

    it('filters by department when targetGroups specified', async () => {
      notificationService.broadcast.mockResolvedValue({
        totalRecipients: 1,
        title: 'CS Update',
      });

      const result = await service.broadcastNotification('f1', {
        title: 'CS Update',
        message: 'CS department meeting',
        targetGroups: ['CS'],
      });
      expect(result.sentTo).toBe(1);
    });
  });
});
