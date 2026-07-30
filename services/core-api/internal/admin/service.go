package admin

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrUserNotFound    = errors.New("user not found")
	ErrCollegeNotFound = errors.New("college not found")
	ErrDuplicateCode   = errors.New("college code already exists")
)

type WriteAuditLog func(ctx context.Context, actorID, action, resourceType, resourceID, before, after string) error

type Service interface {
	OnboardCollege(ctx context.Context, req CreateCollegeRequest) (*College, error)
	ListColleges(ctx context.Context, limit int, cursor string) ([]College, string, error)
	ListUsers(ctx context.Context, search, role string, limit int, cursor string) ([]UserListItem, string, error)
	GetUser(ctx context.Context, userID string) (*UserListItem, error)
	SuspendUser(ctx context.Context, actorID, userID, reason string) error
	ReactivateUser(ctx context.Context, actorID, userID string) error
	ApproveRecruiter(ctx context.Context, actorID, userID string) error
}

type adminService struct {
	repo         Repository
	writeAuditLog WriteAuditLog
}

func NewService(repo Repository, writeAuditLog WriteAuditLog) Service {
	return &adminService{repo: repo, writeAuditLog: writeAuditLog}
}

func (s *adminService) OnboardCollege(ctx context.Context, req CreateCollegeRequest) (*College, error) {
	college := &College{
		Name:   req.Name,
		Code:   req.Code,
		Domain: req.Domain,
		City:   req.City,
		State:  req.State,
	}

	if err := s.repo.CreateCollege(ctx, college); err != nil {
		if isPGUniqueViolation(err) {
			return nil, ErrDuplicateCode
		}
		return nil, err
	}

	return college, nil
}

func (s *adminService) ListColleges(ctx context.Context, limit int, cursor string) ([]College, string, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return s.repo.ListColleges(ctx, limit, cursor)
}

func (s *adminService) ListUsers(ctx context.Context, search, role string, limit int, cursor string) ([]UserListItem, string, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return s.repo.ListUsers(ctx, search, role, limit, cursor)
}

func (s *adminService) GetUser(ctx context.Context, userID string) (*UserListItem, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

func (s *adminService) SuspendUser(ctx context.Context, actorID, userID, reason string) error {
	_, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	if err := s.repo.UpdateUserStatus(ctx, userID, false); err != nil {
		return err
	}

	before := `{"is_active":true}`
	after := `{"is_active":false,"reason":"` + reason + `"}`
	s.writeAuditLog(ctx, actorID, "user_suspended", "user", userID, before, after)

	return nil
}

func (s *adminService) ReactivateUser(ctx context.Context, actorID, userID string) error {
	_, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	if err := s.repo.UpdateUserStatus(ctx, userID, true); err != nil {
		return err
	}

	before := `{"is_active":false}`
	after := `{"is_active":true}`
	s.writeAuditLog(ctx, actorID, "user_reactivated", "user", userID, before, after)

	return nil
}

func (s *adminService) ApproveRecruiter(ctx context.Context, actorID, userID string) error {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	if err := s.repo.AssignRole(ctx, userID, "recruiter", ""); err != nil {
		return err
	}

	before := `{"role":"` + user.Role + `"}`
	after := `{"role":"recruiter"}`
	s.writeAuditLog(ctx, actorID, "recruiter_approved", "user", userID, before, after)

	return nil
}

func getNow() string {
	return time.Now().Format(time.RFC3339)
}

func uuidString() string {
	return uuid.New().String()
}
