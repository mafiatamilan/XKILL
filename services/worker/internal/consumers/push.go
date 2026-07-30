package consumers

import (
	"context"
	"encoding/json"

	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog/log"
)

type PushMessage struct {
	DeviceToken string            `json:"device_token"`
	Title       string            `json:"title"`
	Body        string            `json:"body"`
	Data        map[string]string `json:"data,omitempty"`
	Platform    string            `json:"platform"`
}

type PushConsumer struct {
	js  nats.JetStreamContext
	sub *nats.Subscription
}

func NewPushConsumer(js nats.JetStreamContext) *PushConsumer {
	return &PushConsumer{js: js}
}

func (c *PushConsumer) Start(ctx context.Context) error {
	sub, err := c.js.QueueSubscribe("worker.push", "push-workers", func(msg *nats.Msg) {
		var push PushMessage
		if err := json.Unmarshal(msg.Data, &push); err != nil {
			log.Error().Err(err).Msg("push: failed to unmarshal message")
			msg.Ack()
			return
		}

		log.Info().Str("platform", push.Platform).Str("title", push.Title).Msg("push: processing")

		msg.Ack()
	}, nats.ManualAck(), nats.Durable("push-worker"), nats.MaxDeliver(3))
	if err != nil {
		return err
	}
	c.sub = sub
	return nil
}

func (c *PushConsumer) Stop() {
	if c.sub != nil {
		c.sub.Unsubscribe()
	}
}
