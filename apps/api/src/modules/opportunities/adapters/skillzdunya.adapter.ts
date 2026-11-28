import type {
  NormalizedOpportunity,
  OpportunitySourceAdapter,
  SearchCriteria,
  SourceError,
  SourcePage,
  SourceResult,
} from '@outsauce/shared';

const SKILLZDUNYA_SEARCH_URL = 'https://skillzdunya.com/api/v1/jobs';
const DEFAULT_THROTTLE_MS = 1500;
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

interface SkillzDunyaRawJob {
  id?: unknown;
  slug?: unknown;
  title?: unknown;
  url?: unknown;
  organization?: { title?: unknown; slug?: unknown; type?: unknown } | null;
  organization_type?: unknown;
  is_government?: unknown;
  is_international?: unknown;
  published_at?: unknown;
  deadline?: unknown;
  is_expired?: unknown;
  total_vacancies?: unknown;
  salary_range?: unknown;
  education_required?: unknown;
  experience_required?: unknown;
  age_limit?: unknown;
  gender?: unknown;
  cities?: Array<{ title?: unknown; slug?: unknown }>;
  qualifications?: Array<{ title?: unknown; slug?: unknown }>;
  categories?: Array<{ title?: unknown; slug?: unknown }>;
  apply_url?: unknown;
  source_url?: unknown;
  image?: unknown;
}

interface ParsedResponse {
  jobs: unknown[];
  currentPage?: number;
  lastPage?: number;
  perPage?: number;
  total?: number;
}

export interface SkillzDunyaAdapterOptions {
  throttleMs?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export class SkillzDunyaAdapter implements OpportunitySourceAdapter {
  readonly sourceKey = 'skillzdunya';
  readonly displayName = 'SkillzDunya';

  private readonly throttleMs: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private lastRequestAt = 0;

  constructor(options: SkillzDunyaAdapterOptions = {}) {
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
    if (criteria.location) params.set('city', criteria.location);
    if (criteria.category) params.set('category', criteria.category);
    params.set(
      'per_page',
      String(Math.min(criteria.limit ?? DEFAULT_LIMIT, MAX_LIMIT)),
    );
    params.set('page', String(Math.max(1, criteria.page ?? 1)));

    const url = `${SKILLZDUNYA_SEARCH_URL}?${params.toString()}`;

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
        message: `SkillzDunya returned HTTP ${response.status}`,
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
          message: `Failed to parse SkillzDunya JSON: ${
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
          message: 'SkillzDunya response did not match expected shape',
        },
      };
    }

    const items: NormalizedOpportunity[] = [];
    for (const raw of parsed.jobs) {
      const normalized = this.normalize(raw);
      if (normalized) items.push(normalized);
    }

    const current = parsed.currentPage ?? 1;
    const last = parsed.lastPage ?? 1;
    const nextPage = current < last ? current + 1 : null;

    const page: SourcePage = {
      items,
      nextPage,
      totalCount: parsed.total ?? null,
      fetchedAt: new Date().toISOString(),
      rawResponse: json,
    };
    return { ok: true, page };
  }

  normalize(item: unknown): NormalizedOpportunity | null {
    if (!item || typeof item !== 'object') return null;
    const raw = item as SkillzDunyaRawJob;

    const externalId =
      typeof raw.id === 'number'
        ? String(raw.id)
        : typeof raw.id === 'string'
          ? raw.id
          : '';
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    const sourceUrl = typeof raw.url === 'string' ? raw.url.trim() : '';
    if (!externalId || !title || !sourceUrl) return null;

    const org = raw.organization;
    const companyName =
      org && typeof org === 'object' && typeof org.title === 'string'
        ? org.title
        : null;

    const cities = Array.isArray(raw.cities) ? raw.cities : [];
    const firstCity = cities.find(
      (c): c is { title: string } => !!c && typeof c.title === 'string',
    );
    const location = firstCity?.title ?? null;

    const categoryTitles = new Set<string>();
    if (Array.isArray(raw.categories)) {
      for (const cat of raw.categories) {
        if (cat && typeof cat.title === 'string' && cat.title.trim()) {
          categoryTitles.add(cat.title.trim());
        }
      }
    }
    if (Array.isArray(raw.qualifications)) {
      for (const qual of raw.qualifications) {
        if (qual && typeof qual.title === 'string' && qual.title.trim()) {
          categoryTitles.add(qual.title.trim());
        }
      }
    }
    const categories = Array.from(categoryTitles);

    const salary = this.parseSalaryRange(raw.salary_range);

    const publishedAt =
      typeof raw.published_at === 'string' && raw.published_at.trim()
        ? this.toIsoDate(raw.published_at)
        : null;

    const deadline =
      typeof raw.deadline === 'string' && raw.deadline.trim()
        ? this.toIsoDate(raw.deadline)
        : null;

    const status = this.deriveStatus(raw.is_expired, deadline);

    const applyUrl =
      typeof raw.apply_url === 'string' && raw.apply_url.trim()
        ? raw.apply_url
        : null;

    return {
      sourceKey: this.sourceKey,
      externalId,
      sourceUrl,
      title,
      companyName,
      location,
      descriptionExcerpt: null,
      workMode: 'onsite',
      employmentType: 'unknown',
      seniority: null,
      categories,
      remoteRegions: ['Pakistan'],
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      salaryPeriod: 'unknown',
      status,
      publishedAt,
      deadline,
      applyUrl,
      raw: item,
    };
  }

  private parseSalaryRange(value: unknown): {
    min: number | null;
    max: number | null;
    currency: string | null;
  } {
    if (typeof value !== 'string') {
      return { min: null, max: null, currency: null };
    }

    const match = value.match(
      /([A-Z]{3})\s+([\d,]+)(?:\s*[–—\-]\s*([\d,]+))?/,
    );
    if (!match) {
      return { min: null, max: null, currency: null };
    }

    const currency = match[1];
    const minParsed = Number(match[2].replace(/,/g, ''));
    const maxParsed = match[3] ? Number(match[3].replace(/,/g, '')) : minParsed;

    if (!Number.isFinite(minParsed)) {
      return { min: null, max: null, currency: null };
    }

    return {
      min: minParsed,
      max: Number.isFinite(maxParsed) ? maxParsed : minParsed,
      currency,
    };
  }

  private deriveStatus(
    isExpired: unknown,
    deadlineIso: string | null,
  ): NormalizedOpportunity['status'] {
    if (isExpired === true) return 'closed';
    if (deadlineIso) {
      const deadlineMs = Date.parse(deadlineIso);
      if (Number.isFinite(deadlineMs) && deadlineMs < this.now()) {
        return 'closed';
      }
    }
    return 'open';
  }

  private toIsoDate(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.includes('T')) {
      const ms = Date.parse(trimmed);
      return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
    }
    const ms = Date.parse(`${trimmed}T00:00:00Z`);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }

  private parseResponse(json: unknown): ParsedResponse | null {
    if (!json || typeof json !== 'object') return null;
    const obj = json as Record<string, unknown>;
    if (!Array.isArray(obj.data)) return null;

    const meta =
      obj.meta && typeof obj.meta === 'object'
        ? (obj.meta as Record<string, unknown>)
        : null;

    return {
      jobs: obj.data,
      currentPage:
        meta && typeof meta.current_page === 'number'
          ? meta.current_page
          : undefined,
      lastPage:
        meta && typeof meta.last_page === 'number' ? meta.last_page : undefined,
      perPage:
        meta && typeof meta.per_page === 'number' ? meta.per_page : undefined,
      total: meta && typeof meta.total === 'number' ? meta.total : undefined,
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