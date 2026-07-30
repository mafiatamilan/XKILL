package search

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, svc SearchService) {
	rg.GET("/search", searchHandler(svc))
}

func searchHandler(svc SearchService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}
