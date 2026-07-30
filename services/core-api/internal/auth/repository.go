package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound       = errors.New("resource not found")
	ErrDuplicateEmail = errors.New("email already exists")
)

type Repository interface {
	CreateUser(ctx context.Context, user *User) error
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*User, error)
	UpdateUser(ctx context.Context, user *User) error
	ListUsers(ctx context.Context, filter map[string]interface{}) ([]User, error)
	CreateSession(ctx context.Context, session *Session) error
	GetSessionByRefreshToken(ctx context.Context, tokenHash string) (*Session, error)
	RevokeSession(ctx context.Context, id uuid.UUID) error
	RevokeSessionFamily(ctx context.Context, userID uuid.UUID, family string) error
	ListSessions(ctx context.Context, userID uuid.UUID) ([]Session, error)
	SaveRefreshToken(ctx context.Context, token *RefreshToken) error
	MarkRefreshTokenUsed(ctx context.Context, tokenHash string) error
	GetRefreshToken(ctx context.Context, tokenHash string) (*RefreshToken, error)
}

type postgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

const userColumns = `id, email, password_hash, name, phone, avatar_url, college_id, is_active, is_email_verified, is_2fa_enabled, totp_secret, backup_codes, password_reset_token, password_reset_expiry, last_login_at, created_at, updated_at`

const sessionColumns = `id, user_id, refresh_token_hash, family, device_info, ip_address, user_agent, is_revoked, expires_at, created_at`

const refreshTokenColumns = `id, session_id, token_hash, is_used, created_at`

func (r *postgresRepository) CreateUser(ctx context.Context, user *User) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO users (`+userColumns+`)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
		user.ID, user.Email, user.PasswordHash, user.Name, user.Phone, user.AvatarURL,
		user.CollegeID, user.IsActive, user.IsEmailVerified, user.Is2FAEnabled,
		user.TOTPSecret, user.BackupCodes, user.PasswordResetToken, user.PasswordResetExpiry,
		user.LastLoginAt, user.CreatedAt, user.UpdatedAt,
	)
	if err != nil {
		if isPGUniqueViolation(err) {
			return ErrDuplicateEmail
		}
		return err
	}
	return nil
}

func (r *postgresRepository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE email = $1`, email,
	)
	return scanUser(row)
}

func (r *postgresRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE id = $1`, id,
	)
	return scanUser(row)
}

func (r *postgresRepository) UpdateUser(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now()
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET email=$1, password_hash=$2, name=$3, phone=$4, avatar_url=$5, college_id=$6, is_active=$7, is_email_verified=$8, is_2fa_enabled=$9, totp_secret=$10, backup_codes=$11, password_reset_token=$12, password_reset_expiry=$13, last_login_at=$14, updated_at=$15
		WHERE id=$16`,
		user.Email, user.PasswordHash, user.Name, user.Phone, user.AvatarURL,
		user.CollegeID, user.IsActive, user.IsEmailVerified, user.Is2FAEnabled,
		user.TOTPSecret, user.BackupCodes, user.PasswordResetToken, user.PasswordResetExpiry,
		user.LastLoginAt, user.UpdatedAt, user.ID,
	)
	return err
}

func (r *postgresRepository) ListUsers(ctx context.Context, filter map[string]interface{}) ([]User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE 1=1`
	args := []interface{}{}
	argIdx := 1

	for key, val := range filter {
		query += fmt.Sprintf(" AND %s = $%d", key, argIdx)
		args = append(args, val)
		argIdx++
	}

	query += ` ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, *u)
	}
	return users, rows.Err()
}

func (r *postgresRepository) CreateSession(ctx context.Context, session *Session) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO sessions (`+sessionColumns+`)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		session.ID, session.UserID, session.RefreshTokenHash, session.Family,
		session.DeviceInfo, session.IPAddress, session.UserAgent,
		session.IsRevoked, session.ExpiresAt, session.CreatedAt,
	)
	return err
}

func (r *postgresRepository) GetSessionByRefreshToken(ctx context.Context, tokenHash string) (*Session, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT s.`+sessionColumns+` FROM sessions s
		INNER JOIN refresh_tokens rt ON rt.session_id = s.id
		WHERE rt.token_hash = $1`, tokenHash,
	)
	return scanSession(row)
}

func (r *postgresRepository) RevokeSession(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE sessions SET is_revoked = true WHERE id = $1`, id,
	)
	return err
}

func (r *postgresRepository) RevokeSessionFamily(ctx context.Context, userID uuid.UUID, family string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE sessions SET is_revoked = true WHERE user_id = $1 AND family = $2`, userID, family,
	)
	return err
}

func (r *postgresRepository) ListSessions(ctx context.Context, userID uuid.UUID) ([]Session, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+sessionColumns+` FROM sessions WHERE user_id = $1 ORDER BY created_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var s Session
		err := rows.Scan(&s.ID, &s.UserID, &s.RefreshTokenHash, &s.Family, &s.DeviceInfo,
			&s.IPAddress, &s.UserAgent, &s.IsRevoked, &s.ExpiresAt, &s.CreatedAt)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, rows.Err()
}

func (r *postgresRepository) SaveRefreshToken(ctx context.Context, token *RefreshToken) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO refresh_tokens (`+refreshTokenColumns+`)
		VALUES ($1,$2,$3,$4,$5)`,
		token.ID, token.SessionID, token.TokenHash, token.IsUsed, token.CreatedAt,
	)
	return err
}

func (r *postgresRepository) MarkRefreshTokenUsed(ctx context.Context, tokenHash string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE refresh_tokens SET is_used = true WHERE token_hash = $1`, tokenHash,
	)
	return err
}

func (r *postgresRepository) GetRefreshToken(ctx context.Context, tokenHash string) (*RefreshToken, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+refreshTokenColumns+` FROM refresh_tokens WHERE token_hash = $1`, tokenHash,
	)
	return scanRefreshToken(row)
}

func scanUser(row pgx.Row) (*User, error) {
	u := &User{}
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Phone, &u.AvatarURL,
		&u.CollegeID, &u.IsActive, &u.IsEmailVerified, &u.Is2FAEnabled,
		&u.TOTPSecret, &u.BackupCodes, &u.PasswordResetToken, &u.PasswordResetExpiry,
		&u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return u, nil
}

func scanSession(row pgx.Row) (*Session, error) {
	s := &Session{}
	err := row.Scan(&s.ID, &s.UserID, &s.RefreshTokenHash, &s.Family, &s.DeviceInfo,
		&s.IPAddress, &s.UserAgent, &s.IsRevoked, &s.ExpiresAt, &s.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

func scanRefreshToken(row pgx.Row) (*RefreshToken, error) {
	t := &RefreshToken{}
	err := row.Scan(&t.ID, &t.SessionID, &t.TokenHash, &t.IsUsed, &t.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return t, nil
}

func isPGUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "duplicate key value violates unique constraint")
}
