package community

import "context"

type Repository interface {
	CreatePost(ctx context.Context, post *Post) error
	GetPost(ctx context.Context, id string) (*Post, error)
	ListPosts(ctx context.Context, forumID string) ([]Post, error)
	UpdatePostVotes(ctx context.Context, id string, upvotes, downvotes int) error
	CreateComment(ctx context.Context, comment *Comment) error
	ListComments(ctx context.Context, postID string) ([]Comment, error)
	ListForums(ctx context.Context, collegeID string) ([]Forum, error)
}
