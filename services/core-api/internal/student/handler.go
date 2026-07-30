package student

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
	student := rg.Group("/student", authMW)
	{
		student.GET("/profile", h.getProfile)
		student.PUT("/profile", h.updateProfile)
		student.GET("/skills", h.listSkills)
		student.POST("/skills", h.addSkill)
		student.DELETE("/skills/:id", h.removeSkill)
		student.GET("/career-goals", h.listCareerGoals)
		student.POST("/career-goals", h.addCareerGoal)
		student.PUT("/career-goals/:id", h.updateCareerGoal)
		student.DELETE("/career-goals/:id", h.removeCareerGoal)
	}
}

func (h *Handler) getProfile(c *gin.Context) {
	userID := c.GetString("user_id")
	profile, err := h.svc.GetProfile(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrProfileNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, profile)
}

func (h *Handler) updateProfile(c *gin.Context) {
	userID := c.GetString("user_id")
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	profile, err := h.svc.UpdateProfile(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, profile)
}

func (h *Handler) listSkills(c *gin.Context) {
	userID := c.GetString("user_id")
	skills, err := h.svc.ListSkills(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": skills})
}

func (h *Handler) addSkill(c *gin.Context) {
	userID := c.GetString("user_id")
	var req AddSkillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	skill, err := h.svc.AddSkill(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusCreated, skill)
}

func (h *Handler) removeSkill(c *gin.Context) {
	userID := c.GetString("user_id")
	skillID := c.Param("id")
	if err := h.svc.RemoveSkill(c.Request.Context(), userID, skillID); err != nil {
		if errors.Is(err, ErrSkillNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "skill not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "skill removed"})
}

func (h *Handler) listCareerGoals(c *gin.Context) {
	userID := c.GetString("user_id")
	goals, err := h.svc.ListCareerGoals(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": goals})
}

func (h *Handler) addCareerGoal(c *gin.Context) {
	userID := c.GetString("user_id")
	var req AddCareerGoalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	goal, err := h.svc.AddCareerGoal(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusCreated, goal)
}

func (h *Handler) updateCareerGoal(c *gin.Context) {
	userID := c.GetString("user_id")
	goalID := c.Param("id")
	var req AddCareerGoalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	goal, err := h.svc.UpdateCareerGoal(c.Request.Context(), userID, goalID, req)
	if err != nil {
		if errors.Is(err, ErrGoalNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "career goal not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, goal)
}

func (h *Handler) removeCareerGoal(c *gin.Context) {
	userID := c.GetString("user_id")
	goalID := c.Param("id")
	if err := h.svc.RemoveCareerGoal(c.Request.Context(), userID, goalID); err != nil {
		if errors.Is(err, ErrGoalNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "career goal not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "career goal removed"})
}
