package auditlog

import "time"

type AuditLogEntry struct {
	ActorID      string      `json:"actor_id"`
	Action       string      `json:"action"`
	ResourceType string      `json:"resource_type"`
	ResourceID   string      `json:"resource_id"`
	Before       interface{} `json:"before,omitempty"`
	After        interface{} `json:"after,omitempty"`
	Timestamp    time.Time   `json:"timestamp"`
}

type AuditLogWriter interface {
	Write(entry AuditLogEntry) error
}
