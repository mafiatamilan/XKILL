package tpo

import "time"

type TPO struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	CollegeID string    `json:"college_id"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type TPOActivity struct {
	ID        string    `json:"id"`
	TPOID     string    `json:"tpo_id"`
	Action    string    `json:"action"`
	Details   string    `json:"details,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type TPOAnnouncement struct {
	ID        string    `json:"id"`
	CollegeID string    `json:"college_id"`
	Title     string    `json:"title"`
	Content   string    `json:"content,omitempty"`
	Target    string    `json:"target"`
	CreatedBy string    `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
}

type DashboardStats struct {
	TotalDrives       int `json:"total_drives"`
	ActiveDrives      int `json:"active_drives"`
	TotalApplications int `json:"total_applications"`
	TotalOffers       int `json:"total_offers"`
	PendingApprovals  int `json:"pending_approvals"`
}

type CreateAnnouncementRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content"`
	Target  string `json:"target"`
}
