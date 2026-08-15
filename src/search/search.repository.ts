import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchProblems(query: string, limit: number): Promise<SearchResult[]> {
    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        statement: string;
        similarity: number;
      }>
    >`
      SELECT
        p.id,
        p.title,
        p.statement,
        GREATEST(
          similarity(p.title, ${query}),
          similarity(p.statement, ${query})
        ) as similarity
      FROM "Problem" p
      WHERE
        similarity(p.title, ${query}) > 0.1
        OR similarity(p.statement, ${query}) > 0.1
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'problem',
      title: r.title,
      description: r.statement?.substring(0, 200) ?? '',
      similarity: Number(r.similarity),
      metadata: {},
    }));
  }

  async searchJobs(query: string, limit: number): Promise<SearchResult[]> {
    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        description: string;
        company: string;
        location: string;
        type: string;
        similarity: number;
      }>
    >`
      SELECT
        j.id,
        j.title,
        j.description,
        c.name as company,
        j.location,
        j.type,
        GREATEST(
          similarity(j.title, ${query}),
          similarity(j.description, ${query}),
          similarity(c.name, ${query})
        ) as similarity
      FROM "JobListing" j
      LEFT JOIN "CompanyProfile" c ON c.id = j."companyId"
      WHERE j."isActive" = true
        AND (
          similarity(j.title, ${query}) > 0.1
          OR similarity(j.description, ${query}) > 0.1
          OR similarity(c.name, ${query}) > 0.1
        )
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'job',
      title: r.title,
      description: r.description?.substring(0, 200) ?? '',
      similarity: Number(r.similarity),
      metadata: { company: r.company, location: r.location, jobType: r.type },
    }));
  }

  async searchMentors(query: string, limit: number): Promise<SearchResult[]> {
    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        user_name: string;
        headline: string;
        bio: string;
        hourly_rate: number;
        similarity: number;
      }>
    >`
      SELECT
        m.id,
        u."fullName" as user_name,
        m.headline,
        m.bio,
        m."hourlyRate" as hourly_rate,
        GREATEST(
          similarity(m.headline, ${query}),
          similarity(m.bio, ${query}),
          similarity(u."fullName", ${query})
        ) as similarity
      FROM "MentorProfile" m
      LEFT JOIN "User" u ON u.id = m."userId"
      WHERE
        similarity(m.headline, ${query}) > 0.1
        OR similarity(m.bio, ${query}) > 0.1
        OR similarity(u."fullName", ${query}) > 0.1
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'mentor',
      title: r.user_name,
      description: r.bio?.substring(0, 200) ?? '',
      similarity: Number(r.similarity),
      metadata: { headline: r.headline, hourlyRate: r.hourly_rate },
    }));
  }

  async searchStudents(query: string, limit: number): Promise<SearchResult[]> {
    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        full_name: string;
        headline: string;
        department: string;
        college: string;
        similarity: number;
      }>
    >`
      SELECT
        sp."userId" as id,
        u."fullName" as full_name,
        sp.headline,
        sp.department,
        sp."collegeName" as college,
        GREATEST(
          similarity(u."fullName", ${query}),
          COALESCE(similarity(sp.headline, ${query}), 0),
          COALESCE(similarity(sp.department, ${query}), 0)
        ) as similarity
      FROM "StudentProfile" sp
      LEFT JOIN "User" u ON u.id = sp."userId"
      WHERE u."deletedAt" IS NULL
        AND (
          similarity(u."fullName", ${query}) > 0.1
          OR similarity(sp.headline, ${query}) > 0.1
          OR similarity(sp.department, ${query}) > 0.1
        )
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'student',
      title: r.full_name,
      description: r.headline?.substring(0, 200) ?? '',
      similarity: Number(r.similarity),
      metadata: { department: r.department, college: r.college },
    }));
  }

  async searchCompanies(query: string, limit: number): Promise<SearchResult[]> {
    const results = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        description: string;
        industry: string;
        location: string;
        similarity: number;
      }>
    >`
      SELECT
        c.id,
        c.name,
        c.description,
        c.industry,
        c.location,
        GREATEST(
          similarity(c.name, ${query}),
          similarity(c.description, ${query}),
          COALESCE(similarity(c.industry, ${query}), 0)
        ) as similarity
      FROM "CompanyProfile" c
      WHERE
        similarity(c.name, ${query}) > 0.1
        OR similarity(c.description, ${query}) > 0.1
        OR similarity(c.industry, ${query}) > 0.1
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      id: r.id,
      type: 'company',
      title: r.name,
      description: r.description?.substring(0, 200) ?? '',
      similarity: Number(r.similarity),
      metadata: { industry: r.industry, location: r.location },
    }));
  }

  async searchAll(query: string, limit: number): Promise<SearchResult[]> {
    const perTypeLimit = Math.ceil(limit / 5);
    const [problems, jobs, mentors, students, companies] = await Promise.all([
      this.searchProblems(query, perTypeLimit),
      this.searchJobs(query, perTypeLimit),
      this.searchMentors(query, perTypeLimit),
      this.searchStudents(query, perTypeLimit),
      this.searchCompanies(query, perTypeLimit),
    ]);

    return [...problems, ...jobs, ...mentors, ...students, ...companies]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}
