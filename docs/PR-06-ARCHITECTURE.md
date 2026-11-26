
# PR-06 Architecture — Multi-Source Opportunity Ingestion

**Status:** Planning  
**Owner:** PR-06  
**Scope:** Source-agnostic adapter architecture + first two real sources (Himalayas, SkillzDunya) end-to-end  
**Approved sources:** `docs/SOURCES.md` (P0-03, commit `05aa70f`)

---

## 1. Objective

Take two publicly-accessible, zero-cost job APIs (Himalayas, SkillzDunya), normalize their heterogeneous responses into one canonical `Opportunity` record, persist it with full provenance and freshness evidence, and expose it through a small list/detail API + UI. This is the **first real discovery path** in Outsauce. Demo fixtures remain for UX preview, but real source-backed opportunities are the primary product.

---

## 2. Non-goals (deferred to later PRs)

- **Scheduled background sync** — PR-07 (durable worker)
- **AI ranking, scoring, explanations** — PR-10
- **Save / apply / feedback actions** — PR-08
- **Cross-source deduplication** (same job on Himalayas and SkillzDunya) — future
- **Admin data-quality dashboard** — PR-09
- **Full-text search, embeddings, semantic retrieval** — PR-10 / PR-11
- **Notifications on new opportunities** — PR-09+
- **User-defined custom sources** — out of scope entirely

PR-06 is strictly: fetch → normalize → persist → list/detail with provenance. No background jobs, no AI, no user actions.

---

## 3. Domain model

### 3.1 Normalized `Opportunity`

Canonical, source-agnostic record. Every source's payload maps into this shape before persistence.

```typescript
type OpportunityStatus = 'open' | 'stale' | 'closed' | 'unknown';
type WorkMode = 'remote' | 'onsite' | 'hybrid' | 'unknown';
type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'temporary' | 'unknown';
type SalaryPeriod = 'annual' | 'monthly' | 'hourly' | 'daily' | 'unknown';

interface NormalizedOpportunity {
  // Identity
  sourceKey: string;             // 'himalayas' | 'skillzdunya'
  externalId: string;            // source-native identifier, unique per source
  sourceUrl: string;             // canonical listing URL on the source

  // Core content
  title: string;
  companyName: string | null;
  location: string | null;       // display string; structured location kept in raw
  descriptionExcerpt: string | null;

  // Classification
  workMode: WorkMode;
  employmentType: EmploymentType;
  seniority: string | null;
  categories: string[];          // free-form tags/categories from source

  // Compensation
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod;

  // Status & lifecycle
  status: OpportunityStatus;
  publishedAt: string | null;    // ISO 8601
  deadline: string | null;       // ISO 8601

  // Application
  applyUrl: string | null;

  // Provenance
  raw: unknown;                  // original source item, for audit only (not user-facing)
}
```

**Rule:** if the source does not provide a field, it is `null` or `'unknown'`. Never inferred, never fabricated. This is the product-integrity rule from `PROJECT_MASTER_PROJECT_PROMPT.md` §6.

### 3.2 Adapter interface

Every source implements this interface. No source-specific logic leaks into the persistence layer or the API.

```typescript
interface SearchCriteria {
  keywords?: string;             // free-text query
  location?: string;             // city/country filter
  category?: string;             // source-specific category if supported
  limit?: number;                // per-page; clamped to source max
  page?: number;                 // 1-based
}

interface SourcePage {
  items: NormalizedOpportunity[];
  nextPage: number | null;       // null means no more pages
  totalCount: number | null;     // if source reports it
  fetchedAt: string;             // ISO 8601, when the fetch completed
  rawResponse: unknown;          // for audit / debugging, not persisted to opportunities table
}

type SourceResult =
  | { ok: true; page: SourcePage }
  | { ok: false; error: SourceError };

interface SourceError {
  sourceKey: string;
  code: 'network' | 'http' | 'parse' | 'rate_limit' | 'timeout' | 'unknown';
  message: string;
  httpStatus?: number;
  retryAfterMs?: number;
}

interface OpportunitySourceAdapter {
  readonly sourceKey: string;
  readonly displayName: string;

  search(criteria: SearchCriteria): Promise<SourceResult>;

  // Called by search() internally; exposed for unit tests
  normalize(item: unknown): NormalizedOpportunity | null;
}
```

**Error contract:** adapters **never throw** for expected failures. They return `{ ok: false, error }`. Throwing is reserved for programmer errors (e.g., calling with invalid arguments in development). This keeps the API layer's error handling uniform.

---

## 4. Source mappings

### 4.1 Himalayas (`himalayas.app/jobs/api/search`)

| Normalized field | Himalayas source | Transform |
|---|---|---|
| `sourceKey` | — | Constant `'himalayas'` |
| `externalId` | `guid` **or** `companySlug + '/' + slug` **or** hash of `sourceUrl` | **Verify in adapter implementation** — sample did not show an explicit per-job ID. Prefer explicit `guid` if present. |
| `sourceUrl` | Constructed: `https://himalayas.app/companies/{companySlug}/jobs/{slug}` | **Verify URL pattern against live API** |
| `title` | `title` | Direct |
| `companyName` | `companyName` | Direct |
| `location` | `locationRestrictions[0]` (or `'Remote'` if list length > 0) | First restriction, or `'Remote'` if length ≥ 1 |
| `workMode` | — | Constant `'remote'` — the Himalayas dataset is remote-only |
| `employmentType` | `employmentType` | Map: `'Full Time'` → `'full_time'`, `'Part Time'` → `'part_time'`, `'Contract'` → `'contract'`, `'Internship'` → `'internship'` |
| `seniority` | `seniority[0]` | First entry |
| `categories` | `categories` | Direct (already array of strings) |
| `salaryMin` | `minSalary` | Direct (nullable) |
| `salaryMax` | `maxSalary` | Direct (nullable) |
| `salaryCurrency` | `currency` | Direct |
| `salaryPeriod` | `salaryPeriod` | Direct (`'annual'` observed) |
| `descriptionExcerpt` | `excerpt` | Direct |
| `status` | Derived: `last_seen_at` within 14 days → `'open'`; else `'stale'` | Computed at persistence time |
| `publishedAt` | `null` — Himalayas does not expose per-job publish date | `null` — explicitly unknown |
| `deadline` | `null` — not exposed | `null` |
| `applyUrl` | `null` — apply happens via Himalayas listing | `null` |

**Rate-limit strategy:** Himalayas does not document a request rate, only 20 results per page. Adapter throttles to **1 request per 2 seconds** as a safety margin. No concurrent requests.

**Pagination:** `?page=N` with `offset`, `limit`, `totalCount` in response. Stop when `offset + limit >= totalCount`.

**Unknowns to verify during implementation** (do not guess):
- Is there a per-job `guid`, `id`, or `slug` field?
- Is `https://himalayas.app/companies/{companySlug}/jobs/{slug}` the correct canonical URL pattern?
- What is the exact field name for the per-job path segment?

### 4.2 SkillzDunya (`skillzdunya.com/api/v1/jobs`)

| Normalized field | SkillzDunya source | Transform |
|---|---|---|
| `sourceKey` | — | Constant `'skillzdunya'` |
| `externalId` | `id` (integer) → string | `String(item.id)` |
| `sourceUrl` | `url` | Direct (canonical SkillzDunya URL) |
| `title` | `title` | Direct |
| `companyName` | `organization.title` | Direct |
| `location` | `cities[0].title` | First city, else `null` |
| `workMode` | — | Constant `'onsite'` (SkillzDunya does not label work mode; treat as onsite by default) |
| `employmentType` | — | `'unknown'` — not exposed per-listing |
| `seniority` | — | `null` |
| `categories` | `categories[].title` ∪ `qualifications[].title` | Concatenate, dedupe |
| `salaryMin` | Parsed from `salary_range` (e.g., `"PKR 75,000 – 75,000"`) | Extract numeric min; null if unparseable |
| `salaryMax` | Parsed from `salary_range` | Extract numeric max |
| `salaryCurrency` | `'PKR'` if `salary_range` starts with `PKR`, else `null` | Extract prefix |
| `salaryPeriod` | — | `'unknown'` — typically monthly but not stated |
| `descriptionExcerpt` | — | `null` — SkillzDunya does not return full description in list API |
| `status` | `is_expired === true` → `'closed'`; `deadline < now` → `'closed'`; else `'open'` | Direct from source flags |
| `publishedAt` | `published_at` | Direct (ISO date) |
| `deadline` | `deadline` | Direct (ISO date) |
| `applyUrl` | `apply_url` | Direct |

**Additional provenance to store in `raw`:** `source_url` (upstream job board, e.g., jobz.pk), `image`, `is_government`, `organization_type`, `education_required`, `experience_required`, `age_limit`, `gender`, `total_vacancies`.

**Rate-limit strategy:** Documented 60 req/min. Adapter throttles to **1 request per 1.5 seconds** (safe margin). Token bucket in adapter, not shared across requests from different sources.

**Pagination:** `per_page` parameter, max ~50. Follow the source's page parameter (verify exact name during implementation).

---

## 5. Persistence

### 5.1 Tables

```sql
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  external_id text not null,
  source_url text not null,

  title text not null,
  company_name text,
  location text,
  description_excerpt text,

  work_mode text not null default 'unknown',
  employment_type text not null default 'unknown',
  seniority text,
  categories text[] not null default '{}',

  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  salary_period text not null default 'unknown',

  status text not null default 'unknown',
  published_at timestamptz,
  deadline timestamptz,

  apply_url text,

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),

  raw jsonb not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint opportunities_source_key_external_id_unique unique (source_key, external_id)
);

create index opportunities_source_key_idx on public.opportunities (source_key);
create index opportunities_status_idx on public.opportunities (status);
create index opportunities_published_at_idx on public.opportunities (published_at desc nulls last);
create index opportunities_last_seen_at_idx on public.opportunities (last_seen_at desc);
```

**RLS policy:**
- `SELECT` — `authenticated` role only (platform-wide read). No anonymous access.
- `INSERT`, `UPDATE`, `DELETE` — denied to `authenticated` and `anon`. Only service role writes (via the NestJS API).

This reflects the product rule: opportunities are platform data, not user-owned. Users read; only the ingestion pipeline writes.

### 5.2 No `source_observations` table in PR-06

`raw jsonb` inside `opportunities` preserves the last-seen source payload per opportunity. If a source later changes a listing's details, the record is updated in place with a fresh `last_seen_at` and `raw`. This is sufficient for PR-06.

Full historical observation tracking (audit trail of every fetch) is deferred — it belongs with the durable sync worker (PR-07) when there are real scheduled runs. Doing it now would store data with no clear retention policy and no clear consumer.

**Trade-off acknowledged:** we lose "what did this listing look like two weeks ago?" history. That is acceptable for PR-06 — the product promise is "fresh, traceable opportunities", not "archived listing history".

### 5.3 Freshness derivation

At write time (upsert), derive `status` from source signals:

- **SkillzDunya:** use `is_expired` and `deadline` from the payload. If `is_expired` or `deadline < now()` → `'closed'`. Else `'open'`.
- **Himalayas:** no explicit expiry. After each upsert, set `status = 'open'` and `last_seen_at = now()`. A **separate maintenance action** (not part of PR-06, planned for PR-07) will mark listings `'stale'` if `last_seen_at < now() - interval '14 days'`.

For PR-06, only the **write-time** derivation runs. Staleness sweeps come later.

---

## 6. API endpoints (PR-06)

```text
POST /api/opportunities/sync
  Body: { sourceKey, criteria: SearchCriteria }
  Auth: SupabaseAuthGuard
  Returns: { sourceKey, itemsFetched, itemsInserted, itemsUpdated, fetchedAt, sourceError?: SourceError }
  Behaviour: fetch one page from the adapter, upsert into opportunities, return counts.
             Does NOT run in a background worker. Synchronous for PR-06.

GET /api/opportunities
  Query: source_key?, status?, q?, page?, page_size?
  Auth: SupabaseAuthGuard
  Returns: { items: Opportunity[], totalCount, page, pageSize }

GET /api/opportunities/:id
  Auth: SupabaseAuthGuard
  Returns: full Opportunity record including raw source payload (for debugging display; raw not exposed to end-user UI in PR-06)
```

**Why `/sync` is synchronous in PR-06:** the fetch is small (one page, ≤20 items for Himalayas, ≤50 for SkillzDunya), well within HTTP timeout. The durable async worker with retries and cancellation is PR-07. Doing PR-07's job here would violate the ownership boundary.

**No `/sync` rate-limiting per user in PR-06.** Acceptable for the FYP demo scope (single user, controlled testing). Quota/rate-limit enforcement per user is a later concern (P3-05 / PR-09 territory).

---

## 7. UI (PR-06)

Minimal, matching existing shadcn/Tailwind conventions:

- **`/opportunities`** — list page with source filter, status filter, search box. Shows: title, company, location, source badge, freshness badge (`open` / `stale` / `closed`), posted date.
- **`/opportunities/[id]`** — detail page showing all normalized fields, **canonical source link** (`source_url`), **source attribution** ("View on Himalayas"), apply link if present.
- **Hunt creation form** — add an option to sync from Himalayas / SkillzDunya (in addition to the existing "Demo listings" option).

**Explicit non-goals for PR-06 UI:**
- No match scoring
- No "explain this match" AI text
- No save button
- No "apply" action

These belong to PR-08 (save/apply) and PR-10 (AI ranking).

---

## 8. Test plan

### Unit tests (per adapter)

- `normalize()` on a fixed fixture → exact expected `NormalizedOpportunity`
- `normalize()` on missing fields → `null`/`'unknown'` (never inferred)
- `normalize()` on malformed payload → returns `null` (skipped, not thrown)
- Rate-limit throttle: mock timers, assert no more than N requests in window
- Error mapping: HTTP 429 → `SourceError.code === 'rate_limit'`; timeout → `'timeout'`; parse failure → `'parse'`

### Integration tests

- `POST /api/opportunities/sync` with mocked adapter → items inserted into DB with expected fields
- Replay same sync twice → unique constraint prevents duplicates; `last_seen_at` updated
- `GET /api/opportunities` filters correctly
- `GET /api/opportunities/:id` 404s on missing ID
- RLS: anon user → 401/403; normal user → 200

### Live smoke test (manual, gated by user consent)

- Real fetch from Himalayas (`?q=react`) → assert ≥1 real opportunity persisted with valid `source_url`
- Real fetch from SkillzDunya (`?city=lahore`) → same
- No paid API calls anywhere

---

## 9. Deliverables (PR-06 acceptance)

- [ ] `OpportunitySourceAdapter` interface + `NormalizedOpportunity` type committed
- [ ] `HimalayasAdapter` implemented, tested against fixtures + one live smoke test
- [ ] `SkillzDunyaAdapter` implemented, tested against fixtures + one live smoke test
- [ ] DB migration `create_opportunities` committed and applied cleanly on `supabase db reset`
- [ ] `POST /api/opportunities/sync`, `GET /api/opportunities`, `GET /api/opportunities/:id` implemented
- [ ] `/opportunities` list page + `/opportunities/[id]` detail page with source attribution
- [ ] Provenance visible on detail page (canonical URL, source name, attribution)
- [ ] Freshness visible on list and detail
- [ ] API tests + e2e still pass
- [ ] Web lint remains 0/0
- [ ] `docs/SOURCES.md` updated with any new field discoveries
- [ ] `PROJECT_REFACTOR_PROGRESS.md` P0-03 evidence extended with live fetch screenshots

---

## 10. Open questions to answer during implementation

Do **not** guess these — check the live API:

1. Himalayas per-job identifier: `guid`? `id`? `slug`? URL pattern for `sourceUrl`?
2. Himalayas `seniority` array — always populated? Multiple values?
3. SkillzDunya pagination parameter name: `page`? `offset`? `cursor`?
4. SkillzDunya `salary_range` parse strategy — is `PKR` always the prefix? What about international listings?
5. Himalayas filter parameters: does `?q=react` search title only, or description too? Does `?country=PK` work?
6. Both: does the API set `Cache-Control` or rate-limit headers we should honor?

Answers to these go into the adapter implementation notes, not guessed in the architecture.

---

## 11. Rollout

1. Commit `docs/PR-06-ARCHITECTURE.md` (this file)
2. Implement shared types + interface + first adapter (Himalayas) + DB migration in one PR branch
3. Add SkillzDunya adapter in a follow-up commit on the same branch
4. Add API endpoints + UI
5. Verify end-to-end: real fetch → opportunity in DB → list page → detail page with attribution
6. Update `docs/SOURCES.md` and `PROJECT_REFACTOR_PROGRESS.md`
7. PR-06 complete → PR-07 (durable worker) unblocked

---

