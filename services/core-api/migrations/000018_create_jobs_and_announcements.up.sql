CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    job_type VARCHAR(50),
    salary_min NUMERIC(12,2),
    salary_max NUMERIC(12,2),
    skills TEXT[],
    experience_years INT,
    status VARCHAR(50) DEFAULT 'active',
    posted_at TIMESTAMPTZ DEFAULT now(),
    deadline TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    applied_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(job_id, user_id)
);

CREATE TABLE tpo_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    target VARCHAR(50) DEFAULT 'all',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tpo_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tpo_id UUID NOT NULL REFERENCES tpo_profiles(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tpo_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tpo_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_isolation ON jobs
    USING (college_id = current_setting('app.current_college_id')::UUID);

CREATE POLICY job_app_isolation ON job_applications
    USING (job_id IN (SELECT id FROM jobs WHERE college_id = current_setting('app.current_college_id')::UUID));

CREATE POLICY announce_isolation ON tpo_announcements
    USING (college_id = current_setting('app.current_college_id')::UUID);

CREATE POLICY activity_isolation ON tpo_activities
    USING (tpo_id IN (SELECT id FROM tpo_profiles WHERE college_id = current_setting('app.current_college_id')::UUID));
