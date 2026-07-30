package admin

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
	admin := rg.Group("/admin", auth, adminAuth)
	{
		admin.POST("/colleges", h.onboardCollege)
		admin.GET("/colleges", h.listColleges)
		admin.GET("/users", h.listUsers)
		admin.GET("/users/:id", h.getUser)
		admin.POST("/users/:id/suspend", h.suspendUser)
		admin.POST("/users/:id/reactivate", h.reactivateUser)
		admin.POST("/recruiters/approve", h.approveRecruiter)
	}
}

func (h *Handler) onboardCollege(c *gin.Context) {
	var req CreateCollegeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	college, err := h.svc.OnboardCollege(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, ErrDuplicateCode) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusCreated, college)
}

func (h *Handler) listColleges(c *gin.Context) {
	limit := parseIntQuery(c.DefaultQuery("limit", "20"), 20)
	cursor := c.Query("cursor")

	colleges, nextCursor, err := h.svc.ListColleges(c.Request.Context(), limit, cursor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       colleges,
		"next_cursor": nextCursor,
	})
}

func (h *Handler) listUsers(c *gin.Context) {
	search := c.Query("search")
	role := c.Query("role")
	limit := parseIntQuery(c.DefaultQuery("limit", "20"), 20)
	cursor := c.Query("cursor")

	users, nextCursor, err := h.svc.ListUsers(c.Request.Context(), search, role, limit, cursor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       users,
		"next_cursor": nextCursor,
	})
}

func (h *Handler) getUser(c *gin.Context) {
	userID := c.Param("id")

	user, err := h.svc.GetUser(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *Handler) suspendUser(c *gin.Context) {
	var req SuspendUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.Param("id")
	actorID := c.GetString("user_id")

	if err := h.svc.SuspendUser(c.Request.Context(), actorID, userID, req.Reason); err != nil {
		if errors.Is(err, ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user suspended"})
}

func (h *Handler) reactivateUser(c *gin.Context) {
	userID := c.Param("id")
	actorID := c.GetString("user_id")

	if err := h.svc.ReactivateUser(c.Request.Context(), actorID, userID); err != nil {
		if errors.Is(err, ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user reactivated"})
}

type approveRecruiterRequest struct {
	UserID string `json:"user_id" binding:"required"`
}

func (h *Handler) approveRecruiter(c *gin.Context) {
	var req approveRecruiterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	actorID := c.GetString("user_id")

	if err := h.svc.ApproveRecruiter(c.Request.Context(), actorID, req.UserID); err != nil {
		if errors.Is(err, ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "recruiter approved"})
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
