import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedOpportunity } from '@outsauce/shared';
import { OpportunitiesRepository } from './opportunities.repository';
import { SupabaseService } from '../../supabase/supabase.service';

const SAMPLE: NormalizedOpportunity = {
  sourceKey: 'himalayas',
  externalId: 'https://himalayas.app/companies/lemon-io/jobs/senior-react',
  sourceUrl: 'https://himalayas.app/companies/lemon-io/jobs/senior-react',
  title: 'Senior React Developer',
  companyName: 'lemon.io',
  location: 'Remote (3 countries)',
  descriptionExcerpt: 'A sample excerpt',
  workMode: 'remote',
  employmentType: 'full_time',
  seniority: 'Senior',
  categories: ['React-Developer'],
  remoteRegions: ['Pakistan', 'India'],
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: 'USD',
  salaryPeriod: 'annual',
  status: 'open',
  publishedAt: new Date(1794317072 * 1000).toISOString(),
  deadline: null,
  applyUrl:
    'https://himalayas.app/companies/lemon-io/jobs/senior-react?utm_source=api',
  raw: { title: 'Senior React Developer' },
};

function makeMockClient(overrides: Partial<SupabaseClient> = {}): SupabaseClient {
  return overrides as SupabaseClient;
}

describe('OpportunitiesRepository', () => {
  let repository: OpportunitiesRepository;
  let mockClient: Record<string, jest.Mock>;
  let mockSupabaseService: SupabaseService;

  beforeEach(() => {
    mockClient = {};
    mockSupabaseService = {
      getAdminClient: () => makeMockClient(mockClient),
    } as unknown as SupabaseService;
    repository = new OpportunitiesRepository(mockSupabaseService);
  });

  describe('upsertMany()', () => {
    it('returns zeros for empty input', async () => {
      const result = await repository.upsertMany([]);
      expect(result).toEqual({ inserted: 0, updated: 0, total: 0 });
    });

    it('inserts new rows and reports inserted count', async () => {
      const selectMock = jest.fn().mockResolvedValue({ data: [], error: null });
      const upsertMock = jest.fn().mockResolvedValue({ error: null });

      mockClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            in: selectMock,
          }),
        }),
        upsert: upsertMock,
      });

      const result = await repository.upsertMany([SAMPLE]);

      expect(result).toEqual({ inserted: 1, updated: 0, total: 1 });
      expect(upsertMock).toHaveBeenCalledTimes(1);
      const upsertedRows = upsertMock.mock.calls[0][0] as Record<
        string,
        unknown
      >[];
      expect(upsertedRows).toHaveLength(1);
      expect(upsertedRows[0].source_key).toBe('himalayas');
      expect(upsertedRows[0].external_id).toBe(SAMPLE.externalId);
      expect(upsertedRows[0].remote_regions).toEqual(['Pakistan', 'India']);
      expect(upsertedRows[0]).not.toHaveProperty('first_seen_at'); // DB default
    });

    it('updates existing rows and reports updated count', async () => {
      const selectMock = jest.fn().mockResolvedValue({
        data: [{ source_key: 'himalayas', external_id: SAMPLE.externalId }],
        error: null,
      });
      const upsertMock = jest.fn().mockResolvedValue({ error: null });

      mockClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            in: selectMock,
          }),
        }),
        upsert: upsertMock,
      });

      const result = await repository.upsertMany([SAMPLE]);
      expect(result).toEqual({ inserted: 0, updated: 1, total: 1 });
    });

    it('throws when select fails', async () => {
      mockClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'connection lost' },
            }),
          }),
        }),
      });

      await expect(repository.upsertMany([SAMPLE])).rejects.toThrow(
        /Failed to query existing opportunities/,
      );
    });

    it('throws when upsert fails', async () => {
      mockClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        upsert: jest.fn().mockResolvedValue({
          error: { message: 'unique violation' },
        }),
      });

      await expect(repository.upsertMany([SAMPLE])).rejects.toThrow(
        /Failed to upsert opportunities/,
      );
    });
  });

  describe('list()', () => {
    // Supabase query builders return a thenable — every chained method returns
    // the same builder, and awaiting the builder triggers execution. This mock
    // replicates that behaviour so `query.eq(...).range(...)` chains work AND
    // `await query` resolves to the response.
    function setupListChain(response: {
      data: unknown;
      error: unknown;
      count: number | null;
    }) {
      type Chain = {
        [key: string]: jest.Mock | ((resolve: (v: unknown) => unknown) => Promise<unknown>);
      };

      const chain: Chain = {};

      const chainableMethods = [
        'select',
        'order',
        'range',
        'eq',
        'contains',
        'or',
      ] as const;
      for (const method of chainableMethods) {
        chain[method] = jest.fn().mockReturnValue(chain);
      }

      // Make the chain thenable so `await query` resolves to the response.
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(response).then(resolve);

      mockClient.from = jest.fn().mockReturnValue(chain);
      return chain;
    }

    it('returns paginated results with defaults', async () => {
      setupListChain({ data: [SAMPLE], error: null, count: 1 });
      const result = await repository.list({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalCount).toBe(1);
    });

    it('clamps pageSize to 100 max', async () => {
      setupListChain({ data: [], error: null, count: 0 });
      const result = await repository.list({ pageSize: 500 });
      expect(result.pageSize).toBe(100);
    });

    it('applies sourceKey filter', async () => {
      const chain = setupListChain({ data: [], error: null, count: 0 });
      await repository.list({ sourceKey: 'himalayas' });
      expect(chain.eq).toHaveBeenCalledWith('source_key', 'himalayas');
    });

    it('applies status filter', async () => {
      const chain = setupListChain({ data: [], error: null, count: 0 });
      await repository.list({ status: 'open' });
      expect(chain.eq).toHaveBeenCalledWith('status', 'open');
    });

    it('applies remoteRegion filter using contains (GIN)', async () => {
      const chain = setupListChain({ data: [], error: null, count: 0 });
      await repository.list({ remoteRegion: 'Pakistan' });
      expect(chain.contains).toHaveBeenCalledWith('remote_regions', [
        'Pakistan',
      ]);
    });

    it('applies search query on title/company', async () => {
      const chain = setupListChain({ data: [], error: null, count: 0 });
      await repository.list({ q: 'react' });
      expect(chain.or).toHaveBeenCalledWith(
        'title.ilike.%react%,company_name.ilike.%react%',
      );
    });

    it('throws when list fails', async () => {
      setupListChain({
        data: null,
        error: { message: 'db down' },
        count: null,
      });
      await expect(repository.list({})).rejects.toThrow(
        /Failed to list opportunities/,
      );
    });
  });

  describe('findById()', () => {
    it('returns the row when found', async () => {
      mockClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: SAMPLE,
              error: null,
            }),
          }),
        }),
      });

      const result = await repository.findById('some-uuid');
      expect(result).toEqual(SAMPLE);
    });

    it('returns null when not found', async () => {
      mockClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await repository.findById('missing-uuid');
      expect(result).toBeNull();
    });

    it('throws when query fails', async () => {
      mockClient.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'timeout' },
            }),
          }),
        }),
      });

      await expect(repository.findById('uuid')).rejects.toThrow(
        /Failed to fetch opportunity/,
      );
    });
  });
});