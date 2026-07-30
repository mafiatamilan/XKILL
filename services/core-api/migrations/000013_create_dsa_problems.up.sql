CREATE TABLE problem_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    input_format TEXT,
    output_format TEXT,
    constraints TEXT,
    sample_input TEXT,
    sample_output TEXT,
    explanation TEXT,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'easy',
    time_limit_ms INT NOT NULL DEFAULT 1000,
    memory_limit_mb INT NOT NULL DEFAULT 256,
    is_published BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    total_submissions INT DEFAULT 0,
    accepted_submissions INT DEFAULT 0,
    difficulty_score DECIMAL(5,2) DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE problem_topic_links (
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES problem_topics(id) ON DELETE CASCADE,
    PRIMARY KEY (problem_id, topic_id)
);

CREATE TABLE problem_company_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    company_name VARCHAR(100) NOT NULL,
    appearance_count INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT true,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE editorials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    approach VARCHAR(50) NOT NULL,
    time_complexity VARCHAR(100),
    space_complexity VARCHAR(100),
    code_snippet TEXT,
    language VARCHAR(50),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE hints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    order_index INT DEFAULT 0,
    cost INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO problem_topics (name, slug, description) VALUES
    ('Arrays', 'arrays', 'Array manipulation and traversal'),
    ('Strings', 'strings', 'String processing and pattern matching'),
    ('Linked Lists', 'linked-lists', 'Singly and doubly linked list operations'),
    ('Stacks', 'stacks', 'Stack data structure and applications'),
    ('Queues', 'queues', 'Queue data structure and applications'),
    ('Trees', 'trees', 'Binary trees, BST, and tree traversals'),
    ('Graphs', 'graphs', 'Graph algorithms: BFS, DFS, shortest paths'),
    ('Dynamic Programming', 'dynamic-programming', 'DP: memoization and tabulation'),
    ('Greedy', 'greedy', 'Greedy algorithm design'),
    ('Sorting', 'sorting', 'Sorting algorithms and custom comparators'),
    ('Searching', 'searching', 'Linear and binary search variants'),
    ('Recursion', 'recursion', 'Recursive problem solving'),
    ('Backtracking', 'backtracking', 'Backtracking and constraint satisfaction'),
    ('Hashing', 'hashing', 'Hash maps, sets, and counting'),
    ('Heap', 'heap', 'Priority queues and heap operations'),
    ('Math', 'math', 'Mathematical and number theory problems'),
    ('Bit Manipulation', 'bit-manipulation', 'Bitwise operations'),
    ('Two Pointers', 'two-pointers', 'Two-pointer technique'),
    ('Sliding Window', 'sliding-window', 'Sliding window pattern'),
    ('Binary Search', 'binary-search', 'Binary search on answers and ranges');
