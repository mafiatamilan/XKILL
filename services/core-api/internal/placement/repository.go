package placement

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	CreateDrive(ctx context.Context, drive *Drive) error
	GetDrive(ctx context.Context, id string) (*Drive, error)
	ListDrives(ctx context.Context, collegeID, status string) ([]Drive, error)
	UpdateDrive(ctx context.Context, drive *Drive) error

	SetEligibility(ctx context.Context, e *DriveEligibility) error
	GetEligibility(ctx context.Context, driveID string) (*DriveEligibility, error)

	CreateApplication(ctx context.Context, app *Application) error
	GetApplication(ctx context.Context, id string) (*Application, error)
	ListApplications(ctx context.Context, driveID string) ([]Application, error)
	ListStudentApplications(ctx context.Context, studentID string) ([]Application, error)
	UpdateApplicationStatus(ctx context.Context, id, status string) error

	CreateOffer(ctx context.Context, offer *Offer) error
	GetOffer(ctx context.Context, applicationID string) (*Offer, error)
	UpdateOfferStatus(ctx context.Context, id, status string) error
	ListOffers(ctx context.Context, collegeID string) ([]Offer, error)

	GetPlacementStats(ctx context.Context, collegeID string) (*PlacementStat, error)
}

type pgRepo struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgRepo{pool: pool}
}

func (r *pgRepo) CreateDrive(ctx context.Context, drive *Drive) error {
	query := `INSERT INTO placement_drives
		(id, college_id, company_id, company_name, role, package_min, package_max,
		 location, description, drive_date, deadline, status, created_by, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NULLIF($10,'')::date, $11,$12,$13,$14,$15)`

	_, err := r.pool.Exec(ctx, query,
		drive.ID, drive.CollegeID, drive.CompanyID, drive.CompanyName, drive.Role,
		drive.PackageMin, drive.PackageMax, drive.Location, drive.Description,
		drive.DriveDate, drive.Deadline, drive.Status, drive.CreatedBy,
		drive.CreatedAt, drive.UpdatedAt,
	)
	return err
}

func (r *pgRepo) GetDrive(ctx context.Context, id string) (*Drive, error) {
	query := `SELECT id, college_id, company_id, company_name, role,
		package_min, package_max, location, description, drive_date, deadline,
		status, created_by, created_at, updated_at
		FROM placement_drives WHERE id = $1`

	row := r.pool.QueryRow(ctx, query, id)
	d := &Drive{}
	var driveDate *time.Time
	err := row.Scan(
		&d.ID, &d.CollegeID, &d.CompanyID, &d.CompanyName, &d.Role,
		&d.PackageMin, &d.PackageMax, &d.Location, &d.Description,
		&driveDate, &d.Deadline, &d.Status, &d.CreatedBy,
		&d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if driveDate != nil {
		d.DriveDate = driveDate.Format("2006-01-02")
	}
	return d, nil
}

func (r *pgRepo) ListDrives(ctx context.Context, collegeID, status string) ([]Drive, error) {
	args := []any{collegeID}
	query := `SELECT id, college_id, company_id, company_name, role,
		package_min, package_max, location, description, drive_date, deadline,
		status, created_by, created_at, updated_at
		FROM placement_drives WHERE college_id = $1`

	if status != "" {
		args = append(args, status)
		query += fmt.Sprintf(" AND status = $%d", len(args))
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drives []Drive
	for rows.Next() {
		var d Drive
		var driveDate *time.Time
		err := rows.Scan(
			&d.ID, &d.CollegeID, &d.CompanyID, &d.CompanyName, &d.Role,
			&d.PackageMin, &d.PackageMax, &d.Location, &d.Description,
			&driveDate, &d.Deadline, &d.Status, &d.CreatedBy,
			&d.CreatedAt, &d.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if driveDate != nil {
			d.DriveDate = driveDate.Format("2006-01-02")
		}
		drives = append(drives, d)
	}
	return drives, rows.Err()
}

func (r *pgRepo) UpdateDrive(ctx context.Context, drive *Drive) error {
	query := `UPDATE placement_drives SET
		company_id=$1, company_name=$2, role=$3, package_min=$4, package_max=$5,
		location=$6, description=$7, drive_date=NULLIF($8,'')::date, deadline=$9,
		status=$10, updated_at=NOW()
		WHERE id=$11`

	_, err := r.pool.Exec(ctx, query,
		drive.CompanyID, drive.CompanyName, drive.Role,
		drive.PackageMin, drive.PackageMax, drive.Location, drive.Description,
		drive.DriveDate, drive.Deadline, drive.Status, drive.ID,
	)
	return err
}

func (r *pgRepo) SetEligibility(ctx context.Context, e *DriveEligibility) error {
	query := `INSERT INTO drive_eligibility
		(id, drive_id, min_cgpa, max_backlogs, allowed_branches, allowed_years, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,NOW())
		ON CONFLICT (drive_id) DO UPDATE SET
		min_cgpa=EXCLUDED.min_cgpa, max_backlogs=EXCLUDED.max_backlogs,
		allowed_branches=EXCLUDED.allowed_branches, allowed_years=EXCLUDED.allowed_years`

	_, err := r.pool.Exec(ctx, query,
		e.ID, e.DriveID, e.MinCGPA, e.MaxBacklogs,
		e.AllowedBranches, e.AllowedYears,
	)
	return err
}

func (r *pgRepo) GetEligibility(ctx context.Context, driveID string) (*DriveEligibility, error) {
	query := `SELECT id, drive_id, min_cgpa, max_backlogs, allowed_branches, allowed_years
		FROM drive_eligibility WHERE drive_id = $1`

	row := r.pool.QueryRow(ctx, query, driveID)
	e := &DriveEligibility{}
	err := row.Scan(&e.ID, &e.DriveID, &e.MinCGPA, &e.MaxBacklogs, &e.AllowedBranches, &e.AllowedYears)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return e, nil
}

func (r *pgRepo) CreateApplication(ctx context.Context, app *Application) error {
	query := `INSERT INTO placement_applications
		(id, drive_id, student_id, status, applied_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6)`

	_, err := r.pool.Exec(ctx, query,
		app.ID, app.DriveID, app.StudentID, app.Status, app.AppliedAt, app.UpdatedAt,
	)
	return err
}

func (r *pgRepo) GetApplication(ctx context.Context, id string) (*Application, error) {
	query := `SELECT id, drive_id, student_id, status, applied_at, updated_at
		FROM placement_applications WHERE id = $1`

	row := r.pool.QueryRow(ctx, query, id)
	a := &Application{}
	err := row.Scan(&a.ID, &a.DriveID, &a.StudentID, &a.Status, &a.AppliedAt, &a.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return a, nil
}

func (r *pgRepo) ListApplications(ctx context.Context, driveID string) ([]Application, error) {
	query := `SELECT id, drive_id, student_id, status, applied_at, updated_at
		FROM placement_applications WHERE drive_id = $1 ORDER BY applied_at DESC`

	rows, err := r.pool.Query(ctx, query, driveID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apps []Application
	for rows.Next() {
		var a Application
		if err := rows.Scan(&a.ID, &a.DriveID, &a.StudentID, &a.Status, &a.AppliedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		apps = append(apps, a)
	}
	return apps, rows.Err()
}

func (r *pgRepo) ListStudentApplications(ctx context.Context, studentID string) ([]Application, error) {
	query := `SELECT id, drive_id, student_id, status, applied_at, updated_at
		FROM placement_applications WHERE student_id = $1 ORDER BY applied_at DESC`

	rows, err := r.pool.Query(ctx, query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apps []Application
	for rows.Next() {
		var a Application
		if err := rows.Scan(&a.ID, &a.DriveID, &a.StudentID, &a.Status, &a.AppliedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		apps = append(apps, a)
	}
	return apps, rows.Err()
}

func (r *pgRepo) UpdateApplicationStatus(ctx context.Context, id, status string) error {
	query := `UPDATE placement_applications SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, status, id)
	return err
}

func (r *pgRepo) CreateOffer(ctx context.Context, offer *Offer) error {
	query := `INSERT INTO offers
		(id, application_id, package_annual, joining_date, offer_letter_url, status, created_at, updated_at)
		VALUES ($1,$2,$3, NULLIF($4,'')::date, $5,$6,$7,$8)`

	_, err := r.pool.Exec(ctx, query,
		offer.ID, offer.ApplicationID, offer.PackageAnnual,
		offer.JoiningDate, offer.OfferLetterURL, offer.Status,
		offer.CreatedAt, offer.UpdatedAt,
	)
	return err
}

func (r *pgRepo) GetOffer(ctx context.Context, applicationID string) (*Offer, error) {
	query := `SELECT id, application_id, package_annual, joining_date, offer_letter_url,
		status, created_at, updated_at
		FROM offers WHERE application_id = $1`

	row := r.pool.QueryRow(ctx, query, applicationID)
	o := &Offer{}
	var joiningDate *time.Time
	err := row.Scan(
		&o.ID, &o.ApplicationID, &o.PackageAnnual,
		&joiningDate, &o.OfferLetterURL, &o.Status,
		&o.CreatedAt, &o.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	if joiningDate != nil {
		o.JoiningDate = joiningDate.Format("2006-01-02")
	}
	return o, nil
}

func (r *pgRepo) UpdateOfferStatus(ctx context.Context, id, status string) error {
	query := `UPDATE offers SET status = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, status, id)
	return err
}

func (r *pgRepo) ListOffers(ctx context.Context, collegeID string) ([]Offer, error) {
	query := `SELECT o.id, o.application_id, o.package_annual, o.joining_date,
		o.offer_letter_url, o.status, o.created_at, o.updated_at
		FROM offers o
		JOIN placement_applications pa ON pa.id = o.application_id
		JOIN placement_drives pd ON pd.id = pa.drive_id
		WHERE pd.college_id = $1
		ORDER BY o.created_at DESC`

	rows, err := r.pool.Query(ctx, query, collegeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var offers []Offer
	for rows.Next() {
		var o Offer
		var joiningDate *time.Time
		if err := rows.Scan(
			&o.ID, &o.ApplicationID, &o.PackageAnnual,
			&joiningDate, &o.OfferLetterURL, &o.Status,
			&o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if joiningDate != nil {
			o.JoiningDate = joiningDate.Format("2006-01-02")
		}
		offers = append(offers, o)
	}
	return offers, rows.Err()
}

func (r *pgRepo) GetPlacementStats(ctx context.Context, collegeID string) (*PlacementStat, error) {
	query := `SELECT
		COUNT(DISTINCT o.id) AS total_offers,
		COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'accepted') AS accepted_offers,
		COALESCE(AVG(o.package_annual), 0) AS avg_package,
		COALESCE(MAX(o.package_annual), 0) AS max_package,
		COUNT(DISTINCT pa.student_id) FILTER (WHERE o.status = 'accepted') AS placed_students,
		COUNT(DISTINCT pd.id) AS total_drives
		FROM placement_drives pd
		LEFT JOIN placement_applications pa ON pa.drive_id = pd.id
		LEFT JOIN offers o ON o.application_id = pa.id
		WHERE pd.college_id = $1`

	row := r.pool.QueryRow(ctx, query, collegeID)
	stat := &PlacementStat{CollegeID: collegeID}
	err := row.Scan(
		&stat.TotalOffers, &stat.AcceptedOffers,
		&stat.AvgPackage, &stat.MaxPackage,
		&stat.PlacedStudents, &stat.TotalDrives,
	)
	if err != nil {
		return nil, err
	}
	return stat, nil
}
