package jobs

import "time"

type Job struct {
	ID              string    `json:"id" db:"id"`
	CollegeID       string    `json:"college_id" db:"college_id"`
	CompanyID       string    `json:"company_id" db:"company_id"`
	CompanyName     string    `json:"company_name,omitempty" db:"company_name"`
	Title           string    `json:"title" db:"title"`
	Description     string    `json:"description,omitempty" db:"description"`
	Location        string    `json:"location,omitempty" db:"location"`
	JobType         string    `json:"job_type,omitempty" db:"job_type"`
	SalaryMin       float64   `json:"salary_min,omitempty" db:"salary_min"`
	SalaryMax       float64   `json:"salary_max,omitempty" db:"salary_max"`
	Skills          []string  `json:"skills,omitempty" db:"skills"`
	ExperienceYears int       `json:"experience_years,omitempty" db:"experience_years"`
	Status          string    `json:"status" db:"status"`
	PostedAt        time.Time `json:"posted_at" db:"posted_at"`
	Deadline        time.Time `json:"deadline,omitempty" db:"deadline"`
	CreatedBy       string    `json:"created_by,omitempty" db:"created_by"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

type JobApplication struct {
	ID        string    `json:"id" db:"id"`
	JobID     string    `json:"job_id" db:"job_id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Status    string    `json:"status" db:"status"`
	Notes     string    `json:"notes,omitempty" db:"notes"`
	AppliedAt time.Time `json:"applied_at" db:"applied_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CreateJobRequest struct {
	CompanyID       string   `json:"company_id" binding:"required"`
	Title           string   `json:"title" binding:"required"`
	Description     string   `json:"description"`
	Location        string   `json:"location"`
	JobType         string   `json:"job_type"`
	SalaryMin       float64  `json:"salary_min"`
	SalaryMax       float64  `json:"salary_max"`
	Skills          []string `json:"skills"`
	ExperienceYears int      `json:"experience_years"`
	Deadline        string   `json:"deadline"`
}
