package interview

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	CreateQuestion(ctx context.Context, q *InterviewQuestion) error
	GetQuestion(ctx context.Context, id string) (*InterviewQuestion, error)
	ListQuestions(ctx context.Context, collegeID, category, difficulty string) ([]InterviewQuestion, error)
	UpdateQuestion(ctx context.Context, q *InterviewQuestion) error
	DeleteQuestion(ctx context.Context, id string) error

	CreateExperience(ctx context.Context, e *InterviewExperience) error
	GetExperience(ctx context.Context, id string) (*InterviewExperience, error)
	ListExperiences(ctx context.Context, collegeID string) ([]InterviewExperience, error)
	ApproveExperience(ctx context.Context, id string) error

	CreateMockInterview(ctx context.Context, m *MockInterview) error
	GetMockInterview(ctx context.Context, id string) (*MockInterview, error)
	ListMockInterviews(ctx context.Context, studentID string) ([]MockInterview, error)
	UpdateMockInterview(ctx context.Context, m *MockInterview) error
}

type pgRepo struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgRepo{pool: pool}
}

func (r *pgRepo) CreateQuestion(ctx context.Context, q *InterviewQuestion) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO interview_questions (id, college_id, category, question, answer, difficulty, tags, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		q.ID, q.CollegeID, q.Category, q.Question, q.Answer, q.Difficulty, q.Tags, q.CreatedBy)
	return err
}

func (r *pgRepo) GetQuestion(ctx context.Context, id string) (*InterviewQuestion, error) {
	rows, _ := r.pool.Query(ctx, `SELECT id, college_id, category, question, COALESCE(answer,'') as answer, difficulty, tags, COALESCE(created_by,'') as created_by, created_at, updated_at FROM interview_questions WHERE id = $1`, id)
	v, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[InterviewQuestion])
	return &v, err
}

func (r *pgRepo) ListQuestions(ctx context.Context, collegeID, category, difficulty string) ([]InterviewQuestion, error) {
	if category != "" && difficulty != "" {
		rows, _ := r.pool.Query(ctx, `SELECT id, college_id, category, question, COALESCE(answer,'') as answer, difficulty, tags, COALESCE(created_by,'') as created_by, created_at, updated_at FROM interview_questions WHERE college_id = $1 AND category = $2 AND difficulty = $3 ORDER BY created_at DESC`, collegeID, category, difficulty)
		return pgx.CollectRows(rows, pgx.RowToStructByName[InterviewQuestion])
	}
	if category != "" {
		rows, _ := r.pool.Query(ctx, `SELECT id, college_id, category, question, COALESCE(answer,'') as answer, difficulty, tags, COALESCE(created_by,'') as created_by, created_at, updated_at FROM interview_questions WHERE college_id = $1 AND category = $2 ORDER BY created_at DESC`, collegeID, category)
		return pgx.CollectRows(rows, pgx.RowToStructByName[InterviewQuestion])
	}
	if difficulty != "" {
		rows, _ := r.pool.Query(ctx, `SELECT id, college_id, category, question, COALESCE(answer,'') as answer, difficulty, tags, COALESCE(created_by,'') as created_by, created_at, updated_at FROM interview_questions WHERE college_id = $1 AND difficulty = $2 ORDER BY created_at DESC`, collegeID, difficulty)
		return pgx.CollectRows(rows, pgx.RowToStructByName[InterviewQuestion])
	}
	rows, _ := r.pool.Query(ctx, `SELECT id, college_id, category, question, COALESCE(answer,'') as answer, difficulty, tags, COALESCE(created_by,'') as created_by, created_at, updated_at FROM interview_questions WHERE college_id = $1 ORDER BY created_at DESC`, collegeID)
	return pgx.CollectRows(rows, pgx.RowToStructByName[InterviewQuestion])
}

func (r *pgRepo) UpdateQuestion(ctx context.Context, q *InterviewQuestion) error {
	_, err := r.pool.Exec(ctx, `UPDATE interview_questions SET category=$1, question=$2, answer=$3, difficulty=$4, tags=$5, updated_at=now() WHERE id=$6`,
		q.Category, q.Question, q.Answer, q.Difficulty, q.Tags, q.ID)
	return err
}

func (r *pgRepo) DeleteQuestion(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM interview_questions WHERE id = $1`, id)
	return err
}

func (r *pgRepo) CreateExperience(ctx context.Context, e *InterviewExperience) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO interview_experiences (id, student_id, college_id, company, role, rounds, content, tips, is_anonymous) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		e.ID, e.StudentID, e.CollegeID, e.Company, e.Role, e.Rounds, e.Content, e.Tips, e.IsAnonymous)
	return err
}

func (r *pgRepo) GetExperience(ctx context.Context, id string) (*InterviewExperience, error) {
	rows, _ := r.pool.Query(ctx, `SELECT id, student_id, college_id, company, role, rounds, content, COALESCE(tips,'') as tips, is_anonymous, is_approved, created_at FROM interview_experiences WHERE id = $1`, id)
	v, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[InterviewExperience])
	return &v, err
}

func (r *pgRepo) ListExperiences(ctx context.Context, collegeID string) ([]InterviewExperience, error) {
	rows, _ := r.pool.Query(ctx, `SELECT id, student_id, college_id, company, role, rounds, content, COALESCE(tips,'') as tips, is_anonymous, is_approved, created_at FROM interview_experiences WHERE college_id = $1 AND is_approved = true ORDER BY created_at DESC`, collegeID)
	return pgx.CollectRows(rows, pgx.RowToStructByName[InterviewExperience])
}

func (r *pgRepo) ApproveExperience(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE interview_experiences SET is_approved = true WHERE id = $1`, id)
	return err
}

func (r *pgRepo) CreateMockInterview(ctx context.Context, m *MockInterview) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO mock_interviews (id, student_id, peer_id, scheduled_at, duration_min, mode, status) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		m.ID, m.StudentID, m.PeerID, m.ScheduledAt, m.DurationMin, m.Mode, m.Status)
	return err
}

func (r *pgRepo) GetMockInterview(ctx context.Context, id string) (*MockInterview, error) {
	rows, _ := r.pool.Query(ctx, `SELECT id, student_id, COALESCE(peer_id,'') as peer_id, scheduled_at, duration_min, mode, status, COALESCE(feedback,'') as feedback, COALESCE(rating,0) as rating, created_at, updated_at FROM mock_interviews WHERE id = $1`, id)
	v, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[MockInterview])
	return &v, err
}

func (r *pgRepo) ListMockInterviews(ctx context.Context, studentID string) ([]MockInterview, error) {
	rows, _ := r.pool.Query(ctx, `SELECT id, student_id, COALESCE(peer_id,'') as peer_id, scheduled_at, duration_min, mode, status, COALESCE(feedback,'') as feedback, COALESCE(rating,0) as rating, created_at, updated_at FROM mock_interviews WHERE student_id = $1 ORDER BY scheduled_at DESC`, studentID)
	return pgx.CollectRows(rows, pgx.RowToStructByName[MockInterview])
}

func (r *pgRepo) UpdateMockInterview(ctx context.Context, m *MockInterview) error {
	_, err := r.pool.Exec(ctx, `UPDATE mock_interviews SET status=$1, feedback=$2, rating=$3, updated_at=now() WHERE id=$4`,
		m.Status, m.Feedback, m.Rating, m.ID)
	return err
}
