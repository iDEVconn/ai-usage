---
"@idevconn/ai-usage": patch
---

`formatNumber` now accepts an optional `locale` argument instead of always formatting with `en-US`, so consumers with EN/RU/HE (or other) i18n can render grouped numbers in the user's locale. Default stays `en-US`, so this is backward compatible.
