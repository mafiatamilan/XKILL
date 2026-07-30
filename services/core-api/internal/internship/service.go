package internship

import "context"

type InternshipService interface {
	ListInternships(ctx context.Context, filters map[string]string) ([]Internship, error)
	GetInternship(ctx context.Context, id string) (*Internship, error)
	PostInternship(ctx context.Context, internship *Internship) error
	Apply(ctx context.Context, app *InternshipApplication) error
	GetApplications(ctx context.Context, internshipID string) ([]InternshipApplication, error)
}
