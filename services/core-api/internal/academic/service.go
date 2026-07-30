package academic

import (
	"context"
	"math"
)

type Service interface {
	GetSubjects(ctx context.Context, collegeID, departmentID, semesterID string) ([]Subject, error)
	GetMySubjects(ctx context.Context, userID, semesterID string) ([]Subject, error)
	GetFacultySubjects(ctx context.Context, facultyID string) ([]Subject, error)
	CreateSubject(ctx context.Context, subject *Subject) error
	GetEnrolledStudents(ctx context.Context, subjectID string) ([]string, error)
	GetLinkedStudents(ctx context.Context, parentUserID string) ([]string, error)
	ResolveStudentID(ctx context.Context, userID string) (string, error)
	ListExams(ctx context.Context, subjectID string) ([]Exam, error)
	CreateExam(ctx context.Context, facultyID string, req CreateExamRequest) (*Exam, error)
	ListAssignments(ctx context.Context, subjectID string) ([]Assignment, error)
	CreateAssignment(ctx context.Context, facultyID string, req CreateAssignmentRequest) (*Assignment, error)
	GetAttendance(ctx context.Context, studentID, subjectID string) ([]AttendanceRecord, error)
	MarkAttendance(ctx context.Context, facultyID string, req MarkAttendanceRequest) error
	GetAttendanceSummary(ctx context.Context, studentID, subjectID string) (int, int, error)
	GetTimetable(ctx context.Context, departmentID string) ([]TimetableSlot, error)
	GetMarks(ctx context.Context, studentID, subjectID string) ([]InternalMark, error)
	EnterMarks(ctx context.Context, facultyID string, req EnterMarksRequest) error
	GetGradebook(ctx context.Context, studentID, semesterID string) ([]GradebookEntry, error)
	CalculateGPA(ctx context.Context, studentID, semesterID string) (*GPAResponse, error)
}

type academicService struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &academicService{repo: repo}
}

func (s *academicService) GetSubjects(ctx context.Context, collegeID, departmentID, semesterID string) ([]Subject, error) {
	return s.repo.ListSubjects(ctx, collegeID, departmentID, semesterID)
}

func (s *academicService) GetMySubjects(ctx context.Context, userID, semesterID string) ([]Subject, error) {
	studentID, err := s.repo.GetStudentIDByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.repo.GetEnrolledSubjects(ctx, studentID, semesterID)
}

func (s *academicService) GetFacultySubjects(ctx context.Context, facultyID string) ([]Subject, error) {
	return s.repo.ListSubjects(ctx, "", "", "")
}

func (s *academicService) CreateSubject(ctx context.Context, subject *Subject) error {
	return s.repo.CreateSubject(ctx, subject)
}

func (s *academicService) GetEnrolledStudents(ctx context.Context, subjectID string) ([]string, error) {
	return s.repo.GetEnrolledStudents(ctx, subjectID)
}

func (s *academicService) GetLinkedStudents(ctx context.Context, parentUserID string) ([]string, error) {
	return s.repo.GetLinkedStudents(ctx, parentUserID)
}

func (s *academicService) ResolveStudentID(ctx context.Context, userID string) (string, error) {
	return s.repo.GetStudentIDByUserID(ctx, userID)
}

func (s *academicService) ListExams(ctx context.Context, subjectID string) ([]Exam, error) {
	return s.repo.ListExams(ctx, subjectID)
}

func (s *academicService) CreateExam(ctx context.Context, facultyID string, req CreateExamRequest) (*Exam, error) {
	subject, err := s.repo.GetSubject(ctx, req.SubjectID)
	if err != nil {
		return nil, err
	}
	if subject.FacultyID != facultyID {
		return nil, ErrForbidden
	}
	exam := &Exam{
		SubjectID:       req.SubjectID,
		Title:           req.Title,
		ExamType:        req.ExamType,
		MaxMarks:        req.MaxMarks,
		Weightage:       req.Weightage,
		ScheduledAt:     req.ScheduledAt,
		DurationMinutes: req.DurationMinutes,
		IsPublished:     false,
	}
	if err := s.repo.CreateExam(ctx, exam); err != nil {
		return nil, err
	}
	return exam, nil
}

func (s *academicService) ListAssignments(ctx context.Context, subjectID string) ([]Assignment, error) {
	return s.repo.ListAssignments(ctx, subjectID)
}

func (s *academicService) CreateAssignment(ctx context.Context, facultyID string, req CreateAssignmentRequest) (*Assignment, error) {
	subject, err := s.repo.GetSubject(ctx, req.SubjectID)
	if err != nil {
		return nil, err
	}
	if subject.FacultyID != facultyID {
		return nil, ErrForbidden
	}
	assignment := &Assignment{
		SubjectID:   req.SubjectID,
		Title:       req.Title,
		Description: req.Description,
		MaxMarks:    req.MaxMarks,
		Deadline:    req.Deadline,
		IsPublished: false,
	}
	if err := s.repo.CreateAssignment(ctx, assignment); err != nil {
		return nil, err
	}
	return assignment, nil
}

func (s *academicService) GetAttendance(ctx context.Context, studentID, subjectID string) ([]AttendanceRecord, error) {
	return s.repo.GetAttendance(ctx, studentID, subjectID)
}

func (s *academicService) MarkAttendance(ctx context.Context, facultyID string, req MarkAttendanceRequest) error {
	subject, err := s.repo.GetSubject(ctx, req.SubjectID)
	if err != nil {
		return err
	}
	if subject.FacultyID != facultyID {
		return ErrForbidden
	}

	var records []AttendanceRecord
	for _, sid := range req.Present {
		records = append(records, AttendanceRecord{
			SubjectID: req.SubjectID,
			StudentID: sid,
			Date:      req.Date,
			IsPresent: true,
		})
	}
	for _, sid := range req.Absent {
		records = append(records, AttendanceRecord{
			SubjectID: req.SubjectID,
			StudentID: sid,
			Date:      req.Date,
			IsPresent: false,
		})
	}
	return s.repo.BulkMarkAttendance(ctx, records)
}

func (s *academicService) GetAttendanceSummary(ctx context.Context, studentID, subjectID string) (int, int, error) {
	return s.repo.GetAttendanceSummary(ctx, studentID, subjectID)
}

func (s *academicService) GetTimetable(ctx context.Context, departmentID string) ([]TimetableSlot, error) {
	return s.repo.GetTimetable(ctx, departmentID)
}

func (s *academicService) GetMarks(ctx context.Context, studentID, subjectID string) ([]InternalMark, error) {
	return s.repo.GetInternalMarks(ctx, studentID, subjectID)
}

func (s *academicService) EnterMarks(ctx context.Context, facultyID string, req EnterMarksRequest) error {
	subject, err := s.repo.GetSubject(ctx, req.SubjectID)
	if err != nil {
		return err
	}
	if subject.FacultyID != facultyID {
		return ErrForbidden
	}
	mark := &InternalMark{
		SubjectID:     req.SubjectID,
		StudentID:     req.StudentID,
		ExamID:        req.ExamID,
		MarksObtained: req.MarksObtained,
		MaxMarks:      req.MaxMarks,
		Remarks:       req.Remarks,
	}
	return s.repo.UpsertInternalMark(ctx, mark)
}

func (s *academicService) GetGradebook(ctx context.Context, studentID, semesterID string) ([]GradebookEntry, error) {
	return s.repo.GetGradebook(ctx, studentID, semesterID)
}

func (s *academicService) CalculateGPA(ctx context.Context, studentID, semesterID string) (*GPAResponse, error) {
	return s.repo.CalculateGPA(ctx, studentID, semesterID)
}

func computeGrade(percentage float64) (string, float64) {
	switch {
	case percentage >= 90:
		return "A+", 10.0
	case percentage >= 80:
		return "A", 9.0
	case percentage >= 70:
		return "B+", 8.0
	case percentage >= 60:
		return "B", 7.0
	case percentage >= 50:
		return "C+", 6.0
	case percentage >= 45:
		return "C", 5.0
	case percentage >= 40:
		return "D", 4.0
	default:
		return "F", 0.0
	}
}

func roundFloat(val float64, precision int) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}

var _ Service = (*academicService)(nil)
