package dsa

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMW gin.HandlerFunc, facultyMW gin.HandlerFunc) {
	dsa := rg.Group("/dsa")
	{
		dsa.GET("/problems", h.listProblems)
		dsa.GET("/problems/:id", h.getProblem)
		dsa.POST("/problems", authMW, facultyMW, h.createProblem)
		dsa.POST("/submit", authMW, h.submitCode)
		dsa.GET("/submissions", authMW, h.listSubmissions)
		dsa.GET("/submissions/:id", authMW, h.getSubmission)
		dsa.GET("/contests", h.listContests)
		dsa.GET("/contests/:id", h.getContest)
		dsa.POST("/contests", authMW, facultyMW, h.createContest)
		dsa.POST("/contests/:id/register", authMW, h.registerForContest)
		dsa.GET("/contests/:id/leaderboard", h.getContestLeaderboard)
		dsa.GET("/problems/:id/discussions", h.listDiscussions)
		dsa.POST("/problems/:id/discussions", authMW, h.createDiscussion)
	}
}

func (h *Handler) listProblems(c *gin.Context) {
	filter := ProblemFilter{
		Difficulty: c.Query("difficulty"),
		Topic:      c.Query("topic"),
		Search:     c.Query("search"),
		Cursor:     c.Query("cursor"),
	}
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			filter.Limit = n
		}
	}

	problems, nextCursor, err := h.svc.ListProblems(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": problems, "cursor": nextCursor})
}

func (h *Handler) getProblem(c *gin.Context) {
	id := c.Param("id")
	problem, err := h.svc.GetProblem(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "problem not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": problem})
}

func (h *Handler) createProblem(c *gin.Context) {
	userID := c.GetString("user_id")
	var req CreateProblemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	problem, err := h.svc.CreateProblem(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": problem})
}

func (h *Handler) submitCode(c *gin.Context) {
	userID := c.GetString("user_id")
	var req SubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	submission, err := h.svc.SubmitCode(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": submission})
}

func (h *Handler) listSubmissions(c *gin.Context) {
	userID := c.GetString("user_id")
	problemID := c.Query("problem_id")
	cursor := c.Query("cursor")

	submissions, nextCursor, err := h.svc.ListSubmissions(c.Request.Context(), userID, problemID, cursor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": submissions, "cursor": nextCursor})
}

func (h *Handler) getSubmission(c *gin.Context) {
	id := c.Param("id")
	submission, err := h.svc.GetSubmission(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "submission not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": submission})
}

func (h *Handler) listContests(c *gin.Context) {
	filter := ContestFilter{
		Cursor: c.Query("cursor"),
	}
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			filter.Limit = n
		}
	}

	contests, nextCursor, err := h.svc.ListContests(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": contests, "cursor": nextCursor})
}

func (h *Handler) getContest(c *gin.Context) {
	id := c.Param("id")
	contest, err := h.svc.GetContest(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "contest not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": contest})
}

func (h *Handler) createContest(c *gin.Context) {
	userID := c.GetString("user_id")
	var req CreateContestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	contest, err := h.svc.CreateContest(c.Request.Context(), userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": contest})
}

func (h *Handler) registerForContest(c *gin.Context) {
	contestID := c.Param("id")
	userID := c.GetString("user_id")
	if err := h.svc.RegisterForContest(c.Request.Context(), userID, contestID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "registered"})
}

func (h *Handler) getContestLeaderboard(c *gin.Context) {
	contestID := c.Param("id")
	entries, err := h.svc.GetContestLeaderboard(c.Request.Context(), contestID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": entries})
}

func (h *Handler) listDiscussions(c *gin.Context) {
	problemID := c.Param("id")
	cursor := c.Query("cursor")
	threads, nextCursor, err := h.svc.ListDiscussions(c.Request.Context(), problemID, cursor)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": threads, "cursor": nextCursor})
}

func (h *Handler) createDiscussion(c *gin.Context) {
	problemID := c.Param("id")
	userID := c.GetString("user_id")
	var req struct {
		Title   string `json:"title" binding:"required"`
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	thread, err := h.svc.CreateDiscussion(c.Request.Context(), userID, problemID, req.Title, req.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": thread})
}
