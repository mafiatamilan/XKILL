package payment

import "context"

type Repository interface {
	CreatePayment(ctx context.Context, payment *Payment) error
	UpdatePayment(ctx context.Context, payment *Payment) error
	GetPayment(ctx context.Context, id string) (*Payment, error)
	ListPayments(ctx context.Context, userID string) ([]Payment, error)
	CreateSubscription(ctx context.Context, sub *Subscription) error
	UpdateSubscription(ctx context.Context, sub *Subscription) error
	GetSubscription(ctx context.Context, id string) (*Subscription, error)
	ListPlans(ctx context.Context) ([]Plan, error)
}
