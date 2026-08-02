import { DsaController } from './dsa.controller';
import { DsaService } from './dsa.service';
import { ListProblemsQueryDto } from './dto/dsa.dto';

describe('DsaController', () => {
  const dsa = {
    listProblems: jest.fn(),
    getProblem: jest.fn(),
    runCode: jest.fn(),
    submitCode: jest.fn(),
    listMySubmissions: jest.fn(),
    getSubmission: jest.fn(),
    getEditorial: jest.fn(),
    getHints: jest.fn(),
    unlockHint: jest.fn(),
  };
  let controller: DsaController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DsaController(dsa as unknown as DsaService);
  });

  const user = { id: 'user-1' } as never;

  it('lists problems with the filter + pagination query', () => {
    const query = {
      difficulty: 'medium',
      topic: 'dp',
      company: 'Google',
      tag: 'two-pointers',
      search: 'sum',
      page: 2,
      limit: 20,
      sortBy: 'difficulty',
      order: 'asc' as const,
    };
    controller.listProblems(query as unknown as ListProblemsQueryDto);
    expect(dsa.listProblems).toHaveBeenCalledWith(
      {
        difficulty: 'medium',
        topic: 'dp',
        company: 'Google',
        tag: 'two-pointers',
        search: 'sum',
      },
      2,
      20,
      'difficulty',
      'asc',
    );
  });

  it('gets a problem', () => {
    controller.getProblem('p1');
    expect(dsa.getProblem).toHaveBeenCalledWith('p1');
  });

  it('runs code with the user, problem, dto, and ip', () => {
    const dto = { languageId: 71, sourceCode: 'print(1)', stdin: '1' };
    controller.runCode(user, 'p1', dto as never, '10.0.0.1');
    expect(dsa.runCode).toHaveBeenCalledWith('user-1', 'p1', dto, '10.0.0.1');
  });

  it('submits code with the user, problem, dto, and ip', () => {
    const dto = { languageId: 71, sourceCode: 'print(1)' };
    controller.submitCode(user, 'p1', dto as never, '10.0.0.1');
    expect(dsa.submitCode).toHaveBeenCalledWith('user-1', 'p1', dto, '10.0.0.1');
  });

  it('lists my submissions with filters', () => {
    controller.listMySubmissions(user, {
      problemId: 'p1',
      verdict: 'accepted',
      page: 1,
      limit: 10,
    } as never);
    expect(dsa.listMySubmissions).toHaveBeenCalledWith('user-1', 'p1', 'accepted', 1, 10);
  });

  it('gets one submission scoped to the user', () => {
    controller.getSubmission(user, 's1');
    expect(dsa.getSubmission).toHaveBeenCalledWith('user-1', 's1');
  });

  it('gets the editorial', () => {
    controller.getEditorial('p1');
    expect(dsa.getEditorial).toHaveBeenCalledWith('p1');
  });

  it('gets hints for the current user', () => {
    controller.getHints(user, 'p1');
    expect(dsa.getHints).toHaveBeenCalledWith('user-1', 'p1');
  });

  it('unlocks a hint sequentially', () => {
    controller.unlockHint(user, 'p1', { hintOrder: 2 } as never, '10.0.0.1');
    expect(dsa.unlockHint).toHaveBeenCalledWith('user-1', 'p1', 2, '10.0.0.1');
  });
});
