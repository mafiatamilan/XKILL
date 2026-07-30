package mentor

import "time"

type Mentor struct {
	ID          string   `json:"id"`
	UserID      string   `json:"user_id"`
	CollegeID   string   `json:"college_id"`
	Expertise   []string `json:"expertise"`
	Bio         string   `json:"bio"`
	Company     string   `json:"company"`
	Designation string   `json:"designation"`
	IsAvailable bool     `json:"is_available"`
	Rating      float64  `json:"rating"`
}

type MentorshipSession struct {
	ID        string    `json:"id"`
	MentorID  string    `json:"mentor_id"`
	StudentID string    `json:"student_id"`
	Topic     string    `json:"topic"`
	ScheduledAt time.Time `json:"scheduled_at"`
	DurationMin int     `json:"duration_min"`
	Status    string    `json:"status"`
	Notes     string    `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
}

type MentorReview struct {
	ID        string    `json:"id"`
	SessionID string    `json:"session_id"`
	Rating    int       `json:"rating"`
	Comment   string    `json:"comment"`
	CreatedAt time.Time `json:"created_at"`
}
