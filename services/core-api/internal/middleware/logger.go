package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		status := c.Writer.Status()
		duration := time.Since(start)

		log.Info().
			Str("method", method).
			Str("path", path).
			Int("status", status).
			Dur("duration", duration).
			Msg("request completed")
	}
}
