# magic-create

A 2026 state-of-the-art AI-SaaS boilerplate built to spin up new web apps in minutes.

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript 5.7**
- **Clerk** — auth, orgs, RBAC, MFA, social logins
- **Postgres (Neon) + Drizzle + pgvector** — typed SQL, RAG-ready
- **Vercel AI SDK + Anthropic Claude** — streaming, tool-use, prompt caching
- **shadcn/ui + Tailwind** — component system you own
- **Stripe** — subscriptions, billing portal, webhooks
- **Resend + React Email** — JSX email templates
- **Upstash Redis + QStash** — rate limiting + background jobs
- **Sentry + PostHog** — errors, analytics, flags, session replay
- **Vitest + Playwright + MSW** — unit + E2E tests
- **GitHub Actions + Docker** — CI + containerization
- `pnpm new-project` — one-command scaffold for fresh apps

## Quickstart

```bash
pnpm install
cp .env.example .env.local     # fill in secrets
pnpm db:generate && pnpm db:migrate
pnpm dev
```

Open http://localhost:3000.

## Provisioning

You'll need accounts at:

| Service | Purpose | Required |
|---------|---------|----------|
| [Clerk](https://clerk.com) | Auth | Yes |
| [Neon](https://neon.tech) | Postgres | Yes |
| [Anthropic](https://console.anthropic.com) | Claude API | Yes |
| [Stripe](https://dashboard.stripe.com) | Payments | If billing |
| [Resend](https://resend.com) | Email | If sending email |
| [Upstash](https://upstash.com) | Redis + QStash | For rate limit / jobs |
| [Sentry](https://sentry.io) | Errors | Recommended |
| [PostHog](https://posthog.com) | Analytics + flags | Recommended |

After creating accounts, paste keys into `.env.local`. See [docs/setup/01-environment.md](docs/setup/01-environment.md) for the full checklist.

## Spin up a new project

```bash
pnpm new-project
```

Walks you through name, secrets, optional Stripe/Resend/etc., and produces a fresh repo in a sibling directory.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full folder spec and module boundaries. See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for phased setup docs (`docs/setup/*.md`).

## Scripts

```
pnpm dev              # Next dev server (Turbopack)
pnpm build            # Production build
pnpm start            # Run production build
pnpm type-check       # TypeScript strict check
pnpm lint             # ESLint
pnpm test             # Vitest unit tests
pnpm test:coverage    # with coverage
pnpm test:e2e         # Playwright E2E
pnpm db:generate      # Drizzle migration from schema diff
pnpm db:migrate       # Apply migrations
pnpm db:studio        # Drizzle Studio (DB explorer)
pnpm db:seed          # Seed dev data
pnpm email:dev        # React Email preview server
pnpm new-project      # Spin up a new project from this boilerplate
```

## License

MIT
