package resume

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Service interface {
	CreateResume(ctx context.Context, studentID string, req *CreateResumeRequest) (*Resume, error)
	GetResume(ctx context.Context, id string) (*Resume, error)
	ListResumes(ctx context.Context, studentID string) ([]Resume, error)
	UpdateResume(ctx context.Context, id string, req *CreateResumeRequest) (*Resume, error)
	DeleteResume(ctx context.Context, id string) error
	SetPrimaryResume(ctx context.Context, studentID, id string) error

	CreateSection(ctx context.Context, resumeID string, req *CreateSectionRequest) (*ResumeSection, error)
	UpdateSection(ctx context.Context, id string, req *UpdateSectionRequest) (*ResumeSection, error)
	DeleteSection(ctx context.Context, id string) error

	ListTemplates(ctx context.Context) ([]ResumeTemplate, error)

	AnalyzeResume(ctx context.Context, id string) (int, error)

	ResolveStudentID(ctx context.Context, userID string) (string, error)
}

type resumeService struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &resumeService{repo: repo}
}

func (s *resumeService) ResolveStudentID(ctx context.Context, userID string) (string, error) {
	return s.repo.GetStudentIDByUserID(ctx, userID)
}

func (s *resumeService) CreateResume(ctx context.Context, studentID string, req *CreateResumeRequest) (*Resume, error) {
	now := time.Now()
	resume := &Resume{
		ID:         uuid.New().String(),
		StudentID:  studentID,
		Title:      req.Title,
		TemplateID: req.TemplateID,
		FileURL:    req.FileURL,
		IsPrimary:  false,
		ATSScore:   0,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := s.repo.CreateResume(ctx, resume); err != nil {
		return nil, err
	}

	var sections []ResumeSection
	for _, sr := range req.Sections {
		section := &ResumeSection{
			ID:          uuid.New().String(),
			ResumeID:    resume.ID,
			SectionType: sr.SectionType,
			Title:       sr.Title,
			Content:     sr.Content,
			SortOrder:   sr.SortOrder,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if err := s.repo.CreateSection(ctx, section); err != nil {
			return nil, err
		}
		sections = append(sections, *section)
	}
	resume.Sections = sections
	return resume, nil
}

func (s *resumeService) GetResume(ctx context.Context, id string) (*Resume, error) {
	return s.repo.GetResume(ctx, id)
}

func (s *resumeService) ListResumes(ctx context.Context, studentID string) ([]Resume, error) {
	return s.repo.ListResumes(ctx, studentID)
}

func (s *resumeService) UpdateResume(ctx context.Context, id string, req *CreateResumeRequest) (*Resume, error) {
	resume, err := s.repo.GetResume(ctx, id)
	if err != nil {
		return nil, err
	}
	resume.Title = req.Title
	resume.TemplateID = req.TemplateID
	resume.FileURL = req.FileURL
	resume.UpdatedAt = time.Now()

	if err := s.repo.UpdateResume(ctx, resume); err != nil {
		return nil, err
	}
	return resume, nil
}

func (s *resumeService) DeleteResume(ctx context.Context, id string) error {
	return s.repo.DeleteResume(ctx, id)
}

func (s *resumeService) SetPrimaryResume(ctx context.Context, studentID, id string) error {
	return s.repo.SetPrimaryResume(ctx, studentID, id)
}

func (s *resumeService) CreateSection(ctx context.Context, resumeID string, req *CreateSectionRequest) (*ResumeSection, error) {
	now := time.Now()
	section := &ResumeSection{
		ID:          uuid.New().String(),
		ResumeID:    resumeID,
		SectionType: req.SectionType,
		Title:       req.Title,
		Content:     req.Content,
		SortOrder:   req.SortOrder,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := s.repo.CreateSection(ctx, section); err != nil {
		return nil, err
	}
	return section, nil
}

func (s *resumeService) UpdateSection(ctx context.Context, id string, req *UpdateSectionRequest) (*ResumeSection, error) {
	section, err := s.repo.GetSection(ctx, id)
	if err != nil {
		return nil, err
	}
	if req.Title != "" {
		section.Title = req.Title
	}
	if req.Content != "" {
		section.Content = req.Content
	}
	if req.SortOrder != 0 {
		section.SortOrder = req.SortOrder
	}
	section.UpdatedAt = time.Now()
	if err := s.repo.UpdateSection(ctx, section); err != nil {
		return nil, err
	}
	return section, nil
}

func (s *resumeService) DeleteSection(ctx context.Context, id string) error {
	return s.repo.DeleteSection(ctx, id)
}

func (s *resumeService) ListTemplates(ctx context.Context) ([]ResumeTemplate, error) {
	return s.repo.ListTemplates(ctx)
}

func (s *resumeService) AnalyzeResume(ctx context.Context, id string) (int, error) {
	resume, err := s.repo.GetResume(ctx, id)
	if err != nil {
		return 0, err
	}

	score := len(resume.Sections) * 10
	if score > 40 {
		score = 40
	}

	var totalLen int
	for _, sec := range resume.Sections {
		totalLen += len(sec.Content)
	}
	contentScore := totalLen / 50
	if contentScore > 60 {
		contentScore = 60
	}
	score += contentScore
	if score > 100 {
		score = 100
	}

	resume.ATSScore = score
	resume.UpdatedAt = time.Now()
	if err := s.repo.UpdateResume(ctx, resume); err != nil {
		return 0, err
	}
	return score, nil
}
