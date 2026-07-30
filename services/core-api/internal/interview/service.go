package interview

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("not found")

type Service interface {
	CreateQuestion(ctx context.Context, collegeID, userID string, req *CreateQuestionRequest) (*InterviewQuestion, error)
	GetQuestion(ctx context.Context, id string) (*InterviewQuestion, error)
	ListQuestions(ctx context.Context, collegeID, category, difficulty string) ([]InterviewQuestion, error)
	UpdateQuestion(ctx context.Context, id string, req *CreateQuestionRequest) (*InterviewQuestion, error)
	DeleteQuestion(ctx context.Context, id string) error

	ShareExperience(ctx context.Context, studentID, collegeID string, req *CreateExperienceRequest) (*InterviewExperience, error)
	GetExperience(ctx context.Context, id string) (*InterviewExperience, error)
	ListExperiences(ctx context.Context, collegeID string) ([]InterviewExperience, error)
	ApproveExperience(ctx context.Context, id string) error

	ScheduleMock(ctx context.Context, studentID string, req *ScheduleMockRequest) (*MockInterview, error)
	GetMockInterview(ctx context.Context, id string) (*MockInterview, error)
	ListMyMocks(ctx context.Context, studentID string) ([]MockInterview, error)
	UpdateMockStatus(ctx context.Context, id, status, feedback string, rating int) error
}

type interviewSvc struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &interviewSvc{repo: repo}
}

func (s *interviewSvc) CreateQuestion(ctx context.Context, collegeID, userID string, req *CreateQuestionRequest) (*InterviewQuestion, error) {
	if req.Difficulty == "" {
		req.Difficulty = "medium"
	}
	q := &InterviewQuestion{
		ID:         uuid.New().String(),
		CollegeID:  collegeID,
		Category:   req.Category,
		Question:   req.Question,
		Answer:     req.Answer,
		Difficulty: req.Difficulty,
		Tags:       req.Tags,
		CreatedBy:  userID,
		CreatedAt:  time.Now(),
	}
	if err := s.repo.CreateQuestion(ctx, q); err != nil {
		return nil, err
	}
	return q, nil
}

func (s *interviewSvc) GetQuestion(ctx context.Context, id string) (*InterviewQuestion, error) {
	q, err := s.repo.GetQuestion(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	return q, nil
}

func (s *interviewSvc) ListQuestions(ctx context.Context, collegeID, category, difficulty string) ([]InterviewQuestion, error) {
	return s.repo.ListQuestions(ctx, collegeID, category, difficulty)
}

func (s *interviewSvc) UpdateQuestion(ctx context.Context, id string, req *CreateQuestionRequest) (*InterviewQuestion, error) {
	q, err := s.repo.GetQuestion(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	q.Category = req.Category
	q.Question = req.Question
	q.Answer = req.Answer
	if req.Difficulty != "" {
		q.Difficulty = req.Difficulty
	}
	q.Tags = req.Tags
	if err := s.repo.UpdateQuestion(ctx, q); err != nil {
		return nil, err
	}
	return q, nil
}

func (s *interviewSvc) DeleteQuestion(ctx context.Context, id string) error {
	return s.repo.DeleteQuestion(ctx, id)
}

func (s *interviewSvc) ShareExperience(ctx context.Context, studentID, collegeID string, req *CreateExperienceRequest) (*InterviewExperience, error) {
	e := &InterviewExperience{
		ID:          uuid.New().String(),
		StudentID:   studentID,
		CollegeID:   collegeID,
		Company:     req.Company,
		Role:        req.Role,
		Rounds:      req.Rounds,
		Content:     req.Content,
		Tips:        req.Tips,
		IsAnonymous: req.IsAnonymous,
		CreatedAt:   time.Now(),
	}
	if err := s.repo.CreateExperience(ctx, e); err != nil {
		return nil, err
	}
	return e, nil
}

func (s *interviewSvc) GetExperience(ctx context.Context, id string) (*InterviewExperience, error) {
	e, err := s.repo.GetExperience(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	return e, nil
}

func (s *interviewSvc) ListExperiences(ctx context.Context, collegeID string) ([]InterviewExperience, error) {
	return s.repo.ListExperiences(ctx, collegeID)
}

func (s *interviewSvc) ApproveExperience(ctx context.Context, id string) error {
	return s.repo.ApproveExperience(ctx, id)
}

func (s *interviewSvc) ScheduleMock(ctx context.Context, studentID string, req *ScheduleMockRequest) (*MockInterview, error) {
	dur := req.DurationMin
	if dur <= 0 {
		dur = 30
	}
	mode := req.Mode
	if mode == "" {
		mode = "peer"
	}
	m := &MockInterview{
		ID:          uuid.New().String(),
		StudentID:   studentID,
		PeerID:      req.PeerID,
		DurationMin: dur,
		Mode:        mode,
		Status:      "scheduled",
		CreatedAt:   time.Now(),
	}
	if req.ScheduledAt != "" {
		t, err := time.Parse(time.RFC3339, req.ScheduledAt)
		if err == nil {
			m.ScheduledAt = t
		}
	}
	if err := s.repo.CreateMockInterview(ctx, m); err != nil {
		return nil, err
	}
	return m, nil
}

func (s *interviewSvc) GetMockInterview(ctx context.Context, id string) (*MockInterview, error) {
	m, err := s.repo.GetMockInterview(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	return m, nil
}

func (s *interviewSvc) ListMyMocks(ctx context.Context, studentID string) ([]MockInterview, error) {
	return s.repo.ListMockInterviews(ctx, studentID)
}

func (s *interviewSvc) UpdateMockStatus(ctx context.Context, id, status, feedback string, rating int) error {
	m, err := s.repo.GetMockInterview(ctx, id)
	if err != nil {
		return ErrNotFound
	}
	m.Status = status
	m.Feedback = feedback
	m.Rating = rating
	return s.repo.UpdateMockInterview(ctx, m)
}
