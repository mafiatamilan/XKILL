package mentor

import "context"

type Repository interface {
	ListMentors(ctx context.Context, collegeID string) ([]Mentor, error)
	GetMentor(ctx context.Context, id string) (*Mentor, error)
	CreateMentor(ctx context.Context, mentor *Mentor) error
	UpdateMentor(ctx context.Context, mentor *Mentor) error
	CreateSession(ctx context.Context, session *MentorshipSession) error
	ListSessions(ctx context.Context, mentorID string) ([]MentorshipSession, error)
	UpdateSession(ctx context.Context, session *MentorshipSession) error
	CreateReview(ctx context.Context, review *MentorReview) error
}
