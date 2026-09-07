# @idevconn/ai-usage

## 0.2.1

### Patch Changes

- 882a05b: Fix README guard example: `consumer.apply(guard).forRoutes(...)` is the middleware API and doesn't work with `CanActivate` guards. Document the correct alternatives (global `APP_GUARD` + imperative metadata decorator, or a route-agnostic global guard).
- abbf51e: `formatNumber` now accepts an optional `locale` argument instead of always formatting with `en-US`, so consumers with EN/RU/HE (or other) i18n can render grouped numbers in the user's locale. Default stays `en-US`, so this is backward compatible.

## 0.2.0

### Minor Changes

- 7029d79: Initial release: host-agnostic types, a NestJS admin module, and React hooks/headless components for an AI-usage admin dashboard.
