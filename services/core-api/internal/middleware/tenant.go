package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

func TenantMiddleware(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		collegeID := c.GetHeader("X-College-ID")
		if collegeID == "" {
			collegeID = c.GetString("college_id")
		}

		userID := c.GetString("user_id")
		userRole := c.GetString("user_role")

		conn, err := pool.Acquire(c.Request.Context())
		if err != nil {
			log.Error().Err(err).Msg("failed to acquire connection for tenant context")
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "failed to set tenant context"})
			return
		}
		defer conn.Release()

		if collegeID != "" {
			_, err = conn.Exec(c.Request.Context(), "SET app.current_college_id = $1", collegeID)
			if err != nil {
				log.Error().Err(err).Str("college_id", collegeID).Msg("failed to set app.current_college_id")
			}
		}

		if userRole != "" {
			_, err = conn.Exec(c.Request.Context(), "SET app.current_role = $1", userRole)
			if err != nil {
				log.Error().Err(err).Str("role", userRole).Msg("failed to set app.current_role")
			}
		}

		if userID != "" {
			_, err = conn.Exec(c.Request.Context(), "SET app.current_user_id = $1", userID)
			if err != nil {
				log.Error().Err(err).Str("user_id", userID).Msg("failed to set app.current_user_id")
			}
		}

		if collegeID != "" {
			c.Set("college_id", collegeID)
		}
		c.Next()
	}
}
