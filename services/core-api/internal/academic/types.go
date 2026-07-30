package academic

import "time"

type Semester struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	StartDate  time.Time `json:"start_date"`
	EndDate    time.Time `json:"end_date"`
	CollegeID  string    `json:"college_id"`
	DepartmentID string  `json:"department_id,omitempty"`
	IsActive   bool      `json:"is_active"`
}

type Subject struct {
	ID            string `json:"id"`
	CollegeID     string `json:"college_id"`
	DepartmentID  string `json:"department_id"`
	SemesterID    string `json:"semester_id,omitempty"`
	Name          string `json:"name"`
	Code          string `json:"code"`
	Credits       int    `json:"credits"`
	SubjectType   string `json:"subject_type"`
	IsLab         bool   `json:"is_lab"`
	MaxMarks      int    `json:"max_marks"`
	PassingMarks  int    `json:"passing_marks"`
	FacultyID     string `json:"faculty_id,omitempty"`
	FacultyName   string `json:"faculty_name,omitempty"`
	IsActive      bool   `json:"is_active"`
}

type Exam struct {
	ID              string `json:"id"`
	SubjectID       string `json:"subject_id"`
	Title           string `json:"title"`
	ExamType        string `json:"exam_type"`
	MaxMarks        int    `json:"max_marks"`
	Weightage       int    `json:"weightage"`
	ScheduledAt     string `json:"scheduled_at"`
	DurationMinutes int    `json:"duration_minutes"`
	IsPublished     bool   `json:"is_published"`
}

type Assignment struct {
	ID          string `json:"id"`
	SubjectID   string `json:"subject_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	MaxMarks    int    `json:"max_marks"`
	Deadline    string `json:"deadline"`
	IsPublished bool   `json:"is_published"`
}

type AttendanceRecord struct {
	ID        string `json:"id"`
	SubjectID string `json:"subject_id"`
	StudentID string `json:"student_id"`
	Date      string `json:"date"`
	IsPresent bool   `json:"is_present"`
}

type TimetableSlot struct {
	ID        string `json:"id"`
	SubjectID string `json:"subject_id"`
	DayOfWeek int    `json:"day_of_week"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	Room      string `json:"room,omitempty"`
}

type InternalMark struct {
	ID            string  `json:"id"`
	SubjectID     string  `json:"subject_id"`
	StudentID     string  `json:"student_id"`
	ExamID        string  `json:"exam_id,omitempty"`
	MarksObtained float64 `json:"marks_obtained"`
	MaxMarks      int     `json:"max_marks"`
	Remarks       string  `json:"remarks,omitempty"`
}

type GradebookEntry struct {
	ID         string  `json:"id"`
	StudentID  string  `json:"student_id"`
	SubjectID  string  `json:"subject_id"`
	TotalMarks float64 `json:"total_marks"`
	Grade      string  `json:"grade"`
	GradePoint float64 `json:"grade_point"`
	Credits    int     `json:"credits"`
	IsPassed   bool    `json:"is_passed"`
}

type GPARequest struct {
	SemesterID string `json:"semester_id" binding:"required"`
}

type GPAResponse struct {
	SemesterName  string          `json:"semester_name"`
	SGPA          float64         `json:"sgpa"`
	CGPA          float64         `json:"cgpa"`
	TotalCredits  int             `json:"total_credits"`
	EarnedCredits int             `json:"earned_credits"`
	Subjects      []GradebookEntry `json:"subjects"`
}

type MarkAttendanceRequest struct {
	SubjectID string   `json:"subject_id" binding:"required"`
	Date      string   `json:"date" binding:"required"`
	Present   []string `json:"present"`
	Absent    []string `json:"absent"`
}

type CreateExamRequest struct {
	SubjectID       string `json:"subject_id" binding:"required"`
	Title           string `json:"title" binding:"required"`
	ExamType        string `json:"exam_type" binding:"required"`
	MaxMarks        int    `json:"max_marks" binding:"required"`
	Weightage       int    `json:"weightage" binding:"required"`
	ScheduledAt     string `json:"scheduled_at" binding:"required"`
	DurationMinutes int    `json:"duration_minutes" binding:"required"`
}

type CreateAssignmentRequest struct {
	SubjectID   string `json:"subject_id" binding:"required"`
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	MaxMarks    int    `json:"max_marks" binding:"required"`
	Deadline    string `json:"deadline" binding:"required"`
}

type EnterMarksRequest struct {
	SubjectID     string  `json:"subject_id" binding:"required"`
	StudentID     string  `json:"student_id" binding:"required"`
	ExamID        string  `json:"exam_id"`
	MarksObtained float64 `json:"marks_obtained" binding:"required"`
	MaxMarks      int     `json:"max_marks" binding:"required"`
	Remarks       string  `json:"remarks"`
}
