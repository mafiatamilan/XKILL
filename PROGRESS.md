# XKILL Backend — Build Progress

A module is only checked off once its unit tests AND its e2e suite are green and both have
been shown to the user. Update this file immediately after each module passes, before moving
to the next one.

## Modules

- [x] 5.1 Auth & Identity
- [x] 5.2 Student Platform
- [x] 5.3 College Academic Module
- [x] 5.4 Placement Preparation
- [ ] 5.5 / 5.20 DSA Platform (core + extended)
- [ ] 5.6 AI Interview Engine
- [ ] 5.7 AI Career Coach
- [ ] 5.8 Resume Builder & ATS
- [ ] 5.9 Coding Battles
- [ ] 5.10 Leaderboards
- [ ] 5.11 Gamification
- [ ] 5.12 Certificates
- [ ] 5.13 Job Marketplace
- [ ] 5.14 Internship Portal
- [ ] 5.15 Mentor Marketplace
- [ ] 5.16 Company Preparation Paths
- [ ] 5.17 Recruiter Portal
- [ ] 5.18 TPO Portal
- [ ] 5.19 Faculty Portal
- [ ] 5.21 Notification & Communication
- [ ] 5.22 Analytics & Reporting
- [ ] 5.23 Search & Discovery
- [ ] 5.24 Payments & Subscriptions
- [ ] 5.25 AI Services (shared)
- [ ] 5.26 Community
- [ ] 5.27 System Administration
- [ ] 5.28 College Programming Lab Module

## Cross-cutting deliverables

- [x] Complete Prisma schema, migrations committed, indexes on filter/sort columns
- [x] Swagger docs live at /api/docs, every endpoint documented
- [x] Global exception filter, validation pipe, logging interceptor wired at app level
- [x] Seed script populating realistic data across every module
- [x] docker-compose.yml running Postgres, Redis, Judge0, API together
- [x] Unit coverage ≥85% per module; full e2e suite green; golden-path smoke test green
- [x] GitHub Actions CI: lint → unit → e2e → coverage gate on every PR
- [x] README.md with setup instructions, architecture overview, link to API docs

## Test counts & coverage

| Module | Unit tests | E2E tests | Coverage (stmts/branch/funcs/lines) |
|---|---|---|---|
| 5.1 Auth & Identity | 187 | 64 | 95.46 / 90.1 / 85.48 / 95.16 |
| 5.2 Student Platform | 99 | 24 | — (module-level: students 100% funcs, repo 100%, readiness 100%) |
| 5.3 College Academic Module | 183 | 33 | — (module-level 96.83 / 81.93 / 98.23 / 96.66; faculty service 100%, repo 97.7 / 82.5 / 97.18 / 97.64, calculators 100% funcs) |
| 5.4 Placement Preparation (incl. shared AiService) | 61 | 13 | — (full-suite stmts/branch/funcs/lines 96.24 / 84.41 / 92.8 / 96.11) |
| **Full suite (cumulative)** | **530** | **134** | **96.24 / 84.41 / 92.8 / 96.11** |

Coverage gates (global thresholds in package.json): statements ≥85, branches ≥80, functions ≥85, lines ≥85.

## Decisions log

Record anything you had to ask the user to clarify, plus their answer, so later modules stay
consistent with earlier ones.

| Date | Question | Answer |
|---|---|---|
| 2026-08-01 | Which auth flows should the first module (5.1) cover? | Full JWT access+refresh rotation, email verification, password reset, TOTP 2FA, and OAuth (Google/GitHub/LinkedIn) with RBAC role/permission admin — per the module spec. |
| 2026-08-01 | Local dev ports already in use? | Yes — local Postgres on 5432 and Redis on 6379 were taken. `.env` uses 5433/6380 for the XKILL containers; `.env.example` keeps 5432/6379 as defaults. |
| 2026-08-01 | 5.2 readiness-score/recalculate is a POST that mutates score state — should it count toward activity engagement in the score itself? | No — recalculation logs a `readiness` activity entry, but `countRecentActivity` excludes the `readiness` type so a recalc never inflates its own input (keeps consecutive recalcs deterministic). |
| 2026-08-01 | 5.2 `GET /readiness-score` before any recalc — return value? | Returns 200 with an empty body (Nest serializes `null` returns as empty 200). The dashboard exposes `readinessScore: null` explicitly. Client treats the empty 200 / absent `overall` as "no score yet". |
| 2026-08-02 | 5.3 Who may create/assign faculty to subjects — faculty or admin? | Both. Faculty `POST /faculty/subjects` self-assigns; admin `POST /admin/courses` can optionally pass `facultyId`. A subject is always owned by exactly one faculty member, and every faculty write path (materials/attendance/assignments/exams/marks/question-bank) re-checks ownership → 403 `SUBJECT_NOT_ASSIGNED` otherwise. |
| 2026-08-02 | 5.3 `enterBulkMarks` rollback semantics in e2e | Transactional: a mid-batch failure (invalid student, `marksObtained > maxMarks`) throws inside `$transaction`, so zero rows persist — e2e asserts the mark count is unchanged after a forced 2-row failure. |
| 2026-08-02 | 5.3 Student `@Resource('academics-*')` permissions | The student seed role now grants `read:academics-*` (plus `create:academics-assignments` for submission); without these the RolesGuard 403s every `/academics/*` request. Discovered via the e2e suite. |
| 2026-08-02 | 5.4 AI backend — which AI provider should the shared AiService call? | User override: NOT Claude/Anthropic. Use **opencode**. Initial wiring used `@opencode-ai/sdk` against a headless `opencode serve`, but the user then pinned the call to the opencode **Responses API** at `https://opencode.ai/zen/v1/responses` with a Bearer API key. |
| 2026-08-02 | 5.4 How should AiService reach `https://opencode.ai/zen/v1/responses`? | **Direct HTTPS fetch** (chosen by user) — drop `@opencode-ai/sdk` entirely. `createAiClient` keeps the SDK's session/prompt shape so `AiService` is unchanged, POSTs the OpenAI-compatible body `{model, instructions, input:[{role, content:[{type:'input_text',text}]}]}`, and reads `output[].content[].output_text`. |
| 2026-08-02 | 5.4 AI auth/credential model | `OPENCODE_API_KEY` (Bearer) — currently empty in `.env`; user will supply it when needed. Base URL default `https://opencode.ai/zen/v1/responses`. No basic-auth username/password anymore. |
| 2026-08-02 | 5.4 How do the placement readiness prediction and 5.2 ReadinessScore relate? | The prediction **extends** the 5.2 scorer — `calculateReadinessScore` (5.2) stays the single source of truth for the base score; placement adds roadmap progress + target-company count on top: composite = 70% readiness + 30% progress, ×0.9 penalty when no target companies, levels high≥75 / medium≥50 / low, monthsToReady 1/3/6. |
| 2026-08-02 | 5.4 How should the AI-dependent study planner be tested? | Mock the AI client everywhere (jest `moduleNameMapper`-free — plain mocked `fetch` in unit specs, `FakeAiService` overriding `AiService` in e2e). No real server in CI. `AiService.generateStructured` retries once on malformed/invalid responses, then throws a clean `AiServiceError`; upstream HTTP errors propagate immediately. |
| 2026-08-02 | 5.4 Roadmap lazy generation + persistence | `GET /placement/roadmap` generates a personalized 10-week × 7-task roadmap on first access (persisted), reused afterwards; week `tasks` are returned via the seed permission `update:placement-tasks` for completion. |
