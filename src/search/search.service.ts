import { Injectable, BadRequestException } from '@nestjs/common';
import { SearchRepository } from './search.repository';

@Injectable()
export class SearchService {
  constructor(private readonly repository: SearchRepository) {}

  async search(query: string, type?: string, limit: number = 20, minSimilarity: number = 0.1) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('SEARCH_QUERY_REQUIRED');
    }

    const sanitizedQuery = query.trim();
    const effectiveLimit = Math.min(limit, 100);

    let results;

    if (type) {
      switch (type) {
        case 'problem':
          results = await this.repository.searchProblems(sanitizedQuery, effectiveLimit);
          break;
        case 'job':
          results = await this.repository.searchJobs(sanitizedQuery, effectiveLimit);
          break;
        case 'mentor':
          results = await this.repository.searchMentors(sanitizedQuery, effectiveLimit);
          break;
        case 'student':
          results = await this.repository.searchStudents(sanitizedQuery, effectiveLimit);
          break;
        case 'company':
          results = await this.repository.searchCompanies(sanitizedQuery, effectiveLimit);
          break;
        default:
          throw new BadRequestException('INVALID_SEARCH_TYPE');
      }
    } else {
      results = await this.repository.searchAll(sanitizedQuery, effectiveLimit);
    }

    const filteredResults = results.filter((r) => r.similarity >= minSimilarity);

    const types: Record<string, number> = {};
    for (const result of filteredResults) {
      types[result.type] = (types[result.type] ?? 0) + 1;
    }

    return {
      data: filteredResults,
      query: sanitizedQuery,
      total: filteredResults.length,
      types,
    };
  }
}
