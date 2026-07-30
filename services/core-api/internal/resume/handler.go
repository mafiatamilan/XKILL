package resume

import (
	"errors"
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
	rg.GET("/resumes/templates", authMW, h.listTemplates)
	rg.GET("/resumes", authMW, h.listResumes)
	rg.POST("/resumes", authMW, h.createResume)
	rg.GET("/resumes/:id", authMW, h.getResume)
	rg.PUT("/resumes/:id", authMW, h.updateResume)
	rg.DELETE("/resumes/:id", authMW, h.deleteResume)
	rg.POST("/resumes/:id/primary", authMW, h.setPrimary)
	rg.POST("/resumes/:id/analyze", authMW, h.analyze)
	rg.POST("/resumes/:id/sections", authMW, h.createSection)
	rg.PUT("/resumes/sections/:id", authMW, h.updateSection)
	rg.DELETE("/resumes/sections/:id", authMW, h.deleteSection)
}

func (h *Handler) listTemplates(c *gin.Context) {
	templates, err := h.svc.ListTemplates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": templates})
}

func (h *Handler) listResumes(c *gin.Context) {
	userID := c.GetString("user_id")
	studentID, err := h.svc.ResolveStudentID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student profile not found"})
		return
	}
	resumes, err := h.svc.ListResumes(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": resumes})
}

func (h *Handler) createResume(c *gin.Context) {
	userID := c.GetString("user_id")
	studentID, err := h.svc.ResolveStudentID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student profile not found"})
		return
	}
	var req CreateResumeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resume, err := h.svc.CreateResume(c.Request.Context(), studentID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": resume})
}

func (h *Handler) getResume(c *gin.Context) {
	id := c.Param("id")
	resume, err := h.svc.GetResume(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": resume})
}

func (h *Handler) updateResume(c *gin.Context) {
	id := c.Param("id")
	var req CreateResumeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resume, err := h.svc.UpdateResume(c.Request.Context(), id, &req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": resume})
}

func (h *Handler) deleteResume(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.DeleteResume(c.Request.Context(), id); err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "resume deleted"})
}

func (h *Handler) setPrimary(c *gin.Context) {
	userID := c.GetString("user_id")
	studentID, err := h.svc.ResolveStudentID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "student profile not found"})
		return
	}
	id := c.Param("id")
	if err := h.svc.SetPrimaryResume(c.Request.Context(), studentID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "primary resume updated"})
}

func (h *Handler) analyze(c *gin.Context) {
	id := c.Param("id")
	score, err := h.svc.AnalyzeResume(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ats_score": score})
}

func (h *Handler) createSection(c *gin.Context) {
	resumeID := c.Param("id")
	var req CreateSectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	section, err := h.svc.CreateSection(c.Request.Context(), resumeID, &req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "resume not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": section})
}

func (h *Handler) updateSection(c *gin.Context) {
	id := c.Param("id")
	var req UpdateSectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	section, err := h.svc.UpdateSection(c.Request.Context(), id, &req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "section not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": section})
}

func (h *Handler) deleteSection(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.DeleteSection(c.Request.Context(), id); err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "section not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "section deleted"})
}
