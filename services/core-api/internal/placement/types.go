package placement

import "time"

type Drive struct {
	ID          string    `json:"id"`
	CollegeID   string    `json:"college_id"`
	CompanyID   string    `json:"company_id"`
	CompanyName string    `json:"company_name"`
	Role        string    `json:"role"`
	PackageMin  float64   `json:"package_min,omitempty"`
	PackageMax  float64   `json:"package_max,omitempty"`
	Location    string    `json:"location,omitempty"`
	Description string    `json:"description,omitempty"`
	DriveDate   string    `json:"drive_date,omitempty"`
	Deadline    time.Time `json:"deadline,omitempty"`
	Status      string    `json:"status"`
	CreatedBy   string    `json:"created_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type DriveEligibility struct {
	ID              string   `json:"id"`
	DriveID         string   `json:"drive_id"`
	MinCGPA         float64  `json:"min_cgpa"`
	MaxBacklogs     int      `json:"max_backlogs"`
	AllowedBranches []string `json:"allowed_branches,omitempty"`
	AllowedYears    []int    `json:"allowed_years,omitempty"`
}

type Application struct {
	ID        string    `json:"id"`
	DriveID   string    `json:"drive_id"`
	StudentID string    `json:"student_id"`
	Status    string    `json:"status"`
	AppliedAt time.Time `json:"applied_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Offer struct {
	ID             string    `json:"id"`
	ApplicationID  string    `json:"application_id"`
	PackageAnnual  float64   `json:"package_annual,omitempty"`
	JoiningDate    string    `json:"joining_date,omitempty"`
	OfferLetterURL string    `json:"offer_letter_url,omitempty"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type PlacementStat struct {
	CollegeID      string  `json:"college_id"`
	TotalOffers    int     `json:"total_offers"`
	AcceptedOffers int     `json:"accepted_offers"`
	AvgPackage     float64 `json:"avg_package"`
	MaxPackage     float64 `json:"max_package"`
	PlacedStudents int     `json:"placed_students"`
	TotalDrives    int     `json:"total_drives"`
}

type CreateDriveRequest struct {
	CompanyID       string   `json:"company_id" binding:"required"`
	CompanyName     string   `json:"company_name" binding:"required"`
	Role            string   `json:"role" binding:"required"`
	PackageMin      float64  `json:"package_min"`
	PackageMax      float64  `json:"package_max"`
	Location        string   `json:"location"`
	Description     string   `json:"description"`
	DriveDate       string   `json:"drive_date"`
	Deadline        string   `json:"deadline"`
	MinCGPA         float64  `json:"min_cgpa"`
	MaxBacklogs     int      `json:"max_backlogs"`
	AllowedBranches []string `json:"allowed_branches"`
	AllowedYears    []int    `json:"allowed_years"`
}

type ApplyRequest struct {
	DriveID string `json:"drive_id" binding:"required"`
}
