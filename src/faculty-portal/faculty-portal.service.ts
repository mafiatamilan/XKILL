import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BroadcastNotificationDto } from './dto/faculty-portal.dto';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class FacultyPortalService {
  private readonly logger = new Logger(FacultyPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async getDashboard(userId: string) {
    const faculty = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        facultySubjects: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    const subjectIds = faculty?.facultySubjects?.map((s) => s.id) ?? [];

    const [totalStudents, pendingAssignments, upcomingExams, recentSubmissions] = await Promise.all(
      [
        this.prisma.attendanceRecord
          .findMany({
            where: { subjectId: { in: subjectIds } },
            select: { studentId: true },
            distinct: ['studentId'],
          })
          .then((r) => r.length),
        this.prisma.assignmentSubmission.count({
          where: {
            assignment: { subjectId: { in: subjectIds } },
            status: 'submitted',
          },
        }),
        this.prisma.exam.count({
          where: {
            subjectId: { in: subjectIds },
            scheduledAt: { gte: new Date() },
          },
        }),
        this.prisma.assignmentSubmission.findMany({
          where: {
            assignment: { subjectId: { in: subjectIds } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            student: { select: { id: true, fullName: true } },
            assignment: { select: { title: true } },
          },
        }),
      ],
    );

    return {
      subjects: faculty?.facultySubjects ?? [],
      totalStudents,
      pendingAssignments,
      upcomingExams,
      recentSubmissions,
    };
  }

  async getReports(userId: string) {
    const faculty = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        facultySubjects: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    const subjectIds = faculty?.facultySubjects?.map((s) => s.id) ?? [];

    const subjectReports = await Promise.all(
      subjectIds.map(async (subjectId) => {
        const [attendance, avgMarks, examCount] = await Promise.all([
          this.prisma.attendanceRecord.groupBy({
            by: ['status'],
            where: { subjectId },
            _count: { id: true },
          }),
          this.prisma.internalMark.aggregate({
            where: { subjectId },
            _avg: { marksObtained: true },
            _count: { id: true },
          }),
          this.prisma.exam.count({ where: { subjectId } }),
        ]);

        return {
          subjectId,
          attendance: attendance.map((a) => ({ status: a.status, count: a._count.id })),
          averageMarks: avgMarks._avg.marksObtained,
          totalStudents: avgMarks._count.id,
          examCount,
        };
      }),
    );

    return { subjects: subjectReports };
  }

  async broadcastNotification(userId: string, dto: BroadcastNotificationDto) {
    const targetRoles = dto.targetGroups && dto.targetGroups.length > 0 ? undefined : ['student'];

    const broadcast = await this.notificationService.broadcast(
      {
        title: dto.title,
        body: dto.message,
        channel: 'in_app',
        targetRoles,
      },
      userId,
    );

    return { sentTo: broadcast.totalRecipients, title: dto.title };
  }
}
