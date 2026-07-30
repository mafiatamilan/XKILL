CREATE TABLE interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium',
    tags TEXT[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE interview_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    rounds TEXT[],
    content TEXT NOT NULL,
    tips TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mock_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    peer_id UUID REFERENCES student_profiles(id),
    scheduled_at TIMESTAMPTZ,
    duration_min INT DEFAULT 30,
    mode VARCHAR(50) DEFAULT 'peer',
    status VARCHAR(50) DEFAULT 'scheduled',
    feedback TEXT,
    rating INT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE career_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    skills TEXT[],
    avg_salary NUMERIC(12,2),
    growth_rate NUMERIC(5,2),
    required_education TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE career_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    url TEXT,
    content TEXT,
    tags TEXT[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_interview_q_college ON interview_questions(college_id);
CREATE INDEX idx_interview_exp_college ON interview_experiences(college_id);
CREATE INDEX idx_mock_interviews_student ON mock_interviews(student_id);
CREATE INDEX idx_career_resources_college ON career_resources(college_id);

ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY iq_college_isolation ON interview_questions
    USING (college_id = current_setting('app.current_college_id')::UUID);

CREATE POLICY ie_college_isolation ON interview_experiences
    USING (college_id = current_setting('app.current_college_id')::UUID);

CREATE POLICY mi_student_isolation ON mock_interviews
    USING (student_id IN (SELECT id FROM student_profiles WHERE user_id = current_setting('app.current_user_id')::UUID));

CREATE POLICY cr_college_isolation ON career_resources
    USING (college_id = current_setting('app.current_college_id')::UUID);
