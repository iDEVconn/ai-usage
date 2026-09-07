---
"@idevconn/ai-usage": minor
---

Add optional `cost_usd` field to `AiUsageRecord`, `AiUsageTimeseriesPoint`, and `total_cost_usd` to `AiUsageBreakdownRow`, `AiUsageByUserRow`, `AiUsageSummary`. Lets producers with pricing data (e.g. `@idevconn/llm-router`'s `withBudget`/`onCost`) report real $ cost; undefined for producers that don't know cost.
