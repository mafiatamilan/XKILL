import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { buildPaginationMeta, PaginationMeta } from '../common/pagination/pagination.dto';
import { StudentsRepository } from './students.repository';
import { calculateReadinessScore, ReadinessInput } from './readiness/readiness-scoring';
import { CalendarEventResponseDto, SettingsResponseDto } from './dto/calendar.dto';
import { CareerGoalResponseDto, ProfileResponseDto, SkillResponseDto } from './dto/profile.dto';
import { NotificationResponseDto, ReadinessScoreResponseDto } from './dto/notification.dto';

export interface ListResult<T> {
  data: T[];
  meta: PaginationMeta;
}

const PROFILE_FIELDS = [
  'headline',
  'bio',
  'phone',
  'dateOfBirth',
  'gender',
  'githubUrl',
  'linkedinUrl',
  'portfolioUrl',
  'leetcodeUrl',
  'codeforcesUrl',
  'resumeUrl',
  'city',
  'state',
  'country',
  'collegeName',
  'department',
  'currentSemester',
  'expectedGraduationYear',
] as const;

/**
 * Percentage (0-100) of the profile's tracked fields that are filled in.
 * Pure + exported so it can be unit-tested directly.
 */
export function computeProfileCompletion(
  profile: Partial<Record<(typeof PROFILE_FIELDS)[number], unknown>>,
): number {
  const filled = PROFILE_FIELDS.filter((field) => {
    const value = profile[field];
    return value !== undefined && value !== null && value !== '';
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly repository: StudentsRepository,
    private readonly audit: AuditService,
  ) {}

  // ---- Profile ----

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.repository.findProfileByUserId(userId);
    return this.toProfileResponse(profile);
  }

  async updateProfile(
    userId: string,
    dto: Record<string, unknown>,
    ip?: string,
  ): Promise<ProfileResponseDto> {
    const before = await this.repository.findProfileByUserId(userId);
    const data = this.pickProfileFields(dto);
    const profile = await this.repository.upsertProfile(userId, data);
    await this.audit.record({
      userId,
      action: 'student.profile.update',
      entityType: 'student_profile',
      entityId: profile.id,
      before: before ?? undefined,
      after: profile,
      ip,
    });
    await this.logActivity(userId, 'profile', 'Profile updated', 'Updated student profile details');
    return this.toProfileResponse(profile);
  }

  private pickProfileFields(dto: Record<string, unknown>): Record<string, unknown> {
    const allowed = new Set<string>(PROFILE_FIELDS as unknown as string[]);
    const picked: Record<string, unknown> = {};
    for (const key of Object.keys(dto)) {
      if (key === 'isProfileVisible') {
        picked.isProfileVisible = dto.isProfileVisible;
      } else if (allowed.has(key)) {
        picked[key] = dto[key];
      }
    }
    return picked;
  }

  private toProfileResponse(
    profile: {
      id: string;
      userId: string;
      headline: string | null;
      bio: string | null;
      phone: string | null;
      dateOfBirth: Date | null;
      gender: string | null;
      githubUrl: string | null;
      linkedinUrl: string | null;
      portfolioUrl: string | null;
      leetcodeUrl: string | null;
      codeforcesUrl: string | null;
      resumeUrl: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      collegeName: string | null;
      department: string | null;
      currentSemester: number | null;
      expectedGraduationYear: number | null;
      isProfileVisible: boolean;
      createdAt: Date;
      updatedAt: Date;
    } | null,
  ): ProfileResponseDto {
    const dto = new ProfileResponseDto();
    if (!profile) {
      dto.id = '';
      dto.userId = '';
      dto.isProfileVisible = true;
      dto.completionPercent = 0;
      dto.createdAt = '';
      dto.updatedAt = '';
      return dto;
    }
    dto.id = profile.id;
    dto.userId = profile.userId;
    dto.headline = profile.headline ?? undefined;
    dto.bio = profile.bio ?? undefined;
    dto.phone = profile.phone ?? undefined;
    dto.dateOfBirth = profile.dateOfBirth?.toISOString() ?? undefined;
    dto.gender = profile.gender ?? undefined;
    dto.githubUrl = profile.githubUrl ?? undefined;
    dto.linkedinUrl = profile.linkedinUrl ?? undefined;
    dto.portfolioUrl = profile.portfolioUrl ?? undefined;
    dto.leetcodeUrl = profile.leetcodeUrl ?? undefined;
    dto.codeforcesUrl = profile.codeforcesUrl ?? undefined;
    dto.resumeUrl = profile.resumeUrl ?? undefined;
    dto.city = profile.city ?? undefined;
    dto.state = profile.state ?? undefined;
    dto.country = profile.country ?? undefined;
    dto.collegeName = profile.collegeName ?? undefined;
    dto.department = profile.department ?? undefined;
    dto.currentSemester = profile.currentSemester ?? undefined;
    dto.expectedGraduationYear = profile.expectedGraduationYear ?? undefined;
    dto.isProfileVisible = profile.isProfileVisible;
    dto.completionPercent = computeProfileCompletion(profile);
    dto.createdAt = profile.createdAt.toISOString();
    dto.updatedAt = profile.updatedAt.toISOString();
    return dto;
  }

  // ---- Skills ----

  async listSkills(
    userId: string,
    page: number,
    limit: number,
    category?: string,
  ): Promise<ListResult<SkillResponseDto>> {
    const [total, skills] = await Promise.all([
      this.repository.countSkills(userId, category),
      this.repository.listSkills({ userId, skip: (page - 1) * limit, take: limit, category }),
    ]);
    return {
      data: skills.map((skill) => this.toSkillResponse(skill)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createSkill(userId: string, dto: Record<string, unknown>, ip?: string) {
    const name = String(dto.name).trim();
    const existing = await this.repository.findSkillByName(userId, name);
    if (existing) {
      throw new ConflictException({
        code: 'SKILL_ALREADY_EXISTS',
        message: `Skill '${name}' already exists on your profile`,
      });
    }
    const skill = await this.repository.createSkill({
      userId,
      name,
      category: dto.category as string | undefined,
      proficiencyLevel: dto.proficiencyLevel as string | undefined,
      yearsOfExperience: dto.yearsOfExperience as number | undefined,
      isPrimary: dto.isPrimary as boolean | undefined,
    });
    await this.audit.record({
      userId,
      action: 'student.skill.create',
      entityType: 'skill',
      entityId: skill.id,
      after: { name: skill.name, category: skill.category },
      ip,
    });
    await this.logActivity(userId, 'skill', `Skill added: ${skill.name}`, undefined);
    return this.toSkillResponse(skill);
  }

  async updateSkill(userId: string, id: string, dto: Record<string, unknown>, ip?: string) {
    const existing = await this.repository.findSkillById(id, userId);
    if (!existing) {
      throw new NotFoundException({ code: 'SKILL_NOT_FOUND', message: 'Skill not found' });
    }
    const name = dto.name !== undefined ? String(dto.name).trim() : undefined;
    if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.repository.findSkillByName(userId, name);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException({
          code: 'SKILL_ALREADY_EXISTS',
          message: `Skill '${name}' already exists on your profile`,
        });
      }
    }
    const skill = await this.repository.updateSkill(id, userId, {
      name,
      category: dto.category as string | undefined,
      proficiencyLevel: dto.proficiencyLevel as string | undefined,
      yearsOfExperience: dto.yearsOfExperience as number | undefined,
      isPrimary: dto.isPrimary as boolean | undefined,
    });
    await this.audit.record({
      userId,
      action: 'student.skill.update',
      entityType: 'skill',
      entityId: id,
      before: { name: existing.name, proficiencyLevel: existing.proficiencyLevel },
      after: { name: skill.name, proficiencyLevel: skill.proficiencyLevel },
      ip,
    });
    await this.logActivity(userId, 'skill', `Skill updated: ${skill.name}`, undefined);
    return this.toSkillResponse(skill);
  }

  async deleteSkill(userId: string, id: string, ip?: string): Promise<void> {
    const existing = await this.repository.findSkillById(id, userId);
    if (!existing) {
      throw new NotFoundException({ code: 'SKILL_NOT_FOUND', message: 'Skill not found' });
    }
    const deleted = await this.repository.deleteSkill(id, userId);
    if (deleted.count === 0) {
      throw new NotFoundException({ code: 'SKILL_NOT_FOUND', message: 'Skill not found' });
    }
    await this.audit.record({
      userId,
      action: 'student.skill.delete',
      entityType: 'skill',
      entityId: id,
      before: { name: existing.name },
      ip,
    });
    await this.logActivity(userId, 'skill', `Skill removed: ${existing.name}`, undefined);
  }

  private toSkillResponse(skill: {
    id: string;
    userId: string;
    name: string;
    category: string;
    proficiencyLevel: string;
    yearsOfExperience: number | null;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): SkillResponseDto {
    const dto = new SkillResponseDto();
    dto.id = skill.id;
    dto.userId = skill.userId;
    dto.name = skill.name;
    dto.category = skill.category;
    dto.proficiencyLevel = skill.proficiencyLevel;
    dto.yearsOfExperience = skill.yearsOfExperience ?? 0;
    dto.isPrimary = skill.isPrimary;
    dto.createdAt = skill.createdAt.toISOString();
    dto.updatedAt = skill.updatedAt.toISOString();
    return dto;
  }

  // ---- Career goals ----

  async listCareerGoals(
    userId: string,
    page: number,
    limit: number,
    status?: string,
  ): Promise<ListResult<CareerGoalResponseDto>> {
    const [total, goals] = await Promise.all([
      this.repository.countCareerGoals(userId, status),
      this.repository.listCareerGoals({ userId, skip: (page - 1) * limit, take: limit, status }),
    ]);
    return {
      data: goals.map((goal) => this.toCareerGoalResponse(goal)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createCareerGoal(userId: string, dto: Record<string, unknown>, ip?: string) {
    const goal = await this.repository.createCareerGoal({
      userId,
      title: String(dto.title).trim(),
      targetRole: dto.targetRole as string | undefined,
      targetCompanies: dto.targetCompanies as string[] | undefined,
      industries: dto.industries as string[] | undefined,
      preferredLocations: dto.preferredLocations as string[] | undefined,
      targetCtcLakhs: dto.targetCtcLakhs as number | undefined,
      targetDate: dto.targetDate ? new Date(String(dto.targetDate)) : undefined,
      status: (dto.status as string | undefined) ?? 'active',
      notes: dto.notes as string | undefined,
    });
    await this.audit.record({
      userId,
      action: 'student.career-goal.create',
      entityType: 'career_goal',
      entityId: goal.id,
      after: { title: goal.title, status: goal.status },
      ip,
    });
    await this.logActivity(userId, 'career_goal', `Career goal created: ${goal.title}`, undefined);
    return this.toCareerGoalResponse(goal);
  }

  async updateCareerGoal(userId: string, id: string, dto: Record<string, unknown>, ip?: string) {
    const existing = await this.repository.findCareerGoalById(id, userId);
    if (!existing) {
      throw new NotFoundException({
        code: 'CAREER_GOAL_NOT_FOUND',
        message: 'Career goal not found',
      });
    }
    const goal = await this.repository.updateCareerGoal(id, userId, {
      title: dto.title !== undefined ? String(dto.title).trim() : undefined,
      targetRole: dto.targetRole as string | undefined,
      targetCompanies: dto.targetCompanies as string[] | undefined,
      industries: dto.industries as string[] | undefined,
      preferredLocations: dto.preferredLocations as string[] | undefined,
      targetCtcLakhs: dto.targetCtcLakhs as number | undefined,
      targetDate: dto.targetDate ? new Date(String(dto.targetDate)) : undefined,
      status: dto.status as string | undefined,
      notes: dto.notes as string | undefined,
    });
    await this.audit.record({
      userId,
      action: 'student.career-goal.update',
      entityType: 'career_goal',
      entityId: id,
      before: { title: existing.title, status: existing.status },
      after: { title: goal.title, status: goal.status },
      ip,
    });
    await this.logActivity(userId, 'career_goal', `Career goal updated: ${goal.title}`, undefined);
    return this.toCareerGoalResponse(goal);
  }

  async deleteCareerGoal(userId: string, id: string, ip?: string): Promise<void> {
    const existing = await this.repository.findCareerGoalById(id, userId);
    if (!existing) {
      throw new NotFoundException({
        code: 'CAREER_GOAL_NOT_FOUND',
        message: 'Career goal not found',
      });
    }
    const deleted = await this.repository.deleteCareerGoal(id, userId);
    if (deleted.count === 0) {
      throw new NotFoundException({
        code: 'CAREER_GOAL_NOT_FOUND',
        message: 'Career goal not found',
      });
    }
    await this.audit.record({
      userId,
      action: 'student.career-goal.delete',
      entityType: 'career_goal',
      entityId: id,
      before: { title: existing.title },
      ip,
    });
    await this.logActivity(
      userId,
      'career_goal',
      `Career goal removed: ${existing.title}`,
      undefined,
    );
  }

  private toCareerGoalResponse(goal: {
    id: string;
    userId: string;
    title: string;
    targetRole: string | null;
    targetCompanies: string[];
    industries: string[];
    preferredLocations: string[];
    targetCtcLakhs: number | null;
    targetDate: Date | null;
    status: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CareerGoalResponseDto {
    const dto = new CareerGoalResponseDto();
    dto.id = goal.id;
    dto.userId = goal.userId;
    dto.title = goal.title;
    dto.targetRole = goal.targetRole ?? undefined;
    dto.targetCompanies = goal.targetCompanies ?? [];
    dto.industries = goal.industries ?? [];
    dto.preferredLocations = goal.preferredLocations ?? [];
    dto.targetCtcLakhs = goal.targetCtcLakhs ?? undefined;
    dto.targetDate = goal.targetDate?.toISOString() ?? undefined;
    dto.status = goal.status;
    dto.notes = goal.notes ?? undefined;
    dto.createdAt = goal.createdAt.toISOString();
    dto.updatedAt = goal.updatedAt.toISOString();
    return dto;
  }

  // ---- Calendar ----

  async listCalendarEvents(
    userId: string,
    page: number,
    limit: number,
    eventType?: string,
    from?: string,
    to?: string,
  ): Promise<ListResult<CalendarEventResponseDto>> {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const [total, events] = await Promise.all([
      this.repository.countCalendarEvents({ userId, eventType, from: fromDate, to: toDate }),
      this.repository.listCalendarEvents({
        userId,
        skip: (page - 1) * limit,
        take: limit,
        eventType,
        from: fromDate,
        to: toDate,
      }),
    ]);
    return {
      data: events.map((event) => this.toCalendarEventResponse(event)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async createCalendarEvent(userId: string, dto: Record<string, unknown>, ip?: string) {
    const event = await this.repository.createCalendarEvent({
      userId,
      title: String(dto.title).trim(),
      description: dto.description as string | undefined,
      eventType: (dto.eventType as string | undefined) ?? 'personal',
      startAt: new Date(String(dto.startAt)),
      endAt: dto.endAt ? new Date(String(dto.endAt)) : undefined,
      location: dto.location as string | undefined,
      isAllDay: dto.isAllDay as boolean | undefined,
      color: dto.color as string | undefined,
      reminderAt: dto.reminderAt ? new Date(String(dto.reminderAt)) : undefined,
    });
    await this.audit.record({
      userId,
      action: 'student.calendar.create',
      entityType: 'calendar_event',
      entityId: event.id,
      after: { title: event.title, startAt: event.startAt.toISOString() },
      ip,
    });
    await this.logActivity(userId, 'calendar', `Calendar event added: ${event.title}`, undefined);
    return this.toCalendarEventResponse(event);
  }

  async updateCalendarEvent(userId: string, id: string, dto: Record<string, unknown>, ip?: string) {
    const existing = await this.repository.findCalendarEventById(id, userId);
    if (!existing) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Calendar event not found' });
    }
    const event = await this.repository.updateCalendarEvent(id, userId, {
      title: dto.title !== undefined ? String(dto.title).trim() : undefined,
      description: dto.description as string | undefined,
      eventType: dto.eventType as string | undefined,
      startAt: dto.startAt ? new Date(String(dto.startAt)) : undefined,
      endAt: dto.endAt ? new Date(String(dto.endAt)) : undefined,
      location: dto.location as string | undefined,
      isAllDay: dto.isAllDay as boolean | undefined,
      color: dto.color as string | undefined,
      reminderAt: dto.reminderAt ? new Date(String(dto.reminderAt)) : undefined,
    });
    await this.audit.record({
      userId,
      action: 'student.calendar.update',
      entityType: 'calendar_event',
      entityId: id,
      before: { title: existing.title, startAt: existing.startAt.toISOString() },
      after: { title: event.title, startAt: event.startAt.toISOString() },
      ip,
    });
    await this.logActivity(userId, 'calendar', `Calendar event updated: ${event.title}`, undefined);
    return this.toCalendarEventResponse(event);
  }

  async deleteCalendarEvent(userId: string, id: string, ip?: string): Promise<void> {
    const existing = await this.repository.findCalendarEventById(id, userId);
    if (!existing) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Calendar event not found' });
    }
    const deleted = await this.repository.deleteCalendarEvent(id, userId);
    if (deleted.count === 0) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Calendar event not found' });
    }
    await this.audit.record({
      userId,
      action: 'student.calendar.delete',
      entityType: 'calendar_event',
      entityId: id,
      before: { title: existing.title },
      ip,
    });
    await this.logActivity(
      userId,
      'calendar',
      `Calendar event removed: ${existing.title}`,
      undefined,
    );
  }

  private toCalendarEventResponse(event: {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    eventType: string;
    startAt: Date;
    endAt: Date | null;
    location: string | null;
    isAllDay: boolean;
    color: string | null;
    reminderAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): CalendarEventResponseDto {
    const dto = new CalendarEventResponseDto();
    dto.id = event.id;
    dto.userId = event.userId;
    dto.title = event.title;
    dto.description = event.description ?? undefined;
    dto.eventType = event.eventType;
    dto.startAt = event.startAt.toISOString();
    dto.endAt = event.endAt?.toISOString() ?? undefined;
    dto.location = event.location ?? undefined;
    dto.isAllDay = event.isAllDay;
    dto.color = event.color ?? undefined;
    dto.reminderAt = event.reminderAt?.toISOString() ?? undefined;
    dto.createdAt = event.createdAt.toISOString();
    dto.updatedAt = event.updatedAt.toISOString();
    return dto;
  }

  // ---- Settings ----

  async getSettings(userId: string): Promise<SettingsResponseDto> {
    const settings = await this.repository.findSettingsByUserId(userId);
    if (!settings) {
      const created = await this.repository.upsertSettings(userId, {});
      return this.toSettingsResponse(created);
    }
    return this.toSettingsResponse(settings);
  }

  async updateSettings(userId: string, dto: Record<string, unknown>, ip?: string) {
    const before = await this.repository.findSettingsByUserId(userId);
    const settings = await this.repository.upsertSettings(userId, dto);
    await this.audit.record({
      userId,
      action: 'student.settings.update',
      entityType: 'user_settings',
      entityId: settings.id,
      before: before ?? undefined,
      after: settings,
      ip,
    });
    return this.toSettingsResponse(settings);
  }

  private toSettingsResponse(settings: {
    id: string;
    userId: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    weeklyDigest: boolean;
    language: string;
    theme: string;
    profileVisibility: string;
    createdAt: Date;
    updatedAt: Date;
  }): SettingsResponseDto {
    const dto = new SettingsResponseDto();
    dto.id = settings.id;
    dto.userId = settings.userId;
    dto.emailNotifications = settings.emailNotifications;
    dto.pushNotifications = settings.pushNotifications;
    dto.smsNotifications = settings.smsNotifications;
    dto.weeklyDigest = settings.weeklyDigest;
    dto.language = settings.language;
    dto.theme = settings.theme;
    dto.profileVisibility = settings.profileVisibility;
    dto.createdAt = settings.createdAt.toISOString();
    dto.updatedAt = settings.updatedAt.toISOString();
    return dto;
  }

  // ---- Readiness ----

  async getReadinessScore(userId: string): Promise<ReadinessScoreResponseDto | null> {
    const score = await this.repository.findReadinessScore(userId);
    if (!score) {
      return null;
    }
    const components = score.components as {
      profile: number;
      skills: number;
      careerGoal: number;
      activity: number;
    };
    return {
      overall: score.overall,
      components,
      calculatedAt: score.calculatedAt.toISOString(),
    };
  }

  async recalculateReadinessScore(userId: string, ip?: string): Promise<ReadinessScoreResponseDto> {
    const input = await this.collectReadinessInput(userId);
    const result = calculateReadinessScore(input);
    const now = new Date();
    const score = await this.repository.upsertReadinessScore(userId, {
      overall: result.overall,
      components: result.components as never,
      calculatedAt: now,
    });
    await this.audit.record({
      userId,
      action: 'student.readiness.recalculate',
      entityType: 'readiness_score',
      entityId: score.id,
      before: undefined,
      after: { overall: result.overall, components: result.components },
      ip,
    });
    await this.logActivity(
      userId,
      'readiness',
      `Readiness score recalculated: ${result.overall}/100`,
      undefined,
    );
    return {
      overall: result.overall,
      components: result.components,
      calculatedAt: now.toISOString(),
    };
  }

  private async collectReadinessInput(userId: string): Promise<ReadinessInput> {
    const [profile, skills, careerGoals, recentActivity, readNotifications] = await Promise.all([
      this.repository.findProfileByUserId(userId),
      this.repository.listSkills({ userId, skip: 0, take: 100 }),
      this.repository.listCareerGoals({ userId, skip: 0, take: 100 }),
      this.repository.countRecentActivity(userId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      this.repository.countNotifications(userId, false),
    ]);

    const activeGoal = careerGoals.find((goal) => goal.status === 'active');

    return {
      profile: {
        exists: Boolean(profile),
        completionPercent: profile ? computeProfileCompletion(profile) : 0,
        hasResume: Boolean(profile?.resumeUrl),
      },
      skills: {
        total: skills.length,
        advanced: skills.filter((s) => ['advanced', 'expert'].includes(s.proficiencyLevel)).length,
        categories: new Set(skills.map((s) => s.category)).size,
      },
      careerGoal: {
        hasGoal: Boolean(activeGoal),
        hasTargetRole: Boolean(activeGoal?.targetRole),
        hasTargetCompanies: Boolean(activeGoal?.targetCompanies?.length),
        hasTargetDate: Boolean(activeGoal?.targetDate),
        hasCtc: activeGoal?.targetCtcLakhs !== undefined && activeGoal?.targetCtcLakhs !== null,
      },
      activity: {
        recentActivityCount: recentActivity,
        readNotificationCount: readNotifications,
      },
    };
  }

  // ---- Notifications ----

  async listNotifications(
    userId: string,
    page: number,
    limit: number,
    unreadOnly?: boolean,
  ): Promise<ListResult<NotificationResponseDto>> {
    const [total, notifications] = await Promise.all([
      this.repository.countNotifications(userId, unreadOnly),
      this.repository.listNotifications({
        userId,
        skip: (page - 1) * limit,
        take: limit,
        unreadOnly,
      }),
    ]);
    return {
      data: notifications.map((n) => this.toNotificationResponse(n)),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async markNotificationRead(userId: string, id: string, ip?: string) {
    const existing = await this.repository.findNotificationById(id, userId);
    if (!existing) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found',
      });
    }
    const now = new Date();
    await this.repository.markNotificationRead(id, userId, now);
    const updated = await this.repository.findNotificationById(id, userId);
    await this.audit.record({
      userId,
      action: 'student.notification.read',
      entityType: 'notification',
      entityId: id,
      after: { isRead: true, readAt: now.toISOString() },
      ip,
    });
    return this.toNotificationResponse(updated!);
  }

  async markAllNotificationsRead(userId: string, ip?: string) {
    const now = new Date();
    const result = await this.repository.markAllNotificationsRead(userId, now);
    await this.audit.record({
      userId,
      action: 'student.notification.read-all',
      entityType: 'notification',
      entityId: undefined,
      after: { markedCount: result.count },
      ip,
    });
    return { markedCount: result.count };
  }

  /**
   * Internal create hook for other modules (5.21 fan-out machinery lands later).
   */
  async createNotification(
    userId: string,
    data: { type: string; title: string; message: string },
  ): Promise<NotificationResponseDto> {
    const notification = await this.repository.createNotification({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
    });
    await this.logActivity(userId, 'notification', `New notification: ${data.title}`, undefined);
    return this.toNotificationResponse(notification);
  }

  private toNotificationResponse(notification: {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata: unknown;
    isRead: boolean;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.id;
    dto.userId = notification.userId;
    dto.type = notification.type;
    dto.title = notification.title;
    dto.message = notification.message;
    dto.metadata =
      notification.metadata && typeof notification.metadata === 'object'
        ? (notification.metadata as Record<string, unknown>)
        : undefined;
    dto.isRead = notification.isRead;
    dto.readAt = notification.readAt?.toISOString() ?? undefined;
    dto.createdAt = notification.createdAt.toISOString();
    return dto;
  }

  // ---- Activity timeline ----

  async getActivityTimeline(
    userId: string,
    page: number,
    limit: number,
  ): Promise<ListResult<Record<string, unknown>>> {
    const [total, activity] = await Promise.all([
      this.repository.countActivity(userId),
      this.repository.listActivity(userId, (page - 1) * limit, limit),
    ]);
    return {
      data: activity.map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        type: entry.type,
        title: entry.title,
        description: entry.description ?? undefined,
        createdAt: entry.createdAt.toISOString(),
      })),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  private async logActivity(
    userId: string,
    type: string,
    title: string,
    description?: string,
  ): Promise<void> {
    await this.repository.createActivityLog({ userId, type, title, description });
  }

  // ---- Dashboard ----

  async getDashboard(userId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    const [profile, readiness, unreadCount, upcoming, recentActivity, activeGoals, skills] =
      await Promise.all([
        this.repository.findProfileByUserId(userId),
        this.repository.findReadinessScore(userId),
        this.repository.countUnreadNotifications(userId),
        this.repository.findUpcomingEvents(userId, now, 5),
        this.repository.listActivity(userId, 0, 10),
        this.repository.countActiveCareerGoals(userId),
        this.repository.listSkills({ userId, skip: 0, take: 100 }),
      ]);

    return {
      readinessScore: readiness
        ? {
            overall: readiness.overall,
            components: readiness.components,
            calculatedAt: readiness.calculatedAt.toISOString(),
          }
        : null,
      unreadNotifications: unreadCount,
      upcomingEvents: upcoming.map((event) => this.toCalendarEventResponse(event)),
      recentActivity: recentActivity.map((entry) => ({
        id: entry.id,
        type: entry.type,
        title: entry.title,
        createdAt: entry.createdAt.toISOString(),
      })),
      activeGoals,
      skillsCount: skills.length,
      profileCompletionPercent: profile ? computeProfileCompletion(profile) : 0,
    };
  }
}
