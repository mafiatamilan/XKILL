package student

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrProfileNotFound = errors.New("profile not found")
	ErrSkillNotFound   = errors.New("skill not found")
	ErrGoalNotFound    = errors.New("career goal not found")
)

type Repository interface {
	GetProfile(ctx context.Context, userID string) (*StudentProfile, error)
	UpsertProfile(ctx context.Context, profile *StudentProfile) error
	GetSkills(ctx context.Context, studentID string) ([]Skill, error)
	AddSkill(ctx context.Context, skill *Skill) error
	RemoveSkill(ctx context.Context, skillID, studentID string) error
	GetCareerGoals(ctx context.Context, studentID string) ([]CareerGoal, error)
	AddCareerGoal(ctx context.Context, goal *CareerGoal) error
	UpdateCareerGoal(ctx context.Context, goal *CareerGoal) error
	RemoveCareerGoal(ctx context.Context, goalID, studentID string) error
}

type postgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

const profileColumns = `id, user_id, college_id, department_id, enrollment_number, batch, date_of_birth, gender, category, city, state, created_at, updated_at`
const skillColumns = `id, student_id, name, category, proficiency_level, created_at`
const goalColumns = `id, student_id, title, target_role, target_company, target_date, status, notes, created_at`

func (r *postgresRepository) GetProfile(ctx context.Context, userID string) (*StudentProfile, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+profileColumns+` FROM student_profiles WHERE user_id = $1`, userID,
	)
	return scanProfile(row)
}

func (r *postgresRepository) UpsertProfile(ctx context.Context, profile *StudentProfile) error {
	now := time.Now().Format(time.RFC3339)
	profile.UpdatedAt = now
	if profile.ID == "" {
		profile.ID = uuid.New().String()
		profile.CreatedAt = now
		_, err := r.pool.Exec(ctx,
			`INSERT INTO student_profiles (`+profileColumns+`) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
			profile.ID, profile.UserID, profile.CollegeID, profile.DepartmentID,
			profile.EnrollmentNumber, profile.Batch, profile.DateOfBirth,
			profile.Gender, profile.Category, profile.City, profile.State,
			profile.CreatedAt, profile.UpdatedAt,
		)
		return err
	}
	_, err := r.pool.Exec(ctx,
		`UPDATE student_profiles SET department_id=$1, enrollment_number=$2, batch=$3, date_of_birth=$4, gender=$5, category=$6, city=$7, state=$8, updated_at=$9 WHERE id=$10`,
		profile.DepartmentID, profile.EnrollmentNumber, profile.Batch,
		profile.DateOfBirth, profile.Gender, profile.Category,
		profile.City, profile.State, profile.UpdatedAt, profile.ID,
	)
	return err
}

func (r *postgresRepository) GetSkills(ctx context.Context, studentID string) ([]Skill, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+skillColumns+` FROM student_skills WHERE student_id = $1 ORDER BY created_at DESC`, studentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var skills []Skill
	for rows.Next() {
		var s Skill
		if err := rows.Scan(&s.ID, &s.StudentID, &s.Name, &s.Category, &s.ProficiencyLevel, &s.CreatedAt); err != nil {
			return nil, err
		}
		skills = append(skills, s)
	}
	return skills, rows.Err()
}

func (r *postgresRepository) AddSkill(ctx context.Context, skill *Skill) error {
	skill.ID = uuid.New().String()
	skill.CreatedAt = time.Now().Format(time.RFC3339)
	_, err := r.pool.Exec(ctx,
		`INSERT INTO student_skills (`+skillColumns+`) VALUES ($1,$2,$3,$4,$5,$6)`,
		skill.ID, skill.StudentID, skill.Name, skill.Category, skill.ProficiencyLevel, skill.CreatedAt,
	)
	return err
}

func (r *postgresRepository) RemoveSkill(ctx context.Context, skillID, studentID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM student_skills WHERE id = $1 AND student_id = $2`, skillID, studentID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrSkillNotFound
	}
	return nil
}

func (r *postgresRepository) GetCareerGoals(ctx context.Context, studentID string) ([]CareerGoal, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+goalColumns+` FROM student_career_goals WHERE student_id = $1 ORDER BY created_at DESC`, studentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var goals []CareerGoal
	for rows.Next() {
		var g CareerGoal
		if err := rows.Scan(&g.ID, &g.StudentID, &g.Title, &g.TargetRole, &g.TargetCompany, &g.TargetDate, &g.Status, &g.Notes, &g.CreatedAt); err != nil {
			return nil, err
		}
		goals = append(goals, g)
	}
	return goals, rows.Err()
}

func (r *postgresRepository) AddCareerGoal(ctx context.Context, goal *CareerGoal) error {
	goal.ID = uuid.New().String()
	goal.CreatedAt = time.Now().Format(time.RFC3339)
	if goal.Status == "" {
		goal.Status = "active"
	}
	_, err := r.pool.Exec(ctx,
		`INSERT INTO student_career_goals (`+goalColumns+`) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		goal.ID, goal.StudentID, goal.Title, goal.TargetRole, goal.TargetCompany,
		goal.TargetDate, goal.Status, goal.Notes, goal.CreatedAt,
	)
	return err
}

func (r *postgresRepository) UpdateCareerGoal(ctx context.Context, goal *CareerGoal) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE student_career_goals SET title=$1, target_role=$2, target_company=$3, target_date=$4, status=$5, notes=$6 WHERE id=$7 AND student_id=$8`,
		goal.Title, goal.TargetRole, goal.TargetCompany, goal.TargetDate,
		goal.Status, goal.Notes, goal.ID, goal.StudentID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrGoalNotFound
	}
	return nil
}

func (r *postgresRepository) RemoveCareerGoal(ctx context.Context, goalID, studentID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM student_career_goals WHERE id = $1 AND student_id = $2`, goalID, studentID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrGoalNotFound
	}
	return nil
}

func scanProfile(row pgx.Row) (*StudentProfile, error) {
	p := &StudentProfile{}
	err := row.Scan(&p.ID, &p.UserID, &p.CollegeID, &p.DepartmentID, &p.EnrollmentNumber,
		&p.Batch, &p.DateOfBirth, &p.Gender, &p.Category, &p.City, &p.State, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrProfileNotFound
		}
		return nil, err
	}
	return p, nil
}
