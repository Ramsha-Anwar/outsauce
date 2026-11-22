# Outsauce: Complete Refactor and Fix Plan

**Plan status:** Implementation is underway; the first demo-only hunt slice is in progress. See `PROJECT_REFACTOR_PROGRESS.md` for current status and verification evidence.  
**Basis:** `PROJECT_CRITICAL_REVIEW.md` and `PROJECT_KNOWLEDGE.md`, which describe the checked-in repository as inspected on 2026-10-16.  
**Evidence caveat:** The existing review is source/configuration inspection. It explicitly did not install dependencies, start the web/API services, exercise a live database, or run external integrations. Findings below are reported as code-level findings or risks from that review; they are not claims of runtime reproduction. Recheck each item against the current branch and deployed environment before changing it.

## 1. Purpose of this plan

Turn the review findings and the agreed product direction into an actionable refactor plan for Outsauce. The goal is not to add every possible feature. It is to make the central product promise clear, truthful, reproducible, secure, measurable, and technically defensible as both an FYP and an AI/backend engineering portfolio project.

This is a plan, not proof that any fix has been completed. Do not tell an examiner or user that an item is implemented until it has been changed and verified.

### Non-negotiable cost constraint

The user requires **zero out-of-pocket spend** for this project. Do not add paid API/model calls, paid Apify runs, paid proxies, paid subscriptions, database/storage overages, paid workflow/monitoring tools, domains, or hosting upgrades. A provider's free allowance may be used only if the exact workload is within the currently verified allowance, usage hard limits prevent chargeable overage, auto-upgrade is off, and no paid account action is required. Prefer local deterministic models/fixtures and self-hosted or existing free resources where practical. If a feature cannot be delivered at zero cost, offer a genuinely no-cost alternative or ask the user to reduce/defer scope; do not spend to preserve a planned feature. Record any free-tier limits and recheck them before implementation/deployment because they can change. Target spend is $0.

## 2. Recommended product definition

### Problem statement

Job seekers spend time searching multiple job sources and manually deciding which opportunities fit their skills, experience, location, and preferences. Outsauce should collect opportunities from a defined set of permitted sources, preserve their provenance and freshness, remove duplicates, and help each user prioritize relevant results with evidence-based explanations.

### Product boundary

- The primary evaluated user is a **job seeker**. The matching profile can cover different job families and preferences; it does not need to be limited to AI/backend jobs.
- The initial project must support a bounded, documented set of job sources and job categories. It must not claim to contain every job or continuously crawl the entire web.
- “Always on” means scheduled, source-specific synchronization at an appropriate frequency, with monitoring, retries, and freshness handling. It does not mean unbounded or constant scraping.
- Use official APIs, feeds, approved datasets, employer-provided data, or other sources for which the project has a defensible right to collect and display the data. Verify each source's current requirements before implementing its connector. Do not bypass authentication, access controls, CAPTCHAs, paywalls, or anti-bot restrictions.
- The collector records what it found. AI interprets, retrieves, ranks, and explains those records. AI must not fabricate a job listing or present generated demo data as real.
- Keep the admin module as an operations, quality, and audit console for this pipeline.
- Do not try to clone Indeed. The product's value should be trustworthy, profile-aware discovery and transparent matches across the specific sources it supports.

### Proposed FYP contribution

Evaluate whether a profile-aware, evidence-grounded hybrid ranking approach improves the relevance of job opportunities compared with a transparent rule-based baseline. The FYP must report the dataset, labeling method, metrics, results, and limitations. Do not claim the AI is better until measured results support that conclusion.

## 3. Target architecture

```text
Next.js web app
  ├─ Supabase Auth / session handling
  ├─ Calls NestJS API for product and business operations
  └─ Uses Supabase Realtime only where explicitly required

NestJS API (main business/data boundary)
  ├─ Authenticated controllers and domain services
  ├─ Drizzle query layer for PostgreSQL
  ├─ Hunt/sync scheduler and durable worker
  ├─ Source adapter interface (one adapter per permitted source)
  ├─ AI provider adapter, retrieval, ranking, and evaluation support
  ├─ Admin operations and audit APIs
  └─ Stripe/webhook integrations only if billing remains in scope

Supabase PostgreSQL
  ├─ Canonical user profile and preferences
  ├─ Source records, sync runs, observations, and normalized opportunities
  ├─ User-specific matches, saved state, and feedback
  ├─ RLS, constraints, indexes, functions, and migrations
  └─ pgvector for embeddings only if semantic search is used

External services
  ├─ Permitted job APIs/feeds/datasets (source-specific policy and rate limits)
  └─ Local model or verified no-cost AI allowance, server-side and disclosed to users
```

**Cost constraint:** All external-service choices in this architecture must meet the user's zero-out-of-pocket requirement. The diagram does not authorize paid APIs, Actors, model calls, proxies, storage, hosting, or workflow services. Treat free allowances as bounded test capacity, add hard usage ceilings, and provide local/fixture fallbacks. Do not make an always-on ingestion or AI-quality promise that cannot be sustained for $0.

**Data access recommendation:** Make the NestJS API the main boundary for business logic and ordinary database operations. Keep Supabase client usage in the browser for Auth/session behavior and deliberate Realtime use. Do not leave business writes arbitrarily split between browser and API.

**ORM/migrations recommendation:** Use Drizzle in the API for typed query access. For the first refactor, keep the existing Supabase SQL migration directory as the authoritative migration history because it already contains provider-specific policies/functions/triggers. Do not create a second competing migration history. Decide later whether the team can safely standardize the whole migration workflow on a single Drizzle-generated SQL history; that migration decision requires a reviewed plan and clean-database verification.

**Worker recommendation:** Start with a small durable PostgreSQL-backed job worker/scheduler to avoid adding Redis before it is needed. Use explicit locking/leases, retries, idempotency, and state transitions. BullMQ/Redis is a valid later choice if deployment or throughput requires it, but it adds an operational dependency and should be justified.

## 4. Priority definitions

- **P0 — Trust/safety blocker:** Do before presenting the system as a real job-discovery product or exposing the relevant flow to users.
- **P1 — Core correctness:** Required for a reliable end-to-end workflow and a credible demo.
- **P2 — Refactor/quality:** Needed to simplify the codebase, document it, and support measured development.
- **P3 — Optional/deferred:** Keep only if it serves the chosen problem and there is enough time to implement and verify it.

The priority of a security issue is not reduced because it appears only in a secondary feature. If a feature remains accessible, its authorization and data handling must be safe.

## 5. Prioritized fix backlog

### A. Product scope and truthful data — P0

#### A1. Remove synthetic jobs from the real hunt path

**Implementation status (2026-10-27):** In progress. The hunt endpoint now accepts only the explicit `demo` source and returns fixed Pakistan-oriented sample fixtures with `data_origin: demo_fixture`, null source URLs, and visible demo labels. The hunt path no longer calls Groq or Apify. n8n callback ingestion currently returns 503 and does not persist data. Two forward migrations enforce the demo source/provenance contract, but they have not been applied or database-tested. Automated API tests/build pass; web production compilation and TypeScript pass, while prerender is blocked by absent Supabase public environment values. See the progress tracker for exact check outcomes and the remaining local database/manual checks. This is not a live job discovery feature.

**Review finding:** When `N8N_WEBHOOK_URL` is absent, `ScrapesService` uses `runLocalAgent()`, which calls `lead-generator.ts` and asks Groq for realistic synthetic listings while hiding that fact. Generic platform search URLs are used instead of specific listing URLs. Optional Apify use replaces at most one Reddit result. The review found the n8n workflow is not versioned in this repository and the aggregator/validator utilities appear unused in the active path.

**Fix:**

- Remove the concealment instruction and stop using generated records as production or real-source results.
- If generated fixtures remain for a demo, mark every record `demo`/`synthetic` in the database and UI, use a deterministic fixture file, and never give it a “verified” label.
- Build a source adapter only for a source that is permitted and reproducible. Start with one real source; add others after the first is working and documented.
- If n8n remains part of the system, commit an exported/versioned workflow, its schemas, setup instructions, callback contract, and local test fixture. Otherwise remove the undocumented runtime dependency and put the worker logic in the repo.
- Remove or wire up `lead-aggregator.ts` and `lead-validator.ts`; do not leave multiple apparent implementations without a clear owner.

**Likely files:** `apps/api/src/modules/scrapes/scrapes.service.ts`, the n8n workflow export (if retained), `apps/api/src/modules/webhooks/*`, UI hunt/result components, shared types/schemas, SQL migrations, `README.md`, `SYNOPSIS.md`, deployment docs.

**Acceptance:** Every visible result is traceable to an actual permitted source record or visibly labeled demo data. Every real result has a source, original URL, and retrieval time. No prompt requests fabricated real-world listings or asks the system to conceal synthetic provenance.

#### A2. Bound the first release's source coverage

**Fix:** Publish a source register listing each source, access method, what fields are collected, sync frequency, data-retention approach, and operational limitations. Limit the product claim to those sources. Do not promise “all jobs” or continuous collection from sites without verified access.

**Acceptance:** An evaluator can see which sources are live, fixture, unavailable, or planned, and can reproduce the live source path using documented credentials/setup.

#### A3. Choose one product workflow and defer scope that dilutes it

**Keep in core:** profile/preferences, job ingestion, freshness/provenance, deduplication, matching/ranking, evidence-based explanations, saving/feedback, and operations/admin visibility.

**Defer or explicitly mark optional:** employer candidate sourcing, freelancer marketplace discovery, generic networking, chat, generic profile/bio/resume writing, multi-tier billing, advanced social features, and unrelated notification types. Do not combine opposite marketplace roles in the evaluated FYP unless each has a separate requirement, data flow, and evaluation.

**Acceptance:** The README, synopsis, UI labels, and demo describe the same primary user and the same implemented workflow.

### B. Continuous ingestion and job reliability — P0/P1

#### B1. Implement source adapters and normalized ingestion

Use a contract similar to:

```ts
interface OpportunitySourceAdapter {
  sourceKey: string;
  search(criteria: HuntCriteria, cursor?: string): Promise<SourcePage>;
  normalize(item: unknown): NormalizedOpportunity;
}
```

The adapter should be isolated from the scheduler and AI. Validate source responses, apply per-source rate limits, record failures clearly, and avoid coupling a source's schema to the shared UI model.

#### B2. Record provenance and observations

Suggested conceptual records (names may change after schema review):

- `sources`: source key, display label, connector enabled state, configured sync policy (never store secret values here).
- `source_sync_runs`: source, run/job ID, started/finished time, status, pages/items, retry count, error category, duration.
- `opportunities`: canonical normalized listing, source-independent fields, current freshness/status.
- `opportunity_observations`: source ID, source item ID, canonical URL, fetched time, content hash, raw/normalized evidence subject to permitted retention, extraction version.
- `hunt_runs` / `hunt_run_results`: user request criteria and which opportunities were returned for that run.
- `user_opportunity_state`: saved/hidden/applied/rejected state and user-specific notes/feedback.

Do not create duplicate concepts just because the current names are `scrape_results` and `leads`. Decide whether “lead” means a discovered job, a saved job, or a contact. Model that meaning explicitly and migrate existing data deliberately.

#### B3. Normalize, validate, and deduplicate

- Preserve the original source identifier where available.
- Canonicalize URLs without discarding meaningful query parameters required to reach a listing.
- Use a unique source identity such as `(source_id, external_listing_id)` when the source provides one.
- Use a normalized URL/content fingerprint as a fallback, not as an unquestioned cross-source identity.
- Treat fuzzy cross-source duplicates as candidates for merging; retain separate source observations and URLs.
- Store `first_seen_at`, `last_seen_at`, `posted_at` if provided, and `last_checked_at` separately.
- Represent source-specific unknowns as `NULL`/unknown. Do not infer salary, employer, location, application URL, or availability without evidence.
- Make stale/closed/unknown a distinct status. Do not imply that a listing is still active because it exists in the database.

#### B4. Make scheduled work durable, cancellable, and idempotent

Replace fire-and-forget execution with a durable lifecycle. Minimum states: `queued`, `running`, `completed`, `failed`, `cancel_requested`, `cancelled`. Keep run attempts, leases/heartbeats, timestamps, and a safe error summary.

- The scheduler enqueues source syncs according to source-specific allowed schedules.
- Workers claim jobs atomically and recover abandoned leases after a crash.
- Retries use bounded attempts and backoff; permanent failures go to a visible terminal state.
- Use an idempotency key for every callback/event and a unique database constraint for source records.
- Enforce state transitions in one service/domain layer. A late callback must not resurrect a cancelled or superseded run.
- If n8n callbacks remain, require a production secret/signature, verify it in constant time where applicable, reject malformed/replayed events, and durably record the event before acknowledging it.
- A cancellation endpoint must signal the worker/source job and prevent later writes, not merely change a status column.
- Write result records and terminal job state transactionally when they share the same database. For external side effects, use a durable outbox/event pattern or a clearly documented retry-safe sequence.

**Acceptance:** Replaying an event does not add duplicates; a crash/restart does not silently lose or misreport work; cancellation remains terminal; every run can be inspected in Admin.

#### B5. Schedule syncs without pretending to cover the whole web

Provide per-source configuration for sync interval, last success, and disabled/error state. Use cursors/incremental updates when the source supports them. Add freshness policy and expire/archive behavior. Avoid excessive fetches and store no more source content than the product needs and is allowed to retain.

**Acceptance:** The product can truthfully describe its sync interval per supported source. Admin shows the actual last run and status. A failed sync does not make an old listing appear freshly verified.

### C. Canonical data model and ORM — P1

#### C1. Establish one canonical user professional profile

**Review finding:** `profiles` and `user_profiles` have overlapping responsibilities; scorer reads `profiles` fields, while Profile API/settings edit `user_profiles` resume/target roles/skills.

**Fix:** Define one canonical profile/preferences contract. Decide which fields belong to identity/account versus career profile. Migrate the necessary data with a new SQL migration, update all API/UI consumers, then remove or deprecate the duplicate model only after verifying references and migration safety.

**Acceptance:** Profile editing, filtering, scoring, RAG, and display all use the same validated profile source. No job score uses stale or unrelated profile fields.

#### C2. Clarify opportunity/listing lifecycle

Decide and document canonical distinctions among a source listing, a source observation, a hunt result, and a user's saved/application state. Avoid auto-creating a user “lead” for every result if that makes “save” meaningless. Add constraints to prevent duplicate per-user saves and duplicate source records.

#### C3. Choose one usage and plan source of truth

The review finds `usage`, `usage_events`, `plans`, API constants, shared `PLAN_LIMITS`, and service-specific counters all influencing limits.

Choose one design:

- If monetization is out of FYP scope, remove/disable subscription gates and keep only operational AI/job counters needed for cost and evaluation.
- If quotas remain, make `plans` (or a clearly selected configuration) authoritative, use an append-only usage event ledger plus one derived counter policy, and define how corrections/reconciliation work.

Enforce every quota operation atomically in Postgres or a transaction. Hunt, AI, lead/saved listing creation, and callback paths must use the same operation. Never use a read/check/write sequence that can lose concurrent increments. Decide whether system-created records consume quota and make it consistent.

**Acceptance:** Concurrent requests cannot exceed a quota through a race. Callback-created data follows the same quota semantics. Dashboard counts agree with the source of truth.

#### C4. Adopt Drizzle in the NestJS API deliberately

- Create Drizzle schema definitions for the canonical app-owned tables and typed query/repository providers.
- Use Drizzle in the API's business-data paths; keep Supabase JS for Auth/Realtime features that need it.
- Keep existing SQL migrations as the migration source of truth initially; all Drizzle schema changes must be reconciled with SQL migrations and migration checks.
- Keep Supabase-specific functions, triggers, RLS policies, and extensions in reviewed SQL migrations unless there is a clear tested reason to express them in ORM schema.
- Avoid browser direct CRUD paths for core business actions. If a direct RLS-scoped read remains, document why and test its policy.
- Choose the Supabase Postgres connection mode appropriate to the deployed Nest process (persistent worker vs short-lived/serverless); size pools, configure SSL, and keep DB credentials server-only.
- Separate privileged/admin DB access from user-scoped operations. The existing Supabase service-role operations bypass RLS; with Drizzle/postgres this must be addressed by explicit authorization and ownership predicates or a deliberate user-scoped role. An ORM does not provide authorization automatically.

**Acceptance:** Clean database migration and API startup work from documented configuration. A normal user cannot access another user's records through either API or any retained direct browser path.

### D. AI, retrieval, and RAG — P1

#### D1. Define AI's responsibility

AI must operate on verified/user-provided opportunity data. It may extract structured fields, produce embeddings, rank or rerank candidates, and explain matches. It must not create a purported real employer, role, salary, location, URL, deadline, or job status.

#### D2. Make profile extraction reviewable

If AI extracts skills/experience from a resume/profile:

- Return schema-validated fields plus supporting text spans from the user's source document.
- Let the user review/confirm edits before these values affect recommendations.
- Keep explicit distinction between user-confirmed, machine-extracted, and inferred data.
- Do not invent years of experience, skills, employers, education, or accomplishments.
- Minimize the profile data sent to an external model; disclose provider use and obtain appropriate user consent.
- Define retention and account deletion behavior for resumes, prompts, generated content, logs, and provider-side state.

#### D3. Build a hybrid matching pipeline with a baseline

Recommended ordered pipeline:

1. Apply deterministic hard filters where the user's requirement is explicit (location, work type, seniority, dates, salary floor if supplied).
2. Use keyword/structured feature matching for role, skills, experience, and preferences.
3. Optionally add semantic retrieval via embeddings for vocabulary differences.
4. Optionally rerank a limited candidate set with an LLM.
5. Generate an explanation only from the actual listing and confirmed profile evidence; return citations/field references and abstain when evidence is absent.

Start with a transparent rule-based baseline. Do not jump to fine-tuning, multi-agent workflows, or a separate vector database without data and measured need. Since Supabase Postgres can support pgvector, use it if semantic retrieval earns its complexity; otherwise keyword + structured ranking may be a better first version.

#### D4. Implement the RAG feature as a product feature, not a chatbot badge

Potential user-facing capability: ask questions about the user's retrieved/saved opportunities (for example, compare two roles, find listings requiring a skill, identify a stated requirement gap). Retrieve only listings the user is authorized to see plus the user's confirmed profile context. Answer with source URLs and supporting excerpts. If retrieval returns no support, say that the available data does not answer the question.

Retrieved listing text is untrusted content. Treat it as data, not instructions. Do not let retrieved text change system rules, invoke tools, or trigger external side effects. Validate outputs and encode them safely before display or email.

#### D5. Add AI evaluation, versioning, and operational safeguards

- Build a human-labeled profile/listing relevance dataset; define labels and annotation guidance.
- Compare rule-based baseline, semantic/hybrid ranking, and optional LLM reranking on the same held-out examples.
- Report useful ranking metrics such as precision@k/recall@k and NDCG@k, plus unsupported-explanation rate, retrieval evidence coverage, freshness, user-rated usefulness, latency, and cost.
- Include representative, edge, and adversarial examples. Record sample size and limitations honestly.
- Version model/provider, embedding model, prompt/template, ranking config, extraction schema, and evaluation dataset.
- Track token/cost/latency and provider failure/rate limits. Do not expose secrets or log raw resume/message text by default.
- Validate structured model output and handle refusal, malformed response, timeout, quota/rate limit, and provider outage.
- Ensure user feedback is measured without assuming that clicks alone mean relevance.

**Acceptance:** The FYP can answer: What is the baseline? What data was labeled? How was relevance judged? What changed in the metric? What are the known failure cases? What does a score mean?

### E. Security, privacy, and authorization — P0

#### E1. Fix and test contact submission access

**Review finding:** The checked-in contact-submissions migration appears to grant `authenticated` SELECT rather than admin-only access.

**Fix:** Review grants and effective RLS policies for anonymous insert, normal authenticated access, admin reads, and service access. Restrict contact inbox reads to the intended admin/service role. Do not assume an admin API guard protects a separate Supabase Data API path.

**Acceptance:** An ordinary authenticated user cannot query another person's contact submission directly. Tests exercise the database policies, not just the admin UI.

#### E2. Restrict notification writes and reads

**Review finding:** Notification INSERT policy uses `WITH CHECK (true)` despite a policy name implying service-only access.

**Fix:** Inspect table grants and effective policies. Restrict insertion to the intended trusted server role; scope read/update/delete to the notification owner; test every operation as anonymous, ordinary user, and service/admin role.

#### E3. Protect private conversations and messages

**Review finding:** Realtime broadcast uses `private: false` for `conversation:<id>` topics while sending message contents.

**Fix:** Configure private channel authorization and verify conversation membership server-side/database-side before subscribing or publishing. Do not rely on UUID secrecy. Test that a nonparticipant cannot receive a message event. If privacy cannot be proven, disable message-content broadcast until it can.

#### E4. Require webhook authentication and safe replay handling

**Review finding:** `N8N_WEBHOOK_SECRET` appears optional; an unset secret leaves callback authentication absent.

**Fix:** Fail production startup or reject callback requests if the secret/signature configuration is missing. Authenticate requests, validate schema, bound payload sizes, use idempotency IDs, reject stale/invalid state transitions, and durably record the event. Never log the secret, signature, full sensitive body, or authorization header.

#### E5. Escape user-controlled email content

**Review finding:** User-controlled contact/reply text is interpolated into HTML in the Edge Function and admin reply flow.

**Fix:** Use context-aware HTML escaping or a safe template system. Treat all user- and model-generated content as untrusted. Keep plain text alternatives where appropriate. Test HTML/script payloads.

#### E6. Apply server-side authorization consistently

- Every controller and admin operation must enforce authorization on the server, per request and per object.
- Ownership checks are required for all service-role/privileged queries because they bypass RLS.
- Do not rely on route hiding or frontend role state.
- Restrict admin privileges to the minimum necessary. A single admin role may be adequate for the FYP, but its actions still need explicit authorization checks and audit entries.
- Add negative tests for user A reading/updating/deleting user B's records, including guessed IDs and direct API access.

#### E7. Protect secrets, profile data, and account deletion

- Keep Supabase service-role, DB, AI, Stripe, and callback secrets server-side; never pass them in web build arguments or public env variables.
- Identify what profile/resume fields are sent to which AI provider, for what purpose, and with what retention.
- Define deletion for profile, saved jobs, generated content, message history, AI inputs/outputs, usage events, and billing/customer linkage.
- Avoid logging access tokens, passwords, full resume contents, payment details, or complete prompts containing sensitive user data.
- Define log/event retention and data export/deletion behavior.
#### E8. Triage dependency vulnerabilities (P1-12)

**Review finding (2026-11-22):** GitHub reports 185 vulnerabilities on the default branch (18 critical, 72 high, 87 moderate, 8 low). These are dependency CVEs (direct and transitive), not code defects found by inspection.

**Fix:** Inspect the Dependabot/security-advisory list; categorize by whether the vulnerable code path is reachable at runtime in this project; upgrade to a free, non-breaking version where one exists; document accepted risk for anything that cannot be remediated under the $0 constraint without a breaking change.

**Likely files:** root and workspace `package.json` files, `pnpm-lock.yaml`, Dockerfiles.

**Acceptance:** No critical/high vulnerability remains in a runtime-reachable path without a dated, documented acceptance reason in the progress tracker.

### F. Admin module — P1

Keep the admin module, but make it the operations and audit console for Outsauce rather than unrelated CRUD/counts.

#### F1. Admin capabilities

- **Source health:** active/disabled state, last attempted/successful sync, rate-limit/error category, duration, items fetched, and stale coverage.
- **Job operations:** hunt/sync states, retries, worker heartbeat, progress, cancel request/result, and safe error detail.
- **Data quality:** duplicate candidates, missing canonical URL, missing source evidence, suspicious/invalid fields, stale/closed rates, and reported results.
- **AI operations:** model/prompt/ranking version, evaluation results, user feedback aggregates, unsupported-output rate, latency, provider errors, and cost. Restrict access to content-level data.
- **User support:** account state, user-reported issue, and limited account actions. Avoid general access to private content unless a specific support need and authorization model justify it.
- **Audit trail:** actor, action, target ID/type, timestamp, result, and reason for privileged changes. Make audit events append-only to application roles and sanitize stored values.

#### F2. Admin data boundaries

- Do not interpret “record everything” as collecting all content. Store operational/security events needed for troubleshooting, evaluation, and accountability.
- Do not show secrets, passwords, access tokens, full resumes, or private messages in generic admin tables/logs.
- Use redacted summaries and IDs for routine diagnostics. If sensitive support access is ever needed, define explicit permission, justification, access logging, and retention.
- Admin UI is not an authorization boundary. Protect every admin API route and database operation.
- Admin actions that suspend users, change roles, delete data, change connectors, or reprocess jobs must be audited and tested.

**Acceptance:** An examiner can diagnose why a source/job failed and see the relevant audit trail without seeing unrelated users' private data.

### G. Feature contracts and product correctness — P1/P2

#### G1. Fix AI generation enum mismatch

**Review finding:** `AiToolsService.generateOutreach()` writes `outreach_message`, while the `ai_tool_type` enum documented by the migration includes `bio`, `resume`, `cover_letter`, `gig_description`, and `profile_summary` only.

**Fix:** Decide whether outreach generation remains. If yes, add a forward migration for the enum (confirm Postgres enum migration compatibility and generated/shared types) and test successful persistence. If deferred, remove the UI/API exposure and history write path. Never edit an already-applied migration as the fix.

#### G2. Make export format contracts truthful

**Review finding:** DTO accepts PDF but service falls back to text and returns a `.txt` file.

**Fix:** Either implement valid PDF output with MIME type/extension and content test, or remove PDF from accepted schema/UI/docs. JSON, CSV, and text should each have explicit format branches.

#### G3. Repair notification event coverage or narrow claims

**Review finding:** README suggests more notification categories than the API inserts.

**Fix:** Choose the events that support the primary user journey. Implement and test each claimed event (job complete, relevant new listing, etc.) or narrow UI/README to the events actually produced. Avoid spamming users; define preferences and deduplication if notifications remain.

#### G4. Rework network discovery if retained

**Review findings:** Current matching uses case-sensitive in-memory array overlap and loads candidate profiles before pagination; recipient IDs may be targeted even when not discoverable.

**Fix:** Defer networking if it is out of core scope. If retained, implement normalized/database-side matching, proper pagination, discoverability and block rules, rate limits, and ownership checks; verify claimed indexes and performance against realistic data.

#### G5. Align messaging status claims and behavior

**Review finding:** UI/API wording implies sent/delivered/read transitions while read state appears to use participant `last_read_at` rather than message-level delivery/read transitions.

**Fix:** Either implement and test the advertised state model or simplify the product language and schema to the actual supported semantics. Make realtime access private before exposing messages.

### H. Configuration, deployment, and documentation — P1

#### H1. Create one environment-variable contract

**Review findings:** API requires `SUPABASE_URL` while root `.env.example` only has `NEXT_PUBLIC_SUPABASE_URL`; active AI uses Groq while example advertises Gemini and Docker passes Anthropic variables; Stripe code expects `STRIPE_PRICE_*` but example uses `STRIPE_*_PRICE_ID`; `DEPLOY.md` refers to a missing `.env.production.example`.

**Fix:**

- Inventory every `process.env`, Deno env lookup, Docker variable, CI variable, and deployment setting.
- Pick one provider/config naming scheme and remove stale names from templates/compose/docs.
- Add required API variables to the correct server-only template; distinguish browser-public vars by explicit prefix.
- Make configuration validation fail at startup with a concise list of missing required variables.
- Put secrets in deployment secret storage, not files committed to Git or Docker build arguments.
- Add a documented `.env.example` that works for the supported local configuration, with safe placeholders and optional integration groups.
- Either create the referenced production template or correct the docs.

**Acceptance:** A clean clone can follow one documented setup path. The same documented provider/model is used by app config, Docker, and examples.

#### H2. Make the main workflow reproducible

- Provide a local Supabase migration/reset path and deterministic seed/demo data.
- Provide one command or a short, tested sequence to start database, API, worker, and web app.
- Clearly distinguish required services from optional AI/source/Stripe integrations.
- Provide predictable mock adapters for tests and demo when external credentials are absent; mock data is visibly labeled in UI.
- Ensure production deployment does not silently switch from real source collection to synthetic listings.

#### H3. Correct docs to match implementation

Update `README.md`, `SYNOPSIS.md`, `CLAUDE.md`, `DEPLOY.md`, `MIGRATIONS.md`, diagrams, UI copy, and demo script. For every feature label as implemented, external, demo-only, or planned. Remove unsupported claims about sources, notifications, PDF, profile matching, auth, and production readiness.

#### H4. Repair stale tests and test scripts

**Review finding:** `apps/api/test/app.e2e-spec.ts` expects `GET /` to return `Hello World!`, while API uses global `/api` and review found no root controller.

**Fix:** Replace the stale assertion with tests for real documented health/API endpoints, or remove it if there is no intended root route. Do not keep green-looking tests that test a removed contract.

### I. Verification and quality strategy — P0/P1

Tests are part of the fix plan because the review found key behaviors unverified. Add tests only after the corresponding behavior/contract is defined.

#### I1. Unit tests

- Source normalization and malformed response handling.
- URL canonicalization, field evidence, and deterministic deduplication.
- Hunt/job state transition rules, retry/backoff decisions, cancellation, and idempotency.
- Profile normalization and ranking feature calculations.
- AI structured-output parsing, abstention, invalid model output, and prompt-injection-like listing text handling.
- Quota logic if quotas remain.

#### I2. Database integration tests

- Apply migrations to a clean local Supabase/Postgres database.
- Test constraints and duplicate prevention.
- Test RLS as anonymous, normal user A, normal user B, and admin/service context.
- Test contact submission and notification access explicitly.
- Test conversation participant authorization for Realtime.
- Test atomic quota consumption under concurrent requests if quotas remain.

#### I3. End-to-end tests for the central workflow

At minimum: user profile → initiate hunt → source fixture/live adapter → normalized listing with provenance → dedupe → AI/rule ranking → result shown → user feedback/save → admin can inspect the run. Include source failure, duplicate replay, cancellation, and unauthorized user attempts.

#### I4. External integration tests

- Use controlled test doubles for AI, Stripe, email, and source APIs in normal CI.
- Add a separate opt-in smoke test for live integrations, never required for a clean default CI run.
- Validate Stripe webhook signature/replay if billing remains.
- Verify provider timeout, rate limits, malformed responses, and unavailable secrets do not create fake success records.

#### I5. CI/release gates

Run documented install, typecheck, lint, build, unit/integration/e2e tests, migration validation, and secret scanning in CI. This plan does not claim any of these have been run.

**Acceptance:** A reviewer can clone the repo, configure documented placeholders, start the local stack, reset/migrate, run deterministic tests, and follow the main workflow without undocumented manual edits.

### J. FYP research, evaluation, and portfolio evidence — P1

#### J1. Validate the problem

- Define target cohort: job seekers, with supported profile/job categories explicitly stated.
- Conduct and document appropriate interviews/survey/usability sessions before claiming the problem is validated.
- Describe current workflow and pain points without relying only on team assumptions.
- Write requirements and acceptance criteria linked to the central workflow.

#### J2. Define evaluation before optimizing AI

Suggested research question:

> Does evidence-grounded hybrid ranking improve top-k opportunity relevance for profile-based job seekers compared with a transparent rule-based baseline?

Define labeling instructions, pair/listing dataset, train/dev/test separation if applicable, and metrics before selecting a model. Consider precision@k, recall@k, NDCG@k, unsupported explanation rate, stale listing rate, user-rated usefulness, task completion time, latency, and cost. Choose the metrics that answer the question; do not claim a metric improved without actual results. Report sample size, participant recruitment, limitations, and possible bias.

#### J3. Produce examiner/interviewer evidence

- Architecture and data-flow diagrams matching the refactored code.
- A data-source register with allowed access method and limitations.
- A short demo showing real provenance and clear error/empty states.
- Evaluation protocol, anonymized labels/data where permitted, scripts, results, and limitations.
- Security tests/results for ownership, RLS, admin access, and webhook replay.
- Operational admin screenshots showing sync status and AI evaluation without exposing private content.
- Resume bullets with actual measured results only.

### K. Observability and production behavior — P2

- Use structured logs with interaction/job IDs, route/module, outcome, and safe error categories.
- Separate operational logs, security events, analytics, and audit trails by purpose and access control.
- Redact tokens, passwords, keys, connection strings, full resume content, and private messages.
- Establish retention limits and a deletion process for logs/events.
- Track worker health, queue/job latency, source failures, API error rates, AI latency/cost, and database pool usage.
- Avoid logging the full prompt/response by default; store version IDs, bounded metadata, and redacted evidence needed for evaluation.

## 6. Suggested implementation sequence

This is an order of work; it is not a statement that the work is complete.

### Phase 0 — Freeze scope and audit current branch

1. Confirm the primary user and target workflow.
2. Inventory current routes, migrations, env variables, integration ownership, and all direct database access.
3. Decide which features are retained, deferred, or removed from the FYP demo.
4. Confirm source access before implementing any connector.
5. Write acceptance criteria and the evaluation question.

**Exit gate:** One page describing product scope, source register, architecture decision, and verified current-state inventory.

### Phase 1 — Restore truth and safety

1. Stop synthetic data from appearing as real results; introduce visibly labeled fixtures.
2. Resolve or disable the unauthenticated callback path.
3. Fix contact, notifications, and message broadcast access.
4. Escape user-controlled email content.
5. Fix env contract and startup validation.
6. Fix enum/PDF/test contract mismatches or remove those feature claims.

**Exit gate:** No known critical misleading-data path; exposed sensitive data paths have a defined access policy and tests.

### Phase 2 — Implement one durable real-source pipeline

1. Add source adapter interface and one permitted real connector.
2. Create durable sync/job lifecycle and worker.
3. Record provenance/observations and normalize data.
4. Add uniqueness/idempotency, freshness, retries, and cancellation behavior.
5. Integrate Admin source/run health view.

**Exit gate:** Clean local demo and a repeatable source run show original URL, retrieval time, status, and no duplicate on replay.

### Phase 3 — Consolidate domain/data access

1. Decide canonical profile and listing lifecycle.
2. Design forward migrations and data backfill/rollback plan.
3. Introduce Drizzle query layer in NestJS and move one module at a time.
4. Consolidate usage/plan logic or remove it from scope.
5. Migrate core browser CRUD to API or justify each RLS-scoped direct read/write.

**Exit gate:** Main workflow uses one validated profile and one defined data path; migrations reset from a clean database.

### Phase 4 — Add evaluated AI/RAG

1. Build baseline matcher and label dataset.
2. Add semantic retrieval only if it improves measured retrieval quality.
3. Add evidence-grounded reranking/explanations and optional RAG Q&A.
4. Add output validation, abstention, prompt/version tracking, and privacy controls.
5. Compare model approach with baseline and record results/limitations.

**Exit gate:** Reproducible evaluation report with actual values; UI explanation cites available evidence.

### Phase 5 — Finish admin, testing, docs, and FYP package

1. Complete operational/admin/audit functions with least privilege.
2. Add integration and workflow security tests.
3. Reconcile README/synopsis/deployment/demo with actual behavior.
4. Validate clean setup and demo without undocumented external workflow.
5. Prepare FYP report, evaluation results, demo, architecture diagrams, and honest resume bullets.

**Exit gate:** An independent reviewer can reproduce and understand the central workflow and its measured limitations.

## 7. Definition of done for the refactor

Do not call Outsauce refactored or FYP-ready until all applicable criteria below are met:

### Product/data truth

- [ ] One primary audience and one central problem are stated consistently.
- [ ] Live, external, fixture, and planned sources are clearly distinguished.
- [ ] No synthetic data is presented as a real opportunity.
- [ ] Every real listing can show its source, canonical URL, retrieval time, and freshness state.
- [ ] Source coverage and collection frequency claims match actual adapters and source rules.

### Workflow/backend

- [ ] Hunt/sync jobs persist across restart and expose meaningful states.
- [ ] Retries, callbacks, cancellation, and dedupe are idempotent and tested.
- [ ] Core data has one canonical profile and opportunity lifecycle.
- [ ] One migration authority and one documented setup path exist.
- [ ] API ownership checks protect every privileged service-role/database operation.
- [ ] Admin can diagnose a failed run without broad access to user private data.

### AI/evaluation

- [ ] AI uses real/user-provided evidence and can abstain.
- [ ] Structured output is validated; prompt/version/model metadata is recorded safely.
- [ ] Baseline and labeled evaluation are reproducible.
- [ ] Claims about relevance, quality, time saved, or improvement cite measured results.
- [ ] User data sent to model providers and retention/deletion behavior are disclosed.

### Security/quality

- [ ] Contact, notifications, and conversations have tested effective policies.
- [ ] Webhook auth is mandatory in production and replay is safe.
- [ ] User-controlled HTML is escaped.
- [ ] Secrets are server-side and absent from client bundles/logs.
- [ ] No critical/high dependency vulnerability remains runtime-reachable without a documented acceptance decision.
- [ ] Clean migration, typecheck, lint, build, and relevant tests pass in the documented environment.
- [ ] Stale feature claims and tests are removed or corrected.

### FYP/portfolio

- [ ] Problem/user validation and evaluation method are documented.
- [ ] The project has a concise demo of the core journey and a reproducible data setup.
- [ ] Limitations and unsupported sources are stated openly.
- [ ] Resume bullets use actual verified metrics and do not claim unimplemented features.

## 8. Explicit non-goals for the first refactor

- Do not scrape every job on every website or promise a universal job index.
- Do not scrape a source merely because its public page is visible; verify permitted access and data use first.
- Do not keep fabricated listings hidden inside real-looking results.
- Do not add LangChain, agents, fine-tuning, a second vector database, Redis, or microservices purely as résumé keywords. Add a component when the problem and measured need justify it.
- Do not treat a large feature count, Stripe integration, or animation as evidence of FYP quality.
- Do not claim AI ranking is better until the baseline comparison is complete.
- Do not treat the admin page as a substitute for authorization, RLS, or audit testing.
- Do not log or expose every user datum just because an admin module exists.

## 9. Interview and FYP narrative after verified completion

**Problem:** Job seekers spend too much effort searching multiple sources and manually assessing fit.

**Solution:** Outsauce collects from a bounded set of permitted sources, records provenance and freshness, removes duplicates, and ranks opportunities against each user's confirmed profile with evidence-based explanations.

**AI contribution:** Compare a transparent baseline with semantic/hybrid ranking and RAG answers grounded in actual listings and profile evidence. Report measured quality and failure cases.

**Backend contribution:** Build durable scheduled ingestion, source adapters, idempotency/retry/cancellation, normalized Postgres data, secure ownership boundaries, and an admin operations/audit console.

This narrative is valid only after the described behaviors are implemented and verified. Until then, describe them as planned work.

## 10. References and repository documents

- `PROJECT_CRITICAL_REVIEW.md` — detailed source-based critique and examiner questions.
- `PROJECT_KNOWLEDGE.md` — repository inventory, architecture, flows, migrations, and known drift.
- Supabase Postgres connection guidance: <https://supabase.com/docs/guides/database/connecting-to-postgres>
- Supabase semantic search / pgvector: <https://supabase.com/docs/guides/ai/semantic-search>
- NestJS queues: <https://docs.nestjs.com/techniques/queues>
- OWASP Authorization Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html>
- OWASP Logging Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html>
- OpenAI evaluation best practices (general evaluation principles; not a requirement to use OpenAI models): <https://developers.openai.com/api/docs/guides/evaluation-best-practices>

