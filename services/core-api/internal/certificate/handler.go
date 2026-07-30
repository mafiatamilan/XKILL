package certificate

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
	rg.POST("/certificates", authMW, h.create)
	rg.GET("/certificates", authMW, h.listMy)
	rg.GET("/certificates/:id", authMW, h.get)
	rg.DELETE("/certificates/:id", authMW, h.delete)
	rg.GET("/certificates/college/all", authMW, tpoMW, h.listCollege)
	rg.POST("/certificates/:id/verify", authMW, tpoMW, h.verify)
}

func (h *Handler) create(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	collegeID := c.GetString("college_id")

	var req CreateCertificateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cert, err := h.svc.CreateCertificate(c.Request.Context(), userID, collegeID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": cert})
}

func (h *Handler) get(c *gin.Context) {
	id := c.Param("id")

	cert, err := h.svc.GetCertificate(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": cert})
}

func (h *Handler) listMy(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	certs, err := h.svc.ListMyCertificates(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": certs})
}

func (h *Handler) delete(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")

	if err := h.svc.DeleteCertificate(c.Request.Context(), id, userID); err != nil {
		if err.Error() == "forbidden" {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "certificate deleted"})
}

func (h *Handler) listCollege(c *gin.Context) {
	collegeID := c.GetString("college_id")
	if collegeID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	certs, err := h.svc.ListCollegeCertificates(c.Request.Context(), collegeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": certs})
}

func (h *Handler) verify(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	id := c.Param("id")

	if err := h.svc.VerifyCertificate(c.Request.Context(), id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "certificate verified"})
}
