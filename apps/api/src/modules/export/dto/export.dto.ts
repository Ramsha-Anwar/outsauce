import { z } from 'zod';

export const exportLeadsSchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1).max(500),
  // PDF was advertised but never produced: the service wrote plain text with a
  // .txt filename. Only formats the service can actually generate are accepted.
  format: z.enum(['csv', 'json']),
});

export type ExportLeadsInput = z.infer<typeof exportLeadsSchema>;
