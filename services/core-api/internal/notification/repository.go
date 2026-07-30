package notification

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	Create(ctx context.Context, n *Notification) error
	List(ctx context.Context, userID uuid.UUID, limit int, cursor string) ([]Notification, string, error)
	GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error)
	MarkRead(ctx context.Context, id, userID uuid.UUID) error
	MarkAllRead(ctx context.Context, userID uuid.UUID) error
	GetPreferences(ctx context.Context, userID uuid.UUID) (*NotificationPreference, error)
	UpsertPreferences(ctx context.Context, p *NotificationPreference) error
}

type postgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

func (r *postgresRepository) Create(ctx context.Context, n *Notification) error {
	query := `INSERT INTO notifications (id, user_id, college_id, type, title, body, channel, priority, reference_type, reference_id, is_read, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
	_, err := r.pool.Exec(ctx, query,
		n.ID, n.UserID, n.CollegeID, n.Type, n.Title, n.Body, n.Channel,
		n.Priority, n.ReferenceType, n.ReferenceID, n.IsRead, n.CreatedAt)
	return err
}

func (r *postgresRepository) List(ctx context.Context, userID uuid.UUID, limit int, cursor string) ([]Notification, string, error) {
	var rows pgx.Rows
	var err error

	if cursor != "" {
		cursorID, _ := uuid.Parse(cursor)
		rows, err = r.pool.Query(ctx,
			`SELECT id, user_id, college_id, type, title, body, channel, priority,
				reference_type, reference_id, is_read, is_archived, read_at, created_at, sent_at
			 FROM notifications
			 WHERE user_id = $1 AND created_at < (SELECT created_at FROM notifications WHERE id = $2)
			 ORDER BY created_at DESC LIMIT $3`,
			userID, cursorID, limit)
	} else {
		rows, err = r.pool.Query(ctx,
			`SELECT id, user_id, college_id, type, title, body, channel, priority,
				reference_type, reference_id, is_read, is_archived, read_at, created_at, sent_at
			 FROM notifications
			 WHERE user_id = $1
			 ORDER BY created_at DESC LIMIT $2`,
			userID, limit)
	}
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var notifications []Notification
	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.CollegeID, &n.Type, &n.Title, &n.Body,
			&n.Channel, &n.Priority, &n.ReferenceType, &n.ReferenceID, &n.IsRead,
			&n.IsArchived, &n.ReadAt, &n.CreatedAt, &n.SentAt); err != nil {
			return nil, "", err
		}
		notifications = append(notifications, n)
	}

	var nextCursor string
	if len(notifications) == limit {
		nextCursor = notifications[len(notifications)-1].ID.String()
	}

	return notifications, nextCursor, nil
}

func (r *postgresRepository) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`, userID).Scan(&count)
	return count, err
}

func (r *postgresRepository) MarkRead(ctx context.Context, id, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE notifications SET is_read = true, read_at = $1 WHERE id = $2 AND user_id = $3`,
		time.Now(), id, userID)
	return err
}

func (r *postgresRepository) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE notifications SET is_read = true, read_at = $1 WHERE user_id = $2 AND is_read = false`,
		time.Now(), userID)
	return err
}

func (r *postgresRepository) GetPreferences(ctx context.Context, userID uuid.UUID) (*NotificationPreference, error) {
	p := &NotificationPreference{}
	err := r.pool.QueryRow(ctx,
		`SELECT user_id, email_enabled, push_enabled, sms_enabled, in_app_enabled, digest_frequency, created_at, updated_at
		 FROM notification_preferences WHERE user_id = $1`, userID).Scan(
		&p.UserID, &p.EmailEnabled, &p.PushEnabled, &p.SMSEnabled, &p.InAppEnabled,
		&p.DigestFrequency, &p.CreatedAt, &p.UpdatedAt)
	if err == pgx.ErrNoRows {
		return &NotificationPreference{
			UserID:          userID,
			EmailEnabled:    true,
			PushEnabled:     true,
			SMSEnabled:      true,
			InAppEnabled:    true,
			DigestFrequency: "instant",
		}, nil
	}
	return p, err
}

func (r *postgresRepository) UpsertPreferences(ctx context.Context, p *NotificationPreference) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO notification_preferences (user_id, email_enabled, push_enabled, sms_enabled, in_app_enabled, digest_frequency, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, NOW())
		 ON CONFLICT (user_id) DO UPDATE SET
			email_enabled = $2, push_enabled = $3, sms_enabled = $4, in_app_enabled = $5,
			digest_frequency = $6, updated_at = NOW()`,
		p.UserID, p.EmailEnabled, p.PushEnabled, p.SMSEnabled, p.InAppEnabled, p.DigestFrequency)
	return err
}
