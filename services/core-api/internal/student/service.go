package student

import (
	"context"
	"errors"
)

type Service interface {
	GetProfile(ctx context.Context, userID string) (*StudentProfile, error)
	UpdateProfile(ctx context.Context, userID string, req UpdateProfileRequest) (*StudentProfile, error)
	ListSkills(ctx context.Context, userID string) ([]Skill, error)
	AddSkill(ctx context.Context, userID string, req AddSkillRequest) (*Skill, error)
	RemoveSkill(ctx context.Context, userID, skillID string) error
	ListCareerGoals(ctx context.Context, userID string) ([]CareerGoal, error)
	AddCareerGoal(ctx context.Context, userID string, req AddCareerGoalRequest) (*CareerGoal, error)
	UpdateCareerGoal(ctx context.Context, userID, goalID string, req AddCareerGoalRequest) (*CareerGoal, error)
	RemoveCareerGoal(ctx context.Context, userID, goalID string) error
}

type studentService struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &studentService{repo: repo}
}

func (s *studentService) GetProfile(ctx context.Context, userID string) (*StudentProfile, error) {
	return s.repo.GetProfile(ctx, userID)
}

func (s *studentService) UpdateProfile(ctx context.Context, userID string, req UpdateProfileRequest) (*StudentProfile, error) {
	existing, err := s.repo.GetProfile(ctx, userID)
	if err != nil && !errors.Is(err, ErrProfileNotFound) {
		return nil, err
	}
	if existing != nil {
		existing.DepartmentID = req.DepartmentID
		existing.EnrollmentNumber = req.EnrollmentNumber
		existing.Batch = req.Batch
		existing.DateOfBirth = req.DateOfBirth
		existing.Gender = req.Gender
		existing.Category = req.Category
		existing.City = req.City
		existing.State = req.State
		if err := s.repo.UpsertProfile(ctx, existing); err != nil {
			return nil, err
		}
		return existing, nil
	}

	collegeID := ""
	profile := &StudentProfile{
		UserID:           userID,
		CollegeID:        collegeID,
		DepartmentID:     req.DepartmentID,
		EnrollmentNumber: req.EnrollmentNumber,
		Batch:            req.Batch,
		DateOfBirth:      req.DateOfBirth,
		Gender:           req.Gender,
		Category:         req.Category,
		City:             req.City,
		State:            req.State,
	}
	if err := s.repo.UpsertProfile(ctx, profile); err != nil {
		return nil, err
	}
	return profile, nil
}

func (s *studentService) ListSkills(ctx context.Context, userID string) ([]Skill, error) {
	profile, err := s.repo.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.repo.GetSkills(ctx, profile.ID)
}

func (s *studentService) AddSkill(ctx context.Context, userID string, req AddSkillRequest) (*Skill, error) {
	profile, err := s.repo.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}
	skill := &Skill{
		StudentID:        profile.ID,
		Name:             req.Name,
		Category:         req.Category,
		ProficiencyLevel: req.ProficiencyLevel,
	}
	if err := s.repo.AddSkill(ctx, skill); err != nil {
		return nil, err
	}
	return skill, nil
}

func (s *studentService) RemoveSkill(ctx context.Context, userID, skillID string) error {
	profile, err := s.repo.GetProfile(ctx, userID)
	if err != nil {
		return err
	}
	return s.repo.RemoveSkill(ctx, skillID, profile.ID)
}

func (s *studentService) ListCareerGoals(ctx context.Context, userID string) ([]CareerGoal, error) {
	profile, err := s.repo.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.repo.GetCareerGoals(ctx, profile.ID)
}

func (s *studentService) AddCareerGoal(ctx context.Context, userID string, req AddCareerGoalRequest) (*CareerGoal, error) {
	profile, err := s.repo.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}
	goal := &CareerGoal{
		StudentID:     profile.ID,
		Title:         req.Title,
		TargetRole:    req.TargetRole,
		TargetCompany: req.TargetCompany,
		TargetDate:    req.TargetDate,
		Status:        "active",
		Notes:         req.Notes,
	}
	if err := s.repo.AddCareerGoal(ctx, goal); err != nil {
		return nil, err
	}
	return goal, nil
}

func (s *studentService) UpdateCareerGoal(ctx context.Context, userID, goalID string, req AddCareerGoalRequest) (*CareerGoal, error) {
	profile, err := s.repo.GetProfile(ctx, userID)
	if err != nil {
		return nil, err
	}

	goals, err := s.repo.GetCareerGoals(ctx, profile.ID)
	if err != nil {
		return nil, err
	}

	var existing *CareerGoal
	for _, g := range goals {
		if g.ID == goalID {
			existing = &g
			break
		}
	}
	if existing == nil {
		return nil, ErrGoalNotFound
	}

	existing.Title = req.Title
	existing.TargetRole = req.TargetRole
	existing.TargetCompany = req.TargetCompany
	existing.TargetDate = req.TargetDate
	existing.Notes = req.Notes

	if err := s.repo.UpdateCareerGoal(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *studentService) RemoveCareerGoal(ctx context.Context, userID, goalID string) error {
	profile, err := s.repo.GetProfile(ctx, userID)
	if err != nil {
		return err
	}
	return s.repo.RemoveCareerGoal(ctx, goalID, profile.ID)
}

var _ Service = (*studentService)(nil)
var _ Repository = (*postgresRepository)(nil)
