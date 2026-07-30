package dsa

type Problem struct {
	ID                 string   `json:"id"`
	Title              string   `json:"title"`
	Slug               string   `json:"slug"`
	Description        string   `json:"description"`
	InputFormat        string   `json:"input_format,omitempty"`
	OutputFormat       string   `json:"output_format,omitempty"`
	Constraints        string   `json:"constraints,omitempty"`
	SampleInput        string   `json:"sample_input,omitempty"`
	SampleOutput       string   `json:"sample_output,omitempty"`
	Difficulty         string   `json:"difficulty"`
	TimeLimitMs        int      `json:"time_limit_ms"`
	MemoryLimitMb      int      `json:"memory_limit_mb"`
	IsPublished        bool     `json:"is_published"`
	TotalSubmissions   int      `json:"total_submissions"`
	AcceptedSubmissions int     `json:"accepted_submissions"`
	Topics             []string `json:"topics,omitempty"`
	CreatedAt          string   `json:"created_at"`
}

type Submission struct {
	ID               string `json:"id"`
	ProblemID        string `json:"problem_id"`
	UserID           string `json:"user_id"`
	Language         string `json:"language"`
	Code             string `json:"code,omitempty"`
	Verdict          string `json:"verdict"`
	ExecutionTimeMs  int    `json:"execution_time_ms"`
	MemoryUsedKb     int    `json:"memory_used_kb"`
	TestCasesPassed  int    `json:"test_cases_passed"`
	TotalTestCases   int    `json:"total_test_cases"`
	IsPassed         bool   `json:"is_passed"`
	SubmittedAt      string `json:"submitted_at"`
	ProblemTitle     string `json:"problem_title,omitempty"`
}

type Contest struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Slug        string `json:"slug"`
	Description string `json:"description,omitempty"`
	ContestType string `json:"contest_type"`
	ScoringRule string `json:"scoring_rule"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time"`
	IsPublished bool   `json:"is_published"`
	IsRated     bool   `json:"is_rated"`
	CreatedAt   string `json:"created_at"`
}

type TestCase struct {
	ID             string `json:"id"`
	ProblemID      string `json:"problem_id"`
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	IsSample       bool   `json:"is_sample"`
	IsHidden       bool   `json:"is_hidden"`
}

type DiscussionThread struct {
	ID        string `json:"id"`
	ProblemID string `json:"problem_id"`
	UserID    string `json:"user_id"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	Upvotes   int    `json:"upvotes"`
	CreatedAt string `json:"created_at"`
}

type CreateProblemRequest struct {
	Title        string   `json:"title" binding:"required"`
	Description  string   `json:"description" binding:"required"`
	Difficulty   string   `json:"difficulty"`
	TimeLimitMs  int      `json:"time_limit_ms"`
	MemoryLimitMb int     `json:"memory_limit_mb"`
	Topics       []string `json:"topics"`
	SampleInput  string   `json:"sample_input"`
	SampleOutput string   `json:"sample_output"`
	TestCases    []struct {
		Input          string `json:"input"`
		ExpectedOutput string `json:"expected_output"`
		IsSample       bool   `json:"is_sample"`
		IsHidden       bool   `json:"is_hidden"`
	} `json:"test_cases,omitempty"`
}

type SubmitRequest struct {
	ProblemID string `json:"problem_id" binding:"required"`
	Language  string `json:"language" binding:"required"`
	Code      string `json:"code" binding:"required"`
}

type CreateContestRequest struct {
	Title       string   `json:"title" binding:"required"`
	Description string   `json:"description"`
	ContestType string   `json:"contest_type"`
	ScoringRule string   `json:"scoring_rule"`
	StartTime   string   `json:"start_time" binding:"required"`
	EndTime     string   `json:"end_time" binding:"required"`
	ProblemIDs  []string `json:"problem_ids"`
}

type LeaderboardEntry struct {
	Rank    int    `json:"rank"`
	UserID  string `json:"user_id"`
	Name    string `json:"name"`
	Score   int    `json:"score"`
	Penalty int    `json:"penalty"`
	Solved  int    `json:"solved"`
}

type ProblemFilter struct {
	Difficulty string
	Topic      string
	Search     string
	Cursor     string
	Limit      int
}

type ContestFilter struct {
	Cursor string
	Limit  int
}

type JudgeTask struct {
	SubmissionID string      `json:"submission_id"`
	Code         string      `json:"code"`
	Language     string      `json:"language"`
	ProblemID    string      `json:"problem_id"`
	TestCases    []TestCase  `json:"test_cases"`
}
