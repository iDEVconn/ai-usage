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

`AiUsageRecord` is the producer-side contract type: the shape an external
event source (an LLM client/router, a request interceptor, anything
instrumenting model calls) should emit per call. Nothing in this package
consumes it — it is here so producers and `AiUsageDataSource`
implementations agree on a field layout that aggregates cleanly into
`AiUsageSummary`/`AiUsageTimeseries`.

`cost_usd` is an optional field on `AiUsageRecord` (and the matching
`total_cost_usd` on breakdown/summary/timeseries types): a producer fills it
in when it knows its pricing (e.g. `@idevconn/llm-router`'s
`withBudget`/`onCost`), and it's left `undefined` — not `0` — when the
producer doesn't know cost.

`AiUsageByUserRow` has an optional `full_name?: string | null` next to
`email`: a host fills it in from its own profiles/auth data if it has one.
Same convention as `email` — omit the field entirely if the host has no
display-name data at all, rather than sending `undefined`.

## `@idevconn/ai-usage/server`

Implement `AiUsageDataSource` against your own storage/aggregation and
email/user enrichment, then register the module. The short form below is
enough when your data source has no injected dependencies of its own — see
[below](#registering-a-data-source-that-has-its-own-dependencies) if it does:

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
(`GET /admin/ai-usage/summary`, `GET /admin/ai-usage/timeseries`).
`AiUsageModule.forRoot()` registers `AdminAiUsageController` itself (its
`controllers` array isn't configurable), so you can't swap in a
`@UseGuards()`-decorated subclass through it — the reliable way to guard
these routes is a global guard.

If you run a global `APP_GUARD` that reads metadata via `Reflector` (e.g.
a CASL/RBAC setup), apply your metadata decorator imperatively to the
imported class — decorators are just functions, nothing stops you calling
one outside a class declaration:

```ts
import { AdminAiUsageController } from '@idevconn/ai-usage/server';
import { CheckAbility } from './check-ability.decorator';

CheckAbility('read', 'AiUsage')(AdminAiUsageController);
```

If your global guard has no per-route metadata to check (it just verifies
a session/token for every request), it needs no wiring here at all — it
already runs for these routes like any other controller.

Do **not** reach for `consumer.apply(MyAuthGuard).forRoutes(...)` in a
module's `configure()` — that's the **middleware** API. It expects a
class with a `.use(req, res, next)` method, not a `CanActivate` guard.
Passing a guard there compiles but fails at runtime (`.use is not a
function`), and `canActivate()` never runs.

### Implementing `AiUsageDataSource`

The data-source interface and the DI token come from `./server`; the
payload types (`AiUsageSummary`, `AiUsageTimeseries`, `AiUsageRange`) come
from the **root** entry:

```ts
import { Injectable } from '@nestjs/common';
import type { AiUsageDataSource } from '@idevconn/ai-usage/server';
import type { AiUsageRange, AiUsageSummary, AiUsageTimeseries } from '@idevconn/ai-usage';
import { Db } from './db.service';

@Injectable()
export class MyAiUsageDataSource implements AiUsageDataSource {
  constructor(private readonly db: Db) {}

  async getSummary(range: AiUsageRange, userId?: string): Promise<AiUsageSummary> {
    const since = this.db.rangeToTimestamp(range);
    const [totals, byProvider, byOperation, byKeySource, byUser] = await Promise.all([
      this.db.aiUsageTotals(since, userId),
      this.db.aiUsageGroupBy('provider', since, userId),
      this.db.aiUsageGroupBy('operation', since, userId),
      this.db.aiUsageGroupBy('key_source', since, userId),
      this.db.aiUsageByUser(since, userId), // resolve emails/full_name here if you want them
    ]);
    return {
      total_calls: totals.calls,
      total_input_tokens: totals.input_tokens,
      total_output_tokens: totals.output_tokens,
      success_count: totals.success_count,
      error_count: totals.error_count,
      by_provider: byProvider,
      by_operation: byOperation,
      by_key_source: byKeySource,
      by_user: byUser,
    };
  }

  async getTimeseries(range: AiUsageRange, userId?: string): Promise<AiUsageTimeseries> {
    const since = this.db.rangeToTimestamp(range);
    return { points: await this.db.aiUsageDaily(since, userId) };
  }
}
```

### Registering a data source that has its own dependencies

`forRoot` also accepts `useFactory`/`inject`/`useExisting`. The factory (or
`useClass` target) is instantiated inside `AiUsageModule`'s own DI context,
so anything it injects must be resolvable *there* — pass the providing
module in `imports`:

```ts
@Module({
  imports: [
    AiUsageModule.forRoot({
      imports: [DbModule], // makes Db resolvable inside AiUsageModule
      inject: [Db],
      useFactory: (db: Db) => new MyAiUsageDataSource(db),
    }),
  ],
})
export class AppModule {}
```

Without `imports: [DbModule]`, Nest cannot resolve `Db` and `forRoot`
fails at bootstrap even though `DbModule` is imported by `AppModule`.

### Route prefixes

`AdminAiUsageController`'s routes are hardcoded under `/admin/ai-usage` and
this package does not read your app's global prefix. If the host calls
`app.setGlobalPrefix('api')` (or mounts Nest under a path), the real URLs
become `/api/admin/ai-usage/*`, and the `fetchFn` you pass to the React
hooks must add that prefix itself — `buildAiUsageQueryPath` always returns
the unprefixed path.

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

`useAiUsageTimeseries(range, userId, { fetchFn })` is the same shape and
resolves to `AiUsageTimeseries`.

### Cache keys and paths

These are exported so a host can invalidate or prefetch these queries using
the exact keys the hooks use, instead of re-deriving them:

- `AI_USAGE_SUMMARY_QUERY_KEY(range, userId?)` — the `queryKey`
  `useAiUsageSummary` registers under.
- `AI_USAGE_TIMESERIES_QUERY_KEY(range, userId?)` — same, for
  `useAiUsageTimeseries`.
- `buildAiUsageQueryPath(base, range, userId?)` — the request path the hooks
  hand to `fetchFn`, useful for prefetching or server-side rendering.

```ts
queryClient.invalidateQueries({ queryKey: AI_USAGE_SUMMARY_QUERY_KEY('7d', undefined) });
```

### Other exports

- `AiUsageBreakdownTable` — headless wrapper that coalesces
  `rows: Row[] | undefined` to `[]` and reports `isEmpty`, for rendering
  `by_provider`/`by_operation`/`by_key_source`/`by_user` tables.
- `AiUsageChartData` — the same for
  `points: AiUsageTimeseriesPoint[] | undefined`, so charts get a stable
  array and an explicit empty state.
- `formatTokens(value)` — abbreviates token counts (`1.2K`, `3.4M`), `'—'`
  for `undefined`.
- `formatCost(value, opts?)` — formats `cost_usd` as currency (`$1.23`),
  `'—'` for `undefined`; sub-cent amounts render with more decimals instead
  of collapsing to `$0.00`. `opts.currency`/`opts.locale` override the
  default `USD`/`en-US`.
- `VALID_AI_USAGE_RANGES` — the `readonly AiUsageRange[]` of accepted range
  values, for building range pickers; exported from the **root** entry
  alongside `parseAiUsageRange`.

## License

Apache-2.0
