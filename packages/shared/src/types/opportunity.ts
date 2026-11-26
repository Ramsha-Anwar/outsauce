/**
 * PR-06 domain types — source-agnostic job opportunity model + adapter contract.
 * See docs/PR-06-ARCHITECTURE.md for the full design.
 */

// ---------------------------------------------------------------------------
// Enums (string unions)
// ---------------------------------------------------------------------------

export type OpportunityStatus = 'open' | 'stale' | 'closed' | 'unknown';

export type WorkMode = 'remote' | 'onsite' | 'hybrid' | 'unknown';

export type EmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'internship'
  | 'temporary'
  | 'unknown';

export type SalaryPeriod = 'annual' | 'monthly' | 'hourly' | 'daily' | 'unknown';

// ---------------------------------------------------------------------------
// Normalized opportunity (source-agnostic)
// ---------------------------------------------------------------------------

/**
 * Canonical, source-agnostic job opportunity record.
 *
 * Every adapter must map its source payload into this shape before persistence.
 * Rule: if the source does not provide a field, it is `null` or `'unknown'`.
 * Never inferred, never fabricated.
 */
export interface NormalizedOpportunity {
  // Identity
  sourceKey: string; // e.g. 'himalayas' | 'skillzdunya'
  externalId: string; // source-native identifier, unique per source
  sourceUrl: string; // canonical listing URL on the source

  // Core content
  title: string;
  companyName: string | null;
  location: string | null; // display string; full eligibility in remoteRegions
  descriptionExcerpt: string | null;

  // Classification
  workMode: WorkMode;
  employmentType: EmploymentType;
  seniority: string | null;
  categories: string[];

  // Eligibility (profile-aware matching)
  // Full list of countries/regions the role accepts. Empty = unknown/global.
  remoteRegions: string[];

  // Compensation
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod;

  // Status & lifecycle
  status: OpportunityStatus;
  publishedAt: string | null; // ISO 8601
  deadline: string | null; // ISO 8601

  // Application
  applyUrl: string | null;

  // Provenance (audit only, never user-facing)
  raw: unknown;
}

// ---------------------------------------------------------------------------
// Adapter contract
// ---------------------------------------------------------------------------

export interface SearchCriteria {
  keywords?: string; // free-text query
  location?: string; // city/country filter
  category?: string; // source-specific category if supported
  limit?: number; // per-page; clamped to source max
  page?: number; // 1-based
}

export interface SourcePage {
  items: NormalizedOpportunity[];
  nextPage: number | null; // null means no more pages
  totalCount: number | null; // if source reports it
  fetchedAt: string; // ISO 8601, when the fetch completed
  rawResponse: unknown; // for audit / debugging, not persisted
}

export type SourceResult =
  | { ok: true; page: SourcePage }
  | { ok: false; error: SourceError };

export interface SourceError {
  sourceKey: string;
  code: 'network' | 'http' | 'parse' | 'rate_limit' | 'timeout' | 'unknown';
  message: string;
  httpStatus?: number;
  retryAfterMs?: number;
}

/**
 * Contract every job source adapter must implement.
 *
 * Error handling: adapters NEVER throw for expected failures. They return
 * `{ ok: false, error }`. Throwing is reserved for programmer errors only.
 */
export interface OpportunitySourceAdapter {
  readonly sourceKey: string;
  readonly displayName: string;

  search(criteria: SearchCriteria): Promise<SourceResult>;

  /**
   * Called by search() internally; exposed for unit tests.
   * Returns null if the item cannot be normalized (skipped, not thrown).
   */
  normalize(item: unknown): NormalizedOpportunity | null;
}