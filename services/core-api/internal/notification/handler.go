package notification

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, auth gin.HandlerFunc) {
	notif := rg.Group("/notifications", auth)
	{
		notif.GET("", h.List)
		notif.GET("/unread-count", h.GetUnreadCount)
		notif.PUT("/:id/read", h.MarkRead)
		notif.PUT("/read-all", h.MarkAllRead)
		notif.POST("", h.Send)
	}

	prefs := rg.Group("/notifications/preferences", auth)
	{
		prefs.GET("", h.GetPreferences)
		prefs.PUT("", h.UpdatePreferences)
	}
}

func (h *Handler) Send(c *gin.Context) {
	var req SendNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.Send(c.Request.Context(), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "notification sent"})
}

func (h *Handler) List(c *gin.Context) {
	userID, _ := uuid.Parse(c.GetString("user_id"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	cursor := c.Query("cursor")

	notifs, next, err := h.svc.List(c.Request.Context(), userID, limit, cursor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": notifs, "next_cursor": next})
}

func (h *Handler) GetUnreadCount(c *gin.Context) {
	userID, _ := uuid.Parse(c.GetString("user_id"))
	count, err := h.svc.GetUnreadCount(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (h *Handler) MarkRead(c *gin.Context) {
	userID, _ := uuid.Parse(c.GetString("user_id"))
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.svc.MarkRead(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "marked as read"})
}

func (h *Handler) MarkAllRead(c *gin.Context) {
	userID, _ := uuid.Parse(c.GetString("user_id"))
	if err := h.svc.MarkAllRead(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "all marked as read"})
}

func (h *Handler) GetPreferences(c *gin.Context) {
	userID, _ := uuid.Parse(c.GetString("user_id"))
	prefs, err := h.svc.GetPreferences(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, prefs)
}

func (h *Handler) UpdatePreferences(c *gin.Context) {
	userID, _ := uuid.Parse(c.GetString("user_id"))
	var prefs NotificationPreference
	if err := c.ShouldBindJSON(&prefs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	prefs.UserID = userID
	if err := h.svc.UpdatePreferences(c.Request.Context(), &prefs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "preferences updated"})
}
