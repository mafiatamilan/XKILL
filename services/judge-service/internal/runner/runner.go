package runner

import (
	"encoding/json"
	"sync"

	"github.com/nats-io/nats.go"
	"github.com/rs/zerolog/log"
	"github.com/xkill/services/judge-service/internal/sandbox"
)

type SubmissionMessage struct {
	SubmissionID string             `json:"submission_id"`
	ProblemID    string             `json:"problem_id"`
	Code         string             `json:"code"`
	Language     string             `json:"language"`
	TestCases    []sandbox.TestCase `json:"test_cases"`
}

type VerdictMessage struct {
	ID     string          `json:"submission_id"`
	Result *sandbox.Result `json:"result"`
}

type Runner struct {
	sandbox sandbox.Sandbox
	js      nats.JetStreamContext
	sub     *nats.Subscription
	stopCh  chan struct{}
	wg      sync.WaitGroup
}

func New(sb sandbox.Sandbox, js nats.JetStreamContext) *Runner {
	return &Runner{
		sandbox: sb,
		js:      js,
		stopCh:  make(chan struct{}),
	}
}

func (r *Runner) Start() error {
	sub, err := r.js.QueueSubscribe("judge.submissions.run", "judge-workers", func(msg *nats.Msg) {
		r.wg.Add(1)
		defer r.wg.Done()

		var submission SubmissionMessage
		if err := json.Unmarshal(msg.Data, &submission); err != nil {
			log.Error().Err(err).Msg("failed to unmarshal submission")
			msg.Nak()
			return
		}

		log.Info().Str("id", submission.SubmissionID).Msg("processing submission")

		result, err := r.sandbox.Run(submission.Code, submission.Language, submission.TestCases)
		if err != nil {
			log.Error().Err(err).Str("id", submission.SubmissionID).Msg("sandbox execution failed")
			msg.Nak()
			return
		}

		verdict := VerdictMessage{
			ID:     submission.SubmissionID,
			Result: result,
		}

		data, err := json.Marshal(verdict)
		if err != nil {
			log.Error().Err(err).Msg("failed to marshal verdict")
			msg.Nak()
			return
		}

		if _, err := r.js.Publish("judge.submissions.verdict", data); err != nil {
			log.Error().Err(err).Msg("failed to publish verdict")
			msg.Nak()
			return
		}

		msg.Ack()
	}, nats.ManualAck(), nats.Durable("judge-worker"), nats.MaxDeliver(3))
	if err != nil {
		return err
	}

	r.sub = sub
	return nil
}

func (r *Runner) Stop() {
	close(r.stopCh)
	if r.sub != nil {
		r.sub.Unsubscribe()
	}
	r.wg.Wait()
}
