import { Test } from '@nestjs/testing';
import { CareerCoachService } from './career-coach.service';
import { CareerCoachController } from './career-coach.controller';

describe('CareerCoachController', () => {
  let controller: CareerCoachController;
  let service: Record<string, jest.Mock>;

  const user = { id: 'u1', email: 'u1@x.com', role: 'student', roleId: 'r1', permissions: [] };

  beforeEach(async () => {
    service = {
      getRoadmap: jest.fn().mockResolvedValue({ phases: [] }),
      getRecommendations: jest.fn().mockResolvedValue({ recommendations: [] }),
      getSalaryPrediction: jest.fn().mockResolvedValue({ isEstimate: true }),
      getSkillGap: jest.fn().mockResolvedValue({ missing: [] }),
      sendChatMessage: jest.fn().mockResolvedValue({ reply: 'hi' }),
      listChat: jest.fn().mockResolvedValue({ data: [], meta: {} }),
    };
    const module = await Test.createTestingModule({
      controllers: [CareerCoachController],
      providers: [{ provide: CareerCoachService, useValue: service }],
    }).compile();
    controller = module.get(CareerCoachController);
  });

  it('exposes the roadmap', async () => {
    await controller.getRoadmap(user as never);
    expect(service.getRoadmap).toHaveBeenCalledWith('u1');
  });

  it('exposes recommendations', async () => {
    await controller.getRecommendations(user as never);
    expect(service.getRecommendations).toHaveBeenCalledWith('u1');
  });

  it('exposes the salary prediction', async () => {
    await controller.getSalaryPrediction(user as never);
    expect(service.getSalaryPrediction).toHaveBeenCalledWith('u1');
  });

  it('exposes the skill gap', async () => {
    await controller.getSkillGap(user as never);
    expect(service.getSkillGap).toHaveBeenCalledWith('u1');
  });

  it('forwards chat messages with the user id and email', async () => {
    await controller.sendChatMessage(user as never, { message: 'hello' });
    expect(service.sendChatMessage).toHaveBeenCalledWith('u1', 'hello', 'u1@x.com');
  });

  it('lists chat history with pagination', async () => {
    await controller.listChat(user as never, { page: 1, limit: 20 } as never);
    expect(service.listChat).toHaveBeenCalledWith('u1', 1, 20);
  });
});
