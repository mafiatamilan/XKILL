package academic

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound      = errors.New("resource not found")
	ErrForbidden     = errors.New("forbidden")
)

type Repository interface {
	GetStudentIDByUserID(ctx context.Context, userID string) (string, error)
	GetFacultyIDByUserID(ctx context.Context, userID string) (string, error)
	GetEnrolledStudents(ctx context.Context, subjectID string) ([]string, error)
	GetLinkedStudents(ctx context.Context, parentUserID string) ([]string, error)

	ListSubjects(ctx context.Context, collegeID, departmentID, semesterID string) ([]Subject, error)
	GetSubject(ctx context.Context, id string) (*Subject, error)
	CreateSubject(ctx context.Context, subject *Subject) error
	GetEnrolledSubjects(ctx context.Context, studentID, semesterID string) ([]Subject, error)
	ListExams(ctx context.Context, subjectID string) ([]Exam, error)
	CreateExam(ctx context.Context, exam *Exam) error
	ListAssignments(ctx context.Context, subjectID string) ([]Assignment, error)
	CreateAssignment(ctx context.Context, assignment *Assignment) error
	GetAttendance(ctx context.Context, studentID, subjectID string) ([]AttendanceRecord, error)
	BulkMarkAttendance(ctx context.Context, records []AttendanceRecord) error
	GetAttendanceSummary(ctx context.Context, studentID, subjectID string) (present int, total int, err error)
	GetTimetable(ctx context.Context, departmentID string) ([]TimetableSlot, error)
	GetInternalMarks(ctx context.Context, studentID, subjectID string) ([]InternalMark, error)
	UpsertInternalMark(ctx context.Context, mark *InternalMark) error
	GetGradebook(ctx context.Context, studentID, semesterID string) ([]GradebookEntry, error)
	UpsertGradebookEntry(ctx context.Context, entry *GradebookEntry) error
	CalculateGPA(ctx context.Context, studentID, semesterID string) (*GPAResponse, error)
	GetSemester(ctx context.Context, id string) (*Semester, error)
	ListSemesters(ctx context.Context, collegeID, departmentID string) ([]string, error)
}

type postgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

const subjectColumns = `id, college_id, department_id, semester_id, name, code, credits, subject_type, is_lab, max_marks, passing_marks, faculty_id, faculty_name, is_active`
const examColumns = `id, subject_id, title, exam_type, max_marks, weightage, scheduled_at, duration_minutes, is_published`
const assignmentColumns = `id, subject_id, title, description, max_marks, deadline, is_published`
const attendanceColumns = `id, subject_id, student_id, date, is_present`
const timetableColumns = `id, subject_id, day_of_week, start_time, end_time, room`
const internalMarkColumns = `id, subject_id, student_id, exam_id, marks_obtained, max_marks, remarks`
const gradebookColumns = `id, student_id, subject_id, total_marks, grade, grade_point, credits, is_passed`
const semesterColumns = `id, name, start_date, end_date, college_id, department_id, is_active`

func (r *postgresRepository) GetStudentIDByUserID(ctx context.Context, userID string) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx,
		`SELECT id FROM student_profiles WHERE user_id = $1`, userID,
	).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return id, nil
}

func (r *postgresRepository) GetFacultyIDByUserID(ctx context.Context, userID string) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx,
		`SELECT id FROM faculty_profiles WHERE user_id = $1`, userID,
	).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return id, nil
}

func (r *postgresRepository) GetEnrolledStudents(ctx context.Context, subjectID string) ([]string, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT student_id FROM subject_enrollments WHERE subject_id = $1`, subjectID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *postgresRepository) GetLinkedStudents(ctx context.Context, parentUserID string) ([]string, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT sp.id FROM student_profiles sp
		 INNER JOIN parent_child_links pcl ON pcl.student_user_id = sp.user_id
		 WHERE pcl.parent_user_id = $1`, parentUserID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *postgresRepository) ListSubjects(ctx context.Context, collegeID, departmentID, semesterID string) ([]Subject, error) {
	query := `SELECT ` + subjectColumns + ` FROM subjects WHERE college_id = $1`
	args := []interface{}{collegeID}
	argIdx := 2

	if departmentID != "" {
		query += fmt.Sprintf(" AND department_id = $%d", argIdx)
		args = append(args, departmentID)
		argIdx++
	}
	if semesterID != "" {
		query += fmt.Sprintf(" AND semester_id = $%d", argIdx)
		args = append(args, semesterID)
	}

	rows, err := r.pool.Query(ctx, query+" ORDER BY code", args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSubjects(rows)
}

func (r *postgresRepository) GetSubject(ctx context.Context, id string) (*Subject, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+subjectColumns+` FROM subjects WHERE id = $1`, id,
	)
	return scanSubject(row)
}

func (r *postgresRepository) CreateSubject(ctx context.Context, subject *Subject) error {
	subject.ID = uuid.New().String()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO subjects (`+subjectColumns+`) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
		subject.ID, subject.CollegeID, subject.DepartmentID, subject.SemesterID,
		subject.Name, subject.Code, subject.Credits, subject.SubjectType,
		subject.IsLab, subject.MaxMarks, subject.PassingMarks,
		subject.FacultyID, subject.FacultyName, subject.IsActive,
	)
	return err
}

func (r *postgresRepository) GetEnrolledSubjects(ctx context.Context, studentID, semesterID string) ([]Subject, error) {
	query := `SELECT s.` + subjectColumns + ` FROM subjects s
		INNER JOIN subject_enrollments e ON e.subject_id = s.id
		WHERE e.student_id = $1`
	args := []interface{}{studentID}
	if semesterID != "" {
		query += " AND s.semester_id = $2"
		args = append(args, semesterID)
	}
	rows, err := r.pool.Query(ctx, query+" ORDER BY s.code", args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanSubjects(rows)
}

func (r *postgresRepository) ListExams(ctx context.Context, subjectID string) ([]Exam, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+examColumns+` FROM exams WHERE subject_id = $1 ORDER BY scheduled_at`, subjectID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanExams(rows)
}

func (r *postgresRepository) CreateExam(ctx context.Context, exam *Exam) error {
	exam.ID = uuid.New().String()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO exams (`+examColumns+`) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		exam.ID, exam.SubjectID, exam.Title, exam.ExamType, exam.MaxMarks,
		exam.Weightage, exam.ScheduledAt, exam.DurationMinutes, exam.IsPublished,
	)
	return err
}

func (r *postgresRepository) ListAssignments(ctx context.Context, subjectID string) ([]Assignment, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+assignmentColumns+` FROM assignments WHERE subject_id = $1 ORDER BY deadline`, subjectID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAssignments(rows)
}

func (r *postgresRepository) CreateAssignment(ctx context.Context, assignment *Assignment) error {
	assignment.ID = uuid.New().String()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO assignments (`+assignmentColumns+`) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		assignment.ID, assignment.SubjectID, assignment.Title, assignment.Description,
		assignment.MaxMarks, assignment.Deadline, assignment.IsPublished,
	)
	return err
}

func (r *postgresRepository) GetAttendance(ctx context.Context, studentID, subjectID string) ([]AttendanceRecord, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+attendanceColumns+` FROM attendance_records
		 WHERE student_id = $1 AND subject_id = $2 ORDER BY date DESC`, studentID, subjectID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanAttendanceRecords(rows)
}

func (r *postgresRepository) BulkMarkAttendance(ctx context.Context, records []AttendanceRecord) error {
	if len(records) == 0 {
		return nil
	}
	batch := &pgx.Batch{}
	for _, rec := range records {
		rec.ID = uuid.New().String()
		batch.Queue(
			`INSERT INTO attendance_records (`+attendanceColumns+`) VALUES ($1,$2,$3,$4,$5)
			 ON CONFLICT (subject_id, student_id, date) DO UPDATE SET is_present = $5`,
			rec.ID, rec.SubjectID, rec.StudentID, rec.Date, rec.IsPresent,
		)
	}
	br := r.pool.SendBatch(ctx, batch)
	defer br.Close()
	for range records {
		if _, err := br.Exec(); err != nil {
			return err
		}
	}
	return nil
}

func (r *postgresRepository) GetAttendanceSummary(ctx context.Context, studentID, subjectID string) (int, int, error) {
	var present, total int
	err := r.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(CASE WHEN is_present THEN 1 ELSE 0 END), 0),
		        COUNT(*)
		 FROM attendance_records
		 WHERE student_id = $1 AND subject_id = $2`, studentID, subjectID,
	).Scan(&present, &total)
	if err != nil {
		return 0, 0, err
	}
	return present, total, nil
}

func (r *postgresRepository) GetTimetable(ctx context.Context, departmentID string) ([]TimetableSlot, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+timetableColumns+` FROM timetable_slots
		 WHERE subject_id IN (SELECT id FROM subjects WHERE department_id = $1)
		 ORDER BY day_of_week, start_time`, departmentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTimetableSlots(rows)
}

func (r *postgresRepository) GetInternalMarks(ctx context.Context, studentID, subjectID string) ([]InternalMark, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+internalMarkColumns+` FROM internal_marks
		 WHERE student_id = $1 AND subject_id = $2 ORDER BY exam_id`, studentID, subjectID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanInternalMarks(rows)
}

func (r *postgresRepository) UpsertInternalMark(ctx context.Context, mark *InternalMark) error {
	mark.ID = uuid.New().String()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO internal_marks (`+internalMarkColumns+`) VALUES ($1,$2,$3,$4,$5,$6,$7)
		 ON CONFLICT (subject_id, student_id, COALESCE(exam_id, '')) DO UPDATE
		 SET marks_obtained = $5, max_marks = $6, remarks = $7`,
		mark.ID, mark.SubjectID, mark.StudentID, mark.ExamID,
		mark.MarksObtained, mark.MaxMarks, mark.Remarks,
	)
	return err
}

func (r *postgresRepository) GetGradebook(ctx context.Context, studentID, semesterID string) ([]GradebookEntry, error) {
	query := `SELECT g.` + gradebookColumns + ` FROM gradebook g
		INNER JOIN subjects s ON s.id = g.subject_id`
	args := []interface{}{studentID}
	argIdx := 2

	if semesterID != "" {
		query += fmt.Sprintf(" WHERE g.student_id = $1 AND s.semester_id = $%d", argIdx)
		args = append(args, semesterID)
	} else {
		query += " WHERE g.student_id = $1"
	}

	rows, err := r.pool.Query(ctx, query+" ORDER BY s.code", args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanGradebookEntries(rows)
}

func (r *postgresRepository) UpsertGradebookEntry(ctx context.Context, entry *GradebookEntry) error {
	entry.ID = uuid.New().String()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO gradebook (`+gradebookColumns+`) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		 ON CONFLICT (student_id, subject_id) DO UPDATE
		 SET total_marks = $4, grade = $5, grade_point = $6, credits = $7, is_passed = $8`,
		entry.ID, entry.StudentID, entry.SubjectID, entry.TotalMarks,
		entry.Grade, entry.GradePoint, entry.Credits, entry.IsPassed,
	)
	return err
}

func (r *postgresRepository) CalculateGPA(ctx context.Context, studentID, semesterID string) (*GPAResponse, error) {
	semester, err := r.GetSemester(ctx, semesterID)
	if err != nil {
		return nil, err
	}

	entries, err := r.GetGradebook(ctx, studentID, semesterID)
	if err != nil {
		return nil, err
	}

	resp := &GPAResponse{
		SemesterName: semester.Name,
		Subjects:     entries,
	}

	var totalGradePoints float64
	var totalCredits int
	var earnedCredits int

	for _, e := range entries {
		totalGradePoints += e.GradePoint * float64(e.Credits)
		totalCredits += e.Credits
		if e.IsPassed {
			earnedCredits += e.Credits
		}
	}
	resp.TotalCredits = totalCredits
	resp.EarnedCredits = earnedCredits
	if totalCredits > 0 {
		resp.SGPA = totalGradePoints / float64(totalCredits)
	}

	allEntries, err := r.GetGradebook(ctx, studentID, "")
	if err != nil {
		return nil, err
	}
	var cgpaTotalPoints float64
	var cgpaTotalCredits int
	for _, e := range allEntries {
		cgpaTotalPoints += e.GradePoint * float64(e.Credits)
		cgpaTotalCredits += e.Credits
	}
	if cgpaTotalCredits > 0 {
		resp.CGPA = cgpaTotalPoints / float64(cgpaTotalCredits)
	}

	return resp, nil
}

func (r *postgresRepository) GetSemester(ctx context.Context, id string) (*Semester, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+semesterColumns+` FROM semesters WHERE id = $1`, id,
	)
	return scanSemester(row)
}

func (r *postgresRepository) ListSemesters(ctx context.Context, collegeID, departmentID string) ([]string, error) {
	query := `SELECT DISTINCT s.name FROM semesters s WHERE s.college_id = $1`
	args := []interface{}{collegeID}
	if departmentID != "" {
		query += " AND s.department_id = $2"
		args = append(args, departmentID)
	}
	rows, err := r.pool.Query(ctx, query+" ORDER BY s.start_date DESC", args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		names = append(names, name)
	}
	return names, rows.Err()
}

func scanSubject(row pgx.Row) (*Subject, error) {
	s := &Subject{}
	err := row.Scan(&s.ID, &s.CollegeID, &s.DepartmentID, &s.SemesterID,
		&s.Name, &s.Code, &s.Credits, &s.SubjectType, &s.IsLab,
		&s.MaxMarks, &s.PassingMarks, &s.FacultyID, &s.FacultyName, &s.IsActive)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

func scanSubjects(rows pgx.Rows) ([]Subject, error) {
	var subjects []Subject
	for rows.Next() {
		s, err := scanSubject(rows)
		if err != nil {
			return nil, err
		}
		subjects = append(subjects, *s)
	}
	return subjects, rows.Err()
}

func scanExam(row pgx.Row) (*Exam, error) {
	e := &Exam{}
	err := row.Scan(&e.ID, &e.SubjectID, &e.Title, &e.ExamType, &e.MaxMarks,
		&e.Weightage, &e.ScheduledAt, &e.DurationMinutes, &e.IsPublished)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return e, nil
}

func scanExams(rows pgx.Rows) ([]Exam, error) {
	var exams []Exam
	for rows.Next() {
		e, err := scanExam(rows)
		if err != nil {
			return nil, err
		}
		exams = append(exams, *e)
	}
	return exams, rows.Err()
}

func scanAssignment(row pgx.Row) (*Assignment, error) {
	a := &Assignment{}
	err := row.Scan(&a.ID, &a.SubjectID, &a.Title, &a.Description, &a.MaxMarks, &a.Deadline, &a.IsPublished)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

func scanAssignments(rows pgx.Rows) ([]Assignment, error) {
	var assignments []Assignment
	for rows.Next() {
		a, err := scanAssignment(rows)
		if err != nil {
			return nil, err
		}
		assignments = append(assignments, *a)
	}
	return assignments, rows.Err()
}

func scanAttendanceRecord(row pgx.Row) (*AttendanceRecord, error) {
	a := &AttendanceRecord{}
	err := row.Scan(&a.ID, &a.SubjectID, &a.StudentID, &a.Date, &a.IsPresent)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return a, nil
}

func scanAttendanceRecords(rows pgx.Rows) ([]AttendanceRecord, error) {
	var records []AttendanceRecord
	for rows.Next() {
		a, err := scanAttendanceRecord(rows)
		if err != nil {
			return nil, err
		}
		records = append(records, *a)
	}
	return records, rows.Err()
}

func scanTimetableSlot(row pgx.Row) (*TimetableSlot, error) {
	t := &TimetableSlot{}
	err := row.Scan(&t.ID, &t.SubjectID, &t.DayOfWeek, &t.StartTime, &t.EndTime, &t.Room)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return t, nil
}

func scanTimetableSlots(rows pgx.Rows) ([]TimetableSlot, error) {
	var slots []TimetableSlot
	for rows.Next() {
		t, err := scanTimetableSlot(rows)
		if err != nil {
			return nil, err
		}
		slots = append(slots, *t)
	}
	return slots, rows.Err()
}

func scanInternalMark(row pgx.Row) (*InternalMark, error) {
	m := &InternalMark{}
	err := row.Scan(&m.ID, &m.SubjectID, &m.StudentID, &m.ExamID, &m.MarksObtained, &m.MaxMarks, &m.Remarks)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return m, nil
}

func scanInternalMarks(rows pgx.Rows) ([]InternalMark, error) {
	var marks []InternalMark
	for rows.Next() {
		m, err := scanInternalMark(rows)
		if err != nil {
			return nil, err
		}
		marks = append(marks, *m)
	}
	return marks, rows.Err()
}

func scanGradebookEntry(row pgx.Row) (*GradebookEntry, error) {
	g := &GradebookEntry{}
	err := row.Scan(&g.ID, &g.StudentID, &g.SubjectID, &g.TotalMarks, &g.Grade, &g.GradePoint, &g.Credits, &g.IsPassed)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return g, nil
}

func scanGradebookEntries(rows pgx.Rows) ([]GradebookEntry, error) {
	var entries []GradebookEntry
	for rows.Next() {
		g, err := scanGradebookEntry(rows)
		if err != nil {
			return nil, err
		}
		entries = append(entries, *g)
	}
	return entries, rows.Err()
}

func scanSemester(row pgx.Row) (*Semester, error) {
	s := &Semester{}
	err := row.Scan(&s.ID, &s.Name, &s.StartDate, &s.EndDate, &s.CollegeID, &s.DepartmentID, &s.IsActive)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

var _ = time.Now
