package career

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	ListCareerPaths(ctx context.Context) ([]CareerPath, error)
	GetCareerPath(ctx context.Context, id string) (*CareerPath, error)
	CreateResource(ctx context.Context, r *CareerResource) error
	ListResources(ctx context.Context, collegeID string, tags []string) ([]CareerResource, error)
	DeleteResource(ctx context.Context, id string) error
	CreateMentorSession(ctx context.Context, s *MentorSession) error
	ListMentorSessions(ctx context.Context, studentID string) ([]MentorSession, error)
}

type pgRepo struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgRepo{pool: pool}
}

func (r *pgRepo) ListCareerPaths(ctx context.Context) ([]CareerPath, error) {
	rows, _ := r.pool.Query(ctx, `SELECT id, title, description, skills, avg_salary, growth_rate, required_education, created_at FROM career_paths ORDER BY title`)
	return pgx.CollectRows(rows, pgx.RowToStructByName[CareerPath])
}

func (r *pgRepo) GetCareerPath(ctx context.Context, id string) (*CareerPath, error) {
	rows, _ := r.pool.Query(ctx, `SELECT id, title, description, skills, avg_salary, growth_rate, required_education, created_at FROM career_paths WHERE id = $1`, id)
	v, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[CareerPath])
	return &v, err
}

func (r *pgRepo) CreateResource(ctx context.Context, res *CareerResource) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO career_resources (id, college_id, title, resource_type, url, content, tags, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		res.ID, res.CollegeID, res.Title, res.ResourceType, res.URL, res.Content, res.Tags, res.CreatedBy)
	return err
}

func (r *pgRepo) ListResources(ctx context.Context, collegeID string, tags []string) ([]CareerResource, error) {
	if len(tags) > 0 {
		rows, _ := r.pool.Query(ctx, `SELECT id, college_id, title, resource_type, COALESCE(url,'') as url, COALESCE(content,'') as content, tags, COALESCE(created_by,'') as created_by, created_at FROM career_resources WHERE college_id = $1 AND tags && $2 ORDER BY created_at DESC`, collegeID, tags)
		return pgx.CollectRows(rows, pgx.RowToStructByName[CareerResource])
	}
	rows, _ := r.pool.Query(ctx, `SELECT id, college_id, title, resource_type, COALESCE(url,'') as url, COALESCE(content,'') as content, tags, COALESCE(created_by,'') as created_by, created_at FROM career_resources WHERE college_id = $1 ORDER BY created_at DESC`, collegeID)
	return pgx.CollectRows(rows, pgx.RowToStructByName[CareerResource])
}

func (r *pgRepo) DeleteResource(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM career_resources WHERE id = $1`, id)
	return err
}

func (r *pgRepo) CreateMentorSession(ctx context.Context, s *MentorSession) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO mentor_sessions (id, mentor_id, student_id, topic, scheduled_at, status) VALUES ($1,$2,$3,$4,$5,$6)`,
		s.ID, s.MentorID, s.StudentID, s.Topic, s.ScheduledAt, s.Status)
	return err
}

func (r *pgRepo) ListMentorSessions(ctx context.Context, studentID string) ([]MentorSession, error) {
	rows, _ := r.pool.Query(ctx, `SELECT id, mentor_id, student_id, topic, scheduled_at, status, created_at FROM mentor_sessions WHERE student_id = $1 ORDER BY scheduled_at DESC`, studentID)
	return pgx.CollectRows(rows, pgx.RowToStructByName[MentorSession])
}
