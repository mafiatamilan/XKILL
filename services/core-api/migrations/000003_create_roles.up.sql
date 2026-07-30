CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    UNIQUE(user_id, role_id, college_id)
);

ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

-- Seed system roles
INSERT INTO roles (name, description, is_system) VALUES
    ('student', 'Student user', true),
    ('faculty', 'Faculty member', true),
    ('dept_admin', 'Department administrator', true),
    ('college_admin', 'College administrator', true),
    ('recruiter', 'Recruiter', true),
    ('tpo', 'Training and Placement Officer', true),
    ('parent', 'Parent/guardian', true),
    ('platform_admin', 'Platform administrator', true);
