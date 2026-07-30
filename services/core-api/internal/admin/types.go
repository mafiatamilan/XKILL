package admin

type College struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Code      string `json:"code"`
	Domain    string `json:"domain,omitempty"`
	City      string `json:"city,omitempty"`
	State     string `json:"state,omitempty"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

type CreateCollegeRequest struct {
	Name   string `json:"name" binding:"required"`
	Code   string `json:"code" binding:"required"`
	Domain string `json:"domain,omitempty"`
	City   string `json:"city,omitempty"`
	State  string `json:"state,omitempty"`
}

type UserListItem struct {
	ID              string `json:"id"`
	Email           string `json:"email"`
	Name            string `json:"name"`
	Role            string `json:"role"`
	IsActive        bool   `json:"is_active"`
	IsEmailVerified bool   `json:"is_email_verified"`
	CollegeName     string `json:"college_name,omitempty"`
	CreatedAt       string `json:"created_at"`
}

type SuspendUserRequest struct {
	Reason string `json:"reason" binding:"required"`
}
