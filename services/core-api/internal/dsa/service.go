package dsa

import (
	"context"
	"encoding/json"

	"github.com/nats-io/nats.go"
)

type Service interface {
	CreateProblem(ctx context.Context, userID string, req CreateProblemRequest) (*Problem, error)
	GetProblem(ctx context.Context, id string) (*Problem, error)
	ListProblems(ctx context.Context, filter ProblemFilter) ([]Problem, string, error)
	SubmitCode(ctx context.Context, userID string, req SubmitRequest) (*Submission, error)
	GetSubmission(ctx context.Context, id string) (*Submission, error)
	ListSubmissions(ctx context.Context, userID, problemID string, cursor string) ([]Submission, string, error)
	CreateContest(ctx context.Context, userID string, req CreateContestRequest) (*Contest, error)
	GetContest(ctx context.Context, id string) (*Contest, error)
	ListContests(ctx context.Context, filter ContestFilter) ([]Contest, string, error)
	GetContestLeaderboard(ctx context.Context, contestID string) ([]LeaderboardEntry, error)
	RegisterForContest(ctx context.Context, userID, contestID string) error
	ListDiscussions(ctx context.Context, problemID string, cursor string) ([]DiscussionThread, string, error)
	CreateDiscussion(ctx context.Context, userID, problemID, title, content string) (*DiscussionThread, error)
}

type dsaService struct {
	repo Repository
	js   nats.JetStreamContext
}

func NewService(repo Repository, js nats.JetStreamContext) Service {
	return &dsaService{repo: repo, js: js}
}

func (s *dsaService) CreateProblem(ctx context.Context, userID string, req CreateProblemRequest) (*Problem, error) {
	problem := &Problem{
		Title:         req.Title,
		Description:   req.Description,
		Difficulty:    req.Difficulty,
		TimeLimitMs:   req.TimeLimitMs,
		MemoryLimitMb: req.MemoryLimitMb,
		Topics:        req.Topics,
		SampleInput:   req.SampleInput,
		SampleOutput:  req.SampleOutput,
		IsPublished:   true,
	}
	if problem.Difficulty == "" {
		problem.Difficulty = "easy"
	}
	if problem.TimeLimitMs <= 0 {
		problem.TimeLimitMs = 1000
	}
	if problem.MemoryLimitMb <= 0 {
		problem.MemoryLimitMb = 256
	}

	var testCases []TestCase
	for _, tc := range req.TestCases {
		testCases = append(testCases, TestCase{
			Input:          tc.Input,
			ExpectedOutput: tc.ExpectedOutput,
			IsSample:       tc.IsSample,
			IsHidden:       tc.IsHidden,
		})
	}

	if err := s.repo.CreateProblem(ctx, problem, testCases); err != nil {
		return nil, err
	}
	return problem, nil
}

func (s *dsaService) GetProblem(ctx context.Context, id string) (*Problem, error) {
	return s.repo.GetProblem(ctx, id)
}

func (s *dsaService) ListProblems(ctx context.Context, filter ProblemFilter) ([]Problem, string, error) {
	return s.repo.ListProblems(ctx, filter)
}

func (s *dsaService) SubmitCode(ctx context.Context, userID string, req SubmitRequest) (*Submission, error) {
	submission := &Submission{
		ProblemID:      req.ProblemID,
		UserID:         userID,
		Language:       req.Language,
		Code:           req.Code,
		Verdict:        "Pending",
		ExecutionTimeMs: 0,
		MemoryUsedKb:   0,
		TestCasesPassed: 0,
		TotalTestCases: 0,
		IsPassed:       false,
	}

	if err := s.repo.CreateSubmission(ctx, submission); err != nil {
		return nil, err
	}

	testCases, err := s.repo.GetTestCases(ctx, req.ProblemID)
	if err != nil {
		return nil, err
	}

	submission.TotalTestCases = len(testCases)

	task := JudgeTask{
		SubmissionID: submission.ID,
		Code:         req.Code,
		Language:     req.Language,
		ProblemID:    req.ProblemID,
		TestCases:    testCases,
	}

	data, _ := json.Marshal(task)
	if _, err := s.js.Publish("judge.submissions.run", data); err != nil {
		return nil, err
	}

	return submission, nil
}

func (s *dsaService) GetSubmission(ctx context.Context, id string) (*Submission, error) {
	return s.repo.GetSubmission(ctx, id)
}

func (s *dsaService) ListSubmissions(ctx context.Context, userID, problemID string, cursor string) ([]Submission, string, error) {
	return s.repo.ListSubmissions(ctx, userID, problemID, 20, cursor)
}

func (s *dsaService) CreateContest(ctx context.Context, userID string, req CreateContestRequest) (*Contest, error) {
	contest := &Contest{
		Title:       req.Title,
		Description: req.Description,
		ContestType: req.ContestType,
		ScoringRule: req.ScoringRule,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		IsPublished: true,
		IsRated:     false,
	}
	if contest.ContestType == "" {
		contest.ContestType = "public"
	}
	if contest.ScoringRule == "" {
		contest.ScoringRule = "acm"
	}

	if err := s.repo.CreateContest(ctx, contest); err != nil {
		return nil, err
	}
	return contest, nil
}

func (s *dsaService) GetContest(ctx context.Context, id string) (*Contest, error) {
	return s.repo.GetContest(ctx, id)
}

func (s *dsaService) ListContests(ctx context.Context, filter ContestFilter) ([]Contest, string, error) {
	return s.repo.ListContests(ctx, filter)
}

func (s *dsaService) GetContestLeaderboard(ctx context.Context, contestID string) ([]LeaderboardEntry, error) {
	return s.repo.GetContestLeaderboard(ctx, contestID)
}

func (s *dsaService) RegisterForContest(ctx context.Context, userID, contestID string) error {
	return s.repo.RegisterForContest(ctx, contestID, userID)
}

func (s *dsaService) ListDiscussions(ctx context.Context, problemID string, cursor string) ([]DiscussionThread, string, error) {
	return s.repo.ListDiscussions(ctx, problemID, cursor)
}

func (s *dsaService) CreateDiscussion(ctx context.Context, userID, problemID, title, content string) (*DiscussionThread, error) {
	thread := &DiscussionThread{
		ProblemID: problemID,
		UserID:    userID,
		Title:     title,
		Content:   content,
	}
	if err := s.repo.CreateDiscussion(ctx, thread); err != nil {
		return nil, err
	}
	return thread, nil
}

var _ Service = (*dsaService)(nil)
