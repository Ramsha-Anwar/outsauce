import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  OpportunitySourceAdapter,
  SearchCriteria,
} from '@outsauce/shared';
import { HimalayasAdapter } from './adapters/himalayas.adapter';
import { SkillzDunyaAdapter } from './adapters/skillzdunya.adapter';
import {
  ListFilters,
  OpportunitiesRepository,
  OpportunityRow,
} from './opportunities.repository';

export interface SyncResponse {
  sourceKey: string;
  itemsFetched: number;
  itemsInserted: number;
  itemsUpdated: number;
  fetchedAt: string;
  sourceError?: {
    code: string;
    message: string;
    httpStatus?: number;
    retryAfterMs?: number;
  };
}

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);
  private readonly adapters: Map<string, OpportunitySourceAdapter>;

  constructor(
    private readonly himalayasAdapter: HimalayasAdapter,
    private readonly skillzDunyaAdapter: SkillzDunyaAdapter,
    private readonly repository: OpportunitiesRepository,
  ) {
    this.adapters = new Map<string, OpportunitySourceAdapter>([
      [this.himalayasAdapter.sourceKey, this.himalayasAdapter],
      [this.skillzDunyaAdapter.sourceKey, this.skillzDunyaAdapter],
    ]);
  }

  getAvailableSources(): string[] {
    return Array.from(this.adapters.keys());
  }

  async sync(
    sourceKey: string,
    criteria: SearchCriteria,
  ): Promise<SyncResponse> {
    const adapter = this.adapters.get(sourceKey);
    if (!adapter) {
      throw new BadRequestException(
        `Unknown source '${sourceKey}'. Available: ${this.getAvailableSources().join(', ')}`,
      );
    }

    this.logger.log(`sync start: source=${sourceKey} criteria=${JSON.stringify(criteria)}`);
    const result = await adapter.search(criteria);

    if (!result.ok) {
      this.logger.warn(
        `sync failed: source=${sourceKey} code=${result.error.code} msg=${result.error.message}`,
      );
      return {
        sourceKey,
        itemsFetched: 0,
        itemsInserted: 0,
        itemsUpdated: 0,
        fetchedAt: new Date().toISOString(),
        sourceError: {
          code: result.error.code,
          message: result.error.message,
          httpStatus: result.error.httpStatus,
          retryAfterMs: result.error.retryAfterMs,
        },
      };
    }

    const upsert = await this.repository.upsertMany(result.page.items);
    this.logger.log(
      `sync ok: source=${sourceKey} fetched=${result.page.items.length} inserted=${upsert.inserted} updated=${upsert.updated}`,
    );

    return {
      sourceKey,
      itemsFetched: result.page.items.length,
      itemsInserted: upsert.inserted,
      itemsUpdated: upsert.updated,
      fetchedAt: result.page.fetchedAt,
    };
  }

  async list(filters: ListFilters) {
    return this.repository.list(filters);
  }

  async getById(id: string): Promise<OpportunityRow> {
    const item = await this.repository.findById(id);
    if (!item) {
      throw new NotFoundException(`Opportunity '${id}' not found`);
    }
    return item;
  }
}