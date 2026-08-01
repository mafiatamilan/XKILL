---
name: xkill-backend-build
description: 'Operating manual for building the XKILL backend end to end — a NestJS + Prisma + PostgreSQL REST API spanning 28 modules: auth/RBAC, student platform, college academics, DSA/coding-judge platform, AI interview engine, career coach, resume/ATS, coding battles, leaderboards, gamification, certificates, job marketplace, internships, mentor marketplace, company prep paths, recruiter/TPO/faculty portals, notifications, analytics, search, Razorpay payments, shared AI service, community, system admin, and the college programming lab module. Use whenever work touches the XKILL backend: implementing a module, Prisma schema/migrations, NestJS controllers/services/DTOs/guards, Judge0/BullMQ/Redis/Socket.io wiring, casl RBAC, or unit/e2e/Testcontainers tests — and when deciding what to build next. Also trigger on XKILL entity/endpoint names without the word XKILL itself, e.g. mentor booking slots, DSA submission verdicts, CO/PO attainment reports, readiness score, coding-battle matchmaking.'
---

# XKILL Backend Build

XKILL is a combined placement-prep / college-ERP / competitive-programming / job-marketplace
platform. This skill governs the **backend only** (no frontend). Act as a senior backend
engineer: the codebase must be professional — consistent structure, full input validation,
consistent error handling, complete Swagger documentation, and a real automated test suite
(not a couple of smoke tests) covering every endpoint end-to-end.

Never skip modules, stub endpoints silently, or leave `TODO` placeholders for functionality
described in `references/module-specs.md`. If a requirement is genuinely ambiguous, ask
before guessing, then implement it fully — don't silently pick an interpretation for
anything that affects auth, money, or grades.

## Fixed technology stack

| Concern | Choice |
|---|---|
| Language | TypeScript, `strict: true` |
| Framework | NestJS |
| ORM | Prisma |
| Database | PostgreSQL |
| Cache / queues / pub-sub | Redis (`ioredis`) + BullMQ |
| Real-time | Socket.io via NestJS gateways, Redis adapter |
| Auth | JWT (access + refresh) + Passport.js strategies; RBAC via `casl` |
| Validation | `class-validator` + `class-transformer` on every DTO |
| API docs | `@nestjs/swagger`, auto-generated, served at `/api/docs` |
| Code execution | Self-hosted **Judge0**, accessed only through a `JudgeService` client — never call it directly from controllers |
| AI | `@anthropic-ai/sdk`, wrapped in an `AiService` — every AI call is server-side only, structured output via tool-use where the response must be parsed as JSON |
| Payments | Razorpay SDK behind a `PaymentsService` interface (so Stripe can be added later without touching business logic) |
| Email / SMS / Push | SES / Twilio / FCM, each behind a single `NotificationService` interface |
| Testing | Jest (unit) + Supertest (e2e) + Testcontainers (real Postgres + Redis for integration/e2e — never mock the DB in e2e tests) |
| Test data | `@faker-js/faker` + a `TestDataFactory` class per entity — no hardcoded fixture JSON files |
| Lint/format | ESLint + Prettier + Husky pre-commit (lint + affected tests) |
| Containerization | `docker-compose.yml` running Postgres, Redis, Judge0, and the API together for local dev |

## Engineering standards — apply to every module, no exceptions

- **Module structure**: every domain module has `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`
  (request AND response DTOs, not just request), `*.module.ts`, `*.repository.ts` (Prisma
  queries isolated from service logic), `*.spec.ts` (unit), and a matching
  `test/e2e/*.e2e-spec.ts`.
- **Controllers stay thin** — no business logic in controllers. They validate (via DTO +
  pipe), call one service method, return.
- **API versioning**: every route lives under `/api/v1/...`.
- **Auth by default**: every route requires a valid JWT unless explicitly decorated
  `@Public()`. Every route enforces role checks via `@Roles(...)` + a `RolesGuard` built on
  `casl` abilities, not just string role checks — this platform has ~8 distinct roles
  (student, faculty, college_admin, recruiter, tpo, parent, mentor, admin) with materially
  different permissions.
- **Standard list envelope** for every collection endpoint:
  `GET /resource?page=1&limit=20&sortBy=createdAt&order=desc&search=&filter[field]=value`
  → `{ data: T[], meta: { total, page, limit, totalPages } }`
- **Standard error envelope** via a global exception filter:
  `{ statusCode, message, error, timestamp, path }` — never let a raw stack trace or Prisma
  error leak to the client.
- **Standard success envelope** for single-resource responses: return the resource directly
  (no unnecessary wrapper), consistently across every module.
- **Soft deletes** on user-facing entities needing suspend/reactivate semantics
  (`deletedAt` nullable timestamp) — never hard-delete a User, Job, Certificate, etc.
- **Audit log** every mutating request (who, what entity, before/after diff, timestamp, IP)
  into an `audit_logs` table — first-class requirement, must cover admin actions, faculty
  grade changes, and payment events at minimum.
- **Idempotency keys** required on all payment-mutating POST endpoints.
- **Rate limiting**: global per-IP limit plus a tighter per-user limit on auth and AI
  endpoints specifically (most abuse-prone, most expensive routes).
- **Structured logging** (`pino` or NestJS Logger with a JSON transport) with a correlation
  ID attached to every request and propagated through async job processing.
- **Environment config**: all config through `@nestjs/config`, validated at boot with a
  `zod` (or `joi`) schema — fail fast on startup if a required env var is missing, never
  fail on first request. Commit a complete `.env.example`.
- **Health checks**: `/api/v1/health` using `@nestjs/terminus`, checking DB, Redis, and
  Judge0 connectivity.

## Testing requirements

"Fully tested end-to-end" means all of the following — not just one:

1. **Unit tests** for every service method, with Prisma and all external clients (Judge0,
   Anthropic, Razorpay, notification providers) mocked. Target ≥85% line coverage per
   module. Cover unhappy paths explicitly (invalid-but-past-validation input, not-found,
   conflict, forbidden) — not just the happy path.
2. **E2E tests per module** via Supertest against a real running instance with real
   Postgres/Redis from Testcontainers (spun up/torn down per suite, seeded via
   `TestDataFactory`). For every endpoint assert: 200/201 happy path with correct response
   shape, 400 on invalid payload, 401 with no/invalid token, 403 with wrong role, 404 on
   missing resource, 409 where a conflict is meaningful (duplicate email, double-booking a
   mentor slot, etc.).
3. **Dedicated auth e2e suite**: register → verify email → login → access protected route →
   refresh token → enable 2FA → login requiring 2FA code → forgot password → reset password
   → OAuth callback (mocked provider) → logout → confirm token now rejected.
4. **One cross-module "golden path" e2e smoke suite**: register a student → solve a DSA
   problem and receive a real verdict from a mocked Judge0 → confirm XP/streak updated →
   confirm leaderboard position updated → book a mentor session and pay → generate a
   certificate → verify the certificate via the public verification endpoint. This should
   fail if any module breaks its contract with another.
5. **CI pipeline** (GitHub Actions): install → lint → unit tests with coverage → bring up
   Testcontainers → run all e2e suites → publish coverage report → fail the build if
   coverage drops below threshold or any e2e suite fails.
6. **Never call the real Anthropic, Judge0, or Razorpay APIs in CI.** Gate any genuinely-live
   smoke test behind an explicit env flag for manual/staging runs only.

## How to work through the build

1. Build modules **in the numbered order** given in the module index below — later modules
   depend on entities from earlier ones (e.g. gamification depends on the DSA platform
   existing). Two pairs are meant to be built together even though numbered apart:
   5.5 core DSA spec ships together with the 5.20 extended DSA spec, and 5.28 (lab module)
   is built immediately after 5.3 (college academics), which it depends on.
2. After finishing a module: run its unit tests, run its e2e suite, show the results, then
   move on. Do not batch multiple modules before testing.
3. If any requirement is ambiguous, ask rather than guessing silently.
4. Commit after each module passes its tests, using conventional commit messages, e.g.
   `feat(dsa): add submission endpoint + judge integration`.
5. Maintain a `PROGRESS.md` at the repo root (template in `assets/PROGRESS.md.template` —
   copy it in on the first module if the repo doesn't have one yet) and check off each
   module and cross-cutting deliverable as it's completed and tested. Log any ambiguity you
   had to ask the user about, and their answer, so later modules stay consistent with
   earlier decisions.

## Module build order

Full detail for every module — entities, standard CRUD, non-standard endpoints, and
per-module test focus — lives in `references/module-specs.md`. Read the section for the
module currently being built rather than loading the whole file speculatively.

| # | Module | Core focus |
|---|---|---|
| 5.1 | Auth & Identity | JWT + refresh, 2FA, OAuth, sessions/devices, RBAC role/permission admin |
| 5.2 | Student Platform | Dashboard, skill/career profile, readiness score, notifications, activity timeline |
| 5.3 | College Academic Module | Subjects, exams, assignments, attendance, GPA/CGPA, faculty gradebook |
| 5.4 | Placement Preparation | Personalized roadmap, company prep tracks, AI study planner |
| 5.5 | DSA Platform (core) | Build together with 5.20 — see below |
| 5.6 | AI Interview Engine | Multi-turn AI interview sessions, feedback, reports |
| 5.7 | AI Career Coach | Roadmap, recommendations, salary prediction, skill gap, chat |
| 5.8 | Resume Builder & ATS | Resume CRUD, ATS analysis/scoring, export, versioning |
| 5.9 | Coding Battles | Ranked/practice/private matches, live WebSocket state, ratings |
| 5.10 | Leaderboards | Read-only, Redis sorted-set backed, global/college/dept/company/weekly/monthly |
| 5.11 | Gamification | XP ledger (idempotent), levels, streaks, badges, missions, seasonal events |
| 5.12 | Certificates | Issue, public verification (no auth), QR, PDF, LinkedIn share |
| 5.13 | Job Marketplace | Job CRUD, search, apply, save, eligibility check, recruiter contact |
| 5.14 | Internship Portal | Internship CRUD, apply, certificate |
| 5.15 | Mentor Marketplace | Mentor profiles, availability, booking (no double-booking), pay, review |
| 5.16 | Company Preparation Paths | Per-company hiring pattern, questions, OA info, salary insight, timeline |
| 5.17 | Recruiter Portal | Dashboard, candidate/resume search, shortlist, interview scheduling, analytics |
| 5.18 | TPO Portal | Company drives, eligibility, placement reports, offers, department stats |
| 5.19 | Faculty Portal | Dashboard, reports, broadcast notifications (plus 5.3 faculty routes) |
| 5.20 | DSA Platform (extended) | Highest-risk module — build together with 5.5, see reference file |
| 5.21 | Notification & Communication | Templates, announcements, broadcast — fan-out via BullMQ, never sync |
| 5.22 | Analytics & Reporting | Per-role analytics, custom report builder (CSV/JSON export) |
| 5.23 | Search & Discovery | Unified search across problem/job/mentor/student/company, `pg_trgm`-based |
| 5.24 | Payments & Subscriptions | Plans, subscribe/cancel, coupons, invoices, verified Razorpay webhook |
| 5.25 | AI Services (shared) | Shared `AiService` used by 5.6/5.7/5.8/5.20/5.28 — tutor, doubt-solver, code review, etc. |
| 5.26 | Community | Forum posts/comments, likes, study groups, coding clubs |
| 5.27 | System Administration | Feature flags, maintenance mode, backups, audit logs, health, API usage |
| 5.28 | College Programming Lab Module | Build immediately after 5.3 — labs, practical exams, plagiarism, CO/PO/OBE |

## Deliverables checklist

- [ ] All 28 modules implemented per spec, no stubbed endpoints
- [ ] Complete Prisma schema with correct relations, indexes on all filter/sort columns, migrations committed
- [ ] Swagger docs live at `/api/docs`, every endpoint documented with request/response schemas and auth requirements
- [ ] Global exception filter, validation pipe, and logging interceptor wired at the app level
- [ ] Seed script populating realistic data across every module (enough to exercise pagination, filters, and the golden-path smoke test)
- [ ] `docker-compose.yml` running Postgres, Redis, Judge0, and the API together with one command
- [ ] Unit coverage ≥85% per module; full e2e suite green; golden-path smoke test green
- [ ] GitHub Actions CI running lint → unit → e2e → coverage gate on every PR
- [ ] `README.md` with setup instructions, architecture overview, and a link to the API docs
