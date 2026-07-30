package recruiter

import "time"

type Company struct {
	ID          string    `json:"id" db:"id"`
	CollegeID   string    `json:"college_id" db:"college_id"`
	Name        string    `json:"name" db:"name"`
	LogoURL     string    `json:"logo_url,omitempty" db:"logo_url"`
	Website     string    `json:"website,omitempty" db:"website"`
	Description string    `json:"description,omitempty" db:"description"`
	Industry    string    `json:"industry,omitempty" db:"industry"`
	Size        string    `json:"size,omitempty" db:"size"`
	IsVerified  bool      `json:"is_verified" db:"is_verified"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type Recruiter struct {
	ID          string    `json:"id" db:"id"`
	UserID      string    `json:"user_id" db:"user_id"`
	CompanyID   string    `json:"company_id" db:"company_id"`
	CollegeID   string    `json:"college_id" db:"college_id"`
	Designation string    `json:"designation,omitempty" db:"designation"`
	IsVerified  bool      `json:"is_verified" db:"is_verified"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type CreateCompanyRequest struct {
	Name        string `json:"name" binding:"required"`
	LogoURL     string `json:"logo_url"`
	Website     string `json:"website"`
	Description string `json:"description"`
	Industry    string `json:"industry"`
	Size        string `json:"size"`
}

type CreateRecruiterRequest struct {
	CompanyID   string `json:"company_id" binding:"required"`
	Designation string `json:"designation"`
}
