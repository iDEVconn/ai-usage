---
"@idevconn/ai-usage": patch
---

Fix README guard example: `consumer.apply(guard).forRoutes(...)` is the middleware API and doesn't work with `CanActivate` guards. Document the correct alternatives (global `APP_GUARD` + imperative metadata decorator, or a route-agnostic global guard).
