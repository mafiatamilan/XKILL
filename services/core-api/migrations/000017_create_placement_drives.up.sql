CREATE TABLE placement_drives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    package_min NUMERIC(12,2),
    package_max NUMERIC(12,2),
    location VARCHAR(255),
    description TEXT,
    drive_date DATE,
    deadline TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'upcoming',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE drive_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES placement_drives(id) ON DELETE CASCADE,
    min_cgpa NUMERIC(3,2) DEFAULT 0,
    max_backlogs INT DEFAULT 0,
    allowed_branches TEXT[],
    allowed_years INT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE placement_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES placement_drives(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    applied_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(drive_id, student_id)
);

CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES placement_applications(id) ON DELETE CASCADE,
    package_annual NUMERIC(12,2),
    joining_date DATE,
    offer_letter_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE placement_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY drive_isolation ON placement_drives
    USING (college_id = current_setting('app.current_college_id')::UUID);

CREATE POLICY drive_elig_isolation ON drive_eligibility
    USING (drive_id IN (SELECT id FROM placement_drives WHERE college_id = current_setting('app.current_college_id')::UUID));

CREATE POLICY app_isolation ON placement_applications
    USING (drive_id IN (SELECT id FROM placement_drives WHERE college_id = current_setting('app.current_college_id')::UUID));

CREATE POLICY offer_isolation ON offers
    USING (application_id IN (SELECT pa.id FROM placement_applications pa JOIN placement_drives pd ON pa.drive_id = pd.id WHERE pd.college_id = current_setting('app.current_college_id')::UUID));
