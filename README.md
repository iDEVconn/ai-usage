# @idevconn/ai-usage

Host-agnostic building blocks for an AI-usage admin dashboard: types, a
NestJS admin module, and React hooks + headless components. No storage, no
styling, no auth logic — you supply those; this package supplies the shared
contract and the boilerplate around it.

## Install

```bash
npm install @idevconn/ai-usage
```

`./server` additionally needs `@nestjs/common` and `@nestjs/swagger` in your
app. `./react` additionally needs `react` and `@tanstack/react-query`.

## `@idevconn/ai-usage` (root)

Zero-dependency types and range validation, shared by both subpaths:

```ts
import { parseAiUsageRange, type AiUsageSummary } from '@idevconn/ai-usage';
```

## `@idevconn/ai-usage/server`

Implement `AiUsageDataSource` against your own storage/aggregation and
email/user enrichment, then register the module:

```ts
import { Module } from '@nestjs/common';
import { AiUsageModule } from '@idevconn/ai-usage/server';
import { MyAiUsageDataSource } from './my-ai-usage-data-source';

@Module({
  imports: [AiUsageModule.forRoot({ useClass: MyAiUsageDataSource })],
})
export class AppModule {}
```

Apply your own auth guard to the routes this module adds
(`GET /admin/ai-usage/summary`, `GET /admin/ai-usage/timeseries`) the same
way you guard any other controller — e.g.
`consumer.apply(MyAuthGuard).forRoutes(AdminAiUsageController)` in your
`AppModule`'s `configure()`.

## `@idevconn/ai-usage/react`

```tsx
import { useAiUsageSummary, AiUsageStat, formatNumber } from '@idevconn/ai-usage/react';
import { api } from './my-api-client';

function TotalCallsCard() {
  const summary = useAiUsageSummary('7d', undefined, { fetchFn: api });
  return (
    <AiUsageStat loading={summary.isLoading} value={summary.data?.total_calls}>
      {({ value, isEmpty }) => <Card>{isEmpty ? '—' : formatNumber(value)}</Card>}
    </AiUsageStat>
  );
}
```

## License

Apache-2.0
