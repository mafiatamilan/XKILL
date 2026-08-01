# XKILL Backend

Backend REST API for XKILL — a combined placement-prep / college-ERP /
competitive-programming / job-marketplace platform. Built with NestJS, Prisma,
PostgreSQL, and Redis, with full RBAC via `casl`, JWT auth, TOTP 2FA, OAuth,
audit logging, and structured JSON logging.

**Status:** Module 5.1 (Auth & Identity) is implemented and fully tested. The
remaining modules are built in order as tracked in [PROGRESS.md](./PROGRESS.md).

## Tech stack

- **Language / runtime:** TypeScript (strict), Node.js, NestJS 11
- **ORM / DB:** Prisma + PostgreSQL
- **Cache / queues:** Redis (`ioredis`), BullMQ added in later modules
- **Auth:** JWT (access + refresh rotation) via Passport.js, TOTP 2FA (`otplib`), OAuth (Google / GitHub / LinkedIn), RBAC via `casl`
- **Validation / docs:** `class-validator` + `class-transformer`, Swagger at `/api/docs`
- **Testing:** Jest (unit) + Supertest (e2e) + Testcontainers (real Postgres + Redis)
- **Quality:** ESLint + Prettier + Husky pre-commit, GitHub Actions CI

## Prerequisites

- Node.js 20+
- Docker (for the e2e tests and `docker-compose up` local dev)

## Setup

```bash
npm install
cp .env.example .env   # then edit to taste
docker compose up -d   # starts Postgres + Redis (and the API) together
npm run prisma:generate
npm run prisma:deploy   # apply migrations
npm run prisma:seed     # roles/permissions + admin@xkill.app / demo@xkill.app
npm run start:dev
```

The API listens on `http://localhost:3000`:

- Health check: `GET /api/v1/health`
- Swagger docs: `GET /api/docs`
- All routes live under `/api/v1`

## Scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Run the dev server with watch mode |
| `npm run build` / `npm run start` | Build + run the compiled app |
| `npm test` | Unit tests with coverage (threshold: 85% stmts/funcs/lines, 80% branches) |
| `npm run test:e2e` | E2E suites against real Postgres + Redis via Testcontainers |
| `npm run lint` | ESLint (errors only) |
| `npm run format` | Prettier (auto-fix) |
| `npm run prisma:migrate` | Create/apply a migration in dev |
| `npm run prisma:seed` | Seed roles, permissions, and demo users |

## Architecture

```
src/
  app.module.ts        root wiring (global guards, filters, interceptors)
  app.setup.ts         /api/v1 prefix, CORS, validation pipe, Swagger
  main.ts              bootstrap with JSON logging
  config/              zod-validated env config -> AppConfigService
  prisma/              PrismaService + module
  redis/               ioredis client + module (global)
  auth/                register/login/refresh/logout, verify email, password
                       reset, TOTP 2FA, OAuth, JWT strategy, sessions/devices
  users/               /users/me/sessions endpoints
  admin/               user suspend/reactivate + role/permission management
  audit/               audit_logs writer (every mutating request)
  mailer/              MailService interface (console + SMTP transports)
  health/              @nestjs/terminus health indicators (DB, Redis, Judge0)
  common/              rbac (casl), guards, decorators, filters, interceptors,
                       structured logging (JSON + AsyncLocalStorage request id)
```

### Auth model

- JWT **access** tokens (short-lived, ~15m) carry `sub`, `email`, `role`, `sid`.
- **Refresh** tokens are opaque, stored hashed (sha-256) per session, and rotated
  on every refresh — reuse of a rotated token is detected and escalated.
- **2FA**: TOTP setup returns a QR code; once enabled, login requires a code.
- **OAuth**: authorize-url start endpoints plus callbacks that link-or-create a
  local account; users verified via OAuth email are marked email-verified.
- **RBAC**: roles are data-driven. `@Roles(...)` declares allowed roles and a
  `RolesGuard` checks the casl ability derived from the role's permission set in
  the database (`manage:all` is the super-user wildcard).

### Testing

- **Unit** tests mock Prisma and every external client; target ≥85% coverage per
  module (currently 95%+ overall).
- **E2E** tests boot the real `AppModule` against Testcontainers Postgres + Redis,
  seeding via a `TestDataFactory`. Every endpoint is asserted for its happy path
  plus 400/401/403/404/409 responses as applicable.

## API docs

Open `http://localhost:3000/api/docs` (Swagger UI) while the server is running.
Every endpoint documents its request/response schemas and auth requirements.
