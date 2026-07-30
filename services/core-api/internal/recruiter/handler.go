package recruiter

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
	rg.POST("/companies", authMW, h.createCompany)
	rg.GET("/companies", h.listCompanies)
	rg.GET("/companies/:id", h.getCompany)
	rg.PUT("/companies/:id", authMW, h.updateCompany)
	rg.POST("/companies/:id/verify", authMW, h.verifyCompany)

	rg.POST("/recruiters/register", authMW, h.registerRecruiter)
	rg.GET("/recruiters/me", authMW, h.getMyProfile)
	rg.GET("/recruiters/:id", h.getRecruiter)
	rg.POST("/recruiters/:id/verify", authMW, h.verifyRecruiter)
}

func (h *Handler) createCompany(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	collegeID := c.GetString("college_id")

	var req CreateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	company, err := h.svc.CreateCompany(c.Request.Context(), collegeID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": company})
}

func (h *Handler) getCompany(c *gin.Context) {
	id := c.Param("id")

	company, err := h.svc.GetCompany(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": company})
}

func (h *Handler) listCompanies(c *gin.Context) {
	collegeID := c.Query("college_id")
	if collegeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "college_id is required"})
		return
	}

	companies, err := h.svc.ListCompanies(c.Request.Context(), collegeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": companies})
}

func (h *Handler) updateCompany(c *gin.Context) {
	id := c.Param("id")

	var req CreateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	company, err := h.svc.UpdateCompany(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": company})
}

func (h *Handler) verifyCompany(c *gin.Context) {
	id := c.Param("id")
	actorID := c.GetString("user_id")

	if err := h.svc.VerifyCompany(c.Request.Context(), id, actorID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "company verified successfully"})
}

func (h *Handler) registerRecruiter(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	collegeID := c.GetString("college_id")

	var req CreateRecruiterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	recruiter, err := h.svc.RegisterRecruiter(c.Request.Context(), userID, collegeID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": recruiter})
}

func (h *Handler) getMyProfile(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	recruiter, err := h.svc.GetMyProfile(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": recruiter})
}

func (h *Handler) getRecruiter(c *gin.Context) {
	id := c.Param("id")

	recruiter, err := h.svc.GetRecruiter(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": recruiter})
}

func (h *Handler) verifyRecruiter(c *gin.Context) {
	id := c.Param("id")

	if err := h.svc.VerifyRecruiter(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "recruiter verified successfully"})
}
