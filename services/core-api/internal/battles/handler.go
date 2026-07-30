package battles

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, svc BattlesService) {
	rg.GET("/battles", listActiveHandler(svc))
	rg.POST("/battles", createHandler(svc))
	rg.POST("/battles/:id/join", joinHandler(svc))
}

func listActiveHandler(svc BattlesService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func createHandler(svc BattlesService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func joinHandler(svc BattlesService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}
