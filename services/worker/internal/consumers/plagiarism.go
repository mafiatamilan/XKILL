package consumers

import (
	"context"
	"encoding/json"

	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog/log"
)

type PlagiarismCheck struct {
	SubmissionID string `json:"submission_id"`
	ProblemID    string `json:"problem_id"`
	UserID       string `json:"user_id"`
	Code         string `json:"code"`
	Language     string `json:"language"`
	CollegeID    string `json:"college_id"`
}

type PlagiarismResult struct {
	SubmissionID  string  `json:"submission_id"`
	Similarity    float64 `json:"similarity"`
	MatchedWith   string  `json:"matched_with"`
	MatchedUserID string  `json:"matched_user_id"`
	Status        string  `json:"status"`
}

type PlagiarismConsumer struct {
	js  nats.JetStreamContext
	sub *nats.Subscription
}

func NewPlagiarismConsumer(js nats.JetStreamContext) *PlagiarismConsumer {
	return &PlagiarismConsumer{js: js}
}

func (c *PlagiarismConsumer) Start(ctx context.Context) error {
	sub, err := c.js.QueueSubscribe("worker.plagiarism", "plagiarism-workers", func(msg *nats.Msg) {
		var check PlagiarismCheck
		if err := json.Unmarshal(msg.Data, &check); err != nil {
			log.Error().Err(err).Msg("plagiarism: failed to unmarshal message")
			msg.Ack()
			return
		}

		log.Info().Str("submission_id", check.SubmissionID).Msg("plagiarism: processing")

		msg.Ack()
	}, nats.ManualAck(), nats.Durable("plagiarism-worker"), nats.MaxDeliver(3))
	if err != nil {
		return err
	}
	c.sub = sub
	return nil
}

func (c *PlagiarismConsumer) Stop() {
	if c.sub != nil {
		c.sub.Unsubscribe()
	}
}
