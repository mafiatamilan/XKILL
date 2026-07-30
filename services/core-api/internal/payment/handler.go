package payment

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, svc PaymentService) {
	rg.POST("/payments", createHandler(svc))
	rg.GET("/payments/:id", getHandler(svc))
	rg.POST("/payments/:id/process", processHandler(svc))
}

func createHandler(svc PaymentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func getHandler(svc PaymentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func processHandler(svc PaymentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}
