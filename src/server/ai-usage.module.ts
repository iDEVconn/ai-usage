import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { AI_USAGE_DATA_SOURCE, AiUsageDataSource } from './ai-usage-data-source';
import { AdminAiUsageController } from './admin-ai-usage.controller';

export interface AiUsageModuleOptions {
  useClass?: Type<AiUsageDataSource>;
  useExisting?: any;
  useFactory?: (...args: any[]) => AiUsageDataSource | Promise<AiUsageDataSource>;
  inject?: any[];
  imports?: any[];
}

@Module({})
export class AiUsageModule {
  static forRoot(options: AiUsageModuleOptions): DynamicModule {
    let provider: Provider;
    if (options.useFactory) {
      provider = {
        provide: AI_USAGE_DATA_SOURCE,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      };
    } else if (options.useClass) {
      provider = { provide: AI_USAGE_DATA_SOURCE, useClass: options.useClass };
    } else {
      provider = { provide: AI_USAGE_DATA_SOURCE, useExisting: options.useExisting };
    }

    return {
      module: AiUsageModule,
      imports: options.imports ?? [],
      controllers: [AdminAiUsageController],
      providers: [provider],
      exports: [AI_USAGE_DATA_SOURCE],
    };
  }
}
