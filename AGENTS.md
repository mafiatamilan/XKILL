# XKILL Frontend — Build Guide

> **Stack**: Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · shadcn/ui · TanStack Query · Zustand · Zod · React Hook Form

## Overview

This is the frontend for the XKILL platform — a combined placement-prep / college-ERP / competitive-programming / job-marketplace. The backend is a NestJS API at `http://localhost:3000/api/v1` with ~280 endpoints across 28 modules.

**Every frontend module maps 1:1 to a backend module.** The backend Swagger docs at `/api/docs` are the source of truth for every endpoint, request shape, and response shape.

## Project Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router routes
│   │   ├── auth/                 # Login, register, forgot-password, OAuth callback
│   │   ├── (dashboard)/          # Route group — all authenticated app pages
│   │   │   ├── student/          # Student-facing pages
│   │   │   ├── academics/        # College academics (subjects, exams, marks)
│   │   │   ├── dsa/              # DSA platform (problems, contests, battles)
│   │   │   ├── placement/        # Placement prep (roadmap, companies)
│   │   │   ├── interviews/       # AI interview sessions
│   │   │   ├── career/           # Career coach (roadmap, salary, skill gap)
│   │   │   ├── resumes/          # Resume builder & ATS
│   │   │   ├── gamification/     # XP, badges, streaks, missions
│   │   │   ├── certificates/     # Certificate issue/verify
│   │   │   ├── community/        # Forum, study groups, coding clubs
│   │   │   ├── jobs/             # Job marketplace
│   │   │   ├── internships/      # Internship portal
│   │   │   ├── mentors/          # Mentor marketplace
│   │   │   ├── company-prep/     # Company preparation paths
│   │   │   ├── faculty/          # Faculty portal
│   │   │   ├── recruiter/        # Recruiter portal
│   │   │   ├── tpo/              # TPO portal
│   │   │   ├── college-admin/    # College admin portal
│   │   │   ├── admin/            # Platform admin
│   │   │   ├── billing/          # Payments & subscriptions
│   │   │   ├── lab/              # College programming lab
│   │   │   ├── ai/               # AI services (tutor, code review)
│   │   │   └── leaderboards/     # Leaderboards
│   │   └── settings/             # User settings (profile, security, 2FA)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (Button, Card, Dialog…)
│   │   ├── layout/               # Sidebar, Header, Footer, Breadcrumb
│   │   ├── forms/                # Reusable form components per domain
│   │   ├── shared/               # DataTable, Pagination, SearchFilters, etc.
│   │   └── features/             # Domain-specific feature components
│   ├── lib/
│   │   ├── api.ts                # Axios instance, interceptors, token refresh
│   │   ├── auth.ts               # Auth helpers
│   │   ├── utils.ts              # cn(), formatDate, etc.
│   │   ├── hooks/queries/        # TanStack Query hooks (useQuery wrappers)
│   │   ├── hooks/mutations/      # TanStack Query mutation hooks
│   │   ├── types.ts              # All TypeScript interfaces
│   │   └── validators/           # Zod schemas for form validation
│   ├── stores/
│   │   ├── auth.ts               # Zustand auth state
│   │   └── ui.ts                 # Zustand UI state (sidebar, theme)
│   └── styles/
│       └── globals.css           # Tailwind base + CSS variables
├── public/                       # Static assets
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Core Conventions

### API Client

All API calls go through `src/lib/api.ts` — an Axios instance with:
- Base URL: `/api/v1`
- Automatic `Authorization: Bearer <token>` header
- 401 interceptor → refresh token → retry → redirect to login on failure
- `setAccessToken()` / `getAccessToken()` for token management

```typescript
import { api, type ApiListResponse } from "@/lib/api";

// GET with params
const { data } = await api.get<ApiListResponse<Job>>("/jobs/search", {
  params: { page: 1, limit: 20, search: "react" },
});

// POST
const { data } = await api.post("/auth/login", { email, password });
```

### Data Fetching — TanStack Query

Every data-fetching operation uses TanStack Query. Create query/mutation hooks in `src/lib/hooks/queries/` and `src/lib/hooks/mutations/`.

```typescript
// src/lib/hooks/queries/use-problems.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Problem, ApiListResponse } from "@/lib/types";

export function useProblems(params: { page?: number; difficulty?: string }) {
  return useQuery({
    queryKey: ["problems", params],
    queryFn: () =>
      api.get<ApiListResponse<Problem>>("/dsa/problems", { params }).then((r) => r.data),
  });
}
```

### Forms — React Hook Form + Zod

Every form uses `react-hook-form` with Zod schemas for validation. Create Zod schemas in `src/lib/validators/`.

```typescript
// src/lib/validators/auth.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

```typescript
// Component
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";

export function LoginForm() {
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });
  // ...
}
```

### Styling — Tailwind + shadcn/ui

- Use `cn()` from `@/lib/utils` for conditional classes
- All UI primitives are in `src/components/ui/` (Button, Card, Dialog, etc.)
- Never use inline styles
- Dark mode via `next-themes` — all colors use CSS variables

### Role-Based Rendering

The user's role determines which sidebar items and pages are visible:

```typescript
const ROLE_ROUTES: Record<Role, NavItem[]> = {
  student: [/* dashboard, academics, dsa, placement, ... */],
  faculty: [/* dashboard, subjects, attendance, ... */],
  recruiter: [/* dashboard, candidates, shortlist, ... */],
  tpo: [/* dashboard, company-drives, ... */],
  college_admin: [/* dashboard, departments, ... */],
  admin: [/* dashboard, users, roles, ... */],
  mentor: [/* dashboard, availability, bookings */],
  parent: [/* dashboard, child-progress */],
};
```

### Error Handling

Every API call should handle errors gracefully:
- Use `getApiErrorMessage(err)` from `@/lib/api` for user-friendly messages
- Show errors via `sonner` toast notifications
- Never expose raw API errors to the UI

### Loading States

- Use skeleton loaders (`Skeleton` from shadcn/ui) for page loads
- Use `isLoading` from TanStack Query for inline loading states
- Show empty states when data arrays are empty

## Module Build Order

Build modules in this order — later modules depend on earlier ones:

### Phase 1: Foundation (must be first)
1. **Layout & Navigation** — Sidebar, Header, Breadcrumb, theme switching
2. **Auth** — Login, register, forgot-password, OAuth callback, token refresh
3. **Dashboard (student)** — Aggregated dashboard with cards

### Phase 2: Core Student Experience
4. **Student Profile** — Profile CRUD, skills, career goals, settings
5. **Academics** — Subjects, exams, assignments, attendance, marks, GPA
6. **DSA Platform** — Problems list, detail, code editor, submissions, playlists, sheets, progress
7. **Placement Prep** — Roadmap, company tracks, daily challenge, study planner

### Phase 3: AI & Career
8. **AI Interview Engine** — Session creation, turn-by-turn, reports
9. **Career Coach** — Roadmap, recommendations, salary prediction, skill gap, chat
10. **Resume Builder** — Templates, editor, ATS analysis, export, versioning

### Phase 4: Competition & Gamification
11. **Contests** — Contest list, detail, registration, leaderboard
12. **Coding Battles** — Queue, matchmaking, live battle, history
13. **Leaderboards** — Global, college, department, weekly, monthly
14. **Gamification** — Summary, badges, streaks, missions, daily rewards

### Phase 5: Marketplace
15. **Job Marketplace** — Search, detail, apply, save, eligibility
16. **Internship Portal** — Search, detail, apply
17. **Mentor Marketplace** — Search, profile, availability, booking, payment
18. **Company Prep Paths** — Company profiles, hiring patterns, questions, salary insights

### Phase 6: Community & Certificates
19. **Community** — Forum posts/comments, study groups, coding clubs
20. **Certificates** — Issue, verify, PDF, LinkedIn share

### Phase 7: Role-Specific Portals
21. **Faculty Portal** — Dashboard, subject management, attendance, marks, analytics
22. **Recruiter Portal** — Dashboard, candidate search, shortlist, interviews
23. **TPO Portal** — Company drives, eligibility, offers, placement reports
24. **College Admin** — Departments, semesters, courses, faculty/student management
25. **Platform Admin** — Users, roles, feature flags, system settings, audit logs

### Phase 8: Billing & Lab
26. **Billing** — Plans, subscription, invoices, coupons
27. **College Programming Lab** — Subjects, experiments, submissions, exams, OBE
28. **AI Services** — Tutor, doubt solver, code review, study planner

## Backend API Reference

### Auth (`/api/v1/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register |
| POST | `/auth/login` | Public | Login → `{ accessToken, user }` |
| POST | `/auth/refresh-token` | Public (cookie) | Rotate refresh token |
| POST | `/auth/logout` | Public | Revoke session |
| POST | `/auth/forgot-password` | Public | Send reset email |
| POST | `/auth/reset-password` | Public | Set new password |
| POST | `/auth/2fa/setup` | Bearer | Generate TOTP + QR |
| POST | `/auth/2fa/verify` | Bearer | Confirm TOTP |
| GET | `/auth/oauth/:provider` | Public | Redirect to OAuth |

### Students (`/api/v1/students`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/students/me/dashboard` | Dashboard data |
| GET | `/students/me/profile` | Profile |
| PATCH | `/students/me/profile` | Update profile |
| GET/POST/PATCH/DELETE | `/students/me/skills` | Skills CRUD |
| GET/POST/PATCH/DELETE | `/students/me/career-goals` | Career goals CRUD |
| GET | `/students/me/notifications` | Notifications |
| POST | `/students/me/readiness-score/recalculate` | Recalculate readiness |

### Academics (`/api/v1/academics`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/academics/subjects` | List subjects |
| GET | `/academics/subjects/:id/materials` | Materials |
| GET | `/academics/exams/me` | My exams |
| GET | `/academics/assignments/me` | My assignments |
| POST | `/academics/assignments/:id/submit` | Submit assignment |
| GET | `/academics/attendance/me` | My attendance |
| GET | `/academics/marks/me` | My marks |
| GET | `/academics/gpa/me` | My GPA |
| GET | `/academics/cgpa/me` | My CGPA |

### DSA (`/api/v1/dsa`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dsa/problems` | List problems (filterable) |
| GET | `/dsa/problems/:id` | Problem detail |
| POST | `/dsa/problems/:id/run` | Run code (ephemeral) |
| POST | `/dsa/problems/:id/submit` | Submit solution |
| GET | `/dsa/submissions/me` | My submissions |
| GET | `/dsa/playlists` | My playlists |
| POST | `/dsa/playlists` | Create playlist |
| GET | `/dsa/sheets` | Curated sheets |
| GET | `/dsa/progress/me` | My progress |
| GET | `/dsa/analytics/me` | My analytics |
| POST | `/dsa/contests` | Create contest (faculty) |
| GET | `/dsa/contests` | List contests |
| POST | `/dsa/contests/:id/register` | Register |
| GET | `/dsa/contests/:id/leaderboard` | Leaderboard |
| GET | `/dsa/rating/me` | My rating |

### Battles (`/api/v1/battles`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/battles/ranked/join-queue` | Join ranked queue |
| DELETE | `/battles/ranked/leave-queue` | Leave queue |
| POST | `/battles/practice` | Practice battle |
| POST | `/battles/private` | Private battle |
| POST | `/battles/private/join` | Join via invite code |
| POST | `/battles/:id/submit` | Submit code |
| GET | `/battles/history` | Match history |

### Placement (`/api/v1/placement`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/placement/roadmap` | Personalized roadmap |
| GET | `/placement/roadmap/:week/tasks` | Week tasks |
| PATCH | `/placement/tasks/:id/complete` | Complete task |
| GET | `/placement/companies/:company/prep` | Company prep |
| GET | `/placement/progress` | Progress |
| GET | `/placement/readiness-prediction` | Readiness prediction |
| GET | `/placement/daily-challenge` | Daily challenge |

### Interviews (`/api/v1/interviews`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/interviews/sessions` | Create session |
| GET | `/interviews/sessions` | List sessions |
| GET | `/interviews/sessions/:id` | Session + transcript |
| POST | `/interviews/sessions/:id/turns` | Submit answer |
| POST | `/interviews/sessions/:id/end` | End session |
| GET | `/interviews/sessions/:id/report` | Get report |

### Career Coach (`/api/v1/career-coach`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/career-coach/roadmap` | Career roadmap |
| GET | `/career-coach/recommendations` | Learning recs |
| GET | `/career-coach/salary-prediction` | Salary prediction |
| GET | `/career-coach/skill-gap` | Skill gap |
| POST | `/career-coach/chat` | Chat message |
| GET | `/career-coach/chat` | Chat history |

### Resumes (`/api/v1/resumes`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/resumes/templates` | List templates |
| POST | `/resumes` | Create resume |
| GET | `/resumes` | List my resumes |
| GET | `/resumes/:id` | Get resume |
| PATCH | `/resumes/:id` | Update resume |
| POST | `/resumes/:id/ats-analysis` | Run ATS analysis |
| GET | `/resumes/:id/score` | Get ATS score |
| GET | `/resumes/:id/export?format=pdf|docx` | Export |
| GET | `/resumes/:id/versions` | Version history |
| POST | `/resumes/:id/versions/:vid/restore` | Restore version |

### Gamification (`/api/v1/gamification`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/gamification/me/summary` | XP, level, streak, badges |
| POST | `/gamification/daily-reward/claim` | Claim daily reward |
| GET | `/gamification/badges` | All badges |
| GET | `/gamification/achievements` | My achievements |
| GET | `/gamification/missions` | Active missions |

### Leaderboards (`/api/v1/leaderboards`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/leaderboards/global` | Global |
| GET | `/leaderboards/college/:id` | College |
| GET | `/leaderboards/department/:id` | Department |
| GET | `/leaderboards/weekly` | Weekly top |
| GET | `/leaderboards/monthly` | Monthly top |

### Jobs (`/api/v1/jobs`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/jobs` | Create (recruiter) |
| GET | `/jobs/search` | Search (public) |
| GET | `/jobs/:id` | Detail (public) |
| POST | `/jobs/:id/apply` | Apply (student) |
| POST | `/jobs/:id/save` | Save (student) |
| GET | `/jobs/me/applications` | My applications |

### Internships (`/api/v1/internships`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/internships` | Create (recruiter) |
| GET | `/internships/search` | Search (public) |
| POST | `/internships/:id/apply` | Apply (student) |

### Mentors (`/api/v1/mentors`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/mentors/profile` | Create profile |
| GET | `/mentors/search` | Search (public) |
| GET | `/mentors/:id` | Profile |
| GET | `/mentors/:id/availability` | Availability |
| POST | `/mentors/:id/book` | Book session |
| GET | `/bookings/me` | My bookings |
| POST | `/bookings/:id/pay` | Pay |
| POST | `/bookings/:id/review` | Review |

### Company Prep (`/api/v1/company-prep`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/company-prep` | List companies |
| GET | `/company-prep/search` | Search |
| GET | `/company-prep/:slug` | Full prep path |
| GET | `/company-prep/:slug/hiring-patterns` | Patterns |
| GET | `/company-prep/:slug/questions` | Questions |
| GET | `/company-prep/:slug/assessments` | OA info |
| GET | `/company-prep/:slug/salary-insights` | Salary data |

### Community (`/api/v1/community`)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/community/forum/posts` | Forum |
| POST | `/community/posts/:id/like` | Like |
| GET/POST | `/community/study-groups` | Study groups |
| POST | `/community/study-groups/:id/join` | Join |
| GET/POST | `/community/coding-clubs` | Clubs |

### Certificates (`/api/v1/certificates`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/certificates` | Issue |
| GET | `/certificates/me` | My certs |
| GET | `/certificates/verify/:code` | Verify (public) |
| GET | `/certificates/:id/pdf` | Download PDF |
| POST | `/certificates/:id/share/linkedin` | LinkedIn URL |

### Billing (`/api/v1/billing`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/billing/plans` | List plans |
| POST | `/billing/subscribe` | Subscribe |
| POST | `/billing/cancel` | Cancel |
| GET | `/billing/subscription/me` | My subscription |
| GET | `/billing/invoices` | Invoices |
| POST | `/billing/coupons/apply` | Apply coupon |

### Faculty (`/api/v1/faculty`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/faculty/dashboard` | Dashboard |
| GET/POST/PATCH/DELETE | `/faculty/subjects` | Subject CRUD |
| POST | `/faculty/attendance` | Mark attendance |
| POST | `/faculty/exams/:id/marks` | Bulk enter marks |
| GET | `/faculty/students/:id/analytics` | Student analytics |

### Recruiter (`/api/v1/recruiter`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/recruiter/profile` | Create profile |
| GET | `/recruiter/dashboard` | Dashboard |
| GET | `/recruiter/candidates/search` | Search candidates |
| POST | `/recruiter/shortlist/:id` | Shortlist |
| POST | `/recruiter/interviews` | Schedule interview |
| GET | `/recruiter/analytics` | Analytics |

### TPO (`/api/v1/tpo`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/tpo/dashboard` | Dashboard |
| POST | `/tpo/company-drives` | Create drive |
| POST | `/tpo/company-drives/:id/offers` | Create offer |
| POST | `/tpo/placement-reports` | Create report |
| GET | `/tpo/department-stats` | Dept stats |

### College Admin (`/api/v1/admin`)
| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/admin/departments` | Departments |
| CRUD | `/admin/courses` | Courses |
| CRUD | `/admin/faculty` | Faculty accounts |
| CRUD | `/admin/students` | Student accounts |
| POST | `/admin/announcements` | Announcements |

### Platform Admin (`/api/v1/admin`)
| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/admin/users/:id/suspend` | Suspend user |
| PATCH | `/admin/users/:id/reactivate` | Reactivate |
| CRUD | `/admin/roles` | Roles |
| CRUD | `/admin/feature-flags` | Feature flags |
| POST | `/admin/maintenance-mode/toggle` | Maintenance |
| GET | `/admin/audit-logs` | Audit logs |
| GET | `/admin/health` | Health check |

### Lab (`/api/v1/lab`)
| Method | Path | Description |
|--------|------|-------------|
| CRUD | `/lab/subjects` | Subjects |
| CRUD | `/lab/subjects/:id/experiments` | Experiments |
| POST | `/lab/experiments/:id/submit` | Submit code |
| POST | `/lab/submissions/:id/evaluate` | Evaluate |
| CRUD | `/lab/subjects/:id/assignments` | Assignments |
| CRUD | `/lab/subjects/:id/exams` | Practical exams |
| POST | `/lab/exams/:id/start-session` | Start exam |
| CRUD | `/lab/subjects/:id/vivas` | Viva records |
| CRUD | `/lab/subjects/:id/projects` | Mini projects |
| CRUD | `/lab/subjects/:id/attendance` | Attendance |
| CRUD | `/lab/subjects/:id/obe/*` | OBE (CO/PO/mapping) |

### AI Services (`/api/v1/ai`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/tutor/ask` | Ask AI tutor |
| POST | `/ai/doubt-solver` | Solve doubt |
| POST | `/ai/code-review` | Code review |
| POST | `/ai/resume-analyzer` | Resume analysis |
| POST | `/ai/question-generator` | Generate questions |
| POST | `/ai/study-planner` | Study plan |

### Search (`/api/v1/search`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/search?q=&type=&limit=` | Unified search |

### Notifications (`/api/v1/notifications`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications/me` | My notifications |
| PATCH | `/notifications/:id/read` | Mark read |
| PATCH | `/notifications/read-all` | Mark all read |

### Analytics (`/api/v1/analytics`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics/student/:id` | Student analytics |
| GET | `/analytics/faculty/:id` | Faculty analytics |
| GET | `/analytics/placement` | Placement analytics |
| GET | `/analytics/revenue` | Revenue (admin) |
| POST | `/analytics/custom-report` | Custom report |

## Roles & Permissions

| Role | Access |
|------|--------|
| `student` | Dashboard, academics, DSA, placement, interviews, career, resumes, gamification, certificates, community, jobs, internships, mentors, billing, lab, AI services |
| `faculty` | Faculty portal (subjects, attendance, marks, exams, question bank, analytics, reports, broadcast) |
| `college_admin` | College admin (departments, semesters, courses, faculty/student management, announcements) |
| `recruiter` | Recruiter portal (candidates, shortlist, interviews, job/internship CRUD, analytics) |
| `tpo` | TPO portal (company drives, eligibility, offers, placement reports, department stats) |
| `admin` | Platform admin (all of the above + users, roles, feature flags, system settings, audit logs, health) |
| `mentor` | Mentor profile, availability, bookings |
| `parent` | Read-only child progress view |

## WebSocket Events

The backend uses Socket.io. Connect via:
```typescript
import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
  auth: { token: accessToken },
});
```

Key events:
- `battle.start` — Battle started (problem, opponents, duration)
- `battle.progress` — Opponent submitted (verdict, solved)
- `battle.end` — Battle finished (winner, participants)

## Testing

- **Unit tests**: Vitest + React Testing Library
- **E2E tests**: Playwright
- **Lint**: ESLint + Prettier
- Run `npm run lint` and `npm run typecheck` before committing

## Key Files to Create First

1. `src/app/layout.tsx` — Root layout with providers
2. `src/app/(dashboard)/layout.tsx` — Dashboard layout with sidebar
3. `src/components/layout/sidebar/` — Role-based sidebar
4. `src/components/layout/header/` — Top header with user menu
5. `src/lib/api.ts` — Already created ✓
6. `src/lib/types.ts` — Already created ✓
7. `src/stores/auth.ts` — Already created ✓
