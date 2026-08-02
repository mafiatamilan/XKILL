import { Test } from '@nestjs/testing';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';

describe('InterviewController', () => {
  let controller: InterviewController;
  let service: {
    createSession: jest.Mock;
    listSessions: jest.Mock;
    getSession: jest.Mock;
    addTurn: jest.Mock;
    endSession: jest.Mock;
    getReport: jest.Mock;
  };

  const user = { id: 'u1', email: 's@x.com', role: 'student', roleId: 'r1', permissions: [] };

  beforeEach(async () => {
    service = {
      createSession: jest.fn().mockResolvedValue({ id: 's1' }),
      listSessions: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      getSession: jest.fn().mockResolvedValue({ id: 's1' }),
      addTurn: jest.fn().mockResolvedValue({ nextQuestion: 'q' }),
      endSession: jest.fn().mockResolvedValue({ id: 's1', status: 'ended' }),
      getReport: jest.fn().mockResolvedValue({ overallScore: 80 }),
    };
    const module = await Test.createTestingModule({
      controllers: [InterviewController],
      providers: [{ provide: InterviewService, useValue: service }],
    }).compile();
    controller = module.get(InterviewController);
  });

  it('creates a session passing the current user id', async () => {
    await controller.createSession(user, { type: 'hr' });
    expect(service.createSession).toHaveBeenCalledWith('u1', { type: 'hr' }, 's@x.com');
  });

  it('lists sessions with pagination query passthrough', async () => {
    await controller.listSessions(user, { page: 2, limit: 10, sortBy: 'createdAt', order: 'desc' });
    expect(service.listSessions).toHaveBeenCalledWith('u1', 2, 10);
  });

  it('gets a session', async () => {
    await controller.getSession(user, 's1');
    expect(service.getSession).toHaveBeenCalledWith('u1', 's1');
  });

  it('adds a turn passing dto + ip', async () => {
    const dto = { answer: 'hi', code: 'print(1)', languageId: 71 };
    await controller.addTurn(user, 's1', dto);
    expect(service.addTurn).toHaveBeenCalledWith('u1', 's1', dto, 's@x.com');
  });

  it('ends a session', async () => {
    await controller.endSession(user, 's1');
    expect(service.endSession).toHaveBeenCalledWith('u1', 's1', 's@x.com');
  });

  it('gets a report', async () => {
    await controller.getReport(user, 's1');
    expect(service.getReport).toHaveBeenCalledWith('u1', 's1');
  });
});
