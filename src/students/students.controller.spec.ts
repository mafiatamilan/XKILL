import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

describe('StudentsController', () => {
  const students = {
    getDashboard: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    listSkills: jest.fn(),
    createSkill: jest.fn(),
    updateSkill: jest.fn(),
    deleteSkill: jest.fn(),
    listCareerGoals: jest.fn(),
    createCareerGoal: jest.fn(),
    updateCareerGoal: jest.fn(),
    deleteCareerGoal: jest.fn(),
    listCalendarEvents: jest.fn(),
    createCalendarEvent: jest.fn(),
    updateCalendarEvent: jest.fn(),
    deleteCalendarEvent: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    getReadinessScore: jest.fn(),
    recalculateReadinessScore: jest.fn(),
    listNotifications: jest.fn(),
    markNotificationRead: jest.fn(),
    markAllNotificationsRead: jest.fn(),
    getActivityTimeline: jest.fn(),
  };
  let controller: StudentsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new StudentsController(students as unknown as StudentsService);
  });

  const user = { id: 'user-1' } as never;

  it('returns the dashboard for the current user', () => {
    controller.dashboard(user);
    expect(students.getDashboard).toHaveBeenCalledWith('user-1');
  });

  it('gets and updates the profile', () => {
    controller.profile(user);
    expect(students.getProfile).toHaveBeenCalledWith('user-1');
    controller.updateProfile(user, { headline: 'x' } as never, '1.1.1.1');
    expect(students.updateProfile).toHaveBeenCalledWith('user-1', { headline: 'x' }, '1.1.1.1');
  });

  it('lists and mutates skills', () => {
    controller.listSkills(user, { page: 1, limit: 20 } as never);
    expect(students.listSkills).toHaveBeenCalledWith('user-1', 1, 20);
    controller.createSkill(user, { name: 'Go' } as never, '1.1.1.1');
    expect(students.createSkill).toHaveBeenCalledWith('user-1', { name: 'Go' }, '1.1.1.1');
    controller.updateSkill(user, 'sk-1', { name: 'Go' } as never, '1.1.1.1');
    expect(students.updateSkill).toHaveBeenCalledWith('user-1', 'sk-1', { name: 'Go' }, '1.1.1.1');
    controller.deleteSkill(user, 'sk-1', '1.1.1.1');
    expect(students.deleteSkill).toHaveBeenCalledWith('user-1', 'sk-1', '1.1.1.1');
  });

  it('lists and mutates career goals', () => {
    controller.listCareerGoals(user, { page: 1, limit: 20 } as never);
    expect(students.listCareerGoals).toHaveBeenCalledWith('user-1', 1, 20);
    controller.createCareerGoal(user, { title: 'goal' } as never, '1.1.1.1');
    expect(students.createCareerGoal).toHaveBeenCalledWith('user-1', { title: 'goal' }, '1.1.1.1');
    controller.updateCareerGoal(user, 'g-1', { title: 'x' } as never, '1.1.1.1');
    expect(students.updateCareerGoal).toHaveBeenCalledWith(
      'user-1',
      'g-1',
      { title: 'x' },
      '1.1.1.1',
    );
    controller.deleteCareerGoal(user, 'g-1', '1.1.1.1');
    expect(students.deleteCareerGoal).toHaveBeenCalledWith('user-1', 'g-1', '1.1.1.1');
  });

  it('lists and mutates calendar events', () => {
    controller.listCalendarEvents(user, { page: 1, limit: 20 } as never);
    expect(students.listCalendarEvents).toHaveBeenCalledWith('user-1', 1, 20);
    controller.createCalendarEvent(user, { title: 'ev' } as never, '1.1.1.1');
    expect(students.createCalendarEvent).toHaveBeenCalledWith('user-1', { title: 'ev' }, '1.1.1.1');
    controller.updateCalendarEvent(user, 'ev-1', { title: 'x' } as never, '1.1.1.1');
    expect(students.updateCalendarEvent).toHaveBeenCalledWith(
      'user-1',
      'ev-1',
      { title: 'x' },
      '1.1.1.1',
    );
    controller.deleteCalendarEvent(user, 'ev-1', '1.1.1.1');
    expect(students.deleteCalendarEvent).toHaveBeenCalledWith('user-1', 'ev-1', '1.1.1.1');
  });

  it('gets and updates settings', () => {
    controller.settings(user);
    expect(students.getSettings).toHaveBeenCalledWith('user-1');
    controller.updateSettings(user, { theme: 'dark' } as never, '1.1.1.1');
    expect(students.updateSettings).toHaveBeenCalledWith('user-1', { theme: 'dark' }, '1.1.1.1');
  });

  it('exposes readiness score endpoints', () => {
    controller.readinessScore(user);
    expect(students.getReadinessScore).toHaveBeenCalledWith('user-1');
    controller.recalculateReadiness(user, '1.1.1.1');
    expect(students.recalculateReadinessScore).toHaveBeenCalledWith('user-1', '1.1.1.1');
  });

  it('lists and reads notifications', () => {
    controller.listNotifications(user, { page: 1, limit: 20 } as never);
    expect(students.listNotifications).toHaveBeenCalledWith('user-1', 1, 20, false);
    controller.listNotifications(user, { page: 1, limit: 20, unreadOnly: true } as never);
    expect(students.listNotifications).toHaveBeenCalledWith('user-1', 1, 20, true);
    controller.markNotificationRead(user, 'ntf-1', '1.1.1.1');
    expect(students.markNotificationRead).toHaveBeenCalledWith('user-1', 'ntf-1', '1.1.1.1');
    controller.markAllNotificationsRead(user, '1.1.1.1');
    expect(students.markAllNotificationsRead).toHaveBeenCalledWith('user-1', '1.1.1.1');
  });

  it('returns the activity timeline', () => {
    controller.activityTimeline(user, { page: 1, limit: 20 } as never);
    expect(students.getActivityTimeline).toHaveBeenCalledWith('user-1', 1, 20);
  });
});
