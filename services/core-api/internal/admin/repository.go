package admin

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("resource not found")

type Repository interface {
	CreateCollege(ctx context.Context, college *College) error
	GetCollegeByID(ctx context.Context, id string) (*College, error)
	ListColleges(ctx context.Context, limit int, cursor string) ([]College, string, error)
	ListUsers(ctx context.Context, search, role string, limit int, cursor string) ([]UserListItem, string, error)
	GetUserByID(ctx context.Context, id string) (*UserListItem, error)
	UpdateUserStatus(ctx context.Context, userID string, isActive bool) error
	AssignRole(ctx context.Context, userID, roleID, collegeID string) error
}

type postgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

const collegeColumns = `id, name, code, domain, city, state, is_active, created_at`

func (r *postgresRepository) CreateCollege(ctx context.Context, college *College) error {
	college.ID = uuid.New().String()
	college.IsActive = true
	college.CreatedAt = time.Now().Format(time.RFC3339)
	_, err := r.pool.Exec(ctx,
		`INSERT INTO colleges (`+collegeColumns+`) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		college.ID, college.Name, college.Code, college.Domain, college.City,
		college.State, college.IsActive, college.CreatedAt,
	)
	return err
}

func (r *postgresRepository) GetCollegeByID(ctx context.Context, id string) (*College, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+collegeColumns+` FROM colleges WHERE id = $1`, id,
	)
	return scanCollege(row)
}

func (r *postgresRepository) ListColleges(ctx context.Context, limit int, cursor string) ([]College, string, error) {
	query := `SELECT ` + collegeColumns + ` FROM colleges`
	args := []interface{}{}
	argIdx := 1

	if cursor != "" {
		decoded, err := decodeCursor(cursor)
		if err == nil && decoded != "" {
			query += fmt.Sprintf(" WHERE created_at < $%d", argIdx)
			args = append(args, decoded)
			argIdx++
		}
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d", argIdx)
	args = append(args, limit+1)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var colleges []College
	for rows.Next() {
		c, err := scanCollege(rows)
		if err != nil {
			return nil, "", err
		}
		colleges = append(colleges, *c)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	var nextCursor string
	if len(colleges) > limit {
		nextCursor = encodeCursor(colleges[limit-1].CreatedAt)
		colleges = colleges[:limit]
	}

	return colleges, nextCursor, nil
}

func (r *postgresRepository) ListUsers(ctx context.Context, search, role string, limit int, cursor string) ([]UserListItem, string, error) {
	query := `SELECT u.id, u.email, u.name, u.role, u.is_active, u.is_email_verified, COALESCE(c.name, '') AS college_name, u.created_at
		FROM users u LEFT JOIN colleges c ON c.id::text = u.college_id::text WHERE 1=1`
	args := []interface{}{}
	argIdx := 1

	if search != "" {
		query += fmt.Sprintf(" AND (u.name ILIKE $%d OR u.email ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}
	if role != "" {
		query += fmt.Sprintf(" AND u.role = $%d", argIdx)
		args = append(args, role)
		argIdx++
	}

	if cursor != "" {
		decoded, err := decodeCursor(cursor)
		if err == nil && decoded != "" {
			query += fmt.Sprintf(" AND u.created_at < $%d", argIdx)
			args = append(args, decoded)
			argIdx++
		}
	}

	query += fmt.Sprintf(" ORDER BY u.created_at DESC LIMIT $%d", argIdx)
	args = append(args, limit+1)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var users []UserListItem
	for rows.Next() {
		var u UserListItem
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.IsActive, &u.IsEmailVerified, &u.CollegeName, &u.CreatedAt); err != nil {
			return nil, "", err
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	var nextCursor string
	if len(users) > limit {
		nextCursor = encodeCursor(users[limit-1].CreatedAt)
		users = users[:limit]
	}

	return users, nextCursor, nil
}

func (r *postgresRepository) GetUserByID(ctx context.Context, id string) (*UserListItem, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT u.id, u.email, u.name, u.role, u.is_active, u.is_email_verified, COALESCE(c.name, '') AS college_name, u.created_at
		FROM users u LEFT JOIN colleges c ON c.id::text = u.college_id::text WHERE u.id = $1`, id,
	)
	var u UserListItem
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.IsActive, &u.IsEmailVerified, &u.CollegeName, &u.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (r *postgresRepository) UpdateUserStatus(ctx context.Context, userID string, isActive bool) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2`,
		isActive, userID,
	)
	return err
}

func (r *postgresRepository) AssignRole(ctx context.Context, userID, roleID, collegeID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET role = $1, college_id = $2, updated_at = NOW() WHERE id = $3`,
		roleID, collegeID, userID,
	)
	return err
}

func scanCollege(row pgx.Row) (*College, error) {
	c := &College{}
	err := row.Scan(&c.ID, &c.Name, &c.Code, &c.Domain, &c.City, &c.State, &c.IsActive, &c.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func encodeCursor(t string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(t))
}

func decodeCursor(s string) (string, error) {
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func isPGUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "duplicate key value violates unique constraint")
}
