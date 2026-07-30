package jobs

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Service interface {
	PostJob(ctx context.Context, collegeID, userID string, req *CreateJobRequest) (*Job, error)
	GetJob(ctx context.Context, id string) (*Job, error)
	ListJobs(ctx context.Context, collegeID string, filters map[string]string) ([]Job, error)
	UpdateJobStatus(ctx context.Context, id, status string) error

	Apply(ctx context.Context, userID string, jobID string) (*JobApplication, error)
	GetMyApplications(ctx context.Context, userID string) ([]JobApplication, error)
	UpdateApplicationStatus(ctx context.Context, id, status string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) PostJob(ctx context.Context, collegeID, userID string, req *CreateJobRequest) (*Job, error) {
	now := time.Now()

	var deadline time.Time
	if req.Deadline != "" {
		d, err := time.Parse(time.RFC3339, req.Deadline)
		if err != nil {
			d2, err2 := time.Parse("2006-01-02", req.Deadline)
			if err2 != nil {
				return nil, fmt.Errorf("invalid deadline format, use RFC3339 or YYYY-MM-DD")
			}
			deadline = d2
		} else {
			deadline = d
		}
	}

	job := &Job{
		ID:              uuid.New().String(),
		CollegeID:       collegeID,
		CompanyID:       req.CompanyID,
		Title:           req.Title,
		Description:     req.Description,
		Location:        req.Location,
		JobType:         req.JobType,
		SalaryMin:       req.SalaryMin,
		SalaryMax:       req.SalaryMax,
		Skills:          req.Skills,
		ExperienceYears: req.ExperienceYears,
		Status:          "active",
		PostedAt:        now,
		Deadline:        deadline,
		CreatedBy:       userID,
		UpdatedAt:       now,
	}

	if err := s.repo.CreateJob(ctx, job); err != nil {
		return nil, err
	}
	return job, nil
}

func (s *service) GetJob(ctx context.Context, id string) (*Job, error) {
	job, err := s.repo.GetJob(ctx, id)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return nil, fmt.Errorf("job not found")
	}
	return job, nil
}

func (s *service) ListJobs(ctx context.Context, collegeID string, filters map[string]string) ([]Job, error) {
	return s.repo.ListJobs(ctx, collegeID, filters)
}

func (s *service) UpdateJobStatus(ctx context.Context, id, status string) error {
	job, err := s.repo.GetJob(ctx, id)
	if err != nil {
		return err
	}
	if job == nil {
		return fmt.Errorf("job not found")
	}

	job.Status = status
	return s.repo.UpdateJob(ctx, job)
}

func (s *service) Apply(ctx context.Context, userID string, jobID string) (*JobApplication, error) {
	job, err := s.repo.GetJob(ctx, jobID)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return nil, fmt.Errorf("job not found")
	}

	now := time.Now()
	app := &JobApplication{
		ID:        uuid.New().String(),
		JobID:     jobID,
		UserID:    userID,
		Status:    "pending",
		AppliedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.CreateApplication(ctx, app); err != nil {
		return nil, err
	}
	return app, nil
}

func (s *service) GetMyApplications(ctx context.Context, userID string) ([]JobApplication, error) {
	return s.repo.ListUserApplications(ctx, userID)
}

func (s *service) UpdateApplicationStatus(ctx context.Context, id, status string) error {
	app, err := s.repo.GetApplication(ctx, id)
	if err != nil {
		return err
	}
	if app == nil {
		return fmt.Errorf("application not found")
	}
	return s.repo.UpdateApplicationStatus(ctx, id, status)
}
