package community

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(rg *gin.RouterGroup, svc CommunityService) {
	rg.GET("/community/posts", listPostsHandler(svc))
	rg.POST("/community/posts", createPostHandler(svc))
	rg.POST("/community/posts/:id/comments", addCommentHandler(svc))
}

func listPostsHandler(svc CommunityService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func createPostHandler(svc CommunityService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}

func addCommentHandler(svc CommunityService) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
	}
}
