# `@idevconn/ai-usage` — design spec

Date: 2026-09-06
Status: approved, ready for implementation plan

## Problem

`crawler-nx` has an "AI usage" admin dashboard (`admin.ai-usage.tsx` route →
`AdminAiUsageContent` component, backed by `AdminAiUsageController` in the
API gateway, which calls the `intelligence` microservice and enriches rows
with `auth-client` emails). The same shape of feature — track LLM calls
(provider, operation, tokens, success/failure, per-key, per-user) and show a
summary/timeseries/breakdown dashboard — is expected to recur across other
projects (e.g. wherever `llm-router` is consumed). Today the feature is
hardwired to `crawler-nx` specifics: its own `auth-client`, its own
`intelligence-client` microservice, its own i18n keys, its own shadcn
component imports, its own `@CheckAbility` guard decorator.

Goal: extract the reusable parts (types, aggregation contract, Nest wiring,
React data-fetching + stateful-but-unstyled UI logic) into a standalone,
host-agnostic npm package so any Nest + React project can adopt it with a
thin per-project adapter, instead of re-implementing the whole feature.

## Non-goals

- Not building a data store / microservice. The package never decides how or
  where raw usage records are persisted.
- Not shipping styled components, CSS, or a design system. No shadcn/tailwind
  dependency anywhere in the package.
- Not shipping i18n strings. All copy stays host-side.
- Not supporting non-Nest backends in v1 (all current consuming projects are
  Nest). A framework-agnostic core could be split out later without breaking
  this package's public API, but it is out of scope now.
- Not migrating `crawler-nx` itself. That is a separate follow-up task once
  this package is published; this spec only fixes the contract that
  migration will target.

## Package shape

Single npm package, `@idevconn/ai-usage`, multi-entry via subpath exports —
same pattern as `llm-router`'s `/gemini`, `/claude`, etc. Scaffold (tsup,
strict tsconfig, vitest, eslint flat config, changesets) is copied from
`llm-router`'s existing `package.json` / `tsconfig.json` / `tsup.config.ts` /
`eslint.config.js` / `vitest.config.ts`.

### Entry: `@idevconn/ai-usage` (root)

Zero runtime dependencies. Pure types + one validation util, importable from
any environment (Node, browser, edge).

```ts
export type AiUsageRange = '24h' | '7d' | '30d' | '90d';
export const VALID_AI_USAGE_RANGES: readonly AiUsageRange[];
export function parseAiUsageRange(raw: string | undefined, fallback: AiUsageRange): AiUsageRange; // throws plain Error on invalid input

export interface AiUsageRecord {
  timestamp: string; // ISO 8601
  provider: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  success: boolean;
  user_id: string;
  key_source: string; // e.g. 'platform' | 'byok', host-defined string
}

export interface AiUsageBreakdownRow {
  key: string; // provider name / operation name / key_source value
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export interface AiUsageByUserRow {
  user_id: string;
  email: string | null; // host fills this in; package never looks it up
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export interface AiUsageSummary {
  total_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  success_count: number;
  error_count: number;
  by_provider: AiUsageBreakdownRow[];
  by_operation: AiUsageBreakdownRow[];
  by_key_source: AiUsageBreakdownRow[];
  by_user: AiUsageByUserRow[];
}

export interface AiUsageTimeseriesPoint {
  date: string; // ISO date, day granularity
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export interface AiUsageTimeseries {
  points: AiUsageTimeseriesPoint[];
}
```

`AiUsageRecord` is the canonical shape a producer (e.g. `llm-router`, or any
service instrumenting LLM calls) should emit if it wants to interoperate
with this package's consumers later. This package does not consume
`AiUsageRecord` directly anywhere in v1 — it exists purely as a documented
contract type. No aggregation-from-raw-records helper ships in v1 (each
host's `AiUsageDataSource` implementation is free to aggregate however it
already does — SQL `GROUP BY`, in-memory, or a future helper package).

### Entry: `@idevconn/ai-usage/server`

Peer deps: `@nestjs/common`, `@nestjs/swagger` (required — all current
consumers are Nest+Swagger; a framework-agnostic core is future work, not
this package).

```ts
export interface AiUsageDataSource {
  getSummary(range: AiUsageRange, userId?: string): Promise<AiUsageSummary>;
  getTimeseries(range: AiUsageRange, userId?: string): Promise<AiUsageTimeseries>;
}

export const AI_USAGE_DATA_SOURCE = Symbol('AI_USAGE_DATA_SOURCE'); // DI token

export interface AiUsageModuleOptions {
  // standard Nest async-provider shape, one of:
  useClass?: new (...args: any[]) => AiUsageDataSource;
  useExisting?: any;
  useFactory?: (...args: any[]) => AiUsageDataSource | Promise<AiUsageDataSource>;
  inject?: any[];
  imports?: any[]; // forwarded so useFactory/useExisting deps resolve
}

export class AiUsageModule {
  static forRoot(options: AiUsageModuleOptions): DynamicModule;
}

export class AdminAiUsageController {
  // GET summary?range=&userId=   -> AiUsageSummary  (default range '7d')
  // GET timeseries?range=&userId= -> AiUsageTimeseries (default range '30d')
  // invalid range -> BadRequestException
}
```

The controller is generic: it resolves `AI_USAGE_DATA_SOURCE` via DI, calls
`getSummary`/`getTimeseries`, and does nothing else — no guard, no
`@CheckAbility`, no email enrichment. Host responsibilities, all left
outside the package:

- **Auth/authorization**: host applies its own guard via
  `configure(consumer) { consumer.apply(HostAuthGuard).forRoutes(AdminAiUsageController); }`
  in their own `AppModule`, or a global guard, exactly as they already do for
  other admin routes. The package does not export or assume any ability/role
  system.
- **Email enrichment / any join with other services**: happens inside the
  host's `AiUsageDataSource` implementation, before it returns
  `AiUsageSummary` — because the host is the one with `auth-client` (or
  whatever it uses) in scope, not the package.
- **Storage/aggregation**: entirely inside the host's `AiUsageDataSource`
  implementation — talk to a microservice, run SQL, whatever already exists.

### Entry: `@idevconn/ai-usage/react`

Peer deps: `react` (>=18), `@tanstack/react-query` (>=5).

```ts
export interface AiUsageFetchOptions {
  fetchFn: (url: string) => Promise<unknown>; // host's own api()/axios/fetch wrapper, already carrying auth
}

export function useAiUsageSummary(
  range: AiUsageRange,
  userId: string | undefined,
  options: AiUsageFetchOptions,
): UseQueryResult<AiUsageSummary>;

export function useAiUsageTimeseries(
  range: AiUsageRange,
  userId: string | undefined,
  options: AiUsageFetchOptions,
): UseQueryResult<AiUsageTimeseries>;

export function formatNumber(value: number | undefined): string;
export function formatTokens(value: number | undefined): string; // e.g. 12_345 -> "12.3K"

// Headless render-prop components — no DOM output of their own beyond calling children().
export function AiUsageStat(props: {
  loading: boolean;
  value: number | string | undefined;
  children: (state: { value: number | string | undefined; isEmpty: boolean }) => ReactNode;
}): ReactNode;

export function AiUsageBreakdownTable<Row>(props: {
  rows: Row[] | undefined;
  loading: boolean;
  children: (state: { rows: Row[]; isEmpty: boolean }) => ReactNode;
}): ReactNode;

export function AiUsageChartData(props: {
  points: AiUsageTimeseriesPoint[] | undefined;
  loading: boolean;
  children: (state: { points: AiUsageTimeseriesPoint[]; isEmpty: boolean }) => ReactNode;
}): ReactNode;
```

The hooks build the query string (`range` + optional `userId`) and call
`fetchFn` with the resulting path (`/admin/ai-usage/summary?range=...`) —
same URL shape `crawler-nx` already uses, so a migrating host's `fetchFn`
can be its existing `api` helper unchanged. Query keys follow the same
`['admin', 'ai-usage', 'summary'|'timeseries', range, userId ?? null]`
pattern crawler-nx already uses, re-exported as
`AI_USAGE_SUMMARY_QUERY_KEY` / `AI_USAGE_TIMESERIES_QUERY_KEY` functions so
hosts can invalidate/prefetch consistently.

Headless components hold no styling opinion; they only compute
`isEmpty`/normalize `rows ?? []` / `points ?? []` and hand back control to
the host's `children` render function, which owns 100% of the JSX (e.g. a
shadcn `<Card>`).

## Data flow (end to end, for a hypothetical adopting host)

1. Host's own service records `AiUsageRecord`-shaped events into whatever
   storage it already has.
2. Host writes a small class implementing `AiUsageDataSource`
   (`getSummary`/`getTimeseries`), doing its own aggregation query and its
   own user/email enrichment inside that class.
3. Host registers `AiUsageModule.forRoot({ useClass: HostAiUsageDataSource })`
   in its Nest `AppModule`, and applies its own auth guard to
   `AdminAiUsageController` via `MiddlewareConsumer`/global guard.
4. Host's React dashboard imports `useAiUsageSummary`/`useAiUsageTimeseries`
   from `@idevconn/ai-usage/react`, passing its existing `api()` as
   `fetchFn`, and renders its own `<Card>`/table/chart markup, optionally
   wrapping stat/table/chart data in the headless components for consistent
   loading/empty handling.

## Error handling

- `parseAiUsageRange` (root entry) throws a plain `Error` on an invalid range
  string — usable in any runtime.
- The Nest controller in `/server` catches that and re-throws
  `BadRequestException` with the same message format `crawler-nx` uses today
  (`` `Invalid range: ${value}. Valid: 24h | 7d | 30d | 90d` ``), so existing
  API consumers see an identical error contract.
- `AiUsageDataSource` errors are not caught by the package — they propagate
  through Nest's default exception filter, same as any other provider error
  today.
- React hooks surface errors via the standard `@tanstack/react-query`
  `isError`/`error` result fields; headless components do not have an error
  slot of their own — hosts branch on `query.isError` before reaching for the
  headless component, same as `crawler-nx` does today with `isLoading`.

## Testing

- `parseAiUsageRange`: valid values pass through, invalid throws, fallback
  applied when `raw` is `undefined`.
- `formatNumber` / `formatTokens`: `undefined`, `0`, and large-number
  formatting (e.g. `12345 -> "12.3K"`).
- `AdminAiUsageController` (`/server`): wired against a mock
  `AiUsageDataSource`; verifies range/userId pass-through and the
  `BadRequestException` path — mirrors `crawler-nx`'s existing
  `ai-usage.controller.unit.test.ts` coverage but against the generic
  controller.
- Headless components (`/react`, via `@testing-library/react`): each
  component's `children` render-prop receives the expected `state` shape for
  loading, empty, and populated cases.
- Hooks (`/react`): `useAiUsageSummary`/`useAiUsageTimeseries` call `fetchFn`
  with the correct URL for range/userId combinations (with and without
  `userId`).

## Migration path for `crawler-nx` (reference only, not part of this build)

- `IntelligenceClientService` + `authClient` usage in
  `AdminAiUsageController` moves into a new `CrawlerAiUsageDataSource` class
  implementing `AiUsageDataSource`; `@CheckAbility('read', 'AiUsage')` moves
  onto the controller via crawler-nx's own guard wiring (module `configure()`
  or a decorator applied where the module is registered).
- `apps/client/.../admin-ai-usage-content.tsx` swaps its local
  `@/queries/admin-ai-usage` hooks for `@idevconn/ai-usage/react` hooks,
  passing crawler-nx's existing `api` as `fetchFn`; the JSX (Card, grid,
  `RangeSelector`, `BreakdownTable`, `ActivityChart`, `ByUserTable`,
  `UserFilterSelect`) stays crawler-nx's own, optionally wrapped in
  `AiUsageStat`/`AiUsageBreakdownTable`/`AiUsageChartData` for the loading/
  empty branching it already hand-rolls.
- This migration is tracked as a separate follow-up once
  `@idevconn/ai-usage` is published; not part of this package's
  implementation plan.
