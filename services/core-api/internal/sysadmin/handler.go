package sysadmin

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, auth gin.HandlerFunc, adminAuth gin.HandlerFunc) {
	rg.GET("/sysadmin/health", h.getHealth)

	sys := rg.Group("/sysadmin", auth, adminAuth)
	{
		sys.GET("/feature-flags", h.listFlags)
		sys.POST("/feature-flags", h.createFlag)
		sys.PUT("/feature-flags/:id", h.updateFlag)
		sys.GET("/audit-log", h.listAuditLogs)
	}
}

func (h *Handler) getHealth(c *gin.Context) {
	health, err := h.svc.GetHealth(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	statusCode := http.StatusOK
	if health.Status != "healthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, health)
}

func (h *Handler) createFlag(c *gin.Context) {
	var req CreateFeatureFlagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	flag, err := h.svc.CreateFlag(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusCreated, flag)
}

func (h *Handler) listFlags(c *gin.Context) {
	collegeID := c.Query("college_id")

	flags, err := h.svc.ListFlags(c.Request.Context(), collegeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": flags})
}

func (h *Handler) updateFlag(c *gin.Context) {
	id := c.Param("id")

	var req CreateFeatureFlagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	flag, err := h.svc.UpdateFlag(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, ErrFlagNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, flag)
}

func (h *Handler) listAuditLogs(c *gin.Context) {
	action := c.Query("action")
	resourceType := c.Query("resource_type")
	limit := parseIntQuery(c.DefaultQuery("limit", "20"), 20)
	cursor := c.Query("cursor")

	entries, nextCursor, err := h.svc.ListAuditLogs(c.Request.Context(), action, resourceType, limit, cursor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       entries,
		"next_cursor": nextCursor,
	})
}

func parseIntQuery(s string, defaultVal int) int {
	if s == "" {
		return defaultVal
	}
	var n int
	if _, err := fmt.Sscanf(s, "%d", &n); err != nil || n <= 0 {
		return defaultVal
	}
	if n > 100 {
		return 100
	}
	return n
}
