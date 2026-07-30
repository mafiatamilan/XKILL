package resume

import "time"

type ResumeTemplate struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	PreviewURL  string    `json:"preview_url,omitempty"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

type Resume struct {
	ID         string           `json:"id"`
	StudentID  string           `json:"student_id"`
	Title      string           `json:"title"`
	TemplateID string           `json:"template_id,omitempty"`
	FileURL    string           `json:"file_url,omitempty"`
	IsPrimary  bool             `json:"is_primary"`
	ATSScore   int              `json:"ats_score"`
	Sections   []ResumeSection  `json:"sections,omitempty"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
}

type ResumeSection struct {
	ID          string    `json:"id"`
	ResumeID    string    `json:"resume_id"`
	SectionType string    `json:"section_type"`
	Title       string    `json:"title,omitempty"`
	Content     string    `json:"content"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateResumeRequest struct {
	Title      string                 `json:"title" binding:"required"`
	TemplateID string                 `json:"template_id"`
	FileURL    string                 `json:"file_url"`
	Sections   []CreateSectionRequest `json:"sections"`
}

type CreateSectionRequest struct {
	SectionType string `json:"section_type" binding:"required"`
	Title       string `json:"title"`
	Content     string `json:"content" binding:"required"`
	SortOrder   int    `json:"sort_order"`
}

type UpdateSectionRequest struct {
	Title     string `json:"title"`
	Content   string `json:"content"`
	SortOrder int    `json:"sort_order"`
}
