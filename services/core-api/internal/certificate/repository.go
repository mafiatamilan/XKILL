package certificate

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	CreateCertificate(ctx context.Context, c *Certificate) error
	GetCertificate(ctx context.Context, id string) (*Certificate, error)
	ListCertificates(ctx context.Context, userID string) ([]Certificate, error)
	ListCertificatesByCollege(ctx context.Context, collegeID string) ([]Certificate, error)
	UpdateCertificate(ctx context.Context, c *Certificate) error
	DeleteCertificate(ctx context.Context, id string) error
	VerifyCertificate(ctx context.Context, id, verifiedBy string) error
}

type repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &repository{pool: pool}
}

func (r *repository) CreateCertificate(ctx context.Context, c *Certificate) error {
	query := `INSERT INTO certificates (id, user_id, college_id, title, issuer, issue_date, expiry_date, credential_id, credential_url, file_url, category, is_verified, verified_by, verified_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`

	_, err := r.pool.Exec(ctx, query,
		c.ID, c.UserID, c.CollegeID, c.Title, c.Issuer,
		nullIfEmpty(c.IssueDate), nullIfEmpty(c.ExpiryDate),
		nullIfEmpty(c.CredentialID), nullIfEmpty(c.CredentialURL),
		nullIfEmpty(c.FileURL), nullIfEmpty(c.Category),
		c.IsVerified, nullIfEmpty(c.VerifiedBy), c.VerifiedAt,
		c.CreatedAt, c.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create certificate: %w", err)
	}
	return nil
}

func (r *repository) GetCertificate(ctx context.Context, id string) (*Certificate, error) {
	query := `SELECT id, user_id, college_id, title, issuer, issue_date, expiry_date, credential_id, credential_url, file_url, category, is_verified, verified_by, verified_at, created_at, updated_at
		FROM certificates WHERE id = $1`

	rows, err := r.pool.Query(ctx, query, id)
	if err != nil {
		return nil, fmt.Errorf("get certificate: %w", err)
	}
	defer rows.Close()

	cert, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[Certificate])
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get certificate: %w", err)
	}
	return &cert, nil
}

func (r *repository) ListCertificates(ctx context.Context, userID string) ([]Certificate, error) {
	query := `SELECT id, user_id, college_id, title, issuer, issue_date, expiry_date, credential_id, credential_url, file_url, category, is_verified, verified_by, verified_at, created_at, updated_at
		FROM certificates WHERE user_id = $1 ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("list certificates: %w", err)
	}
	defer rows.Close()

	certs, err := pgx.CollectRows(rows, pgx.RowToStructByName[Certificate])
	if err != nil {
		return nil, fmt.Errorf("list certificates: %w", err)
	}
	return certs, nil
}

func (r *repository) ListCertificatesByCollege(ctx context.Context, collegeID string) ([]Certificate, error) {
	query := `SELECT id, user_id, college_id, title, issuer, issue_date, expiry_date, credential_id, credential_url, file_url, category, is_verified, verified_by, verified_at, created_at, updated_at
		FROM certificates WHERE college_id = $1 ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, collegeID)
	if err != nil {
		return nil, fmt.Errorf("list certificates by college: %w", err)
	}
	defer rows.Close()

	certs, err := pgx.CollectRows(rows, pgx.RowToStructByName[Certificate])
	if err != nil {
		return nil, fmt.Errorf("list certificates by college: %w", err)
	}
	return certs, nil
}

func (r *repository) UpdateCertificate(ctx context.Context, c *Certificate) error {
	query := `UPDATE certificates SET title=$3, issuer=$4, issue_date=$5, expiry_date=$6, credential_id=$7, credential_url=$8, file_url=$9, category=$10, updated_at=NOW()
		WHERE id=$1 AND user_id=$2`

	_, err := r.pool.Exec(ctx, query,
		c.ID, c.UserID, c.Title, c.Issuer,
		nullIfEmpty(c.IssueDate), nullIfEmpty(c.ExpiryDate),
		nullIfEmpty(c.CredentialID), nullIfEmpty(c.CredentialURL),
		nullIfEmpty(c.FileURL), nullIfEmpty(c.Category),
	)
	if err != nil {
		return fmt.Errorf("update certificate: %w", err)
	}
	return nil
}

func (r *repository) DeleteCertificate(ctx context.Context, id string) error {
	query := `DELETE FROM certificates WHERE id = $1`

	_, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete certificate: %w", err)
	}
	return nil
}

func (r *repository) VerifyCertificate(ctx context.Context, id, verifiedBy string) error {
	query := `UPDATE certificates SET is_verified=true, verified_by=$2, verified_at=$3, updated_at=NOW() WHERE id=$1`

	_, err := r.pool.Exec(ctx, query, id, verifiedBy, time.Now())
	if err != nil {
		return fmt.Errorf("verify certificate: %w", err)
	}
	return nil
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
