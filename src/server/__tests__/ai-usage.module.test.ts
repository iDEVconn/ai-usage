import { describe, it, expect, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { AiUsageModule } from '../ai-usage.module';
import { AI_USAGE_DATA_SOURCE, type AiUsageDataSource } from '../ai-usage-data-source';
import { AdminAiUsageController } from '../admin-ai-usage.controller';

class FakeDataSource implements AiUsageDataSource {
  getSummary = vi.fn();
  getTimeseries = vi.fn();
}

describe('AiUsageModule.forRoot', () => {
  it('binds useClass to the AI_USAGE_DATA_SOURCE token', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiUsageModule.forRoot({ useClass: FakeDataSource })],
    }).compile();

    const dataSource = moduleRef.get<AiUsageDataSource>(AI_USAGE_DATA_SOURCE);
    expect(dataSource).toBeInstanceOf(FakeDataSource);
  });

  it('binds useFactory to the AI_USAGE_DATA_SOURCE token', async () => {
    const fake = new FakeDataSource();
    const moduleRef = await Test.createTestingModule({
      imports: [AiUsageModule.forRoot({ useFactory: () => fake })],
    }).compile();

    const dataSource = moduleRef.get<AiUsageDataSource>(AI_USAGE_DATA_SOURCE);
    expect(dataSource).toBe(fake);
  });

  it('wires AdminAiUsageController with its dependency resolved through Nest DI', async () => {
    const fake = new FakeDataSource();
    fake.getSummary.mockResolvedValue({ total_calls: 0 } as any);
    const moduleRef = await Test.createTestingModule({
      imports: [AiUsageModule.forRoot({ useFactory: () => fake })],
    }).compile();

    const controller = moduleRef.get(AdminAiUsageController);
    await controller.summary(undefined, undefined);

    expect(fake.getSummary).toHaveBeenCalledWith('7d', undefined);
  });
});
