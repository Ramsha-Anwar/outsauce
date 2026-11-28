import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../supabase/supabase.module';
import { HimalayasAdapter } from './adapters/himalayas.adapter';
import { SkillzDunyaAdapter } from './adapters/skillzdunya.adapter';
import { OpportunitiesRepository } from './opportunities.repository';
import { OpportunitiesService } from './opportunities.service';
import { OpportunitiesController } from './opportunities.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [OpportunitiesController],
  providers: [
    HimalayasAdapter,
    SkillzDunyaAdapter,
    OpportunitiesRepository,
    OpportunitiesService,
  ],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}