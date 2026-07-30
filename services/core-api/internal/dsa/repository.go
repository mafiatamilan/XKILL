package dsa

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound = errors.New("resource not found")
)

type Repository interface {
	CreateProblem(ctx context.Context, problem *Problem, testCases []TestCase) error
	GetProblem(ctx context.Context, id string) (*Problem, error)
	ListProblems(ctx context.Context, filter ProblemFilter) ([]Problem, string, error)
	UpdateProblem(ctx context.Context, problem *Problem) error
	GetTestCases(ctx context.Context, problemID string) ([]TestCase, error)
	CreateSubmission(ctx context.Context, submission *Submission) error
	UpdateSubmission(ctx context.Context, submission *Submission) error
	GetSubmission(ctx context.Context, id string) (*Submission, error)
	ListSubmissions(ctx context.Context, userID, problemID string, limit int, cursor string) ([]Submission, string, error)
	CreateContest(ctx context.Context, contest *Contest) error
	GetContest(ctx context.Context, id string) (*Contest, error)
	ListContests(ctx context.Context, filter ContestFilter) ([]Contest, string, error)
	GetContestLeaderboard(ctx context.Context, contestID string) ([]LeaderboardEntry, error)
	RegisterForContest(ctx context.Context, contestID, userID string) error
	ListDiscussions(ctx context.Context, problemID string, cursor string) ([]DiscussionThread, string, error)
	CreateDiscussion(ctx context.Context, thread *DiscussionThread) error
}

type postgresRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &postgresRepository{pool: pool}
}

func (r *postgresRepository) CreateProblem(ctx context.Context, problem *Problem, testCases []TestCase) error {
	problem.ID = uuid.New().String()
	topicsJSON, _ := json.Marshal(problem.Topics)
	if problem.Slug == "" {
		problem.Slug = slugify(problem.Title)
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		`INSERT INTO dsa_problems (id, title, slug, description, input_format, output_format,
		 constraints, sample_input, sample_output, difficulty, time_limit_ms, memory_limit_mb,
		 is_published, total_submissions, accepted_submissions, topics, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())`,
		problem.ID, problem.Title, problem.Slug, problem.Description,
		problem.InputFormat, problem.OutputFormat, problem.Constraints,
		problem.SampleInput, problem.SampleOutput, problem.Difficulty,
		problem.TimeLimitMs, problem.MemoryLimitMb, problem.IsPublished,
		problem.TotalSubmissions, problem.AcceptedSubmissions, topicsJSON,
	)
	if err != nil {
		return err
	}

	for i := range testCases {
		testCases[i].ID = uuid.New().String()
		testCases[i].ProblemID = problem.ID
		_, err = tx.Exec(ctx,
			`INSERT INTO dsa_test_cases (id, problem_id, input, expected_output, is_sample, is_hidden)
			 VALUES ($1,$2,$3,$4,$5,$6)`,
			testCases[i].ID, testCases[i].ProblemID, testCases[i].Input,
			testCases[i].ExpectedOutput, testCases[i].IsSample, testCases[i].IsHidden,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *postgresRepository) GetProblem(ctx context.Context, id string) (*Problem, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT p.id, p.title, p.slug, p.description, p.input_format, p.output_format,
		        p.constraints, p.sample_input, p.sample_output, p.difficulty,
		        p.time_limit_ms, p.memory_limit_mb, p.is_published,
		        p.total_submissions, p.accepted_submissions, p.topics,
		        to_char(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		 FROM dsa_problems p WHERE p.id = $1`, id,
	)
	return scanProblem(row)
}

func (r *postgresRepository) ListProblems(ctx context.Context, filter ProblemFilter) ([]Problem, string, error) {
	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}

	args := []interface{}{}
	where := []string{}
	argIdx := 1

	if filter.Difficulty != "" {
		where = append(where, fmt.Sprintf("p.difficulty = $%d", argIdx))
		args = append(args, filter.Difficulty)
		argIdx++
	}
	if filter.Topic != "" {
		where = append(where, fmt.Sprintf("p.topics @> to_jsonb($%d)", argIdx))
		args = append(args, fmt.Sprintf(`["%s"]`, filter.Topic))
		argIdx++
	}
	if filter.Search != "" {
		where = append(where, fmt.Sprintf("(p.title ILIKE $%d OR p.description ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+filter.Search+"%")
		argIdx++
	}
	if filter.Cursor != "" {
		cursorID, err := decodeCursor(filter.Cursor)
		if err == nil && cursorID != "" {
			where = append(where, fmt.Sprintf("p.id > $%d", argIdx))
			args = append(args, cursorID)
			argIdx++
		}
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = " WHERE " + strings.Join(where, " AND ")
	}

	query := `SELECT p.id, p.title, p.slug, p.description, p.input_format, p.output_format,
	                 p.constraints, p.sample_input, p.sample_output, p.difficulty,
	                 p.time_limit_ms, p.memory_limit_mb, p.is_published,
	                 p.total_submissions, p.accepted_submissions, p.topics,
	                 to_char(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
	          FROM dsa_problems p` + whereClause + ` ORDER BY p.id LIMIT $` + fmt.Sprintf("%d", argIdx)

	args = append(args, limit+1)
	argIdx++

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var problems []Problem
	for rows.Next() {
		p, err := scanProblem(rows)
		if err != nil {
			return nil, "", err
		}
		problems = append(problems, *p)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	var nextCursor string
	if len(problems) > limit {
		nextCursor = encodeCursor(problems[limit].ID)
		problems = problems[:limit]
	}

	return problems, nextCursor, nil
}

func (r *postgresRepository) UpdateProblem(ctx context.Context, problem *Problem) error {
	topicsJSON, _ := json.Marshal(problem.Topics)
	_, err := r.pool.Exec(ctx,
		`UPDATE dsa_problems SET title=$1, slug=$2, description=$3, input_format=$4,
		 output_format=$5, constraints=$6, sample_input=$7, sample_output=$8,
		 difficulty=$9, time_limit_ms=$10, memory_limit_mb=$11, is_published=$12,
		 total_submissions=$13, accepted_submissions=$14, topics=$15
		 WHERE id=$16`,
		problem.Title, problem.Slug, problem.Description, problem.InputFormat,
		problem.OutputFormat, problem.Constraints, problem.SampleInput,
		problem.SampleOutput, problem.Difficulty, problem.TimeLimitMs,
		problem.MemoryLimitMb, problem.IsPublished, problem.TotalSubmissions,
		problem.AcceptedSubmissions, topicsJSON, problem.ID,
	)
	return err
}

func (r *postgresRepository) GetTestCases(ctx context.Context, problemID string) ([]TestCase, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, problem_id, input, expected_output, is_sample, is_hidden
		 FROM dsa_test_cases WHERE problem_id = $1`, problemID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanTestCases(rows)
}

func (r *postgresRepository) CreateSubmission(ctx context.Context, submission *Submission) error {
	submission.ID = uuid.New().String()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO dsa_submissions (id, problem_id, user_id, language, code, verdict,
		 execution_time_ms, memory_used_kb, test_cases_passed, total_test_cases,
		 is_passed, submitted_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
		submission.ID, submission.ProblemID, submission.UserID, submission.Language,
		submission.Code, submission.Verdict, submission.ExecutionTimeMs,
		submission.MemoryUsedKb, submission.TestCasesPassed, submission.TotalTestCases,
		submission.IsPassed,
	)
	return err
}

func (r *postgresRepository) UpdateSubmission(ctx context.Context, submission *Submission) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE dsa_submissions SET verdict=$1, execution_time_ms=$2, memory_used_kb=$3,
		 test_cases_passed=$4, total_test_cases=$5, is_passed=$6
		 WHERE id=$7`,
		submission.Verdict, submission.ExecutionTimeMs, submission.MemoryUsedKb,
		submission.TestCasesPassed, submission.TotalTestCases, submission.IsPassed,
		submission.ID,
	)
	return err
}

func (r *postgresRepository) GetSubmission(ctx context.Context, id string) (*Submission, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT s.id, s.problem_id, s.user_id, s.language, s.code, s.verdict,
		        s.execution_time_ms, s.memory_used_kb, s.test_cases_passed, s.total_test_cases,
		        s.is_passed,
		        to_char(s.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		        COALESCE(p.title, '')
		 FROM dsa_submissions s
		 LEFT JOIN dsa_problems p ON p.id = s.problem_id
		 WHERE s.id = $1`, id,
	)
	return scanSubmission(row)
}

func (r *postgresRepository) ListSubmissions(ctx context.Context, userID, problemID string, limit int, cursor string) ([]Submission, string, error) {
	if limit <= 0 {
		limit = 20
	}

	args := []interface{}{}
	where := []string{}
	argIdx := 1

	if userID != "" {
		where = append(where, fmt.Sprintf("s.user_id = $%d", argIdx))
		args = append(args, userID)
		argIdx++
	}
	if problemID != "" {
		where = append(where, fmt.Sprintf("s.problem_id = $%d", argIdx))
		args = append(args, problemID)
		argIdx++
	}
	if cursor != "" {
		cursorID, err := decodeCursor(cursor)
		if err == nil && cursorID != "" {
			where = append(where, fmt.Sprintf("s.id > $%d", argIdx))
			args = append(args, cursorID)
			argIdx++
		}
	}

	whereClause := ""
	if len(where) > 0 {
		whereClause = " WHERE " + strings.Join(where, " AND ")
	}

	query := `SELECT s.id, s.problem_id, s.user_id, s.language, s.code, s.verdict,
	                 s.execution_time_ms, s.memory_used_kb, s.test_cases_passed, s.total_test_cases,
	                 s.is_passed,
	                 to_char(s.submitted_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	                 COALESCE(p.title, '')
	          FROM dsa_submissions s
	          LEFT JOIN dsa_problems p ON p.id = s.problem_id` +
		whereClause + ` ORDER BY s.id DESC LIMIT $` + fmt.Sprintf("%d", argIdx)

	args = append(args, limit+1)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var submissions []Submission
	for rows.Next() {
		s, err := scanSubmission(rows)
		if err != nil {
			return nil, "", err
		}
		submissions = append(submissions, *s)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	var nextCursor string
	if len(submissions) > limit {
		nextCursor = encodeCursor(submissions[limit].ID)
		submissions = submissions[:limit]
	}

	return submissions, nextCursor, nil
}

func (r *postgresRepository) CreateContest(ctx context.Context, contest *Contest) error {
	contest.ID = uuid.New().String()
	if contest.Slug == "" {
		contest.Slug = slugify(contest.Title)
	}
	_, err := r.pool.Exec(ctx,
		`INSERT INTO dsa_contests (id, title, slug, description, contest_type, scoring_rule,
		 start_time, end_time, is_published, is_rated, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
		contest.ID, contest.Title, contest.Slug, contest.Description,
		contest.ContestType, contest.ScoringRule, contest.StartTime,
		contest.EndTime, contest.IsPublished, contest.IsRated,
	)
	return err
}

func (r *postgresRepository) GetContest(ctx context.Context, id string) (*Contest, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, title, slug, description, contest_type, scoring_rule,
		        start_time, end_time, is_published, is_rated,
		        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		 FROM dsa_contests WHERE id = $1`, id,
	)
	return scanContest(row)
}

func (r *postgresRepository) ListContests(ctx context.Context, filter ContestFilter) ([]Contest, string, error) {
	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}

	args := []interface{}{}
	where := ""
	argIdx := 1

	if filter.Cursor != "" {
		cursorID, err := decodeCursor(filter.Cursor)
		if err == nil && cursorID != "" {
			where = fmt.Sprintf(" WHERE c.id > $%d", argIdx)
			args = append(args, cursorID)
			argIdx++
		}
	}

	query := `SELECT c.id, c.title, c.slug, c.description, c.contest_type, c.scoring_rule,
	                 c.start_time, c.end_time, c.is_published, c.is_rated,
	                 to_char(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
	          FROM dsa_contests c` + where + ` ORDER BY c.created_at DESC LIMIT $` + fmt.Sprintf("%d", argIdx)

	args = append(args, limit+1)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var contests []Contest
	for rows.Next() {
		c, err := scanContest(rows)
		if err != nil {
			return nil, "", err
		}
		contests = append(contests, *c)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	var nextCursor string
	if len(contests) > limit {
		nextCursor = encodeCursor(contests[limit].ID)
		contests = contests[:limit]
	}

	return contests, nextCursor, nil
}

func (r *postgresRepository) GetContestLeaderboard(ctx context.Context, contestID string) ([]LeaderboardEntry, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT ROW_NUMBER() OVER (ORDER BY s.total_score DESC, s.total_penalty ASC) AS rank,
		        s.user_id, s.user_name, s.total_score, s.total_penalty, s.solved_count
		 FROM (
		   SELECT su.user_id, COALESCE(up.name, '') AS user_name,
		          COALESCE(SUM(CASE WHEN sub.is_passed THEN 1 ELSE 0 END), 0) AS solved_count,
		          COALESCE(SUM(sub.execution_time_ms), 0) AS total_score,
		          COALESCE(SUM(sub.test_cases_passed), 0) AS total_penalty
		   FROM dsa_contest_registrations cr
		   JOIN dsa_submissions su ON su.user_id = cr.user_id
		   LEFT JOIN dsa_user_profiles up ON up.user_id = cr.user_id
		   WHERE cr.contest_id = $1 AND su.problem_id IN (
		     SELECT problem_id FROM dsa_contest_problems WHERE contest_id = $1
		   )
		   GROUP BY su.user_id, up.name
		 ) s ORDER BY s.solved_count DESC, s.total_score ASC
		 LIMIT 200`, contestID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []LeaderboardEntry
	for rows.Next() {
		var e LeaderboardEntry
		if err := rows.Scan(&e.Rank, &e.UserID, &e.Name, &e.Score, &e.Penalty, &e.Solved); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func (r *postgresRepository) RegisterForContest(ctx context.Context, contestID, userID string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO dsa_contest_registrations (contest_id, user_id, registered_at)
		 VALUES ($1,$2,NOW()) ON CONFLICT DO NOTHING`,
		contestID, userID,
	)
	return err
}

func (r *postgresRepository) ListDiscussions(ctx context.Context, problemID string, cursor string) ([]DiscussionThread, string, error) {
	args := []interface{}{problemID}
	where := " WHERE d.problem_id = $1"
	argIdx := 2

	if cursor != "" {
		cursorID, err := decodeCursor(cursor)
		if err == nil && cursorID != "" {
			where += fmt.Sprintf(" AND d.id > $%d", argIdx)
			args = append(args, cursorID)
			argIdx++
		}
	}

	query := `SELECT d.id, d.problem_id, d.user_id, d.title, d.content, d.upvotes,
	                 to_char(d.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
	          FROM dsa_discussion_threads d` + where + ` ORDER BY d.created_at DESC LIMIT $` + fmt.Sprintf("%d", argIdx)

	args = append(args, 21)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var threads []DiscussionThread
	for rows.Next() {
		t, err := scanDiscussionThread(rows)
		if err != nil {
			return nil, "", err
		}
		threads = append(threads, *t)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	var nextCursor string
	if len(threads) > 20 {
		nextCursor = encodeCursor(threads[20].ID)
		threads = threads[:20]
	}

	return threads, nextCursor, nil
}

func (r *postgresRepository) CreateDiscussion(ctx context.Context, thread *DiscussionThread) error {
	thread.ID = uuid.New().String()
	_, err := r.pool.Exec(ctx,
		`INSERT INTO dsa_discussion_threads (id, problem_id, user_id, title, content, upvotes, created_at)
		 VALUES ($1,$2,$3,$4,$5,0,NOW())`,
		thread.ID, thread.ProblemID, thread.UserID, thread.Title, thread.Content,
	)
	return err
}

func scanProblem(row pgx.Row) (*Problem, error) {
	p := &Problem{}
	var topicsJSON []byte
	err := row.Scan(&p.ID, &p.Title, &p.Slug, &p.Description, &p.InputFormat,
		&p.OutputFormat, &p.Constraints, &p.SampleInput, &p.SampleOutput,
		&p.Difficulty, &p.TimeLimitMs, &p.MemoryLimitMb, &p.IsPublished,
		&p.TotalSubmissions, &p.AcceptedSubmissions, &topicsJSON, &p.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if len(topicsJSON) > 0 {
		json.Unmarshal(topicsJSON, &p.Topics)
	}
	if p.Topics == nil {
		p.Topics = []string{}
	}
	return p, nil
}

func scanTestCases(rows pgx.Rows) ([]TestCase, error) {
	var cases []TestCase
	for rows.Next() {
		var tc TestCase
		if err := rows.Scan(&tc.ID, &tc.ProblemID, &tc.Input, &tc.ExpectedOutput, &tc.IsSample, &tc.IsHidden); err != nil {
			return nil, err
		}
		cases = append(cases, tc)
	}
	return cases, rows.Err()
}

func scanSubmission(row pgx.Row) (*Submission, error) {
	s := &Submission{}
	err := row.Scan(&s.ID, &s.ProblemID, &s.UserID, &s.Language, &s.Code, &s.Verdict,
		&s.ExecutionTimeMs, &s.MemoryUsedKb, &s.TestCasesPassed, &s.TotalTestCases,
		&s.IsPassed, &s.SubmittedAt, &s.ProblemTitle)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return s, nil
}

func scanContest(row pgx.Row) (*Contest, error) {
	c := &Contest{}
	err := row.Scan(&c.ID, &c.Title, &c.Slug, &c.Description, &c.ContestType,
		&c.ScoringRule, &c.StartTime, &c.EndTime, &c.IsPublished, &c.IsRated, &c.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return c, nil
}

func scanDiscussionThread(row pgx.Row) (*DiscussionThread, error) {
	t := &DiscussionThread{}
	err := row.Scan(&t.ID, &t.ProblemID, &t.UserID, &t.Title, &t.Content, &t.Upvotes, &t.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return t, nil
}

func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.TrimSpace(s)
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		} else if r == ' ' || r == '-' || r == '_' {
			b.WriteRune('-')
		}
	}
	return b.String()
}

func encodeCursor(id string) string {
	return base64.URLEncoding.EncodeToString([]byte(id))
}

func decodeCursor(cursor string) (string, error) {
	b, err := base64.URLEncoding.DecodeString(cursor)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
