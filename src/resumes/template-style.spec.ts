import { normalizeTemplateStyle, toTitleCase } from './template-style';

describe('normalizeTemplateStyle', () => {
  it('returns defaults for an empty/unknown style', () => {
    const style = normalizeTemplateStyle(undefined);
    expect(style.fontFamily).toBe('Helvetica');
    expect(style.accentColor).toBe('#2563EB');
    expect(style.headerLayout).toBe('sidebar');
    expect(style.headingCase).toBe('uppercase');
    expect(style.sectionRule).toBe(true);
  });

  it('preserves valid explicit values', () => {
    const style = normalizeTemplateStyle({
      fontFamily: 'Courier',
      accentColor: '#0F766E',
      textColor: '#0B1220',
      mutedColor: '#475569',
      headerLayout: 'top',
      sectionRule: false,
      headingCase: 'title',
      spacing: 'compact',
      twoColumnBody: true,
    });
    expect(style).toMatchObject({
      fontFamily: 'Courier',
      accentColor: '#0F766E',
      headerLayout: 'top',
      sectionRule: false,
      headingCase: 'title',
      spacing: 'compact',
      twoColumnBody: true,
    });
  });

  it('falls back for invalid enum values', () => {
    const style = normalizeTemplateStyle({
      headerLayout: 'diagonal',
      headingCase: 'screaming',
      spacing: 'huge',
    });
    expect(style.headerLayout).toBe('sidebar');
    expect(style.headingCase).toBe('uppercase');
    expect(style.spacing).toBe('medium');
  });

  it('accepts centered header layout', () => {
    expect(normalizeTemplateStyle({ headerLayout: 'centered' }).headerLayout).toBe('centered');
  });
});

describe('toTitleCase', () => {
  it('capitalizes the first letter of each word', () => {
    expect(toTitleCase('projects and experience')).toBe('Projects And Experience');
  });
});
