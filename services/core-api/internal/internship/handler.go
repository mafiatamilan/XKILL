package internship

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, svc InternshipService) {
	rg.GET("/internships", listHandler(svc))
	rg.GET("/internships/:id", getHandler(svc))
	rg.POST("/internships/:id/apply", applyHandler(svc))
}

func listHandler(svc InternshipService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func getHandler(svc InternshipService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func applyHandler(svc InternshipService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}
