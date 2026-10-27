import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type { CreateScrapeInput } from './dto/create-scrape.dto';
import { getDemoFixtures } from './demo-fixtures';

const SCRAPE_LIMITS: Record<string, number> = {
  free: 5,
  starter: 50,
  pro: -1,
  enterprise: -1,
};

@Injectable()
export class ScrapesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScrapesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async onApplicationBootstrap() {
    const supabase = this.supabaseService.getAdminClient();
    try {
      const { data, error } = await supabase
        .from('scrape_jobs')
        .update({
          status: 'failed',
          error_message: 'Backend server restarted while hunt was in progress',
          completed_at: new Date().toISOString(),
        })
        .in('status', ['pending', 'running'])
        .select('id');

      if (data && data.length > 0) {
        this.logger.log(
          `Cleaned up ${data.length} orphaned hunt(s) stuck in pending/running state on server boot.`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to run bootstrap cleanup for stuck scrape jobs', err);
    }
  }

  async create(userId: string, input: CreateScrapeInput) {
    if (input.sources.length !== 1 || input.sources[0] !== 'demo') {
      throw new BadRequestException(
        'Live job sources are not connected yet. Choose Demo listings to preview the hunt flow.',
      );
    }

    const supabase = this.supabaseService.getAdminClient();

    const now = new Date().toISOString();
    const [{ data: subscription }, { data: usage }] = await Promise.all([
      supabase.from('subscriptions').select('plan').eq('user_id', userId).single(),
      supabase
        .from('usage')
        .select('*')
        .eq('user_id', userId)
        .lte('period_start', now)
        .gt('period_end', now)
        .single(),
    ]);

    const plan = subscription?.plan ?? 'free';
    const limit = SCRAPE_LIMITS[plan] ?? 5;
    const used = usage?.scrapes_used ?? 0;

    if (limit !== -1 && used >= limit) {
      throw new ForbiddenException('Monthly hunt limit reached.');
    }

    const { data: job, error } = await supabase
      .from('scrape_jobs')
      .insert({
        user_id: userId,
        name: input.name,
        sources: input.sources,
        criteria: input.criteria,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (usage) {
      await supabase
        .from('usage')
        .update({ scrapes_used: (usage.scrapes_used ?? 0) + 1 })
        .eq('id', usage.id);
    }

    const startedAt = new Date().toISOString();
    const { error: startError } = await supabase
      .from('scrape_jobs')
      .update({ status: 'running', started_at: startedAt })
      .eq('id', job.id)
      .eq('user_id', userId);

    if (startError) {
      throw startError;
    }

    try {
      const fixtures = getDemoFixtures(input.criteria);
      if (fixtures.length > 0) {
        const { error: resultsError } = await supabase
          .from('scrape_results')
          .insert(
            fixtures.map((fixture) => ({
              scrape_job_id: job.id,
              user_id: userId,
              ...fixture,
            })),
          );

        if (resultsError) {
          throw resultsError;
        }
      }

      const completedAt = new Date().toISOString();
      const { data: completedJob, error: completionError } = await supabase
        .from('scrape_jobs')
        .update({
          status: 'completed',
          result_count: fixtures.length,
          completed_at: completedAt,
        })
        .eq('id', job.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (completionError) {
        throw completionError;
      }
      if (!completedJob) {
        throw new Error('Demo hunt could not be marked complete');
      }

      return completedJob;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Demo hunt failed';
      await supabase
        .from('scrape_jobs')
        .update({
          status: 'failed',
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('user_id', userId);
      throw error;
    }
  }

  async findAllByUser(userId: string, page: number, limit: number) {
    const supabase = this.supabaseService.getAdminClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('scrape_jobs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
    };
  }

  async findOne(userId: string, jobId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Scrape job not found');
    }

    return data;
  }

  async getResults(
    userId: string,
    jobId: string,
    page: number,
    limit: number,
  ) {
    await this.findOne(userId, jobId);

    const supabase = this.supabaseService.getAdminClient();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('scrape_results')
      .select('*', { count: 'exact' })
      .eq('scrape_job_id', jobId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
    };
  }

  async cancel(userId: string, jobId: string) {
    const job = await this.findOne(userId, jobId);

    if (job.status !== 'pending' && job.status !== 'running') {
      throw new NotFoundException(
        'Only pending or running jobs can be cancelled',
      );
    }

    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('scrape_jobs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async rerun(userId: string, jobId: string) {
    const job = await this.findOne(userId, jobId);

    if (job.status === 'pending' || job.status === 'running') {
      throw new ForbiddenException(
        'Cannot re-run a hunt that is still in progress.',
      );
    }

    const random = 100000 + Math.floor(Math.random() * 900000);

    return this.create(userId, {
      name: `hunt_${random}`,
      sources: job.sources as CreateScrapeInput['sources'],
      criteria: job.criteria as CreateScrapeInput['criteria'],
    });
  }
}
