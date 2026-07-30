package gamification

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, svc GamificationService) {
	rg.GET("/gamification/badges", userBadgesHandler(svc))
	rg.GET("/gamification/xp", userXPHandler(svc))
}

func userBadgesHandler(svc GamificationService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func userXPHandler(svc GamificationService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}
