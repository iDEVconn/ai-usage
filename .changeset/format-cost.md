---
"@idevconn/ai-usage": minor
---

Add `formatCost(value, opts?)` to `@idevconn/ai-usage/react`, formatting a `cost_usd` value as currency. `undefined` renders `'—'`; amounts under a cent show 4 decimal places instead of collapsing to `$0.00`.
