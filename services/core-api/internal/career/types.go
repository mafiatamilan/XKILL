package career

import "time"

type CareerPath struct {
	ID                string   `json:"id"`
	Title             string   `json:"title"`
	Description       string   `json:"description,omitempty"`
	Skills            []string `json:"skills,omitempty"`
	AvgSalary         float64  `json:"avg_salary,omitempty"`
	GrowthRate        float64  `json:"growth_rate,omitempty"`
	RequiredEducation string   `json:"required_education,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

type CareerResource struct {
	ID           string    `json:"id"`
	CollegeID    string    `json:"college_id"`
	Title        string    `json:"title"`
	ResourceType string    `json:"resource_type"`
	URL          string    `json:"url,omitempty"`
	Content      string    `json:"content,omitempty"`
	Tags         []string  `json:"tags,omitempty"`
	CreatedBy    string    `json:"created_by,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type MentorSession struct {
	ID          string    `json:"id"`
	MentorID    string    `json:"mentor_id"`
	StudentID   string    `json:"student_id"`
	Topic       string    `json:"topic"`
	ScheduledAt time.Time `json:"scheduled_at"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateResourceRequest struct {
	Title        string   `json:"title" binding:"required"`
	ResourceType string   `json:"resource_type" binding:"required"`
	URL          string   `json:"url"`
	Content      string   `json:"content"`
	Tags         []string `json:"tags"`
}

type BookSessionRequest struct {
	MentorID    string `json:"mentor_id" binding:"required"`
	Topic       string `json:"topic" binding:"required"`
	ScheduledAt string `json:"scheduled_at" binding:"required"`
}
