package mentor

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, svc MentorService) {
	rg.GET("/mentors", listMentorsHandler(svc))
	rg.GET("/mentors/:id", getMentorHandler(svc))
	rg.POST("/mentors/:id/book", bookHandler(svc))
}

func listMentorsHandler(svc MentorService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func getMentorHandler(svc MentorService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func bookHandler(svc MentorService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}
