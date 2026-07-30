CREATE TABLE resume_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    preview_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES resume_templates(id),
    file_url TEXT,
    is_primary BOOLEAN DEFAULT false,
    ats_score INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE resume_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    content JSONB NOT NULL DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_resumes_student ON resumes(student_id);
CREATE INDEX idx_resume_sections_resume ON resume_sections(resume_id);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY resume_owner ON resumes
    USING (student_id IN (SELECT id FROM student_profiles WHERE user_id = current_setting('app.current_user_id')::UUID));

CREATE POLICY resume_section_owner ON resume_sections
    USING (resume_id IN (SELECT id FROM resumes WHERE student_id IN (SELECT id FROM student_profiles WHERE user_id = current_setting('app.current_user_id')::UUID)));
