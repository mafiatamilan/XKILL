package interview

import "time"

type InterviewQuestion struct {
	ID         string    `json:"id"`
	CollegeID  string    `json:"college_id"`
	Category   string    `json:"category"`
	Question   string    `json:"question"`
	Answer     string    `json:"answer,omitempty"`
	Difficulty string    `json:"difficulty"`
	Tags       []string  `json:"tags,omitempty"`
	CreatedBy  string    `json:"created_by,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type InterviewExperience struct {
	ID          string    `json:"id"`
	StudentID   string    `json:"student_id"`
	CollegeID   string    `json:"college_id"`
	Company     string    `json:"company"`
	Role        string    `json:"role"`
	Rounds      []string  `json:"rounds,omitempty"`
	Content     string    `json:"content"`
	Tips        string    `json:"tips,omitempty"`
	IsAnonymous bool      `json:"is_anonymous"`
	IsApproved  bool      `json:"is_approved"`
	CreatedAt   time.Time `json:"created_at"`
}

type MockInterview struct {
	ID          string    `json:"id"`
	StudentID   string    `json:"student_id"`
	PeerID      string    `json:"peer_id,omitempty"`
	ScheduledAt time.Time `json:"scheduled_at,omitempty"`
	DurationMin int       `json:"duration_min"`
	Mode        string    `json:"mode"`
	Status      string    `json:"status"`
	Feedback    string    `json:"feedback,omitempty"`
	Rating      int       `json:"rating,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateQuestionRequest struct {
	Category   string   `json:"category" binding:"required"`
	Question   string   `json:"question" binding:"required"`
	Answer     string   `json:"answer"`
	Difficulty string   `json:"difficulty"`
	Tags       []string `json:"tags"`
}

type CreateExperienceRequest struct {
	Company     string   `json:"company" binding:"required"`
	Role        string   `json:"role" binding:"required"`
	Rounds      []string `json:"rounds"`
	Content     string   `json:"content" binding:"required"`
	Tips        string   `json:"tips"`
	IsAnonymous bool     `json:"is_anonymous"`
}

type ScheduleMockRequest struct {
	PeerID      string `json:"peer_id"`
	ScheduledAt string `json:"scheduled_at"`
	DurationMin int    `json:"duration_min"`
	Mode        string `json:"mode"`
}

type UpdateMockRequest struct {
	Status   string `json:"status"`
	Feedback string `json:"feedback"`
	Rating   int    `json:"rating"`
}
