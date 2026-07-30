package sysadmin

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Service interface {
	CreateFlag(ctx context.Context, req CreateFeatureFlagRequest) (*FeatureFlag, error)
	ListFlags(ctx context.Context, collegeID string) ([]FeatureFlag, error)
	UpdateFlag(ctx context.Context, id string, req CreateFeatureFlagRequest) (*FeatureFlag, error)
	IsEnabled(ctx context.Context, key string) (bool, error)
	WriteAuditLog(ctx context.Context, actorID, action, resourceType, resourceID, before, after string) error
	ListAuditLogs(ctx context.Context, action, resourceType string, limit int, cursor string) ([]AuditLogEntry, string, error)
	GetHealth(ctx context.Context) (*HealthStatus, error)
}

type service struct {
	flagRepo  FlagRepository
	auditRepo AuditLogRepository
	pool      *pgxpool.Pool
	startTime time.Time
	version   string
}

func NewService(flagRepo FlagRepository, auditRepo AuditLogRepository, pool *pgxpool.Pool, version string) Service {
	return &service{
		flagRepo:  flagRepo,
		auditRepo: auditRepo,
		pool:      pool,
		startTime: time.Now(),
		version:   version,
	}
}

func (s *service) CreateFlag(ctx context.Context, req CreateFeatureFlagRequest) (*FeatureFlag, error) {
	flag := &FeatureFlag{
		Key:               req.Key,
		Name:              req.Name,
		Description:       req.Description,
		Enabled:           req.Enabled,
		RolloutPercentage: req.RolloutPercentage,
	}

	if err := s.flagRepo.CreateFlag(ctx, flag); err != nil {
		return nil, err
	}

	return flag, nil
}

func (s *service) ListFlags(ctx context.Context, collegeID string) ([]FeatureFlag, error) {
	return s.flagRepo.ListFlags(ctx, collegeID)
}

func (s *service) UpdateFlag(ctx context.Context, id string, req CreateFeatureFlagRequest) (*FeatureFlag, error) {
	flag, err := s.flagRepo.GetFlagByID(ctx, id)
	if err != nil {
		return nil, err
	}

	flag.Key = req.Key
	flag.Name = req.Name
	flag.Description = req.Description
	flag.Enabled = req.Enabled
	flag.RolloutPercentage = req.RolloutPercentage

	if err := s.flagRepo.UpdateFlag(ctx, flag); err != nil {
		return nil, err
	}

	return flag, nil
}

func (s *service) IsEnabled(ctx context.Context, key string) (bool, error) {
	flag, err := s.flagRepo.GetFlagByKey(ctx, key)
	if err != nil {
		if errors.Is(err, ErrFlagNotFound) {
			return false, nil
		}
		return false, err
	}
	return flag.Enabled, nil
}

func (s *service) WriteAuditLog(ctx context.Context, actorID, action, resourceType, resourceID, before, after string) error {
	entry := &AuditLogEntry{
		ActorID:      actorID,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		BeforeState:  before,
		AfterState:   after,
	}
	return s.auditRepo.WriteEntry(ctx, entry)
}

func (s *service) ListAuditLogs(ctx context.Context, action, resourceType string, limit int, cursor string) ([]AuditLogEntry, string, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return s.auditRepo.ListEntries(ctx, action, resourceType, limit, cursor)
}

func (s *service) GetHealth(ctx context.Context) (*HealthStatus, error) {
	services := map[string]string{}

	err := s.pool.Ping(ctx)
	if err != nil {
		services["database"] = "unhealthy"
	} else {
		services["database"] = "healthy"
	}

	status := "healthy"
	for _, v := range services {
		if v == "unhealthy" {
			status = "degraded"
			break
		}
	}

	uptime := time.Since(s.startTime).Round(time.Second).String()

	return &HealthStatus{
		Status:   status,
		Services: services,
		Uptime:   uptime,
		Version:  s.version,
	}, nil
}


