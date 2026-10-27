import { z } from 'zod';

export const createScrapeSchema = z
  .object({
    name: z.string().min(1).max(100),
    sources: z.array(z.enum(['linkedin', 'upwork', 'fiverr', 'reddit', 'demo'])).min(1),
    criteria: z.object({
      keywords: z.array(z.string()).default([]),
      location: z.string().optional(),
      remote: z.boolean().optional(),
      salary_min: z.number().optional(),
      salary_max: z.number().optional(),
      experience_level: z.string().optional(),
      job_type: z.string().optional(),
    }),
  })
  .superRefine((value, context) => {
    if (value.sources.includes('demo') && value.sources.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Demo listings cannot be combined with live job sources.',
        path: ['sources'],
      });
    }
  });

export type CreateScrapeInput = z.infer<typeof createScrapeSchema>;
