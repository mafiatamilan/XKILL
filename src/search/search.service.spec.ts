import { BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchRepository } from './search.repository';

describe('SearchService', () => {
  let service: SearchService;
  let repository: Record<string, jest.Mock>;

  beforeEach(() => {
    repository = {
      searchProblems: jest.fn(),
      searchJobs: jest.fn(),
      searchMentors: jest.fn(),
      searchStudents: jest.fn(),
      searchCompanies: jest.fn(),
      searchAll: jest.fn(),
    };

    service = new SearchService(repository as unknown as SearchRepository);
  });

  describe('search', () => {
    it('throws BadRequestException for empty query', async () => {
      await expect(service.search('')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.search('   ')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('searches all types when no type specified', async () => {
      repository.searchAll.mockResolvedValue([
        {
          id: '1',
          type: 'problem',
          title: 'Two Sum',
          description: 'Array problem',
          similarity: 0.8,
          metadata: {},
        },
        {
          id: '2',
          type: 'job',
          title: 'TS Dev',
          description: 'Job at co',
          similarity: 0.6,
          metadata: {},
        },
      ]);

      const result = await service.search('typescript');
      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.query).toBe('typescript');
      expect(result.types.problem).toBe(1);
      expect(result.types.job).toBe(1);
      expect(repository.searchAll).toHaveBeenCalledWith('typescript', 20);
    });

    it('searches specific type when specified', async () => {
      repository.searchJobs.mockResolvedValue([
        {
          id: '1',
          type: 'job',
          title: 'React Dev',
          description: 'Job',
          similarity: 0.9,
          metadata: {},
        },
      ]);

      const result = await service.search('react', 'job');
      expect(result.data.length).toBe(1);
      expect(result.data[0].type).toBe('job');
      expect(repository.searchJobs).toHaveBeenCalledWith('react', 20);
    });

    it('filters results by minSimilarity', async () => {
      repository.searchAll.mockResolvedValue([
        {
          id: '1',
          type: 'problem',
          title: 'Match',
          description: '',
          similarity: 0.8,
          metadata: {},
        },
        { id: '2', type: 'job', title: 'Low', description: '', similarity: 0.05, metadata: {} },
      ]);

      const result = await service.search('test', undefined, 20, 0.1);
      expect(result.data.length).toBe(1);
      expect(result.data[0].id).toBe('1');
    });

    it('throws BadRequestException for invalid type', async () => {
      await expect(service.search('test', 'invalid')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('limits results to max 100', async () => {
      repository.searchAll.mockResolvedValue([]);

      await service.search('test', undefined, 200);
      expect(repository.searchAll).toHaveBeenCalledWith('test', 100);
    });

    it('handles each search type correctly', async () => {
      const types = ['problem', 'job', 'mentor', 'student', 'company'] as const;
      const mockFn = {
        problem: repository.searchProblems,
        job: repository.searchJobs,
        mentor: repository.searchMentors,
        student: repository.searchStudents,
        company: repository.searchCompanies,
      };

      for (const type of types) {
        mockFn[type].mockResolvedValue([
          { id: '1', type, title: 'Test', description: '', similarity: 0.5, metadata: {} },
        ]);

        const result = await service.search('test', type);
        expect(result.data.length).toBe(1);
        expect(result.data[0].type).toBe(type);
      }
    });
  });
});
