package consumers

import (
	"context"
	"encoding/json"

	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog/log"
)

type CertificateRequest struct {
	CertificateID string `json:"certificate_id"`
	UserID        string `json:"user_id"`
	TemplateID    string `json:"template_id"`
	Metadata      string `json:"metadata"`
	CollegeID     string `json:"college_id"`
}

type CertificateConsumer struct {
	js  nats.JetStreamContext
	sub *nats.Subscription
}

func NewCertificateConsumer(js nats.JetStreamContext) *CertificateConsumer {
	return &CertificateConsumer{js: js}
}

func (c *CertificateConsumer) Start(ctx context.Context) error {
	sub, err := c.js.QueueSubscribe("worker.certificate-pdf", "certificate-workers", func(msg *nats.Msg) {
		var req CertificateRequest
		if err := json.Unmarshal(msg.Data, &req); err != nil {
			log.Error().Err(err).Msg("certificate: failed to unmarshal message")
			msg.Ack()
			return
		}

		log.Info().Str("certificate_id", req.CertificateID).Msg("certificate: processing")

		msg.Ack()
	}, nats.ManualAck(), nats.Durable("certificate-worker"), nats.MaxDeliver(3))
	if err != nil {
		return err
	}
	c.sub = sub
	return nil
}

func (c *CertificateConsumer) Stop() {
	if c.sub != nil {
		c.sub.Unsubscribe()
	}
}
