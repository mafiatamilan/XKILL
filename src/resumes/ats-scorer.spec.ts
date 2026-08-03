import { computeAtsScore, countWords, extractKeywords } from './ats-scorer';
import type { ResumeContent } from './ats-scorer';

const fullContent: ResumeContent = {
  contact: {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '123-456-7890',
    location: 'London, UK',
  },
  summary:
    'Backend engineer with strong SQL, Node.js and system design skills across multiple ' +
    'production systems. Designed high-throughput queues, cut query latency by forty percent, ' +
    'and shipped resilient microservices serving millions of requests daily.',
  skills: ['SQL', 'Node.js', 'PostgreSQL', 'System Design'],
  experience: [
    {
      role: 'Backend Engineer',
      company: 'ACME',
      highlights: [
        'Designed a high-throughput queue handling ten thousand jobs per second',
        'Reduced latency by 40% through careful index tuning and caching',
        'Led the migration of legacy monolith services onto Kubernetes',
      ],
    },
  ],
  education: [{ degree: 'B.Tech', institution: 'IIT' }],
  projects: [
    {
      name: 'XKILL',
      link: 'github.com/xkill',
      description: 'A coding platform with online judges and realtime leaderboards',
    },
  ],
  certifications: [{ name: 'AWS SAA', issuer: 'Amazon' }],
};

describe('computeAtsScore', () => {
  it('returns a perfect score for a complete, clean resume', () => {
    const result = computeAtsScore(fullContent);
    expect(result.score).toBe(100);
    expect(result.missingSections).toEqual([]);
    expect(result.textDensity).toBe('good');
  });

  it('flags missing sections and reduces the score accordingly', () => {
    const result = computeAtsScore({ contact: { email: 'a@b.com' } });
    expect(result.missingSections).toContain('Skills');
    expect(result.missingSections).toContain('Experience');
    expect(result.missingSections).toContain('Education');
    expect(result.score).toBeLessThan(50);
    expect(result.sectionScores.skills).toEqual({
      present: false,
      points: 0,
      maxPoints: 20,
      detail: 'Missing section',
    });
  });

  it('penalizes ATS-hostile elements (tables, images) as high-severity issues', () => {
    const result = computeAtsScore({
      ...fullContent,
      atsElements: { tables: true, images: true },
    });
    expect(result.issues.map((issue) => issue.code)).toContain('ATS_TABLE');
    expect(result.issues.map((issue) => issue.code)).toContain('ATS_IMAGE');
    expect(result.score).toBeLessThan(100);
  });

  it('classifies a very short resume as sparse and a huge one as dense', () => {
    const sparse = computeAtsScore({ contact: { email: 'a@b.com' } });
    expect(sparse.textDensity).toBe('sparse');
    expect(sparse.issues.map((issue) => issue.code)).toContain('ATS_SPARSE');

    const huge: ResumeContent = {
      ...fullContent,
      experience: [
        {
          role: 'x',
          highlights: [Array.from({ length: 200 }, (_, i) => `bullet number ${i}`).join(' ')],
        },
      ],
      projects: [
        {
          description: Array.from({ length: 200 }, (_, i) => `word ${i}`).join(' '),
        },
      ],
      summary: Array.from({ length: 100 }, (_, i) => `sentence ${i}`).join(' '),
    };
    const dense = computeAtsScore(huge);
    expect(dense.textDensity).toBe('dense');
    expect(dense.issues.map((issue) => issue.code)).toContain('ATS_DENSE');
  });

  describe('keyword overlap vs a job description', () => {
    it('scores matching keywords and reports missing ones', () => {
      const jd =
        'Backend engineer. Strong SQL, Node.js and system design skills. Docker experience required.';
      const result = computeAtsScore(fullContent, jd);
      expect(result.keywordOverlap.provided).toBe(true);
      expect(result.keywordOverlap.matched).toContain('sql');
      expect(result.keywordOverlap.matched).toContain('node.js');
      expect(result.keywordOverlap.missing).toContain('docker');
      expect(result.keywordOverlap.coverage).toBeGreaterThan(0);
      expect(result.keywordOverlap.coverage).toBeLessThan(1);
    });

    it('does not compute overlap when no job description is supplied', () => {
      const result = computeAtsScore(fullContent);
      expect(result.keywordOverlap.provided).toBe(false);
      expect(result.keywordOverlap.matched).toEqual([]);
    });
  });
});

describe('countWords', () => {
  it('counts whitespace-separated words and handles empty input', () => {
    expect(countWords('one two   three')).toBe(3);
    expect(countWords('')).toBe(0);
    expect(countWords(undefined)).toBe(0);
  });
});

describe('extractKeywords', () => {
  it('extracts normalized single-word and phrase keywords', () => {
    const keywords = extractKeywords('Strong SQL and System Design; machine learning.');
    expect(keywords).toContain('sql');
    expect(keywords).toContain('machinelearning');
  });
});
