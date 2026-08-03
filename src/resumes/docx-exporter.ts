import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { ResumeContent } from './ats-scorer';
import { buildResumeViewModel } from './resume-view-model';
import { normalizeTemplateStyle, ResumeTemplateStyle, toTitleCase } from './template-style';
import { ResumeExportError } from './pdf-exporter';

function headingText(style: ResumeTemplateStyle, title: string): string {
  return style.headingCase === 'title' ? toTitleCase(title) : title.toUpperCase();
}

function headingColor(style: ResumeTemplateStyle): string {
  return style.accentColor.replace(/^#/, '');
}

function headingAlignment(
  style: ResumeTemplateStyle,
): (typeof AlignmentType)[keyof typeof AlignmentType] {
  return style.headerLayout === 'centered' ? AlignmentType.CENTER : AlignmentType.LEFT;
}

export async function renderResumeDocx(
  content: ResumeContent,
  rawTemplateStyle: unknown,
): Promise<Buffer> {
  const template = normalizeTemplateStyle(rawTemplateStyle);
  const view = buildResumeViewModel(content, template);
  const color = headingColor(template);
  const align = headingAlignment(template);

  const children: Paragraph[] = [];

  const nameRun = new TextRun({
    text: view.fullName,
    bold: true,
    size: 44,
    color,
    font: template.fontFamily,
  });
  children.push(new Paragraph({ children: [nameRun], alignment: align, spacing: { after: 80 } }));

  if (view.tagline) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: view.tagline, size: 20, color: template.mutedColor })],
        alignment: align,
        spacing: { after: 160 },
      }),
    );
  } else if (view.contact.length > 0) {
    children.push(
      new Paragraph({
        children: view.contact.map(
          (line) => new TextRun({ text: line, size: 18, color: template.mutedColor }),
        ),
        alignment: align,
        spacing: { after: 160 },
      }),
    );
  }

  if (view.summary) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: view.summary, size: 20 })],
        spacing: { after: 160 },
      }),
    );
  }

  for (const section of view.sections) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: headingText(template, section.title),
            bold: true,
            size: 24,
            color,
            allCaps: template.headingCase === 'uppercase',
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 160, after: 80 },
        border: template.sectionRule
          ? {
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
            }
          : undefined,
      }),
    );

    for (const bullet of section.bullets) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${bullet}`, size: 20 })],
          indent: { left: 480 },
          spacing: { after: 60 },
        }),
      );
    }

    for (const line of section.lines) {
      const [first, ...rest] = line.split('\n');
      children.push(
        new Paragraph({
          children: [new TextRun({ text: first, size: 20 })],
          spacing: { after: 40 },
        }),
      );
      for (const part of rest) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: part, size: 20 })],
            indent: { left: 480 },
            spacing: { after: 40 },
          }),
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  try {
    const buffer = await Packer.toBuffer(doc);
    if (!buffer || buffer.length === 0) {
      throw new ResumeExportError('DOCX renderer returned an empty document');
    }
    return Buffer.from(buffer);
  } catch (err) {
    if (err instanceof ResumeExportError) {
      throw err;
    }
    throw new ResumeExportError(err instanceof Error ? err.message : 'DOCX rendering failed');
  }
}
