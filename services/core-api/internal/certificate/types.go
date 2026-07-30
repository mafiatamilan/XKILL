package certificate

import "time"

type Certificate struct {
	ID            string     `json:"id"`
	UserID        string     `json:"user_id"`
	CollegeID     string     `json:"college_id"`
	Title         string     `json:"title"`
	Issuer        string     `json:"issuer"`
	IssueDate     string     `json:"issue_date,omitempty"`
	ExpiryDate    string     `json:"expiry_date,omitempty"`
	CredentialID  string     `json:"credential_id,omitempty"`
	CredentialURL string     `json:"credential_url,omitempty"`
	FileURL       string     `json:"file_url,omitempty"`
	Category      string     `json:"category,omitempty"`
	IsVerified    bool       `json:"is_verified"`
	VerifiedBy    string     `json:"verified_by,omitempty"`
	VerifiedAt    *time.Time `json:"verified_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type CreateCertificateRequest struct {
	Title         string `json:"title" binding:"required"`
	Issuer        string `json:"issuer" binding:"required"`
	IssueDate     string `json:"issue_date"`
	ExpiryDate    string `json:"expiry_date"`
	CredentialID  string `json:"credential_id"`
	CredentialURL string `json:"credential_url"`
	FileURL       string `json:"file_url"`
	Category      string `json:"category"`
}
