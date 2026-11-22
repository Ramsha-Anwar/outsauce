# Outsauce Refactor Execution Plan

**Status:** M0 baseline recorded; M1 / PR-01 demo-only hunt implementation is in progress. See [`PROJECT_REFACTOR_PROGRESS.md`](PROJECT_REFACTOR_PROGRESS.md) for current evidence.  
**Product/backlog source of truth:** [`PROJECT_REFACTOR_FIX_PLAN.md`](PROJECT_REFACTOR_FIX_PLAN.md)  
**Progress and evidence ledger:** [`PROJECT_REFACTOR_PROGRESS.md`](PROJECT_REFACTOR_PROGRESS.md)  
**Repository map:** [`PROJECT_KNOWLEDGE.md`](PROJECT_KNOWLEDGE.md)

This document turns the approved direction and backlog into a sequence of reviewable milestones and pull requests. It is designed for an existing GitHub repository with existing code, migrations, UI, and history. It does not assume that the current implementation has been run or that any proposed architecture has already been selected.

**Alignment rule:** `PROJECT_REFACTOR_FIX_PLAN.md` remains the requirements authority. This execution plan may clarify sequencing and split implementation ownership, but it must not create new product requirements or silently change a fix-plan ID's meaning. Where one fix-plan item spans more than one PR, the split and the evidence boundary must be explicit below and reflected in the progress tracker.

## 1. Product target and working rules

The target is a profile-aware job discovery product for job seekers across job families. Its core path is:

```text
Career profile → permitted job-source sync → validated, deduplicated opportunities
→ evidence-based ranking → save/track/feedback → Admin operations and evaluation
```

**Hard budget constraint:** The user requires the project to cost **$0**. Do not recommend or enable any paid API, Actor run, model call, database/storage tier, hosting plan, proxy, domain, workflow service, or monitoring product. “Free tier” is acceptable only after checking that the specific planned usage stays within its current free allowance and cannot trigger overage or a charge; do not add a payment method or enable auto-upgrade. Prefer local/self-hosted and deterministic options where practical. If a required feature cannot meet the $0 constraint, present a genuinely zero-cost alternative or ask the user to choose a scope reduction before implementing it. Track expected external usage and actual spend as $0; stop any experiment before it can incur a charge. Recheck provider terms/limits at implementation and deployment time because free allowances can change.

The project should retain useful parts of the existing Next.js UI and NestJS/Supabase code, while replacing misleading or unsafe behavior in small, tested steps. Do not rebuild everything at once. Keep chat, networking, Stripe, and generic AI writing out of the core path unless a recorded scope decision retains them.

Working rules:

1. `PROJECT_REFACTOR_FIX_PLAN.md` owns the requirements and fix IDs. This file orders implementation; it must not silently change those requirements.
2. `PROJECT_REFACTOR_PROGRESS.md` owns current status and evidence. Update it in every PR that changes implementation or decisions.
3. Code and migrations are the authority for actual behavior. Update `PROJECT_KNOWLEDGE.md` when a merged PR changes the architecture, file responsibilities, API/data flow, or setup.
4. Every PR has one bounded objective, references fix-plan IDs, includes tests and manual API steps, and is independently reviewable.
5. Keep a working source/API/UI path at each milestone. Do not merge a migration that cannot be applied to a clean local database and safely upgraded from the agreed baseline.
6. Do not claim a source is permitted, an integration works, a metric improved, or a feature is complete without the evidence listed for it.
7. Never commit credentials, user data, real resumes, provider responses containing personal data, or Postman environment secrets.
8. **The user owns all Git history and remote operations.** The assistant must not stage, commit, push, merge, rebase shared history, create/update/close PRs, or run equivalent GitHub operations. At each PR checkpoint, provide the exact commands for the user to inspect and run themselves. Do not run those commands on the user's behalf. Deployment steps are planned separately and must be explicitly agreed with the user.
9. **Deliver user-facing features as complete vertical slices.** A feature is not complete when only its schema, API, or service is done. Its PR must include the working frontend screen/interaction, loading/empty/error states, authorization, automated checks, and manual demo steps. Pure infrastructure PRs (such as adding Drizzle plumbing) may have no new screen, but must not leave a promised user feature half-wired.
10. **Use AI as an assistant, not as evidence.** No numerical hallucination probability is assumed. Every claim about the repository, API, source permissions, integration, tests, deployment, and metrics must be checked against code or recorded evidence. The assistant labels facts, assumptions, and unknowns separately and reports unverified work plainly.
11. **Keep transport security separate from durable job orchestration.** PR-02 owns whether an incoming callback is authenticated, bounded, validated, and safely rejected/accepted. PR-07 owns durable job state, worker claims, leases, retries, cancellation, and recovery. PR-02 must not implement a second worker lifecycle; PR-07 must reuse the callback contract established in PR-02.
12. **Keep source discovery separate from the rest of the job-seeker workflow.** PR-06 owns the first source-backed opportunity pipeline and the first usable browse/list/detail experience. PR-08 owns user-specific actions and lifecycle after discovery (save/unsave, application tracking, and feedback), not a second opportunity list/detail implementation.

## 2. Repository, branch, PR, and conflict workflow

### Before the first implementation PR

1. Inspect `git status`, current branch, remotes, default branch, recent history, and open PRs. Confirm the GitHub repository is the expected one. Do not assume the local branch is current or that `main` is the target branch.
2. Preserve any user changes already in the working tree. Do not use `git reset --hard`, force-push, or broad restore commands as a shortcut.
3. Agree on the base branch and merge policy. Create a dedicated refactor integration branch from the latest approved base only after checking for uncommitted work.
4. Record the starting commit in the progress file. Save a baseline snapshot of current routes, migrations, environment variables, UI flows, and the checks that currently pass or fail.
5. Protect the default branch. Make every implementation change in a short-lived PR branch; merge only after automated and manual checks pass.

### Branch and commit conventions

- Suggested PR branches: `codex/refactor/m0-baseline`, `codex/refactor/m1-truth-security`, and so on. Adapt to the repository's branch rules; never overwrite an existing branch without checking its owner and work.
- Keep commits focused, for example `docs: record source access decision`, `fix(api): reject unsupported source results`, `test(api): cover hunt callback retries`.
- A commit should build on its own where practical. Avoid bundling unrelated UI, schema, AI, and formatting changes.
- Prefer a merge strategy that preserves the team's review policy. Do not rewrite shared branch history after review begins.

### User-run Git commands

After implementation and verification are complete, provide a tailored command block and wait for the user to run it. Never execute these commands for the user. Before suggesting them, inspect and report the branch/status and exact changed paths; the user should review the staged diff before committing.

Typical user-run sequence (replace placeholders with the values confirmed for that PR):

```powershell
git status --short
git diff --check
git add <reviewed-path-1> <reviewed-path-2>
git diff --cached
git commit -m "<type>: <short PR-sized description>"
git push -u origin <confirmed-branch-name>
```

If the user wants to open a PR with GitHub CLI, provide a separate command using the confirmed base/head/title/body. Do not assume `main`, a remote name, or an installed CLI. The user decides whether to run the PR command and merge it. If commands fail, diagnose and offer corrected commands; do not retry the Git mutation yourself.

### Handling existing-code and migration conflicts

1. Before resolving a conflict, identify the common base and read both versions plus the callers/tests. Do not resolve code conflicts by blindly selecting “ours” or “theirs.”
2. For API/schema conflicts, compare request/response contracts and update API, shared types, UI, tests, Postman collection, and docs together.
3. SQL migrations are append-only once shared or applied. If two branches add migrations, give each a unique timestamp/name, inspect ordering and dependencies, and add a follow-up migration rather than rewriting an applied one.
4. Re-run migration checks from a clean database and an upgrade from the previous accepted schema after resolving migration conflicts.
5. Never discard another contributor's unmerged changes. If the overlap cannot be resolved from the code and agreed design, stop that PR and record the exact decision needed.
6. Merge sequentially when PRs touch the same schema/API. Rebase or merge the latest integration branch into the next branch using the team's policy, resolve conflicts, then rerun the full affected checks.

## 3. Test and verification contract for every PR

Each PR must report both automated checks and hands-on checks. If a check cannot run, say why and leave the relevant fix-plan item `In progress`; do not substitute “looks good.”

### Automated checks

Use the scripts that actually exist in the repository, and add missing focused checks in the PR that introduces the behavior. At minimum, build toward:

- TypeScript/type checks and lint for changed packages.
- Unit tests for domain rules, validation, mapping, ranking, and state transitions.
- API integration tests for routes, auth, ownership, provider failures, and persistence.
- Database migration tests against a disposable local PostgreSQL/Supabase environment, including clean reset and upgrade path.
- Cross-user authorization tests for user A, user B, anonymous, and Admin/service contexts.
- Frontend component/flow tests for changed screens; end-to-end tests for the core product journey once that journey exists.
- Deterministic provider/source mocks in normal CI. Live provider smoke tests are optional, isolated, credential-gated, and never required for ordinary CI.
- Formatting/diff checks. Do not run destructive migration/reset commands against a shared or production database.

The first baseline PR must confirm exact repository commands and tools before documenting them as required CI. Do not add a second test framework without a concrete gap and a recorded decision.

### Manual API checks with curl or Postman

Maintain a versioned Postman collection (or equivalent documented `curl.exe` examples) with a safe local environment template. Use placeholders such as `{{baseUrl}}`, `{{userAToken}}`, `{{userBToken}}`, and `{{adminToken}}`; do not commit real token values.

For every changed API contract, exercise as applicable:

1. Valid request: expected success code, response shape, and persisted state.
2. Missing/invalid auth: expected `401` or documented public behavior.
3. Wrong-owner request: user B cannot read or mutate user A's record; confirm no data leaks in error bodies.
4. Invalid/oversized input: expected `400`/`413` and no partial persistence.
5. Duplicate/retry: repeat the request/callback; verify idempotency and no duplicate rows.
6. Failure path: unavailable source/AI provider or malformed upstream response leaves a truthful error state and safe logs.
7. Admin-only operation: ordinary user is denied; authorized Admin succeeds and action is audited where required.

The route paths and payload schemas must be taken from the accepted API contract for that PR. Do not copy placeholder endpoints from this plan into production code.

### AI-assisted implementation and hallucination controls

Hallucination risk cannot be represented by a reliable fixed percentage. It is higher when a prompt asks for a broad rewrite, when project context has not been inspected, when an external source/provider contract is unknown, or when plausible code is accepted without running it. Apply this control loop in every PR:

1. **Inspect first:** identify the current route, callers, data model, migrations, package versions, tests, and UI before editing. Cite repository paths and relevant symbols. Do not infer behavior from README text alone.
2. **Separate evidence from assumptions:** maintain a short list of `Verified`, `Assumed`, and `Unknown` items in the PR notes. Do not implement a feature dependent on an unresolved security/source/data decision.
3. **Constrain the change:** name the PR, fix-plan IDs, acceptance criteria, and permitted scope. Ask the assistant to stop and report blockers instead of inventing an endpoint, migration, source capability, package method, or credential.
4. **Check implementation claims:** inspect changed files and full diff; verify external SDK/API use against installed package types or official docs; inspect SQL impact and existing data; ensure tests assert behavior rather than just execute code.
5. **Run two kinds of verification:** run relevant automated checks and perform the PR's manual browser plus curl/Postman steps, including negative and failure paths. A generated test suite or green status is not proof that the whole user flow works.
6. **Demo and reconcile:** demonstrate each completed feature to the user, record feedback, update its fix-plan/progress status and repository map, then start dependent work only when the slice is accepted or remaining work is explicitly tracked.
7. **Report honestly:** state exactly what changed, what commands actually ran, what failed, and what remains unverified. Never say an integration, migration, deployment, metric, or PR operation succeeded without observed evidence.
8. **Protect data and history:** use disposable local databases for reset/migration tests, sanitized fixtures for provider data, and no production credentials. The user alone runs Git staging/commit/push/PR/merge commands; deployments follow separately agreed steps.

Use this prompt structure for each AI coding task:

```text
Work only on <PR ID> and fix-plan IDs <IDs>.
Inspect the repository and cite the files/current behavior you rely on before editing.
List verified facts, assumptions, and unknowns; do not guess missing contracts.
Implement the agreed vertical slice only, including its screen, API/data changes,
loading/empty/error states, authorization, automated tests, and manual curl/Postman steps.
Do not stage, commit, push, create a PR, or merge anything.
After editing, summarize the diff, exact commands actually run and their results,
manual checks still needed, known risks, and tracker updates. Stop if a dependency
or source/API contract is unclear.
```

### Deadline and scope reality

As of **2026-10-27**, the requested **2026-10-29** deadline is too close to complete and verify the entire proposed multi-PR refactor to the definition of done below. AI assistance can reduce implementation time but cannot remove source-access review, database migration, integration, manual verification, deployment, or evaluation work. Do not mark the complete project finished by that date by skipping gates or inventing evidence. If the date is fixed, agree explicitly whether it is for a scoped submission/demo or move the completion date for the full roadmap. The full target remains the roadmap unless the user approves a scope change.

### Per-PR evidence in the PR body

Every PR body should include:

```text
Fix-plan IDs:
Purpose / user-visible outcome:
Files and migration(s):
Automated checks (exact command + result):
Manual curl/Postman requests (request name + result):
Authorization/negative cases checked:
Screenshots or demo evidence (if UI changed):
Known limitations / follow-up IDs:
Rollback or recovery notes:
Progress tracker updated: yes/no
```

## 4. Milestone and PR sequence

PR order is intentionally serial around shared schema/API contracts. A PR may be split further if review finds it too large. Do not combine adjacent PRs merely to reduce PR count.

### Cross-PR ownership map

Use this map when a task appears to touch more than one PR:

| Concern | Owning PR | Boundary |
|---|---|---|
| Callback authentication, payload validation/size limits, configuration, safe disabled behavior | PR-02 | Secures the inbound transport/event contract; does not own worker execution or durable retry scheduling |
| Durable run state, worker claims/leases, crash recovery, retry/backoff, cancellation, idempotent processing | PR-07 | Single owner of the processing lifecycle; consumes PR-02's validated callback contract |
| First permitted source adapter, normalized/persisted opportunities, provenance/freshness, first browse list and detail UI | PR-06 | Owns initial discovery and the only initial list/detail implementation |
| Profile/preferences editing | PR-04 | Owns canonical profile API and profile screen |
| Save/unsave, application tracking, feedback | PR-08 | Owns user-specific actions on PR-06 opportunities; does not recreate profile or listing/detail surfaces |
| Minimum run operations needed to operate sync | PR-07 | Run list/detail/status/failure/retry/cancel needed for the durable worker |
| Broader Admin source/data-quality/audit/evaluation operations | PR-09 | Extends PR-07's operational foundation; does not reimplement run state or worker actions |

If a fix-plan ID spans two boundaries, split its implementation evidence in `PROJECT_REFACTOR_PROGRESS.md` and state which PR delivers each part. Do not mark the whole ID `Done` until every required part has passed its acceptance checks.

Except for documented foundation/infrastructure PRs, each PR should end with a user- or Admin-visible capability that can be demonstrated immediately. Backend work and the corresponding screen stay in the same feature PR; do not mark an API-only implementation as a completed feature and defer its UI to a later milestone. If a feature is too large, split it into smaller end-to-end capabilities, each with a usable screen.

At the end of each feature PR, show the user the working screen and walkthrough (local or staging), plus the automated/manual evidence. Capture requested corrections in the same PR when they are within scope, or record them as explicit follow-up fix-plan IDs before beginning the next dependent feature.

| Milestone | PR | Main fix-plan IDs | Exit result |
|---|---|---|---|
| M0: Baseline and decisions | PR-00 | P0-01–06, P6-05 | Scope, current baseline, Git workflow, source and migration decisions recorded |
| M1: Truthful demo hunt | PR-01 | P1-01, P6-06 | Deterministic demo-only hunt is labeled throughout API/UI/docs; live sources remain disabled |
| M1: Remaining API contract cleanup | PR-01B | P1-09–11 | Outreach enum, export format, and health/e2e contract each match implementation and have focused checks |
| M1: Callback transport and config safety | PR-02 | P1-02–03, P1-08 | Callback is disabled unless authenticated/validated; payload and configuration contracts are safe. Durable worker lifecycle is explicitly out of scope |
| M1: Browser data safety | PR-03 | P1-04–07, P3-07 | Contact, notifications, and messages have reviewed access controls |
| M2: Domain model | PR-04 | P3-01–03, P3-05 | Canonical profile/opportunity/save concepts; profile editing is delivered with its screen |
| M2: ORM boundary | PR-05 | P3-03–04, P3-06 | Drizzle query layer adopted incrementally without competing migrations |
| M3: Source discovery vertical slice | PR-06 | P0-03, P2-01, P2-03–06 | One reviewed source flows through persistence/API into a usable opportunities list and detail experience |
| M3: Durable sync vertical slice | PR-07 | P2-02, P2-07–08, P5-01 | Durable jobs, worker recovery, retries, cancellation, and the minimum Admin run view work end to end |
| M4: Job-seeker actions vertical slice | PR-08 | P0-02, P0-04, P3-02–03 | Users can save/unsave discovered opportunities, track applications, and submit feedback through working UI/API |
| M4: Admin operations vertical slice | PR-09 | P5-02–04, P5-06 | Admin has the broader source/data-quality/audit operations surface with least privilege; PR-07's minimum run view is extended, not duplicated |
| M5: AI baseline/evaluation vertical slice | PR-10 | P0-05, P4-01–02, P4-06–08 | Dataset, baseline scores, visible match reasons, and evaluation screen/report work together |
| M5: Grounded semantic AI vertical slice | PR-11 | P4-03–05, P4-07–08 | Optional retrieval/reranking/RAG is exposed through a usable screen and compares to baseline |
| M6: Release readiness | PR-12 | P6-01–08, remaining applicable IDs | Clean setup, full tests, demo, report, limitations, and verified resume facts |

### M0 / PR-00 — Baseline, scope, and decision records

**Branch/PR title:** `codex/refactor/m0-baseline` / `docs: establish refactor baseline and decisions`  
**Purpose:** Prevent coding against stale assumptions or creating avoidable Git/migration conflicts.

**Work:** Inspect the actual remote/default branch and working tree; reconcile `PROJECT_KNOWLEDGE.md` against source; capture baseline API routes, schema/migration order, env names, current UI pages, test commands, and known failing checks. Confirm primary user, target job categories/regions, source access, billing scope, legacy modules to defer, Drizzle/migration ownership, and scheduler/n8n responsibility. Record decisions as short ADRs or in the fix plan.

**Automated/manual checks:** Run only the agreed baseline checks and record pass/fail before changes. Exercise existing health/auth/profile/hunt routes via curl/Postman and note current behavior; do not represent existing behavior as expected future behavior.

**Prompt:**

> Work only on M0/PR-00. Inspect the current repository, Git remote/branch state, source files, SQL migration history, package scripts, and existing docs before proposing edits. Do not modify application code. Compare the source to `PROJECT_KNOWLEDGE.md` and `PROJECT_REFACTOR_FIX_PLAN.md`; list drift with paths and evidence. Draft the product/source/scheduler/ORM/migration/scope decisions and baseline verification commands. Preserve all existing working-tree changes. Update only the project docs/ADRs required for the baseline, and report unresolved decisions without guessing.

**Exit gate:** Decisions have owners/dates; baseline command outcomes and known failures are recorded; no application behavior was changed.

### M1 / PR-01 — Truthful hunt results and current contract fixes

**Branch/PR title:** `codex/refactor/m1-hunt-truth` / `fix: prevent synthetic hunt data from appearing real`  
**Purpose:** Make current discovery claims honest before expanding source coverage.

**Work:** Trace the active hunt pipeline. Remove fabricated listings from real-result paths and use deterministic fixtures visibly marked as demo data. Reject live-source selections until an adapter is reviewed and available at $0. Keep the n8n callback disabled until PR-02 has established a reviewed authenticated/validated contract and a workflow/source is approved. Update source-selection, hunt-status, results, landing/learn-more, and documentation screens to match this limitation. The unrelated outreach enum, export-format, and health-route mismatches remain separate work items and are not silently included in this slice.

**Automated checks:** Unit tests for demo source validation/filtering and rejection of live-source requests; route test that the disabled callback returns 503; API tests assert demo provenance cannot be mistaken for verified source data.

**Manual checks:** After applying the new migrations to a local Supabase database, create a demo hunt and inspect source, null URL, fixture marker, demo labels, result count, and absence of score/save/tailor actions. Submit live-source selections and callback requests; verify live source rejection and callback 503. If local Supabase/auth is unavailable, record exact curl/Postman instructions and do not claim an HTTP check passed.

**Prompt:**

> Implement only the truthful demo-hunt slice of PR-01 (P1-01 and relevant P6-06). Keep total spend at $0: do not invoke paid/free-tier external actors or model APIs. Trace callers before changing source enums. Add deterministic fixtures, reject unapproved live sources, label samples in the UI, and keep sample rows out of real-lead/scoring actions. Disable the n8n callback until its workflow/source/auth contract is reviewed. Add focused automated tests and document exact curl/Postman checks; update the project knowledge and progress files. Do not claim database migrations or HTTP behavior were verified unless actually run. Preserve user data and do not commit, stage, push, or create a PR.

**Exit gate:** Every result is visibly a fixture; no live source/provider is called; API/UI/docs agree; focused checks pass; migration and manual HTTP state is recorded honestly. Live-source callback/auth work remains PR-02.

### M1 / PR-01B — Remaining API contract cleanup

**Branch/PR title:** `codex/refactor/m1-api-contracts` / `fix: align API schema and export contracts`  
**Purpose:** Close three existing mismatches that are independent of demo-source truthfulness.

**Work:** Fix or remove the unsupported `outreach_message` persistence path, make PDF export produce an actual PDF or reject/remove that format, and update the stale root-route e2e expectation to the intentional health contract. Keep each change narrow and preserve compatibility with existing records.

**Automated/manual checks:** Test valid/invalid persistence for outreach if retained; verify exported bytes, content type, and extension for every advertised format; test `/api/health` and expected root behavior. Use curl/Postman for the documented route and export cases.

**Prompt:**

> Implement only P1-09 through P1-11. Trace database enums, export DTO/service/UI, and registered health routes before editing. Keep migrations forward-only and data-preserving. If a feature is removed, remove its UI/API/docs claims and test that it is unavailable; if retained, implement the real contract. Add focused tests, manual curl/Postman instructions, and update the project knowledge and progress tracker. Do not mix in source ingestion, auth, ORM, or AI work. Do not commit, stage, or push.

**Exit gate:** The three documented contracts agree across DB, API, UI, tests, and README; each is manually reproducible from a clean local setup.

| M1: Web lint cleanup | PR-01C | P6-09 | Web lint baseline is 0 errors / 0 warnings; web build and API tests unchanged |

### M1 / PR-02 — Webhook, job state, and configuration safety

**Branch/PR title:** `codex/refactor/m1-workflow-safety` / `fix: secure and make hunt callbacks retry-safe`  
**Purpose:** Make asynchronous processing reliable and secure.

**Work:** Own the callback's transport/security boundary and configuration contract only. Require production callback authentication; validate payload size and schema; define the callback event identity/replay response; reject malformed or unauthenticated requests; and keep the callback disabled (503) until the required secret and reviewed workflow/source contract are present. Validate environment at startup and reconcile `.env.example`, code, Docker, and deployment docs. Decide if the existing n8n workflow stays; if yes, check in an export, setup guide, version/credentials contract, and fixture. Keep source secrets outside workflow JSON.

**Explicit boundary:** Do not build leases, worker claims, retry scheduling, crash recovery, cancellation orchestration, or the full hunt/sync state machine in this PR. Those belong to PR-07. A callback accepted by PR-02 may be durably recorded as an authenticated event, but its processing lifecycle is implemented only once in PR-07.

**Automated checks:** Integration tests for missing/wrong secret, valid/invalid payload, oversized payload, replayed event handling at the transport boundary, unavailable configuration, callback-disabled behavior, and clean migration if one is needed. Worker crash/retry/cancel/concurrency tests are deferred to PR-07.

**Manual checks:** curl/Postman calls for missing and wrong secret (401), malformed/oversized payload rejection, callback-disabled response when not configured, and accepted authenticated event when configured. Inspect redacted logs and ensure no secret is exposed. Do not claim worker completion or cancellation behavior from this PR.

**Prompt:**

> Implement only PR-02 for fix-plan IDs P1-02, P1-03, and P1-08. P2-07 is owned by PR-07 because it concerns durable processing/retry lifecycle; do not implement it here. First map current states, routes, migrations, n8n payloads, and env-variable consumers. Propose the callback/state contract before coding. Make authentication mandatory in production and compare secrets safely. Make retries idempotent and block late writes to cancelled/terminal runs. Use an append-only migration if needed. Add automated concurrency/replay/error tests and exact Postman requests. Do not enable an unverified public workflow or claim live source support. Update setup docs and tracker with commands and actual outcomes.

**Exit gate:** Unauthenticated, malformed, oversized, or unconfigured callbacks are safely rejected; the accepted event contract is documented and replay-safe at the transport boundary; secrets are mandatory in deployed environments. Durable retry, cancellation, and late-worker behavior remain open for PR-07.

### M1 / PR-03 — Contact, notifications, and message access control

**Branch/PR title:** `codex/refactor/m1-data-access` / `fix: enforce user and admin data boundaries`  
**Purpose:** Close high-risk direct-browser/API access paths before keeping them in the product.

**Work:** Inventory grants, RLS, Realtime policies, service-role queries, frontend direct writes, and HTML email interpolation. Restrict contact inbox reads to authorized Admin/service paths while allowing bounded public submissions; restrict notification writes and owner operations; authorize private message topics to conversation participants. Escape email content. If a path cannot be proven secure, move it behind the API or disable it.

**Automated checks:** Role matrix tests (anon, user A, user B, Admin, service role); policy tests for select/insert/update/delete; participant vs nonparticipant Realtime authorization; HTML escaping tests; direct API negative cases.

**Manual checks:** Submit contact as anonymous; verify ordinary signed-in users cannot list submissions; verify Admin can. Attempt user A notification/message access with user B token; verify denial/no leak. Send support reply with HTML-looking text and inspect rendered message.

**Prompt:**

> Implement only PR-03 for fix-plan IDs P1-04 through P1-07 and P3-07. Inspect every current policy, grant, query role, direct browser data operation, and Realtime topic before editing. Design the access matrix first. Add forward-only SQL migrations and role-based automated tests; do not assume service-role bypass is safe. Provide curl/Postman negative cases and any manual dashboard steps. Preserve contact form functionality and avoid exposing message content to nonparticipants. Update the progress tracker with verification evidence.

**Exit gate:** Access matrix is tested and effective; no private data path relies only on UI hiding.

### M2 / PR-04 — Canonical profile and opportunity data model

**Branch/PR title:** `codex/refactor/m2-domain-model` / `refactor: define canonical profile and opportunity records`  
**Purpose:** Replace ambiguous profile/lead/scrape-result meanings with a reviewed model.

**Work:** Decide canonical career profile vs account identity; define opportunity, source observation, hunt result, saved state, application outcome, feedback, freshness, and sync run. Map existing tables and data. Write forward migration/backfill/rollback notes; use additive/expand-migrate-contract rollout. Add indexes, uniqueness and ownership constraints only after checking existing duplicates and nulls. Deliver the profile read/edit API and profile/preferences screen in this PR so the canonical model is usable immediately.

**Automated checks:** Schema constraints and migration tests; backfill count/reconciliation; uniqueness and ownership tests; profile API/form validation and ownership; rollback/recovery rehearsal in disposable DB. No destructive migration against shared data.

**Manual checks:** Apply from clean DB and previous schema; use the profile screen and Postman to create/read/update a profile, then verify persistence after reload and user isolation. Check empty, invalid, and save-failure states; verify old records remain accessible as intended.

**Prompt:**

> Implement only PR-04 for fix-plan IDs P3-01 through P3-03 and P3-05. Read the current migrations and query paths; propose an entity/relationship diagram and field-level ownership before writing SQL. Include a compatibility/backfill plan for existing users and records. Never rewrite an applied migration or drop a column/table without verified consumers, backup/recovery notes, and explicit scope approval. Deliver profile API plus profile/preferences UI in the same PR. Add schema, form, persistence, and user-isolation tests; update `PROJECT_KNOWLEDGE.md`, the fix plan, and progress tracker.

**Exit gate:** Canonical data definitions and forward migration/backfill are reviewed; clean and upgrade paths pass.

### M2 / PR-05 — Drizzle data-access foundation

**Branch/PR title:** `codex/refactor/m2-drizzle` / `feat(api): add typed Drizzle repositories`  
**Purpose:** Introduce typed DB access without a second migration authority or a big-bang rewrite.

**Work:** Configure a server-only PostgreSQL connection and Drizzle schema for the agreed core tables. Keep Supabase Auth/Realtime where needed. Convert one low-risk repository/module end to end; document pool/SSL/secret handling. Keep SQL migrations canonical until an explicit migration-tool decision says otherwise.

**Automated checks:** Repository unit/integration tests, transaction/error behavior, migration/schema drift check, connection failure handling, API ownership tests. Verify no database URL/role key enters frontend bundles or logs.

**Manual checks:** Start local API with a local DB; issue the changed API requests as users A/B/Admin; verify reads/writes and expected permission failures. Confirm shutdown closes pool connections.

**Prompt:**

> Implement only PR-05 for fix-plan IDs P3-03, P3-04, P3-06. Do not migrate all modules at once and do not create a competing migration history. Start with one agreed core repository. Document how Drizzle schema stays aligned with existing SQL migrations, how service/user authorization is enforced, and how connections/secrets are configured. Add repository integration tests plus API authorization tests and manual curl/Postman steps. Compare query behavior before/after and update the file map.

**Exit gate:** One core path uses typed Drizzle queries, runs on clean/upgrade schema, and preserves ownership behavior.

### M3 / PR-06 — First permitted source adapter

**Branch/PR title:** `codex/refactor/m3-source-adapter` / `feat(ingestion): add first reviewed source adapter`  
**Purpose:** Establish a single source-backed pipeline before multiplying integrations.

**Hard prerequisite:** M0 must contain a documented GO decision for the exact source, based on permitted access, fields, rate limits, refresh frequency, retention, $0 cost, and reproducible test access. If no source passes, PR-06 must deliver a fixture-backed adapter contract and browse experience only, remain explicitly demo/fixture-labeled, and record the source as NO-GO; it must not imply live ingestion.

**Work:** Select the source only after M0 access review. Implement adapter contract, input/output validation, rate limits, bounded *request-level* retries, normalized records, provenance, timestamps, content hashes where allowed, and fixture examples. Keep source-specific fields in metadata only when the retention policy permits. Never fill absent fields with guesses. Include the API needed to browse these opportunities and the first user-facing opportunities list plus opportunity detail experience in this PR. This is the only PR that creates the initial browse/list/detail surface.

**Automated checks:** Adapter tests from checked-in sanitized fixtures; malformed/empty/duplicate pages; pagination/cursor behavior; timeout/rate-limit/provider errors; URL/domain validation; mapping invariants; API contract and UI loading/empty/error/results/detail states.

**Manual checks:** Trigger a fixture/mock run and one credential-gated sandbox/live run if permitted. Open the opportunities list and a detail page; verify original link, fetched time, source/fixture label, known-vs-unknown fields, and error/empty states; replay and confirm no duplicate; confirm clear UI/API errors when credentials/provider fail. Record live run evidence without storing secrets or unnecessary personal data.

**Prompt:**

> Implement only PR-06 for fix-plan IDs P0-03, P2-01, P2-03, P2-04, P2-05, and P2-06. Confirm the source has an approved access/retention entry before coding. Isolate source fetching from normalization, persistence, scheduling, and AI. Use source fixtures and schema validation; unknown values remain unknown. Deliver the adapter, persistence/API contract, and usable opportunities list/detail screens together. Add provenance/freshness/deduplication tests and Postman/curl plus browser checks. Do not add a second source in this PR. Update the source register and tracker with the exact supported fields and limitations.

**Exit gate:** One permitted source produces traceable, normalized, deduplicated opportunities; a user can browse the resulting list and open a detail view. PR-08 must reuse this surface rather than build a competing one.

### M3 / PR-07 — Durable scheduled ingestion and n8n workflow

**Branch/PR title:** `codex/refactor/m3-durable-sync` / `feat(ingestion): schedule and monitor durable source syncs`  
**Purpose:** Support recurring source updates without losing run state or overstating coverage.

**Work:** Own the durable processing lifecycle: queued/running/completed/failed/cancel-requested/cancelled states, atomic worker claims, leases/heartbeats, crash recovery, backoff, retry limits, idempotency, safe cancellation, and source-specific bounded scheduling. Reuse PR-02's authenticated callback/event contract; do not create a second callback-auth implementation. Follow the M0 decision on scheduler ownership. Recommended default is PostgreSQL-backed job state/worker; n8n executes the reviewed source workflow when useful, while the API/DB own lifecycle and results. Include only the minimum Admin run list/detail/status/failure/retry/cancel screen needed to operate and verify this lifecycle. PR-09 adds broader source management, quality summaries, audit, and Admin workflows around this foundation.

**Automated checks:** Worker claim race, crash/lease recovery, retry/backoff, cancellation race, duplicate/replayed callback event, source outage, partial results, rate-limit behavior, schedule window/time zone, and migration upgrade tests. Include a contract test proving the worker consumes only authenticated/validated events from PR-02.

**Manual checks:** Schedule/trigger one sync from the minimum Admin run screen and via Postman; inspect run state and timestamps in the UI; simulate provider failure; confirm bounded retry then visible terminal error; cancel an in-progress run and replay its callback; confirm no resurrection or duplicate writes. Verify one schedule produces one run.

**Prompt:**

> Implement only PR-07 for fix-plan IDs P2-02, P2-07, P2-08, and P5-01. P2-07 is implemented here, not in PR-02. PR-07 delivers only the operational run surface required to operate this lifecycle; broader Admin quality/audit/source-management work stays in PR-09. Follow the recorded scheduler/n8n decision. Persist all job state in the database; no fire-and-forget work as the only record. Make claims and callbacks idempotent and cancellation terminal. Deliver the Admin run/source screens in the same PR as the worker/API. Add crash/retry/concurrency tests and an operator Postman collection; test those operations in the browser too. Include worker operations, local stack setup, alert/error behavior, safe shutdown, and the 50% staging deployment checklist. Do not describe the system as continuously covering all jobs.

**Exit gate:** A scheduled run survives worker restart, can be inspected in the minimum Admin run screen, and can be retried/cancelled safely; freshness updates only after an actual successful source observation. PR-09 may extend the Admin experience but must not reimplement the worker lifecycle.

**50% staging deployment gate (after PR-07):** Measure progress against the accepted completion checklist, not PR count. The halfway gate requires a running, tested vertical slice: canonical profile screen/API, one approved source, persisted traceable opportunities, browse/detail UI, durable sync status, basic Admin run view, and passing core automated/manual checks. The user's $0 constraint applies: Vercel, Render, Supabase, and every connected service may be used only if the exact staging workload remains within verified free allowances, cannot incur overage, and requires no paid upgrade/payment method. If this cannot be established, keep the integrated demo local and record why; do not silently spend money to meet the deployment milestone. Verify TLS URLs if hosted, CORS, auth redirects/callbacks, health/readiness, API-to-database connection, browser-to-API calls, worker execution, and secret separation. Use sanitized/demo data only. Record deploy URLs (if any), the commit SHA provided by the user, environment (no secret values), smoke-test results, and rollback steps in the progress tracker. Staging deployment is an integration checkpoint, not proof that the project is 50% by line count or ready for production. The user runs Git commands; deployment actions follow the separately agreed deployment procedure.

### M4 / PR-08 — Job-seeker UI and existing UI reuse

**Branch/PR title:** `codex/refactor/m4-job-seeker-ui` / `feat(web): deliver profile-to-opportunity workflow`  
**Purpose:** Deliver the user-specific actions that turn discovered opportunities into a useful personal workflow, reusing the profile screen from PR-04 and the opportunity list/detail surface from PR-06.

**Work:** Implement save/unsave, application status/history, and user feedback screens/interactions plus their APIs. Add match evidence to the existing opportunity detail view only when the evidence contract is available; do not create a second opportunity detail page or reimplement source/freshness display. Keep responsive/accessibility states and honest empty/error/loading states. Avoid introducing a new component system unless necessary.

**Automated checks:** Component/API tests for save state transitions, duplicate save prevention, application status validation, feedback ownership, persistence after reload, errors, and accessibility basics; end-to-end core journey using the PR-04 and PR-06 screens.

**Manual checks:** Use browser with a normal test account; open an opportunity delivered by PR-06, save/unsave it, change application status, submit feedback, reload and confirm persistence and user isolation. Test mobile width, empty saved state, stale listing, and failed API/sync states.

**Prompt:**

> Implement only PR-08 for fix-plan IDs P0-02, P0-04, P3-02, and the user-state portion of P3-03. Profile editing remains in PR-04; opportunity list/detail and source provenance remain in PR-06. First inspect current UI routes, shared components, and design tokens. Reuse the existing UI where sound; do not rewrite unrelated pages. Complete the remaining user workflow as a vertical slice: opportunity details, evidence-backed match display, save/unsave, application status, and feedback must work in both UI and API. Add component/E2E checks and screenshots plus exact manual steps. Do not invent listing facts or show planned features as active. Update the route/file map.

**Exit gate:** A user can save/unsave an opportunity, track an application, and submit feedback on desktop/mobile using the existing PR-04/PR-06 surfaces; all state is persisted and owner-scoped. No duplicate profile or opportunity-detail workflow is introduced.

### M4 / PR-09 — Admin operations, roles, and audit

**Branch/PR title:** `codex/refactor/m4-admin-ops` / `feat(admin): add ingestion and quality operations`  
**Purpose:** Keep Admin meaningful as the operator's console without granting unnecessary access to private user content.

**Work:** Extend the minimum run operations delivered in PR-07 with source configuration/status, data-quality summaries (freshness/duplicates/validation), AI evaluation dashboard integration when available, and append-only audit events for sensitive operations. Do not build a second run lifecycle or duplicate retry/cancel implementation. Enforce RBAC and object-level checks in API services. Decide explicitly on notifications, messaging, and billing remaining in scope.

**Automated checks:** Admin vs normal user API matrix, audit event creation/immutability, retry/cancel auth, no exposure of resume/private messages/secrets, dashboard query pagination and failure tests.

**Manual checks:** Admin investigates a failed sync and retries it; standard user attempts the same admin routes and is denied; confirm audit history and run state; inspect that secrets/raw sensitive content are not rendered.

**Prompt:**

> Implement only PR-09 for fix-plan IDs P5-02 through P5-06 and P3-07. P5-01's minimum run visibility and controls are delivered in PR-07; PR-09 extends that foundation without duplicating it. Build operational views from existing run/source/evaluation contracts. Enforce each Admin permission server-side and create audit events for sensitive actions. Avoid broad access to resumes, message bodies, or provider secrets. Add role-matrix tests and Postman negative cases; update the progress tracker and Admin docs. Keep deferred feature routes clearly labeled or disabled according to the scope decision.

**Exit gate:** Admin can diagnose source/data quality and review audited operations with least privilege; ordinary users cannot invoke Admin APIs directly. Run lifecycle ownership remains centralized in PR-07.

### M5 / PR-10 — Matching baseline and evaluation dataset

**Branch/PR title:** `codex/refactor/m5-eval-baseline` / `feat(ai): add labeled ranking baseline and evaluation`  
**Purpose:** Establish what “better matching” means before adding complex AI.

**Work:** Define research question, profile/job sampling, relevance rubric, annotator guide, privacy/consent, train/dev/test split, disagreement handling, and dataset provenance. Implement deterministic rule-based ranker and reproducible metrics (Precision@K, Recall@K, NDCG@K as appropriate), plus ranking version metadata. Show baseline scores and understandable match reasons in the opportunity UI; include an evaluation view or report output that displays measured results and limitations.

**Automated checks:** Deterministic ranking fixtures, metric calculations including edge cases, split leakage checks, reproducible report generation, missing profile/listing field behavior.

**Manual checks:** Have reviewers label a sample using the written guide; inspect representative easy/hard cases; compare system ranking to labels; record annotation disagreements and limitations. No improvement claims before report.

**Prompt:**

> Implement only PR-10 for fix-plan IDs P0-05, P4-01, P4-02, P4-06, and P4-08. Design the dataset and measurement protocol before tuning ranking. Use only consented/permitted data; minimize sensitive profile content. Implement a deterministic baseline and reproducible ranking metrics, then expose baseline score/reasons in the opportunity screen and evaluation results in an Admin/report view. Add tests for metric math, missing data, and split leakage. Produce a report template and manual annotation procedure; do not invent results or hard-code favorable metrics.

**Exit gate:** Baseline and evaluation set are reproducible, documented, privacy-reviewed, and locked before AI comparison.

### M5 / PR-11 — Semantic retrieval, grounded reranking, and optional RAG

**Branch/PR title:** `codex/refactor/m5-grounded-ai` / `feat(ai): add evaluated evidence-grounded matching`  
**Purpose:** Add AI only where the evaluation demonstrates value over the baseline.

**Work:** Test full-text/structured retrieval first; add embeddings and pgvector if justified. Add provider adapter and bounded reranker over selected candidates. Validate output schema, track model/prompt/embedding/ranker versions, cost/latency/error metadata, and provide evidence references and abstention. Add profile/job question answering only if it can cite authorized stored evidence. LangChain remains optional. Deliver the UI that exposes explanations or Q&A in this PR; do not leave a model/API capability without a usable product surface.

**Automated checks:** Fixed evaluation split; baseline vs hybrid metrics; prompt injection/adversarial listings; missing evidence abstention; malformed JSON/schema; provider timeout/rate limit; authorization isolation; retrieval citation validity; cost/latency ceilings.

**Manual checks:** Compare blinded baseline/hybrid rankings; sample explanations against exact listing/profile evidence; test unsupported questions and cross-user retrieval; inspect Admin model/version/cost metrics without exposing prompts/resumes unnecessarily.

**Prompt:**

> Implement only PR-11 for fix-plan IDs P4-03 through P4-08. Use the accepted dataset and baseline; do not change evaluation labels/splits after observing results without documenting it. Add semantic retrieval or RAG only if it has a clear measured purpose. Keep generation grounded to authorized evidence, validate all outputs, cite source fields/URLs, and abstain when evidence is missing. Deliver an integrated explanation/Q&A screen with citations and useful no-answer/error states. Add adversarial and cross-user tests. Report actual metrics, confidence/limitations, latency, and cost; do not claim improvement if results do not support it.

**Exit gate:** AI adds a reproducible, useful measured capability—or the report documents why the baseline is retained without it.

### M6 / PR-12 — Hardening, release, and FYP package

**Branch/PR title:** `codex/refactor/m6-release` / `chore: prepare reproducible FYP release`  
**Purpose:** Ensure another reviewer can install, run, test, understand, and evaluate the finished system.

**Work:** Clean clone setup, environment example, migration/reset/seed path, deterministic fixtures, CI, dependency/security checks, complete unit/integration/E2E suite, accessible UI review, source and privacy documentation, architecture/data-flow diagrams, demo script, limitations, FYP report, final progress ledger, and resume bullets using real evidence only.

**Automated checks:** Full CI from clean checkout; clean DB migration and upgrade; all tests/build/lint/type checks; dependency audit appropriate to repo; E2E core journey; no secrets in repo/artifacts.

**Manual checks:** Independent person follows README and demo script using fresh environment; runs Postman collection; reproduces a sync and evaluation report; reviews Admin access, failure handling, and source citations. Record exact environment and any manual prerequisites.

**Prompt:**

> Implement only PR-12 for fix-plan IDs P6-01 through P6-08 and remaining accepted definition-of-done items. Start from a clean clone. Do not add features. Reconcile every README/SYNOPSIS/demo claim with code and test evidence. Run the complete documented verification suite and record exact results. Have an independent reviewer follow setup and Postman/demo steps. Use actual measured results only in the report/resume and list limitations plainly. Mark tracker items `Done` only when their evidence is linked.

**Exit gate:** Clean setup and core demo are reproducible, tests and manual checks are recorded, and project claims match evidence.

## 5. PR sequencing and fix-plan coverage ledger

Use this as the index in GitHub PR descriptions and the tracker. If a fix-plan ID moves to a different PR, update this table and explain why.

| Fix-plan IDs | Planned PR | Required evidence before `Done` |
|---|---|---|
| P0-01–06 | PR-00 | User/source/scope/evaluation/migration decisions and owners recorded |
| P1-01, P6-06 | PR-01 | Demo-source validation/provenance tests; manual demo/live-source and callback checks |
| P1-09–11 | PR-01B | Outreach enum persistence, export format, and health/e2e route contract tests |
| P6-09 | PR-01C | Lint command returns 0/0; affected pages manually re-checked; no behaviour change |
| P1-02–03, P1-08 | PR-02 | Callback authentication/validation/replay-boundary tests; config/startup checks; callback Postman evidence |
| P1-04–07, P3-07 | PR-03 | Anon/user A/user B/Admin policy and API tests; email/realtime checks |
| P3-01–03, P3-05 | PR-04 | Reviewed ERD, forward migration, backfill reconciliation, clean and upgrade checks |
| P3-03–04, P3-06 | PR-05 | Typed repository integration and auth tests; no migration-history conflict |
| P0-03, P2-01, P2-03–06 | PR-06 | Approved source register, fixture tests, traceability and dedupe evidence |
| P2-02, P2-07–08, P5-01 | PR-07 | Worker retry/crash/cancel tests; authenticated-event integration; manual sync/replay evidence; minimum Admin run view |
| P0-02, P0-04, P3-02–03 (user-state portion) | PR-08 | Save/application/feedback ownership and persistence tests; end-to-end responsive user-action flow |
| P5-02–06, P3-07 | PR-09 | Admin role tests, audit events, source/data-quality diagnosis walkthrough; extends PR-07 run operations |
| P0-05, P4-01–02, P4-06, P4-08 | PR-10 | Labeled set/protocol, reproducible baseline metrics, privacy/consent decision |
| P4-03–08 | PR-11 | Reproducible comparison, grounding/abstention tests, real latency/cost/quality results |
| P6-01–08 + remaining | PR-12 | Clean-clone install, full checks, independent demo, final report and honest claims |

Progress tracker updates are required at PR opening, after automated checks, after manual checks, and after merge. A merged PR with missing evidence remains `In progress` for the corresponding fix-plan item.

The assistant may prepare code, tests, docs, diffs, and PR text in the working tree, but all staging, commit creation, pushing, PR creation, and merging remain user-operated. Mark a PR as committed/pushed/merged only after the user reports or provides evidence that the command succeeded.

## 6. Milestone review checklist

At the end of each milestone, hold a short review and answer:

1. Which fix-plan IDs changed status, and what code/test/manual evidence proves it?
2. Does the code still match the planned architecture and `PROJECT_KNOWLEDGE.md`?
3. Did any source, API, database, environment, or UI contract change without updating its consumers?
4. Are all manual Postman/curl steps reproducible and safe to share? Are secrets excluded?
5. Were migrations applied from both a clean database and the previous accepted schema where relevant?
6. What defects, risks, and decisions remain? Who owns each and which PR will resolve it?
7. Does the demo still tell the same product story, and are real, fixture, and planned behavior clearly distinguished?

Do not begin the next milestone if a P0 security/truthfulness defect remains in the path being expanded, if the integration branch is broken, or if the previous milestone's evidence is missing. Record the blocker and resolve it in a focused follow-up PR.

## 7. Metrics and resume evidence

Numbers are not targets to fabricate. For any eventual resume or report metric, define its numerator, denominator, time window, dataset, and script before running the measurement.

- **Source count:** sources with documented permitted access and a passed connector check.
- **Listing count:** valid normalized unique records over a stated interval; report raw fetch count separately.
- **Ranking improvement:** compare the same held-out labeled profile/job set against the rule baseline using the chosen metric (e.g., NDCG@10); state absolute or relative improvement.
- **Sync reliability:** successful scheduled runs divided by scheduled runs in the interval; report retries and partial runs separately.
- **Admin time:** controlled comparable diagnosis tasks; compare median time with a defined start/end event and sample size.

Store measurement code and anonymized aggregate outputs. Do not put invented placeholder values in final resume bullets, FYP results, or product UI.

## 8. Overall completion definition

The project is ready to present as the completed refactor only when:

- The agreed job-seeker problem and source permissions are documented.
- One source-to-user workflow is reliable, traceable, secure, and reproducible.
- Existing UI has been focused on that workflow and Admin can operate it safely.
- Profile, opportunity, save/application, and sync-run data meanings are unambiguous.
- API/data access and migrations have one documented authority and pass clean/upgrade checks.
- Automated tests and manual curl/Postman paths cover normal, invalid, unauthorized, duplicate, and failure scenarios.
- AI is measured against a baseline and its outputs are grounded—or the project transparently retains the baseline.
- Setup, demo, report, limitations, and resume claims are reproducible and evidence-based.

