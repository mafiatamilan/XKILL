import { calculateGpa, calculateCgpa, gradePointFromPercentage, isPassing } from './gpa-calculator';

describe('gradePointFromPercentage', () => {
  it('maps the 10-point scale boundaries', () => {
    expect(gradePointFromPercentage(90)).toBe(10);
    expect(gradePointFromPercentage(89.9)).toBe(9);
    expect(gradePointFromPercentage(80)).toBe(9);
    expect(gradePointFromPercentage(70)).toBe(8);
    expect(gradePointFromPercentage(60)).toBe(7);
    expect(gradePointFromPercentage(50)).toBe(6);
    expect(gradePointFromPercentage(40)).toBe(5);
    expect(gradePointFromPercentage(39.99)).toBe(0);
  });

  it('caps the percentage at 100', () => {
    expect(gradePointFromPercentage(150)).toBe(10);
  });
});

describe('isPassing', () => {
  it('passes at 40 and above', () => {
    expect(isPassing(40)).toBe(true);
    expect(isPassing(74.5)).toBe(true);
    expect(isPassing(39.99)).toBe(false);
    expect(isPassing(0)).toBe(false);
  });
});

describe('calculateGpa', () => {
  it('computes a simple credit-weighted GPA', () => {
    const result = calculateGpa([
      { subjectId: 'math', credit: 4, marksObtained: 90, maxMarks: 100 },
      { subjectId: 'dsa', credit: 3, marksObtained: 80, maxMarks: 100 },
    ]);
    // math → 10 gp (90%), dsa → 9 gp (80%)
    expect(result.gpa).toBe(9.57); // (10*4 + 9*3)/7 = 67/7 = 9.5714
    expect(result.totalCredits).toBe(7);
    expect(result.passedCredits).toBe(7);
    expect(result.attemptedSubjects).toBe(2);
    expect(result.passedSubjects).toBe(2);
  });

  it('handles a failing subject as grade point 0 (backlog)', () => {
    const result = calculateGpa([
      { subjectId: 'math', credit: 4, marksObtained: 90, maxMarks: 100 },
      { subjectId: 'chem', credit: 3, marksObtained: 20, maxMarks: 100 },
    ]);
    // chem → gp 0
    expect(result.gpa).toBe(round2(40 / 7)); // (10*4 + 0*3)/7 = 5.71
    expect(result.passedSubjects).toBe(1);
    expect(result.passedCredits).toBe(4);
  });

  it('uses the best attempt for a repeated/back-paper subject', () => {
    const result = calculateGpa([
      { subjectId: 'math', credit: 4, marksObtained: 20, maxMarks: 100, attempt: 1 },
      { subjectId: 'math', credit: 4, marksObtained: 85, maxMarks: 100, attempt: 2 },
      { subjectId: 'dsa', credit: 3, marksObtained: 90, maxMarks: 100 },
    ]);
    // best attempt for math = 85% → gp 9; dsa → 10
    expect(result.gpa).toBe(round2((9 * 4 + 10 * 3) / 7)); // (36+30)/7 = 9.43
    expect(result.attemptedSubjects).toBe(2);
    expect(result.passedSubjects).toBe(2);
    expect(result.breakdown.find((b) => b.subjectId === 'math')?.attempt).toBe(2);
  });

  it('excludes zero-credit courses from the weighted GPA but keeps the breakdown', () => {
    const result = calculateGpa([
      { subjectId: 'math', credit: 4, marksObtained: 80, maxMarks: 100 },
      { subjectId: 'workshop', credit: 0, marksObtained: 100, maxMarks: 100 },
    ]);
    // workshop excluded → denominator only math
    expect(result.gpa).toBe(9);
    expect(result.totalCredits).toBe(4);
    expect(result.attemptedSubjects).toBe(2);
    const workshop = result.breakdown.find((b) => b.subjectId === 'workshop');
    expect(workshop?.excluded).toBe(true);
    expect(workshop?.gradePoint).toBe(10);
  });

  it('returns a null GPA when a semester has no marks yet', () => {
    const result = calculateGpa([]);
    expect(result.gpa).toBeNull();
    expect(result.totalCredits).toBe(0);
    expect(result.attemptedSubjects).toBe(0);
  });

  it('returns a null GPA when every subject has zero credits', () => {
    const result = calculateGpa([
      { subjectId: 'ws1', credit: 0, marksObtained: 90, maxMarks: 100 },
    ]);
    expect(result.gpa).toBeNull();
    expect(result.attemptedSubjects).toBe(1);
    expect(result.breakdown[0].excluded).toBe(true);
  });

  it('ignores rows with a zero maxMarks denominator', () => {
    const result = calculateGpa([
      { subjectId: 'math', credit: 4, marksObtained: 0, maxMarks: 0 },
      { subjectId: 'dsa', credit: 3, marksObtained: 90, maxMarks: 100 },
    ]);
    expect(result.attemptedSubjects).toBe(1);
    expect(result.gpa).toBe(10);
  });

  it('aggregates multiple exams for the same subject and attempt', () => {
    const result = calculateGpa([
      { subjectId: 'cs', credit: 4, marksObtained: 30, maxMarks: 50 },
      { subjectId: 'cs', credit: 4, marksObtained: 40, maxMarks: 50 },
    ]);
    // 70/100 = 70% → gp 8
    expect(result.gpa).toBe(8);
    expect(result.breakdown).toHaveLength(1);
  });

  it('handles mixed old/new scheme credit weights', () => {
    // Old scheme: heavier 5-credit; new scheme: lighter 3-credit
    const result = calculateGpa([
      { subjectId: 'os-math', credit: 5, marksObtained: 90, maxMarks: 100 },
      { subjectId: 'ns-dsa', credit: 3, marksObtained: 80, maxMarks: 100 },
    ]);
    expect(result.gpa).toBe(round2((10 * 5 + 9 * 3) / 8));
    expect(result.totalCredits).toBe(8);
  });
});

describe('calculateCgpa', () => {
  it('aggregates across semesters', () => {
    const result = calculateCgpa([
      {
        semester: 1,
        marks: [{ subjectId: 'math', credit: 4, marksObtained: 90, maxMarks: 100 }],
      },
      {
        semester: 2,
        marks: [{ subjectId: 'dsa', credit: 4, marksObtained: 80, maxMarks: 100 }],
      },
    ]);
    expect(result.cgpa).toBe(9.5); // (10*4 + 9*4)/8
    expect(result.attemptedSubjects).toBe(2);
  });

  it('clears a back-paper: best attempt wins across semesters', () => {
    const result = calculateCgpa([
      {
        semester: 2,
        marks: [{ subjectId: 'math', credit: 4, marksObtained: 20, maxMarks: 100, attempt: 1 }],
      },
      {
        semester: 3,
        marks: [{ subjectId: 'math', credit: 4, marksObtained: 85, maxMarks: 100, attempt: 2 }],
      },
    ]);
    expect(result.cgpa).toBe(9);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].attempt).toBe(2);
    expect(result.breakdown[0].passed).toBe(true);
  });

  it('returns null CGPA when there is no data', () => {
    const result = calculateCgpa([]);
    expect(result.cgpa).toBeNull();
  });
});

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
