# XKILL Backend — Build Progress

A module is only checked off once its unit tests AND its e2e suite are green and both have
been shown to the user. Update this file immediately after each module passes, before moving
to the next one.

## Modules

- [x] 5.1 Auth & Identity
- [x] 5.2 Student Platform
- [x] 5.3 College Academic Module
- [x] 5.4 Placement Preparation
- [x] 5.5 / 5.20 DSA Platform — 5.5a core solve loop (browse/filter problems, run/submit, Judge0 verdicts via BullMQ queue + Socket.io `submission.verdict` event, editorial, progressive hints, submission history) + 5.5b (playlists, sheets, progress, analytics, visibility, discussion) + 5.5c (contests, Elo ratings, live leaderboards, anti-cheat ingestion) — complete
- [x] 5.5b DSA Platform — playlists (private/shared, 404-no-existence-leak), curated sheets (Blind 75, Grind 169, NeetCode 150, Google, Amazon) seeded from a real problem catalog, live progress/analytics computed from Submission rows (accuracy, heatmap, weak/strong topics, runtime, rating-trend placeholder), recruiter visibility settings behind the pure `filterVisibleFields` predicate, per-problem discussion with idempotent upvotes
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
| 5.5a DSA Platform core (incl. JudgeService, BullMQ worker, Socket.io gateway) | 49 | 18 | — (dsa 95 / 72.09 / 88.7 / 94.55; judge 91.89 / 71.05 / 100 / 90.9) |
| 5.5b DSA Platform organize & track (playlists, sheets, progress, analytics, visibility, discussion) | 74 | 18 | — (calculators 98.46 / 90.54 / 90.9 / 98.9; track service + controller + repository fully unit-covered) |
| **Full suite (cumulative)** | **664** | **170** | **95.23 / 83.18 / 91.73 / 95.09** |

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
| 2026-08-02 | 5.5a 5.28a was specified as "extend JudgeService" — but no JudgeService/BullMQ/Socket.io gateway existed in the repo and Judge0 wasn't in docker-compose. | 5.28a never actually landed. Built the shared judge layer from scratch inside 5.5a: `JudgeService` (single-run + batch multi-case grading with aggregated verdict & first-failing-case detail), BullMQ `dsa-submissions` queue + `WorkerHost` processor, and a Redis-adapter Socket.io gateway (`user:{id}` rooms) that 5.9/5.10/5.28 reuse. |
| 2026-08-02 | 5.5a Judge0 verdict mapping — self-hosted CE has no dedicated MLE status. | Mapped 3→accepted, 4→wrong_answer, 5→time_limit_exceeded, 6→compilation_error, 7–14→runtime_error, 15→memory_limit_exceeded. Non-Judge0 grading errors surface as submission status `failed` with `errorMessage` + a failed WS event. |
| 2026-08-02 | 5.5a Progressive hint unlock semantics | Hint 1 is always unlocked; a user may only unlock hint N after hint N−1 is already unlocked (`HINT_LOCKED` 404 otherwise). `getHints` returns `content: null` + `isUnlocked: false` for not-yet-unlocked hints. |
| 2026-08-02 | 5.5a Solved-state under concurrent submissions | `SolvedProblem` unique `[userId, problemId]` upserted only on Accepted — concurrent double-submission is winner-take-all and never double-counts (e2e asserts exactly 1 row). |
| 2026-08-02 | 5.5a Socket.io adapter client lifecycle | ioredis v5 auto-connects, so `connectToRedis` must await `ready` (not call `.connect()`), and `RedisIoAdapter.close()` must quit pub/sub after `super.close()` — otherwise the leaked clients hang the Jest e2e process ("did not exit"). |
| 2026-08-02 | 5.4 Roadmap lazy generation + persistence | `GET /placement/roadmap` generates a personalized 10-week × 7-task roadmap on first access (persisted), reused afterwards; week `tasks` are returned via the seed permission `update:placement-tasks` for completion. |
| 2026-08-02 | 5.5b Discussion upvote tracking — count field vs join rows | Both: a denormalized `upvoteCount` on `Discussion` plus a `DiscussionVote` join table (`@@unique([discussionId, userId])`) so upvotes are idempotent (one vote per user, never double-counted) and list queries still sort/filter by count cheaply. Upvote is POST-only (no downvote/un-vote yet). |
| 2026-08-02 | 5.5b Private playlists — 404 or 403 for another user's GET? | 404 (`PLAYLIST_NOT_FOUND`) — same code as a missing playlist, so a private list's existence is never leaked. Shared (`isPublic`) playlists are readable by any student. Update/delete/add/remove are owner-only and also 404 for non-owners. |
| 2026-08-02 | 5.5b `analytics/me` rating trend before contests ship | Explicit placeholder, not an empty array: `{ available: false, message: '…requires contest history which ships in module 5.5c' }`. No `CodingRating` table yet — contest/rating data lands with 5.5c. |
| 2026-08-02 | 5.5b Progress/analytics caching? | None by design. `progress/me`, `analytics/me`, per-sheet progress and per-problem completion are all computed live from `SolvedProblem`/`Submission` rows on every request via the pure calculators (`progress.calculator.ts`, `analytics.calculator.ts`). Sheet progress intersects the sheet's problems with the user's live `SolvedProblem` ids. |
| 2026-08-02 | 5.5b Curated sheets seed data | New `seedDsaCatalog` seeds a 12-problem real catalog (Two Sum, Valid Parentheses, …) with test cases and upserts 5 curated sheets (Blind 75, Grind 169, NeetCode 150, Google, Amazon) mapped by slug — no empty/fake sheets (e2e asserts a sheet with real problems yields live progress). `prisma/seed.ts` is idempotent. |
| 2026-08-02 | 5.5b Profile visibility `filterVisibleFields` reuse | Implemented as an isolated, unit-tested pure function (`profile-visibility.ts`) over a `DsaCandidateProfile` + `DsaVisibilitySettings`. 5.5b only persists/toggles settings (`GET/PATCH /dsa/profile/visibility`, `showEmail` defaults off); the Recruiter Portal (5.17) will call the same predicate when rendering candidate cards. |
| 2026-08-02 | 5.5c **Rating formula (Elo-style, rank-based)** | `E = (1/(N−1))·Σ_j 1/(1+10^((r_j−R)/400))` (expected fraction of opponents beaten), `S = (N−rank)/(N−1)` (actual fraction beaten; winner=1, last=0), `Δ = round(K·(S−E))` with **K=40** for a participant's first **10** rated contests (provisional, faster convergence) and **K=20** after. New rating clamped to **[100, 4000]**; initial rating **1200**. Tiers: Beginner 100–1199, Amateur 1200–1399, Intermediate 1400–1599, Advanced 1600–1799, Expert 1800–1999, Master 2000–2399, Grandmaster 2400–2799, Legendary 2800+. Reasoning: Elo's logistic expectation is the standard, defensible choice; using finishing rank (not raw points) for `S` makes the ordering what matters; provisional K lets new users converge to their true level quickly. Implemented as the pure `computeRatingUpdate` in `src/dsa/competition/rating-calculator.ts` with fixed input/output vectors. |
| 2026-08-02 | 5.5c **Contest time-boundary rule** | A submission tagged with `contestId` counts toward that contest's leaderboard/rating **only if its grading completes (verdict "lands") within [startTime, endTime]**. A submission that lands after `endTime` — even one that was in flight when the contest ended — is still graded and the user still gets their verdict, but it is excluded from the contest's ranking and rating. Decided in the worker after grading finishes, using the submission's `completedAt`. |
| 2026-08-02 | 5.5c **Leaderboard tie-break rule** | Order = **(total points DESC, last accepted submission time ASC)**. Both dimensions are packed into one Redis zset score as `points·10⁷ + (10⁷ − 1 − elapsedSecondsSinceContestStart)` — the tie-break component occupies `[0, 10⁷−1]`, so an untouched participant (0 points, 0 elapsed) encodes exactly `0·10⁷` and decodes back to 0/0 (the `−1` removes the off-by-one where a bare `10⁷` would decode to 1 point). `ZREVRANGE` ordering therefore exactly equals contest ordering with no secondary sort (elapsed seconds stay well below 10⁷ ≈ 115 days). The composite is produced by the pure `contestCompositeScore` and tested directly, not as an incidental effect of insertion order. |
| 2026-08-02 | 5.5c **`CodingAchievement` deferred to 5.11 (Gamification)** | Not built here. The original list's DSA achievements ("First Accepted", "100 Problems Solved", "Contest Winner") are the same underlying feature as Gamification's badges (5.11) — same overlap already resolved for `ReadinessScore`/`ReadinessPrediction` in 5.4. The raw data 5.11 needs is already cleanly queryable from this session's tables (`Submission`, `SolvedProblem.firstSolvedAt`, `CodingRating`, `CodingRatingHistory`, `ContestParticipant` placements); badge/trigger logic ships with 5.11. |
| 2026-08-02 | 5.5c **Anti-cheat generic schema** | Single `anti_cheat_events` table, not a DSA-contest-specific one: `sourceType` (`dsa-contest` | `coding-battle` | `practical-exam`) + `sourceId` + `eventType` (tab-switch, copy-paste, …) + `detail`. Coding Battles (5.9) and the deferred practical-exam work (5.28b) log the same shape against the same table. |
| 2026-08-02 | 5.5c **`RankingService` reusable design** | Standalone `src/dsa/ranking.service.ts` wrapping Redis sorted sets generically (`upsert`, `remove`, `top`, `rankOf`, `around`, `scoreOf`, `count`, `reset`) with caller-supplied keys — no contest knowledge inside. Contest leaderboards pass the encoded composite score above; 5.10 (global/college/dept/company/weekly/monthly leaderboards) reuses it as-is. |
| 2026-08-02 | 5.5c **Contest CRUD scoping** | Create/update/delete: `admin`, `college_admin`, `faculty` (faculty + college_admin get `create/update/delete:dsa-contests` permissions). Read contests + leaderboard: all four roles. Register: students only (`create:dsa-registrations`). Rating endpoints: students only. Contest submissions reuse the 5.5a pipeline via an optional `contestId` on `Submission` — no parallel judging path. |
| 2026-08-02 | 5.5c **Rating finalization timing** | Rating changes are applied **once** when a rated contest ends, triggered lazily on the first read after `endTime` (leaderboard GET or `rating/me`), guarded by an atomic `standingsFinalizedAt` claim (`updateMany … where finalizedAt is null`) so concurrent readers can never double-apply. A `CodingRatingHistory` row records every change (rank, before/after, contest). |
| 2026-08-02 | 5.5c `analytics/me` rating trend becomes real | The 5.5b placeholder is replaced now that contest history exists: `computeAnalytics` accepts optional `ratingHistory` and returns `{ available: true, points: [{contestName, rank, ratingBefore, ratingAfter, change, date}] }`; with no rated contests it returns `{ available: false, message: 'No rated contest history yet' }`. 5.5b's e2e assertion updated to match. |
| 2026-08-02 | 5.5c **Module complete** | Full unit suite 65 suites / 721 tests green (coverage 92.61% stmts / 81.05% branch / 87.09% funcs / 92.37% lines ≥ 85/80/85/85 gates); full e2e 10 suites / 188 tests green; lint + `tsc --noEmit` + `nest build` clean. 5.5c adds: contest CRUD, registration, contest-tagged submissions with post-end grading (verdict kept, standings excluded), composite-score live leaderboard with tie-break, one-shot Elo finalization, rating history + real `analytics/me` trend, generic anti-cheat events, reusable `RankingService`. Migration `20260802040638_add_dsa_compete` applied. |
