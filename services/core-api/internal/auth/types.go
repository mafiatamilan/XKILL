package auth

import (
	"net"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                  uuid.UUID  `json:"id"`
	Email               string     `json:"email"`
	PasswordHash        string     `json:"-"`
	Name                string     `json:"name"`
	Phone               *string    `json:"phone,omitempty"`
	AvatarURL           *string    `json:"avatar_url,omitempty"`
	CollegeID           *uuid.UUID `json:"college_id,omitempty"`
	IsActive            bool       `json:"is_active"`
	IsEmailVerified     bool       `json:"is_email_verified"`
	Is2FAEnabled        bool       `json:"is_2fa_enabled"`
	TOTPSecret          *string    `json:"-"`
	BackupCodes         []string   `json:"-"`
	PasswordResetToken  *string    `json:"-"`
	PasswordResetExpiry *time.Time `json:"-"`
	LastLoginAt         *time.Time `json:"last_login_at,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

type Session struct {
	ID               uuid.UUID `json:"id"`
	UserID           uuid.UUID `json:"user_id"`
	RefreshTokenHash string    `json:"-"`
	Family           string    `json:"family"`
	DeviceInfo       string    `json:"device_info,omitempty"`
	IPAddress        net.IP    `json:"ip_address,omitempty"`
	UserAgent        string    `json:"user_agent,omitempty"`
	IsRevoked        bool      `json:"is_revoked"`
	ExpiresAt        time.Time `json:"expires_at"`
	CreatedAt        time.Time `json:"created_at"`
}

type RefreshToken struct {
	ID        uuid.UUID `json:"id"`
	SessionID uuid.UUID `json:"session_id"`
	TokenHash string    `json:"-"`
	IsUsed    bool      `json:"is_used"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type LoginResponse struct {
	User         User   `json:"user"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required,min=1,max=255"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type TOTPSetupResponse struct {
	Secret    string `json:"secret"`
	QRCodeURL string `json:"qr_code_url"`
}

type TOTPVerifyRequest struct {
	Code string `json:"code" binding:"required,len=6"`
}

type PasswordResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type PasswordResetConfirmRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}
