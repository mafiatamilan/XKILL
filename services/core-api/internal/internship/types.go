package internship

import "time"

type Internship struct {
	ID          string    `json:"id"`
	CompanyID   string    `json:"company_id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Location    string    `json:"location"`
	Duration    string    `json:"duration"`
	Stipend     string    `json:"stipend"`
	Skills      []string  `json:"skills"`
	Status      string    `json:"status"`
	PostedAt    time.Time `json:"posted_at"`
	Deadline    time.Time `json:"deadline"`
}

type InternshipApplication struct {
	ID           string    `json:"id"`
	InternshipID string    `json:"internship_id"`
	UserID       string    `json:"user_id"`
	Status       string    `json:"status"`
	AppliedAt    time.Time `json:"applied_at"`
}
