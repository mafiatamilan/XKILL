#!/bin/bash
set -e

ROOT="/home/david/proj/XKILL/frontend/src"

# ── App routes ──
mkdir -p "$ROOT/app/auth/login"
mkdir -p "$ROOT/app/auth/register"
mkdir -p "$ROOT/app/auth/forgot-password"
mkdir -p "$ROOT/app/auth/reset-password"
mkdir -p "$ROOT/app/auth/verify-email/[token]"
mkdir -p "$ROOT/app/auth/oauth/callback/[provider]"

# Dashboard layout group — student routes
mkdir -p "$ROOT/app/(dashboard)/student/dashboard"
mkdir -p "$ROOT/app/(dashboard)/student/profile"
mkdir -p "$ROOT/app/(dashboard)/student/skills"
mkdir -p "$ROOT/app/(dashboard)/student/career-goals"
mkdir -p "$ROOT/app/(dashboard)/student/calendar"
mkdir -p "$ROOT/app/(dashboard)/student/settings"
mkdir -p "$ROOT/app/(dashboard)/student/notifications"
mkdir -p "$ROOT/app/(dashboard)/student/activity"
mkdir -p "$ROOT/app/(dashboard)/student/readiness"

# Academics
mkdir -p "$ROOT/app/(dashboard)/academics/subjects"
mkdir -p "$ROOT/app/(dashboard)/academics/subjects/[id]"
mkdir -p "$ROOT/app/(dashboard)/academics/subjects/[id]/materials"
mkdir -p "$ROOT/app/(dashboard)/academics/subjects/[id]/timetable"
mkdir -p "$ROOT/app/(dashboard)/academics/exams"
mkdir -p "$ROOT/app/(dashboard)/academics/assignments"
mkdir -p "$ROOT/app/(dashboard)/academics/attendance"
mkdir -p "$ROOT/app/(dashboard)/academics/marks"
mkdir -p "$ROOT/app/(dashboard)/academics/gpa"
mkdir -p "$ROOT/app/(dashboard)/academics/cgpa"
mkdir -p "$ROOT/app/(dashboard)/academics/calendar"

# DSA
mkdir -p "$ROOT/app/(dashboard)/dsa/problems"
mkdir -p "$ROOT/app/(dashboard)/dsa/problems/[id]"
mkdir -p "$ROOT/app/(dashboard)/dsa/problems/[id]/editorial"
mkdir -p "$ROOT/app/(dashboard)/dsa/problems/[id]/discussion"
mkdir -p "$ROOT/app/(dashboard)/dsa/submissions"
mkdir -p "$ROOT/app/(dashboard)/dsa/playlists"
mkdir -p "$ROOT/app/(dashboard)/dsa/sheets"
mkdir -p "$ROOT/app/(dashboard)/dsa/progress"
mkdir -p "$ROOT/app/(dashboard)/dsa/analytics"
mkdir -p "$ROOT/app/(dashboard)/dsa/contests"
mkdir -p "$ROOT/app/(dashboard)/dsa/contests/[id]"
mkdir -p "$ROOT/app/(dashboard)/dsa/contests/[id]/leaderboard"
mkdir -p "$ROOT/app/(dashboard)/dsa/ratings"
mkdir -p "$ROOT/app/(dashboard)/dsa/battles"
mkdir -p "$ROOT/app/(dashboard)/dsa/battles/[id]"
mkdir -p "$ROOT/app/(dashboard)/leaderboards"

# Placement
mkdir -p "$ROOT/app/(dashboard)/placement/roadmap"
mkdir -p "$ROOT/app/(dashboard)/placement/companies"
mkdir -p "$ROOT/app/(dashboard)/placement/progress"
mkdir -p "$ROOT/app/(dashboard)/placement/daily-challenge"
mkdir -p "$ROOT/app/(dashboard)/placement/study-planner"

# Interviews
mkdir -p "$ROOT/app/(dashboard)/interviews/sessions"
mkdir -p "$ROOT/app/(dashboard)/interviews/sessions/[id]"
mkdir -p "$ROOT/app/(dashboard)/interviews/sessions/[id]/report"

# Career Coach
mkdir -p "$ROOT/app/(dashboard)/career/roadmap"
mkdir -p "$ROOT/app/(dashboard)/career/recommendations"
mkdir -p "$ROOT/app/(dashboard)/career/salary-prediction"
mkdir -p "$ROOT/app/(dashboard)/career/skill-gap"
mkdir -p "$ROOT/app/(dashboard)/career/chat"

# Resumes
mkdir -p "$ROOT/app/(dashboard)/resumes/templates"
mkdir -p "$ROOT/app/(dashboard)/resumes/[id]"
mkdir -p "$ROOT/app/(dashboard)/resumes/[id]/editor"
mkdir -p "$ROOT/app/(dashboard)/resumes/[id]/ats"
mkdir -p "$ROOT/app/(dashboard)/resumes/[id]/versions"

# Gamification
mkdir -p "$ROOT/app/(dashboard)/gamification/badges"
mkdir -p "$ROOT/app/(dashboard)/gamification/achievements"
mkdir -p "$ROOT/app/(dashboard)/gamification/missions"
mkdir -p "$ROOT/app/(dashboard)/gamification/challenges"
mkdir -p "$ROOT/app/(dashboard)/gamification/events"

# Certificates
mkdir -p "$ROOT/app/(dashboard)/certificates"

# Community
mkdir -p "$ROOT/app/(dashboard)/community/forum"
mkdir -p "$ROOT/app/(dashboard)/community/forum/[id]"
mkdir -p "$ROOT/app/(dashboard)/community/study-groups"
mkdir -p "$ROOT/app/(dashboard)/community/study-groups/[id]"
mkdir -p "$ROOT/app/(dashboard)/community/coding-clubs"
mkdir -p "$ROOT/app/(dashboard)/community/coding-clubs/[id]"

# Jobs & Internships
mkdir -p "$ROOT/app/(dashboard)/jobs"
mkdir -p "$ROOT/app/(dashboard)/internships"

# Mentors & Bookings
mkdir -p "$ROOT/app/(dashboard)/mentors"
mkdir -p "$ROOT/app/(dashboard)/mentors/[id]"
mkdir -p "$ROOT/app/(dashboard)/bookings"

# Company Prep
mkdir -p "$ROOT/app/(dashboard)/company-prep"
mkdir -p "$ROOT/app/(dashboard)/company-prep/[slug]"

# AI Services
mkdir -p "$ROOT/app/(dashboard)/ai/tutor"
mkdir -p "$ROOT/app/(dashboard)/ai/doubt-solver"
mkdir -p "$ROOT/app/(dashboard)/ai/code-review"
mkdir -p "$ROOT/app/(dashboard)/ai/study-planner"

# ── Faculty routes ──
mkdir -p "$ROOT/app/(dashboard)/faculty/dashboard"
mkdir -p "$ROOT/app/(dashboard)/faculty/subjects"
mkdir -p "$ROOT/app/(dashboard)/faculty/subjects/[id]"
mkdir -p "$ROOT/app/(dashboard)/faculty/subjects/[id]/materials"
mkdir -p "$ROOT/app/(dashboard)/faculty/subjects/[id]/assignments"
mkdir -p "$ROOT/app/(dashboard)/faculty/subjects/[id]/exams"
mkdir -p "$ROOT/app/(dashboard)/faculty/subjects/[id]/question-bank"
mkdir -p "$ROOT/app/(dashboard)/faculty/subjects/[id]/marks"
mkdir -p "$ROOT/app/(dashboard)/faculty/attendance"
mkdir -p "$ROOT/app/(dashboard)/faculty/analytics"
mkdir -p "$ROOT/app/(dashboard)/faculty/reports"
mkdir -p "$ROOT/app/(dashboard)/faculty/broadcast"

# ── Recruiter routes ──
mkdir -p "$ROOT/app/(dashboard)/recruiter/dashboard"
mkdir -p "$ROOT/app/(dashboard)/recruiter/candidates"
mkdir -p "$ROOT/app/(dashboard)/recruiter/shortlist"
mkdir -p "$ROOT/app/(dashboard)/recruiter/interviews"
mkdir -p "$ROOT/app/(dashboard)/recruiter/analytics"

# ── TPO routes ──
mkdir -p "$ROOT/app/(dashboard)/tpo/dashboard"
mkdir -p "$ROOT/app/(dashboard)/tpo/company-drives"
mkdir -p "$ROOT/app/(dashboard)/tpo/company-drives/[id]"
mkdir -p "$ROOT/app/(dashboard)/tpo/company-drives/[id]/eligibility"
mkdir -p "$ROOT/app/(dashboard)/tpo/company-drives/[id]/offers"
mkdir -p "$ROOT/app/(dashboard)/tpo/company-drives/[id]/interviews"
mkdir -p "$ROOT/app/(dashboard)/tpo/placement-reports"
mkdir -p "$ROOT/app/(dashboard)/tpo/department-stats"

# ── College Admin routes ──
mkdir -p "$ROOT/app/(dashboard)/college-admin/dashboard"
mkdir -p "$ROOT/app/(dashboard)/college-admin/departments"
mkdir -p "$ROOT/app/(dashboard)/college-admin/semesters"
mkdir -p "$ROOT/app/(dashboard)/college-admin/courses"
mkdir -p "$ROOT/app/(dashboard)/college-admin/faculty"
mkdir -p "$ROOT/app/(dashboard)/college-admin/students"
mkdir -p "$ROOT/app/(dashboard)/college-admin/academic-reports"
mkdir -p "$ROOT/app/(dashboard)/college-admin/announcements"
mkdir -p "$ROOT/app/(dashboard)/college-admin/announcement-templates"

# ── Admin routes ──
mkdir -p "$ROOT/app/(dashboard)/admin/dashboard"
mkdir -p "$ROOT/app/(dashboard)/admin/users"
mkdir -p "$ROOT/app/(dashboard)/admin/roles"
mkdir -p "$ROOT/app/(dashboard)/admin/feature-flags"
mkdir -p "$ROOT/app/(dashboard)/admin/system-settings"
mkdir -p "$ROOT/app/(dashboard)/admin/backups"
mkdir -p "$ROOT/app/(dashboard)/admin/audit-logs"
mkdir -p "$ROOT/app/(dashboard)/admin/api-usage"
mkdir -p "$ROOT/app/(dashboard)/admin/error-monitoring"
mkdir -p "$ROOT/app/(dashboard)/admin/health"
mkdir -p "$ROOT/app/(dashboard)/admin/notifications"
mkdir -p "$ROOT/app/(dashboard)/admin/notifications/templates"
mkdir -p "$ROOT/app/(dashboard)/admin/broadcast"

# ── Billing routes ──
mkdir -p "$ROOT/app/(dashboard)/billing/plans"
mkdir -p "$ROOT/app/(dashboard)/billing/subscription"
mkdir -p "$ROOT/app/(dashboard)/billing/invoices"
mkdir -p "$ROOT/app/(dashboard)/billing/coupons"
mkdir -p "$ROOT/app/(dashboard)/billing/refunds"

# ── Lab routes ──
mkdir -p "$ROOT/app/(dashboard)/lab/subjects"
mkdir -p "$ROOT/app/(dashboard)/lab/subjects/[id]"
mkdir -p "$ROOT/app/(dashboard)/lab/subjects/[id]/experiments"
mkdir -p "$ROOT/app/(dashboard)/lab/subjects/[id]/assignments"
mkdir -p "$ROOT/app/(dashboard)/lab/subjects/[id]/exams"
mkdir -p "$ROOT/app/(dashboard)/lab/subjects/[id]/vivas"
mkdir -p "$ROOT/app/(dashboard)/lab/subjects/[id]/projects"
mkdir -p "$ROOT/app/(dashboard)/lab/subjects/[id]/attendance"
mkdir -p "$ROOT/app/(dashboard)/lab/subjects/[id]/obe"

# ── Settings ──
mkdir -p "$ROOT/app/settings/profile"
mkdir -p "$ROOT/app/settings/security"
mkdir -p "$ROOT/app/settings/notifications"
mkdir -p "$ROOT/app/settings/2fa"
mkdir -p "$ROOT/app/settings/linked-accounts"

# ── Layout components ──
mkdir -p "$ROOT/components/layout/sidebar"
mkdir -p "$ROOT/components/layout/header"
mkdir -p "$ROOT/components/layout/footer"
mkdir -p "$ROOT/components/layout/breadcrumb"

# ── UI components ──
mkdir -p "$ROOT/components/ui"

# ── Form components ──
mkdir -p "$ROOT/components/forms/auth"
mkdir -p "$ROOT/components/forms/profile"
mkdir -p "$ROOT/components/forms/academic"
mkdir -p "$ROOT/components/forms/dsa"
mkdir -p "$ROOT/components/forms/resume"
mkdir -p "$ROOT/components/forms/billing"

# ── Shared components ──
mkdir -p "$ROOT/components/shared"

# ── Feature components ──
for feat in auth dashboard academics dsa placement interviews career resumes gamification certificates community jobs internships mentors company-prep faculty recruiter tpo admin billing lab ai leaderboards battles notifications; do
  mkdir -p "$ROOT/components/features/$feat"
done

# ── Lib ──
mkdir -p "$ROOT/lib/hooks/queries"
mkdir -p "$ROOT/lib/hooks/mutations"
mkdir -p "$ROOT/lib/types"
mkdir -p "$ROOT/lib/validators"

# ── Stores ──
mkdir -p "$ROOT/stores"

# ── Styles ──
mkdir -p "$ROOT/styles"

echo "Done — $(find "$ROOT" -type d | wc -l) directories created"
