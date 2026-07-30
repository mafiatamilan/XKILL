package aiservice

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, svc AIService) {
	rg.POST("/ai/generate", generateHandler(svc))
	rg.GET("/ai/config", getConfigHandler(svc))
}

func generateHandler(svc AIService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func getConfigHandler(svc AIService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}
