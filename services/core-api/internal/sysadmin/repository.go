package sysadmin

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrFlagNotFound = errors.New("feature flag not found")

type FlagRepository interface {
	CreateFlag(ctx context.Context, flag *FeatureFlag) error
	GetFlagByID(ctx context.Context, id string) (*FeatureFlag, error)
	GetFlagByKey(ctx context.Context, key string) (*FeatureFlag, error)
	ListFlags(ctx context.Context, collegeID string) ([]FeatureFlag, error)
	UpdateFlag(ctx context.Context, flag *FeatureFlag) error
}

type AuditLogRepository interface {
	WriteEntry(ctx context.Context, entry *AuditLogEntry) error
	ListEntries(ctx context.Context, action, resourceType string, limit int, cursor string) ([]AuditLogEntry, string, error)
}

type postgresFlagRepository struct {
	pool *pgxpool.Pool
}

type postgresAuditLogRepository struct {
	pool *pgxpool.Pool
}

func NewFlagRepository(pool *pgxpool.Pool) FlagRepository {
	return &postgresFlagRepository{pool: pool}
}

func NewAuditLogRepository(pool *pgxpool.Pool) AuditLogRepository {
	return &postgresAuditLogRepository{pool: pool}
}

const flagColumns = `id, key, name, description, enabled, rollout_percentage, college_id, created_at, updated_at`

func (r *postgresFlagRepository) CreateFlag(ctx context.Context, flag *FeatureFlag) error {
	flag.ID = uuid.New().String()
	now := time.Now().Format(time.RFC3339)
	flag.CreatedAt = now
	flag.UpdatedAt = now
	_, err := r.pool.Exec(ctx,
		`INSERT INTO feature_flags (`+flagColumns+`) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		flag.ID, flag.Key, flag.Name, flag.Description, flag.Enabled,
		flag.RolloutPercentage, nullIfEmpty(flag.CollegeID), flag.CreatedAt, flag.UpdatedAt,
	)
	return err
}

func (r *postgresFlagRepository) GetFlagByID(ctx context.Context, id string) (*FeatureFlag, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+flagColumns+` FROM feature_flags WHERE id = $1`, id,
	)
	return scanFlag(row)
}

func (r *postgresFlagRepository) GetFlagByKey(ctx context.Context, key string) (*FeatureFlag, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+flagColumns+` FROM feature_flags WHERE key = $1`, key,
	)
	return scanFlag(row)
}

func (r *postgresFlagRepository) ListFlags(ctx context.Context, collegeID string) ([]FeatureFlag, error) {
	query := `SELECT ` + flagColumns + ` FROM feature_flags`
	args := []interface{}{}
	argIdx := 1

	if collegeID != "" {
		query += fmt.Sprintf(" WHERE college_id = $%d", argIdx)
		args = append(args, collegeID)
		argIdx++
	}

	query += " ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flags []FeatureFlag
	for rows.Next() {
		f, err := scanFlag(rows)
		if err != nil {
			return nil, err
		}
		flags = append(flags, *f)
	}
	return flags, rows.Err()
}

func (r *postgresFlagRepository) UpdateFlag(ctx context.Context, flag *FeatureFlag) error {
	flag.UpdatedAt = time.Now().Format(time.RFC3339)
	_, err := r.pool.Exec(ctx,
		`UPDATE feature_flags SET key=$1, name=$2, description=$3, enabled=$4,
		rollout_percentage=$5, college_id=$6, updated_at=$7 WHERE id=$8`,
		flag.Key, flag.Name, flag.Description, flag.Enabled,
		flag.RolloutPercentage, nullIfEmpty(flag.CollegeID), flag.UpdatedAt, flag.ID,
	)
	return err
}

func scanFlag(row pgx.Row) (*FeatureFlag, error) {
	f := &FeatureFlag{}
	err := row.Scan(&f.ID, &f.Key, &f.Name, &f.Description, &f.Enabled,
		&f.RolloutPercentage, &f.CollegeID, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrFlagNotFound
		}
		return nil, err
	}
	return f, nil
}

const auditColumns = `id, actor_id, action, resource_type, resource_id, before_state, after_state, ip_address, created_at`

func (r *postgresAuditLogRepository) WriteEntry(ctx context.Context, entry *AuditLogEntry) error {
	entry.ID = uuid.New().String()
	entry.CreatedAt = time.Now().Format(time.RFC3339)
	_, err := r.pool.Exec(ctx,
		`INSERT INTO audit_log (`+auditColumns+`) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		entry.ID, nullIfEmpty(entry.ActorID), entry.Action, entry.ResourceType,
		nullIfEmpty(entry.ResourceID), nullIfEmpty(entry.BeforeState), nullIfEmpty(entry.AfterState),
		nullIfEmpty(entry.IPAddress), entry.CreatedAt,
	)
	return err
}

func (r *postgresAuditLogRepository) ListEntries(ctx context.Context, action, resourceType string, limit int, cursor string) ([]AuditLogEntry, string, error) {
	query := `SELECT ` + auditColumns + ` FROM audit_log WHERE 1=1`
	args := []interface{}{}
	argIdx := 1

	if action != "" {
		query += fmt.Sprintf(" AND action = $%d", argIdx)
		args = append(args, action)
		argIdx++
	}
	if resourceType != "" {
		query += fmt.Sprintf(" AND resource_type = $%d", argIdx)
		args = append(args, resourceType)
		argIdx++
	}

	if cursor != "" {
		decoded, err := decodeCursor(cursor)
		if err == nil && decoded != "" {
			query += fmt.Sprintf(" AND created_at < $%d", argIdx)
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

	var entries []AuditLogEntry
	for rows.Next() {
		var e AuditLogEntry
		err := rows.Scan(&e.ID, &e.ActorID, &e.Action, &e.ResourceType, &e.ResourceID,
			&e.BeforeState, &e.AfterState, &e.IPAddress, &e.CreatedAt)
		if err != nil {
			return nil, "", err
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	var nextCursor string
	if len(entries) > limit {
		nextCursor = encodeCursor(entries[limit-1].CreatedAt)
		entries = entries[:limit]
	}

	return entries, nextCursor, nil
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

func nullIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
