package sysadmin

type FeatureFlag struct {
	ID                string `json:"id"`
	Key               string `json:"key"`
	Name              string `json:"name"`
	Description       string `json:"description,omitempty"`
	Enabled           bool   `json:"enabled"`
	RolloutPercentage int    `json:"rollout_percentage"`
	CollegeID         string `json:"college_id,omitempty"`
	CreatedAt         string `json:"created_at"`
	UpdatedAt         string `json:"updated_at"`
}

type CreateFeatureFlagRequest struct {
	Key               string `json:"key" binding:"required"`
	Name              string `json:"name" binding:"required"`
	Description       string `json:"description,omitempty"`
	Enabled           bool   `json:"enabled"`
	RolloutPercentage int    `json:"rollout_percentage"`
}

type AuditLogEntry struct {
	ID           string `json:"id"`
	ActorID      string `json:"actor_id,omitempty"`
	Action       string `json:"action"`
	ResourceType string `json:"resource_type"`
	ResourceID   string `json:"resource_id,omitempty"`
	BeforeState  string `json:"before_state,omitempty"`
	AfterState   string `json:"after_state,omitempty"`
	IPAddress    string `json:"ip_address,omitempty"`
	CreatedAt    string `json:"created_at"`
}

type HealthStatus struct {
	Status   string            `json:"status"`
	Services map[string]string `json:"services"`
	Uptime   string            `json:"uptime"`
	Version  string            `json:"version"`
}
