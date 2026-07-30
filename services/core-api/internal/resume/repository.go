package resume

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("resource not found")

type Repository interface {
	GetStudentIDByUserID(ctx context.Context, userID string) (string, error)

	CreateResume(ctx context.Context, r *Resume) error
	GetResume(ctx context.Context, id string) (*Resume, error)
	ListResumes(ctx context.Context, studentID string) ([]Resume, error)
	UpdateResume(ctx context.Context, r *Resume) error
	DeleteResume(ctx context.Context, id string) error
	SetPrimaryResume(ctx context.Context, studentID, id string) error

	CreateSection(ctx context.Context, s *ResumeSection) error
	GetSection(ctx context.Context, id string) (*ResumeSection, error)
	GetSections(ctx context.Context, resumeID string) ([]ResumeSection, error)
	UpdateSection(ctx context.Context, s *ResumeSection) error
	DeleteSection(ctx context.Context, id string) error
	DeleteSectionsByResume(ctx context.Context, resumeID string) error

	ListTemplates(ctx context.Context) ([]ResumeTemplate, error)
	GetTemplate(ctx context.Context, id string) (*ResumeTemplate, error)
}

type postgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

func (r *postgresRepository) GetStudentIDByUserID(ctx context.Context, userID string) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx,
		`SELECT id FROM student_profiles WHERE user_id = $1`, userID,
	).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", err
	}
	return id, nil
}

func (r *postgresRepository) CreateResume(ctx context.Context, re *Resume) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO resumes (id, student_id, title, template_id, file_url, is_primary, ats_score, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		re.ID, re.StudentID, re.Title, nullString(re.TemplateID),
		nullString(re.FileURL), re.IsPrimary, re.ATSScore, re.CreatedAt, re.UpdatedAt,
	)
	return err
}

func (r *postgresRepository) GetResume(ctx context.Context, id string) (*Resume, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, student_id, title, COALESCE(template_id::text, '') AS template_id,
		        COALESCE(file_url, '') AS file_url, is_primary, ats_score, created_at, updated_at
		 FROM resumes WHERE id = $1`, id,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	resume, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Resume])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	sections, err := r.GetSections(ctx, id)
	if err != nil {
		return nil, err
	}
	resume.Sections = sections
	return &resume, nil
}

func (r *postgresRepository) ListResumes(ctx context.Context, studentID string) ([]Resume, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, student_id, title, COALESCE(template_id::text, '') AS template_id,
		        COALESCE(file_url, '') AS file_url, is_primary, ats_score, created_at, updated_at
		 FROM resumes WHERE student_id = $1 ORDER BY created_at DESC`, studentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, pgx.RowToStructByName[Resume])
}

func (r *postgresRepository) UpdateResume(ctx context.Context, re *Resume) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE resumes SET title=$1, template_id=$2, file_url=$3, is_primary=$4, ats_score=$5, updated_at=$6
		 WHERE id=$7`,
		re.Title, nullString(re.TemplateID), nullString(re.FileURL),
		re.IsPrimary, re.ATSScore, re.UpdatedAt, re.ID,
	)
	return err
}

func (r *postgresRepository) DeleteResume(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM resumes WHERE id = $1`, id)
	return err
}

func (r *postgresRepository) SetPrimaryResume(ctx context.Context, studentID, id string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE resumes SET is_primary = (id = $2) WHERE student_id = $1`, studentID, id,
	)
	return err
}

func (r *postgresRepository) CreateSection(ctx context.Context, s *ResumeSection) error {
	s.ID = uuid.New().String()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO resume_sections (id, resume_id, section_type, title, content, sort_order, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		s.ID, s.ResumeID, s.SectionType, nullString(s.Title),
		json.RawMessage(s.Content), s.SortOrder, s.CreatedAt, s.UpdatedAt,
	)
	return err
}

func (r *postgresRepository) GetSection(ctx context.Context, id string) (*ResumeSection, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, resume_id, section_type, COALESCE(title, '') AS title,
		        content, sort_order, created_at, updated_at
		 FROM resume_sections WHERE id = $1`, id,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	section, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[ResumeSection])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &section, nil
}

func (r *postgresRepository) GetSections(ctx context.Context, resumeID string) ([]ResumeSection, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, resume_id, section_type, COALESCE(title, '') AS title,
		        content, sort_order, created_at, updated_at
		 FROM resume_sections WHERE resume_id = $1 ORDER BY sort_order`, resumeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, pgx.RowToStructByName[ResumeSection])
}

func (r *postgresRepository) UpdateSection(ctx context.Context, s *ResumeSection) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE resume_sections SET title=$1, content=$2, sort_order=$3, updated_at=$4 WHERE id=$5`,
		nullString(s.Title), json.RawMessage(s.Content), s.SortOrder, s.UpdatedAt, s.ID,
	)
	return err
}

func (r *postgresRepository) DeleteSection(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM resume_sections WHERE id = $1`, id)
	return err
}

func (r *postgresRepository) DeleteSectionsByResume(ctx context.Context, resumeID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM resume_sections WHERE resume_id = $1`, resumeID)
	return err
}

func (r *postgresRepository) ListTemplates(ctx context.Context) ([]ResumeTemplate, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, COALESCE(description, '') AS description,
		        COALESCE(preview_url, '') AS preview_url, is_active, created_at
		 FROM resume_templates WHERE is_active = true ORDER BY name`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return pgx.CollectRows(rows, pgx.RowToStructByName[ResumeTemplate])
}

func (r *postgresRepository) GetTemplate(ctx context.Context, id string) (*ResumeTemplate, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, COALESCE(description, '') AS description,
		        COALESCE(preview_url, '') AS preview_url, is_active, created_at
		 FROM resume_templates WHERE id = $1`, id,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	t, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[ResumeTemplate])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &t, nil
}

func nullString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
