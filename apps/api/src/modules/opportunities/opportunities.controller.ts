import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { syncOpportunitiesSchema } from './dto/opportunities.dto';
import type { SyncOpportunitiesInput } from './dto/opportunities.dto';
import { OpportunitiesService } from './opportunities.service';
import type { OpportunityStatus } from '@outsauce/shared';

@Controller('opportunities')
@UseGuards(SupabaseAuthGuard)
export class OpportunitiesController {
  constructor(private readonly service: OpportunitiesService) {}

  @Post('sync')
  sync(
    @Body(new ZodValidationPipe(syncOpportunitiesSchema))
    input: SyncOpportunitiesInput,
  ) {
    return this.service.sync(input.sourceKey, input.criteria);
  }

  @Get()
  list(
    @Query('source_key') sourceKey?: string,
    @Query('status') status?: string,
    @Query('remote_region') remoteRegion?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    return this.service.list({
      sourceKey,
      status: status as OpportunityStatus | undefined,
      remoteRegion,
      q,
      page: page ? parseInt(page, 10) || 1 : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) || 20 : 20,
    });
  }

  @Get(':id')
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getById(id);
  }
}