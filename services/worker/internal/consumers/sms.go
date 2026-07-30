package consumers

import (
	"context"
	"encoding/json"

	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog/log"
)

type SMSMessage struct {
	To      string `json:"to"`
	From    string `json:"from"`
	Body    string `json:"body"`
	CollegeID string `json:"college_id,omitempty"`
}

type SMSConsumer struct {
	js  nats.JetStreamContext
	sub *nats.Subscription
}

func NewSMSConsumer(js nats.JetStreamContext) *SMSConsumer {
	return &SMSConsumer{js: js}
}

func (c *SMSConsumer) Start(ctx context.Context) error {
	sub, err := c.js.QueueSubscribe("worker.sms", "sms-workers", func(msg *nats.Msg) {
		var sms SMSMessage
		if err := json.Unmarshal(msg.Data, &sms); err != nil {
			log.Error().Err(err).Msg("sms: failed to unmarshal message")
			msg.Ack()
			return
		}

		log.Info().Str("to", sms.To).Msg("sms: processing")

		msg.Ack()
	}, nats.ManualAck(), nats.Durable("sms-worker"), nats.MaxDeliver(3))
	if err != nil {
		return err
	}
	c.sub = sub
	return nil
}

func (c *SMSConsumer) Stop() {
	if c.sub != nil {
		c.sub.Unsubscribe()
	}
}
