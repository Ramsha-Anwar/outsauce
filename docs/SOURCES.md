# Outsauce — Source Register

**Last updated:** 2026-11-26  
**Budget constraint:** $0 out-of-pocket. Every source listed here is verified to have no API key requirement, no paid tier, and no chargeable overage at the documented access pattern.

This register records the approved opportunity sources for the refactor. A source may be implemented only after a GO decision is recorded here. See `PROJECT_REFACTOR_EXECUTION_PLAN.md` (PR-06) and `PROJECT_REFACTOR_FIX_PLAN.md` (B1, B2, B3).

---

## SOURCE-1: Himalayas Remote Jobs API — GO

| Field | Detail |
|---|---|
| **Source key** | `himalayas` |
| **Display label** | Himalayas (Remote Tech Jobs) |
| **Access method** | Public JSON HTTP API, no authentication |
| **Endpoint** | `GET https://himalayas.app/jobs/api/search?q={query}&page={N}` |
| **Browse feed** | `GET https://himalayas.app/jobs/api` (cursor pagination via `nextCursor`) |
| **Documentation** | Response includes an inline `comments` field describing pagination |
| **Verified** | 2026-11-26, HTTP 200, `Content-Type: application/json`, 4005 "react" jobs returned |
| **API key** | Not required |
| **Signup** | Not required |
| **Cost** | $0 — no paid tier for API access; no payment method on file |
| **Rate limits** | Documented: 20 results per search page. No explicit request rate documented; treat as best-effort and add a conservative client-side throttle (e.g., 1 request per 2 seconds) in the adapter. |
| **Pagination** | Search: `?page=1..N` with `offset`, `limit`, `totalCount`. Browse: `nextCursor` |
| **Allowed fields** | `title`, `excerpt`, `companyName`, `companySlug`, `companyLogo`, `employmentType`, `minSalary`, `maxSalary`, `salaryPeriod`, `currency`, `seniority[]`, `locationRestrictions[]`, `timezoneRestrictions[]`, `categories[]`, plus full listing URL constructed from `companySlug` and listing identifier |
| **Fields NOT present** | Explicit posting/expiry date; freshness must be derived from `updatedAt` (Unix seconds) and a re-fetch policy |
| **Attribution** | Required. Listings must link to the canonical Himalayas listing URL. Display "Powered by Himalayas" or similar attribution on source-filtered views. |
| **Retention** | Store normalized fields only. Do not store full `excerpt` content longer than needed to render the detail view; re-fetch on demand if the UI needs richer text. |
| **Sync frequency** | On-demand sync per user hunt. No scheduled background sync in this phase. |
| **Failure behavior** | Adapter returns a typed `SourceError` and the hunt is marked partial; previously stored opportunities remain visible with their last-observed freshness. |
| **Tech coverage** | Strong: software engineering, data, design, product categories |
| **Language** | English |
| **Decision** | **GO** — approved as the primary tech-focused source for PR-06 |

---

## SOURCE-2: SkillzDunya Jobs API — GO

| Field | Detail |
|---|---|
| **Source key** | `skillzdunya` |
| **Display label** | SkillzDunya (Pakistan Jobs) |
| **Access method** | Public JSON HTTP API, no authentication |
| **Endpoint** | `GET https://skillzdunya.com/api/v1/jobs?per_page={N}&city={city}` |
| **Verified** | 2026-11-26, HTTP 200, `Content-Type: application/json`, sample response contains full job objects |
| **API key** | Not required |
| **Signup** | Not required |
| **Cost** | $0 — free read-only API |
| **Rate limits** | Documented: 60 requests/minute per IP. Adapter must respect this with a token-bucket throttle. |
| **Pagination** | `per_page` parameter (max documented: 50). Follow-up requests use page-specific query parameters as documented by the source. |
| **Allowed fields** | `id`, `slug`, `title`, `url`, `organization.{title,slug,type}`, `organization_type`, `is_government`, `is_international`, `published_at`, `deadline`, `is_expired`, `total_vacancies`, `salary_range`, `education_required`, `experience_required`, `age_limit`, `gender`, `cities[]`, `qualifications[]`, `categories[]`, `apply_url`, `source_url`, `image` |
| **Fields with built-in freshness** | `published_at`, `deadline`, `is_expired` — use `deadline` + `is_expired` to drive `opportunity.status` (`open`, `stale`, `closed`) |
| **Fields with built-in provenance** | `url` (canonical SkillzDunya URL), `source_url` (upstream job board URL), `apply_url` (employer apply URL) — all three retained in the observation record |
| **Attribution** | Required. Link to the canonical SkillzDunya `url` field. |
| **Retention** | Store normalized fields + observation. `image` may be referenced by URL without storing the binary. |
| **Sync frequency** | On-demand sync per user hunt. No scheduled background sync in this phase. |
| **Failure behavior** | Typed `SourceError`; hunt marked partial; existing stored opportunities unaffected. |
| **Tech coverage** | Limited: mostly Pakistan government, university, and public-sector roles. Some private-sector and international listings are present. |
| **Language** | English (Pakistan) |
| **Decision** | **GO** — approved as the Pakistan-focused source for PR-06 |

---

## NOT USED (explicitly documented)

### Rozee.pk — NO-GO
- No official free public API. Third-party scrapers require Terms-of-Service risk not appropriate for an FYP.
- Do not integrate without an officially documented access grant.

### Mustakbil — NO-GO
- No official free public API. Same reasoning as Rozee.pk.

---

## BACKUP SOURCES (not approved yet, listed for future consideration)

The following sources were reviewed but are not part of the initial PR-06 slice:

| Source | Reason not selected now | When to consider |
|---|---|---|
| Remotive (`remotive.com/api/remote-jobs`) | Maintenance pace unclear; requests "few per day" | If Himalayas unavailable for a given category |
| Jobicy (`jobicy.com/api/v2/remote-jobs`) | Secondary; same category coverage as Himalayas | If Himalayas needs a second opinion in evaluation |
| Arbeitnow (`arbeitnow.com/api/job-board-api`) | Europe-focused | If the FYP expands to EU-based job seekers |
| Get on Board (`getonbrd.com/api/v0/...`) | LatAm-focused | If expanding to a LatAm segment |

---

## PR-06 implementation order

1. **Himalayas adapter** (primary, tech)
2. **SkillzDunya adapter** (Pakistan, second)
3. **Shared `OpportunitySourceAdapter` interface** — one implementation per source, identical normalization step after each
4. **Dedup key:** `(source_key, external_id)` primary; canonical URL hash fallback
5. **No scheduler in PR-06** — durable scheduled sync is PR-07. PR-06 is on-demand per hunt only.

---

## Attestation

The adapter authors verify each request above against the live API before PR-06 merge. If a source's terms or rate limits change, this document must be updated and the PR re-reviewed before the adapter continues to run.