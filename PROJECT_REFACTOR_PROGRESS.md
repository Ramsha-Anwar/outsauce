# Outsauce Refactor Progress Tracker

**Last updated:** 2026-11-22  
**Overall status:** Implementation status remains as last evidenced on 2026-10-27: M1 / PR-01 (demo-only hunts) and PR-01B (P1-09–P1-11 contract fixes) are implemented and locally verified. PR-01 documentation cleanup (SYNOPSIS) and the pre-existing web lint baseline (61 errors / 29 warnings, deferred to PR-01C) remain open. This revision aligns ownership and sequencing with the revised execution plan; it does not record new code work or verification.  
**Budget constraint:** $0 out-of-pocket. No paid Actor runs, model/API usage, proxies, hosting, storage, or workflow upgrades; free allowances are usable only with hard spend caps and no overage/auto-upgrade.  
**Source of truth for fixes:** [`PROJECT_REFACTOR_FIX_PLAN.md`](PROJECT_REFACTOR_FIX_PLAN.md)  
**PR and milestone sequence:** [`PROJECT_REFACTOR_EXECUTION_PLAN.md`](PROJECT_REFACTOR_EXECUTION_PLAN.md)  
**Baseline review:** [`PROJECT_CRITICAL_REVIEW.md`](PROJECT_CRITICAL_REVIEW.md)  
**Repository map:** [`PROJECT_KNOWLEDGE.md`](PROJECT_KNOWLEDGE.md)

> Update this file as work is completed. A task is not `Done` because it was discussed, planned, or demoed once. Mark it `Done` only after the implementation is present and the listed verification/evidence is recorded. The prior critical review was source inspection and did not run the project; this tracker does not imply that the app has been run.
>
> **Planning alignment:** `PROJECT_REFACTOR_FIX_PLAN.md` remains the requirements authority; `PROJECT_REFACTOR_EXECUTION_PLAN.md` owns PR sequencing and implementation boundaries. This tracker records actual implementation status and evidence. A fix-plan item split across PRs remains incomplete until every required part is verified.

## Status key

- `Not started` — no implementation work recorded.
- `In progress` — implementation is underway; add a short note and date.
- `Blocked` — work cannot proceed; state the exact dependency or decision needed.
- `Done` — implementation and verification are complete; link tests, commits, screenshots, or other evidence.
- `Deferred` — intentionally excluded from the current FYP/release scope; record why and who agreed.

## Agreed direction to track against

- Primary evaluated user: **job seekers**.
- Job categories/preferences should be profile-driven; the product is not limited to AI/backend jobs.
- Start with a defined, reproducible set of permitted job sources. “Always on” means scheduled source-specific updates, not scraping every job site continuously.
- Preserve source provenance and freshness; do not present synthetic/demo records as real listings.
- AI/RAG should retrieve, rank, and explain evidence from real or user-provided listings; it must not invent jobs or unsupported profile facts.
- Keep the admin module as the operations, data-quality, AI-evaluation, and audit console.
- Refactor toward a clear NestJS API/data boundary. Drizzle is the proposed API ORM; existing SQL migrations remain authoritative initially unless a reviewed migration decision changes this.
- Keep total project spend at $0. A free plan is not assumed safe until its exact usage ceiling is verified and overage/auto-upgrade is disabled; if hosting/provider usage cannot be guaranteed free, use a local demo or defer that feature.
- PR ownership follows the execution plan: PR-02 secures the inbound callback contract; PR-07 owns durable job/worker lifecycle. PR-06 owns the first opportunity list/detail experience; PR-08 owns save/application/feedback actions. PR-07 supplies minimum run operations; PR-09 extends broader Admin source/data-quality/audit operations.

## Current baseline

| Area | Status | Evidence / notes |
|---|---|---|
| Repository knowledge document | Present | `PROJECT_KNOWLEDGE.md` documents architecture, flows, file inventory, and known drift. |
| Critical review | Present | `PROJECT_CRITICAL_REVIEW.md` records source-based critique and explicitly says the project was not run during that review. |
| Refactor fix plan | Present | `PROJECT_REFACTOR_FIX_PLAN.md` contains the detailed backlog, phases, and definition of done. |
| Application-code fixes | Verified locally | PR-01 makes hunts deterministic demo fixtures only; removes Groq/Apify from the hunt path; labels samples; rejects live-source requests; disables n8n callback with 503; updates UI/docs and adds migrations/tests. PR-01B adds the `outreach_message` enum migration, removes the fake PDF contract, and replaces the stale root e2e with the real health/404 contract. Verified on 2026-10-27 against a disposable local Supabase DB and the running API/UI. No live source is enabled. |
| Runtime/test verification | Verified locally | Baseline and current-slice checks are recorded below. All 20 migrations apply from a clean `supabase db reset`; demo/live/callback/export/health HTTP paths and the hunt UI were exercised. Web lint remains at 61 errors / 29 warnings (deferred to PR-01C); the web production build has not been re-run with local env values. |
| Git baseline | Recorded | Branch `refactor/ui-overhaul`; baseline HEAD `d520314`. User committed PR-01 as `0d6a8cb` and a local-notes `.gitignore` rule as `031a2ed`. PR-01B changes are uncommitted; the agent never stages, commits, or pushes. |
| Source-access decisions | In progress | Pakistan-first. The user requires $0 spend; no Actor is selected or enabled. Apify/n8n is only a candidate direction, not an approved implementation. Actor billing, site access, and hard spending controls are unreviewed. PR-06 remains gated on a documented source GO/NO-GO review; if no source passes, its first browse experience must remain fixture-backed and clearly labeled. |
| Evaluation dataset/protocol | Not decided | Need a labeled profile/listing dataset and agreed metrics before making AI-quality claims. |

## Work backlog

### Phase 0 — Scope, evidence, and design decisions

| ID | Work item | Priority | Status | Completion evidence / notes |
|---|---|---:|---|---|
| P0-01 | Confirm the FYP problem statement and primary user requirements with target job seekers. | P0 | Not started | Record interview/survey method, findings, and resulting requirements. |
| P0-02 | Define initial job categories, geography/work modes, and which profile fields influence matching. | P0 | Not started | Approved scope and acceptance criteria; keep profile-driven matching bounded by available data. |
| P0-03 | Choose initial source(s); document access method, permission/policy review, fields, refresh schedule, and retention. | P0 | Not started | Source register with a reproducible test path. |
| P0-04 | Decide which existing features remain in the FYP core versus deferred (employer, freelancer, networking, chat, Stripe, generic AI writing). | P1 | Not started | Scope decision recorded in this file and reflected in project docs/UI. |
| P0-05 | Approve the FYP research question, labeled-data approach, metrics, and user evaluation plan. | P1 | Not started | Protocol written before tuning the AI ranker. |
| P0-06 | Confirm migration ownership: SQL migrations remain canonical initially; decide how Drizzle schema/query code will stay aligned. | P1 | Not started | Architecture decision record plus clean migration verification plan. |

### Phase 1 — Truthful data, security, and setup blockers

| ID | Work item | Priority | Status | Completion evidence / notes |
|---|---|---:|---|---|
| P1-01 | Remove synthetic generation from the real hunt path; explicitly label deterministic demo fixtures. | P0 | Done | Fixed `demo` fixtures, live-source rejection, `data_origin: demo_fixture`, and visible sample labels. Verified 2026-10-27: API tests 4 suites/12 tests; local Supabase migrations applied; DB rows show `source=demo`, null URL, `demo_fixture`, null score, 0 auto-created leads; live source returns 400; callback returns 503; browser shows demo banner/“Demo sample”/“Not scored”. |
| P1-02 | Resolve the missing/unversioned n8n workflow: commit/document and secure it, or remove it in favor of repository-contained work. | P0 | In progress | **PR-02 boundary:** establish the reviewed workflow/configuration and inbound callback security contract, or keep the callback disabled. The callback is currently disabled with HTTP 503; no n8n workflow is enabled or checked in. Final workflow/source decision remains open. Durable execution/retry lifecycle is PR-07 (P2-07), not PR-02. |
| P1-03 | Make production webhook authentication mandatory; validate payload, idempotency, size, replay, and job-state transitions. | P0 | In progress | **PR-02:** authenticate and validate the inbound callback, enforce payload size/schema, define event identity/replay behavior, and safely reject requests when unconfigured. Callback currently rejects all requests with 503 before persistence; this is a safety disablement, not a completed authenticated callback contract. **PR-07 / P2-07:** own durable job-state transitions, atomic/retry-safe persistence, and prevention of cancelled/terminal jobs being resurrected. Do not mark this item Done until both boundaries and their tests are complete. |
| P1-04 | Correct contact-submission RLS/grants so ordinary authenticated users cannot read the inbox. | P0 | Not started | Review policies and grants against anon, user, and service-role access. |
| P1-05 | Restrict notification inserts to the intended trusted role and scope user operations to owner. | P0 | Not started | Verify grants and owner checks for notification reads/writes. |
| P1-06 | Make conversation broadcasts private and authorize participants; disable message broadcast until verified. | P0 | Not started | Verify channel privacy and participant authorization. |
| P1-07 | Escape user-controlled contact/reply content in email HTML. | P0 | Not started | Escape untrusted content and verify support-email rendering. |
| P1-08 | Unify environment-variable names across code, `.env.example`, Docker, CI, and deployment docs. | P1 | Not started | **PR-02.** Audit AI, Supabase, Stripe, n8n, and source-connector configuration; keep secrets out of workflow exports and logs. |
| P1-09 | Fix AI `outreach_message` enum mismatch or remove/defer the feature cleanly. | P1 | Done | Kept the feature and added forward migration `20261027000003_add_outreach_tool_type.sql` (`ALTER TYPE public.ai_tool_type ADD VALUE IF NOT EXISTS 'outreach_message'`); already-applied enum migration untouched. Verified 2026-10-27 on a clean `supabase db reset`: enum range now ends with `outreach_message`; a real `INSERT INTO ai_generations (tool_type) VALUES ('outreach_message')` succeeded and was deleted. The live AI call itself remains untestable without a paid `GROQ_API_KEY` ($0 budget), so only the persistence contract is proven. No generated Supabase types are checked in, so there was nothing to regenerate. |
| P1-10 | Implement actual PDF export or remove PDF from accepted formats and UI/docs. | P1 | Done | Chose removal. `exportLeadsSchema` now accepts only `csv`/`json`; the unreachable plain-text fallback that produced `.txt` under a PDF request was replaced by an explicit `BadRequestException`; README no longer claims PDF (3 places). Verified 2026-10-27: `format: "pdf"` → `400` “Expected 'csv' \| 'json'”; CSV → `201`, `text/csv`, `.csv` filename with correct comma/newline quoting; JSON → `201`, `application/json`, `.json` filename; 9 new unit tests (DTO + service). The unused `export_format` DB enum still lists `pdf`; dropping an enum value is destructive and it is referenced by no table, so it was left alone. |
| P1-11 | Replace stale API e2e expectation for the unregistered `GET /` route. | P1 | Done | `test/app.e2e-spec.ts` now boots `AppModule` with the real `api` global prefix and asserts the documented contract: `GET /api/health` → `200` `{status:'ok', timestamp}` and `GET /` → `404`. Verified 2026-10-27: `pnpm --filter @outsauce/api test:e2e` → 1 suite / 2 tests pass; live API confirmed `200` and `404`. |
| P1-12 | Triage and remediate dependency vulnerabilities reported by GitHub security advisories. | P1 | Not started | 185 alerts as of 2026-11-22 (18 critical, 72 high, 87 moderate, 8 low). Triage before PR-02. |

### Phase 2 — Ingestion pipeline and background work

| ID | Work item | Priority | Status | Completion evidence / notes |
|---|---|---:|---|---|
| P2-01 | Define a source-adapter contract and implement the first permitted real source. | P0 | Not started | **PR-06.** Hard prerequisite: documented source GO decision covering permitted access, fields, rate limits, refresh, retention, $0 cost, and reproducible test access. If no source passes, implement only a fixture-backed contract/browse slice and label it as fixture/demo; do not imply live ingestion. |
| P2-02 | Create durable scheduled sync/hunt jobs with explicit states, retries, leases/heartbeats, cancellation, and safe error records. | P0 | Not started | **PR-07.** PostgreSQL-backed job/worker lifecycle initially unless M0 records a different justified decision; verify restart/retry/cancel and minimum Admin run state. |
| P2-03 | Add source provenance and observation history (source ID, source listing ID, URL, fetched time, content hash, evidence/version). | P0 | Not started | Database/API/UI test demonstrates traceability. |
| P2-04 | Normalize and validate listing fields; keep unknown fields unknown and reject unsupported claims. | P0 | Not started | Fixtures for missing/malformed source fields. |
| P2-05 | Add idempotent deduplication by source identity/URL with safe cross-source duplicate handling. | P1 | Not started | Replayed and cross-source fixture tests; original source observations retained. |
| P2-06 | Implement freshness/stale/closed/unknown states and source-specific refresh policy. | P1 | Not started | UI/admin show last checked and status; failed sync cannot falsely refresh a listing. |
| P2-07 | Make callbacks and persistence atomic or safely retryable; prevent cancelled jobs from being resurrected. | P0 | Not started | **PR-07 (lifecycle owner), consuming PR-02's authenticated/validated callback contract.** Define durable state transitions and transactional/idempotent processing; add transaction, replay, retry, worker-crash, and cancellation-race checks. PR-02 does not implement a second worker lifecycle. |
| P2-08 | Decide Postgres-backed worker vs BullMQ/Redis based on deployment needs; avoid unneeded infrastructure. | P1 | Not started | **PR-07.** Prefer the simplest PostgreSQL-backed worker unless measured deployment needs justify additional infrastructure; record the decision and operational setup. |

### Phase 3 — Canonical data model and backend boundary

| ID | Work item | Priority | Status | Completion evidence / notes |
|---|---|---:|---|---|
| P3-01 | Consolidate `profiles` / `user_profiles` into one canonical career profile contract. | P1 | Not started | Migration/backfill plan; settings, ranking, and RAG read the same confirmed fields. |
| P3-02 | Define listing, observation, hunt result, saved state, and application outcome as separate or intentionally unified concepts. | P1 | Not started | Domain model and constraints documented; “save” has a clear meaning. PR-04 owns canonical domain/profile concepts; PR-08 owns user save/application state and actions. |
| P3-03 | Move core business/database operations behind NestJS API; justify any remaining browser direct data access. | P1 | Not started | Route/data-flow map; ownership/RLS tests. Split by surface: PR-04 profile API/screen; PR-06 opportunity browse/list/detail API/screen; PR-08 save/application/feedback APIs and user actions. |
| P3-04 | Introduce Drizzle query layer in NestJS without creating conflicting migration histories. | P1 | Not started | Typed repositories, aligned SQL migrations, clean schema verification. |
| P3-05 | Consolidate `plans`, `usage`, `usage_events`, API/shared limits, and counters—or defer quotas/billing. | P1 | Not started | One source of truth; concurrency and callback-path tests if quotas remain. |
| P3-06 | Review DB connection mode, pool sizing, SSL, and server-only credential handling for API/worker deployment. | P1 | Not started | Deployment config and connection behavior documented. |
| P3-07 | Review auth, route guards, object ownership predicates, and service-role query filters across every module. | P0 | Not started | Authorization matrix and negative user A/user B tests. |

### Phase 4 — AI, RAG, and measurable contribution

| ID | Work item | Priority | Status | Completion evidence / notes |
|---|---|---:|---|---|
| P4-01 | Implement a transparent rule-based matching baseline. | P1 | Not started | Versioned ranking rules and deterministic evaluation output. |
| P4-02 | Build a human-labeled profile/listing relevance dataset and annotation guide. | P1 | Not started | Dataset provenance, labels, split, sample size, and limitations documented. |
| P4-03 | Add semantic retrieval/embeddings only if justified; use Supabase pgvector if it meets needs. | P2 | Not started | Retrieval metrics and model/version tracked. |
| P4-04 | Add grounded AI reranking/explanations with field evidence and abstention on missing evidence. | P1 | Not started | Output schema, citations/evidence, adversarial and malformed-output tests. |
| P4-05 | Add user-facing RAG over authorized opportunity/profile evidence (e.g. compare roles or ask about requirements). | P2 | Not started | Answers cite source/listing evidence; no-answer behavior tested. |
| P4-06 | Track provider/model, prompt, embedding, schema, and ranker versions plus safe cost/latency/error metadata. | P1 | Not started | Admin metrics; secrets and raw sensitive content excluded. |
| P4-07 | Compare AI/hybrid ranking with baseline; report actual ranking, grounding, freshness, latency, cost, and user feedback results. | P1 | Not started | Reproducible evaluation report; no unverified “improves relevance” claim. |
| P4-08 | Define profile/resume consent, provider data disclosure, retention, and deletion behavior. | P0 | Not started | User-facing notice and deletion/retention tests. |

### Phase 5 — Admin, product contracts, and deferred modules

| ID | Work item | Priority | Status | Completion evidence / notes |
|---|---|---:|---|---|
| P5-01 | Rework Admin into source/job health, data quality, AI evaluation, support, and audit views. | P1 | Not started | Split ownership: **PR-07** delivers only the minimum run list/detail/status/failure/retry/cancel operations needed to operate the durable worker. **PR-09** extends this with broader source management, data-quality summaries, evaluation, support, and audit views. One run lifecycle and one set of run controls only. |
| P5-02 | Add append-only admin audit events for role/source/job/user/data actions. | P1 | Not started | Actor/action/target/time/result/reason test; normal users cannot read or alter audit trail. |
| P5-03 | Define admin roles/permissions and enforce checks server-side on every operation. | P0 | Not started | Direct API and object-level authorization tests. |
| P5-04 | Align notification feature claims to events actually implemented; add relevant events only if they support core workflow. | P2 | Not started | UI/docs and event tests agree. |
| P5-05 | Decide whether networking and messaging are retained; if yes, fix discoverability, matching, pagination, and status semantics. | P2 | Not started | Scope decision plus tests; otherwise mark deferred and remove misleading claims. |
| P5-06 | Decide whether Stripe/subscription tiers remain in FYP scope; otherwise remove/deactivate quota gates cleanly. | P2 | Not started | Scope decision; if retained, signature/replay/quota/payment tests. |

### Phase 6 — Verification, reproducibility, and FYP delivery

| ID | Work item | Priority | Status | Completion evidence / notes |
|---|---|---:|---|---|
| P6-01 | Add unit/integration tests for adapters, normalization, dedupe, job state, retries, cancellation, and idempotency. | P0 | Not started | CI results linked below. |
| P6-02 | Add Supabase/Postgres RLS and cross-user authorization tests. | P0 | Not started | Test matrix with anon, user A, user B, and admin/service contexts. |
| P6-03 | Add end-to-end profile → hunt → source → stored opportunity → rank → user action → Admin workflow. | P1 | Not started | Reproducible local test/demo script and CI result. |
| P6-04 | Add deterministic external-service mocks; separate optional live integration smoke tests. | P1 | Not started | CI works without live provider credentials. |
| P6-05 | Make clean clone, environment setup, migration/reset, seed, and demo instructions reproducible. | P1 | Not started | Independent setup record; no tribal edits required. |
| P6-06 | Update README, synopsis, deployment docs, UI labels, architecture/data-flow diagrams, and demo to match code. | P1 | Not started | Claims mapped to implemented/external/demo/planned status. |
| P6-07 | Complete user/problem validation, FYP evaluation, results, limitations, and ethics/privacy discussion. | P1 | Not started | Final report artifacts linked below. |
| P6-08 | Prepare resume bullets and interview demo only from verified features/results. | P2 | Not started | Resume statements checked against evidence/metrics. |
| P6-09 | Clear the web lint baseline (61 errors / 29 warnings → 0/0) without behaviour change. | P2 | Not started | `pnpm --filter @outsauce/web lint` must return 0/0; web build and API tests must still pass. |
## Open decisions / dependencies

Update this list when decisions are made; do not treat unresolved scope as implemented work.

| Decision | Current state | Decision / date / rationale |
|---|---|---|
| Project spend ceiling | Decided: $0 out-of-pocket | User confirmed 2026-10-27. No paid usage or upgrades. Free allowances must be usage-capped with overage/auto-upgrade disabled; use local or defer if a zero-cost guarantee is unavailable. |
| Initial real job sources and access method | Candidate review underway; zero-cost condition added | User is considering Apify via n8n but requires $0 out-of-pocket. Paid per-result Actors are excluded unless covered entirely by a no-cost allowance with hard spend controls. Pakistan-specific Rozee Actors look more region-aligned than broad Google Jobs Actors, but the selected Actor, source access/terms, reliability, fields, and free-limit behavior remain unapproved. Rozee's terms page did not establish a scraping grant; robots.txt could not be verified with the available browser. |
| Initial supported regions/job categories | Partly decided | Pakistan-first confirmed 2026-10-27. Job categories are profile-driven across fields. Need to define Pakistan locations, remote/in-country/overseas work modes, and first supported categories. |
| Source-specific sync frequency and retention | Open |  |
| FYP target user recruitment and evaluation dataset | Open |  |
| Features deferred from core FYP scope | Partly decided | Admin is retained; disposition of chat, networking, Stripe, and generic AI writing still needs an explicit decision. |
| Durable worker implementation choice | Proposed: Postgres-backed initially |  |
| Database migration authority | Proposed: existing SQL migration history initially |  |
| Whether billing/Stripe remains in scope | Proposed deferred | Paid transactions/subscription billing do not fit the $0 project constraint or core FYP scope; disable/defer Stripe unless a no-cost, non-transactional demo need is explicitly established. |
| AI inference / embeddings provider | Open, constrained to $0 | Prefer local deterministic/rule-based ranking and local models; any free hosted allowance needs hard usage caps, no chargeable overage, and current verification. No paid model/API calls. |
| Whether networking/messaging remains in scope | Open |  |
| Staging deployment at the halfway gate | Conditional on verified free capacity | Vercel + Render staging remains a target only if the exact workload stays free, has hard spend/overage controls, and requires no paid upgrade. Otherwise keep the integrated demo local; no charge to meet the milestone. |

## PR ownership and completion boundaries

This table mirrors the revised execution plan. It is an implementation map, not evidence that any of these future PRs have started.

| PR | Fix-plan coverage / responsibility | Tracker rule |
|---|---|---|
| PR-00 | P0 decisions and baseline | Record scope, source feasibility, migration ownership, and the actual baseline before dependent implementation. |
| PR-01 | P1-01 and truthful demo-only hunt behavior | Already recorded as implemented/verified in the 2026-10-27 evidence below. |
| PR-01B | P1-09–P1-11 API contract fixes | Already recorded as implemented/verified in the 2026-10-27 evidence below. |
| PR-01C | Remaining PR-01 documentation cleanup and web lint baseline work | Still open; do not fold it into PR-02. |
| PR-02 | P1-02, P1-03 (callback transport/security portion), P1-08 | Own callback authentication, payload validation/size, event identity/replay boundary, safe disabled behavior, workflow/configuration decision. No worker leases/retries/cancellation lifecycle. |
| PR-03 | P1-04–P1-07 and P3-07 | Own browser data safety and authorization review/tests. |
| PR-04 | P3-01, P3-02/P3-03 profile/domain portion, P3-05 | Own canonical profile/domain model and profile editing surface. |
| PR-05 | P3-03–P3-04 data/ORM boundary | Own incremental Drizzle query layer while SQL migrations remain authoritative initially. |
| PR-06 | P0-03, P2-01, P2-03–P2-06 | Own source feasibility gate, first permitted/fixture-backed source slice, provenance, normalization, dedupe, freshness, and the first/only initial opportunity list/detail surface. |
| PR-07 | P2-02, P2-07–P2-08, minimum P5-01 | Own durable job/worker lifecycle and the minimum Admin run operations; consume PR-02's secured callback contract. |
| PR-08 | P0-02, P0-04, P3-02/P3-03 user-action portion | Own save/unsave, application tracking, and feedback on PR-06 opportunities. Do not duplicate profile or opportunity list/detail screens. |
| PR-09 | P5-02–P5-06 and broader P5-01, plus P3-07 as sequenced | Extend Admin with source/data-quality/evaluation/audit operations; do not create a second run lifecycle or duplicate PR-07 controls. |
| PR-10–PR-11 | P4-01–P4-08 in staged baseline/semantic sequence | AI evaluation and optional semantic/RAG work follows a labeled dataset/protocol and a measured baseline; no unsupported quality claims. |
| PR-12 | P6-01–P6-08 | Release readiness and resume claims only from verified features/results. |

**Split-item rule:** P1-03, P3-02/P3-03, and P5-01 span more than one implementation boundary. Keep the relevant sub-work visible in the notes and do not mark the whole fix-plan item `Done` until all required portions and evidence are complete.

## Verification log

Record commands/checks and outcomes. Include environment (local/CI), date, and link to logs or commit where possible. A code edit without verification stays `In progress`.

| Date | Work IDs | Check performed | Result | Evidence link / notes |
|---|---|---|---|---|
| 2026-10-27 | M0 | `pnpm install --frozen-lockfile` | Completed successfully; lockfile remained unchanged. | Registry access was approved. Install emitted pnpm warnings that build scripts for `@nestjs/core`, `msw`, `sharp`, and `unrs-resolver` were ignored. |
| 2026-10-27 | M0 | `pnpm --filter @outsauce/api test -- --runInBand` | Passed: 1 suite, 6 tests. | Local unit suite; no live services required. |
| 2026-10-27 | M0 | `pnpm --filter @outsauce/api build` | Passed. | Nest production build. |
| 2026-10-27 | M0 | `pnpm --filter @outsauce/web lint` | Failed: ESLint reports 65 errors and 29 warnings. | Existing baseline across the web app; examples include explicit-any, React effect rules, and unescaped JSX text. No source changes were made. Re-measured 2026-10-27 after PR-01: **61 errors / 29 warnings** (26 unescaped entities, 26 explicit `any`, 8 set-state-in-effect, 1 JSX comment, 29 unused vars) across 29 of 98 files; the drop is from deleting two files, not from fixes. Deferred to PR-01C. |
| 2026-10-27 | M0 | `pnpm --filter @outsauce/web build` | Failed during prerender after compilation and TypeScript passed. | Build needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; no local env file/credentials were present. Do not put secrets in the repo. |
| 2026-10-27 | M0 | Source inspection: scrape service, Apify helper, n8n/webhook modules, migrations, health controller/e2e test. | Confirmed architectural concerns; no application executed during baseline. | At baseline, hunt could create synthetic Groq listings and optionally replace one with an Apify Reddit result; n8n workflow was absent. Health endpoint is `/api/health`, while current e2e expects `GET /`. |
| 2026-10-27 | M0 | Official Apify pricing and terms pages | Checked current plan description and general terms. | Free plan shows $5 monthly usage, with free-plan blocking after allowance; exact Actor and target-site rules still require separate review. [Pricing](https://apify.com/pricing); [terms](https://docs.apify.com/legal/general-terms-and-conditions). |
| 2026-10-27 | M0 | Candidate-source review: Rozee.pk Actors vs Google Jobs Actor | Shortlist only; no connector approved or run. | A Rozee-focused Actor is Pakistan-aligned and advertises pay-per-result pricing, but one candidate has very low adoption/no rating and another advertises residential proxies. A Google Jobs candidate costs $25/1,000 rows on the Free plan. Apify states Store Actor terms are between the user and Actor creator; Rozee's terms and site access still need review. See candidate listings: [Rozee candidate A](https://apify.com/listingworks/rozee-scraper), [Rozee candidate B](https://apify.com/parsebird/rozeepk-jobs-scraper), [Google Jobs candidate](https://apify.com/crawl_craft/google-job-scraper), [Apify terms](https://docs.apify.com/legal/general-terms-and-conditions), [Rozee terms](https://www.rozee.pk/site/termsConditions). |
| 2026-10-27 | M1 / PR-01 | `pnpm --filter @outsauce/api test -- --runInBand` | Passed: 4 suites, 12 tests. | Includes deterministic fixture filtering/provenance, demo/live source exclusion, live source rejection before DB access, and disabled webhook assertion. No DB-backed or HTTP test. |
| 2026-10-27 | M1 / PR-01 | `pnpm --filter @outsauce/api build` | Passed. | API production TypeScript build. |
| 2026-10-27 | M1 / PR-01 | `pnpm --filter @outsauce/shared lint` | Passed. | Shared package TypeScript check. API DTO still has its own matching Zod schema; shared package is not wired as an API dependency. |
| 2026-10-27 | M1 / PR-01 | `pnpm --filter @outsauce/web build` | Failed after successful compilation and TypeScript validation, during static prerender. | Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; no local values were available. Build initially exposed an unresolved shared-package import; the UI now uses local source options, and the latest run compiled/typechecked before the env-dependent prerender failure. |
| 2026-10-27 | M1 / PR-01 | `pnpm --filter @outsauce/web lint -- <changed files>` | Failed: 31 errors, 9 warnings across the touched-file set. | Existing file-level issues include `any`, React effect rules, and unescaped JSX text. No automatic lint fixes were run. Resolve separately or document baseline before claiming lint clean. |
| 2026-10-27 | M1 / PR-01 | `npx supabase start` then `npx supabase db reset` on disposable local Supabase | Passed. 19 public tables; `scrape_source` enum includes `demo`; migrations `20261027000001` and `20261027000002` recorded as applied. | Local Docker stack; no hosted DB touched. |
| 2026-10-27 | M1 / PR-01 | `POST /api/scrapes` with `sources:["demo"]` using an authenticated local test user | `201`; job `completed`; `result_count: 2`. | Demo fixtures persisted immediately; no external provider called. |
| 2026-10-27 | M1 / PR-01 | `POST /api/scrapes` with `sources:["linkedin"]` | `400` with “Live job sources are not connected yet. Choose Demo listings…” | Live-source rejection before DB access. |
| 2026-10-27 | M1 / PR-01 | `POST /api/webhooks/n8n/results` with `{}` | `503` | Callback ingestion disabled; no payload persisted. |
| 2026-10-27 | M1 / PR-01 | SQL provenance check on two local hunts | 3 result rows: all `source=demo`, `source_url` null, `metadata.data_origin=demo_fixture`, `fit_score` null; `leads` count for both hunts = 0. | Confirms no real-looking rows and no auto-created leads. |
| 2026-10-27 | M1 / PR-01 | Browser walkthrough (user): signup → onboarding → new demo hunt → detail | Hunt completed; UI shows “Demo listings”, demo disclaimer, “Demo sample”, “Not scored”; no save/apply/AI action shown. | Screenshot shared in session; not committed. Local Node v24.14.1. |
| 2026-10-27 | M1 / PR-01B | `pnpm --filter @outsauce/api test` | Passed: 6 suites, 23 tests. | Adds `export.dto.spec.ts` (4) and `export.service.spec.ts` (5) to the previous 12. |
| 2026-10-27 | M1 / PR-01B | `pnpm --filter @outsauce/api build` | Passed. | Nest production build after the export type change. |
| 2026-10-27 | M1 / PR-01B | `pnpm --filter @outsauce/api test:e2e` | Passed: 1 suite, 2 tests. | `GET /api/health` → 200 contract; `GET /` → 404. |
| 2026-10-27 | M1 / PR-01B | `npx supabase db reset` (all 19 migrations from scratch) | Passed; `20261027000003_add_outreach_tool_type.sql` applied cleanly. | Clean-install proof; local data was discarded. |
| 2026-10-27 | M1 / PR-01B | `select enum_range(null::public.ai_tool_type)` | `{bio,resume,cover_letter,gig_description,profile_summary,outreach_message}` | Enum value present after migration. |
| 2026-10-27 | M1 / PR-01B | Real `INSERT INTO public.ai_generations (user_id, tool_type, …) VALUES (…, 'outreach_message', …)` then delete | Insert succeeded (`INSERT 0 1`), row read back, then deleted (`DELETE 1`). | P1-09 persistence contract proven at the DB level. The Groq call itself was **not** exercised: no paid key under the $0 budget. |
| 2026-10-27 | M1 / PR-01B | `POST /api/export/leads` with `format: "pdf"` | `400` — “format: Invalid enum value. Expected 'csv' \| 'json', received 'pdf'”. | Fake PDF claim removed at the API boundary. |
| 2026-10-27 | M1 / PR-01B | `POST /api/export/leads` with `format: "csv"` and `"json"` for a real lead | CSV `201`, `text/csv`, `.csv` filename, comma and newline correctly quoted; JSON `201`, `application/json`, `.json` filename. | Regression check after deleting the text fallback. Test lead deleted afterwards. |
| 2026-10-27 | M1 / PR-01B | Live `GET /api/health` and `GET /` | `200` `{status:'ok',timestamp}`; `404`. | Matches the new e2e contract. |

### Manual checks for M1 / PR-01 — completed 2026-10-27

Run against a disposable local Supabase database with the local API on port 3001 and an authenticated local test user. Results are recorded in the verification log above.

```powershell
# The result should create a completed hunt using only visibly marked demo fixtures.
curl.exe -i -X POST http://localhost:3001/api/scrapes `
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  --data-binary "@demo-body.json"

# The result should be HTTP 400; live sources are not enabled.
curl.exe -i -X POST http://localhost:3001/api/scrapes `
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  --data-binary "@live.json"

# The result should be HTTP 503 and must not persist callback data.
curl.exe -i -X POST http://localhost:3001/api/webhooks/n8n/results `
  -H "Content-Type: application/json" `
  -d "{}"
```

Use JSON files for request bodies on PowerShell; inline quoting corrupted the payload during the first attempt. In the UI, the result cards showed “Demo sample” / “Not scored”, the sample-data notice, and no save/tailor actions.

## Change log

| Date | Update |
|---|---|
| 2026-10-16 | Created initial tracker. Recorded the existing review/knowledge/plan documents, agreed product direction, backlog, open decisions, and the fact that implementation and runtime verification had not started at that point. |
| 2026-10-27 | Started M0 baseline. Recorded branch/commit and preserved existing untracked planning documents. Installed dependencies and passed baseline API checks. Web lint failed on 65 errors/29 warnings; web build compiled/typechecked but could not prerender without Supabase public config. Compared Pakistan-focused Rozee Actors with Google Jobs; no connector approved. |
| 2026-10-27 | Added user's hard $0 out-of-pocket constraint to plan and tracker. Deployment, AI, and ingestion must use verified capped free allowances or local alternatives; no paid usage/upgrade. |
| 2026-10-27 | Started M1 / PR-01 demo-only hunt slice. Removed Groq/Apify from hunt flow, added deterministic clearly identified demo results and DB constraints, disabled n8n callback, updated UI/README/knowledge map, and added focused tests. API tests (12), API build, and shared typecheck passed; web compiles/typechecks but prerender needs local Supabase values. Migrations and authenticated HTTP demo remain pending; no commits or pushes were made. |
| 2026-10-27 | Verified M1 / PR-01 locally: local Supabase started and reset (19 tables, `demo` enum), demo hunt completed via UI and API, live source rejected with 400, callback returned 503, DB rows confirmed demo provenance/null URL/no score/no auto-created leads. Marked P1-01 `Done`. Web lint baseline and PR-01 documentation cleanup remain open; no commits or pushes were made. |
| 2026-10-27 | User committed PR-01 locally as `0d6a8cb` and a `.gitignore` rule for local planning notes as `031a2ed`. Planning documents stay untracked by choice; README truth-fixes were included. |
| 2026-10-27 | Completed M1 / PR-01B: added forward migration `20261027000003_add_outreach_tool_type.sql` (P1-09), removed the fake PDF contract and its text fallback plus README claims (P1-10), and replaced the stale `GET /` e2e with the real health/404 contract (P1-11). API tests 6 suites/23 tests, API build, and e2e 2 tests pass; clean `db reset` applies all 19 migrations; live checks confirmed pdf → 400, csv/json → 201, health → 200, root → 404. Marked P1-09–P1-11 `Done`. Web lint (61 errors / 29 warnings) deferred to PR-01C; no commits or pushes were made. |
| 2026-11-21 | Aligned this tracker with the revised execution plan: clarified PR-02/PR-07 callback-versus-worker ownership, PR-06/PR-08 discovery-versus-user-actions ownership, and PR-07/PR-09 minimum-versus-broader Admin ownership. Added the PR ownership ledger and source GO/NO-GO gate. No repository implementation, tests, commits, or deployment were performed as part of this documentation update; all work-item statuses and evidence remain as last recorded on 2026-10-27. |
| 2026-11-22 | Recorded P1-12 (dependency vulnerability triage) and P6-09 (web lint cleanup, PR-01C). PR-01C to be done before PR-02. |

## How to update this tracker

For each work session:

1. Update the relevant row status and add a brief progress note.
2. Record files/migrations changed and any important decision.
3. Record verification commands and their actual outcomes; do not say tests passed if they were not run.
4. Move unresolved dependencies to **Open decisions / dependencies** or mark the affected task `Blocked` with the exact reason.
5. Update the last-updated date and append one line to the change log.
6. If implementation changes the intended architecture or product scope, update `PROJECT_REFACTOR_FIX_PLAN.md` too so the plan and tracker do not diverge.

