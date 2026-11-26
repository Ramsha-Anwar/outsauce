import { HimalayasAdapter } from './himalayas.adapter';

const LIVE_SAMPLE = {
  title: 'Senior React Full-stack Developer',
  excerpt:
    'helps companies in the US and Europe hire experienced engineers, from funded startups to teams like Klarna, Retool, and Pinterest.',
  companyName: 'lemon.io',
  companySlug: 'lemon-io',
  companyLogo: 'https://cdn-images.himalayas.app/7q73pk07sy2xiwd47drvhwevk93r',
  employmentType: 'Full Time',
  minSalary: null,
  maxSalary: null,
  salaryPeriod: 'annual',
  seniority: ['Senior'],
  currency: 'USD',
  locationRestrictions: ['Albania', 'Andorra', 'Argentina'],
  timezoneRestrictions: [-11, 0, 5, 14],
  categories: [
    'Senior-Full-Stack-Engineer-(React-Node.Js)',
    'Senior-Full-Stack-Development',
    'React-Developer',
  ],
  parentCategories: ['Developer'],
  description: '<p>long HTML description…</p>',
  pubDate: 1794317072,
  applicationLink:
    'https://himalayas.app/companies/lemon-io/jobs/senior-react-full-stack-developer?utm_source=api',
  guid: 'https://himalayas.app/companies/lemon-io/jobs/senior-react-full-stack-developer',
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

describe('HimalayasAdapter', () => {
  describe('metadata', () => {
    it('exposes sourceKey and displayName', () => {
      const adapter = new HimalayasAdapter();
      expect(adapter.sourceKey).toBe('himalayas');
      expect(adapter.displayName).toBe('Himalayas');
    });
  });

  describe('normalize()', () => {
    const adapter = new HimalayasAdapter();

    it('maps the live-probe sample to NormalizedOpportunity', () => {
      const out = adapter.normalize(LIVE_SAMPLE);
      expect(out).not.toBeNull();
      if (!out) return;

      expect(out.sourceKey).toBe('himalayas');
      expect(out.externalId).toBe(LIVE_SAMPLE.guid);
      expect(out.sourceUrl).toBe(LIVE_SAMPLE.guid);
      expect(out.title).toBe('Senior React Full-stack Developer');
      expect(out.companyName).toBe('lemon.io');
      expect(out.workMode).toBe('remote');
      expect(out.employmentType).toBe('full_time');
      expect(out.salaryPeriod).toBe('annual');
      expect(out.salaryCurrency).toBe('USD');
      expect(out.salaryMin).toBeNull();
      expect(out.salaryMax).toBeNull();
      expect(out.seniority).toBe('Senior');
      expect(out.remoteRegions).toEqual(['Albania', 'Andorra', 'Argentina']);
      expect(out.location).toBe('Remote (3 countries)');
      expect(out.categories).toHaveLength(3);
      expect(out.publishedAt).toBe(new Date(1794317072 * 1000).toISOString());
      expect(out.applyUrl).toBe(LIVE_SAMPLE.applicationLink);
      expect(out.deadline).toBeNull();
      expect(out.status).toBe('open');
      expect(out.raw).toBe(LIVE_SAMPLE);
    });

    it('location: single country returns that country', () => {
      const item = { ...LIVE_SAMPLE, locationRestrictions: ['Pakistan'] };
      const out = adapter.normalize(item);
      if (!out) throw new Error('expected');
      expect(out.location).toBe('Pakistan');
      expect(out.remoteRegions).toEqual(['Pakistan']);
    });

    it('location: empty restrictions returns "Remote"', () => {
      const item = { ...LIVE_SAMPLE, locationRestrictions: [] };
      const out = adapter.normalize(item);
      if (!out) throw new Error('expected');
      expect(out.location).toBe('Remote');
      expect(out.remoteRegions).toEqual([]);
    });

    it('location: missing locationRestrictions field returns "Remote"', () => {
      const item: Record<string, unknown> = { ...LIVE_SAMPLE };
      delete item.locationRestrictions;
      const out = adapter.normalize(item);
      if (!out) throw new Error('expected');
      expect(out.location).toBe('Remote');
      expect(out.remoteRegions).toEqual([]);
    });

    it('returns null when guid is missing', () => {
      const item: Record<string, unknown> = { ...LIVE_SAMPLE };
      delete item.guid;
      expect(adapter.normalize(item)).toBeNull();
    });

    it('returns null when title is missing', () => {
      const item: Record<string, unknown> = { ...LIVE_SAMPLE };
      delete item.title;
      expect(adapter.normalize(item)).toBeNull();
    });

    it.each([null, 'string', 42, undefined])(
      'returns null for non-object input: %p',
      (input) => {
        expect(adapter.normalize(input)).toBeNull();
      },
    );

    it.each([
      ['Full Time', 'full_time'],
      ['full time', 'full_time'],
      ['FULL-TIME', 'full_time'],
      ['Part Time', 'part_time'],
      ['Contract', 'contract'],
      ['Internship', 'internship'],
      ['Temporary', 'temporary'],
      ['Weird Thing', 'unknown'],
      [null, 'unknown'],
      [undefined, 'unknown'],
    ])('employmentType: %p -> %s', (input, expected) => {
      const item = { ...LIVE_SAMPLE, employmentType: input };
      const out = adapter.normalize(item);
      if (!out) throw new Error('expected');
      expect(out.employmentType).toBe(expected);
    });

    it.each([
      ['annual', 'annual'],
      ['yearly', 'annual'],
      ['monthly', 'monthly'],
      ['hourly', 'hourly'],
      ['daily', 'daily'],
      ['weird', 'unknown'],
      [null, 'unknown'],
    ])('salaryPeriod: %p -> %s', (input, expected) => {
      const item = { ...LIVE_SAMPLE, salaryPeriod: input };
      const out = adapter.normalize(item);
      if (!out) throw new Error('expected');
      expect(out.salaryPeriod).toBe(expected);
    });
  });

  describe('search()', () => {
    it('happy path: returns normalized items + page metadata', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue(
          jsonResponse({ jobs: [LIVE_SAMPLE], limit: 20, offset: 0, totalCount: 1 }),
        );
      const adapter = new HimalayasAdapter({ fetchImpl, sleep: jest.fn() });

      const result = await adapter.search({ keywords: 'react' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.page.items).toHaveLength(1);
      expect(result.page.items[0].sourceKey).toBe('himalayas');
      expect(result.page.nextPage).toBeNull();
      expect(result.page.totalCount).toBe(1);
      expect(result.page.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('sets nextPage when more results exist', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue(
          jsonResponse({ jobs: [LIVE_SAMPLE], limit: 20, offset: 0, totalCount: 100 }),
        );
      const adapter = new HimalayasAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      if (!result.ok) throw new Error('expected ok');
      expect(result.page.nextPage).toBe(2);
    });

    it('HTTP 429 -> rate_limit with retryAfterMs', async () => {
      const fetchImpl = jest
        .fn()
        .mockResolvedValue(jsonResponse({}, 429, { 'retry-after': '5' }));
      const adapter = new HimalayasAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('rate_limit');
      expect(result.error.httpStatus).toBe(429);
      expect(result.error.retryAfterMs).toBe(5000);
    });

    it('HTTP 500 -> http', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({}, 500));
      const adapter = new HimalayasAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      if (result.ok) throw new Error('expected error');
      expect(result.error.code).toBe('http');
      expect(result.error.httpStatus).toBe(500);
    });

    it('invalid JSON -> parse', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(
        new Response('not json {', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
      const adapter = new HimalayasAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      if (result.ok) throw new Error('expected error');
      expect(result.error.code).toBe('parse');
    });

    it('missing jobs array -> parse', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ nothing: [] }));
      const adapter = new HimalayasAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      if (result.ok) throw new Error('expected error');
      expect(result.error.code).toBe('parse');
    });

    it('network error -> network', async () => {
      const fetchImpl = jest.fn().mockRejectedValue(new TypeError('fetch failed'));
      const adapter = new HimalayasAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      if (result.ok) throw new Error('expected error');
      expect(result.error.code).toBe('network');
    });

    it('abort -> timeout', async () => {
      const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
      const fetchImpl = jest.fn().mockRejectedValue(abortErr);
      const adapter = new HimalayasAdapter({ fetchImpl, sleep: jest.fn() });
      const result = await adapter.search({});
      if (result.ok) throw new Error('expected error');
      expect(result.error.code).toBe('timeout');
    });

    it('throttles second request to fill remaining window', async () => {
      let clock = 1000;
      const sleeps: number[] = [];
      const fetchImpl = jest
        .fn()
        .mockImplementation(async () =>
          jsonResponse({ jobs: [], limit: 20, offset: 0, totalCount: 0 }),
        );
      const adapter = new HimalayasAdapter({
        fetchImpl,
        now: () => clock,
        sleep: async (ms: number) => {
          sleeps.push(ms);
          clock += ms;
        },
      });

      await adapter.search({});
      clock += 500;
      await adapter.search({});

      expect(sleeps).toHaveLength(1);
      expect(sleeps[0]).toBe(1500);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it('includes q, limit, page in URL', async () => {
      const fetchImpl = jest
        .fn()
        .mockImplementation(async () =>
          jsonResponse({ jobs: [], limit: 20, offset: 0, totalCount: 0 }),
        );
      const adapter = new HimalayasAdapter({ fetchImpl, sleep: jest.fn() });
      await adapter.search({ keywords: 'react', page: 3, limit: 10 });
      const calledUrl = fetchImpl.mock.calls[0][0] as string;
      expect(calledUrl).toContain('q=react');
      expect(calledUrl).toContain('limit=10');
      expect(calledUrl).toContain('page=3');
    });

    it('clamps limit to source max (20)', async () => {
      const fetchImpl = jest
        .fn()
        .mockImplementation(async () =>
          jsonResponse({ jobs: [], limit: 20, offset: 0, totalCount: 0 }),
        );
      const adapter = new HimalayasAdapter({ fetchImpl, sleep: jest.fn() });
      await adapter.search({ limit: 500 });
      const calledUrl = fetchImpl.mock.calls[0][0] as string;
      expect(calledUrl).toContain('limit=20');
    });
  });
});