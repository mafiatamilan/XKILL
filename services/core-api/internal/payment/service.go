package payment

import "context"

type PaymentService interface {
	CreatePayment(ctx context.Context, payment *Payment) error
	ProcessPayment(ctx context.Context, id string) error
	GetPayment(ctx context.Context, id string) (*Payment, error)
	ListPayments(ctx context.Context, userID string) ([]Payment, error)
	CreateSubscription(ctx context.Context, sub *Subscription) error
	CancelSubscription(ctx context.Context, id string) error
	ListPlans(ctx context.Context) ([]Plan, error)
}
