package internship

import "context"

type Repository interface {
	ListInternships(ctx context.Context, filters map[string]string) ([]Internship, error)
	GetInternship(ctx context.Context, id string) (*Internship, error)
	CreateInternship(ctx context.Context, internship *Internship) error
	UpdateInternship(ctx context.Context, internship *Internship) error
	CreateApplication(ctx context.Context, app *InternshipApplication) error
	ListApplications(ctx context.Context, internshipID string) ([]InternshipApplication, error)
}
