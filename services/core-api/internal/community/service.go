package community

import "context"

type CommunityService interface {
	CreatePost(ctx context.Context, post *Post) error
	GetPost(ctx context.Context, id string) (*Post, error)
	ListPosts(ctx context.Context, forumID string) ([]Post, error)
	VotePost(ctx context.Context, postID, userID string, upvote bool) error
	AddComment(ctx context.Context, comment *Comment) error
	GetComments(ctx context.Context, postID string) ([]Comment, error)
	ListForums(ctx context.Context, collegeID string) ([]Forum, error)
}
