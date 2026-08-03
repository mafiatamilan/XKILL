/**
 * Declarative template style, normalized from the `style` JSON stored on a
 * `ResumeTemplate` row. Both exporters map this into their own rendering APIs.
 */

export interface ResumeTemplateStyle {
  fontFamily: string;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  headerLayout: 'sidebar' | 'centered' | 'top';
  sectionRule: boolean;
  headingCase: 'uppercase' | 'title';
  spacing: 'tight' | 'medium' | 'compact';
  twoColumnBody?: boolean;
}

const DEFAULT_STYLE: ResumeTemplateStyle = {
  fontFamily: 'Helvetica',
  accentColor: '#2563EB',
  textColor: '#1F2937',
  mutedColor: '#6B7280',
  headerLayout: 'sidebar',
  sectionRule: true,
  headingCase: 'uppercase',
  spacing: 'medium',
  twoColumnBody: false,
};

export function normalizeTemplateStyle(style: unknown): ResumeTemplateStyle {
  const raw = (style ?? {}) as Record<string, unknown>;
  const headerLayout = raw.headerLayout as ResumeTemplateStyle['headerLayout'];
  const headingCase = raw.headingCase as ResumeTemplateStyle['headingCase'];
  const spacing = raw.spacing as ResumeTemplateStyle['spacing'];
  return {
    fontFamily: typeof raw.fontFamily === 'string' ? raw.fontFamily : DEFAULT_STYLE.fontFamily,
    accentColor: typeof raw.accentColor === 'string' ? raw.accentColor : DEFAULT_STYLE.accentColor,
    textColor: typeof raw.textColor === 'string' ? raw.textColor : DEFAULT_STYLE.textColor,
    mutedColor: typeof raw.mutedColor === 'string' ? raw.mutedColor : DEFAULT_STYLE.mutedColor,
    headerLayout: headerLayout === 'centered' || headerLayout === 'top' ? headerLayout : 'sidebar',
    sectionRule: typeof raw.sectionRule === 'boolean' ? raw.sectionRule : DEFAULT_STYLE.sectionRule,
    headingCase: headingCase === 'title' ? 'title' : 'uppercase',
    spacing: spacing === 'tight' || spacing === 'compact' ? spacing : 'medium',
    twoColumnBody: typeof raw.twoColumnBody === 'boolean' ? raw.twoColumnBody : false,
  };
}

export function toTitleCase(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}
