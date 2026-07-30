package consumers

import (
	"context"
	"encoding/json"

	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog/log"
)

type EmailMessage struct {
	To       []string `json:"to"`
	Subject  string   `json:"subject"`
	Body     string   `json:"body"`
	HTMLBody string   `json:"html_body"`
	CC       []string `json:"cc,omitempty"`
	BCC      []string `json:"bcc,omitempty"`
}

type EmailConsumer struct {
	js nats.JetStreamContext
	sub *nats.Subscription
}

func NewEmailConsumer(js nats.JetStreamContext) *EmailConsumer {
	return &EmailConsumer{js: js}
}

func (c *EmailConsumer) Start(ctx context.Context) error {
	sub, err := c.js.QueueSubscribe("worker.email", "email-workers", func(msg *nats.Msg) {
		var email EmailMessage
		if err := json.Unmarshal(msg.Data, &email); err != nil {
			log.Error().Err(err).Msg("email: failed to unmarshal message")
			msg.Ack()
			return
		}

		log.Info().Strs("to", email.To).Str("subject", email.Subject).Msg("email: processing")

		msg.Ack()
	}, nats.ManualAck(), nats.Durable("email-worker"), nats.MaxDeliver(3))
	if err != nil {
		return err
	}
	c.sub = sub
	return nil
}

func (c *EmailConsumer) Stop() {
	if c.sub != nil {
		c.sub.Unsubscribe()
	}
}
