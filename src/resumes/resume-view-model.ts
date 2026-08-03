import { ResumeContent } from './ats-scorer';
import { ResumeTemplateStyle } from './template-style';

export interface ExportSection {
  title: string;
  bullets: string[];
  lines: string[];
}

export interface ResumeViewModel {
  fullName: string;
  tagline: string;
  contact: string[];
  summary: string;
  sections: ExportSection[];
}

export const EMPTY_NAME = 'Your Name';

export function buildResumeViewModel(
  content: ResumeContent,
  _template: ResumeTemplateStyle,
): ResumeViewModel {
  const contact = content.contact ?? {};
  const contactLines: string[] = [];
  if (contact.email) {
    contactLines.push(contact.email);
  }
  if (contact.phone) {
    contactLines.push(contact.phone);
  }
  if (contact.location) {
    contactLines.push(contact.location);
  }
  if (contact.linkedin) {
    contactLines.push(contact.linkedin);
  }
  if (contact.github) {
    contactLines.push(contact.github);
  }
  if (contact.website) {
    contactLines.push(contact.website);
  }

  const sections: ExportSection[] = [];

  if (content.skills && content.skills.length > 0) {
    sections.push({
      title: 'Skills',
      bullets: content.skills,
      lines: [],
    });
  }

  if (content.experience && content.experience.length > 0) {
    sections.push({
      title: 'Experience',
      bullets: [],
      lines: content.experience.map((item) => {
        const header = [item.role, item.company, item.location].filter(Boolean).join(' · ');
        const dates = [item.startDate, item.endDate].filter(Boolean).join(' – ');
        const bullets = item.highlights?.map((highlight) => `• ${highlight}`) ?? [];
        return [header, dates, ...bullets].filter(Boolean).join('\n');
      }),
    });
  }

  if (content.projects && content.projects.length > 0) {
    sections.push({
      title: 'Projects',
      bullets: [],
      lines: content.projects.map((item) => {
        const header = [item.name, item.link].filter(Boolean).join(' · ');
        const bullets = item.highlights?.map((highlight) => `• ${highlight}`) ?? [];
        return [header, item.description, ...bullets].filter(Boolean).join('\n');
      }),
    });
  }

  if (content.education && content.education.length > 0) {
    sections.push({
      title: 'Education',
      bullets: [],
      lines: content.education.map((item) => {
        const header = [item.degree, item.institution].filter(Boolean).join(' · ');
        const gpa = item.gpa ? `GPA: ${item.gpa}` : undefined;
        const dates = [item.startDate, item.endDate].filter(Boolean).join(' – ');
        return [header, gpa, dates].filter(Boolean).join('\n');
      }),
    });
  }

  if (content.certifications && content.certifications.length > 0) {
    sections.push({
      title: 'Certifications',
      bullets: [],
      lines: content.certifications.map((item) =>
        [item.name, item.issuer, item.year].filter(Boolean).join(' — '),
      ),
    });
  }

  const tagline = [contact.email, contact.phone, contact.location].filter(Boolean).join(' | ');

  return {
    fullName: contact.fullName || EMPTY_NAME,
    tagline,
    contact: contactLines,
    summary: content.summary ?? '',
    sections,
  };
}
