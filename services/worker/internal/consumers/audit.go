package consumers

import (
	"context"
	"encoding/json"

	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog/log"
)

type AuditLogEntry struct {
	ActorID      string      `json:"actor_id"`
	Action       string      `json:"action"`
	ResourceType string      `json:"resource_type"`
	ResourceID   string      `json:"resource_id"`
	Before       interface{} `json:"before,omitempty"`
	After        interface{} `json:"after,omitempty"`
	CollegeID    string      `json:"college_id"`
	Timestamp    int64       `json:"timestamp"`
}

type AuditConsumer struct {
	js  nats.JetStreamContext
	sub *nats.Subscription
}

func NewAuditConsumer(js nats.JetStreamContext) *AuditConsumer {
	return &AuditConsumer{js: js}
}

func (c *AuditConsumer) Start(ctx context.Context) error {
	sub, err := c.js.QueueSubscribe("worker.audit-log", "audit-workers", func(msg *nats.Msg) {
		var entry AuditLogEntry
		if err := json.Unmarshal(msg.Data, &entry); err != nil {
			log.Error().Err(err).Msg("audit: failed to unmarshal message")
			msg.Ack()
			return
		}

		log.Info().Str("actor", entry.ActorID).Str("action", entry.Action).
			Str("resource", entry.ResourceType).Msg("audit: processing")

		msg.Ack()
	}, nats.ManualAck(), nats.Durable("audit-worker"), nats.MaxDeliver(3))
	if err != nil {
		return err
	}
	c.sub = sub
	return nil
}

func (c *AuditConsumer) Stop() {
	if c.sub != nil {
		c.sub.Unsubscribe()
	}
}
