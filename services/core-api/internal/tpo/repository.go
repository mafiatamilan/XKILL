package tpo

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	CreateTPO(ctx context.Context, tpo *TPO) error
	GetTPOByUserID(ctx context.Context, userID string) (*TPO, error)
	UpdateTPO(ctx context.Context, tpo *TPO) error

	CreateAnnouncement(ctx context.Context, a *TPOAnnouncement) error
	ListAnnouncements(ctx context.Context, collegeID string) ([]TPOAnnouncement, error)

	CreateActivity(ctx context.Context, a *TPOActivity) error
	ListActivities(ctx context.Context, tpoID string) ([]TPOActivity, error)
}

type repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{pool: pool}
}

func (r *repository) CreateTPO(ctx context.Context, tpo *TPO) error {
	query := `INSERT INTO tpo_profiles (id, user_id, college_id, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := r.pool.Exec(ctx, query,
		tpo.ID, tpo.UserID, tpo.CollegeID, tpo.Role, tpo.IsActive, tpo.CreatedAt, tpo.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create tpo: %w", err)
	}
	return nil
}

func (r *repository) GetTPOByUserID(ctx context.Context, userID string) (*TPO, error) {
	query := `SELECT id, user_id, college_id, role, is_active, created_at, updated_at
		FROM tpo_profiles WHERE user_id = $1`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("get tpo by user id: %w", err)
	}
	defer rows.Close()

	tpo, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[TPO])
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get tpo by user id: %w", err)
	}
	return &tpo, nil
}

func (r *repository) UpdateTPO(ctx context.Context, tpo *TPO) error {
	query := `UPDATE tpo_profiles SET role=$2, is_active=$3, updated_at=NOW() WHERE id=$1`

	_, err := r.pool.Exec(ctx, query, tpo.ID, tpo.Role, tpo.IsActive)
	if err != nil {
		return fmt.Errorf("update tpo: %w", err)
	}
	return nil
}

func (r *repository) CreateAnnouncement(ctx context.Context, a *TPOAnnouncement) error {
	query := `INSERT INTO tpo_announcements (id, college_id, title, content, target, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := r.pool.Exec(ctx, query,
		a.ID, a.CollegeID, a.Title, a.Content, a.Target, a.CreatedBy, a.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("create announcement: %w", err)
	}
	return nil
}

func (r *repository) ListAnnouncements(ctx context.Context, collegeID string) ([]TPOAnnouncement, error) {
	query := `SELECT id, college_id, title, content, target, created_by, created_at
		FROM tpo_announcements WHERE college_id = $1 ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, collegeID)
	if err != nil {
		return nil, fmt.Errorf("list announcements: %w", err)
	}
	defer rows.Close()

	announcements, err := pgx.CollectRows(rows, pgx.RowToStructByName[TPOAnnouncement])
	if err != nil {
		return nil, fmt.Errorf("list announcements: %w", err)
	}
	return announcements, nil
}

func (r *repository) CreateActivity(ctx context.Context, a *TPOActivity) error {
	query := `INSERT INTO tpo_activities (id, tpo_id, action, details, created_at)
		VALUES ($1, $2, $3, $4, $5)`

	_, err := r.pool.Exec(ctx, query,
		a.ID, a.TPOID, a.Action, a.Details, a.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("create activity: %w", err)
	}
	return nil
}

func (r *repository) ListActivities(ctx context.Context, tpoID string) ([]TPOActivity, error) {
	query := `SELECT id, tpo_id, action, details, created_at
		FROM tpo_activities WHERE tpo_id = $1 ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, tpoID)
	if err != nil {
		return nil, fmt.Errorf("list activities: %w", err)
	}
	defer rows.Close()

	activities, err := pgx.CollectRows(rows, pgx.RowToStructByName[TPOActivity])
	if err != nil {
		return nil, fmt.Errorf("list activities: %w", err)
	}
	return activities, nil
}
