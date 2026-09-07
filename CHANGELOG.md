# @idevconn/ai-usage

## 0.3.0

### Minor Changes

- 594f7db: Add optional `cost_usd` field to `AiUsageRecord`, `AiUsageTimeseriesPoint`, and `total_cost_usd` to `AiUsageBreakdownRow`, `AiUsageByUserRow`, `AiUsageSummary`. Lets producers with pricing data (e.g. `@idevconn/llm-router`'s `withBudget`/`onCost`) report real $ cost; undefined for producers that don't know cost.
- f0bbdf8: Add `formatCost(value, opts?)` to `@idevconn/ai-usage/react`, formatting a `cost_usd` value as currency. `undefined` renders `'—'`; amounts under a cent show 4 decimal places instead of collapsing to `$0.00`.

### Patch Changes

- 9eabfb9: Document the new `cost_usd?`/`total_cost_usd?` fields and `formatCost` in the README.
- 44c69e2: Cover the new optional `cost_usd`/`total_cost_usd` fields in the root entry's shape-invariant test, including the omitted-field case for producers that don't know cost.

## 0.2.1

### Patch Changes

- 882a05b: Fix README guard example: `consumer.apply(guard).forRoutes(...)` is the middleware API and doesn't work with `CanActivate` guards. Document the correct alternatives (global `APP_GUARD` + imperative metadata decorator, or a route-agnostic global guard).
- abbf51e: `formatNumber` now accepts an optional `locale` argument instead of always formatting with `en-US`, so consumers with EN/RU/HE (or other) i18n can render grouped numbers in the user's locale. Default stays `en-US`, so this is backward compatible.

## 0.2.0

### Minor Changes

- 7029d79: Initial release: host-agnostic types, a NestJS admin module, and React hooks/headless components for an AI-usage admin dashboard.
