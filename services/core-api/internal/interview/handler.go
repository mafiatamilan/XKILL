package interview

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
	rg.GET("/interview/questions", authMW, h.listQuestions)
	rg.POST("/interview/questions", authMW, h.createQuestion)
	rg.GET("/interview/questions/:id", authMW, h.getQuestion)
	rg.PUT("/interview/questions/:id", authMW, h.updateQuestion)
	rg.DELETE("/interview/questions/:id", authMW, h.deleteQuestion)

	rg.GET("/interview/experiences", authMW, h.listExperiences)
	rg.POST("/interview/experiences", authMW, h.shareExperience)
	rg.GET("/interview/experiences/:id", authMW, h.getExperience)
	rg.POST("/interview/experiences/:id/approve", authMW, tpoMW, h.approveExperience)

	rg.POST("/interview/mock", authMW, h.scheduleMock)
	rg.GET("/interview/mock", authMW, h.listMyMocks)
	rg.PUT("/interview/mock/:id", authMW, h.updateMockStatus)
}

func (h *Handler) listQuestions(c *gin.Context) {
	collegeID := c.GetString("college_id")
	qs, err := h.svc.ListQuestions(c.Request.Context(), collegeID, c.Query("category"), c.Query("difficulty"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": qs})
}

func (h *Handler) createQuestion(c *gin.Context) {
	var req CreateQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	collegeID := c.GetString("college_id")
	userID := c.GetString("user_id")
	q, err := h.svc.CreateQuestion(c.Request.Context(), collegeID, userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": q})
}

func (h *Handler) getQuestion(c *gin.Context) {
	q, err := h.svc.GetQuestion(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "question not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": q})
}

func (h *Handler) updateQuestion(c *gin.Context) {
	var req CreateQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	q, err := h.svc.UpdateQuestion(c.Request.Context(), c.Param("id"), &req)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "question not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": q})
}

func (h *Handler) deleteQuestion(c *gin.Context) {
	if err := h.svc.DeleteQuestion(c.Request.Context(), c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *Handler) listExperiences(c *gin.Context) {
	collegeID := c.GetString("college_id")
	exps, err := h.svc.ListExperiences(c.Request.Context(), collegeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": exps})
}

func (h *Handler) shareExperience(c *gin.Context) {
	var req CreateExperienceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	collegeID := c.GetString("college_id")
	studentID := c.GetString("user_id")
	e, err := h.svc.ShareExperience(c.Request.Context(), studentID, collegeID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": e})
}

func (h *Handler) getExperience(c *gin.Context) {
	e, err := h.svc.GetExperience(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "experience not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": e})
}

func (h *Handler) approveExperience(c *gin.Context) {
	if err := h.svc.ApproveExperience(c.Request.Context(), c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "approved"})
}

func (h *Handler) scheduleMock(c *gin.Context) {
	var req ScheduleMockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	studentID := c.GetString("user_id")
	m, err := h.svc.ScheduleMock(c.Request.Context(), studentID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": m})
}

func (h *Handler) listMyMocks(c *gin.Context) {
	studentID := c.GetString("user_id")
	mocks, err := h.svc.ListMyMocks(c.Request.Context(), studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": mocks})
}

func (h *Handler) updateMockStatus(c *gin.Context) {
	var req UpdateMockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.UpdateMockStatus(c.Request.Context(), c.Param("id"), req.Status, req.Feedback, req.Rating); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "updated"})
}
