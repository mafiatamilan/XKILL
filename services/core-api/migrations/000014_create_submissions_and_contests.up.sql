CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    college_id UUID REFERENCES colleges(id),
    contest_id UUID,
    language VARCHAR(50) NOT NULL,
    code TEXT NOT NULL,
    verdict VARCHAR(50),
    execution_time_ms INT,
    memory_used_kb INT,
    test_cases_passed INT DEFAULT 0,
    total_test_cases INT DEFAULT 0,
    is_passed BOOLEAN DEFAULT false,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    judged_at TIMESTAMPTZ
);

CREATE INDEX idx_submissions_problem_id ON submissions(problem_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_verdict ON submissions(verdict);

CREATE TABLE submissions_verbose (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    verdict VARCHAR(50) NOT NULL,
    execution_time_ms INT,
    memory_used_kb INT,
    actual_output TEXT,
    error_message TEXT,
    UNIQUE(submission_id, test_case_id)
);

CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    playlist_type VARCHAR(50) DEFAULT 'custom',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE playlist_problems (
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    order_index INT DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (playlist_id, problem_id)
);

CREATE TABLE contests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES colleges(id),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    contest_type VARCHAR(50) NOT NULL DEFAULT 'weekly',
    scoring_rule VARCHAR(50) NOT NULL DEFAULT 'icpc',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_published BOOLEAN DEFAULT false,
    is_rated BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contest_problems (
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    points INT DEFAULT 100,
    order_index INT DEFAULT 0,
    PRIMARY KEY (contest_id, problem_id)
);

CREATE TABLE contest_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INT DEFAULT 0,
    penalty INT DEFAULT 0,
    rank INT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    UNIQUE(contest_id, user_id)
);

CREATE TABLE rating_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contest_id UUID REFERENCES contests(id) ON DELETE SET NULL,
    old_rating INT DEFAULT 0,
    new_rating INT DEFAULT 0,
    change INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cheat_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    flagged_by VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    similarity_score DECIMAL(5,2),
    is_reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES users(id),
    action_taken VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
