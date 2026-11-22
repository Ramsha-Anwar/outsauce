# Outsauce Project Knowledge Base

> Repository-grounded reference for coding agents. Read this before proposing or making a code change. It describes the implementation snapshot documented below, not the intended future design. Paths are repository-relative. The repository itself remains authoritative: when this document conflicts with source code, migrations, or repository instructions, inspect those sources and update this reference. The revised Fix Plan owns requirements, the revised Execution Plan owns PR sequencing and boundaries, and the Progress Tracker owns implementation status and verification evidence.

## How to use this reference safely

1. Use this document to navigate the currently documented implementation. Identify the feature's route/page, API endpoint/controller, service, shared schema/type, and database migration listed below. Read those files before editing.
2. Before choosing work, consult `PROJECT_REFACTOR_FIX_PLAN.md` for requirements and fix IDs, `PROJECT_REFACTOR_EXECUTION_PLAN.md` for PR order/ownership, and `PROJECT_REFACTOR_PROGRESS.md` for the latest recorded status and evidence. Do not infer implementation status from this document alone.
3. Trace callers and consumers with repository search (`rg`) before changing a contract. The web client, Nest API, `packages/shared`, migrations, realtime subscriptions, and external callback may all depend on the same field or behavior.
4. Treat SQL migrations as append-only history. Add a new migration for schema changes; do not rewrite an already-applied migration. Apply database changes deliberately.
5. Treat `getAdminClient()` operations as service-role operations that bypass RLS. Each relevant service must filter by authenticated `userId` itself. The API guard authenticates but does not make an admin Supabase query row-scoped.
6. Do not trust README/SYNOPSIS/old comments as proof of current behavior. Known contradictions are listed under **Drift and implementation caveats**.
7. The Next.js installation has repository-specific breaking changes. Before editing frontend code, read the relevant guide under `apps/web/node_modules/next/dist/docs/` as required by `apps/web/AGENTS.md`.
8. The file inventory is a historical snapshot, not a live repository scan. Its introductory claim of 239 tracked files does not reconcile with the section counts shown in the inventory (which sum to 245), and the Progress Tracker records a later migration absent from this list. Do not rely on the stated total or treat the inventory as complete until `git ls-files` is checked against the current checkout. Binary/icon assets and lockfiles are identified by role rather than decoded or repeated. Dependency lockfiles are not application logic. Files ignored by Git (for example installed `node_modules`) are intentionally outside this inventory.

## Project purpose and shape

**Product direction:** Outsauce is being refocused as a profile-driven job discovery and matching product for job seekers across job families. The target workflow is career profile → permitted job-source synchronization → validated/deduplicated opportunities → evidence-based ranking → save/application tracking/feedback → Admin operations and evaluation. The source set must remain bounded and documented; no claim of exhaustive job coverage or unrestricted crawling is justified.

**Current implementation snapshot:** The checked-in application described in this document is still a legacy-feature-rich monorepo with a demo-only hunt path. The Progress Tracker records PR-01 and PR-01B as implemented and locally verified on 2026-10-27; it does not record the future ingestion, durable-worker, canonical-domain, Drizzle, or AI-evaluation milestones as implemented. Use the Progress Tracker for exact current status and verification evidence. Legacy lead-management, networking, messaging, AI-writing, and subscription modules remain in the repository during refactor.

The repository is a pnpm/Turborepo monorepo with three packages:

- `apps/web`: Next.js 16 / React 19 App Router application; pages and browser UI.
- `apps/api`: NestJS 11 REST API; authenticated feature logic and integrations.
- `packages/shared`: TypeScript types, Zod schemas, plan limits, and source metadata shared by the apps.
- `supabase`: PostgreSQL migrations, local Supabase configuration, seed placeholder, and a Deno contact-email Edge Function.

The main runtime ports are web `3000`, API `3001`; API routes use global `/api`. Supabase supplies PostgreSQL, Auth/JWT, RLS, and Realtime. Remaining legacy/optional integrations in code include Stripe, Groq-backed AI endpoints, the disabled n8n callback module, and Gmail SMTP. The active hunt path uses deterministic local demo fixtures; the Apify and Groq hunt generator were removed from that path. This does not mean all legacy integrations have been removed from the repository.

## System and request flow

```text
Browser
  ├─ Next.js pages/components
  │    ├─ browser Supabase client ── Auth, selected direct RLS reads/writes, realtime
  │    └─ apiClient ── Bearer Supabase access token ── NestJS /api/*
  └─ Next middleware refreshes Supabase SSR session / redirects protected paths

NestJS API
  ├─ SupabaseAuthGuard validates access token with Supabase Auth
  ├─ @CurrentUser exposes the validated Supabase user
  ├─ ZodValidationPipe validates selected DTO bodies
  ├─ feature controller → service → Supabase service-role client (explicit user filters)
  ├─ Stripe webhook (raw body) updates subscriptions
  ├─ current hunt path: filter fixed demo fixtures → persist results with source `demo`
  ├─ live sources: disabled; unsupported source requests are rejected
  └─ n8n callback: disabled with HTTP 503 until a source/workflow is reviewed

Supabase
  ├─ auth.users → trigger → profiles → trigger → subscriptions + usage
  ├─ PostgreSQL tables + RLS; API service-role calls bypass RLS
  └─ Realtime: scrape_jobs, messages, notifications publications
```

### Authentication and authorization

- Supabase Auth is the identity provider. Frontend browser/server clients use `@supabase/ssr` with the public anon key and cookies.
- `apps/web/middleware.ts` delegates to `src/lib/supabase/middleware.ts`: calls `auth.getUser()` to refresh/check session, clears stale auth cookies on refresh-related errors, redirects unauthenticated users on its explicit protected-path prefix list, and sends signed-in users away from login/signup to `/dashboard`.
- This middleware route list is not the whole authorization boundary. API feature controllers generally apply `SupabaseAuthGuard`; admin controller additionally applies `AdminGuard`. Admin UI `app/admin/layout.tsx` separately checks profile `is_admin` server-side.
- `apiClient` retrieves browser session and adds `Authorization: Bearer <access_token>`. It prefixes `NEXT_PUBLIC_API_URL` (default localhost:3001) with a path normally beginning `/api`.
- `SupabaseAuthGuard` validates the bearer token using `auth.getUser(token)` on an admin client and places user on request. `@CurrentUser()` extracts it.
- `AdminGuard` reads `profiles.is_admin` with admin credentials. Never rely on UI-only checks for API access.
- Supabase RLS is enabled broadly, but API services use a service-role client; their own `user_id`/ownership predicates are security-critical. The user client exists in `SupabaseService` but is not the default used by the current API feature services.

### Planned target architecture — not yet an implementation claim

The revised plans propose (they do not establish as already implemented):

- NestJS as the main business/data boundary, with browser Supabase usage limited to Auth/session handling and deliberately retained Realtime or RLS-scoped cases.
- An incremental Drizzle query layer in the NestJS API, while the existing `supabase/migrations/` SQL history remains authoritative initially. Do not create a competing migration history.
- A durable PostgreSQL-backed scheduler/worker before adding Redis/BullMQ, with explicit claims/leases, retries, idempotency, cancellation, and crash recovery.
- A bounded, permitted source adapter; normalized opportunities and source observations; provenance, freshness, deduplication, and user-specific saved/application state.
- A transparent rule-based ranking baseline and labeled evaluation dataset before optional semantic retrieval, AI reranking, or user-facing RAG.
- A retained Admin operations/data-quality/evaluation surface, with the single run lifecycle owned by PR-07.

These are target decisions/proposals from the revised Fix Plan and Execution Plan. They must not be described as current code behavior until implemented and verified. The hard project budget remains $0 out-of-pocket; a free-tier service is not automatically safe unless workload limits and overage controls are verified.

### Database lifecycle and relationships

Migration order is filename order in `supabase/migrations/`. Migrations establish:

| Table | Purpose / key relationships |
|---|---|
| `profiles` | One row per `auth.users`; professional data, role, discoverability, onboarding, admin/verification flags. Created by auth trigger. |
| `scrape_jobs` | User-owned hunt criteria, source array, status/timestamps/count/error. |
| `scrape_results` | Raw/normalized result rows linked to job and user; later gets fit score/reasoning. |
| `leads` | User's saved/copy of opportunity data; optionally links scrape result, folder, and hunt; status, notes, scoring, outreach fields. |
| `lead_folders` | User-owned folders, unique by user/name. |
| `tags` / `lead_tags` | User-owned tags and lead/tag many-to-many join. |
| `connections` | Directional requester/recipient relation with pending/accepted/rejected status. |
| `conversations` / `conversation_participants` / `messages` | Conversation containers, participant/read timestamps, message history. Messaging code currently creates 1:1 conversations. |
| `subscriptions` | One per profile/user, plan, Stripe ids, billing cycle and cancellation data. |
| `usage` | Per-user period counters: leads, scrapes, AI generations. |
| `ai_generations` | Persisted generation request/output history (enum tool types from initial schema). |
| `contact_submissions` | Public contact-form messages; later receives subject/read/reply columns. |
| `notifications` | Per-user notification records; message/network/system/scrape enum. |
| `plans` | Plan catalog and nullable quotas (NULL denotes unlimited). |
| `usage_events` | Event-style tracking for lead/hunt/AI events. |
| `user_profiles` | Separate resume text, target roles, skills profile used by Profile API. |
| `_outsauce_migrations` | Created by the custom migration runner, outside Supabase migration files, records filename/checksum. |

Auth signup inserts `profiles`; profile-insert trigger inserts Free `subscriptions` and a calendar-month `usage` row. Profile fields are also directly queried by browser pages. Usage is not represented by one perfectly unified path: see caveats below. There is no single ORM/schema file; SQL migrations define the database.

RLS policies are principally in `20260330000008_create_rls_policies.sql` and later per-table migrations. Profiles expose discoverable profiles to authenticated users; most user-specific records scope to `auth.uid()`. Contact submissions allow anonymous insert and authenticated select under the checked-in policy. Notifications allow own-row operations; inserts are intended for service role. Realtime publication includes scrape jobs, messages, notifications.

### Feature data flows

#### Sign up, onboarding, and profile

Browser auth forms call Supabase Auth directly; callback route exchanges OAuth code for a session. Signup's auth trigger creates profile and billing rows. Onboarding/settings typically call `/api/auth/profile` or `/api/profile`; note there are two profile APIs and two profile data models: `profiles` (main account/onboarding fields) and `user_profiles` (resume/target roles/skills). AI lead scoring reads the former as bio/headline/skills; `ProfileService` reads/writes the latter. Verify the specific page's API before changing a profile field.

#### Hunts (scrapes)

1. `ScrapeConfigForm` defaults to the explicit Demo listings mode and submits criteria to authenticated `POST /api/scrapes`; shared Zod schema permits `demo` alone and rejects mixing demo with live sources.
2. `ScrapesService.create` rejects every live source until a connector is approved, checks existing hunt quota, creates a job, filters deterministic fixture rows by criteria, and stores them with `source: demo`, `source_url: null`, and `metadata.data_origin: demo_fixture`.
3. Demo hunts do not call Groq, Apify, n8n, auto-create leads, or run AI scoring. Result/list/detail UI labels samples, shows no score, and hides save/tailor actions.
4. `POST /api/webhooks/n8n/results` currently returns HTTP 503 and does not persist callbacks. Re-enable only after source terms, $0 usage limits, workflow export, auth, and callback state/idempotency are reviewed.
5. Frontend detail listens to `scrape_jobs` updates through `useRealtimeScrape`; results load from API. Hunt pages live under `/hunts` despite API controller naming `/scrapes`.

#### Lead scoring

The legacy `LeadsService.scoreNewLeadsForHunt` code can score leads using `LeadScoringService` (Groq JSON score 0–100) when called with a configured provider key. The current demo hunt bypasses this path, persists only `scrape_results`, and displays “Not scored.” Provider calls may cost money; do not invoke under the $0 project constraint without a verified no-cost path. `user_profiles` resume data is not the profile source in the legacy scoring path.

#### Saved leads

`GET /api/leads` serves paginated user-owned saved leads with optional status/folder/tag filters. One-at-a-time and bulk creation copy an owned scrape result into `leads`. Folders/tags CRUD and association endpoints are API-backed. The UI can CSV/JSON export selected currently loaded leads; export endpoint also accepts `pdf`, but service's non-CSV/JSON branch emits plain text and declares `text/plain`.

#### Network and messages

Network discovery uses `profiles.interests` and `skills` exact string overlaps, excludes self and any user with an existing connection row, sorts by overlap score, then paginates in memory. Connection request/accept can create `notifications`. Messaging is allowed only after accepted connection. Service creates or reuses a shared conversation, persists messages, and sends Supabase Broadcast events on `conversation:<id>` (`new_message`) and `user:<id>` (`inbox_update`). Conversation read state is `conversation_participants.last_read_at`; unread is calculated from latest incoming message timestamp.

#### AI tools

`POST /api/ai-tools/generate` accepts one of bio/resume/cover_letter/gig_description/profile_summary plus optional target platform and arbitrary input object. `AiToolsService` calls Groq using tool/platform prompts and stores `ai_generations`. `generate-outreach` creates tailored outreach, can persist it to an owned lead, and also stores a generation. AI generation history is paginated. Scoring, standard generation, and hunt-generation currently use separate model defaults / key settings in code.

#### Billing and quotas

Billing API exposes plans, usage, subscription, Stripe checkout, portal, and Stripe webhook. Webhook uses raw request body + signature and updates subscriptions. `plans` table is seeded by migration. `packages/shared/src/constants/plans.ts` also has limits, but API services contain their own constants and sometimes query plans table. See drift notes before altering quotas.

#### Notifications and contact

Network service inserts notifications; notification bell/page read `notifications` directly through browser Supabase and subscribe to Postgres changes. Contact page inserts into `contact_submissions` directly; it invokes the Edge Function in the background for best-effort admin email. Edge Function sends using SMTP env. Admin replies use Nest admin service + Nodemailer and mark read before attempting send.

## Route and API reference

API routes include global `/api` prefix. Unless noted, feature APIs require `SupabaseAuthGuard`.

| Route | Controller/service responsibility |
|---|---|
| `GET /api/health` | Liveness response. |
| `GET /api/auth/profile`, `POST /api/auth/profile`, `PATCH /api/auth/profile`, `POST /api/auth/update-password`, `POST /api/auth/delete-account` | Account profile/onboarding/password/account deletion. |
| `GET /api/profile`, `POST /api/profile` | Separate `user_profiles` resume/target role profile API. |
| `POST /api/scrapes`, `GET /api/scrapes`, `GET /api/scrapes/:id`, `GET /api/scrapes/:id/results`, `POST /api/scrapes/:id/cancel`, `POST /api/scrapes/:id/rerun` | Hunt lifecycle/results. |
| `POST /api/webhooks/n8n/results` | Returns 503; callback ingestion is disabled until a source and authenticated workflow are reviewed. |
| `/api/leads` | Lead list/create/bulk/detail/update/delete; filters include page, limit, status, folder_id, tag_id. Also `/folders`, `/tags`, `/hunt/:huntId`, and tag association routes. |
| `POST /api/export/leads` | CSV/JSON/text content download (DTO accepts `pdf`, implementation does not produce PDF). |
| `GET /api/network/discover`, `POST /api/network/connect`, `PATCH /api/network/connections/:id`, `DELETE /api/network/connections/:id`, `GET /api/network/connections` | Discovery, request, response, cancel, list. |
| `POST /api/messages/conversations`, `GET /api/messages/conversations`, `POST /api/messages/conversations/:id`, `GET /api/messages/conversations/:id`, `PATCH /api/messages/conversations/:id/read` | Create/list conversations, send/list messages, update read timestamp. |
| `GET /api/billing/usage`, `/plans`, `/subscription`; `POST /api/billing/checkout`, `/portal`, `/webhooks/stripe` | User billing and unauthenticated Stripe webhook. |
| `POST /api/ai-tools/generate`, `/generate-outreach`, `GET /api/ai-tools/history` | AI generation and history. |
| `/api/admin/*` | Admin guarded analytics/users/plans/billing/scrapes/AI/contact/reply operations. See `admin.controller.ts`. |

Web page routes (route groups in parentheses do not appear in URL):

| URL | Main page file | Purpose |
|---|---|---|
| `/` | `apps/web/src/app/(landing-page)/page.tsx` | Marketing landing page. |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/callback` | `apps/web/src/app/(auth)/**` | Auth form wrapper/pages and OAuth callback route. |
| `/dashboard` | `(dashboard)/dashboard/page.tsx` + `client-page.tsx` | Server-side summary then client metrics/widgets. |
| `/hunts`, `/hunts/new`, `/hunts/[id]` | `(dashboard)/hunts/**` | Hunt listing, creation, detail/progress/results. |
| `/leads`, `/leads/[id]` | `(dashboard)/leads/**` | Lead list/filters/tags/export and lead detail. |
| `/network`, `/messages`, `/messages/[conversationId]` | `(dashboard)/**` | User discovery/connections and realtime messaging. |
| `/ai-tools`, `/billing`, `/notifications` | `(dashboard)/**` | AI generation/history, subscription UI, notification feed. |
| `/settings`, `/settings/profile`, `/settings/change-password`, `/onboarding` | `(dashboard)/settings/**`, `app/onboarding/page.tsx` | Account, scoring profile, password, first-time setup. |
| `/admin`, `/admin/users`, `/admin/billing`, `/admin/hunts`, `/admin/ai`, `/admin/contact` | `app/admin/**` | Admin dashboard sections; layout server-checks admin. |
| `/contact`, `/learn-more`, `/privacy`, `/terms` | `app/**` | Public contact and informational pages. |

## Change map: which files usually change together

| Requested change | Inspect/edit these first |
|---|---|
| Add/alter a browser page or interaction | Relevant `apps/web/src/app/**/page.tsx`; component under `src/components`; `api-client.ts` or Supabase client; route layout if shared shell/auth. Follow `apps/web/AGENTS.md`. |
| Add API endpoint | `apps/api/src/modules/<feature>/<feature>.controller.ts`, service, module; register module in `src/app.module.ts` if new; DTO/schema; guard policy; client call. |
| Change request/response shape | API controller/service + DTO; shared Zod/type where appropriate; web caller and UI; database migration if persisted field. |
| Add database field/table/index/policy | New `supabase/migrations/<timestamp>_*.sql`; related API service; shared row/interface; browser direct-query consumer; realtime publication if needed. Keep RLS in same migration. |
| Change auth/session behavior | `apps/web/middleware.ts`, `src/lib/supabase/{middleware,client,server,realtime}.ts`, `src/lib/api-client.ts`, API guards/decorator. |
| Change hunt flow/results | `scrapes.controller.ts`, `scrapes.service.ts`, `demo-fixtures.ts`, shared schema/type/source constants, callback controller, hunt pages/components, migrations, and tests. Do not assume an n8n workflow exists. |
| Change plan limits/usage | `packages/shared/src/constants/plans.ts`, migration plan rows, `billing/usage.service.ts`, `usage-limit.guard.ts`, and hard-coded limit maps in `scrapes.service.ts`, `leads.service.ts`, `ai-tools.service.ts`, plus dashboard/billing UI. |
| Change AI writing/scoring | AI tool service/DTO/controller for user-generated content; `lead-scoring.service.ts` + lead service for scores; environment and Docker Compose settings. |
| Change realtime messages | `messages.service.ts`, `realtime-broadcast.ts`, `messages`/participant migration and publication, `use-realtime-messages.ts`, conversation pages/list. |
| Change notification behavior | `network.service.ts`, notifications migration, bell/sidebar/notifications page; ensure per-user filtering in browser. |
| Change contact flow | Public contact page, Edge Function, contact migrations, admin service/controller/pages, SMTP env/config. |
| Change Stripe behavior | Billing controller/service/module, Stripe webhook event handling, migrations and `.env`/Compose variable mapping, billing UI. |

## Drift and implementation caveats (implementation snapshot; verify before acting)

These are warnings to prevent confident but incorrect edits. The Progress Tracker records later PR-01B fixes and local verification that are not fully reflected in this older repository map. Re-open the current source, migrations, and tests before acting; do not treat this list as a fresh checkout audit.

1. **SYNOPSIS remains stale.** README and public hunt/learn-more screens are being corrected to show current demo-only behavior. The synopsis still describes unimplemented multi-source crawling and needs a separate evidence-based rewrite.
2. **AI provider/env mismatch.** Current `AiToolsService` and `LeadScoringService` use Groq (`GROQ_API_KEY`, `GROQ_MODEL`) for separate legacy endpoints. They are not used by the demo hunt; a complete $0 AI strategy remains open.
3. **No live hunt source is enabled.** API requests for LinkedIn/Upwork/Fiverr/Reddit are rejected. The n8n callback route returns 503. Do not claim source-backed job discovery until an approved, zero-cost connector and secure workflow are implemented.
4. **Source names can overstate connector coverage.** DTOs and database types allow multiple sources, while source helpers have uneven coverage. Verify each actual path and provenance before representing all configured sources as real integrations.
5. **Shared workspace package is not wired into the app packages.** The API DTO owns a Zod request schema and the hunt form owns source option metadata locally; `packages/shared` is not currently a declared dependency of the API or web package. Keep the accepted enum values and demo/live exclusivity aligned across these contracts. A future package-wiring change should update dependency/build behavior and tests together.
6. **Two profile stores.** `profiles` is account/onboarding/profile/network/scoring data; `user_profiles` is the separate API's resume/target_roles/skills row. `ProfileService` is not used by the main scoring logic, which reads `profiles.bio`, `headline`, and `skills`.
7. **Usage accounting has overlapping mechanisms.** `ScrapesService` and AI service increment `usage` counters directly if a current row is present; leads use SQL RPC `check_and_increment_lead_usage`; controllers also record `usage_events`. `UsageService` sometimes prefers latest-in-period `usage` counters and falls back to event counts. Callback lead creation records events but does not invoke the lead limit RPC/counter increment. The shared `PLAN_LIMITS` is not the only active source of limits. Avoid broad quota changes without tracing every path.
8. **Database/API plan fields differ.** Migration seeds numeric cents in `plans.price_monthly`; README presents dollar prices. Subscription table and code use both `current_period_*` and `billing_cycle_start`; `UsageService` bases cycle start on `billing_cycle_start`. Checkout env names are `STRIPE_PRICE_STARTER/PRO/ENTERPRISE`, whereas `.env.example` names `STRIPE_STARTER_PRICE_ID/...`. Compose uses STRIPE_PRICE_* names.
9. **Stripe webhook is unguarded intentionally as a webhook route**, while signature validation is in service. It requires raw-body capture (`rawBody: true`). Do not add bearer auth or remove rawBody without considering Stripe signature verification.
10. **Callback state/persistence needs transaction review.** Callback persistence was disabled in the current slice; if re-enabled, inspect result insert, job-state update, and lead creation for partial failure and retries. Add lifecycle tests before claiming it is robust.
11. **RLS and admin client.** All API feature data paths using service-role key bypass RLS. Cross-user safety depends on service-side filters; notification inserts and admin operations intentionally act across users. Inspect new queries individually.
12. **Contact form behavior and message differ.** Form persists first and invokes email asynchronously; success view says “Email sent” despite not awaiting or checking email result. Edge Function uses public CORS `*`; its HTML interpolates user values. Admin reply loads SMTP env from a relative `supabase/.env` path in addition to process env and marks read before email sending.
13. **Export format mismatch.** DTO accepts `pdf`, but `ExportService` returns plain-text content with `.txt` filename for every value not `csv` or `json`; UI currently exposes CSV and JSON only.
14. **Frontend guard list is explicit.** `/notifications`, `/onboarding`, and `/admin/*` are not separate exact middleware entries (admin prefix is included); `/notifications` relies on dashboard layout / API/RLS. Do not assume middleware is the only guard.
15. **README architecture tree lists obsolete/nonexistent files** (for example old route names, profile type path); always `rg --files` before using a path it names.
16. **Migration inventory and verification record need reconciliation.** `scripts/migrate.mjs` tracks and skips applied filenames/checksums; it warns and skips an edited already-applied migration. The Progress Tracker records a clean local `supabase db reset` applying the demo migrations `20261027000001` and `20261027000002`, and later records `20261027000003_add_outreach_tool_type.sql` applying successfully during PR-01B. This knowledge-base migration table omitted that third migration. The Progress Tracker also uses inconsistent total migration-count wording (19 in some entries and 20 in another); do not repeat a total as fact until the current checkout and migration runner output are inspected. Never edit an already-applied migration; validate clean reset and upgrade paths on a disposable database.

## Complete tracked-file map (239 files)

Every path below is tracked in Git at documentation time. For UI primitives/assets and boilerplate, the description gives their exact role class; inspect the file itself for implementation details.

### Repository root and documentation/configuration (20)

| File | What it contains / handles |
|---|---|
| `.claude/settings.local.json` | Local Claude Code project settings; tool/editor configuration, not runtime app code. Do not copy personal/local values into deployment config. |
| `.dockerignore` | Files excluded from Docker build contexts. |
| `.env.example` | Example local environment-variable names and placeholders; currently contains provider/name drift described above. No real secrets should be committed. |
| `.gitignore` | Git ignore rules for generated files, dependencies, environment files, and build artifacts. |
| `.nvmrc` | Pins expected Node major version (22). |
| `CLAUDE.md` | Root contributor guidance, architecture conventions, common commands, and key security/integration notes. |
| `Caddyfile` | Reverse proxy configuration: `/api/*` to API and remaining paths to web, with TLS/security headers. Domain is an example deployment value. |
| `DEPLOY.md` | Docker Compose + host Caddy deployment procedure and ops commands. Check env-name consistency against source before relying on it. |
| `MIGRATIONS.md` | Instructions for `scripts/migrate.mjs` and tracking behavior. |
| `README.md` | Broad product/setup/features/API documentation; contains stale claims, so code is authoritative. |
| `SYNOPSIS.md` | Project proposal/design synopsis; not the implementation contract. |
| `docker-compose.yml` | Production-like web/API services, build args, runtime env, localhost-bound ports, Docker network. Current API AI env mapping is inconsistent with Groq code. |
| `package.json` | Root pnpm workspace scripts and root tooling dependency (`turbo`, `pg`). |
| `package-lock.json` | Root npm lockfile; dependency resolution snapshot. Workspace convention is pnpm, so do not treat this as application code. |
| `pnpm-lock.yaml` | Monorepo dependency lockfile for pnpm. |
| `pnpm-workspace.yaml` | Declares `apps/*` and `packages/*` workspaces. |
| `turbo.json` | Turborepo task graph, build outputs, and dev cache/persistence behavior. |
| `scripts/migrate.mjs` | Custom Postgres migration runner; sorted SQL files, `_outsauce_migrations` filename/checksum tracking, per-file transaction, SSL heuristic. |
| `supabase/seed.sql` | Placeholder seed script; currently only returns a success string, no business data. |

### API application and common infrastructure (17)

| File | What it contains / handles |
|---|---|
| `apps/api/package.json` | API scripts/dependencies, Jest config; includes Groq, Anthropic, NestJS, Supabase, Stripe and mail dependencies; Apify SDK removed from active dependencies. |
| `apps/api/tsconfig.json` | API TypeScript compiler configuration. |
| `apps/api/tsconfig.build.json` | Build-specific TypeScript exclusions/configuration. |
| `apps/api/nest-cli.json` | Nest CLI project configuration. |
| `apps/api/eslint.config.mjs` | ESLint configuration for API source. |
| `apps/api/.prettierrc` | API formatting options. |
| `apps/api/Dockerfile` | Multi-stage API image install/build/runtime and health check. |
| `apps/api/README.md` | API package-level docs; compare with actual module code. |
| `apps/api/src/main.ts` | Nest bootstrap; raw body enabled, global `/api`, CORS, global exception filter, port binding. |
| `apps/api/src/app.module.ts` | Root dependency-injection module; registers config, Supabase, and all feature modules. |
| `apps/api/src/common/decorators/current-user.decorator.ts` | `@CurrentUser()` reads guard-populated request user. |
| `apps/api/src/common/filters/http-exception.filter.ts` | Converts Nest and unknown exceptions into JSON status/message/error response. |
| `apps/api/src/common/guards/admin.guard.ts` | Checks authenticated user's `profiles.is_admin` using service-role query. |
| `apps/api/src/common/guards/supabase-auth.guard.ts` | Parses Bearer token, validates with Supabase Auth, assigns request.user. |
| `apps/api/src/common/pipes/zod-validation.pipe.ts` | Validates request input with a passed Zod schema and returns parsed data or 400 errors. |
| `apps/api/src/supabase/supabase.module.ts` | Provides/exports Supabase service to feature modules. |
| `apps/api/src/supabase/supabase.service.ts` | Constructs admin/service-role and per-user bearer Supabase clients; reads API `SUPABASE_URL` and service key. |
| `apps/api/src/supabase/realtime-broadcast.ts` | Sends Supabase Realtime Broadcast REST event; logs failures without throwing. |

### API feature modules (50)

| File | What it contains / handles |
|---|---|
| `apps/api/src/modules/auth/auth.controller.ts` | Authenticated profile read/onboard/update, password update and account deletion routes. |
| `apps/api/src/modules/auth/auth.module.ts` | Auth controller/service/Supabase module wiring. |
| `apps/api/src/modules/auth/auth.service.ts` | Reads/updates `profiles`, allowlists profile fields, changes password/deletes user through Supabase admin auth. |
| `apps/api/src/modules/profile/profile.controller.ts` | Authenticated GET/POST endpoint for the separate candidate profile model. |
| `apps/api/src/modules/profile/profile.module.ts` | Profile controller/service registration and service export. |
| `apps/api/src/modules/profile/profile.service.ts` | Reads/upserts `user_profiles` resume text, target roles, skills. |
| `apps/api/src/modules/profile/dto/profile.dto.ts` | Zod schema and inferred type for candidate profile save. |
| `apps/api/src/modules/scrapes/scrapes.controller.ts` | Authenticated scrape/hunt create/list/read/results/cancel/rerun endpoints; usage guard on create. |
| `apps/api/src/modules/scrapes/scrapes.module.ts` | Wires scrape service with Supabase and billing dependencies. |
| `apps/api/src/modules/scrapes/scrapes.service.ts` | Rejects unconnected live sources; quota-checks hunts; filters/persists deterministic demo fixtures; lists/reads/results/cancels/reruns jobs. Does not call an external scraper or model. |
| `apps/api/src/modules/scrapes/demo-fixtures.ts` | Fixed Pakistan-focused illustrative listings and deterministic criteria filtering. Each row has source `demo`, no URL, and fixture provenance metadata. |
| `apps/api/src/modules/scrapes/demo-fixtures.spec.ts` | Tests fixture provenance/filtering and that demo cannot be mixed with live sources. |
| `apps/api/src/modules/scrapes/scrapes.service.spec.ts` | Tests that unconnected live-source requests fail before database access. |
| `apps/api/src/modules/scrapes/dto/create-scrape.dto.ts` | Runtime Zod schema for job name/source list/search criteria. |
| `apps/api/src/modules/webhooks/webhooks.controller.ts` | `POST /api/webhooks/n8n/results` returns 503; it does not validate or persist callback payloads. |
| `apps/api/src/modules/webhooks/webhooks.module.ts` | Callback module wiring and exports webhook service. |
| `apps/api/src/modules/webhooks/webhooks.service.ts` | Inserts callback result rows, updates hunt state, attempts lead creation, records usage, and starts scoring. |
| `apps/api/src/modules/webhooks/dto/scrape-callback.dto.ts` | Zod schema for the n8n result callback payload. |
| `apps/api/src/modules/scrapes/lead-aggregator.ts` | Helper for combining/normalizing candidate sources; verify callers before editing. |
| `apps/api/src/modules/scrapes/lead-validator.ts` | Anthropic-backed candidate validation helper; verify whether active flow calls it. |
| `apps/api/src/modules/leads/leads.controller.ts` | Authenticated lead/folder/tag CRUD, hunt results and tag joins; lead usage guard/recording. |
| `apps/api/src/modules/leads/leads.module.ts` | Leads service/controller/scoring and Supabase/billing dependencies. |
| `apps/api/src/modules/leads/leads.service.ts` | Lead ownership, RPC quota check, CRUD, folder/tag management, hunt retrieval, and async AI scoring pipeline. |
| `apps/api/src/modules/leads/lead-scoring.service.ts` | Groq JSON relevance score + reasoning with retries and null fallback. |
| `apps/api/src/modules/leads/dto/lead.dto.ts` | API-local Zod schemas for create/bulk/update lead, folder and tag DTOs. |
| `apps/api/src/modules/leads/leads.service.spec.ts` | Jest unit tests for lead service behavior/mocks. |
| `apps/api/src/modules/network/network.controller.ts` | Authenticated discovery, connect, connection update/cancel/list endpoints. |
| `apps/api/src/modules/network/network.module.ts` | Network module registration. |
| `apps/api/src/modules/network/network.service.ts` | Interest/skill match ranking; connection lifecycle; network notifications. |
| `apps/api/src/modules/messages/messages.controller.ts` | Authenticated conversation create/list, message send/list and mark-read routes. |
| `apps/api/src/modules/messages/messages.module.ts` | Message module registration. |
| `apps/api/src/modules/messages/messages.service.ts` | Accepted-connection gate, conversation reuse/create, message persistence, realtime broadcasts, unread summary/read timestamps. |
| `apps/api/src/modules/billing/billing.controller.ts` | Usage/plans/subscription/checkout/portal and Stripe webhook routes. |
| `apps/api/src/modules/billing/billing.module.ts` | Billing and usage providers/guard, exports usage services. |
| `apps/api/src/modules/billing/billing.service.ts` | Stripe checkout/portal, plan/subscription lookup, signed webhook event updates. |
| `apps/api/src/modules/billing/usage.service.ts` | Computes usage from period table or usage events, event recording and quota checks. |
| `apps/api/src/modules/billing/usage-limit.guard.ts` | Decorator metadata and guard that blocks over-limit guarded actions. |
| `apps/api/src/modules/ai-tools/ai-tools.controller.ts` | Authenticated generation/outreach/history routes plus usage guard/event recording. |
| `apps/api/src/modules/ai-tools/ai-tools.module.ts` | AI tools module wiring with billing and Supabase. |
| `apps/api/src/modules/ai-tools/ai-tools.service.ts` | Groq prompt templates for content/outreach; quota checks, persistence/history and optional owned-lead outreach update. |
| `apps/api/src/modules/ai-tools/dto/ai-tools.dto.ts` | Zod schema for generic content generation. |
| `apps/api/src/modules/ai-tools/dto/outreach.dto.ts` | Zod input for outreach text, profile context, tone and optional lead id. |
| `apps/api/src/modules/admin/admin.controller.ts` | Auth+admin guarded platform analytics, user, billing, scrape, AI and contact support endpoints. |
| `apps/api/src/modules/admin/admin.module.ts` | Admin controller/service registration. |
| `apps/api/src/modules/admin/admin.service.ts` | Service-role platform stats, user/plan management, contact inbox and Gmail reply email. |
| `apps/api/src/modules/export/export.controller.ts` | Authenticated download endpoint; sets response content headers/body. |
| `apps/api/src/modules/export/export.module.ts` | Export module wiring. |
| `apps/api/src/modules/export/export.service.ts` | User-owned lead lookup and CSV/JSON/plain-text serialization. |
| `apps/api/src/modules/export/dto/export.dto.ts` | Zod validation for lead UUID list and csv/json/pdf enum. |
| `apps/api/src/modules/health/health.controller.ts` | `/api/health` liveness response. |
| `apps/api/src/modules/health/health.module.ts` | Health controller module. |

### API test and test configuration (2)

| File | What it contains / handles |
|---|---|
| `apps/api/test/app.e2e-spec.ts` | Jest/Supertest end-to-end application smoke test; currently asserts the old root `Hello World!` behavior and may be stale because bootstrap sets a global `/api` prefix. |
| `apps/api/test/jest-e2e.json` | E2E Jest config. |

### Web tooling and package files (13)

| File | What it contains / handles |
|---|---|
| `apps/web/package.json` | Web scripts and Next/React/Supabase/UI dependencies. |
| `apps/web/Dockerfile` | Multi-stage Next standalone production build; builds with `NEXT_PUBLIC_*` build args and runs as non-root. |
| `apps/web/package-lock.json` | Web npm dependency lock snapshot; pnpm workspace remains primary. |
| `apps/web/tsconfig.json` | Web TypeScript path aliases/compiler settings. |
| `apps/web/next.config.ts` | Next standalone production output and monorepo tracing root. |
| `apps/web/middleware.ts` | Next middleware entrypoint; delegates session update and route policy. |
| `apps/web/AGENTS.md` | Mandatory Next-specific instruction to consult installed Next docs before frontend changes. |
| `apps/web/CLAUDE.md` | App-local instructions including import/reference to AGENTS. |
| `apps/web/README.md` | Generated/default Next app readme, not authoritative product docs. |
| `apps/web/eslint.config.mjs` | Web ESLint configuration. |
| `apps/web/postcss.config.mjs` | Tailwind/PostCSS plugin setup. |
| `apps/web/components.json` | shadcn component generator configuration (base-nova aliases/style). |
| `apps/web/.gitignore` | Web app-specific ignored build/local files. |
| `apps/web/.mcp.json` | Local MCP configuration for web project tools; not application runtime. |

### Web app routes (45)

| File | What it contains / handles |
|---|---|
| `apps/web/src/app/layout.tsx` | Root HTML/body, global CSS, metadata and theme/toaster providers. |
| `apps/web/src/app/globals.css` | Tailwind import, design tokens/OKLCH brand colors, global styles. |
| `apps/web/src/app/icon.svg` | Browser/app icon vector. |
| `apps/web/src/app/favicon.ico` | Browser favicon binary. |
| `apps/web/src/app/(landing-page)/page.tsx` | Marketing landing page. |
| `apps/web/src/app/(auth)/layout.tsx` | Shared auth-page layout. |
| `apps/web/src/app/(auth)/login/page.tsx` | Login page wrapper. |
| `apps/web/src/app/(auth)/signup/page.tsx` | Signup page wrapper. |
| `apps/web/src/app/(auth)/forgot-password/page.tsx` | Forgot-password page wrapper/metadata. |
| `apps/web/src/app/(auth)/reset-password/page.tsx` | Reset-password page wrapper/metadata. |
| `apps/web/src/app/(auth)/verify-email/page.tsx` | Email verification page wrapper/metadata. |
| `apps/web/src/app/(auth)/callback/route.ts` | OAuth code callback/session exchange and redirect. |
| `apps/web/src/app/(dashboard)/layout.tsx` | Authenticated dashboard shell and profile/onboarding routing checks. |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | Server component loads user and dashboard counters from Supabase. |
| `apps/web/src/app/(dashboard)/dashboard/client-page.tsx` | Client metrics/cards, realtime refresh plus polling fallback. |
| `apps/web/src/app/(dashboard)/hunts/page.tsx` | Lists hunts and supports cancel/rerun. |
| `apps/web/src/app/(dashboard)/hunts/new/page.tsx` | New-hunt page shell around scrape configuration component. |
| `apps/web/src/app/(dashboard)/hunts/[id]/page.tsx` | Hunt detail/progress/results; displays demo-only disclaimer and empty state; stops polling for scores on demo results. |
| `apps/web/src/app/(dashboard)/leads/page.tsx` | Lead list, status/tag filters, tag management and CSV/JSON export. |
| `apps/web/src/app/(dashboard)/leads/[id]/page.tsx` | Individual lead view and delete/detail interaction. |
| `apps/web/src/app/(dashboard)/messages/page.tsx` | Conversation inbox, last message/unread state, broadcast refresh. |
| `apps/web/src/app/(dashboard)/messages/[conversationId]/page.tsx` | Conversation history/send/read interaction and realtime message hook. |
| `apps/web/src/app/(dashboard)/network/page.tsx` | Discover profiles, request/accept/reject/cancel and connection list. |
| `apps/web/src/app/(dashboard)/ai-tools/page.tsx` | AI content tool forms, request and generation result/history UI. |
| `apps/web/src/app/(dashboard)/billing/page.tsx` | Plan comparison, usage and Stripe checkout/portal controls. |
| `apps/web/src/app/(dashboard)/notifications/page.tsx` | Direct RLS list/realtime feed, mark one/all read and delete. |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | Account settings, theme/identity and account deletion controls. |
| `apps/web/src/app/(dashboard)/settings/profile/page.tsx` | Candidate resume/target roles/skills profile editor. |
| `apps/web/src/app/(dashboard)/settings/change-password/page.tsx` | Password-change form calling API. |
| `apps/web/src/app/onboarding/page.tsx` | First-run user type, profile basics and completion post. |
| `apps/web/src/app/admin/layout.tsx` | Server-side Supabase session/admin profile check and admin shell. |
| `apps/web/src/app/admin/page.tsx` | Admin overview dashboard / platform analytics presentation. |
| `apps/web/src/app/admin/users/page.tsx` | Admin user listing/create/edit/delete/plan controls. |
| `apps/web/src/app/admin/billing/page.tsx` | Admin subscription distribution/MRR view. |
| `apps/web/src/app/admin/hunts/page.tsx` | Admin scrape/hunt health view. |
| `apps/web/src/app/admin/ai/page.tsx` | Admin AI usage view; heading/provider wording is stale vs Groq service. |
| `apps/web/src/app/admin/contact/page.tsx` | Support inbox, read state, reply and delete controls. |
| `apps/web/src/app/contact/page.tsx` | Public contact form; direct DB insert then best-effort Edge Function invocation. |
| `apps/web/src/app/learn-more/page.tsx` | Public product information page. |
| `apps/web/src/app/privacy/page.tsx` | Public privacy policy page. |
| `apps/web/src/app/terms/page.tsx` | Public terms page. |

### Web components, hooks, and libraries (60)

| File | What it contains / handles |
|---|---|
| `apps/web/src/lib/api-client.ts` | Fetch wrapper that gets Supabase browser session, attaches bearer token, parses JSON/errors. |
| `apps/web/src/lib/utils.ts` | `cn()` helper merging conditional and Tailwind classes. |
| `apps/web/src/lib/supabase/client.ts` | Cached browser Supabase SSR client using public URL/anon key. |
| `apps/web/src/lib/supabase/server.ts` | Server Supabase client bound to Next cookies. |
| `apps/web/src/lib/supabase/middleware.ts` | Refreshes session, handles stale cookie redirect and explicit protected path policy. |
| `apps/web/src/lib/supabase/realtime.ts` | Gets session token into Supabase Realtime auth and returns auth unsubscribe helper. |
| `apps/web/src/hooks/use-mobile.ts` | Media-query hook for mobile breakpoint detection. |
| `apps/web/src/hooks/use-realtime-messages.ts` | Broadcast subscription for `conversation:<id>` `new_message`; deduplicates local messages. |
| `apps/web/src/hooks/use-realtime-scrape.ts` | Authenticated Postgres UPDATE subscription for a scrape job's status/result/error fields. |
| `apps/web/src/components/OutsauceLogo.tsx` | Brand logo component. |
| `apps/web/src/components/EtherealDust.tsx` | Decorative animated background effect for public/auth pages. |
| `apps/web/src/components/VisualDemo.tsx` | Marketing/demo visualization component. |
| `apps/web/src/components/auth-session-guard.tsx` | Client-side session guard/helper for auth state transitions. |
| `apps/web/src/components/theme-provider.tsx` | `next-themes` provider setup. |
| `apps/web/src/components/auth/auth-layout-client.tsx` | Client visual/layout wrapper for authentication screens. |
| `apps/web/src/components/auth/login-form.tsx` | Supabase email login form and error/success handling. |
| `apps/web/src/components/auth/signup-form.tsx` | Supabase signup form and verification flow. |
| `apps/web/src/components/auth/forgot-password-form.tsx` | Password reset email request. |
| `apps/web/src/components/auth/reset-password-form.tsx` | New password form using recovered Supabase session. |
| `apps/web/src/components/auth/verify-email-view.tsx` | Verification confirmation/instructions UI. |
| `apps/web/src/components/dashboard/dashboard-background.tsx` | Dashboard background decoration. |
| `apps/web/src/components/shared/header.tsx` | Shared dashboard header layout/actions. |
| `apps/web/src/components/shared/app-sidebar.tsx` | Main navigation, profile/admin state, unread notifications badge. |
| `apps/web/src/components/shared/admin-sidebar.tsx` | Admin navigation sidebar. |
| `apps/web/src/components/shared/notification-bell.tsx` | Header notification unread badge/list and realtime updates. |
| `apps/web/src/components/shared/theme-toggle.tsx` | Theme mode toggle control. |
| `apps/web/src/components/scrapes/scrape-config-form.tsx` | Pakistan-first criteria form; Demo listings enabled, unconfigured live sources disabled; submits and navigates to hunt detail. |
| `apps/web/src/components/scrapes/scrape-results-table.tsx` | Displays results, labels demo records, hides save/tailor actions for demo rows, and shows no-score state. |
| `apps/web/src/components/scrapes/scrape-status-badge.tsx` | Visual mapping from scrape status to badge style/label. |
| `apps/web/src/components/leads/lead-table.tsx` | Tabular saved lead display/actions/status updates/deletion. |
| `apps/web/src/components/leads/lead-card.tsx` | Lead display card and source-specific metadata rendering. |
| `apps/web/src/components/leads/fit-badge.tsx` | Fit-score badge presentation. |
| `apps/web/src/components/leads/folder-sidebar.tsx` | Lead-folder organization UI and actions. |
| `apps/web/src/components/leads/tag-manager.tsx` | Tag creation/deletion and tag color management. |
| `apps/web/src/components/ui/alert.tsx` | shadcn/base-nova alert primitive wrapper. |
| `apps/web/src/components/ui/avatar.tsx` | Avatar primitive wrapper. |
| `apps/web/src/components/ui/badge.tsx` | Badge primitive/variants. |
| `apps/web/src/components/ui/bento-card.tsx` | Branded metric/feature bento card. |
| `apps/web/src/components/ui/button.tsx` | Button primitive and variants. |
| `apps/web/src/components/ui/card.tsx` | Card layout primitives. |
| `apps/web/src/components/ui/checkbox.tsx` | Checkbox primitive wrapper. |
| `apps/web/src/components/ui/dialog.tsx` | Dialog/modal primitives. |
| `apps/web/src/components/ui/dropdown-menu.tsx` | Dropdown menu primitives. |
| `apps/web/src/components/ui/input.tsx` | Input primitive. |
| `apps/web/src/components/ui/label.tsx` | Form label primitive. |
| `apps/web/src/components/ui/progress.tsx` | Progress indicator primitive. |
| `apps/web/src/components/ui/radio-group.tsx` | Radio group primitives. |
| `apps/web/src/components/ui/select.tsx` | Select primitives. |
| `apps/web/src/components/ui/separator.tsx` | Separator primitive. |
| `apps/web/src/components/ui/sheet.tsx` | Side-sheet/drawer primitives. |
| `apps/web/src/components/ui/sidebar.tsx` | Sidebar layout/context primitives. |
| `apps/web/src/components/ui/skeleton.tsx` | Loading skeleton primitive. |
| `apps/web/src/components/ui/table.tsx` | Table primitives. |
| `apps/web/src/components/ui/tabs.tsx` | Tabs primitives. |
| `apps/web/src/components/ui/textarea.tsx` | Textarea primitive. |
| `apps/web/src/components/ui/tooltip.tsx` | Tooltip primitives. |

### Web public assets (5)

| File | What it contains / handles |
|---|---|
| `apps/web/public/file.svg` | Default decorative SVG asset. |
| `apps/web/public/globe.svg` | Default decorative SVG asset. |
| `apps/web/public/next.svg` | Next.js logo asset. |
| `apps/web/public/vercel.svg` | Vercel logo asset. |
| `apps/web/public/window.svg` | Default decorative SVG asset. |

### Shared package (16)

| File | What it contains / handles |
|---|---|
| `packages/shared/package.json` | `@outsauce/shared` package metadata/export/build setup. |
| `packages/shared/tsconfig.json` | Shared TypeScript compiler configuration. |
| `packages/shared/src/index.ts` | Public barrel exports for shared types, schemas, limits and source metadata. |
| `packages/shared/src/types/user.ts` | User type union and main `Profile` contract. |
| `packages/shared/src/types/scrape.ts` | Scrape source/status/criteria/job/result contracts; `demo` is a distinct source value. |
| `packages/shared/src/types/lead.ts` | Lead status, lead, folder, tag contracts. |
| `packages/shared/src/types/network.ts` | Connection status and connection contract. |
| `packages/shared/src/types/message.ts` | Conversation, participant, message and status contracts. |
| `packages/shared/src/types/billing.ts` | Subscription, usage, plan tier and limit contracts. |
| `packages/shared/src/schemas/profile.schema.ts` | Shared onboarding/update profile validation. |
| `packages/shared/src/schemas/scrape.schema.ts` | Shared scrape input validation; rejects mixing `demo` with live source selections. |
| `packages/shared/src/schemas/lead.schema.ts` | Shared create/bulk/update lead validation. |
| `packages/shared/src/constants/plans.ts` | Shared monthly plan limit values and `isWithinLimit`. |
| `packages/shared/src/constants/sources.ts` | Scrape source labels/icons and supported target metadata; `Demo listings` is shown as fixture data. |

### Supabase migrations, edge function and local config (17)

| File | What it contains / handles |
|---|---|
| `supabase/config.toml` | Local Supabase ports, schemas, auth/Google OAuth/SMTP/analytics settings. |
| `supabase/functions/send-contact-email/deno.json` | Deno Edge Function import/compiler configuration. |
| `supabase/functions/send-contact-email/index.ts` | CORS-enabled Deno function; accepts contact payload and sends Gmail SMTP admin notification. |
| `supabase/migrations/20260330000001_create_enums.sql` | Creates user/source/status/AI/plan/message/export enums. |
| `supabase/migrations/20260330000002_create_profiles.sql` | Creates profile table/indexes, auth signup trigger and updated_at trigger. |
| `supabase/migrations/20260330000003_create_scrapes.sql` | Creates scrape_jobs and scrape_results, indexes and job updated_at trigger. |
| `supabase/migrations/20260330000004_create_leads.sql` | Creates folders, tags, leads, lead_tags and associated indexes/updated_at trigger. |
| `supabase/migrations/20260330000005_create_network.sql` | Creates connection relationship/status table, constraints/indexes/update trigger. |
| `supabase/migrations/20260330000006_create_messages.sql` | Creates conversations/participants/messages; enables realtime for messages and jobs. |
| `supabase/migrations/20260330000007_create_billing.sql` | Creates subscriptions, usage, AI generation tables and profile-created billing trigger. |
| `supabase/migrations/20260330000008_create_rls_policies.sql` | Enables RLS and establishes core per-user/profile/network/message/billing policies. |
| `supabase/migrations/20260425000001_add_verification_flag.sql` | Adds/backfills profile email verification and auth-user sync trigger. |
| `supabase/migrations/20260426000001_create_contact_submissions.sql` | Creates contact submissions and public insert/authenticated select RLS policies. |
| `supabase/migrations/20260426000002_create_notifications.sql` | Creates notifications enum/table, user policies and realtime publication. |
| `supabase/migrations/20260427000001_add_admin_flag.sql` | Adds `profiles.is_admin`, indexes true admins, and trigger-blocks authenticated changes to the flag. |
| `supabase/migrations/20260427000002_add_contact_fields.sql` | Adds subject, read, and reply timestamp to contact submissions. |
| `supabase/migrations/20260726000001_add_ai_lead_scoring.sql` | Adds scoring/outreach/hunt columns, creates `user_profiles`, indexes and owner RLS. |
| `supabase/migrations/20260726000003_create_usage_events.sql` | Creates plan table/seeds quotas, billing cycle start, usage events and updated billing trigger. |
| `supabase/migrations/20260729000001_check_and_increment_lead_usage.sql` | Atomic advisory-lock quota RPC; creates current period row if absent and increments lead counter. |
| `supabase/migrations/20261027000001_add_demo_scrape_source.sql` | Adds the distinct `demo` value to `scrape_source` for illustrative fixture results. |
| `supabase/migrations/20261027000002_constrain_demo_scrape_rows.sql` | Requires demo to be the only source in a demo hunt; demo result rows must have no source URL and must carry `data_origin: demo_fixture`; saved demo leads retain this marker. |
| `supabase/migrations/20261027000003_add_outreach_tool_type.sql` | PR-01B forward migration recorded in the Progress Tracker; adds `outreach_message` to `public.ai_tool_type` so outreach-generation history can be persisted. The tracker records a clean local reset and an insert/delete persistence check on 2026-10-27. Recheck the file and current database migration state in the repository before relying on it. |
| `supabase/snippets/Untitled query 368.sql` | Ad hoc Supabase SQL snippet; not part of numbered migration sequence, inspect before use. |

## Alignment with the refactor documents

Keep the four project documents in distinct roles:

| Document | Authority | Do not use it for |
|---|---|---|
| `PROJECT_REFACTOR_FIX_PLAN.md` | Product requirements, prioritized fixes, acceptance criteria, and scope constraints | Proving a fix has shipped |
| `PROJECT_REFACTOR_EXECUTION_PLAN.md` | Milestones, PR order, ownership boundaries, and per-PR verification expectations | Reporting current completion status |
| `PROJECT_REFACTOR_PROGRESS.md` | Current recorded status, decisions, commands/results, and evidence | Replacing source-code inspection |
| `PROJECT_KNOWLEDGE.md` (this file) | Navigation map and documented behavior of the implementation snapshot | Defining future architecture or claiming work is complete |

### PR boundaries that affect this repository map

- **PR-02:** callback transport/configuration security (authentication, payload validation/size, event identity/replay boundary, safe disabled behavior). It does not own durable worker execution, leases, retries, cancellation, or crash recovery.
- **PR-06:** first permitted or explicitly fixture-backed source slice, normalized/persisted opportunities, provenance/freshness/deduplication, and the first/only opportunity list/detail experience.
- **PR-07:** the single durable job/worker lifecycle and the minimum Admin run list/detail/status/failure/retry/cancel operations.
- **PR-08:** user-specific save/unsave, application tracking, and feedback on PR-06 opportunities; it must not recreate the profile or opportunity list/detail screens.
- **PR-09:** broader Admin source/data-quality/evaluation/audit operations; it extends PR-07 and must not create a second run lifecycle.
- **PR-10/PR-11:** measured ranking/AI work after a labeled dataset and baseline; semantic retrieval/RAG is optional and evidence-gated.

These boundaries are planning rules from the revised Execution Plan, not statements that these PRs have been implemented.

## Confidence and maintenance

This document is a navigation/behavior map for the implementation snapshot, not a substitute for opening the target implementation. The uploaded source file was reviewed against the revised Fix Plan, Execution Plan, and Progress Tracker, but the repository checkout itself was not available for a fresh `git ls-files`, source diff, or migration reset in this review. Therefore, file counts, paths, and implementation details remain subject to checkout verification. When a code change changes a data contract, architecture path, environment variable, security guard, route, or migration, update the relevant sections and file map in this same document. Preserve uncertainty where source is ambiguous; do not turn product marketing or a future plan into implementation fact.
