ALTER TABLE users
    ADD COLUMN IF NOT EXISTS name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES colleges(id),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS totp_secret TEXT,
    ADD COLUMN IF NOT EXISTS backup_codes TEXT[],
    ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
    ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_login_ip INET,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS: users can read their own row; college admins can read their college; platform_admin can read all
CREATE POLICY users_self_select ON users
    FOR SELECT
    USING (id = current_setting('app.current_user_id')::uuid);

CREATE POLICY users_self_update ON users
    FOR UPDATE
    USING (id = current_setting('app.current_user_id')::uuid);

CREATE POLICY users_admin_select ON users
    FOR SELECT
    USING (current_setting('app.current_role') IN ('college_admin', 'platform_admin'));
