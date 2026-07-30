package consumers

import (
	"context"
	"sync"

	"github.com/rs/zerolog/log"
)

type Consumer interface {
	Start(ctx context.Context) error
	Stop()
}

type consumerInstance struct {
	name     string
	consumer Consumer
}

var (
	instances []consumerInstance
	mu        sync.Mutex
)

func register(name string, c Consumer) {
	mu.Lock()
	defer mu.Unlock()
	instances = append(instances, consumerInstance{name: name, consumer: c})
}

func StartAll(consumers ...Consumer) {
	ctx := context.Background()
	for _, c := range consumers {
		name := getConsumerName(c)
		if err := c.Start(ctx); err != nil {
			log.Fatal().Err(err).Str("consumer", name).Msg("failed to start consumer")
		}
		log.Info().Str("consumer", name).Msg("consumer started")
	}
}

func StopAll() {
	mu.Lock()
	defer mu.Unlock()

	for _, inst := range instances {
		log.Info().Str("consumer", inst.name).Msg("stopping consumer")
		inst.consumer.Stop()
	}
}

func getConsumerName(c Consumer) string {
	switch c.(type) {
	case *EmailConsumer:
		return "email"
	case *PushConsumer:
		return "push"
	case *SMSConsumer:
		return "sms"
	case *AuditConsumer:
		return "audit-log"
	case *PlagiarismConsumer:
		return "plagiarism"
	case *CertificateConsumer:
		return "certificate-pdf"
	default:
		return "unknown"
	}
}
