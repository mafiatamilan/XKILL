import { generateCareerRoadmap } from './career-roadmap';

describe('generateCareerRoadmap', () => {
  const NOW = new Date('2026-08-02T00:00:00Z');

  it('produces 5 phases spanning a default 24-month horizon', () => {
    const roadmap = generateCareerRoadmap({
      targetRole: 'Software Engineer',
      currentSkills: [],
      now: NOW,
    });
    expect(roadmap.totalMonths).toBe(24);
    expect(roadmap.phases).toHaveLength(5);
    expect(roadmap.phases[0].phase).toBe(1);
    expect(roadmap.phases[4].phase).toBe(5);
    expect(roadmap.phases[0].duration).toBe('0-4 months');
    expect(roadmap.phases[4].duration).toContain('24 months');
  });

  it('clamps the horizon to the [3, 48] month range', () => {
    const verySoon = generateCareerRoadmap({
      targetRole: 'Backend Engineer',
      targetDate: new Date('2026-08-20T00:00:00Z'),
      currentSkills: [],
      now: NOW,
    });
    expect(verySoon.totalMonths).toBe(3);

    const farAway = generateCareerRoadmap({
      targetRole: 'Backend Engineer',
      targetDate: new Date('2035-01-01T00:00:00Z'),
      currentSkills: [],
      now: NOW,
    });
    expect(farAway.totalMonths).toBe(48);
  });

  it('anchors phases on the target role skills', () => {
    const roadmap = generateCareerRoadmap({
      targetRole: 'Backend Engineer',
      currentSkills: [],
      now: NOW,
    });
    const focus = roadmap.phases[0].focus;
    expect(focus).toContain('System Design');
    expect(focus).toContain('SQL');
    expect(roadmap.phases[1].milestones.join(' ')).toContain('System Design');
  });

  it('uses core fundamentals when the role skills set is empty', () => {
    const roadmap = generateCareerRoadmap({
      targetRole: '',
      currentSkills: [],
      now: NOW,
    });
    expect(roadmap.phases[0].focus).toEqual(['Core fundamentals']);
  });

  it('scales phase durations to the target date horizon', () => {
    const roadmap = generateCareerRoadmap({
      targetRole: 'Data Scientist',
      targetDate: new Date('2027-02-02T00:00:00Z'),
      currentSkills: ['Python'],
      now: NOW,
    });
    expect(roadmap.totalMonths).toBe(6);
    const finalPhase = roadmap.phases[roadmap.phases.length - 1];
    const endMonth = Number(finalPhase.duration.match(/(\d+) months$/)?.[1]);
    expect(endMonth).toBeGreaterThanOrEqual(roadmap.totalMonths - 1);
    const startMonths = roadmap.phases.map((phase) => Number(phase.duration.split('-')[0]));
    expect(startMonths[0]).toBe(0);
    for (let i = 1; i < startMonths.length; i++) {
      expect(startMonths[i]).toBeGreaterThanOrEqual(startMonths[i - 1]);
    }
  });
});
