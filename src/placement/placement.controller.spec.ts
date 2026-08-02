import { PlacementController } from './placement.controller';
import { PlacementService } from './placement.service';

describe('PlacementController', () => {
  const placement = {
    getRoadmap: jest.fn(),
    getWeekTasks: jest.fn(),
    completeTask: jest.fn(),
    getCompanyPrep: jest.fn(),
    getProgress: jest.fn(),
    getReadinessPrediction: jest.fn(),
    getDailyChallenge: jest.fn(),
    generateStudyPlan: jest.fn(),
  };
  let controller: PlacementController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PlacementController(placement as unknown as PlacementService);
  });

  const user = { id: 'user-1' } as never;

  it('gets the roadmap with the current user id', () => {
    controller.roadmap(user, '127.0.0.1');
    expect(placement.getRoadmap).toHaveBeenCalledWith('user-1', '127.0.0.1');
  });

  it('gets the tasks for one roadmap week', () => {
    controller.weekTasks(user, 3);
    expect(placement.getWeekTasks).toHaveBeenCalledWith('user-1', 3);
  });

  it('completes a task', () => {
    controller.completeTask(user, 'task-1', '127.0.0.1');
    expect(placement.completeTask).toHaveBeenCalledWith('user-1', 'task-1', '127.0.0.1');
  });

  it('gets a company prep track', () => {
    controller.companyPrep('Google');
    expect(placement.getCompanyPrep).toHaveBeenCalledWith('Google');
  });

  it('gets progress', () => {
    controller.progress(user);
    expect(placement.getProgress).toHaveBeenCalledWith('user-1');
  });

  it('gets the readiness prediction', () => {
    controller.readinessPrediction(user, '127.0.0.1');
    expect(placement.getReadinessPrediction).toHaveBeenCalledWith('user-1', '127.0.0.1');
  });

  it('gets the daily challenge', () => {
    controller.dailyChallenge();
    expect(placement.getDailyChallenge).toHaveBeenCalled();
  });

  it('generates a study plan from the DTO', () => {
    const dto = { targetRole: 'SDE' };
    controller.generateStudyPlan(user, dto as never, '127.0.0.1');
    expect(placement.generateStudyPlan).toHaveBeenCalledWith('user-1', dto, '127.0.0.1');
  });
});
