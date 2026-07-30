package recruiter

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	CreateCompany(ctx context.Context, company *Company) error
	GetCompany(ctx context.Context, id string) (*Company, error)
	GetCompanyByID(ctx context.Context, id string) (*Company, error)
	ListCompanies(ctx context.Context, collegeID string) ([]Company, error)
	UpdateCompany(ctx context.Context, company *Company) error
	VerifyCompany(ctx context.Context, id string) error

	CreateRecruiter(ctx context.Context, recruiter *Recruiter) error
	GetRecruiter(ctx context.Context, id string) (*Recruiter, error)
	GetRecruiterByUserID(ctx context.Context, userID string) (*Recruiter, error)
	ListRecruiters(ctx context.Context, collegeID string) ([]Recruiter, error)
	VerifyRecruiter(ctx context.Context, id string) error
	UpdateRecruiter(ctx context.Context, recruiter *Recruiter) error
}

type repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{pool: pool}
}

func (r *repository) CreateCompany(ctx context.Context, company *Company) error {
	query := `INSERT INTO companies (id, college_id, name, logo_url, website, description, industry, size, is_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	_, err := r.pool.Exec(ctx, query,
		company.ID, company.CollegeID, company.Name, company.LogoURL,
		company.Website, company.Description, company.Industry, company.Size,
		company.IsVerified, company.CreatedAt, company.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create company: %w", err)
	}
	return nil
}

func (r *repository) GetCompany(ctx context.Context, id string) (*Company, error) {
	query := `SELECT id, college_id, name, logo_url, website, description, industry, size, is_verified, created_at, updated_at
		FROM companies WHERE id = $1`

	rows, err := r.pool.Query(ctx, query, id)
	if err != nil {
		return nil, fmt.Errorf("get company: %w", err)
	}
	defer rows.Close()

	company, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Company])
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get company: %w", err)
	}
	return &company, nil
}

func (r *repository) GetCompanyByID(ctx context.Context, id string) (*Company, error) {
	return r.GetCompany(ctx, id)
}

func (r *repository) ListCompanies(ctx context.Context, collegeID string) ([]Company, error) {
	query := `SELECT id, college_id, name, logo_url, website, description, industry, size, is_verified, created_at, updated_at
		FROM companies WHERE college_id = $1 ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, collegeID)
	if err != nil {
		return nil, fmt.Errorf("list companies: %w", err)
	}
	defer rows.Close()

	companies, err := pgx.CollectRows(rows, pgx.RowToStructByName[Company])
	if err != nil {
		return nil, fmt.Errorf("list companies: %w", err)
	}
	return companies, nil
}

func (r *repository) UpdateCompany(ctx context.Context, company *Company) error {
	query := `UPDATE companies SET name=$2, logo_url=$3, website=$4, description=$5, industry=$6, size=$7, updated_at=NOW()
		WHERE id=$1`

	_, err := r.pool.Exec(ctx, query,
		company.ID, company.Name, company.LogoURL, company.Website,
		company.Description, company.Industry, company.Size,
	)
	if err != nil {
		return fmt.Errorf("update company: %w", err)
	}
	return nil
}

func (r *repository) VerifyCompany(ctx context.Context, id string) error {
	query := `UPDATE companies SET is_verified=true, updated_at=NOW() WHERE id=$1`

	_, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("verify company: %w", err)
	}
	return nil
}

func (r *repository) CreateRecruiter(ctx context.Context, recruiter *Recruiter) error {
	query := `INSERT INTO recruiter_profiles (id, user_id, company_id, college_id, designation, is_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := r.pool.Exec(ctx, query,
		recruiter.ID, recruiter.UserID, recruiter.CompanyID, recruiter.CollegeID,
		recruiter.Designation, recruiter.IsVerified, recruiter.CreatedAt, recruiter.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create recruiter: %w", err)
	}
	return nil
}

func (r *repository) GetRecruiter(ctx context.Context, id string) (*Recruiter, error) {
	query := `SELECT id, user_id, company_id, college_id, designation, is_verified, created_at, updated_at
		FROM recruiter_profiles WHERE id = $1`

	rows, err := r.pool.Query(ctx, query, id)
	if err != nil {
		return nil, fmt.Errorf("get recruiter: %w", err)
	}
	defer rows.Close()

	recruiter, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Recruiter])
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get recruiter: %w", err)
	}
	return &recruiter, nil
}

func (r *repository) GetRecruiterByUserID(ctx context.Context, userID string) (*Recruiter, error) {
	query := `SELECT id, user_id, company_id, college_id, designation, is_verified, created_at, updated_at
		FROM recruiter_profiles WHERE user_id = $1`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("get recruiter by user id: %w", err)
	}
	defer rows.Close()

	recruiter, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Recruiter])
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get recruiter by user id: %w", err)
	}
	return &recruiter, nil
}

func (r *repository) ListRecruiters(ctx context.Context, collegeID string) ([]Recruiter, error) {
	query := `SELECT id, user_id, company_id, college_id, designation, is_verified, created_at, updated_at
		FROM recruiter_profiles WHERE college_id = $1 ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, collegeID)
	if err != nil {
		return nil, fmt.Errorf("list recruiters: %w", err)
	}
	defer rows.Close()

	recruiters, err := pgx.CollectRows(rows, pgx.RowToStructByName[Recruiter])
	if err != nil {
		return nil, fmt.Errorf("list recruiters: %w", err)
	}
	return recruiters, nil
}

func (r *repository) VerifyRecruiter(ctx context.Context, id string) error {
	query := `UPDATE recruiter_profiles SET is_verified=true, updated_at=NOW() WHERE id=$1`

	_, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("verify recruiter: %w", err)
	}
	return nil
}

func (r *repository) UpdateRecruiter(ctx context.Context, recruiter *Recruiter) error {
	query := `UPDATE recruiter_profiles SET company_id=$2, designation=$3, updated_at=NOW()
		WHERE id=$1`

	_, err := r.pool.Exec(ctx, query,
		recruiter.ID, recruiter.CompanyID, recruiter.Designation,
	)
	if err != nil {
		return fmt.Errorf("update recruiter: %w", err)
	}
	return nil
}
