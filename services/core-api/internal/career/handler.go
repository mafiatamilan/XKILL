package career

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMW gin.HandlerFunc) {
	rg.GET("/career/paths", h.listPaths)
	rg.GET("/career/paths/:id", h.getPath)
	rg.POST("/career/resources", authMW, h.createResource)
	rg.GET("/career/resources", authMW, h.listResources)
	rg.DELETE("/career/resources/:id", authMW, h.deleteResource)
}

func (h *Handler) listPaths(c *gin.Context) {
	paths, err := h.svc.ListCareerPaths(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": paths})
}

func (h *Handler) getPath(c *gin.Context) {
	path, err := h.svc.GetCareerPath(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "career path not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": path})
}

func (h *Handler) createResource(c *gin.Context) {
	var req CreateResourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	collegeID := c.GetString("college_id")
	userID := c.GetString("user_id")
	res, err := h.svc.CreateResource(c.Request.Context(), collegeID, userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": res})
}

func (h *Handler) listResources(c *gin.Context) {
	collegeID := c.GetString("college_id")
	tags := c.QueryArray("tags")
	resources, err := h.svc.ListResources(c.Request.Context(), collegeID, tags)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": resources})
}

func (h *Handler) deleteResource(c *gin.Context) {
	if err := h.svc.DeleteResource(c.Request.Context(), c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
