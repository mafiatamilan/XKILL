package tpo

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service interface {
	GetProfile(ctx context.Context, userID string) (*TPO, error)
	CreateAnnouncement(ctx context.Context, collegeID, userID string, req *CreateAnnouncementRequest) (*TPOAnnouncement, error)
	ListAnnouncements(ctx context.Context, collegeID string) ([]TPOAnnouncement, error)
	GetDashboardStats(ctx context.Context, collegeID string) (*DashboardStats, error)
	LogActivity(ctx context.Context, tpoID, action, details string) error
}

type service struct {
	repo Repository
	pool *pgxpool.Pool
}

func NewService(repo Repository, pool *pgxpool.Pool) Service {
	return &service{repo: repo, pool: pool}
}

func (s *service) GetProfile(ctx context.Context, userID string) (*TPO, error) {
	tpo, err := s.repo.GetTPOByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if tpo == nil {
		return nil, fmt.Errorf("tpo profile not found")
	}
	return tpo, nil
}

func (s *service) CreateAnnouncement(ctx context.Context, collegeID, userID string, req *CreateAnnouncementRequest) (*TPOAnnouncement, error) {
	now := time.Now()
	announcement := &TPOAnnouncement{
		ID:        uuid.New().String(),
		CollegeID: collegeID,
		Title:     req.Title,
		Content:   req.Content,
		Target:    req.Target,
		CreatedBy: userID,
		CreatedAt: now,
	}

	if err := s.repo.CreateAnnouncement(ctx, announcement); err != nil {
		return nil, err
	}
	return announcement, nil
}

func (s *service) ListAnnouncements(ctx context.Context, collegeID string) ([]TPOAnnouncement, error) {
	return s.repo.ListAnnouncements(ctx, collegeID)
}

func (s *service) GetDashboardStats(ctx context.Context, collegeID string) (*DashboardStats, error) {
	stats := &DashboardStats{}

	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM placement_drives WHERE college_id = $1`, collegeID).Scan(&stats.TotalDrives)
	if err != nil {
		return nil, fmt.Errorf("count total drives: %w", err)
	}

	err = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM placement_drives WHERE college_id = $1 AND status = 'active'`, collegeID).Scan(&stats.ActiveDrives)
	if err != nil {
		return nil, fmt.Errorf("count active drives: %w", err)
	}

	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM placement_applications pa
		JOIN placement_drives pd ON pa.drive_id = pd.id
		WHERE pd.college_id = $1`, collegeID).Scan(&stats.TotalApplications)
	if err != nil {
		return nil, fmt.Errorf("count total applications: %w", err)
	}

	err = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM offers o
		JOIN placement_applications pa ON o.application_id = pa.id
		JOIN placement_drives pd ON pa.drive_id = pd.id
		WHERE pd.college_id = $1`, collegeID).Scan(&stats.TotalOffers)
	if err != nil {
		return nil, fmt.Errorf("count total offers: %w", err)
	}

	err = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM recruiter_profiles WHERE college_id = $1 AND NOT is_verified`, collegeID).Scan(&stats.PendingApprovals)
	if err != nil {
		return nil, fmt.Errorf("count pending approvals: %w", err)
	}

	return stats, nil
}

func (s *service) LogActivity(ctx context.Context, tpoID, action, details string) error {
	activity := &TPOActivity{
		ID:        uuid.New().String(),
		TPOID:     tpoID,
		Action:    action,
		Details:   details,
		CreatedAt: time.Now(),
	}
	return s.repo.CreateActivity(ctx, activity)
}
