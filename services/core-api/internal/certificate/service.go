package certificate

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Service interface {
	CreateCertificate(ctx context.Context, userID, collegeID string, req *CreateCertificateRequest) (*Certificate, error)
	GetCertificate(ctx context.Context, id string) (*Certificate, error)
	ListMyCertificates(ctx context.Context, userID string) ([]Certificate, error)
	ListCollegeCertificates(ctx context.Context, collegeID string) ([]Certificate, error)
	DeleteCertificate(ctx context.Context, id, userID string) error
	VerifyCertificate(ctx context.Context, id, verifiedBy string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateCertificate(ctx context.Context, userID, collegeID string, req *CreateCertificateRequest) (*Certificate, error) {
	now := time.Now()

	cert := &Certificate{
		ID:            uuid.New().String(),
		UserID:        userID,
		CollegeID:     collegeID,
		Title:         req.Title,
		Issuer:        req.Issuer,
		IssueDate:     req.IssueDate,
		ExpiryDate:    req.ExpiryDate,
		CredentialID:  req.CredentialID,
		CredentialURL: req.CredentialURL,
		FileURL:       req.FileURL,
		Category:      req.Category,
		IsVerified:    false,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := s.repo.CreateCertificate(ctx, cert); err != nil {
		return nil, err
	}
	return cert, nil
}

func (s *service) GetCertificate(ctx context.Context, id string) (*Certificate, error) {
	cert, err := s.repo.GetCertificate(ctx, id)
	if err != nil {
		return nil, err
	}
	if cert == nil {
		return nil, fmt.Errorf("certificate not found")
	}
	return cert, nil
}

func (s *service) ListMyCertificates(ctx context.Context, userID string) ([]Certificate, error) {
	return s.repo.ListCertificates(ctx, userID)
}

func (s *service) ListCollegeCertificates(ctx context.Context, collegeID string) ([]Certificate, error) {
	return s.repo.ListCertificatesByCollege(ctx, collegeID)
}

func (s *service) DeleteCertificate(ctx context.Context, id, userID string) error {
	cert, err := s.repo.GetCertificate(ctx, id)
	if err != nil {
		return err
	}
	if cert == nil {
		return fmt.Errorf("certificate not found")
	}
	if cert.UserID != userID {
		return fmt.Errorf("forbidden")
	}
	return s.repo.DeleteCertificate(ctx, id)
}

func (s *service) VerifyCertificate(ctx context.Context, id, verifiedBy string) error {
	cert, err := s.repo.GetCertificate(ctx, id)
	if err != nil {
		return err
	}
	if cert == nil {
		return fmt.Errorf("certificate not found")
	}
	return s.repo.VerifyCertificate(ctx, id, verifiedBy)
}
