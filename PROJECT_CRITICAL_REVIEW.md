# Outsauce: Critical Project Review

## Review posture

This is a skeptical examiner's review of the repository as checked in. It assesses the product problem, feature coherence, technical flow, data correctness, security, implementation evidence, and FYP suitability. It is intentionally critical, but findings distinguish directly verified code behavior from questions that require the team to provide evidence.

**Execution disclaimer:** This review is based on source, SQL, deployment configuration, and project documentation. I did not install dependencies, run the services, inspect a live Supabase instance, exercise Stripe/n8n/Groq, or test the UI. Where I say “does not work” below, that means the checked-in code/configuration has a concrete contract failure or a path that cannot complete as written; it is not a claim that I personally reproduced it at runtime.

## Examiner's verdict

Outsauce has a broad and recognizably modern web-app skeleton: Next.js, NestJS, Supabase, a set of CRUD modules, authentication guards, migrations, and several third-party integration seams. The repository shows meaningful engineering effort. But it does not yet make a convincing case for a focused, validated final-year project.

The central weakness is that the project has not established one clear problem and then demonstrated that the system solves it with dependable, traceable outcomes. Instead, it presents itself as a combined opportunity scraper, lead manager, job-seeker writing assistant, freelancer marketplace helper, employer candidate finder, professional network, chat system, billing product, and admin CRM. The implemented core hunt path can produce AI-generated synthetic listings labeled as results from real platforms, while the documentation and UI often imply actual cross-platform discovery. That gap undermines the product's main promise and makes the rest of the feature breadth feel unanchored.

As submitted in this repository, I would judge it **a promising prototype with substantial scope and integration work, but not yet a defensible, production-ready FYP or a demonstrated solution to a well-defined user problem**. It could become a good FYP if the team narrows the claim, transparently labels the data, chooses and validates one user group, and supplies reproducible evidence that the principal workflow works better than the current alternatives.

This is not a judgment that no student could defend it. A strong report, a real n8n workflow, user research, evaluation results, and a live deployment could change the assessment. None of those proofs is present in the checked-in source as evidence of the central promise.

## 1. The first question: what exact problem is being solved?

The answer is not clear enough to defend:

- Is the target user a **job seeker**, a **freelancer looking for contracts**, or an **employer looking for candidates**? The product supports all three roles, but they have opposite marketplace directions and different jobs to be done. See the user types in `packages/shared/src/types/user.ts` and the role-dependent prompt in `apps/api/src/modules/scrapes/lead-generator.ts`.
- What painful task is being removed: finding listings, comparing platforms, tracking applications, writing applications, or finding people? Each is a separate product problem with different evidence of success.
- What does “discover opportunities across multiple platforms” mean operationally? Are results real listings fetched from each platform, AI-produced examples, scraped search pages, or user-provided data?
- Why would a job seeker use this instead of native LinkedIn/Upwork/Fiverr/Reddit search? Is the value freshness, deduplication, relevance, application tracking, or something else? The repository does not establish a measurable advantage.
- Who is the payer and why? A job seeker, freelancer, and employer may have different willingness to pay and quota needs. The four subscription tiers exist in code, but pricing alone is not product validation.
- What is the project's research or technical contribution? The current architecture is a standard SaaS assembly of framework CRUD, a third-party auth/database service, model API calls, and an external automation hook. What is the novel algorithm or evaluated method?

Without a crisp answer, every additional module expands scope without strengthening the claim. An FYP needs a defined problem, target population, requirements, design rationale, and evidence of outcomes. A feature checklist is not a problem statement.

## 2. The main product promise conflicts with the main implementation

This is the most serious product-integrity issue.

### Local hunt path is synthetic

In `apps/api/src/modules/scrapes/scrapes.service.ts`, absent `N8N_WEBHOOK_URL` means `runLocalAgent()` is called. It delegates to `generateLeads()` in `apps/api/src/modules/scrapes/lead-generator.ts`, whose prompt explicitly asks the model to create “realistic synthetic job/gig leads” and says the user “must not know these are synthetic.” It then builds generic platform **search URLs** (`platformSearchUrl`) rather than URLs for the individual purported listing. See `lead-generator.ts` around lines 37–125 and 190–210.

The service may call Apify to replace **one** generated Reddit entry when `APIFY_TOKEN` is present. It does not scrape actual LinkedIn, Upwork, or Fiverr listings itself. The other apparent real-source utilities, `lead-aggregator.ts` and `lead-validator.ts`, have no call sites in the active hunt service. The n8n branch could do real collection, but the repository contains no n8n workflow definition or deployment, so that crucial behavior cannot be reviewed or reproduced from this project.

### Why an examiner should object

- The UI presents results as if they are platform listings. There is no visible “AI-generated example” provenance marker. `lead-generator.ts` even uses the source platform labels and generic search links.
- Presenting generated businesses, people, salaries, metadata, and opportunity descriptions as scraped facts is misleading. It may cause users to contact nonexistent employers or make decisions from fabricated information.
- The optional Reddit replacement marks `metadata.verified = true`; “verified” is ambiguous and can be read as verification of authenticity, even though code only normalizes an Apify result.
- No source timestamp, extraction evidence, canonical listing URL guarantee, deduplication across sources, or evidence that a listing is still available is provided to the user.
- If the central value proposition is actual multi-platform discovery, a synthetic listing generator is not a partial implementation of that promise; it is a different product behavior.

**Questions for the team:** Which exact sources are collected by the deployed n8n workflow? Where is that workflow versioned? Can each result be traced to a real source record and retrieval timestamp? How are expired, duplicate, inaccessible, or policy-restricted listings handled? Why does the prompt instruct the model to conceal synthetic data? What user harm could result from acting on a fabricated lead?

## 3. Features feel assembled rather than designed around one workflow

The feature list includes hunts, saved leads, folders/tags, fit scoring, networking, messaging, five kinds of writing, tailored outreach, four plans, billing, notifications, public contact, and an admin console. This is a lot of surface area for an FYP, but the repository does not demonstrate how these features combine into one essential end-to-end journey.

Examples of unclear or weakly justified scope:

- **Networking and messaging** are generic social features. Their role in helping a user discover or apply to an opportunity is not explained. Message access depends on an accepted connection, but the app does not establish why platform users should connect with one another or how a connection improves the main outcome.
- **Employers and candidates share one discovery model**, despite being opposite sides of the market. The employer prompt asks for individuals offering services; job-seeker/freelancer prompts ask for employers hiring. Does the employer feature actually have candidate sources, or does it generate synthetic profiles too?
- **Fiverr as a source** is semantically awkward for job seekers/employers. The generator prompt itself says Fiverr is less relevant for some roles, yet the product advertises it as a first-class source.
- **AI bio/resume/cover letter/gig/profile writing** is a generic prompt wrapper, not a demonstrated tailored system. The project should explain why the user needs these alongside a lead finder and how output quality is judged.
- **Billing and four paid tiers** add payment integration, quota accounting, customer support, and operational complexity before a validated user need is established. A prototype could use one free tier and focus effort on trusted data and relevance.
- **Admin analytics** show counts, but there is no operational definition for whether a hunt was successful, a lead was useful, or AI output helped a user.
- **Notifications are advertised more broadly than produced.** Checked-in API code inserts notifications for connection requests and acceptance. It does not insert a notification for messages, completed hunts, onboarding reminders, or plan-limit events, even though README describes those categories. The notification UI/table therefore overstates the implemented event coverage.

The issue is not that an FYP must have only one screen. It is that each component should have a justified relationship to a defined problem and should be evaluated as part of that solution. Here, the broad surface makes it difficult to tell what is core, what is a demo, what is unfinished, and what counts as success.

## 4. Confusing and contradictory system design

### There is no single authoritative data flow

- `profiles` stores the main account, interests/skills, bio/headline, onboarding, discoverability, admin and verification data.
- `user_profiles` separately stores resume text, target roles and skills through `ProfileService`.
- Lead scoring reads `profiles.bio`, `headline`, and `skills`, not the `user_profiles` resume/roles that the settings page edits. A user can therefore save a candidate profile that scoring does not use.
- Hunt callback results are automatically copied into `leads`; the UI also offers actions to save scrape results as leads. There is no evident uniqueness constraint preventing the same scrape result being saved again.
- The database includes `scrape_results` and `leads` as separate concepts, but the app auto-creates a lead for every result. The product meaning of “save a lead” is consequently unclear.

### Multiple usage mechanisms compete

Usage is represented by monthly counters in `usage`, event rows in `usage_events`, hard-coded plan maps in API services, shared `PLAN_LIMITS`, and a `plans` table. Reads sometimes prefer counters and sometimes fall back to event counts. Hunt and AI services use read/check/update patterns; lead creation uses an atomic Postgres RPC; controller code then separately records usage events. Callback-created leads record events but bypass the lead quota RPC/counter increment. This raises questions about whether users can exceed limits, whether counts are consistent, and which source is authoritative.

### External integration boundary is not reproducible

The n8n workflow is pivotal but absent. Stripe setup depends on external price IDs and webhook registration. Groq/Apify keys are not wired consistently in deployment. These are not optional peripherals if the feature claims depend on them; they define system behavior. A final-year project should provide versioned integration configurations or clear mocked/demo boundaries and reproducible setup steps.

### Cancellation/retries and asynchronous work lack robust semantics

Hunt execution is started as a fire-and-forget promise, not a durable queue. A backend restart marks every pending/running job failed. Cancelling a job only updates its database status; it does not cancel an n8n execution. A later callback can still insert results and overwrite the cancelled status to completed. Callback processing has no idempotency key or state check, so replay/retry can insert duplicate results and duplicate leads. These are important correctness questions for the project's central workflow.

## 5. Verified implementation blockers and defects

These are concrete issues visible in source/configuration. They should be treated as high-priority before defending the project as working end-to-end.

### Configuration makes a clean setup doubtful

- API `SupabaseService` requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (`apps/api/src/supabase/supabase.service.ts`). Root `.env.example` supplies `NEXT_PUBLIC_SUPABASE_URL` but not `SUPABASE_URL`, so copying the template literally can leave API bootstrap without a required variable.
- Active AI services use `GROQ_API_KEY` and `GROQ_MODEL`. `.env.example` advertises Gemini (`GEMINI_API_KEY`), while `docker-compose.yml` passes Anthropic variables. The current Docker API environment does not pass `GROQ_API_KEY`; local fallback hunts and AI generation will be unavailable unless separately configured.
- Stripe service reads `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, and `STRIPE_PRICE_ENTERPRISE`; `.env.example` gives `STRIPE_STARTER_PRICE_ID` etc. The checkout then rejects missing price IDs. Compose uses the service's `STRIPE_PRICE_*` spelling, but users following the template will not.
- `DEPLOY.md` refers to `.env.production.example`, which is not in the tracked file inventory.

These mismatches matter because a reproducible installation is part of FYP evidence. A setup that depends on tribal knowledge is not reproducible.

### A feature writes a value the database enum rejects

`ai_generations.tool_type` is constrained by `ai_tool_type`, created with `bio`, `resume`, `cover_letter`, `gig_description`, and `profile_summary`. `AiToolsService.generateOutreach()` inserts `tool_type: 'outreach_message'`. The enum does not contain that value, so the outreach flow's history insert should fail on the checked-in schema; its catch path returns a generation error. This appears to make a promoted tailored-outreach feature unusable unless the deployed database has an undocumented schema alteration.

### Export accepts a PDF option but does not create a PDF

`apps/api/src/modules/export/dto/export.dto.ts` accepts `pdf`. `ExportService` only has explicit JSON and CSV branches; all other values fall through to plain text and a `.txt` filename. This is a direct contract mismatch, not a missing polish item.

### Contact and notification authorization need review

- `20260426000001_create_contact_submissions.sql` creates a SELECT policy for role `authenticated`, not just admins. Since contact submissions contain names, email addresses and messages, any signed-in user with table SELECT grants may be able to read other people's submissions through Supabase Data API. The admin API guard does not fix a separate broad RLS policy.
- `20260426000002_create_notifications.sql` defines its insert policy with `WITH CHECK (true)` and no `TO service_role` clause. The policy name says service role, but the predicate itself is not restricted to that role. Verify table grants and effective access; the checked-in policy is broader than its name suggests.
- `sendRealtimeBroadcast()` marks broadcasts `private: false` and uses topics `conversation:<id>` with message contents. If public broadcast topics are subscribable as configured, knowing/guessing a conversation UUID may expose message events outside participant RLS. Postgres RLS does not automatically secure a separate public Broadcast channel. This must be tested/configured as private topic authorization before treating chat as private.
- Contact form input is interpolated into HTML in both the Edge Function and admin reply HTML. The contact message is user-controlled; encoding is needed to prevent markup injection in the email client. The public form also has no visible server-side validation/rate limit in the page/API path.

### Other correctness concerns

- Callback route checks `N8N_WEBHOOK_SECRET` only when configured. Empty/missing secret means no callback authentication. A public write endpoint can create results/leads for a known job id if payload passes schema.
- Callback processing is multi-step and non-transactional. Partial insertion/status failures may leave inconsistent job/result/lead state.
- `UsageService` and services use multiple counters; concurrent hunt/AI requests can pass checks against the same old counter and overwrite increments. The code lacks atomic check-and-increment for those operations.
- Network discovery computes exact-case array overlap in application memory and loads the candidate set before pagination. It does not use the GIN indexes claimed by project narrative for a database-side ranking query; performance and matching semantics will degrade with scale.
- Network API accepts a recipient UUID and checks existing connection state, but does not require that the recipient is currently discoverable. A user can be targeted outside the discovery list if their ID is known.
- `messages` logic advertises sent/delivered/read statuses, but read behavior is implemented as participant `last_read_at`; no delivered/read transitions for message rows are visible.
- `supabase/config.toml` has local Google OAuth enabled with environment placeholders and email confirmation disabled. These local settings do not prove that production auth providers or email flows are configured.
- `apps/api/test/app.e2e-spec.ts` expects `GET /` to return `Hello World!`; current bootstrap has global `/api` and there is no root controller in the module list. The test appears stale and is weak evidence of a working API.

## 6. AI and data quality: what is the actual technical contribution?

The repository includes several AI call paths, but the case for their reliability and contribution is weak:

- AI outputs are saved, but there is no evaluation dataset, human rating protocol, baseline, or model comparison.
- Lead fit scoring asks an LLM for a 0–100 number and short explanation. There is no evidence the score correlates with user-rated relevance or improves outcomes; the number can look precise without being calibrated.
- The scorer's profile input is assembled from `profiles` fields and may not include a resume or target role from the separate profile form.
- The local generator's instruction explicitly asks for fabricated realistic examples and hidden provenance. That is a demonstration technique, not a trustworthy discovery feature.
- The unused Anthropic validator/Reddit-HN aggregator suggest an abandoned or competing architecture. The code does not explain whether this was a prototype, a replacement, or a future feature.
- Prompts are large and embedded in service/source files, but there is no prompt versioning, output schema evaluation suite, or audit trail for model/provider/version beyond some generation inputs.
- There is no evidence of cost/latency measurement, rate-limit behavior tests, user consent for sending profile/resume data to third parties, retention policy, or output safety review.

An examiner will ask: What did the team build beyond sending a prompt to a hosted model? How is relevance measured? What is the baseline? How many listings were evaluated? What does a score of 80 mean? How frequently does the model invent a qualification, location or salary? What prevents a fabricated lead from being presented as real?

## 7. Security, privacy, and responsible-data questions

This is not a compliance certification, but the following are essential FYP design questions:

- What is the legal and platform-policy basis for collecting LinkedIn, Upwork and Fiverr listings? Which official APIs or approved datasets are used? Is user-agent scraping or an n8n actor used? How are rate limits, access controls and takedown requests handled?
- Are profile/resume contents sent to Groq or other model providers? What user notice and consent is given? What retention/deletion does the provider apply? The code persists raw generation `input_data` in `ai_generations`.
- Do account deletion cascades cover all user-owned data and external provider state? Supabase foreign keys cascade many records, but Stripe customer/subscription cleanup and email/Groq history implications need explicit consideration.
- Is contact inbox data truly admin-only at the database layer? Current SQL policy suggests no.
- Are conversation Broadcast topics private and authorized? Current sender explicitly sets `private: false`.
- Are email messages HTML-escaped? User text is directly interpolated into markup.
- Is `N8N_WEBHOOK_SECRET` always required in production? Code makes it optional.
- Are service role keys kept server-only? They should never be exposed to web build args or browser code; deployment and CI should enforce this.
- Are external results stored with enough provenance to let users report abuse, stale listings, fraud or inaccurate AI extraction?

An FYP about job opportunity discovery handles user identity, career history, contact details, potentially sensitive messages and third-party platform data. Privacy and integrity are central design concerns, not optional add-ons.

## 8. Why this is weak as a final-year project in its current evidence state

### A. Problem definition is not bounded

Three distinct user personas and many adjacent features are combined. This makes requirements, user testing, and success criteria diffuse.

### B. The core claim is not demonstrated by the implementation

Actual multi-platform collection is the headline feature, yet the local code path fabricates results. The real n8n path is external and not included. This is the largest gap between claimed solution and reproducible artifact.

### C. Technical novelty and learning outcomes are not visible

The repository mostly composes established frameworks and external services. That can be a valid software engineering project, but the report must show a meaningful engineering contribution (for example, measurable ranking quality, robust provenance-aware aggregation, or a validated workflow). No such evaluation is visible here.

### D. The implementation is broad but shallow/inconsistent

Several modules appear plausible in the UI but have mismatched contracts, incomplete event behavior, duplicated models, abandoned code paths, or unsupported formats. Breadth is not evidence of completeness.

### E. No convincing verification strategy is present

Visible tests are limited to lead service quota behavior and one stale e2e smoke test. There are no evident end-to-end tests of signup → hunt → callback → lead → scoring → user action; no RLS/privacy tests; no webhook replay/cancellation tests; no Stripe webhook tests; no AI output evaluation; and no user study. Without verification, the team cannot make reliable claims about correctness or impact.

### F. No baseline or measured outcome

There is no evidence that the system reduces search time, improves match quality, increases applications, or improves outreach success. The core product question remains unanswered.

### G. Reproducibility and research ethics are uncertain

The external scraping workflow is missing; environment setup is contradictory; model-generated synthetic data is concealed by prompt design. These weaken repeatability and trust.

### H. Operational product features obscure the academic contribution

Stripe, notifications, admin CRUD, contact mail, themes, and animation consume scope. Unless the FYP is explicitly about full-stack SaaS engineering and evaluated as such, these features do not establish the success of the central research/product idea.

## 9. Examination questions the team should be ready to answer

### Problem and users

1. Give the problem in one sentence without naming technologies or listing features.
2. Who is the primary user for the evaluated version? Why did you include the other two roles?
3. What do those users do today, what is painful about it, and what evidence did you collect before building?
4. What is the single success metric? What was its baseline and measured result?
5. Which feature would you remove if you had half the time, and why?

### Data and the hunt pipeline

6. Demonstrate a result from each supported source with its original URL and retrieval timestamp. How do you prove it is real?
7. Which parts are live scraping, which are generated, and which are mocked? Why is that distinction hidden in the local generation prompt?
8. Where is the deployed n8n workflow source? How does the API authenticate it and how are callback retries made idempotent?
9. How do you handle cancellation when the scraper is already running? Can a callback resurrect a cancelled job?
10. How do you deduplicate listings across jobs and platforms? What is the canonical identity of a listing?
11. How do you comply with source-site terms, robots rules, privacy expectations, and rate limits?
12. What prevents a user from being misled by stale listings, fabricated salary data, or a generic platform search link?

### AI claims

13. What is novel in the AI component beyond a prompt call? Show a baseline and evaluation rubric.
14. What does a match score of 0, 50, or 100 mean? How was calibration measured?
15. Does the score use the resume/profile a user entered in settings? Trace the exact row and fields.
16. What is the false-positive/false-negative rate on a labeled sample? How many users rated the results?
17. How do you prevent invented facts, and how do you disclose model-generated or inferred fields?
18. Which provider is used in production: Groq, Gemini, or Anthropic? Where are keys configured? What happens on quota/rate failures?

### Data design, security and correctness

19. Why do `profiles` and `user_profiles` both represent a user's professional profile? Which is canonical?
20. Which source is authoritative for plan limits and usage: shared constants, `plans`, `usage`, or `usage_events`?
21. Can concurrent requests exceed a plan quota? Can webhook replay create duplicate leads?
22. Can an ordinary authenticated user read contact submissions directly from Supabase? Show the effective RLS policy and test it.
23. Can a nonparticipant subscribe to a conversation Broadcast topic? Demonstrate authorization.
24. Is the webhook secret mandatory in production? What blocks requests when it is unset?
25. What happens to Stripe state, generated content, messages and user data after account deletion?
26. Which routes are authenticated at the API layer, and which rely on client UI checks?

### Delivery and FYP evidence

27. Can an independent examiner clone the repo, configure only documented variables, migrate a clean Supabase DB, and run the main flow?
28. Why does the checked-in e2e test expect an unregistered root route to return `Hello World!`?
29. Show the complete test strategy for the most important workflow, not just a successful screen recording.
30. What are the limitations and failure modes? Which claims in README should be narrowed to match the implementation?
31. What was individually contributed by each team member, and what parts rely on third-party systems?
32. What evidence supports the conclusion that the project solves the stated problem?

## 10. What would make the project defensible

The team should not try to polish every module at once. A credible FYP revision would:

1. Pick one primary use case and user group. A practical scope could be “collect and rank verifiable remote software-contract listings for freelancers,” or “help job seekers track and prioritize listings from a defined dataset.” Do not combine candidate sourcing and job seeking unless both are separately specified and evaluated.
2. Make data provenance explicit. Either collect real data using a documented permitted source, or clearly label generated/demo data and never imply it is a live listing. Version the n8n workflow or replace it with a repository-contained adapter.
3. Define the lifecycle of a result: source → retrieval time → canonical URL → normalization → deduplication → relevance rank → user feedback → stale/closed state. Preserve enough evidence for users and evaluators to audit it.
4. Choose one canonical professional profile schema and make the scorer consume that exact schema. Remove the duplicate store or document a migration path.
5. Consolidate plan/usage logic or temporarily remove paid tiers. If quotas remain, enforce them atomically and test concurrent requests, auto-created leads, and event replays.
6. Fix correctness/security blockers: enum mismatch, environment names, missing required API env, broad contact access, notification insert policy, private chat broadcasts, webhook authentication, callback idempotency/cancellation, HTML escaping, and PDF contract.
7. Add an automated, reproducible test path for the central workflow and privacy boundary. Include migrations/RLS tests and mock external services deterministically.
8. Evaluate the outcome with a labeled dataset and real target users. Compare ranking against a baseline; report precision/recall or user-rated relevance, freshness, time saved, latency, and failure rate. State sample size and limitations.
9. Rewrite README and presentation claims to distinguish implemented, external, mocked, and planned behavior. Remove claims the source cannot substantiate.

## 11. Suggested examiner scoring lens

This is an illustrative rubric, not an institutional grade. It shows where evidence is currently strongest or weakest from repository inspection alone.

| FYP dimension | Repository-only assessment | Why |
|---|---|---|
| Problem importance | Unproven | Plausible need, but user research and a bounded problem statement are absent. |
| Scope and requirements | Weak | Too many personas and adjacent features; no clear prioritization or acceptance criteria visible. |
| Architecture and implementation effort | Moderate | Real monorepo, layered API, migrations, authentication and integration code are present. |
| Core feature correctness | Weak/uncertain | Central hunt path is synthetic by default; callback, cancellation, quota and schema concerns. |
| Security and privacy | Needs substantial work | Broad contact read policy, public broadcast setting, optional webhook secret and user-content email HTML require resolution. |
| Technical novelty | Unclear | External services and prompt calls dominate; no evaluated algorithm or novel method is established. |
| Testing and reproducibility | Weak | Few tests visible; docs/env mismatch; key n8n workflow absent. |
| Evaluation and impact | Missing from repository | No measured baseline, user study, dataset, or outcome metrics visible. |
| Documentation accuracy | Weak | Product/documentation claims diverge from source and environment setup. |

## Final assessment

The project has enough implementation material to become a useful focused product prototype, but the current repository invites the examiner to ask whether the headline feature is real, whether results can be trusted, which user is being served, whether the main AI feature is evaluated, and whether the flows work on a clean setup. Those are foundational objections, not cosmetic ones.

The strongest defense is not to claim that every listed feature is complete. It is to narrow the project claim to what can be demonstrated, disclose synthetic and external components, fix the concrete contract/security problems, and present measured evidence against a clearly stated baseline. Until that is done, the repository supports a conclusion of **ambitious prototype, weakly validated problem-solution fit, and insufficient evidence for a strong FYP**, rather than a conclusion that the project has proven its central promise.
