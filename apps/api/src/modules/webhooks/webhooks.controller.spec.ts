import { ServiceUnavailableException } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';

describe('WebhooksController', () => {
  it('keeps n8n result ingestion disabled until a source and workflow are reviewed', () => {
    const controller = new WebhooksController();

    expect(() => controller.processN8nResults()).toThrow(
      ServiceUnavailableException,
    );
  });
});
