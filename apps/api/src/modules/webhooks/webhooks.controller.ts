import {
  Controller,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';

@Controller('webhooks')
export class WebhooksController {
  @Post('n8n/results')
  processN8nResults(): never {
    throw new ServiceUnavailableException(
      'Live-source ingestion is disabled until a source and authenticated workflow are reviewed.',
    );
  }
}
