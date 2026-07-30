package notification

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
)

type Service interface {
	Send(ctx context.Context, req SendNotificationRequest) error
	BulkSend(ctx context.Context, req BulkSendRequest) error
	List(ctx context.Context, userID uuid.UUID, limit int, cursor string) ([]Notification, string, error)
	GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error)
	MarkRead(ctx context.Context, id, userID uuid.UUID) error
	MarkAllRead(ctx context.Context, userID uuid.UUID) error
	GetPreferences(ctx context.Context, userID uuid.UUID) (*NotificationPreference, error)
	UpdatePreferences(ctx context.Context, prefs *NotificationPreference) error
}

type notificationService struct {
	repo  Repository
	js    nats.JetStreamContext
}

func NewService(repo Repository, js nats.JetStreamContext) Service {
	return &notificationService{repo: repo, js: js}
}

func (s *notificationService) Send(ctx context.Context, req SendNotificationRequest) error {
	userID, _ := uuid.Parse(req.UserID)

	var collegeID *uuid.UUID
	if req.CollegeID != "" {
		id, _ := uuid.Parse(req.CollegeID)
		collegeID = &id
	}

	channel := req.Channel
	if channel == "" {
		channel = "in_app"
	}

	priority := req.Priority
	if priority == "" {
		priority = "normal"
	}

	var refID *uuid.UUID
	if req.ReferenceID != "" {
		id, _ := uuid.Parse(req.ReferenceID)
		refID = &id
	}

	notif := &Notification{
		ID:            uuid.New(),
		UserID:        userID,
		CollegeID:     collegeID,
		Type:          req.Type,
		Title:         req.Title,
		Body:          req.Body,
		Channel:       channel,
		Priority:      priority,
		ReferenceType: req.ReferenceType,
		ReferenceID:   refID,
		IsRead:        false,
		CreatedAt:     time.Now(),
	}

	if err := s.repo.Create(ctx, notif); err != nil {
		return err
	}

	event := NotificationEvent{
		ID:      notif.ID.String(),
		UserID:  notif.UserID.String(),
		Type:    notif.Type,
		Title:   notif.Title,
		Body:    notif.Body,
		Channel: notif.Channel,
	}

	data, _ := json.Marshal(event)
	if _, err := s.js.Publish("notifications.send", data); err != nil {
		return err
	}

	return nil
}

func (s *notificationService) BulkSend(ctx context.Context, req BulkSendRequest) error {
	for _, uid := range req.UserIDs {
		sendReq := SendNotificationRequest{
			UserID:        uid,
			Type:          req.Type,
			Title:         req.Title,
			Body:          req.Body,
			Channel:       req.Channel,
			Priority:      req.Priority,
			ReferenceType: req.ReferenceType,
			ReferenceID:   req.ReferenceID,
		}
		if err := s.Send(ctx, sendReq); err != nil {
			return err
		}
	}
	return nil
}

func (s *notificationService) List(ctx context.Context, userID uuid.UUID, limit int, cursor string) ([]Notification, string, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return s.repo.List(ctx, userID, limit, cursor)
}

func (s *notificationService) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error) {
	return s.repo.GetUnreadCount(ctx, userID)
}

func (s *notificationService) MarkRead(ctx context.Context, id, userID uuid.UUID) error {
	return s.repo.MarkRead(ctx, id, userID)
}

func (s *notificationService) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	return s.repo.MarkAllRead(ctx, userID)
}

func (s *notificationService) GetPreferences(ctx context.Context, userID uuid.UUID) (*NotificationPreference, error) {
	return s.repo.GetPreferences(ctx, userID)
}

func (s *notificationService) UpdatePreferences(ctx context.Context, prefs *NotificationPreference) error {
	return s.repo.UpsertPreferences(ctx, prefs)
}
