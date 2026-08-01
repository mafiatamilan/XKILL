import { attendanceBySubject, calculateAttendancePercentage } from './attendance-calculator';

describe('calculateAttendancePercentage', () => {
  it('returns 100% when every session is attended', () => {
    expect(calculateAttendancePercentage([{ status: 'present' }, { status: 'present' }])).toBe(100);
  });

  it('returns null for a subject with zero recorded sessions', () => {
    expect(calculateAttendancePercentage([])).toBeNull();
  });

  it('computes a partial percentage rounded to 2dp', () => {
    // 3 of 7 attended → 42.857... → 42.86
    expect(
      calculateAttendancePercentage([
        { status: 'present' },
        { status: 'present' },
        { status: 'present' },
        { status: 'absent' },
        { status: 'absent' },
        { status: 'absent' },
        { status: 'absent' },
      ]),
    ).toBe(42.86);
  });

  it('treats late as attended', () => {
    expect(
      calculateAttendancePercentage([
        { status: 'present' },
        { status: 'late' },
        { status: 'absent' },
      ]),
    ).toBe(round2(200 / 3));
  });

  it('treats excused as neutral (not attended, not counted against)', () => {
    expect(
      calculateAttendancePercentage([
        { status: 'present' },
        { status: 'excused' },
        { status: 'absent' },
      ]),
    ).toBe(50);
  });
});

describe('attendanceBySubject', () => {
  it('groups records by subject', () => {
    const result = attendanceBySubject([
      { subjectId: 'math', status: 'present' },
      { subjectId: 'math', status: 'absent' },
      { subjectId: 'dsa', status: 'present' },
    ]);
    expect(result.get('math')).toBe(50);
    expect(result.get('dsa')).toBe(100);
  });

  it('returns null for a subject with no sessions', () => {
    const result = attendanceBySubject([]);
    expect(result.size).toBe(0);
  });
});

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
