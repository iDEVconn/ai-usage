---
"@idevconn/ai-usage": minor
---

Add optional `full_name?: string | null` to `AiUsageByUserRow`, right after `email`. Lets a host that already resolves display names (e.g. from a profiles table) carry them through `AiUsageDataSource` → `AdminAiUsageController` → `useAiUsageSummary` end-to-end, same `null`-capable/omit-if-absent convention as `email`. Backward compatible — existing producers that don't set it keep working unchanged.
