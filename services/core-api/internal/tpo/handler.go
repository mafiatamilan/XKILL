package tpo

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
	rg.GET("/tpo/dashboard", authMW, h.dashboard)
	rg.POST("/tpo/announcements", authMW, h.createAnnouncement)
	rg.GET("/tpo/announcements", authMW, h.listAnnouncements)
}

func (h *Handler) dashboard(c *gin.Context) {
	collegeID := c.GetString("college_id")
	if collegeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "college_id is required"})
		return
	}

	stats, err := h.svc.GetDashboardStats(c.Request.Context(), collegeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": stats})
}

func (h *Handler) createAnnouncement(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	collegeID := c.GetString("college_id")
	if collegeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "college_id is required"})
		return
	}

	var req CreateAnnouncementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	announcement, err := h.svc.CreateAnnouncement(c.Request.Context(), collegeID, userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": announcement})
}

func (h *Handler) listAnnouncements(c *gin.Context) {
	collegeID := c.GetString("college_id")
	if collegeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "college_id is required"})
		return
	}

	announcements, err := h.svc.ListAnnouncements(c.Request.Context(), collegeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": announcements})
}
