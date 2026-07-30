package leaderboard

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, svc LeaderboardService) {
	rg.GET("/leaderboard", globalHandler(svc))
	rg.GET("/leaderboard/college", collegeHandler(svc))
	rg.GET("/leaderboard/me", userRankHandler(svc))
}

func globalHandler(svc LeaderboardService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func collegeHandler(svc LeaderboardService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func userRankHandler(svc LeaderboardService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}
