package payment

import "time"

type Payment struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	Amount        float64   `json:"amount"`
	Currency      string    `json:"currency"`
	Status        string    `json:"status"`
	PaymentMethod string    `json:"payment_method"`
	Description   string    `json:"description"`
	CreatedAt     time.Time `json:"created_at"`
	PaidAt        *time.Time `json:"paid_at"`
}

type Invoice struct {
	ID        string    `json:"id"`
	PaymentID string    `json:"payment_id"`
	Number    string    `json:"number"`
	URL       string    `json:"url"`
	CreatedAt time.Time `json:"created_at"`
}

type Subscription struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	PlanID        string    `json:"plan_id"`
	Status        string    `json:"status"`
	CurrentPeriodStart time.Time `json:"current_period_start"`
	CurrentPeriodEnd   time.Time `json:"current_period_end"`
	CancelAtPeriodEnd  bool      `json:"cancel_at_period_end"`
}

type Plan struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	Interval    string  `json:"interval"`
	Features    string  `json:"features"`
	IsActive    bool    `json:"is_active"`
}
