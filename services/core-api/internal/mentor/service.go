package mentor

import "context"

type MentorService interface {
	ListMentors(ctx context.Context, collegeID string) ([]Mentor, error)
	GetMentor(ctx context.Context, id string) (*Mentor, error)
	RegisterAsMentor(ctx context.Context, mentor *Mentor) error
	UpdateAvailability(ctx context.Context, mentorID string, available bool) error
	BookSession(ctx context.Context, session *MentorshipSession) error
	GetSessions(ctx context.Context, mentorID string) ([]MentorshipSession, error)
	SubmitReview(ctx context.Context, review *MentorReview) error
}
