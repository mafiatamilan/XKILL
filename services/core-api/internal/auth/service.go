package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/argon2"
)

var (
	ErrInvalidCredentials    = errors.New("invalid credentials")
	ErrSessionExpired        = errors.New("session expired")
	ErrTokenReuseDetected    = errors.New("refresh token reuse detected")
	Err2FANotSetup           = errors.New("2FA not set up")
	Err2FAAlreadyEnabled     = errors.New("2FA already enabled")
	ErrInvalidTOTPCode       = errors.New("invalid TOTP code")
	ErrUserNotActive         = errors.New("user account is not active")
	ErrInvalidToken          = errors.New("invalid or expired token")
	ErrPasswordMismatch      = errors.New("passwords do not match")
	ErrSessionNotOwned       = errors.New("session does not belong to user")
)

const (
	AccessTokenDuration  = 15 * time.Minute
	RefreshTokenDuration = 7 * 24 * time.Hour
	ArgonTime            = 1
	ArgonMemory          = 64 * 1024
	ArgonThreads         = 4
	ArgonKeyLen          = 32
)

type Service interface {
	Register(ctx context.Context, req RegisterRequest) (*LoginResponse, error)
	Login(ctx context.Context, req LoginRequest) (*LoginResponse, error)
	RefreshToken(ctx context.Context, token string) (*LoginResponse, error)
	Logout(ctx context.Context, userID, sessionID uuid.UUID) error
	Setup2FA(ctx context.Context, userID uuid.UUID) (*TOTPSetupResponse, error)
	Verify2FA(ctx context.Context, userID uuid.UUID, code string) error
	Disable2FA(ctx context.Context, userID uuid.UUID) error
	RequestPasswordReset(ctx context.Context, email string) error
	ConfirmPasswordReset(ctx context.Context, token, newPassword string) error
	VerifyEmail(ctx context.Context, userID uuid.UUID) error
	ListSessions(ctx context.Context, userID uuid.UUID) ([]Session, error)
	RevokeSession(ctx context.Context, userID, sessionID uuid.UUID) error
	GetUser(ctx context.Context, userID uuid.UUID) (*User, error)
}

type authService struct {
	repo      Repository
	jwtSecret string
}

func NewService(repo Repository, jwtSecret string) Service {
	return &authService{repo: repo, jwtSecret: jwtSecret}
}

func (s *authService) Register(ctx context.Context, req RegisterRequest) (*LoginResponse, error) {
	existing, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, ErrDuplicateEmail
	}

	hash, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := &User{
		ID:             uuid.New(),
		Email:          req.Email,
		PasswordHash:   hash,
		Name:           req.Name,
		IsActive:       true,
		IsEmailVerified: false,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	return s.generateAuthResponse(ctx, user, "")
}

func (s *authService) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if !user.IsActive {
		return nil, ErrUserNotActive
	}

	ok, err := verifyPassword(req.Password, user.PasswordHash)
	if err != nil || !ok {
		return nil, ErrInvalidCredentials
	}

	if user.Is2FAEnabled {
		return s.generateAuthResponse(ctx, user, "")
	}

	now := time.Now()
	user.LastLoginAt = &now
	if err := s.repo.UpdateUser(ctx, user); err != nil {
		return nil, err
	}

	return s.generateAuthResponse(ctx, user, "")
}

func (s *authService) RefreshToken(ctx context.Context, refreshToken string) (*LoginResponse, error) {
	tokenHash := hashSHA256(refreshToken)

	storedToken, err := s.repo.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, ErrInvalidToken
		}
		return nil, err
	}

	if storedToken.IsUsed {
		session, sessionErr := s.repo.GetSessionByRefreshToken(ctx, tokenHash)
		if sessionErr == nil {
			_ = s.repo.RevokeSessionFamily(ctx, session.UserID, session.Family)
		}
		return nil, ErrTokenReuseDetected
	}

	session, err := s.repo.GetSessionByRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil, err
	}

	if session.IsRevoked || time.Now().After(session.ExpiresAt) {
		return nil, ErrSessionExpired
	}

	if err := s.repo.MarkRefreshTokenUsed(ctx, tokenHash); err != nil {
		return nil, err
	}

	user, err := s.repo.GetUserByID(ctx, session.UserID)
	if err != nil {
		return nil, err
	}

	if !user.IsActive {
		return nil, ErrUserNotActive
	}

	return s.generateAuthResponse(ctx, user, session.Family)
}

func (s *authService) Logout(ctx context.Context, userID, sessionID uuid.UUID) error {
	session, err := s.repo.ListSessions(ctx, userID)
	if err != nil {
		return err
	}

	found := false
	for _, sess := range session {
		if sess.ID == sessionID {
			found = true
			break
		}
	}
	if !found {
		return ErrSessionNotOwned
	}

	return s.repo.RevokeSession(ctx, sessionID)
}

func (s *authService) Setup2FA(ctx context.Context, userID uuid.UUID) (*TOTPSetupResponse, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if user.Is2FAEnabled {
		return nil, Err2FAAlreadyEnabled
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Xkill",
		AccountName: user.Email,
	})
	if err != nil {
		return nil, err
	}

	secret := key.Secret()
	user.TOTPSecret = &secret
	if err := s.repo.UpdateUser(ctx, user); err != nil {
		return nil, err
	}

	return &TOTPSetupResponse{
		Secret:    secret,
		QRCodeURL: key.URL(),
	}, nil
}

func (s *authService) Verify2FA(ctx context.Context, userID uuid.UUID, code string) error {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	if user.TOTPSecret == nil || *user.TOTPSecret == "" {
		return Err2FANotSetup
	}

	if !totp.Validate(code, *user.TOTPSecret) {
		return ErrInvalidTOTPCode
	}

	user.Is2FAEnabled = true
	return s.repo.UpdateUser(ctx, user)
}

func (s *authService) Disable2FA(ctx context.Context, userID uuid.UUID) error {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	user.Is2FAEnabled = false
	user.TOTPSecret = nil
	user.BackupCodes = nil
	return s.repo.UpdateUser(ctx, user)
}

func (s *authService) RequestPasswordReset(ctx context.Context, email string) error {
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil
		}
		return err
	}

	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return err
	}
	token := base64.RawURLEncoding.EncodeToString(tokenBytes)

	expiry := time.Now().Add(1 * time.Hour)
	tokenHash := hashSHA256(token)
	user.PasswordResetToken = &tokenHash
	user.PasswordResetExpiry = &expiry
	if err := s.repo.UpdateUser(ctx, user); err != nil {
		return err
	}

	return nil
}

func (s *authService) ConfirmPasswordReset(ctx context.Context, token, newPassword string) error {
	tokenHash := hashSHA256(token)

	users, err := s.repo.ListUsers(ctx, map[string]interface{}{
		"password_reset_token": tokenHash,
	})
	if err != nil {
		return err
	}
	if len(users) == 0 {
		return ErrInvalidToken
	}

	user := &users[0]
	if user.PasswordResetExpiry == nil || time.Now().After(*user.PasswordResetExpiry) {
		return ErrInvalidToken
	}

	hash, err := hashPassword(newPassword)
	if err != nil {
		return err
	}

	user.PasswordHash = hash
	user.PasswordResetToken = nil
	user.PasswordResetExpiry = nil
	return s.repo.UpdateUser(ctx, user)
}

func (s *authService) VerifyEmail(ctx context.Context, userID uuid.UUID) error {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	if user.IsEmailVerified {
		return nil
	}

	user.IsEmailVerified = true
	return s.repo.UpdateUser(ctx, user)
}

func (s *authService) ListSessions(ctx context.Context, userID uuid.UUID) ([]Session, error) {
	return s.repo.ListSessions(ctx, userID)
}

func (s *authService) RevokeSession(ctx context.Context, userID, sessionID uuid.UUID) error {
	sessions, err := s.repo.ListSessions(ctx, userID)
	if err != nil {
		return err
	}

	found := false
	for _, sess := range sessions {
		if sess.ID == sessionID {
			found = true
			break
		}
	}
	if !found {
		return ErrSessionNotOwned
	}

	return s.repo.RevokeSession(ctx, sessionID)
}

func (s *authService) GetUser(ctx context.Context, userID uuid.UUID) (*User, error) {
	return s.repo.GetUserByID(ctx, userID)
}

func (s *authService) generateAuthResponse(ctx context.Context, user *User, family string) (*LoginResponse, error) {
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken, refreshHash := generateRefreshToken()
	if family == "" {
		familyBytes := make([]byte, 16)
		if _, err := rand.Read(familyBytes); err != nil {
			return nil, err
		}
		family = base64.RawURLEncoding.EncodeToString(familyBytes)
	}

	now := time.Now()
	session := &Session{
		ID:               uuid.New(),
		UserID:           user.ID,
		RefreshTokenHash: refreshHash,
		Family:           family,
		IsRevoked:        false,
		ExpiresAt:        now.Add(RefreshTokenDuration),
		CreatedAt:        now,
	}
	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, err
	}

	rt := &RefreshToken{
		ID:        uuid.New(),
		SessionID: session.ID,
		TokenHash: refreshHash,
		IsUsed:    false,
		CreatedAt: now,
	}
	if err := s.repo.SaveRefreshToken(ctx, rt); err != nil {
		return nil, err
	}

	return &LoginResponse{
		User:         *user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *authService) generateAccessToken(user *User) (string, error) {
	claims := &Claims{
		UserID: user.ID.String(),
		Email:  user.Email,
		Role:   "user",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(AccessTokenDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}
	if user.CollegeID != nil {
		claims.CollegeID = user.CollegeID.String()
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

func generateRefreshToken() (string, string) {
	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	refreshToken := base64.RawURLEncoding.EncodeToString(tokenBytes)
	refreshHash := hashSHA256(refreshToken)
	return refreshToken, refreshHash
}

func hashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(password), salt, ArgonTime, ArgonMemory, ArgonThreads, ArgonKeyLen)
	return base64.RawStdEncoding.EncodeToString(salt) + ":" + base64.RawStdEncoding.EncodeToString(hash), nil
}

func verifyPassword(password, encoded string) (bool, error) {
	parts := split2(encoded, ":")
	if parts == nil {
		return false, errors.New("invalid hash format")
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[0])
	if err != nil {
		return false, err
	}
	hash, err := base64.RawStdEncoding.DecodeString(parts[1])
	if err != nil {
		return false, err
	}
	computed := argon2.IDKey([]byte(password), salt, ArgonTime, ArgonMemory, ArgonThreads, ArgonKeyLen)
	return subtle.ConstantTimeCompare(hash, computed) == 1, nil
}

func hashSHA256(data string) string {
	h := sha256.Sum256([]byte(data))
	return base64.RawStdEncoding.EncodeToString(h[:])
}

func split2(s, sep string) []string {
	for i := 0; i < len(s)-len(sep)+1; i++ {
		if s[i:i+len(sep)] == sep {
			return []string{s[:i], s[i+len(sep):]}
		}
	}
	return nil
}
