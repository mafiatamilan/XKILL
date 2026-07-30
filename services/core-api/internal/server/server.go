package server

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"github.com/rs/cors"
	"github.com/xkill/services/core-api/internal/academic"
	"github.com/xkill/services/core-api/internal/admin"
	"github.com/xkill/services/core-api/internal/auth"
	"github.com/xkill/services/core-api/internal/career"
	"github.com/xkill/services/core-api/internal/certificate"
	"github.com/xkill/services/core-api/internal/config"
	"github.com/xkill/services/core-api/internal/dsa"
	"github.com/xkill/services/core-api/internal/interview"
	"github.com/xkill/services/core-api/internal/jobs"
	"github.com/xkill/services/core-api/internal/middleware"
	"github.com/xkill/services/core-api/internal/notification"
	"github.com/xkill/services/core-api/internal/placement"
	"github.com/xkill/services/core-api/internal/recruiter"
	"github.com/xkill/services/core-api/internal/resume"
	"github.com/xkill/services/core-api/internal/student"
	"github.com/xkill/services/core-api/internal/sysadmin"
	"github.com/xkill/services/core-api/internal/tpo"
)

func New(cfg *config.Config, pool *pgxpool.Pool, rdb *redis.Client, js nats.JetStreamContext) *gin.Engine {
	r := gin.New()

	r.Use(gin.Recovery())
	r.Use(middleware.RequestLogger())
	r.Use(corsMiddleware(cfg.AllowedOrigins))

	// Initialize services
	authRepo := auth.NewRepository(pool)
	authSvc := auth.NewService(authRepo, cfg.JWTSecret)
	authMW := middleware.AuthMiddleware(cfg.JWTSecret)
	adminMW := middleware.RequireRole("platform_admin", "college_admin")
	facultyMW := middleware.RequireRole("faculty")

	notifRepo := notification.NewRepository(pool)
	notifSvc := notification.NewService(notifRepo, js)
	notifHandler := notification.NewHandler(notifSvc)

	flagRepo := sysadmin.NewFlagRepository(pool)
	auditRepo := sysadmin.NewAuditLogRepository(pool)
	sysadminSvc := sysadmin.NewService(flagRepo, auditRepo, pool, "0.1.0")
	sysadminHandler := sysadmin.NewHandler(sysadminSvc)

	adminRepo := admin.NewRepository(pool)
	adminSvc := admin.NewService(adminRepo, sysadminSvc.WriteAuditLog)
	adminHandler := admin.NewHandler(adminSvc)

	// Phase 2 — Student & Academic
	studentRepo := student.NewRepository(pool)
	studentSvc := student.NewService(studentRepo)
	studentHandler := student.NewHandler(studentSvc)

	academicRepo := academic.NewRepository(pool)
	academicSvc := academic.NewService(academicRepo)
	academicHandler := academic.NewHandler(academicSvc)

	// Phase 3 — DSA
	dsaRepo := dsa.NewRepository(pool)
	dsaSvc := dsa.NewService(dsaRepo, js)
	dsaHandler := dsa.NewHandler(dsaSvc)

	// Phase 4 — Placement & Recruitment
	tpoMW := middleware.RequireRole("tpo")
	recruiterMW := middleware.RequireRole("recruiter")

	recruiterRepo := recruiter.NewRepository(pool)
	recruiterSvc := recruiter.NewService(recruiterRepo)
	recruiterHandler := recruiter.NewHandler(recruiterSvc)

	tpoRepo := tpo.NewRepository(pool)
	tpoSvc := tpo.NewService(tpoRepo, pool)
	tpoHandler := tpo.NewHandler(tpoSvc)

	placementRepo := placement.NewRepository(pool)
	placementSvc := placement.NewService(placementRepo)
	placementHandler := placement.NewHandler(placementSvc)

	jobsRepo := jobs.NewRepository(pool)
	jobsSvc := jobs.NewService(jobsRepo)
	jobsHandler := jobs.NewHandler(jobsSvc)

	// Phase 5 — Resume & Career Development
	resumeRepo := resume.NewRepository(pool)
	resumeSvc := resume.NewService(resumeRepo)
	resumeHandler := resume.NewHandler(resumeSvc)

	certRepo := certificate.NewRepository(pool)
	certSvc := certificate.NewService(certRepo)
	certHandler := certificate.NewHandler(certSvc)

	interviewRepo := interview.NewRepository(pool)
	interviewSvc := interview.NewService(interviewRepo)
	interviewHandler := interview.NewHandler(interviewSvc)

	careerRepo := career.NewRepository(pool)
	careerSvc := career.NewService(careerRepo)
	careerHandler := career.NewHandler(careerSvc)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")
	auth.RegisterRoutes(api.Group("/auth"), authSvc, authMW)
	notifHandler.RegisterRoutes(api, authMW)
	adminHandler.RegisterRoutes(api, authMW, adminMW)
	sysadminHandler.RegisterRoutes(api, authMW, adminMW)
	studentHandler.RegisterRoutes(api, authMW)
	academicHandler.RegisterRoutes(api, authMW)
	dsaHandler.RegisterRoutes(api, authMW, facultyMW)

	// Phase 4 — Placement & Recruitment
	recruiterHandler.RegisterRoutes(api, authMW)
	tpoHandler.RegisterRoutes(api, authMW)
	placementHandler.RegisterRoutes(api, authMW, tpoMW)
	jobsHandler.RegisterRoutes(api, authMW, recruiterMW)

	// Phase 5 — Resume & Career Development
	resumeHandler.RegisterRoutes(api, authMW)
	certHandler.RegisterRoutes(api, authMW, tpoMW)
	interviewHandler.RegisterRoutes(api, authMW, tpoMW)
	careerHandler.RegisterRoutes(api, authMW)

	_ = rdb

	return r
}

func corsMiddleware(allowedOrigins string) gin.HandlerFunc {
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{allowedOrigins},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Origin", "Content-Type", "Accept", "Authorization", "X-College-ID"},
		AllowCredentials: true,
	})
	return func(ctx *gin.Context) {
		c.HandlerFunc(ctx.Writer, ctx.Request)
		if ctx.Request.Method == "OPTIONS" {
			ctx.AbortWithStatus(204)
			return
		}
		ctx.Next()
	}
}
