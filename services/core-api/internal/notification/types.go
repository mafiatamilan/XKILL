package notification

import (
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"user_id"`
	CollegeID     *uuid.UUID `json:"college_id,omitempty"`
	Type          string     `json:"type"`
	Title         string     `json:"title"`
	Body          string     `json:"body"`
	Channel       string     `json:"channel"`
	Priority      string     `json:"priority"`
	ReferenceType string     `json:"reference_type,omitempty"`
	ReferenceID   *uuid.UUID `json:"reference_id,omitempty"`
	IsRead        bool       `json:"is_read"`
	IsArchived    bool       `json:"is_archived"`
	ReadAt        *time.Time `json:"read_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	SentAt        *time.Time `json:"sent_at,omitempty"`
}

type NotificationPreference struct {
	UserID          uuid.UUID `json:"user_id"`
	EmailEnabled    bool      `json:"email_enabled"`
	PushEnabled     bool      `json:"push_enabled"`
	SMSEnabled      bool      `json:"sms_enabled"`
	InAppEnabled    bool      `json:"in_app_enabled"`
	DigestFrequency string    `json:"digest_frequency"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type SendNotificationRequest struct {
	UserID        string `json:"user_id" binding:"required"`
	CollegeID     string `json:"college_id,omitempty"`
	Type          string `json:"type" binding:"required"`
	Title         string `json:"title" binding:"required"`
	Body          string `json:"body"`
	Channel       string `json:"channel"`
	Priority      string `json:"priority"`
	ReferenceType string `json:"reference_type,omitempty"`
	ReferenceID   string `json:"reference_id,omitempty"`
}

type NotificationEvent struct {
	ID      string `json:"id"`
	UserID  string `json:"user_id"`
	Email   string `json:"email,omitempty"`
	Phone   string `json:"phone,omitempty"`
	Type    string `json:"type"`
	Title   string `json:"title"`
	Body    string `json:"body"`
	Channel string `json:"channel"`
}

type BulkSendRequest struct {
	UserIDs       []string `json:"user_ids" binding:"required,min=1"`
	Type          string   `json:"type" binding:"required"`
	Title         string   `json:"title" binding:"required"`
	Body          string   `json:"body"`
	Channel       string   `json:"channel"`
	Priority      string   `json:"priority"`
	ReferenceType string   `json:"reference_type,omitempty"`
	ReferenceID   string   `json:"reference_id,omitempty"`
}
