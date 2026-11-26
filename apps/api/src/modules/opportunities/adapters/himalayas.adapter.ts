import type {
  NormalizedOpportunity,
  OpportunitySourceAdapter,
  SearchCriteria,
  SourceError,
  SourcePage,
  SourceResult,
} from '@outsauce/shared';

const HIMALAYAS_SEARCH_URL = 'https://himalayas.app/jobs/api/search';
const DEFAULT_THROTTLE_MS = 2000;
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 20;

interface HimalayasRawJob {
  title?: unknown;
  excerpt?: unknown;
  companyName?: unknown;
  companySlug?: unknown;
  employmentType?: unknown;
  seniority?: unknown;
  currency?: unknown;
  minSalary?: unknown;
  maxSalary?: unknown;
  salaryPeriod?: unknown;
  locationRestrictions?: unknown;
  categories?: unknown;
  pubDate?: unknown;
  applicationLink?: unknown;
  guid?: unknown;
}

interface ParsedResponse {
  jobs: unknown[];
  limit?: number;
  offset?: number;
  totalCount?: number;
}

export interface HimalayasAdapterOptions {
  throttleMs?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export class HimalayasAdapter implements OpportunitySourceAdapter {
  readonly sourceKey = 'himalayas';
  readonly displayName = 'Himalayas';

  private readonly throttleMs: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private lastRequestAt = 0;

  constructor(options: HimalayasAdapterOptions = {}) {
    this.throttleMs = options.throttleMs ?? DEFAULT_THROTTLE_MS;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep =
      options.sleep ??
      ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
    this.now = options.now ?? (() => Date.now());
  }

  async search(criteria: SearchCriteria): Promise<SourceResult> {
    await this.throttle();

    const params = new URLSearchParams();
    if (criteria.keywords) params.set('q', criteria.keywords);
    if (criteria.location) params.set('country', criteria.location);
    if (criteria.category) params.set('category', criteria.category);
    params.set('limit', String(Math.min(criteria.limit ?? DEFAULT_LIMIT, MAX_LIMIT)));
    if (criteria.page && criteria.page > 1) params.set('page', String(criteria.page));

    const url = `${HIMALAYAS_SEARCH_URL}?${params.toString()}`;

    let response: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        response = await this.fetchImpl(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      return {
        ok: false,
        error: {
          sourceKey: this.sourceKey,
          code: isAbort ? 'timeout' : 'network',
          message: err instanceof Error ? err.message : 'Network error',
        },
      };
    }

    if (!response.ok) {
      const error: SourceError = {
        sourceKey: this.sourceKey,
        code: response.status === 429 ? 'rate_limit' : 'http',
        message: `Himalayas returned HTTP ${response.status}`,
        httpStatus: response.status,
      };
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const parsed = retryAfter ? Number(retryAfter) : NaN;
        if (Number.isFinite(parsed)) error.retryAfterMs = parsed * 1000;
      }
      return { ok: false, error };
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (err) {
      return {
        ok: false,
        error: {
          sourceKey: this.sourceKey,
          code: 'parse',
          message: `Failed to parse Himalayas JSON: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        },
      };
    }

    const parsed = this.parseResponse(json);
    if (!parsed) {
      return {
        ok: false,
        error: {
          sourceKey: this.sourceKey,
          code: 'parse',
          message: 'Himalayas response did not match expected shape',
        },
      };
    }

    const items: NormalizedOpportunity[] = [];
    for (const raw of parsed.jobs) {
      const normalized = this.normalize(raw);
      if (normalized) items.push(normalized);
    }

    const limit = parsed.limit ?? DEFAULT_LIMIT;
    const offset = parsed.offset ?? 0;
    const total = parsed.totalCount ?? null;
    const nextPage =
      total !== null && offset + limit < total ? Math.floor(offset / limit) + 2 : null;

    const page: SourcePage = {
      items,
      nextPage,
      totalCount: total,
      fetchedAt: new Date().toISOString(),
      rawResponse: json,
    };
    return { ok: true, page };
  }

  normalize(item: unknown): NormalizedOpportunity | null {
    if (!item || typeof item !== 'object') return null;
    const raw = item as HimalayasRawJob;

    const guid = typeof raw.guid === 'string' ? raw.guid.trim() : '';
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    if (!guid || !title) return null;

    const restrictions = Array.isArray(raw.locationRestrictions)
      ? raw.locationRestrictions.filter((r): r is string => typeof r === 'string')
      : [];

    const categories = Array.isArray(raw.categories)
      ? raw.categories.filter((c): c is string => typeof c === 'string')
      : [];

    const seniorityArr = Array.isArray(raw.seniority)
      ? raw.seniority.filter((s): s is string => typeof s === 'string')
      : [];

    const publishedAt =
      typeof raw.pubDate === 'number' && Number.isFinite(raw.pubDate)
        ? new Date(raw.pubDate * 1000).toISOString()
        : null;

    const applyUrl =
      typeof raw.applicationLink === 'string' && raw.applicationLink.trim()
        ? raw.applicationLink
        : null;

    return {
      sourceKey: this.sourceKey,
      externalId: guid,
      sourceUrl: guid,
      title,
      companyName: typeof raw.companyName === 'string' ? raw.companyName : null,
      location: this.deriveLocation(restrictions),
      descriptionExcerpt: typeof raw.excerpt === 'string' ? raw.excerpt : null,
      workMode: 'remote',
      employmentType: this.mapEmploymentType(raw.employmentType),
      seniority: seniorityArr[0] ?? null,
      categories,
      remoteRegions: restrictions,
      salaryMin: typeof raw.minSalary === 'number' ? raw.minSalary : null,
      salaryMax: typeof raw.maxSalary === 'number' ? raw.maxSalary : null,
      salaryCurrency: typeof raw.currency === 'string' ? raw.currency : null,
      salaryPeriod: this.mapSalaryPeriod(raw.salaryPeriod),
      status: 'open',
      publishedAt,
      deadline: null,
      applyUrl,
      raw: item,
    };
  }

  private deriveLocation(restrictions: string[]): string {
    if (restrictions.length === 0) return 'Remote';
    if (restrictions.length === 1) return restrictions[0];
    return `Remote (${restrictions.length} countries)`;
  }

  private mapEmploymentType(value: unknown): NormalizedOpportunity['employmentType'] {
    if (typeof value !== 'string') return 'unknown';
    const v = value.toLowerCase().replace(/[\s_-]/g, '');
    if (v === 'fulltime') return 'full_time';
    if (v === 'parttime') return 'part_time';
    if (v === 'contract' || v === 'contractor') return 'contract';
    if (v === 'internship' || v === 'intern') return 'internship';
    if (v === 'temporary' || v === 'temp') return 'temporary';
    return 'unknown';
  }

  private mapSalaryPeriod(value: unknown): NormalizedOpportunity['salaryPeriod'] {
    if (typeof value !== 'string') return 'unknown';
    const v = value.toLowerCase();
    if (v === 'annual' || v === 'yearly' || v === 'year') return 'annual';
    if (v === 'monthly' || v === 'month') return 'monthly';
    if (v === 'hourly' || v === 'hour') return 'hourly';
    if (v === 'daily' || v === 'day') return 'daily';
    return 'unknown';
  }

  private parseResponse(json: unknown): ParsedResponse | null {
    if (!json || typeof json !== 'object') return null;
    const obj = json as Record<string, unknown>;
    if (!Array.isArray(obj.jobs)) return null;
    return {
      jobs: obj.jobs,
      limit: typeof obj.limit === 'number' ? obj.limit : undefined,
      offset: typeof obj.offset === 'number' ? obj.offset : undefined,
      totalCount: typeof obj.totalCount === 'number' ? obj.totalCount : undefined,
    };
  }

  private async throttle(): Promise<void> {
    if (this.throttleMs <= 0) return;
    const elapsed = this.now() - this.lastRequestAt;
    if (this.lastRequestAt > 0 && elapsed < this.throttleMs) {
      await this.sleep(this.throttleMs - elapsed);
    }
    this.lastRequestAt = this.now();
  }
}