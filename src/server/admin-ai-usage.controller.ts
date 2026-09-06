import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AiUsageRange, AiUsageSummary, AiUsageTimeseries } from '../types';
import { parseAiUsageRange } from '../range';
import { AI_USAGE_DATA_SOURCE, type AiUsageDataSource } from './ai-usage-data-source';

@ApiTags('admin')
@Controller('admin/ai-usage')
export class AdminAiUsageController {
  constructor(
    @Inject(AI_USAGE_DATA_SOURCE) private readonly dataSource: AiUsageDataSource,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Aggregate AI usage stats for the admin dashboard' })
  async summary(
    @Query('range') range?: string,
    @Query('userId') userId?: string,
  ): Promise<AiUsageSummary> {
    const parsed = this.parseOrThrow(range, '7d');
    return this.dataSource.getSummary(parsed, userId || undefined);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Daily AI usage timeseries for the admin dashboard' })
  async timeseries(
    @Query('range') range?: string,
    @Query('userId') userId?: string,
  ): Promise<AiUsageTimeseries> {
    const parsed = this.parseOrThrow(range, '30d');
    return this.dataSource.getTimeseries(parsed, userId || undefined);
  }

  private parseOrThrow(range: string | undefined, fallback: AiUsageRange): AiUsageRange {
    try {
      return parseAiUsageRange(range, fallback);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }
}
