import { NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { StudentsRepository } from './students.repository';
import { StudentsService, computeProfileCompletion } from './students.service';

const skill = (overrides: Record<string, unknown> = {}) => ({
  id: 'sk-1',
  userId: 'user-1',
  name: 'TypeScript',
  category: 'programming',
  proficiencyLevel: 'advanced',
  yearsOfExperience: 3,
  isPrimary: true,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  ...overrides,
});

const goal = (overrides: Record<string, unknown> = {}) => ({
  id: 'goal-1',
  userId: 'user-1',
  title: 'SDE at a top company',
  targetRole: 'Backend Engineer',
  targetCompanies: ['Google'],
  industries: ['Software'],
  preferredLocations: ['Remote'],
  targetCtcLakhs: 30,
  targetDate: new Date('2026-12-31T00:00:00.000Z'),
  status: 'active',
  notes: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  ...overrides,
});

const event = (overrides: Record<string, unknown> = {}) => ({
  id: 'ev-1',
  userId: 'user-1',
  title: 'Mock interview',
  description: null,
  eventType: 'interview',
  startAt: new Date('2026-08-10T09:00:00.000Z'),
  endAt: null,
  location: null,
  isAllDay: false,
  color: null,
  reminderAt: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  ...overrides,
});

const notification = (overrides: Record<string, unknown> = {}) => ({
  id: 'ntf-1',
  userId: 'user-1',
  type: 'placement',
  title: 'New drive',
  message: 'Amazon is hiring',
  metadata: null,
  isRead: false,
  readAt: null,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  ...overrides,
});

const settings = (overrides: Record<string, unknown> = {}) => ({
  id: 'st-1',
  userId: 'user-1',
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  weeklyDigest: true,
  language: 'en',
  theme: 'light',
  profileVisibility: 'public',
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  ...overrides,
});

describe('computeProfileCompletion', () => {
  it('is 0 for an empty profile', () => {
    expect(computeProfileCompletion({})).toBe(0);
  });

  it('counts filled fields proportionally', () => {
    const result = computeProfileCompletion({ headline: 'x', bio: 'y' });
    expect(result).toBe(Math.round((2 / 18) * 100));
  });

  it('treats null and empty strings as not filled', () => {
    const result = computeProfileCompletion({
      headline: '',
      bio: null,
      city: 'Mumbai',
    } as never);
    expect(result).toBe(Math.round((1 / 18) * 100));
  });
});

describe('StudentsService', () => {
  let repository: jest.Mocked<Pick<StudentsRepository, keyof StudentsRepository>>;
  let audit: jest.Mocked<AuditService>;
  let service: StudentsService;

  beforeEach(() => {
    repository = {
      findProfileByUserId: jest.fn(),
      upsertProfile: jest.fn(),
      listSkills: jest.fn(),
      countSkills: jest.fn(),
      findSkillById: jest.fn(),
      createSkill: jest.fn(),
      updateSkill: jest.fn(),
      deleteSkill: jest.fn(),
      findSkillByName: jest.fn(),
      listCareerGoals: jest.fn(),
      countCareerGoals: jest.fn(),
      countActiveCareerGoals: jest.fn(),
      findCareerGoalById: jest.fn(),
      createCareerGoal: jest.fn(),
      updateCareerGoal: jest.fn(),
      deleteCareerGoal: jest.fn(),
      listCalendarEvents: jest.fn(),
      countCalendarEvents: jest.fn(),
      findCalendarEventById: jest.fn(),
      createCalendarEvent: jest.fn(),
      updateCalendarEvent: jest.fn(),
      deleteCalendarEvent: jest.fn(),
      findUpcomingEvents: jest.fn(),
      findSettingsByUserId: jest.fn(),
      upsertSettings: jest.fn(),
      findReadinessScore: jest.fn(),
      upsertReadinessScore: jest.fn(),
      listNotifications: jest.fn(),
      countNotifications: jest.fn(),
      countUnreadNotifications: jest.fn(),
      findNotificationById: jest.fn(),
      markNotificationRead: jest.fn(),
      markAllNotificationsRead: jest.fn(),
      createNotification: jest.fn(),
      listActivity: jest.fn(),
      countActivity: jest.fn(),
      countRecentActivity: jest.fn(),
      createActivityLog: jest.fn(),
    } as unknown as jest.Mocked<StudentsRepository>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuditService>;
    service = new StudentsService(repository as unknown as StudentsRepository, audit);
  });

  describe('getProfile', () => {
    it('returns an empty default when no profile exists yet', async () => {
      repository.findProfileByUserId.mockResolvedValue(null);
      const profile = await service.getProfile('user-1');
      expect(profile.completionPercent).toBe(0);
      expect(profile.isProfileVisible).toBe(true);
      expect(profile.userId).toBe('');
    });

    it('maps the persisted profile', async () => {
      repository.findProfileByUserId.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
        headline: 'Aspiring SDE',
        bio: null,
        phone: null,
        dateOfBirth: null,
        gender: null,
        githubUrl: null,
        linkedinUrl: null,
        portfolioUrl: null,
        leetcodeUrl: null,
        codeforcesUrl: null,
        resumeUrl: null,
        city: 'Mumbai',
        state: null,
        country: null,
        collegeName: null,
        department: null,
        currentSemester: null,
        expectedGraduationYear: null,
        isProfileVisible: true,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      });
      const profile = await service.getProfile('user-1');
      expect(profile.headline).toBe('Aspiring SDE');
      expect(profile.city).toBe('Mumbai');
      expect(profile.completionPercent).toBeGreaterThan(0);
    });
  });

  describe('updateProfile', () => {
    it('upserts the picked fields and records audit + activity', async () => {
      repository.findProfileByUserId.mockResolvedValue(null);
      repository.upsertProfile.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
        headline: 'New',
        city: 'Pune',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      const result = await service.updateProfile('user-1', {
        headline: 'New',
        city: 'Pune',
        extra: 'ignored',
      });
      expect(repository.upsertProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ headline: 'New', city: 'Pune' }),
      );
      expect(repository.upsertProfile).not.toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ extra: 'ignored' }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'student.profile.update' }),
      );
      expect(repository.createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'profile' }),
      );
      expect(result.headline).toBe('New');
    });

    it('passes through isProfileVisible when provided', async () => {
      repository.findProfileByUserId.mockResolvedValue(null);
      repository.upsertProfile.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
        headline: null,
        isProfileVisible: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
      await service.updateProfile('user-1', { isProfileVisible: false });
      expect(repository.upsertProfile).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ isProfileVisible: false }),
      );
    });
  });

  describe('skills', () => {
    it('lists skills with pagination meta', async () => {
      repository.countSkills.mockResolvedValue(1);
      repository.listSkills.mockResolvedValue([skill()]);
      const result = await service.listSkills('user-1', 1, 20);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
      expect(result.data[0].name).toBe('TypeScript');
    });

    it('creates a skill', async () => {
      repository.findSkillByName.mockResolvedValue(null);
      repository.createSkill.mockResolvedValue(skill());
      const result = await service.createSkill('user-1', { name: 'TypeScript' }, '1.1.1.1');
      expect(repository.createSkill).toHaveBeenCalledWith({
        userId: 'user-1',
        name: 'TypeScript',
        category: undefined,
        proficiencyLevel: undefined,
        yearsOfExperience: undefined,
        isPrimary: undefined,
      });
      expect(result.name).toBe('TypeScript');
    });

    it('rejects a duplicate skill name with Conflict (409)', async () => {
      repository.findSkillByName.mockResolvedValue(skill());
      await expect(service.createSkill('user-1', { name: 'TypeScript' })).rejects.toMatchObject({
        response: { code: 'SKILL_ALREADY_EXISTS' },
      });
    });

    it('updates a skill', async () => {
      repository.findSkillById.mockResolvedValue(skill());
      repository.updateSkill.mockResolvedValue(skill({ proficiencyLevel: 'expert' }));
      const result = await service.updateSkill('user-1', 'sk-1', { proficiencyLevel: 'expert' });
      expect(repository.updateSkill).toHaveBeenCalled();
      expect(result.proficiencyLevel).toBe('expert');
    });

    it('throws NotFound for an unknown skill', async () => {
      repository.findSkillById.mockResolvedValue(null);
      await expect(service.updateSkill('user-1', 'nope', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws Conflict when renaming a skill onto an existing name', async () => {
      repository.findSkillById.mockResolvedValue(skill());
      repository.findSkillByName.mockResolvedValue(skill({ id: 'sk-other', name: 'Go' }));
      await expect(service.updateSkill('user-1', 'sk-1', { name: 'Go' })).rejects.toMatchObject({
        response: { code: 'SKILL_ALREADY_EXISTS' },
      });
    });

    it('throws NotFound when the delete affects no rows', async () => {
      repository.findSkillById.mockResolvedValue(skill());
      repository.deleteSkill.mockResolvedValue({ count: 0 });
      await expect(service.deleteSkill('user-1', 'sk-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes a skill', async () => {
      repository.findSkillById.mockResolvedValue(skill());
      repository.deleteSkill.mockResolvedValue({ count: 1 });
      await service.deleteSkill('user-1', 'sk-1');
      expect(repository.deleteSkill).toHaveBeenCalledWith('sk-1', 'user-1');
    });
  });

  describe('career goals', () => {
    it('lists career goals', async () => {
      repository.countCareerGoals.mockResolvedValue(2);
      repository.listCareerGoals.mockResolvedValue([goal()]);
      const result = await service.listCareerGoals('user-1', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(2);
    });

    it('creates a career goal', async () => {
      repository.createCareerGoal.mockResolvedValue(goal());
      const result = await service.createCareerGoal(
        'user-1',
        { title: 'SDE at a top company', targetDate: '2026-12-31' },
        '1.1.1.1',
      );
      expect(repository.createCareerGoal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'SDE at a top company', status: 'active' }),
      );
      expect(result.targetDate).toBe('2026-12-31T00:00:00.000Z');
    });

    it('updates a career goal', async () => {
      repository.findCareerGoalById.mockResolvedValue(goal());
      repository.updateCareerGoal.mockResolvedValue(goal({ status: 'achieved' }));
      const result = await service.updateCareerGoal('user-1', 'goal-1', { status: 'achieved' });
      expect(result.status).toBe('achieved');
    });

    it('throws NotFound for an unknown goal', async () => {
      repository.findCareerGoalById.mockResolvedValue(null);
      await expect(service.updateCareerGoal('user-1', 'nope', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deletes a career goal', async () => {
      repository.findCareerGoalById.mockResolvedValue(goal());
      repository.deleteCareerGoal.mockResolvedValue({ count: 1 });
      await service.deleteCareerGoal('user-1', 'goal-1');
      expect(repository.deleteCareerGoal).toHaveBeenCalledWith('goal-1', 'user-1');
    });

    it('throws NotFound when goal deletion affects no rows', async () => {
      repository.findCareerGoalById.mockResolvedValue(goal());
      repository.deleteCareerGoal.mockResolvedValue({ count: 0 });
      await expect(service.deleteCareerGoal('user-1', 'goal-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('calendar', () => {
    it('lists calendar events', async () => {
      repository.countCalendarEvents.mockResolvedValue(1);
      repository.listCalendarEvents.mockResolvedValue([event()]);
      const result = await service.listCalendarEvents('user-1', 1, 20);
      expect(result.data[0].eventType).toBe('interview');
      expect(result.data[0].startAt).toBe('2026-08-10T09:00:00.000Z');
    });

    it('creates a calendar event', async () => {
      repository.createCalendarEvent.mockResolvedValue(event());
      const result = await service.createCalendarEvent(
        'user-1',
        { title: 'Mock interview', startAt: '2026-08-10T09:00:00.000Z' },
        '1.1.1.1',
      );
      expect(result.title).toBe('Mock interview');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'student.calendar.create' }),
      );
    });

    it('updates a calendar event', async () => {
      repository.findCalendarEventById.mockResolvedValue(event());
      repository.updateCalendarEvent.mockResolvedValue(event({ title: 'Renamed' }));
      const result = await service.updateCalendarEvent('user-1', 'ev-1', { title: 'Renamed' });
      expect(result.title).toBe('Renamed');
    });

    it('throws NotFound for an unknown event', async () => {
      repository.findCalendarEventById.mockResolvedValue(null);
      await expect(service.updateCalendarEvent('user-1', 'nope', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deletes a calendar event', async () => {
      repository.findCalendarEventById.mockResolvedValue(event());
      repository.deleteCalendarEvent.mockResolvedValue({ count: 1 });
      await service.deleteCalendarEvent('user-1', 'ev-1');
      expect(repository.deleteCalendarEvent).toHaveBeenCalledWith('ev-1', 'user-1');
    });

    it('throws NotFound when event deletion affects no rows', async () => {
      repository.findCalendarEventById.mockResolvedValue(event());
      repository.deleteCalendarEvent.mockResolvedValue({ count: 0 });
      await expect(service.deleteCalendarEvent('user-1', 'ev-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('settings', () => {
    it('returns defaults when settings do not exist yet (lazy create)', async () => {
      repository.findSettingsByUserId.mockResolvedValue(null);
      repository.upsertSettings.mockResolvedValue(settings());
      const result = await service.getSettings('user-1');
      expect(repository.upsertSettings).toHaveBeenCalledWith('user-1', {});
      expect(result.theme).toBe('light');
    });

    it('returns stored settings when they exist', async () => {
      repository.findSettingsByUserId.mockResolvedValue(settings({ theme: 'dark' }));
      const result = await service.getSettings('user-1');
      expect(repository.upsertSettings).not.toHaveBeenCalled();
      expect(result.theme).toBe('dark');
    });

    it('updates settings', async () => {
      repository.findSettingsByUserId.mockResolvedValue(settings());
      repository.upsertSettings.mockResolvedValue(settings({ theme: 'dark' }));
      const result = await service.updateSettings('user-1', { theme: 'dark' });
      expect(repository.upsertSettings).toHaveBeenCalledWith('user-1', { theme: 'dark' });
      expect(result.theme).toBe('dark');
    });
  });

  describe('readiness', () => {
    it('returns null when no score exists yet', async () => {
      repository.findReadinessScore.mockResolvedValue(null);
      expect(await service.getReadinessScore('user-1')).toBeNull();
    });

    it('returns the stored score', async () => {
      repository.findReadinessScore.mockResolvedValue({
        id: 'r1',
        userId: 'user-1',
        overall: 70,
        components: { profile: 80, skills: 60, careerGoal: 90, activity: 40 },
        calculatedAt: new Date('2026-08-01T00:00:00.000Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await service.getReadinessScore('user-1');
      expect(result?.overall).toBe(70);
    });

    it('recalculates by collecting state and calling the scoring function', async () => {
      repository.findProfileByUserId.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
        headline: 'x',
        resumeUrl: 'https://example.com/resume.pdf',
        bio: null,
        phone: null,
        dateOfBirth: null,
        gender: null,
        githubUrl: null,
        linkedinUrl: null,
        portfolioUrl: null,
        leetcodeUrl: null,
        codeforcesUrl: null,
        city: null,
        state: null,
        country: null,
        collegeName: null,
        department: null,
        currentSemester: null,
        expectedGraduationYear: null,
        isProfileVisible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.listSkills.mockResolvedValue([
        skill({ proficiencyLevel: 'advanced' }),
        skill({ id: 's2', name: 'Go', proficiencyLevel: 'expert', category: 'backend' }),
        skill({ id: 's3', name: 'React', proficiencyLevel: 'beginner', category: 'web' }),
      ]);
      repository.listCareerGoals.mockResolvedValue([goal()]);
      repository.countRecentActivity.mockResolvedValue(5);
      repository.countNotifications.mockResolvedValue(2);
      repository.upsertReadinessScore.mockResolvedValue({
        id: 'r1',
        userId: 'user-1',
        overall: 0,
        components: {},
        calculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.recalculateReadinessScore('user-1', '1.1.1.1');

      expect(repository.upsertReadinessScore).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          overall: expect.any(Number),
          components: expect.objectContaining({
            profile: expect.any(Number),
            skills: expect.any(Number),
            careerGoal: expect.any(Number),
            activity: expect.any(Number),
          }),
        }),
      );
      expect(result.overall).toBeGreaterThan(0);
      expect(repository.createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'readiness' }),
      );
    });

    it('produces a deterministic score from the same collected state', async () => {
      const input = {
        profile: { exists: true, completionPercent: 100, hasResume: true },
        skills: { total: 8, advanced: 5, categories: 4 },
        careerGoal: {
          hasGoal: true,
          hasTargetRole: true,
          hasTargetCompanies: true,
          hasTargetDate: true,
          hasCtc: true,
        },
        activity: { recentActivityCount: 6, readNotificationCount: 10 },
      };
      const { calculateReadinessScore } = jest.requireActual<
        typeof import('./readiness/readiness-scoring')
      >('./readiness/readiness-scoring');
      expect(calculateReadinessScore(input).overall).toBe(100);
    });
  });

  describe('notifications', () => {
    it('lists notifications (optionally unread only)', async () => {
      repository.countNotifications.mockResolvedValue(1);
      repository.listNotifications.mockResolvedValue([notification()]);
      const all = await service.listNotifications('user-1', 1, 20);
      expect(all.data).toHaveLength(1);
      expect(repository.listNotifications).toHaveBeenCalledWith({
        userId: 'user-1',
        skip: 0,
        take: 20,
        unreadOnly: undefined,
      });

      repository.listNotifications.mockResolvedValue([notification()]);
      await service.listNotifications('user-1', 1, 20, true);
      expect(repository.listNotifications).toHaveBeenLastCalledWith({
        userId: 'user-1',
        skip: 0,
        take: 20,
        unreadOnly: true,
      });
    });

    it('marks a single notification read', async () => {
      repository.findNotificationById.mockResolvedValue(notification());
      repository.markNotificationRead.mockResolvedValue({ count: 1 });
      repository.findNotificationById.mockResolvedValue(
        notification({ isRead: true, readAt: new Date() }),
      );
      const result = await service.markNotificationRead('user-1', 'ntf-1');
      expect(repository.markNotificationRead).toHaveBeenCalled();
      expect(result.isRead).toBe(true);
    });

    it('throws NotFound for an unknown notification', async () => {
      repository.findNotificationById.mockResolvedValue(null);
      await expect(service.markNotificationRead('user-1', 'nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('marks all notifications read and returns the count', async () => {
      repository.markAllNotificationsRead.mockResolvedValue({ count: 4 });
      const result = await service.markAllNotificationsRead('user-1');
      expect(result.markedCount).toBe(4);
    });

    it('creates an internal notification and logs activity', async () => {
      repository.createNotification.mockResolvedValue(notification());
      const result = await service.createNotification('user-1', {
        type: 'placement',
        title: 'Drive',
        message: 'Amazon hiring',
      });
      expect(result.title).toBe('New drive');
      expect(repository.createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'notification' }),
      );
    });
  });

  describe('activity timeline', () => {
    it('lists recent activity with the list envelope', async () => {
      repository.countActivity.mockResolvedValue(1);
      repository.listActivity.mockResolvedValue([
        {
          id: 'a1',
          userId: 'user-1',
          type: 'profile',
          title: 'Profile updated',
          description: null,
          metadata: null,
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
        },
      ]);
      const result = await service.getActivityTimeline('user-1', 1, 20);
      expect(result.data[0].title).toBe('Profile updated');
      expect(result.meta.total).toBe(1);
    });
  });

  describe('dashboard', () => {
    it('composes data from every sub-source', async () => {
      repository.findProfileByUserId.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
        headline: 'x',
        resumeUrl: null,
        bio: null,
        phone: null,
        dateOfBirth: null,
        gender: null,
        githubUrl: null,
        linkedinUrl: null,
        portfolioUrl: null,
        leetcodeUrl: null,
        codeforcesUrl: null,
        city: 'Mumbai',
        state: null,
        country: null,
        collegeName: null,
        department: null,
        currentSemester: null,
        expectedGraduationYear: null,
        isProfileVisible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.findReadinessScore.mockResolvedValue({
        id: 'r1',
        userId: 'user-1',
        overall: 72,
        components: { profile: 80, skills: 70, careerGoal: 90, activity: 40 },
        calculatedAt: new Date('2026-08-01T00:00:00.000Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      repository.countUnreadNotifications.mockResolvedValue(3);
      repository.findUpcomingEvents.mockResolvedValue([event()]);
      repository.listActivity.mockResolvedValue([
        {
          id: 'a1',
          userId: 'user-1',
          type: 'skill',
          title: 'Skill added',
          description: null,
          metadata: null,
          createdAt: new Date(),
        },
      ]);
      repository.countActiveCareerGoals.mockResolvedValue(2);
      repository.listSkills.mockResolvedValue([skill(), skill({ id: 's2', name: 'Go' })]);

      const dashboard = await service.getDashboard('user-1');

      expect(dashboard.readinessScore).toMatchObject({ overall: 72 });
      expect(dashboard.unreadNotifications).toBe(3);
      expect(dashboard.upcomingEvents).toHaveLength(1);
      expect(dashboard.recentActivity).toHaveLength(1);
      expect(dashboard.activeGoals).toBe(2);
      expect(dashboard.skillsCount).toBe(2);
      expect(dashboard.profileCompletionPercent).toBeGreaterThan(0);
    });

    it('returns null readiness when no score exists', async () => {
      repository.findProfileByUserId.mockResolvedValue(null);
      repository.findReadinessScore.mockResolvedValue(null);
      repository.countUnreadNotifications.mockResolvedValue(0);
      repository.findUpcomingEvents.mockResolvedValue([]);
      repository.listActivity.mockResolvedValue([]);
      repository.countActiveCareerGoals.mockResolvedValue(0);
      repository.listSkills.mockResolvedValue([]);
      const dashboard = await service.getDashboard('user-1');
      expect(dashboard.readinessScore).toBeNull();
      expect(dashboard.profileCompletionPercent).toBe(0);
    });
  });
});
