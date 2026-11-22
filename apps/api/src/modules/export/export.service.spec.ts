import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExportService } from './export.service';
import type { SupabaseService } from '../../supabase/supabase.service';

const LEADS = [
  {
    id: 'lead-1',
    title: 'Backend Engineer, Platform',
    company: null,
    source: 'demo',
    location: 'Lahore',
    salary_range: null,
    status: 'new',
    source_url: null,
    notes: 'line one\nline two',
  },
  {
    id: 'lead-2',
    title: '=HYPERLINK("http://example.test")',
    company: 'Acme',
    source: 'demo',
    location: null,
    salary_range: null,
    status: 'new',
    source_url: null,
    notes: null,
  },
];

function buildService(result: { data: unknown; error: unknown }) {
  const query = {
    select: jest.fn(),
    in: jest.fn(),
    eq: jest.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.in.mockReturnValue(query);

  const from = jest.fn().mockReturnValue(query);
  const service = new ExportService({
    getAdminClient: () => ({ from }),
  } as unknown as SupabaseService);

  return { service, from };
}

describe('ExportService', () => {
  it('returns CSV with a csv MIME type and filename', async () => {
    const { service } = buildService({ data: LEADS, error: null });

    const result = await service.exportLeads('user-1', ['lead-1'], 'csv');

    expect(result.contentType).toBe('text/csv');
    expect(result.filename).toMatch(/\.csv$/);
    expect(result.content.split('\n')[0]).toBe(
      'title,company,source,location,salary_range,status,source_url,notes',
    );
    expect(result.content).toContain('"Backend Engineer, Platform"');
    expect(result.content).toContain('"line one\nline two"');
  });

  it('neutralises spreadsheet formula injection in CSV cells', async () => {
    const { service } = buildService({ data: [LEADS[1]], error: null });

    const result = await service.exportLeads('user-1', ['lead-2'], 'csv');

    expect(result.content).toContain(`"'=HYPERLINK(""http://example.test"")"`);
  });

  it('returns JSON with a json MIME type and filename', async () => {
    const { service } = buildService({ data: LEADS, error: null });

    const result = await service.exportLeads('user-1', ['lead-1'], 'json');

    expect(result.contentType).toBe('application/json');
    expect(result.filename).toMatch(/\.json$/);
    expect(JSON.parse(result.content)).toEqual(LEADS);
  });

  it('scopes the query to the requesting user', async () => {
    const { service, from } = buildService({ data: LEADS, error: null });

    await service.exportLeads('user-1', ['lead-1'], 'csv');

    expect(from).toHaveBeenCalledWith('leads');
    const query = from.mock.results[0].value as { eq: jest.Mock };
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('throws NotFound when the user owns none of the requested leads', async () => {
    const { service } = buildService({ data: [], error: null });

    await expect(
      service.exportLeads('user-1', ['lead-1'], 'csv'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses an unsupported format instead of returning a mislabelled file', async () => {
    const { service } = buildService({ data: LEADS, error: null });

    await expect(
      service.exportLeads('user-1', ['lead-1'], 'pdf' as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
