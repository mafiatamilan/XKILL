package placement

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

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMW gin.HandlerFunc, tpoMW gin.HandlerFunc) {
	drives := rg.Group("/placement/drives")
	drives.Use(authMW)
	{
		drives.POST("", tpoMW, h.createDrive)
		drives.GET("", h.listDrives)
		drives.GET("/:id", h.getDrive)
		drives.PUT("/:id/status", tpoMW, h.updateDriveStatus)
	}

	rg.POST("/placement/apply", authMW, h.apply)
	rg.GET("/placement/applications", authMW, h.getMyApplications)
	rg.GET("/placement/applications/:id", authMW, h.getDriveApplications)
	rg.GET("/placement/stats", authMW, h.getStats)
}

func (h *Handler) createDrive(c *gin.Context) {
	var req CreateDriveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	collegeID := c.GetString("college_id")
	userID := c.GetString("user_id")

	drive, err := h.svc.CreateDrive(c.Request.Context(), collegeID, userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, drive)
}

func (h *Handler) listDrives(c *gin.Context) {
	collegeID := c.GetString("college_id")
	status := c.Query("status")

	drives, err := h.svc.ListDrives(c.Request.Context(), collegeID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, drives)
}

func (h *Handler) getDrive(c *gin.Context) {
	id := c.Param("id")

	drive, elig, err := h.svc.GetDrive(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if drive == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "drive not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"drive":       drive,
		"eligibility": elig,
	})
}

func (h *Handler) updateDriveStatus(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.UpdateDriveStatus(c.Request.Context(), id, req.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "status updated"})
}

func (h *Handler) apply(c *gin.Context) {
	var req ApplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	studentID := c.GetString("user_id")

	app, err := h.svc.Apply(c.Request.Context(), studentID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, app)
}

func (h *Handler) getMyApplications(c *gin.Context) {
	studentID := c.GetString("user_id")

	apps, err := h.svc.GetMyApplications(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, apps)
}

func (h *Handler) getDriveApplications(c *gin.Context) {
	driveID := c.Param("id")

	apps, err := h.svc.GetApplications(c.Request.Context(), driveID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, apps)
}

func (h *Handler) getStats(c *gin.Context) {
	collegeID := c.GetString("college_id")

	stats, err := h.svc.GetPlacementStats(c.Request.Context(), collegeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}
