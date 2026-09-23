# ScienceLab

Interactive practical STEM learning: students perform physical experiments guided by structured digital workflows — steps, observations, contextual AI help, assessments, results — while teachers manage classes, assign work, and monitor progress.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Drizzle ORM + PostgreSQL 17 · scrypt/JWT sessions · Vitest + Playwright · OpenRouter AI (Inkling Small) · Nodemailer SMTP.

Product and engineering source of truth lives in [`docs/`](file:///C:/Users/Samuel%20Kyeremeh/Desktop/sciencelab/docs) — start with `docs/PRODUCT.md`, then `REQUIREMENTS.md`, `ARCHITECTURE.md`. Agent rules: `docs/AGENTS.md`.

## Local setup

```bash
pnpm install
docker compose up -d            # postgres:17 + Mailpit (email trap at localhost:8025)
cp .env.example .env            # then fill secrets (see below)
pnpm drizzle-kit migrate
pnpm db:seed                    # first experiment: Simple Electrical Circuit
pnpm dev                        # http://localhost:3000
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` / `build` / `start` | run / build / serve production |
| `pnpm lint` / `pnpm typecheck` | static checks |
| `pnpm test` | Vitest unit + service suite (real PostgreSQL) |
| `pnpm test:e2e` | Playwright journeys on isolated `sciencelab_e2e` (see `docs/TESTING.md` §6) |
| `pnpm drizzle-kit generate/migrate` | migrations in `drizzle/` (never edit applied ones) |
| `pnpm db:seed` | idempotent demo content |

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection |
| `SESSION_SECRET` | yes (prod) | 32+ char JWT secret; server refuses weak secrets |
| `OPENROUTER_API_KEY` | for live AI | Without it the helper runs its offline fallback |
| `AI_MODEL` | no | Defaults to `thinkingmachines/inkling-small` |
| `EMAIL_PROVIDER` | no | `smtp` (default) or `console` |
| `SMTP_HOST` / `SMTP_PORT` | no | Default `localhost:1025` (Mailpit) |
| `SMTP_USER` / `SMTP_PASSWORD` | prod mail | Brevo relay login + SMTP key (enables TLS auth) |
| `EMAIL_FROM` | prod mail | e.g. `ScienceLab <noreply@yourdomain.com>` |

## Deploying (Vercel + hosted Postgres)

1. Provision Postgres (Neon/Supabase/Supermaven-free-tier equivalent) and set `DATABASE_URL` in the Vercel project.
2. Set `SESSION_SECRET` (generate 32+ random chars), `OPENROUTER_API_KEY`, and the `SMTP_*`/`EMAIL_FROM` Brevo variables.
3. Run migrations **before** deploying (from your machine with the prod URL exported):
   `DATABASE_URL="<prod-url>" pnpm drizzle-kit migrate`, then seed once if the DB is empty.
4. Deploy. No Docker, no build-time secrets, no auto-migrate on boot.

## Manual QA

Human end-to-end scripts live in [`docs/MANUAL_E2E.md`](file:///C:/Users/Samuel%20Kyeremeh/Desktop/sciencelab/docs/MANUAL_E2E.md) — run them before any pilot or release.
