import { SkillzDunyaAdapter } from './skillzdunya.adapter';

const LIVE_SAMPLE = {
  id: 5849,
  slug: 'university-of-veterinary-and-animal-sciences-uvas-lahore-jobs-2026-2',
  title:
    'University of Veterinary and Animal Sciences UVAS Lahore Jobs 2026 — Research Associate',
  url: 'https://skillzdunya.com/job/university-of-veterinary-and-animal-sciences-uvas-lahore-jobs-2026-2',
  organization: {
    title: 'University of Veterinary and Animal Sciences UVAS',
    slug: 'university-of-veterinary-and-animal-sciences-uvas',
    type: 'Department',
  },
  organization_type: 'Punjab Government',
  is_government: true,
  is_international: false,
  published_at: '2026-11-26',
  deadline: '2026-12-08',
  is_expired: false,
  total_vacancies: 1,
  salary_range: 'PKR 75,000 – 75,000',
  education_required: 'M.Phil. in Biochemistry',
  experience_required: 'Fresh / As per advertisement',
  age_limit: 'As per advertisement',
  gender: 'Both',
  cities: [
    { title: 'Lahore', slug: 'lahore' },
    { title: 'Pattoki', slug: 'pattoki-kasur' },
  ],
  qualifications: [
    { title: 'M.Phil', slug: 'mphil' },
    { title: 'M.Phil Chemistry', slug: 'mphil-chemistry' },
  ],
  categories: [{ title: 'Lahore Jobs', slug: 'lahore-jobs' }],
  apply_url: 'https://www.uvas.edu.pk/jobs',
  source_url: 'https://www.jobz.pk/job_jobs-791012.html',
  image:
    'https://skillzdunya.com/storage/advertisements/university-of-veterinary-and-animal-sciences-uvas-lahore-jobs-2026-2.webp',
};

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

// Fixed "now" for status derivation tests
const FIXED_NOW_MS = Date.parse('2026-11-28T00:00:00Z');

describe('SkillzDunyaAdapter', () => {
  describe('metadata', () => {
    it('exposes sourceKey and displayName', () => {
      const adapter = new SkillzDunyaAdapter();
      expect(adapter.sourceKey).toBe('skillzdunya');
      expect(adapter.displayName).toBe('SkillzDunya');
    });
  });

  describe('normalize()', () => {
    const adapter = new SkillzDunyaAdapter({
      throttleMs: 0,
      now: () => FIXED_NOW_MS,
    });

    it('maps the live-probe sample to NormalizedOpportunity', () => {
      const out = adapter.normalize(LIVE_SAMPLE);
      expect(out).not.toBeNull();
      if (!out) return;

      expect(out.sourceKey).toBe('skillzdunya');
      expect(out.externalId).toBe('5849');
      expect(out.sourceUrl).toBe(LIVE_SAMPLE.url);
      expect(out.title).toBe(LIVE_SAMPLE.title);
      expect(out.companyName).toBe('University of Veterinary and Animal Sciences UVAS');
      expect(out.location).toBe('Lahore');
      expect(out.workMode).toBe('onsite');
      expect(out.employmentType).toBe('unknown');
      expect(out.seniority).toBeNull();
      expect(out.categories).toEqual([
        'Lahore Jobs',
        'M.Phil',
        'M.Phil Chemistry',
      ]);
      expect(out.remoteRegions).toEqual(['Pakistan']);
      expect(out.salaryMin).toBe(75000);
      expect(out.salaryMax).toBe(75000);
      expect(out.salaryCurrency).toBe('PKR');
      expect(out.salaryPeriod).toBe('unknown');
      expect(out.status).toBe('open');
      expect(out.publishedAt).toBe('2026-11-26T00:00:00.000Z');
      expect(out.deadline).toBe('2026-12-08T00:00:00.000Z');
      expect(out.applyUrl).toBe('https://www.uvas.edu.pk/jobs');
      expect(out.raw).toBe(LIVE_SAMPLE);
    });

    it('returns null when id missing', () => {
      const item: Record<string, unknown> = { ...LIVE_SAMPLE };
      delete item.id;
      expect(adapter.normalize(item)).toBeNull();
    });

    it('returns null when title missing', () => {
      const item: Record<string, unknown> = { ...LIVE_SAMPLE };
      delete item.title;
      expect(adapter.normalize(item)).toBeNull();
    });

    it('returns null when url missing', () => {
      const item: Record<string, unknown> = { ...LIVE_SAMPLE };
      delete item.url;
      expect(adapter.normalize(item)).toBeNull();
    });

    it.each([null, 'string', 42, undefined, {}])(
      'returns null for invalid input: %p',
      (input) => {
        expect(adapter.normalize(input)).toBeNull();
      },
    );

    it('location: uses first city title', () => {
      const item = {
        ...LIVE_SAMPLE,
        cities: [
          { title: 'Karachi', slug: 'karachi' },
          { title: 'Lahore', slug: 'lahore' },
        ],
      };
      const out = adapter.normalize(item);
      if (!out) throw new Error('expected');
      expect(out.location).toBe('Karachi');
    });

    it('location: null when cities empty', () => {
      const item = { ...LIVE_SAMPLE, cities: [] };
      const out = adapter.normalize(item);
      if (!out) throw new Error('expected');
      expect(out.location).toBeNull();
    });

    it('categories: dedupes categories + qualifications', () => {
      const item = {
        ...LIVE_SAMPLE,
        categories: [{ title: 'Lahore Jobs' }, { title: 'M.Phil' }],
        qualifications: [{ title: 'M.Phil' }, { title: 'PhD' }],
      };
      const out = adapter.normalize(item);
      if (!out) throw new Error('expected');
      expect(out.categories).toEqual(['Lahore Jobs', 'M.Phil', 'PhD']);
    });

    describe('salary parsing', () => {
      it.each([
        ['PKR 75,000 – 75,000', 75000, 75000, 'PKR'],
        ['PKR 50,000', 50000, 50000, 'PKR'],
        ['PKR 48,500 – 1,025,000', 48500, 1025000, 'PKR'],
        ['PKR 50,000 - 75,000', 50000, 75000, 'PKR'], // hyphen
        ['PKR 50,000 — 75,000', 50000, 75000, 'PKR'], // em-dash
        ['USD 100,000', 100000, 100000, 'USD'],
      ])('parses "%s"', (input, expMin, expMax, expCurr) => {
        const item = { ...LIVE_SAMPLE, salary_range: input };
        const out = adapter.normalize(item);
        if (!out) throw new Error('expected');
        expect(out.salaryMin).toBe(expMin);
        expect(out.salaryMax).toBe(expMax);
        expect(out.salaryCurrency).toBe(expCurr);
      });

      it.each([
        'BPS-1 to BPS-3 (Government pay scale)',
        'As per Government / BPS pay scale',
        'As per contract terms in the advertisement',
        'Contract/honorarium package as per the advertisement (BPS-17 to BPS-21 posts)',
        '',
        null,
        undefined,
      ])('returns nulls for non-numeric "%s"', (input) => {
        const item = { ...LIVE_SAMPLE, salary_range: input };
        const out = adapter.normalize(item);
        if (!out) throw new Error('expected');
        expect(out.salaryMin).toBeNull();
        expect(out.salaryMax).toBeNull();
        expect(out.salaryCurrency).toBeNull();
      });
    });

    describe('status derivation', () => {
      it('is_expired=true → closed', () => {
        const item = { ...LIVE_SAMPLE, is_expired: true, deadline: '2099-01-01' };
        const out = adapter.normalize(item);
        if (!out) throw new Error('expected');
        expect(out.status).toBe('closed');
      });

      it('deadline in past → closed', () => {
        const item = { ...LIVE_SAMPLE, is_expired: false, deadline: '2026-01-01' };
        const out = adapter.normalize(item);
        if (!out) throw new Error('expected');
        expect(out.status).toBe('closed');
      });

      it('deadline in future → open', () => {
        const item = { ...LIVE_SAMPLE, is_expired: false, deadline: '2027-01-01' };
        const out = adapter.normalize(item);
        if (!out) throw new Error('expected');
        expect(out.status).toBe('open');
      });

      it('empty deadline → open', () => {
        const item = { ...LIVE_SAMPLE, is_expired: false, deadline: '' };
        const out = adapter.normalize(item);
        if (!out) throw new Error('expected');
        expect(out.status).toBe('open');
      });
    });
  });

  describe('search()', () => {
    const mockMeta = {
      current_page: 1,
      last_page: 5,
      per_page: 2,
      total: 10,
    };

    it('happy path: returns normalized items + page metadata', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(
        jsonResponse({ data: [LIVE_SAMPLE], meta: mockMeta }),
      );
      const adapter = new SkillzDunyaAdapter({
        fetchImpl,
        sleep: jest.fn(),
        now: () => FIXED_NOW_MS,
      });

      const result = await adapter.search({ keywords: 'engineer' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.page.items).toHaveLength(1);
      expect(result.page.items[0].sourceKey).toBe('skillzdunya');
      expect(result.page.nextPage).toBe(2);
      expect(result.page.totalCount).toBe(10);
    });

    it('nextPage null on last page', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(
        jsonResponse({
          data: [LIVE_SAMPLE],
          meta: { ...mockMeta, current_page: 5, last_page: 5 },
        }),
      );
      const adapter = new SkillzDunyaAdapter({
        fetchImpl,
        sleep: jest.fn(),
        now: () => FIXED_NOW_MS,
      });
      const result = await adapter.search({});
      if (!result.ok) throw new Error('expected ok');
      expect(result.page.nextPage).toBeNull();
    });

    it('HTTP 429 → rate_limit', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue(jsonResponse({}, 429, { 'retry-after': '10' }));
      const adapter = new SkillzDunyaAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      if (result.ok) throw new Error('expected error');
      expect(result.error.code).toBe('rate_limit');
      expect(result.error.retryAfterMs).toBe(10000);
    });

    it('HTTP 500 → http', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({}, 500));
      const adapter = new SkillzDunyaAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      if (result.ok) throw new Error('expected error');
      expect(result.error.code).toBe('http');
    });

    it('invalid JSON → parse', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(
        new Response('not json', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
      const adapter = new SkillzDunyaAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      if (result.ok) throw new Error('expected error');
      expect(result.error.code).toBe('parse');
    });

    it('missing data array → parse', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ notData: [] }));
      const adapter = new SkillzDunyaAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      if (result.ok) throw new Error('expected error');
      expect(result.error.code).toBe('parse');
    });

    it('network error → network', async () => {
      const fetchImpl = jest.fn().mockRejectedValue(new TypeError('fetch failed'));
      const adapter = new SkillzDunyaAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      if (result.ok) throw new Error('expected error');
      expect(result.error.code).toBe('network');
    });

    it('abort → timeout', async () => {
      const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
      const fetchImpl = jest.fn().mockRejectedValue(abortErr);
      const adapter = new SkillzDunyaAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      if (result.ok) throw new Error('expected error');
      expect(result.error.code).toBe('timeout');
    });

    it('throttles between requests', async () => {
      let clock = 1000;
      const sleeps: number[] = [];
      const fetchImpl = jest
        .fn()
        .mockImplementation(async () =>
          jsonResponse({ data: [], meta: mockMeta }),
        );
      const adapter = new SkillzDunyaAdapter({
        fetchImpl,
        now: () => clock,
        sleep: async (ms: number) => {
          sleeps.push(ms);
          clock += ms;
        },
      });

      await adapter.search({});
      clock += 500; // 500ms elapsed since last request
      await adapter.search({});

      expect(sleeps).toHaveLength(1);
      expect(sleeps[0]).toBe(1000); // 1500 - 500
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('includes q, per_page, page in URL', async () => {
      const fetchImpl = jest
        .fn()
        .mockImplementation(async () =>
          jsonResponse({ data: [], meta: mockMeta }),
        );
      const adapter = new SkillzDunyaAdapter({ fetchImpl, sleep: jest.fn() });
      await adapter.search({ keywords: 'react', page: 2, limit: 30 });
      const calledUrl = fetchImpl.mock.calls[0][0] as string;
      expect(calledUrl).toContain('q=react');
      expect(calledUrl).toContain('per_page=30');
      expect(calledUrl).toContain('page=2');
    });

    it('clamps limit to source max (50)', async () => {
      const fetchImpl = jest
        .fn()
        .mockImplementation(async () =>
          jsonResponse({ data: [], meta: mockMeta }),
        );
      const adapter = new SkillzDunyaAdapter({ fetchImpl, sleep: jest.fn() });
      await adapter.search({ limit: 200 });
      const calledUrl = fetchImpl.mock.calls[0][0] as string;
      expect(calledUrl).toContain('per_page=50');
    });
  });
});