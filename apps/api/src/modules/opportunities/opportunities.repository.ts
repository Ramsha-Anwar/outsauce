import { Injectable, Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  NormalizedOpportunity,
  OpportunityStatus,
} from '@outsauce/shared';
import { SupabaseService } from '../../supabase/supabase.service';

export interface OpportunityRow {
  id: string;
  source_key: string;
  external_id: string;
  source_url: string;
  title: string;
  company_name: string | null;
  location: string | null;
  description_excerpt: string | null;
  work_mode: string;
  employment_type: string;
  seniority: string | null;
  categories: string[];
  remote_regions: string[];
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string;
  status: string;
  published_at: string | null;
  deadline: string | null;
  apply_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  last_checked_at: string;
  raw: unknown;
  created_at: string;
  updated_at: string;
}

export interface ListFilters {
  sourceKey?: string;
  status?: OpportunityStatus;
  remoteRegion?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ListResult {
  items: OpportunityRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  total: number;
}

@Injectable()
export class OpportunitiesRepository {
  private readonly logger = new Logger(OpportunitiesRepository.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Batch upsert. Conflict on (source_key, external_id) updates existing row.
   *
   * Strategy: fetch existing external_ids first (1 query), then split into
   * insert/update groups. This gives accurate inserted/updated counts that
   * Supabase's `upsert` response alone cannot provide (it doesn't distinguish).
   */
  async upsertMany(items: NormalizedOpportunity[]): Promise<UpsertResult> {
    if (items.length === 0) {
      return { inserted: 0, updated: 0, total: 0 };
    }

    const client = this.supabaseService.getAdminClient();
    const now = new Date().toISOString();

    // 1. Find which (source_key, external_id) pairs already exist
    const sourceKeys = [...new Set(items.map((i) => i.sourceKey))];
    const externalIds = items.map((i) => i.externalId);

    const { data: existing, error: selectError } = await client
      .from('opportunities')
      .select('source_key, external_id')
      .in('source_key', sourceKeys)
      .in('external_id', externalIds);

    if (selectError) {
      this.logger.error(`upsertMany select failed: ${selectError.message}`);
      throw new Error(`Failed to query existing opportunities: ${selectError.message}`);
    }

    const existingKeys = new Set(
      (existing ?? []).map((r) => `${r.source_key}::${r.external_id}`),
    );

    // 2. Prepare rows — compute inserted/updated counts
    let insertedCount = 0;
    let updatedCount = 0;

    const rows = items.map((item) => {
      const key = `${item.sourceKey}::${item.externalId}`;
      const isExisting = existingKeys.has(key);
      if (isExisting) updatedCount++;
      else insertedCount++;

      return {
        source_key: item.sourceKey,
        external_id: item.externalId,
        source_url: item.sourceUrl,
        title: item.title,
        company_name: item.companyName,
        location: item.location,
        description_excerpt: item.descriptionExcerpt,
        work_mode: item.workMode,
        employment_type: item.employmentType,
        seniority: item.seniority,
        categories: item.categories,
        remote_regions: item.remoteRegions,
        salary_min: item.salaryMin,
        salary_max: item.salaryMax,
        salary_currency: item.salaryCurrency,
        salary_period: item.salaryPeriod,
        status: item.status,
        published_at: item.publishedAt,
        deadline: item.deadline,
        apply_url: item.applyUrl,
        last_seen_at: now,
        last_checked_at: now,
        raw: item.raw,
        // first_seen_at not set → DB default on insert, preserved on update
      };
    });

    // 3. Upsert
    const { error: upsertError } = await client
      .from('opportunities')
      .upsert(rows, {
        onConflict: 'source_key,external_id',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      this.logger.error(`upsertMany upsert failed: ${upsertError.message}`);
      throw new Error(`Failed to upsert opportunities: ${upsertError.message}`);
    }

    return {
      inserted: insertedCount,
      updated: updatedCount,
      total: items.length,
    };
  }

  async list(filters: ListFilters): Promise<ListResult> {
    const client = this.supabaseService.getAdminClient();
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from('opportunities')
      .select('*', { count: 'exact' })
      .order('last_seen_at', { ascending: false })
      .range(from, to);

    if (filters.sourceKey) query = query.eq('source_key', filters.sourceKey);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.remoteRegion) {
      query = query.contains('remote_regions', [filters.remoteRegion]);
    }
    if (filters.q) {
      // Simple ilike on title + company_name — full-text search is PR-10 territory
      query = query.or(
        `title.ilike.%${filters.q}%,company_name.ilike.%${filters.q}%`,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`list failed: ${error.message}`);
      throw new Error(`Failed to list opportunities: ${error.message}`);
    }

    return {
      items: (data ?? []) as OpportunityRow[],
      totalCount: count ?? 0,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<OpportunityRow | null> {
    const client: SupabaseClient = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`findById failed: ${error.message}`);
      throw new Error(`Failed to fetch opportunity: ${error.message}`);
    }

    return (data as OpportunityRow | null) ?? null;
  }
}