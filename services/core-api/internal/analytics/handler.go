package analytics

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, svc AnalyticsService) {
	rg.GET("/analytics/dashboard", dashboardHandler(svc))
	rg.POST("/analytics/events", trackHandler(svc))
}

func dashboardHandler(svc AnalyticsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func trackHandler(svc AnalyticsService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}
