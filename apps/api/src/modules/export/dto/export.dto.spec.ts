import { exportLeadsSchema } from './export.dto';

const LEAD_ID = '3f1e6f0a-1f2b-4c3d-9e8f-0a1b2c3d4e5f';

describe('exportLeadsSchema', () => {
  it.each(['csv', 'json'])('accepts %s', (format) => {
    expect(
      exportLeadsSchema.safeParse({ lead_ids: [LEAD_ID], format }).success,
    ).toBe(true);
  });

  it('rejects pdf, which the service cannot produce', () => {
    const result = exportLeadsSchema.safeParse({
      lead_ids: [LEAD_ID],
      format: 'pdf',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty lead list', () => {
    expect(
      exportLeadsSchema.safeParse({ lead_ids: [], format: 'csv' }).success,
    ).toBe(false);
  });

  it('rejects non-uuid lead ids', () => {
    expect(
      exportLeadsSchema.safeParse({ lead_ids: ['not-a-uuid'], format: 'csv' })
        .success,
    ).toBe(false);
  });
});
