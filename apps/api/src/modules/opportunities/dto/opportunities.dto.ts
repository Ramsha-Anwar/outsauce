import { z } from 'zod';

export const syncOpportunitiesSchema = z.object({
  sourceKey: z.enum(['himalayas', 'skillzdunya']),
  criteria: z
    .object({
      keywords: z.string().min(1).optional(),
      location: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      page: z.number().int().min(1).optional(),
    })
    .default({}),
});

export type SyncOpportunitiesInput = z.infer<typeof syncOpportunitiesSchema>;