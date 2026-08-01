/**
 * Pure GPA / CGPA calculation. No DB access — operate on plain mark records so
 * the rules are pinned down and independently unit-testable (backlog handling,
 * zero-credit courses, semesters with no marks yet, old/new scheme weights).
 */

export interface SubjectMarkRecord {
  subjectId: string;
  credit: number;
  marksObtained: number;
  maxMarks: number;
  /** Repeated-attempt counter for backlog/back-paper subjects. 1 = first sit. */
  attempt?: number;
}

export interface GradePointBreakdown {
  subjectId: string;
  credit: number;
  percentage: number;
  gradePoint: number;
  passed: boolean;
  attempt: number;
  /** Zero-credit (or otherwise excluded) courses don't weight into the GPA. */
  excluded: boolean;
}

export interface GpaResult {
  gpa: number | null;
  totalCredits: number;
  totalGradePoints: number;
  passedCredits: number;
  attemptedSubjects: number;
  passedSubjects: number;
  breakdown: GradePointBreakdown[];
}

export interface CgpaInput {
  semester: number;
  scheme?: string;
  marks: SubjectMarkRecord[];
}

export interface CgpaResult {
  cgpa: number | null;
  totalCredits: number;
  totalGradePoints: number;
  passedCredits: number;
  attemptedSubjects: number;
  passedSubjects: number;
  breakdown: GradePointBreakdown[];
} /**
 * Standard 10-point Indian engineering grade-point mapping.
 * Percentage is capped at 100 before mapping.
 */
export function gradePointFromPercentage(percentage: number): number {
  const p = Math.min(percentage, 100);
  if (p >= 90) return 10;
  if (p >= 80) return 9;
  if (p >= 70) return 8;
  if (p >= 60) return 7;
  if (p >= 50) return 6;
  if (p >= 40) return 5;
  return 0;
}

export function isPassing(percentage: number): boolean {
  return percentage >= 40;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Aggregate multiple exam rows for the same subject (same subjectId + attempt)
 * into a single weighted percentage. Sums obtained/max across exams.
 */
export function aggregateSubjectMarks(records: SubjectMarkRecord[]): {
  subjectId: string;
  credit: number;
  marksObtained: number;
  maxMarks: number;
  attempt: number;
} {
  const first = records[0];
  const credit = first?.credit ?? 0;
  const attempt = first?.attempt ?? 1;
  const marksObtained = records.reduce((sum, r) => sum + r.marksObtained, 0);
  const maxMarks = records.reduce((sum, r) => sum + r.maxMarks, 0);
  return { subjectId: first?.subjectId ?? '', credit, marksObtained, maxMarks, attempt };
}

/**
 * Compute a GPA from subject mark records (one row per exam; rows for the same
 * subject+attempt are aggregated). Repeated subjects appear as multiple
 * `attempt` values — only the best (highest-percentage) attempt counts.
 */
export function calculateGpa(records: SubjectMarkRecord[]): GpaResult {
  const grouped = new Map<string, SubjectMarkRecord[]>();
  for (const record of records) {
    const key = `${record.subjectId}::${record.attempt ?? 1}`;
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(record);
    } else {
      grouped.set(key, [record]);
    }
  }

  const aggregated = [...grouped.values()].map(aggregateSubjectMarks).filter((s) => s.maxMarks > 0);

  // Backlog handling: for each subjectId keep only the best attempt.
  const bestBySubject = new Map<string, (typeof aggregated)[number]>();
  for (const subject of aggregated) {
    const current = bestBySubject.get(subject.subjectId);
    const subjectPercentage = (subject.marksObtained / subject.maxMarks) * 100;
    const currentPercentage = current ? (current.marksObtained / current.maxMarks) * 100 : -1;
    if (!current || subjectPercentage > currentPercentage) {
      bestBySubject.set(subject.subjectId, subject);
    }
  }

  const breakdown: GradePointBreakdown[] = [...bestBySubject.values()].map((subject) => {
    const percentage = (subject.marksObtained / subject.maxMarks) * 100;
    const gradePoint = gradePointFromPercentage(percentage);
    return {
      subjectId: subject.subjectId,
      credit: subject.credit,
      percentage: round(percentage, 2),
      gradePoint,
      passed: isPassing(percentage),
      attempt: subject.attempt,
      excluded: subject.credit <= 0,
    };
  });

  const weighted = breakdown.filter((b) => !b.excluded);
  const totalCredits = weighted.reduce((sum, b) => sum + b.credit, 0);
  const totalGradePoints = weighted.reduce((sum, b) => sum + b.credit * b.gradePoint, 0);
  const passedCredits = weighted.filter((b) => b.passed).reduce((sum, b) => sum + b.credit, 0);
  const attemptedSubjects = breakdown.length;
  const passedSubjects = breakdown.filter((b) => b.passed).length;

  return {
    gpa: totalCredits > 0 ? round(totalGradePoints / totalCredits, 2) : null,
    totalCredits,
    totalGradePoints: round(totalGradePoints, 2),
    passedCredits,
    attemptedSubjects,
    passedSubjects,
    breakdown,
  };
}

/**
 * Compute a CGPA across semesters. Marks from every semester are aggregated the
 * same way as a single GPA; the per-subject best-attempt rule applies globally,
 * so a cleared back-paper contributes its passing attempt, not the failed one.
 */
export function calculateCgpa(input: CgpaInput[]): CgpaResult {
  const flattened: SubjectMarkRecord[] = [];
  for (const semester of input) {
    for (const mark of semester.marks) {
      flattened.push({
        ...mark,
        attempt: mark.attempt ?? 1,
      });
    }
  }
  const result = calculateGpa(flattened);
  return {
    cgpa: result.gpa,
    totalCredits: result.totalCredits,
    totalGradePoints: result.totalGradePoints,
    passedCredits: result.passedCredits,
    attemptedSubjects: result.attemptedSubjects,
    passedSubjects: result.passedSubjects,
    breakdown: result.breakdown,
  };
}
