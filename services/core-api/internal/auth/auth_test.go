package auth_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"github.com/xkill/services/core-api/internal/auth"
)

func TestRegisterAndLogin(t *testing.T) {
	pool, cleanup := SetupTestDB(t)
	defer cleanup()

	repo := auth.NewRepository(pool)
	svc := auth.NewService(repo, "test-jwt-secret")
	ctx := context.Background()

	_, err := svc.Register(ctx, auth.RegisterRequest{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "password123",
	})
	require.NoError(t, err)

	loginResp, err := svc.Login(ctx, auth.LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	})
	require.NoError(t, err)
	require.Equal(t, "test@example.com", loginResp.User.Email)

	_, err = svc.Login(ctx, auth.LoginRequest{
		Email:    "test@example.com",
		Password: "wrongpassword",
	})
	require.ErrorIs(t, err, auth.ErrInvalidCredentials)

	_, err = svc.Register(ctx, auth.RegisterRequest{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "password123",
	})
	require.ErrorIs(t, err, auth.ErrDuplicateEmail)
}

func TestRefreshTokenRotation(t *testing.T) {
	pool, cleanup := SetupTestDB(t)
	defer cleanup()

	repo := auth.NewRepository(pool)
	svc := auth.NewService(repo, "test-jwt-secret")
	ctx := context.Background()

	_, err := svc.Register(ctx, auth.RegisterRequest{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "password123",
	})
	require.NoError(t, err)

	loginResp, err := svc.Login(ctx, auth.LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	})
	require.NoError(t, err)

	oldRefreshToken := loginResp.RefreshToken

	refreshResp, err := svc.RefreshToken(ctx, oldRefreshToken)
	require.NoError(t, err)
	newRefreshToken := refreshResp.RefreshToken

	_, err = svc.RefreshToken(ctx, oldRefreshToken)
	require.ErrorIs(t, err, auth.ErrTokenReuseDetected)

	finalResp, err := svc.RefreshToken(ctx, newRefreshToken)
	require.NoError(t, err)
	require.NotNil(t, finalResp)
}

func TestRLSIsolation(t *testing.T) {
	pool, cleanup := SetupTestDB(t)
	defer cleanup()

	ctx := context.Background()

	conn, err := pool.Acquire(ctx)
	require.NoError(t, err)
	defer conn.Release()

	collegeA := uuid.New()
	collegeB := uuid.New()

	_, err = conn.Exec(ctx,
		`INSERT INTO colleges (id, name, code) VALUES ($1, $2, $3)`,
		collegeA, "College A", "COLA")
	require.NoError(t, err)

	_, err = conn.Exec(ctx,
		`INSERT INTO colleges (id, name, code) VALUES ($1, $2, $3)`,
		collegeB, "College B", "COLB")
	require.NoError(t, err)

	userA := uuid.New()
	userB := uuid.New()

	_, err = conn.Exec(ctx,
		`INSERT INTO users (id, email, password_hash, name, college_id, role) VALUES ($1,$2,$3,$4,$5,$6)`,
		userA, "userA@cola.com", "hashA", "User A", collegeA, "student")
	require.NoError(t, err)

	_, err = conn.Exec(ctx,
		`INSERT INTO users (id, email, password_hash, name, college_id, role) VALUES ($1,$2,$3,$4,$5,$6)`,
		userB, "userB@colb.com", "hashB", "User B", collegeB, "student")
	require.NoError(t, err)

	_, err = conn.Exec(ctx,
		`SELECT set_config('app.current_college_id', $1, false)`, collegeA.String())
	require.NoError(t, err)
	_, err = conn.Exec(ctx,
		`SELECT set_config('app.current_role', 'student', false)`)
	require.NoError(t, err)
	_, err = conn.Exec(ctx,
		`SELECT set_config('app.current_user_id', $1, false)`, userA.String())
	require.NoError(t, err)

	rows, err := conn.Query(ctx, `SELECT id, email FROM users ORDER BY email`)
	require.NoError(t, err)

	var countA int
	for rows.Next() {
		countA++
	}
	rows.Close()
	require.Equal(t, 1, countA, "college A user should see only their own row with RLS")

	_, err = conn.Exec(ctx,
		`SELECT set_config('app.current_college_id', $1, false)`, collegeB.String())
	require.NoError(t, err)
	_, err = conn.Exec(ctx,
		`SELECT set_config('app.current_role', 'student', false)`)
	require.NoError(t, err)
	_, err = conn.Exec(ctx,
		`SELECT set_config('app.current_user_id', $1, false)`, userB.String())
	require.NoError(t, err)

	rows, err = conn.Query(ctx, `SELECT id, email FROM users ORDER BY email`)
	require.NoError(t, err)

	var countB int
	for rows.Next() {
		countB++
	}
	rows.Close()
	require.Equal(t, 1, countB, "college B user should see only their own row with RLS")
}

func TestAdminSuspendAndAudit(t *testing.T) {
	pool, cleanup := SetupTestDB(t)
	defer cleanup()

	ctx := context.Background()

	repo := auth.NewRepository(pool)
	svc := auth.NewService(repo, "test-jwt-secret")

	resp, err := svc.Register(ctx, auth.RegisterRequest{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "password123",
	})
	require.NoError(t, err)
	userID := resp.User.ID

	_, err = pool.Exec(ctx,
		`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`, userID)
	require.NoError(t, err)

	_, err = pool.Exec(ctx,
		`INSERT INTO audit_log (actor_id, action, resource_type, resource_id, before_state, after_state) VALUES ($1, 'user_suspended', 'user', $1, '{"is_active": true}', '{"is_active": false}')`,
		userID)
	require.NoError(t, err)

	var isActive bool
	err = pool.QueryRow(ctx, `SELECT is_active FROM users WHERE id = $1`, userID).Scan(&isActive)
	require.NoError(t, err)
	require.False(t, isActive)

	var auditCount int
	err = pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM audit_log WHERE actor_id = $1 AND action = 'user_suspended'`, userID).Scan(&auditCount)
	require.NoError(t, err)
	require.Equal(t, 1, auditCount)

	_, err = pool.Exec(ctx,
		`UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1`, userID)
	require.NoError(t, err)

	_, err = pool.Exec(ctx,
		`INSERT INTO audit_log (actor_id, action, resource_type, resource_id, before_state, after_state) VALUES ($1, 'user_reactivated', 'user', $1, '{"is_active": false}', '{"is_active": true}')`,
		userID)
	require.NoError(t, err)

	err = pool.QueryRow(ctx, `SELECT is_active FROM users WHERE id = $1`, userID).Scan(&isActive)
	require.NoError(t, err)
	require.True(t, isActive)

	err = pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM audit_log WHERE actor_id = $1 AND action = 'user_reactivated'`, userID).Scan(&auditCount)
	require.NoError(t, err)
	require.Equal(t, 1, auditCount)
}
