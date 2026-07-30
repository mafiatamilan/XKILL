package placement

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Service interface {
	CreateDrive(ctx context.Context, collegeID, userID string, req *CreateDriveRequest) (*Drive, error)
	GetDrive(ctx context.Context, id string) (*Drive, *DriveEligibility, error)
	ListDrives(ctx context.Context, collegeID, status string) ([]Drive, error)
	UpdateDriveStatus(ctx context.Context, id, status string) error

	Apply(ctx context.Context, studentID string, req *ApplyRequest) (*Application, error)
	GetApplications(ctx context.Context, driveID string) ([]Application, error)
	GetMyApplications(ctx context.Context, studentID string) ([]Application, error)
	UpdateApplicationStatus(ctx context.Context, id, status string) error

	GetPlacementStats(ctx context.Context, collegeID string) (*PlacementStat, error)
}

type placementSvc struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &placementSvc{repo: repo}
}

func (s *placementSvc) CreateDrive(ctx context.Context, collegeID, userID string, req *CreateDriveRequest) (*Drive, error) {
	now := time.Now()

	var deadline time.Time
	if req.Deadline != "" {
		var err error
		deadline, err = time.Parse(time.RFC3339, req.Deadline)
		if err != nil {
			deadline, err = time.Parse("2006-01-02T15:04:05Z07:00", req.Deadline)
			if err != nil {
				return nil, fmt.Errorf("invalid deadline format: %w", err)
			}
		}
	}

	drive := &Drive{
		ID:          uuid.New().String(),
		CollegeID:   collegeID,
		CompanyID:   req.CompanyID,
		CompanyName: req.CompanyName,
		Role:        req.Role,
		PackageMin:  req.PackageMin,
		PackageMax:  req.PackageMax,
		Location:    req.Location,
		Description: req.Description,
		DriveDate:   req.DriveDate,
		Deadline:    deadline,
		Status:      "upcoming",
		CreatedBy:   userID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.CreateDrive(ctx, drive); err != nil {
		return nil, err
	}

	elig := &DriveEligibility{
		ID:              uuid.New().String(),
		DriveID:         drive.ID,
		MinCGPA:         req.MinCGPA,
		MaxBacklogs:     req.MaxBacklogs,
		AllowedBranches: req.AllowedBranches,
		AllowedYears:    req.AllowedYears,
	}
	if err := s.repo.SetEligibility(ctx, elig); err != nil {
		return nil, err
	}

	return drive, nil
}

func (s *placementSvc) GetDrive(ctx context.Context, id string) (*Drive, *DriveEligibility, error) {
	drive, err := s.repo.GetDrive(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	if drive == nil {
		return nil, nil, nil
	}

	elig, err := s.repo.GetEligibility(ctx, id)
	if err != nil {
		return nil, nil, err
	}

	return drive, elig, nil
}

func (s *placementSvc) ListDrives(ctx context.Context, collegeID, status string) ([]Drive, error) {
	return s.repo.ListDrives(ctx, collegeID, status)
}

func (s *placementSvc) UpdateDriveStatus(ctx context.Context, id, status string) error {
	drive, err := s.repo.GetDrive(ctx, id)
	if err != nil {
		return err
	}
	if drive == nil {
		return fmt.Errorf("drive not found")
	}
	drive.Status = status
	return s.repo.UpdateDrive(ctx, drive)
}

func (s *placementSvc) Apply(ctx context.Context, studentID string, req *ApplyRequest) (*Application, error) {
	drive, err := s.repo.GetDrive(ctx, req.DriveID)
	if err != nil {
		return nil, err
	}
	if drive == nil {
		return nil, fmt.Errorf("drive not found")
	}
	if drive.Status != "upcoming" {
		return nil, fmt.Errorf("drive is not accepting applications")
	}

	now := time.Now()
	app := &Application{
		ID:        uuid.New().String(),
		DriveID:   req.DriveID,
		StudentID: studentID,
		Status:    "pending",
		AppliedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.CreateApplication(ctx, app); err != nil {
		return nil, err
	}
	return app, nil
}

func (s *placementSvc) GetApplications(ctx context.Context, driveID string) ([]Application, error) {
	return s.repo.ListApplications(ctx, driveID)
}

func (s *placementSvc) GetMyApplications(ctx context.Context, studentID string) ([]Application, error) {
	return s.repo.ListStudentApplications(ctx, studentID)
}

func (s *placementSvc) UpdateApplicationStatus(ctx context.Context, id, status string) error {
	app, err := s.repo.GetApplication(ctx, id)
	if err != nil {
		return err
	}
	if app == nil {
		return fmt.Errorf("application not found")
	}
	return s.repo.UpdateApplicationStatus(ctx, id, status)
}

func (s *placementSvc) GetPlacementStats(ctx context.Context, collegeID string) (*PlacementStat, error) {
	return s.repo.GetPlacementStats(ctx, collegeID)
}
