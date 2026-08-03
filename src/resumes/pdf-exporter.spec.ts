import { renderResumePdf } from './pdf-exporter';
import type { ResumeContent } from './ats-scorer';

const content: ResumeContent = {
  contact: { fullName: 'Ada Lovelace', email: 'ada@example.com', location: 'London' },
  summary: 'Backend engineer.',
  skills: ['SQL', 'Node.js'],
  experience: [{ role: 'Backend Engineer', company: 'ACME', highlights: ['Built a queue'] }],
};

describe('renderResumePdf', () => {
  it('renders a non-empty PDF buffer with the PDF magic header', async () => {
    const buffer = await renderResumePdf(content, undefined);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('produces a parseable PDF whose text includes the candidate name', async () => {
    const buffer = await renderResumePdf(content, undefined);
    const latin = buffer.toString('latin1');
    expect(latin).toContain('Ada Lovelace');
    expect(latin).toContain('Backend engineer.');
  });

  it('renders different template styles without error', async () => {
    const styles = [
      { headerLayout: 'centered', fontFamily: 'Times-Roman', headingCase: 'uppercase' },
      { headerLayout: 'top', fontFamily: 'Courier', headingCase: 'title', twoColumnBody: true },
      { headerLayout: 'sidebar', sectionRule: false, spacing: 'tight' },
    ];
    for (const style of styles) {
      const buffer = await renderResumePdf(content, style);
      expect(buffer.length).toBeGreaterThan(0);
    }
  });
});
