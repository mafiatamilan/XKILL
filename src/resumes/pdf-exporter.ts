import * as React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { Style } from '@react-pdf/types';
import { ResumeContent } from './ats-scorer';
import { buildResumeViewModel, ResumeViewModel } from './resume-view-model';
import { normalizeTemplateStyle, ResumeTemplateStyle, toTitleCase } from './template-style';

export class ResumeExportError extends Error {
  constructor(
    message: string,
    readonly code = 'EXPORT_FAILED',
  ) {
    super(message);
    this.name = 'ResumeExportError';
  }
}

function headingText(style: ResumeTemplateStyle, title: string): string {
  return style.headingCase === 'title' ? toTitleCase(title) : title.toUpperCase();
}

function buildStyles(template: ResumeTemplateStyle) {
  const fontSize = template.spacing === 'compact' ? 8 : template.spacing === 'tight' ? 9 : 10;
  return StyleSheet.create({
    page: {
      padding: 36,
      fontFamily: template.fontFamily,
      color: template.textColor,
      fontSize,
      lineHeight: 1.35,
    },
    name: {
      fontSize: 22,
      color: template.accentColor,
      marginBottom: 4,
    },
    tagline: {
      fontSize: fontSize - 1,
      color: template.mutedColor,
      marginBottom: 12,
    },
    summary: {
      marginBottom: 12,
      fontSize: fontSize,
    },
    section: {
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: fontSize + 2,
      color: template.accentColor,
      marginBottom: 4,
      borderBottom: template.sectionRule ? '0.5pt solid #D1D5DB' : 'none',
      paddingBottom: template.sectionRule ? 2 : 0,
    },
    line: {
      fontSize: fontSize,
      marginBottom: 1,
    },
    bullet: {
      fontSize: fontSize,
      marginLeft: 8,
      marginBottom: 1,
    },
    twoColumn: {
      flexDirection: 'row',
    },
    leftColumn: {
      flex: 1,
      paddingRight: 8,
    },
    rightColumn: {
      flex: 1,
      paddingLeft: 8,
    },
  });
}

function renderSection(
  view: ResumeViewModel,
  styles: Record<string, Style>,
  template: ResumeTemplateStyle,
) {
  const style = styles;
  return view.sections.map((section) => {
    const bullets = section.bullets.map((bullet) =>
      React.createElement(Text, { key: bullet, style: style.bullet }, `• ${bullet}`),
    );
    const lines = section.lines.map((line) => {
      const [first, ...rest] = line.split('\n');
      return React.createElement(
        Text,
        { key: first, style: style.line },
        first,
        rest.length > 0
          ? React.createElement(
              View,
              null,
              rest.map((part) =>
                React.createElement(Text, { key: part, style: style.bullet }, part),
              ),
            )
          : null,
      );
    });
    return React.createElement(
      View,
      { key: section.title, style: style.section },
      React.createElement(
        Text,
        { style: style.sectionTitle },
        headingText(template, section.title),
      ),
      ...bullets,
      ...lines,
    );
  });
}

export async function renderResumePdf(
  content: ResumeContent,
  rawTemplateStyle: unknown,
): Promise<Buffer> {
  const template = normalizeTemplateStyle(rawTemplateStyle);
  const view = buildResumeViewModel(content, template);
  const styles = buildStyles(template) as Record<string, Style>;

  const summary = view.summary
    ? React.createElement(Text, { style: styles.summary }, view.summary)
    : null;

  const heading: React.ReactElement[] = [];
  if (template.headerLayout === 'centered') {
    heading.push(
      React.createElement(
        Text,
        { key: 'name', style: { ...styles.name, textAlign: 'center' } },
        view.fullName,
      ),
    );
    heading.push(
      React.createElement(
        Text,
        { key: 'tagline', style: { ...styles.tagline, textAlign: 'center' } },
        view.tagline,
      ),
    );
  } else if (template.headerLayout === 'top') {
    heading.push(React.createElement(Text, { key: 'name', style: styles.name }, view.fullName));
    heading.push(
      React.createElement(Text, { key: 'tagline', style: styles.tagline }, view.tagline),
    );
  } else {
    heading.push(
      React.createElement(
        View,
        { key: 'header', style: { flexDirection: 'row', marginBottom: 12 } },
        React.createElement(
          View,
          { style: { flex: 1 } },
          React.createElement(Text, { style: styles.name }, view.fullName),
        ),
        React.createElement(
          View,
          { style: { flex: 1, alignItems: 'flex-end' } },
          view.contact.map((line) =>
            React.createElement(
              Text,
              { key: line, style: { ...styles.tagline, textAlign: 'right' } },
              line,
            ),
          ),
        ),
      ),
    );
  }

  const element = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      ...heading,
      summary,
      ...renderSection(view, styles, template),
    ),
  );

  try {
    const buffer = await renderToBuffer(element);
    if (!buffer || buffer.length === 0) {
      throw new ResumeExportError('PDF renderer returned an empty document');
    }
    return Buffer.from(buffer);
  } catch (err) {
    throw new ResumeExportError(err instanceof Error ? err.message : 'PDF rendering failed');
  }
}
