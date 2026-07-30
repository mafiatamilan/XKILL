package jobs

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	CreateJob(ctx context.Context, job *Job) error
	GetJob(ctx context.Context, id string) (*Job, error)
	ListJobs(ctx context.Context, collegeID string, filters map[string]string) ([]Job, error)
	UpdateJob(ctx context.Context, job *Job) error

	CreateApplication(ctx context.Context, app *JobApplication) error
	GetApplication(ctx context.Context, id string) (*JobApplication, error)
	ListApplications(ctx context.Context, jobID string) ([]JobApplication, error)
	ListUserApplications(ctx context.Context, userID string) ([]JobApplication, error)
	UpdateApplicationStatus(ctx context.Context, id, status string) error
	UpdateApplication(ctx context.Context, app *JobApplication) error
}

type repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{pool: pool}
}

func (r *repository) CreateJob(ctx context.Context, job *Job) error {
	query := `INSERT INTO jobs (id, college_id, company_id, title, description, location, job_type, salary_min, salary_max, skills, experience_years, status, posted_at, deadline, created_by, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`

	_, err := r.pool.Exec(ctx, query,
		job.ID, job.CollegeID, job.CompanyID, job.Title, job.Description,
		job.Location, job.JobType, job.SalaryMin, job.SalaryMax,
		job.Skills, job.ExperienceYears, job.Status, job.PostedAt,
		job.Deadline, job.CreatedBy, job.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create job: %w", err)
	}
	return nil
}

func (r *repository) GetJob(ctx context.Context, id string) (*Job, error) {
	query := `SELECT j.id, j.college_id, j.company_id, COALESCE(c.name, '') as company_name, j.title, j.description, j.location, j.job_type, j.salary_min, j.salary_max, j.skills, j.experience_years, j.status, j.posted_at, j.deadline, j.created_by, j.updated_at
		FROM jobs j
		LEFT JOIN companies c ON j.company_id = c.id
		WHERE j.id = $1`

	rows, err := r.pool.Query(ctx, query, id)
	if err != nil {
		return nil, fmt.Errorf("get job: %w", err)
	}
	defer rows.Close()

	job, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Job])
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get job: %w", err)
	}
	return &job, nil
}

func (r *repository) ListJobs(ctx context.Context, collegeID string, filters map[string]string) ([]Job, error) {
	query := `SELECT j.id, j.college_id, j.company_id, COALESCE(c.name, '') as company_name, j.title, j.description, j.location, j.job_type, j.salary_min, j.salary_max, j.skills, j.experience_years, j.status, j.posted_at, j.deadline, j.created_by, j.updated_at
		FROM jobs j
		LEFT JOIN companies c ON j.company_id = c.id
		WHERE j.college_id = $1`

	args := []any{collegeID}
	argIdx := 2

	if status, ok := filters["status"]; ok {
		query += fmt.Sprintf(" AND j.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if jobType, ok := filters["job_type"]; ok {
		query += fmt.Sprintf(" AND j.job_type = $%d", argIdx)
		args = append(args, jobType)
		argIdx++
	}
	if title, ok := filters["title"]; ok {
		query += fmt.Sprintf(" AND j.title ILIKE $%d", argIdx)
		args = append(args, "%"+title+"%")
		argIdx++
	}

	query += " ORDER BY j.posted_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list jobs: %w", err)
	}
	defer rows.Close()

	jobs, err := pgx.CollectRows(rows, pgx.RowToStructByName[Job])
	if err != nil {
		return nil, fmt.Errorf("list jobs: %w", err)
	}
	return jobs, nil
}

func (r *repository) UpdateJob(ctx context.Context, job *Job) error {
	query := `UPDATE jobs SET title=$2, description=$3, location=$4, job_type=$5, salary_min=$6, salary_max=$7, skills=$8, experience_years=$9, status=$10, deadline=$11, updated_at=NOW()
		WHERE id=$1`

	_, err := r.pool.Exec(ctx, query,
		job.ID, job.Title, job.Description, job.Location, job.JobType,
		job.SalaryMin, job.SalaryMax, job.Skills, job.ExperienceYears,
		job.Status, job.Deadline,
	)
	if err != nil {
		return fmt.Errorf("update job: %w", err)
	}
	return nil
}

func (r *repository) CreateApplication(ctx context.Context, app *JobApplication) error {
	query := `INSERT INTO job_applications (id, job_id, user_id, status, notes, applied_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := r.pool.Exec(ctx, query,
		app.ID, app.JobID, app.UserID, app.Status, app.Notes,
		app.AppliedAt, app.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create application: %w", err)
	}
	return nil
}

func (r *repository) GetApplication(ctx context.Context, id string) (*JobApplication, error) {
	query := `SELECT id, job_id, user_id, status, notes, applied_at, updated_at
		FROM job_applications WHERE id = $1`

	rows, err := r.pool.Query(ctx, query, id)
	if err != nil {
		return nil, fmt.Errorf("get application: %w", err)
	}
	defer rows.Close()

	app, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[JobApplication])
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get application: %w", err)
	}
	return &app, nil
}

func (r *repository) ListApplications(ctx context.Context, jobID string) ([]JobApplication, error) {
	query := `SELECT id, job_id, user_id, status, notes, applied_at, updated_at
		FROM job_applications WHERE job_id = $1 ORDER BY applied_at DESC`

	rows, err := r.pool.Query(ctx, query, jobID)
	if err != nil {
		return nil, fmt.Errorf("list applications: %w", err)
	}
	defer rows.Close()

	apps, err := pgx.CollectRows(rows, pgx.RowToStructByName[JobApplication])
	if err != nil {
		return nil, fmt.Errorf("list applications: %w", err)
	}
	return apps, nil
}

func (r *repository) ListUserApplications(ctx context.Context, userID string) ([]JobApplication, error) {
	query := `SELECT id, job_id, user_id, status, notes, applied_at, updated_at
		FROM job_applications WHERE user_id = $1 ORDER BY applied_at DESC`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("list user applications: %w", err)
	}
	defer rows.Close()

	apps, err := pgx.CollectRows(rows, pgx.RowToStructByName[JobApplication])
	if err != nil {
		return nil, fmt.Errorf("list user applications: %w", err)
	}
	return apps, nil
}

func (r *repository) UpdateApplicationStatus(ctx context.Context, id, status string) error {
	query := `UPDATE job_applications SET status=$2, updated_at=NOW() WHERE id=$1`

	_, err := r.pool.Exec(ctx, query, id, status)
	if err != nil {
		return fmt.Errorf("update application status: %w", err)
	}
	return nil
}

func (r *repository) UpdateApplication(ctx context.Context, app *JobApplication) error {
	query := `UPDATE job_applications SET status=$2, notes=$3, updated_at=NOW() WHERE id=$1`

	_, err := r.pool.Exec(ctx, query, app.ID, app.Status, app.Notes)
	if err != nil {
		return fmt.Errorf("update application: %w", err)
	}
	return nil
}
