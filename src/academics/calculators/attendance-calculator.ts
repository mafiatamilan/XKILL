/**
 * Pure attendance-percentage calculation. Given a flat list of attendance
 * records for a subject (or across subjects), compute the attendance percentage.
 * A subject with zero recorded sessions yields `null`, never a division by zero.
 */

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceInput {
  status: AttendanceStatus;
}

/** Statuses that count toward "attended". Late counts as present; excused is neutral. */
const ATTENDED: ReadonlySet<AttendanceStatus> = new Set(['present', 'late']);

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Returns attendance percentage (0-100, rounded to 2dp) for the given records,
 * or `null` when there are no countable sessions yet (avoid divide-by-zero).
 * `excused` records are neutral — excluded from both the numerator and the
 * denominator.
 */
export function calculateAttendancePercentage(records: AttendanceInput[]): number | null {
  const countable = records.filter((r) => r.status !== 'excused');
  if (countable.length === 0) {
    return null;
  }
  const attended = countable.filter((r) => ATTENDED.has(r.status)).length;
  return round((attended / countable.length) * 100, 2);
}

/**
 * Per-subject attendance summary. Keys returned as provided (subjectId).
 */
export function attendanceBySubject(
  records: Array<AttendanceInput & { subjectId: string }>,
): Map<string, number | null> {
  const grouped = new Map<string, AttendanceInput[]>();
  for (const record of records) {
    const bucket = grouped.get(record.subjectId);
    if (bucket) {
      bucket.push(record);
    } else {
      grouped.set(record.subjectId, [record]);
    }
  }
  const result = new Map<string, number | null>();
  for (const [subjectId, list] of grouped) {
    result.set(subjectId, calculateAttendancePercentage(list));
  }
  return result;
}
