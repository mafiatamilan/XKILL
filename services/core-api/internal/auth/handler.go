package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func RegisterRoutes(rg *gin.RouterGroup, svc Service, authMW gin.HandlerFunc) {
	auth := rg.Group("/auth")
	{
		auth.POST("/register", registerHandler(svc))
		auth.POST("/login", loginHandler(svc))
		auth.POST("/refresh", refreshHandler(svc))
		auth.POST("/password-reset", passwordResetHandler(svc))
		auth.POST("/password-reset/confirm", passwordResetConfirmHandler(svc))
		auth.POST("/oauth/:provider", oauthHandler(svc))
	}

	protected := rg.Group("/auth", authMW)
	{
		protected.GET("/me", meHandler(svc))
		protected.POST("/logout", logoutHandler(svc))
		protected.GET("/sessions", listSessionsHandler(svc))
		protected.DELETE("/sessions/:id", revokeSessionHandler(svc))
		protected.POST("/2fa/setup", setup2FAHandler(svc))
		protected.POST("/2fa/verify", verify2FAHandler(svc))
		protected.POST("/2fa/disable", disable2FAHandler(svc))
	}
}

func registerHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		resp, err := svc.Register(c.Request.Context(), req)
		if err != nil {
			handleError(c, err)
			return
		}

		c.JSON(http.StatusCreated, resp)
	}
}

func loginHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		resp, err := svc.Login(c.Request.Context(), req)
		if err != nil {
			handleError(c, err)
			return
		}

		c.JSON(http.StatusOK, resp)
	}
}

func refreshHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RefreshTokenRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		resp, err := svc.RefreshToken(c.Request.Context(), req.RefreshToken)
		if err != nil {
			handleError(c, err)
			return
		}

		c.JSON(http.StatusOK, resp)
	}
}

func logoutHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LogoutRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userID, err := uuid.Parse(c.GetString("user_id"))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}

		tokenHash := hashSHA256(req.RefreshToken)
		sessions, err := svc.ListSessions(c.Request.Context(), userID)
		if err != nil {
			handleError(c, err)
			return
		}

		for _, s := range sessions {
			if s.RefreshTokenHash == tokenHash {
				if err := svc.Logout(c.Request.Context(), userID, s.ID); err != nil {
					handleError(c, err)
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "logged out successfully"})
				return
			}
		}

		c.JSON(http.StatusBadRequest, gin.H{"error": "session not found"})
	}
}

func meHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := uuid.Parse(c.GetString("user_id"))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}

		user, err := svc.GetUser(c.Request.Context(), userID)
		if err != nil {
			handleError(c, err)
			return
		}

		c.JSON(http.StatusOK, user)
	}
}

func listSessionsHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := uuid.Parse(c.GetString("user_id"))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}

		sessions, err := svc.ListSessions(c.Request.Context(), userID)
		if err != nil {
			handleError(c, err)
			return
		}

		c.JSON(http.StatusOK, sessions)
	}
}

func revokeSessionHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := uuid.Parse(c.GetString("user_id"))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}

		sessionID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid session id"})
			return
		}

		if err := svc.RevokeSession(c.Request.Context(), userID, sessionID); err != nil {
			handleError(c, err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "session revoked"})
	}
}

func setup2FAHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := uuid.Parse(c.GetString("user_id"))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}

		resp, err := svc.Setup2FA(c.Request.Context(), userID)
		if err != nil {
			handleError(c, err)
			return
		}

		c.JSON(http.StatusOK, resp)
	}
}

func verify2FAHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req TOTPVerifyRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userID, err := uuid.Parse(c.GetString("user_id"))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}

		if err := svc.Verify2FA(c.Request.Context(), userID, req.Code); err != nil {
			handleError(c, err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "2FA verified and enabled"})
	}
}

func disable2FAHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := uuid.Parse(c.GetString("user_id"))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user id"})
			return
		}

		if err := svc.Disable2FA(c.Request.Context(), userID); err != nil {
			handleError(c, err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "2FA disabled"})
	}
}

func passwordResetHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req PasswordResetRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := svc.RequestPasswordReset(c.Request.Context(), req.Email); err != nil {
			handleError(c, err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "password reset email sent if account exists"})
	}
}

func passwordResetConfirmHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req PasswordResetConfirmRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := svc.ConfirmPasswordReset(c.Request.Context(), req.Token, req.Password); err != nil {
			handleError(c, err)
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "password has been reset"})
	}
}

func oauthHandler(svc Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		provider := c.Param("provider")
		if provider == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "provider is required"})
			return
		}

		c.JSON(http.StatusNotImplemented, gin.H{
			"error":    "oauth not yet implemented",
			"provider": provider,
		})
	}
}

func handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidCredentials),
		errors.Is(err, ErrInvalidTOTPCode),
		errors.Is(err, ErrInvalidToken):
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	case errors.Is(err, ErrDuplicateEmail),
		errors.Is(err, Err2FAAlreadyEnabled):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, ErrNotFound),
		errors.Is(err, ErrSessionExpired),
		errors.Is(err, ErrTokenReuseDetected),
		errors.Is(err, Err2FANotSetup),
		errors.Is(err, ErrUserNotActive),
		errors.Is(err, ErrSessionNotOwned):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
	}
}
