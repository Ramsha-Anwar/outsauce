import { BadRequestException } from '@nestjs/common';
import { ScrapesService } from './scrapes.service';
import type { SupabaseService } from '../../supabase/supabase.service';

describe('ScrapesService', () => {
  it('rejects unconfigured live sources before accessing storage', async () => {
    const getAdminClient = jest.fn();
    const service = new ScrapesService({ getAdminClient } as unknown as SupabaseService);

    await expect(
      service.create('user-1', {
        name: 'Live hunt',
        sources: ['linkedin'],
        criteria: { keywords: ['engineer'] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(getAdminClient).not.toHaveBeenCalled();
  });
});
