# XKILL Module Specifications

Read only the section for the module currently being built. Entities without endpoints
listed get standard CRUD per the conventions in the main `SKILL.md` (list envelope, error
envelope, thin controllers, soft deletes on user-facing entities, audit log on mutations).

## Table of contents

- [5.1 — Auth & Identity](#51--auth--identity)
- [5.2 — Student Platform](#52--student-platform)
- [5.3 — College Academic Module](#53--college-academic-module)
- [5.4 — Placement Preparation](#54--placement-preparation)
- [5.5 / 5.20 — DSA Platform (core + extended)](#55--520--dsa-platform-core--extended)
- [5.6 — AI Interview Engine](#56--ai-interview-engine)
- [5.7 — AI Career Coach](#57--ai-career-coach)
- [5.8 — Resume Builder & ATS](#58--resume-builder--ats)
- [5.9 — Coding Battles](#59--coding-battles)
- [5.10 — Leaderboards](#510--leaderboards)
- [5.11 — Gamification](#511--gamification)
- [5.12 — Certificates](#512--certificates)
- [5.13 — Job Marketplace](#513--job-marketplace)
- [5.14 — Internship Portal](#514--internship-portal)
- [5.15 — Mentor Marketplace](#515--mentor-marketplace)
- [5.16 — Company Preparation Paths](#516--company-preparation-paths)
- [5.17 — Recruiter Portal](#517--recruiter-portal)
- [5.18 — TPO Portal](#518--tpo-portal)
- [5.19 — Faculty Portal](#519--faculty-portal)
- [5.21 — Notification & Communication](#521--notification--communication)
- [5.22 — Analytics & Reporting](#522--analytics--reporting)
- [5.23 — Search & Discovery](#523--search--discovery)
- [5.24 — Payments & Subscriptions](#524--payments--subscriptions)
- [5.25 — AI Services (shared)](#525--ai-services-shared)
- [5.26 — Community](#526--community)
- [5.27 — System Administration](#527--system-administration)
- [5.28 — College Programming Lab Module](#528--college-programming-lab-module)

---

## 5.1 — Auth & Identity

**Entities:** User, Role, Permission, Session, Device, OAuthAccount, PasswordResetToken, EmailVerificationToken, TwoFactorSecret

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh-token`
- `GET /auth/verify-email/:token`, `POST /auth/resend-verification-email`
- `POST /auth/forgot-password`, `POST /auth/reset-password`
- `POST /auth/2fa/setup` (returns secret + QR), `POST /auth/2fa/verify`, `POST /auth/2fa/disable`
- `GET /auth/oauth/:provider`, `GET /auth/oauth/:provider/callback` (google, github, linkedin)
- `GET /users/me/sessions`, `DELETE /users/me/sessions/:sessionId`
- `PATCH /admin/users/:id/suspend`, `PATCH /admin/users/:id/reactivate`
- `GET|POST|PATCH /admin/roles` — RBAC role/permission management

**Test focus:** full lifecycle e2e (register → verify → login → protected route → refresh →
2FA setup → 2FA login → forgot/reset password → OAuth callback (mocked) → logout → token now
rejected), token expiry and tampered-token 401s, role-guard 403s, concurrent-refresh-token
race handling.

## 5.2 — Student Platform

**Entities:** StudentProfile, SkillProfile, CareerGoal, ReadinessScore, Notification, CalendarEvent, ActivityLog, UserSettings
**Standard CRUD:** SkillProfile, CareerGoal, CalendarEvent, UserSettings

- `GET /students/me/dashboard` — aggregated summary
- `GET|PATCH /students/me/profile`
- `GET /students/me/readiness-score`, `POST /students/me/readiness-score/recalculate`
- `GET /students/me/notifications`, `PATCH /students/me/notifications/:id/read`, `PATCH /students/me/notifications/read-all`
- `GET /students/me/activity-timeline`

## 5.3 — College Academic Module

**Entities:** Department, Subject, Semester, StudyMaterial, Exam, Assignment, AttendanceRecord, TimetableSlot, InternalMark, AcademicCalendarEvent, QuestionBankItem

Student-facing:
- `GET /academics/departments`, `GET /academics/semesters` (reference data)
- `GET /academics/subjects?semester=&department=`, `GET /academics/subjects/:id/materials`, `GET /academics/subjects/:id/timetable`
- `GET /academics/exams/me`, `GET /academics/assignments/me`, `POST /academics/assignments/:id/submit`
- `GET /academics/attendance/me`, `GET /academics/marks/me`
- `GET /academics/gpa/me`, `GET /academics/cgpa/me`
- `GET /academics/calendar`

Faculty-facing:
- Standard CRUD `/faculty/subjects`, `/faculty/subjects/:id/materials`
- `POST /faculty/attendance` (mark a session)
- Standard CRUD `/faculty/assignments`, `/faculty/exams`
- `POST /faculty/exams/:id/marks` (bulk entry → gradebook, must be transactional)
- `GET /faculty/students/:id/analytics`
- Standard CRUD `/faculty/question-bank`

College administration:
- Standard CRUD `/admin/departments`, `/admin/courses`, `/admin/faculty`, `/admin/students`
- `GET /admin/academic-reports`

**Test focus:** GPA/CGPA calculation unit tests (backlog subjects, credit weighting, edge
cases with zero credits), attendance percentage calculation, bulk marks entry transaction
integrity (partial failure must roll back the whole batch).

## 5.4 — Placement Preparation

**Entities:** RoadmapWeek, DailyTask, CompanyPrepTrack, ProgressRecord, ReadinessPrediction, DailyChallenge, StudyPlan

- `GET /placement/roadmap` (personalized 10-week plan)
- `GET /placement/roadmap/:week/tasks`, `PATCH /placement/tasks/:id/complete`
- `GET /placement/companies/:company/prep`
- `GET /placement/progress`, `GET /placement/readiness-prediction`
- `GET /placement/daily-challenge`
- `POST /placement/study-planner/generate` (calls `AiService`)

## 5.5 / 5.20 — DSA Platform (core + extended)

This is the largest and highest-risk module — budget the most time and the most tests here.
Build 5.5 and 5.20 as one module; the split below is only where the spec originally
separated a short core list from the extended one.

**Entities:** Problem, TestCase, Editorial, Hint, Submission, Playlist, Contest, ContestParticipant, CodingRating, Discussion, CodingAchievement

- `GET /dsa/problems` (filters: difficulty, topic, company, tag — must perform against a
  10,000+ row table, so index appropriately)
- `GET /dsa/problems/:id`
- `POST /dsa/problems/:id/run` — custom input, does not persist a submission
- `POST /dsa/problems/:id/submit` — enqueues a Judge0 job via BullMQ, returns `submissionId`
  immediately; verdict delivered via `GET /dsa/submissions/:id` (poll) and a WebSocket event
- `GET /dsa/problems/:id/editorial`, `GET /dsa/problems/:id/hints` (progressive reveal — hint
  2 only unlockable after hint 1), `GET /dsa/problems/:id/discussion`
- `GET /dsa/submissions/me`
- Standard CRUD `/dsa/playlists`
- `GET /dsa/sheets` (Blind 75, Grind 169, NeetCode 150, company sheets — curated, versioned lists)
- `GET /dsa/progress/me` (solved counts by difficulty/topic/company)
- Standard CRUD `/dsa/contests`, `POST /dsa/contests/:id/register`, `GET /dsa/contests/:id/leaderboard`
- `GET /dsa/rating/me`, `GET /dsa/rating/history`
- `GET /dsa/analytics/me` (accuracy, heatmap, weak/strong topics, average runtime, rating trend)
- `PATCH /dsa/profile/visibility` (recruiter-visible field toggles)
- `POST /dsa/anti-cheat/event` (client-reported tab-switch/copy-paste events, logged for later review)

**Test focus:** every verdict type (Accepted / WA / TLE / MLE / RE / CE) against a mocked
Judge0 client; concurrent-submission race conditions on the same problem; rating
recalculation algorithm as isolated unit tests with known input/output pairs; contest
leaderboard tie-break rules; hint progressive-unlock logic.

## 5.6 — AI Interview Engine

**Entities:** InterviewSession, InterviewTurn, InterviewFeedback, InterviewReport

- `POST /interviews/sessions` (`type`: hr | technical | dsa | system-design)
- `POST /interviews/sessions/:id/turns` (submit answer → next AI question + running feedback)
- `POST /interviews/sessions/:id/end`
- `GET /interviews/sessions/:id/report`, `GET /interviews/sessions` (history)
- Voice/video: build request/response contracts now, mark implementation `[future]` — do not
  fake functionality behind them.

**Test focus:** mock `AiService` responses in unit tests; e2e test a full mocked multi-turn
session including the report generation step.

## 5.7 — AI Career Coach

**Entities:** CareerRoadmapItem, LearningRecommendation, SalaryPrediction, SkillGap, CareerChatMessage, CareerGoal (shared with 5.2)

- `GET /career-coach/roadmap`, `GET /career-coach/recommendations`
- `GET /career-coach/salary-prediction`, `GET /career-coach/skill-gap`
- `POST /career-coach/chat` (streamed AI response)

## 5.8 — Resume Builder & ATS

**Entities:** Resume, ResumeTemplate, AtsAnalysis, ResumeVersion

- Standard CRUD `/resumes`
- `GET /resumes/templates`
- `POST /resumes/:id/ats-analysis`, `GET /resumes/:id/score`, `GET /resumes/:id/suggestions`
- `GET /resumes/:id/export?format=pdf|docx`
- `GET /resumes/:id/versions`, `POST /resumes/:id/versions/:versionId/restore`

## 5.9 — Coding Battles

**Entities:** Battle, BattleParticipant, BattleSubmission, CodingRating, MatchHistory, AntiCheatFlag

- `POST /battles/ranked/join-queue`, `DELETE /battles/ranked/leave-queue`
- `POST /battles/practice`, `POST /battles/private`
- `GET /battles/:id`, WebSocket channel `battles/:id/live`
- `POST /battles/:id/submit`
- `GET /battles/ratings/me`, `GET /battles/history`

**Test focus:** matchmaking pairing logic (unit), a real two-client WebSocket e2e test
asserting both sides receive synchronized state.

## 5.10 — Leaderboards

Read-only, Redis sorted-set backed:
- `GET /leaderboards/global`, `/college/:id`, `/department/:id`, `/company/:name`, `/weekly`, `/monthly`, `/nearby-me`

## 5.11 — Gamification

**Entities:** XpLedger, Level, Streak, Badge, Achievement, DailyReward, Mission, WeeklyChallenge, SeasonalEvent

- `GET /gamification/me/summary`
- `POST /gamification/daily-reward/claim`
- `GET /gamification/badges`, `/achievements`, `/missions`, `/weekly-challenges`, `/seasonal-events`

**Test focus:** XP awards must be idempotent (the same completed action can never award XP
twice — test explicitly with duplicate event submission); streak logic must be tested across
timezone boundaries and DST transitions.

## 5.12 — Certificates

**Entities:** Certificate, CertificateTemplate

- `GET /certificates/me`
- `GET /certificates/:id/verify` — **public**, no auth
- `GET /certificates/:id/qr`, `GET /certificates/:id/pdf`
- `POST /certificates/:id/renew`, `POST /certificates/:id/share/linkedin`

## 5.13 — Job Marketplace

**Entities:** JobListing, JobApplication, SavedJob, CompanyProfile

- Standard CRUD `/jobs` (recruiter-owned; public read)
- `GET /jobs/search` (filters)
- `POST /jobs/:id/apply`, `GET /applications/me`
- `POST /jobs/:id/save`, `DELETE /jobs/:id/save`
- `GET /jobs/:id/eligibility-check`
- `GET /companies/:id/profile`, `POST /jobs/:id/contact-recruiter`

## 5.14 — Internship Portal

**Entities:** InternshipListing, InternshipApplication, InternshipCertificate

- Standard CRUD `/internships` (filters: summer, winter, remote)
- `POST /internships/:id/apply`, `GET /internships/:id/certificate`

## 5.15 — Mentor Marketplace

**Entities:** MentorProfile, MentorAvailability, Booking, Review, MentorPayment

- Standard CRUD `/mentors` (profile)
- `GET /mentors/:id/availability`, `POST /mentors/:id/book`
- `POST /bookings/:id/pay`, `POST /bookings/:id/review`, `GET /bookings/me`

**Test focus:** double-booking prevention on availability slots must be tested under
concurrent requests.

## 5.16 — Company Preparation Paths

**Entities:** CompanyPrepPath, HiringPattern, InterviewQuestion, OnlineAssessment, SalaryInsight, PrepTimeline

- `GET /companies/:name/prep-path` (hiring pattern, questions, OA info, HR prep, salary insight, timeline)
- Admin CRUD to populate per-company content

## 5.17 — Recruiter Portal

**Entities:** RecruiterProfile, Shortlist, InterviewSchedule, HiringAnalyticsSnapshot

- `GET /recruiter/dashboard`
- Standard CRUD `/recruiter/company-profile`, `/recruiter/jobs`
- `GET /recruiter/candidates/search`, `/recruiter/resumes/search`
- `POST /recruiter/certificates/:id/verify`
- `POST /recruiter/shortlist/:candidateId`
- Standard CRUD `/recruiter/interview-schedule`
- `GET /recruiter/analytics`

## 5.18 — TPO Portal

**Entities:** CompanyDrive, EligibilityCriteria, PlacementReport, OfferRecord

- `GET /tpo/dashboard`
- Standard CRUD `/tpo/company-drives`
- `GET /tpo/students/eligibility?driveId=`
- `GET /tpo/placement-reports`
- Standard CRUD `/tpo/interview-schedule`, `/tpo/offers`
- `GET /tpo/department-stats`
- `POST /tpo/recruiters/:id/coordinate`

## 5.19 — Faculty Portal

Mostly the faculty-facing routes already specified in 5.3, plus:
- `GET /faculty/dashboard`, `GET /faculty/reports`
- `POST /faculty/notifications/broadcast`

## 5.21 — Notification & Communication

**Entities:** NotificationTemplate, Announcement, BroadcastMessage

- `GET /notifications/me`, `PATCH /notifications/:id/read`
- Standard CRUD `/admin/announcements`, `POST /admin/broadcast`
- Fan-out to email/push/SMS happens inside `NotificationService`, queued via BullMQ — never
  send synchronously inside a request handler.

## 5.22 — Analytics & Reporting

- `GET /analytics/student/:id`, `/recruiter/:id`, `/faculty/:id`, `/placement`, `/college/:id`, `/revenue`
- `POST /analytics/custom-report` (query builder → CSV or JSON export)

## 5.23 — Search & Discovery

- `GET /search?q=&type=problem|job|mentor|student|company` — unified search (start on
  `pg_trgm`, designed to swap in OpenSearch later without an API change)
- Type-specific advanced filters as query params

## 5.24 — Payments & Subscriptions

**Entities:** SubscriptionPlan, Subscription, Invoice, Coupon, Refund

- `GET /billing/plans`
- `POST /billing/subscribe`, `POST /billing/cancel`
- `POST /billing/coupons/apply`
- `GET /billing/invoices`, `GET /billing/history`
- `POST /billing/refund` (admin)
- `POST /webhooks/razorpay` — **signature-verified**, idempotent, never trust unverified
  webhook payloads

**Test focus:** webhook signature verification (reject tampered payloads), idempotency key
enforcement (duplicate webhook delivery must not double-process a payment).

## 5.25 — AI Services (shared)

Shared `AiService`, used by 5.6 / 5.7 / 5.8 / 5.20 / 5.28.

- `POST /ai/tutor/ask`, `POST /ai/doubt-solver`, `POST /ai/code-review`
- `POST /ai/resume-analyzer`, `POST /ai/interview-evaluator`
- `POST /ai/question-generator`, `POST /ai/study-planner`

**Test focus:** mock the Anthropic client entirely in unit/e2e tests; verify
structured-output parsing handles a malformed model response gracefully (retry once, then a
clean 502 to the client, never an unhandled exception).

## 5.26 — Community

**Entities:** ForumPost, ForumComment, StudyGroup, CodingClub, Like

- Standard CRUD `/community/forum/posts`, `/community/forum/comments`
- `POST /community/posts/:id/like`
- Standard CRUD `/community/study-groups`, `/community/coding-clubs`

## 5.27 — System Administration

- `GET|PATCH /admin/feature-flags`
- `POST /admin/maintenance-mode/toggle`
- `GET /admin/backups`, `POST /admin/backups/trigger`
- `GET /admin/audit-logs` (shared with 5.1/5.3 mutations)
- `GET /admin/error-monitoring`, `GET /api/v1/health`
- `GET /admin/api-usage`

## 5.28 — College Programming Lab Module

Pairs with 5.3 — build immediately after it.

**Entities:** LabSubject, LabExperiment, LabSubmission, ProgrammingAssignment, PracticalExam, VivaRecord, MiniProject, PlagiarismReport, CourseOutcome, ProgramOutcome, CoPoMapping

- Standard CRUD `/lab/subjects` (name, code, department, semester, credits, language, passing criteria)
- Standard CRUD `/lab/subjects/:id/experiments` (weekly: objective, theory, problem statement,
  sample I/O, constraints, starter code, deadline, rubric, viva questions)
- `POST /lab/experiments/:id/submit` (write/compile/execute/debug via Judge0, draft save,
  resubmit if permitted)
- `GET /lab/experiments/:id/results` — score breakdown: compilation, correctness, efficiency,
  coding standards, documentation
- Standard CRUD `/lab/assignments` (attachments, dataset, ZIP or GitHub-link submission)
- Standard CRUD `/lab/practical-exams` (start/end time, duration, question count, difficulty,
  language, security config: fullscreen, tab-switch detection, copy-paste restriction,
  browser-refresh recovery, auto-save, optional webcam, activity log)
- `POST /lab/practical-exams/:id/start-session`, `POST /lab/practical-exams/:id/submit`
- Standard CRUD `/lab/viva` (question bank, marks entry, remarks, attendance, pass/fail,
  optional recording)
- Standard CRUD `/lab/mini-projects` (title, abstract, problem statement, stack, repo link,
  demo video, docs) + evaluation endpoint
- `POST /lab/attendance/mark` (lab login, experiment submission, exam attendance, QR)
- `POST /lab/experiments/:id/evaluate` (faculty rubric-based review)
- `POST /lab/ai/review` — AI code reviewer (logic, complexity, naming, formatting, bug
  detection) via shared `AiService`
- `POST /lab/ai/assistant` — explain program / find bug / generate test cases / explain
  compiler error / convert C↔Java↔Python / explain SQL
- `POST /lab/plagiarism/scan` (student-vs-student, vs-previous-batch, vs-internet,
  vs-AI-generated; returns similarity %)
- `GET /lab/faculty/analytics`, `GET /lab/student/analytics`
- `GET /lab/semester-dashboard`
- `GET /lab/certificates` (auto-issued per subject completion)
- `GET /lab/reports?format=excel|csv|pdf` (marks register, attendance register, practical
  exam report, CO/PO attainment)
- Standard CRUD `/lab/obe/course-outcomes`, `/lab/obe/program-outcomes`,
  `/lab/obe/co-po-mapping`; `GET /lab/obe/attainment-report`

**Test focus:** rubric score aggregation math, CO/PO attainment calculation, plagiarism
similarity threshold logic, exam-security event logging correctness under concurrent
submissions near the exam deadline.
