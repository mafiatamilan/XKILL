package student

type StudentProfile struct {
	ID               string `json:"id"`
	UserID           string `json:"user_id"`
	CollegeID        string `json:"college_id"`
	DepartmentID     string `json:"department_id,omitempty"`
	EnrollmentNumber string `json:"enrollment_number,omitempty"`
	Batch            string `json:"batch,omitempty"`
	DateOfBirth      string `json:"date_of_birth,omitempty"`
	Gender           string `json:"gender,omitempty"`
	Category         string `json:"category,omitempty"`
	City             string `json:"city,omitempty"`
	State            string `json:"state,omitempty"`
	CreatedAt        string `json:"created_at"`
	UpdatedAt        string `json:"updated_at"`
}

type Skill struct {
	ID               string `json:"id"`
	StudentID        string `json:"student_id"`
	Name             string `json:"name"`
	Category         string `json:"category"`
	ProficiencyLevel string `json:"proficiency_level"`
	CreatedAt        string `json:"created_at"`
}

type CareerGoal struct {
	ID            string `json:"id"`
	StudentID     string `json:"student_id"`
	Title         string `json:"title"`
	TargetRole    string `json:"target_role,omitempty"`
	TargetCompany string `json:"target_company,omitempty"`
	TargetDate    string `json:"target_date,omitempty"`
	Status        string `json:"status"`
	Notes         string `json:"notes,omitempty"`
	CreatedAt     string `json:"created_at"`
}

type UpdateProfileRequest struct {
	DepartmentID     string `json:"department_id"`
	EnrollmentNumber string `json:"enrollment_number"`
	Batch            string `json:"batch"`
	DateOfBirth      string `json:"date_of_birth"`
	Gender           string `json:"gender"`
	Category         string `json:"category"`
	City             string `json:"city"`
	State            string `json:"state"`
}

type AddSkillRequest struct {
	Name             string `json:"name" binding:"required"`
	Category         string `json:"category"`
	ProficiencyLevel string `json:"proficiency_level"`
}

type AddCareerGoalRequest struct {
	Title         string `json:"title" binding:"required"`
	TargetRole    string `json:"target_role"`
	TargetCompany string `json:"target_company"`
	TargetDate    string `json:"target_date"`
	Notes         string `json:"notes"`
}
