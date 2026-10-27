import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { SupabaseModule } from '../../supabase/supabase.module';
import { ScrapesService } from './scrapes.service';
import { ScrapesController } from './scrapes.controller';

@Module({
  imports: [BillingModule, SupabaseModule],
  providers: [ScrapesService],
  controllers: [ScrapesController],
})
export class ScrapesModule {}
