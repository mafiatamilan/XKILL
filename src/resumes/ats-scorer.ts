/**
 * Resume content model shared by the ATS scorer, the PDF/DOCX exporters, and the
 * repository. Content is stored as JSON on `Resume.content`.
 */

export interface ResumeContact {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface ResumeExperienceItem {
  role?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  highlights?: string[];
}

export interface ResumeEducationItem {
  degree?: string;
  institution?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

export interface ResumeProjectItem {
  name?: string;
  link?: string;
  description?: string;
  highlights?: string[];
}

export interface ResumeCertificationItem {
  name?: string;
  issuer?: string;
  year?: string;
}

export interface ResumeContent {
  contact?: ResumeContact;
  summary?: string;
  skills?: string[];
  experience?: ResumeExperienceItem[];
  education?: ResumeEducationItem[];
  projects?: ResumeProjectItem[];
  certifications?: ResumeCertificationItem[];
  // ATS-hostile elements that ATS parsers may choke on. Present = penalty.
  atsElements?: {
    tables?: boolean;
    images?: boolean;
    textBoxes?: boolean;
    columns?: boolean;
  };
}

export function countWords(text: string | undefined): number {
  if (!text) {
    return 0;
  }
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function collectAllText(content: ResumeContent): string {
  const parts: string[] = [];
  if (content.contact) {
    const contact = content.contact;
    parts.push(
      [
        contact.fullName,
        contact.email,
        contact.phone,
        contact.location,
        contact.linkedin,
        contact.github,
        contact.website,
      ]
        .filter(Boolean)
        .join(' '),
    );
  }
  if (content.summary) {
    parts.push(content.summary);
  }
  if (content.skills) {
    parts.push(content.skills.join(' '));
  }
  for (const item of content.experience ?? []) {
    parts.push(
      [
        item.role,
        item.company,
        item.location,
        item.startDate,
        item.endDate,
        ...(item.highlights ?? []),
      ]
        .filter(Boolean)
        .join(' '),
    );
  }
  for (const item of content.education ?? []) {
    parts.push([item.degree, item.institution, item.gpa].filter(Boolean).join(' '));
  }
  for (const item of content.projects ?? []) {
    parts.push(
      [item.name, item.link, item.description, ...(item.highlights ?? [])]
        .filter(Boolean)
        .join(' '),
    );
  }
  for (const item of content.certifications ?? []) {
    parts.push([item.name, item.issuer, item.year].filter(Boolean).join(' '));
  }
  return parts.join('\n');
}

export function normalizeSkill(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9+#.-]/g, '')
    .trim();
}

/**
 * Extract keyword tokens from a job description and a resume's text corpus.
 * Multi-word phrases (e.g. "machine learning") are matched as phrases first,
 * then single-word tokens. Returns raw terms and their normalized forms.
 */
export function extractKeywords(text: string): string[] {
  const phrases = text
    .split(/[.,;:\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.split(/\s+/).length > 1 && part.split(/\s+/).length <= 4);
  const words = text.match(/[a-zA-Z0-9+#.-]+/g) ?? [];
  return [...phrases, ...words]
    .map((term) => normalizeSkill(term))
    .filter((term) => term.length > 0);
}

export interface AtsIssue {
  code: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export interface SectionScore {
  present: boolean;
  points: number;
  maxPoints: number;
  detail?: string;
}

export interface KeywordOverlap {
  provided: boolean;
  matched: string[];
  missing: string[];
  coverage: number;
}

export interface AtsScoreResult {
  score: number;
  sectionScores: Record<string, SectionScore>;
  missingSections: string[];
  issues: AtsIssue[];
  textDensity: 'sparse' | 'good' | 'dense';
  keywordOverlap: KeywordOverlap;
}

const SECTION_WEIGHTS: Array<{ key: string; label: string; weight: number }> = [
  { key: 'contact', label: 'Contact', weight: 15 },
  { key: 'skills', label: 'Skills', weight: 20 },
  { key: 'experience', label: 'Experience', weight: 20 },
  { key: 'education', label: 'Education', weight: 15 },
  { key: 'summary', label: 'Summary', weight: 10 },
  { key: 'projects', label: 'Projects', weight: 10 },
  { key: 'certifications', label: 'Certifications', weight: 5 },
];

const DENSITY_THRESHOLDS = {
  sparseWords: 80,
  denseWords: 700,
};

function sectionPresent(content: ResumeContent, key: string): boolean {
  switch (key) {
    case 'contact':
      return Boolean(content.contact && Object.values(content.contact).some(Boolean));
    case 'summary':
      return Boolean(content.summary && countWords(content.summary) > 0);
    case 'skills':
      return Boolean(content.skills && content.skills.length > 0);
    case 'experience':
      return Boolean(content.experience && content.experience.length > 0);
    case 'education':
      return Boolean(content.education && content.education.length > 0);
    case 'projects':
      return Boolean(content.projects && content.projects.length > 0);
    case 'certifications':
      return Boolean(content.certifications && content.certifications.length > 0);
    default:
      return false;
  }
}

function detectAtsIssues(content: ResumeContent): AtsIssue[] {
  const issues: AtsIssue[] = [];
  const elements = content.atsElements;
  if (elements?.tables) {
    issues.push({
      code: 'ATS_TABLE',
      severity: 'high',
      message: 'Tables in a resume are often mis-parsed by ATS parsers. Use plain text instead.',
    });
  }
  if (elements?.images) {
    issues.push({
      code: 'ATS_IMAGE',
      severity: 'high',
      message: 'Text embedded in images is not machine-readable by most ATS systems.',
    });
  }
  if (elements?.textBoxes) {
    issues.push({
      code: 'ATS_TEXTBOX',
      severity: 'medium',
      message: 'Text boxes can lose their reading order when parsed. Use a single column of text.',
    });
  }
  if (elements?.columns) {
    issues.push({
      code: 'ATS_COLUMNS',
      severity: 'medium',
      message: 'Multi-column layouts can be reflowed unpredictably by ATS parsers.',
    });
  }
  return issues;
}

function describeSection(key: string, content: ResumeContent): string | undefined {
  switch (key) {
    case 'summary':
      return content.summary ? `${countWords(content.summary)} words` : undefined;
    case 'skills':
      return content.skills?.length ? `${content.skills.length} skills` : undefined;
    case 'experience':
      return content.experience?.length ? `${content.experience.length} entries` : undefined;
    case 'education':
      return content.education?.length ? `${content.education.length} entries` : undefined;
    case 'projects':
      return content.projects?.length ? `${content.projects.length} entries` : undefined;
    case 'certifications':
      return content.certifications?.length
        ? `${content.certifications.length} entries`
        : undefined;
    default:
      return undefined;
  }
}

/**
 * Pure, deterministic ATS-friendliness score (0-100). No AI involved. Accounts
 * for section presence, ATS-hostile elements, text density, and — when a job
 * description is supplied — keyword overlap. Unit-tested with fixed inputs.
 */
export function computeAtsScore(content: ResumeContent, jobDescription?: string): AtsScoreResult {
  const sectionScores: Record<string, SectionScore> = {};
  const missingSections: string[] = [];
  let sectionPoints = 0;
  const maxSectionPoints = SECTION_WEIGHTS.reduce((sum, section) => sum + section.weight, 0);

  for (const section of SECTION_WEIGHTS) {
    const present = sectionPresent(content, section.key);
    const points = present ? section.weight : 0;
    sectionScores[section.key] = {
      present,
      points,
      maxPoints: section.weight,
      detail: present ? describeSection(section.key, content) : 'Missing section',
    };
    sectionPoints += points;
    if (!present) {
      missingSections.push(section.label);
    }
  }

  const issues = detectAtsIssues(content);
  const issuePenalty = issues.reduce(
    (total, issue) => total + (issue.severity === 'high' ? 8 : issue.severity === 'medium' ? 4 : 2),
    0,
  );

  const totalWords = countWords(collectAllText(content));
  let textDensity: 'sparse' | 'good' | 'dense';
  if (totalWords < DENSITY_THRESHOLDS.sparseWords) {
    textDensity = 'sparse';
  } else if (totalWords > DENSITY_THRESHOLDS.denseWords) {
    textDensity = 'dense';
  } else {
    textDensity = 'good';
  }
  const densityPenalty = textDensity === 'sparse' ? 8 : textDensity === 'dense' ? 3 : 0;
  if (textDensity === 'sparse') {
    issues.push({
      code: 'ATS_SPARSE',
      severity: 'medium',
      message: 'The resume contains very little text; ATS parsers need content to rank on.',
    });
  }
  if (textDensity === 'dense') {
    issues.push({
      code: 'ATS_DENSE',
      severity: 'low',
      message: 'Very long resumes can be truncated by ATS parsers. Aim for 1-2 pages.',
    });
  }

  const sectionScore = Math.round((sectionPoints / maxSectionPoints) * 100);
  const structuralScore = Math.max(0, sectionScore - issuePenalty - densityPenalty);

  let keywordOverlap: KeywordOverlap = { provided: false, matched: [], missing: [], coverage: 0 };
  let keywordScore = 0;
  if (jobDescription && jobDescription.trim().length > 0) {
    const corpus = collectAllText(content);
    const corpusTokens = new Set(extractKeywords(corpus));
    const target = [...new Set(extractKeywords(jobDescription))].filter(
      (token) => token.length >= 3,
    );
    const matched = target.filter((token) => corpusTokens.has(token));
    const missing = target.filter((token) => !corpusTokens.has(token));
    const coverage = target.length === 0 ? 0 : matched.length / target.length;
    keywordOverlap = { provided: true, matched, missing, coverage };
    keywordScore = Math.round(coverage * 20);
  }

  const score = Math.max(0, Math.min(100, structuralScore + keywordScore));

  return {
    score,
    sectionScores,
    missingSections,
    issues,
    textDensity,
    keywordOverlap,
  };
}
