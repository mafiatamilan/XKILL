package community

import "time"

type Post struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Tags      []string  `json:"tags"`
	Upvotes   int       `json:"upvotes"`
	Downvotes int       `json:"downvotes"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Comment struct {
	ID        string    `json:"id"`
	PostID    string    `json:"post_id"`
	UserID    string    `json:"user_id"`
	Content   string    `json:"content"`
	ParentID  string    `json:"parent_id"`
	CreatedAt time.Time `json:"created_at"`
}

type Forum struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CollegeID   string `json:"college_id"`
	IsPrivate   bool   `json:"is_private"`
}
