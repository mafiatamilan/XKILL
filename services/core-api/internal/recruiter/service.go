package recruiter

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Service interface {
	CreateCompany(ctx context.Context, collegeID string, req *CreateCompanyRequest) (*Company, error)
	GetCompany(ctx context.Context, id string) (*Company, error)
	ListCompanies(ctx context.Context, collegeID string) ([]Company, error)
	UpdateCompany(ctx context.Context, id string, req *CreateCompanyRequest) (*Company, error)
	VerifyCompany(ctx context.Context, id, actorID string) error

	RegisterRecruiter(ctx context.Context, userID, collegeID string, req *CreateRecruiterRequest) (*Recruiter, error)
	GetRecruiter(ctx context.Context, id string) (*Recruiter, error)
	GetMyProfile(ctx context.Context, userID string) (*Recruiter, error)
	VerifyRecruiter(ctx context.Context, id string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateCompany(ctx context.Context, collegeID string, req *CreateCompanyRequest) (*Company, error) {
	now := time.Now()
	company := &Company{
		ID:          uuid.New().String(),
		CollegeID:   collegeID,
		Name:        req.Name,
		LogoURL:     req.LogoURL,
		Website:     req.Website,
		Description: req.Description,
		Industry:    req.Industry,
		Size:        req.Size,
		IsVerified:  false,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.CreateCompany(ctx, company); err != nil {
		return nil, err
	}
	return company, nil
}

func (s *service) GetCompany(ctx context.Context, id string) (*Company, error) {
	company, err := s.repo.GetCompany(ctx, id)
	if err != nil {
		return nil, err
	}
	if company == nil {
		return nil, fmt.Errorf("company not found")
	}
	return company, nil
}

func (s *service) ListCompanies(ctx context.Context, collegeID string) ([]Company, error) {
	return s.repo.ListCompanies(ctx, collegeID)
}

func (s *service) UpdateCompany(ctx context.Context, id string, req *CreateCompanyRequest) (*Company, error) {
	company, err := s.repo.GetCompany(ctx, id)
	if err != nil {
		return nil, err
	}
	if company == nil {
		return nil, fmt.Errorf("company not found")
	}

	company.Name = req.Name
	company.LogoURL = req.LogoURL
	company.Website = req.Website
	company.Description = req.Description
	company.Industry = req.Industry
	company.Size = req.Size

	if err := s.repo.UpdateCompany(ctx, company); err != nil {
		return nil, err
	}

	updated, err := s.repo.GetCompany(ctx, id)
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *service) VerifyCompany(ctx context.Context, id, actorID string) error {
	return s.repo.VerifyCompany(ctx, id)
}

func (s *service) RegisterRecruiter(ctx context.Context, userID, collegeID string, req *CreateRecruiterRequest) (*Recruiter, error) {
	now := time.Now()
	recruiter := &Recruiter{
		ID:          uuid.New().String(),
		UserID:      userID,
		CompanyID:   req.CompanyID,
		CollegeID:   collegeID,
		Designation: req.Designation,
		IsVerified:  false,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.CreateRecruiter(ctx, recruiter); err != nil {
		return nil, err
	}
	return recruiter, nil
}

func (s *service) GetRecruiter(ctx context.Context, id string) (*Recruiter, error) {
	recruiter, err := s.repo.GetRecruiter(ctx, id)
	if err != nil {
		return nil, err
	}
	if recruiter == nil {
		return nil, fmt.Errorf("recruiter not found")
	}
	return recruiter, nil
}

func (s *service) GetMyProfile(ctx context.Context, userID string) (*Recruiter, error) {
	recruiter, err := s.repo.GetRecruiterByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if recruiter == nil {
		return nil, fmt.Errorf("recruiter profile not found")
	}
	return recruiter, nil
}

func (s *service) VerifyRecruiter(ctx context.Context, id string) error {
	return s.repo.VerifyRecruiter(ctx, id)
}
