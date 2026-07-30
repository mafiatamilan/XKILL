package career

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("not found")

type Service interface {
	ListCareerPaths(ctx context.Context) ([]CareerPath, error)
	GetCareerPath(ctx context.Context, id string) (*CareerPath, error)
	CreateResource(ctx context.Context, collegeID, userID string, req *CreateResourceRequest) (*CareerResource, error)
	ListResources(ctx context.Context, collegeID string, tags []string) ([]CareerResource, error)
	DeleteResource(ctx context.Context, id string) error
}

type careerSvc struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &careerSvc{repo: repo}
}

func (s *careerSvc) ListCareerPaths(ctx context.Context) ([]CareerPath, error) {
	return s.repo.ListCareerPaths(ctx)
}

func (s *careerSvc) GetCareerPath(ctx context.Context, id string) (*CareerPath, error) {
	p, err := s.repo.GetCareerPath(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	return p, nil
}

func (s *careerSvc) CreateResource(ctx context.Context, collegeID, userID string, req *CreateResourceRequest) (*CareerResource, error) {
	res := &CareerResource{
		ID:           uuid.New().String(),
		CollegeID:    collegeID,
		Title:        req.Title,
		ResourceType: req.ResourceType,
		URL:          req.URL,
		Content:      req.Content,
		Tags:         req.Tags,
		CreatedBy:    userID,
		CreatedAt:    time.Now(),
	}
	if err := s.repo.CreateResource(ctx, res); err != nil {
		return nil, err
	}
	return res, nil
}

func (s *careerSvc) ListResources(ctx context.Context, collegeID string, tags []string) ([]CareerResource, error) {
	return s.repo.ListResources(ctx, collegeID, tags)
}

func (s *careerSvc) DeleteResource(ctx context.Context, id string) error {
	return s.repo.DeleteResource(ctx, id)
}
