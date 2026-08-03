import JSZip from 'jszip';
import { renderResumeDocx } from './docx-exporter';
import type { ResumeContent } from './ats-scorer';

const content: ResumeContent = {
  contact: { fullName: 'Ada Lovelace', email: 'ada@example.com', location: 'London' },
  summary: 'Backend engineer.',
  skills: ['SQL', 'Node.js'],
  experience: [{ role: 'Backend Engineer', company: 'ACME', highlights: ['Built a queue'] }],
};

describe('renderResumeDocx', () => {
  it('renders a non-empty DOCX buffer with the zip magic header', async () => {
    const buffer = await renderResumeDocx(content, undefined);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.slice(0, 2).toString()).toBe('PK');
  });

  it('produces a valid OOXML document whose text includes the candidate name', async () => {
    const buffer = await renderResumeDocx(content, undefined);
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('word/document.xml')).toBeTruthy();
    const documentXml = await zip.file('word/document.xml')!.async('string');
    expect(documentXml).toContain('Ada Lovelace');
  });

  it('renders different template styles without error', async () => {
    const styles = [
      { headerLayout: 'centered', fontFamily: 'Times-Roman', headingCase: 'uppercase' },
      { headerLayout: 'top', fontFamily: 'Courier', headingCase: 'title', twoColumnBody: true },
      { headerLayout: 'sidebar', sectionRule: false, spacing: 'tight' },
    ];
    for (const style of styles) {
      const buffer = await renderResumeDocx(content, style);
      expect(buffer.length).toBeGreaterThan(0);
    }
  });
});
