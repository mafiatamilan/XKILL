package jobs

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

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMW gin.HandlerFunc, recruiterMW gin.HandlerFunc) {
	rg.POST("/jobs", authMW, recruiterMW, h.postJob)
	rg.GET("/jobs", authMW, h.listJobs)
	rg.GET("/jobs/:id", authMW, h.getJob)
	rg.POST("/jobs/:id/apply", authMW, h.apply)
	rg.GET("/jobs/applications/mine", authMW, h.getMyApplications)
	rg.PUT("/jobs/:id/status", authMW, recruiterMW, h.updateJobStatus)
}

func (h *Handler) postJob(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	collegeID := c.GetString("college_id")

	var req CreateJobRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	job, err := h.svc.PostJob(c.Request.Context(), collegeID, userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": job})
}

func (h *Handler) getJob(c *gin.Context) {
	id := c.Param("id")

	job, err := h.svc.GetJob(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": job})
}

func (h *Handler) listJobs(c *gin.Context) {
	collegeID := c.GetString("college_id")
	if collegeID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	filters := make(map[string]string)
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if jobType := c.Query("job_type"); jobType != "" {
		filters["job_type"] = jobType
	}
	if title := c.Query("title"); title != "" {
		filters["title"] = title
	}

	jobs, err := h.svc.ListJobs(c.Request.Context(), collegeID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": jobs})
}

func (h *Handler) apply(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	jobID := c.Param("id")

	app, err := h.svc.Apply(c.Request.Context(), userID, jobID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": app})
}

func (h *Handler) getMyApplications(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	apps, err := h.svc.GetMyApplications(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": apps})
}

func (h *Handler) updateJobStatus(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.UpdateJobStatus(c.Request.Context(), id, req.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "job status updated"})
}
