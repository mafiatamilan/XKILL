import { PrismaClient } from '@prisma/client';

/**
 * Seeded resume templates. Each template carries a declarative `style` object
 * (fonts, colors, layout) that both the PDF and DOCX exporters map into their
 * own rendering APIs. Three visually distinct templates — not one template
 * presented as several.
 */
export interface ResumeTemplateSeed {
  slug: string;
  name: string;
  description: string;
  style: Record<string, unknown>;
}

export const RESUME_TEMPLATES: ResumeTemplateSeed[] = [
  {
    slug: 'modern',
    name: 'Modern',
    description:
      'Clean sans-serif layout with an accent sidebar header, section rules, and generous spacing.',
    style: {
      fontFamily: 'Helvetica',
      accentColor: '#2563EB',
      textColor: '#1F2937',
      mutedColor: '#6B7280',
      headerLayout: 'sidebar', // name on the left, contact stacked on the right
      sectionRule: true,
      headingCase: 'uppercase',
      spacing: 'medium',
    },
  },
  {
    slug: 'classic',
    name: 'Classic',
    description:
      'Traditional serif resume with a centered name, all-caps centered section headings, and a conservative two-line contact block.',
    style: {
      fontFamily: 'Times-Roman',
      accentColor: '#1F2937',
      textColor: '#111827',
      mutedColor: '#4B5563',
      headerLayout: 'centered',
      sectionRule: false,
      headingCase: 'uppercase',
      spacing: 'tight',
    },
  },
  {
    slug: 'technical',
    name: 'Technical',
    description:
      'Compact engineering-focused layout with a two-column body, monospaced headings, and terse bullet-driven sections.',
    style: {
      fontFamily: 'Courier',
      accentColor: '#0F766E',
      textColor: '#0B1220',
      mutedColor: '#475569',
      headerLayout: 'top',
      sectionRule: true,
      headingCase: 'title',
      spacing: 'compact',
      twoColumnBody: true,
    },
  },
];

/**
 * Idempotent seed of the resume templates. Re-running never duplicates rows.
 */
export async function seedResumeTemplates(prisma: PrismaClient): Promise<void> {
  for (const template of RESUME_TEMPLATES) {
    await prisma.resumeTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        isActive: true,
        style: template.style as never,
      },
      create: {
        slug: template.slug,
        name: template.name,
        description: template.description,
        isActive: true,
        style: template.style as never,
      },
    });
  }
}
