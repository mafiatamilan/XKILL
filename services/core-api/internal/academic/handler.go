package academic

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMW gin.HandlerFunc) {
	student := rg.Group("/student", authMW)
	{
		student.GET("/subjects", h.getMySubjects)
		student.GET("/exams", h.listExams)
		student.GET("/assignments", h.listAssignments)
		student.GET("/attendance", h.getStudentAttendance)
		student.GET("/timetable", h.getTimetable)
		student.GET("/marks", h.getStudentMarks)
		student.GET("/gradebook", h.getGradebook)
		student.POST("/gpa", h.calculateGPA)
	}

	faculty := rg.Group("/faculty", authMW)
	{
		faculty.GET("/subjects", h.getFacultySubjects)
		faculty.POST("/subjects", h.createSubject)
		faculty.GET("/subjects/:id/students", h.getEnrolledStudents)
		faculty.POST("/attendance", h.markAttendance)
		faculty.GET("/attendance", h.getFacultyAttendance)
		faculty.POST("/exams", h.createExam)
		faculty.POST("/assignments", h.createAssignment)
		faculty.POST("/marks", h.enterMarks)
		faculty.GET("/marks", h.getFacultyMarks)
		faculty.GET("/analytics", h.getAttendanceAnalytics)
	}

	parent := rg.Group("/parent", authMW)
	{
		parent.GET("/children", h.getLinkedChildren)
		parent.GET("/children/:id/progress", h.getChildProgress)
		parent.GET("/children/:id/attendance", h.getChildAttendance)
		parent.GET("/children/:id/marks", h.getChildMarks)
		parent.GET("/children/:id/assignments", h.getChildAssignments)
	}
}

func (h *Handler) getMySubjects(c *gin.Context) {
	userID := c.GetString("user_id")
	semesterID := c.Query("semester_id")
	subjects, err := h.svc.GetMySubjects(c.Request.Context(), userID, semesterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": subjects})
}

func (h *Handler) getFacultySubjects(c *gin.Context) {
	facultyID := c.GetString("user_id")
	subjects, err := h.svc.GetFacultySubjects(c.Request.Context(), facultyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": subjects})
}

func (h *Handler) createSubject(c *gin.Context) {
	var req struct {
		CollegeID    string `json:"college_id" binding:"required"`
		DepartmentID string `json:"department_id" binding:"required"`
		SemesterID   string `json:"semester_id"`
		Name         string `json:"name" binding:"required"`
		Code         string `json:"code" binding:"required"`
		Credits      int    `json:"credits" binding:"required"`
		SubjectType  string `json:"subject_type" binding:"required"`
		IsLab        bool   `json:"is_lab"`
		MaxMarks     int    `json:"max_marks" binding:"required"`
		PassingMarks int    `json:"passing_marks" binding:"required"`
		FacultyID    string `json:"faculty_id"`
		FacultyName  string `json:"faculty_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	subject := &Subject{
		CollegeID:    req.CollegeID,
		DepartmentID: req.DepartmentID,
		SemesterID:   req.SemesterID,
		Name:         req.Name,
		Code:         req.Code,
		Credits:      req.Credits,
		SubjectType:  req.SubjectType,
		IsLab:        req.IsLab,
		MaxMarks:     req.MaxMarks,
		PassingMarks: req.PassingMarks,
		FacultyID:    req.FacultyID,
		FacultyName:  req.FacultyName,
		IsActive:     true,
	}
	if err := h.svc.CreateSubject(c.Request.Context(), subject); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusCreated, subject)
}

func (h *Handler) getEnrolledStudents(c *gin.Context) {
	subjectID := c.Param("id")
	students, err := h.svc.GetEnrolledStudents(c.Request.Context(), subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": students})
}

func (h *Handler) listExams(c *gin.Context) {
	subjectID := c.Query("subject_id")
	if subjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject_id is required"})
		return
	}
	exams, err := h.svc.ListExams(c.Request.Context(), subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": exams})
}

func (h *Handler) listAssignments(c *gin.Context) {
	subjectID := c.Query("subject_id")
	if subjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject_id is required"})
		return
	}
	assignments, err := h.svc.ListAssignments(c.Request.Context(), subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": assignments})
}

func (h *Handler) getStudentAttendance(c *gin.Context) {
	userID := c.GetString("user_id")
	studentID, err := h.svc.ResolveStudentID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student profile not found"})
		return
	}
	subjectID := c.Query("subject_id")
	if subjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject_id is required"})
		return
	}
	records, err := h.svc.GetAttendance(c.Request.Context(), studentID, subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": records})
}

func (h *Handler) getFacultyAttendance(c *gin.Context) {
	studentID := c.Query("student_id")
	subjectID := c.Query("subject_id")
	if studentID == "" || subjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "student_id and subject_id are required"})
		return
	}
	records, err := h.svc.GetAttendance(c.Request.Context(), studentID, subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": records})
}

func (h *Handler) getTimetable(c *gin.Context) {
	departmentID := c.Query("department_id")
	if departmentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "department_id is required"})
		return
	}
	slots, err := h.svc.GetTimetable(c.Request.Context(), departmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": slots})
}

func (h *Handler) getStudentMarks(c *gin.Context) {
	userID := c.GetString("user_id")
	studentID, err := h.svc.ResolveStudentID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student profile not found"})
		return
	}
	subjectID := c.Query("subject_id")
	if subjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject_id is required"})
		return
	}
	marks, err := h.svc.GetMarks(c.Request.Context(), studentID, subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": marks})
}

func (h *Handler) getFacultyMarks(c *gin.Context) {
	studentID := c.Query("student_id")
	subjectID := c.Query("subject_id")
	if studentID == "" || subjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "student_id and subject_id are required"})
		return
	}
	marks, err := h.svc.GetMarks(c.Request.Context(), studentID, subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": marks})
}

func (h *Handler) getGradebook(c *gin.Context) {
	userID := c.GetString("user_id")
	studentID, err := h.svc.ResolveStudentID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student profile not found"})
		return
	}
	semesterID := c.Query("semester_id")
	entries, err := h.svc.GetGradebook(c.Request.Context(), studentID, semesterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": entries})
}

func (h *Handler) calculateGPA(c *gin.Context) {
	userID := c.GetString("user_id")
	studentID, err := h.svc.ResolveStudentID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student profile not found"})
		return
	}
	var req GPARequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.svc.CalculateGPA(c.Request.Context(), studentID, req.SemesterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) createExam(c *gin.Context) {
	facultyID := c.GetString("user_id")
	var req CreateExamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	exam, err := h.svc.CreateExam(c.Request.Context(), facultyID, req)
	if err != nil {
		if errors.Is(err, ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this subject"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusCreated, exam)
}

func (h *Handler) createAssignment(c *gin.Context) {
	facultyID := c.GetString("user_id")
	var req CreateAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	assignment, err := h.svc.CreateAssignment(c.Request.Context(), facultyID, req)
	if err != nil {
		if errors.Is(err, ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this subject"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusCreated, assignment)
}

func (h *Handler) markAttendance(c *gin.Context) {
	facultyID := c.GetString("user_id")
	var req MarkAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.MarkAttendance(c.Request.Context(), facultyID, req); err != nil {
		if errors.Is(err, ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this subject"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "attendance marked"})
}

func (h *Handler) enterMarks(c *gin.Context) {
	facultyID := c.GetString("user_id")
	var req EnterMarksRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.EnterMarks(c.Request.Context(), facultyID, req); err != nil {
		if errors.Is(err, ErrForbidden) {
			c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this subject"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "marks entered"})
}

func (h *Handler) getAttendanceAnalytics(c *gin.Context) {
	subjectID := c.Query("subject_id")
	if subjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject_id is required"})
		return
	}
	students, err := h.svc.GetEnrolledStudents(c.Request.Context(), subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	type studentAnalytics struct {
		StudentID  string  `json:"student_id"`
		Present    int     `json:"present"`
		Total      int     `json:"total"`
		Percentage float64 `json:"percentage"`
	}
	var result []studentAnalytics
	for _, sid := range students {
		present, total, err := h.svc.GetAttendanceSummary(c.Request.Context(), sid, subjectID)
		if err != nil {
			continue
		}
		pct := 0.0
		if total > 0 {
			pct = roundFloat(float64(present)/float64(total)*100, 2)
		}
		result = append(result, studentAnalytics{
			StudentID:  sid,
			Present:    present,
			Total:      total,
			Percentage: pct,
		})
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *Handler) getLinkedChildren(c *gin.Context) {
	parentUserID := c.GetString("user_id")
	children, err := h.svc.GetLinkedStudents(c.Request.Context(), parentUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": children})
}

func (h *Handler) getChildProgress(c *gin.Context) {
	childID := c.Param("id")
	semesterID := c.Query("semester_id")
	result, err := h.svc.CalculateGPA(c.Request.Context(), childID, semesterID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) getChildAttendance(c *gin.Context) {
	childID := c.Param("id")
	subjectID := c.Query("subject_id")
	if subjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject_id is required"})
		return
	}
	records, err := h.svc.GetAttendance(c.Request.Context(), childID, subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": records})
}

func (h *Handler) getChildMarks(c *gin.Context) {
	childID := c.Param("id")
	subjectID := c.Query("subject_id")
	if subjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject_id is required"})
		return
	}
	marks, err := h.svc.GetMarks(c.Request.Context(), childID, subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": marks})
}

func (h *Handler) getChildAssignments(c *gin.Context) {
	subjectID := c.Query("subject_id")
	if subjectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject_id is required"})
		return
	}
	assignments, err := h.svc.ListAssignments(c.Request.Context(), subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": assignments})
}
