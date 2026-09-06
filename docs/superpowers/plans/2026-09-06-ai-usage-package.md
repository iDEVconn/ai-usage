# @idevconn/ai-usage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@idevconn/ai-usage`, a host-agnostic npm package (types + NestJS module + React hooks/headless components) that lets any Nest+React project add an AI-usage admin dashboard without re-implementing the feature crawler-nx already has.

**Architecture:** Single package, three subpath entries built by tsup — root (`.`, zero-dep types + range validation), `./server` (generic NestJS module + controller + `AiUsageDataSource` DI contract), `./react` (data-fetching hooks + headless render-prop components + format helpers). No storage, no styling, no auth logic ships in the package — hosts supply those.

**Tech Stack:** TypeScript (strict), tsup (multi-entry ESM+CJS build), vitest + `@testing-library/react` (jsdom), ESLint flat config, Changesets. NestJS (`@nestjs/common`, `@nestjs/swagger`) and React (`react`, `@tanstack/react-query`) as peer dependencies, each only required by the subpath that uses them.

**Spec:** `docs/superpowers/specs/2026-09-06-ai-usage-package-design.md`

## Global Constraints

- Root entry (`.`) has **zero runtime dependencies** — importable from any JS environment.
- No package code depends on shadcn, Tailwind, or any i18n library. No CSS ships.
- `./server` never contains guard/ability/auth logic — hosts wire their own guard onto `AdminAiUsageController` via `MiddlewareConsumer`/global guard.
- `./server` never enriches `AiUsageSummary.by_user` rows (e.g. with email) — that happens inside the host's own `AiUsageDataSource` implementation.
- `./react` hooks take a `fetchFn: (url: string) => Promise<unknown>` — the package never owns an HTTP client.
- Headless components (`./react`) render nothing themselves beyond invoking their `children` render-prop — no JSX/markup of their own.
- Invalid range error message format (server subpath), verbatim: `` `Invalid range: ${value}. Valid: 24h | 7d | 30d | 90d` ``.
- Query key prefix: `['ai-usage', 'summary' | 'timeseries', range, userId ?? null]`.
- URL path shape (matches crawler-nx today): `/admin/ai-usage/summary?range=<range>&userId=<id>` (userId query param omitted when absent).
- Default range: `'7d'` for summary, `'30d'` for timeseries.
- Scaffold tooling (tsup/tsconfig/eslint/vitest/changesets shape) mirrors `/home/vladimir-tkach/Projects/llm-router`'s existing config files.

---

## File Structure

```
ai-usage/
  package.json
  tsconfig.json
  tsup.config.ts
  eslint.config.js
  vitest.config.ts
  vitest.setup.ts
  .gitignore
  LICENSE
  README.md
  .changeset/
    config.json
    README.md
  src/
    types.ts                          # all domain types
    range.ts                          # VALID_AI_USAGE_RANGES, parseAiUsageRange
    index.ts                          # root barrel
    __tests__/
      range.test.ts
      index.test.ts
    react/
      format.ts                      # formatNumber, formatTokens
      query-keys.ts                   # query key + URL builders
      use-ai-usage-summary.ts
      use-ai-usage-timeseries.ts
      ai-usage-stat.tsx
      ai-usage-breakdown-table.tsx
      ai-usage-chart-data.tsx
      index.ts                        # react barrel
      __tests__/
        format.test.ts
        query-keys.test.ts
        use-ai-usage-summary.test.tsx
        use-ai-usage-timeseries.test.tsx
        ai-usage-stat.test.tsx
        ai-usage-breakdown-table.test.tsx
        ai-usage-chart-data.test.tsx
        index.test.ts
    server/
      ai-usage-data-source.ts         # interface + DI token
      ai-usage.module.ts              # AiUsageModule.forRoot
      admin-ai-usage.controller.ts    # AdminAiUsageController
      index.ts                        # server barrel
      __tests__/
        ai-usage-data-source.test.ts
        ai-usage.module.test.ts
        admin-ai-usage.controller.test.ts
        index.test.ts
```

---

### Task 1: Scaffold tooling + `types.ts` + `range.ts`

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsup.config.ts`, `eslint.config.js`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore`, `.changeset/config.json`, `.changeset/README.md`, `LICENSE`, `src/types.ts`, `src/range.ts`
- Test: `src/__tests__/range.test.ts`

**Interfaces:**
- Produces: `AiUsageRange` (`src/types.ts`), all other domain types listed below (`src/types.ts`), `VALID_AI_USAGE_RANGES: readonly AiUsageRange[]` and `parseAiUsageRange(raw: string | undefined, fallback: AiUsageRange): AiUsageRange` (`src/range.ts`) — every later task imports types from `../types` and the range util from `../range`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@idevconn/ai-usage",
  "version": "0.1.0",
  "description": "Host-agnostic AI usage tracking: types, a NestJS admin module, and React hooks/headless components for an AI-usage admin dashboard.",
  "license": "Apache-2.0",
  "author": "iDEVconn",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/iDEVconn/ai-usage.git"
  },
  "bugs": {
    "url": "https://github.com/iDEVconn/ai-usage/issues"
  },
  "homepage": "https://github.com/iDEVconn/ai-usage#readme",
  "keywords": ["ai", "llm", "usage", "dashboard", "nestjs", "react", "admin"],
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./server": {
      "types": "./dist/server.d.ts",
      "import": "./dist/server.js",
      "require": "./dist/server.cjs"
    },
    "./react": {
      "types": "./dist/react.d.ts",
      "import": "./dist/react.js",
      "require": "./dist/react.cjs"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run typecheck && npm run test && npm run build"
  },
  "peerDependencies": {
    "@nestjs/common": ">=10.0.0",
    "@nestjs/swagger": ">=7.0.0",
    "react": ">=18.0.0",
    "@tanstack/react-query": ">=5.0.0"
  },
  "peerDependenciesMeta": {
    "@nestjs/common": { "optional": true },
    "@nestjs/swagger": { "optional": true },
    "react": { "optional": true },
    "@tanstack/react-query": { "optional": true }
  },
  "devDependencies": {
    "@changesets/cli": "^3.0.1",
    "@nestjs/common": "^10.4.4",
    "@nestjs/core": "^10.4.4",
    "@nestjs/swagger": "^7.4.2",
    "@nestjs/testing": "^10.4.4",
    "@tanstack/react-query": "^5.59.0",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/react": "^16.0.1",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "jsdom": "^25.0.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "tsup": "^8.3.0",
    "typescript": "^5.5.0",
    "vitest": "^4.1.7"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["vitest/globals", "node"]
  },
  "include": ["src"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Create `tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server/index.ts",
    react: "src/react/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["@nestjs/common", "@nestjs/swagger", "react", "@tanstack/react-query"],
});
```

- [ ] **Step 4: Create `eslint.config.js`**

```js
// @ts-check
import eslintPluginTs from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": eslintPluginTs,
    },
    rules: {
      ...eslintPluginTs.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

- [ ] **Step 6: Create `vitest.setup.ts`**

```ts
import "reflect-metadata";
import "@testing-library/jest-dom/vitest";
```

Add `@testing-library/jest-dom` to `devDependencies` in `package.json` from Step 1 (`"@testing-library/jest-dom": "^6.5.0"`) — go back and add that line now.

- [ ] **Step 7: Create `.gitignore`**

```
node_modules
dist
coverage
.turbo
.nx
.DS_Store
*.tsbuildinfo

# editor
.vscode
.idea

# env
.env
.env.local
```

- [ ] **Step 8: Create `.changeset/config.json`**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 9: Create `.changeset/README.md`**

```markdown
# Changesets

Hello and welcome! This folder has been automatically generated by `@changesets/cli`, a build tool that works with multi-package repos, or single-package repos to help you version and publish your code. You can find the full documentation for it [in our repository](https://github.com/changesets/changesets)
```

- [ ] **Step 10: Copy `LICENSE`**

Run: `cp /home/vladimir-tkach/Projects/llm-router/LICENSE /home/vladimir-tkach/Projects/ai-usage/LICENSE`

Expected: identical Apache-2.0 license text (201 lines), copyright holder unchanged (`iDEVconn`).

- [ ] **Step 11: Create `src/types.ts`**

```ts
export type AiUsageRange = '24h' | '7d' | '30d' | '90d';

export interface AiUsageRecord {
  timestamp: string;
  provider: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  success: boolean;
  user_id: string;
  key_source: string;
}

export interface AiUsageBreakdownRow {
  key: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export interface AiUsageByUserRow {
  user_id: string;
  email: string | null;
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
  date: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export interface AiUsageTimeseries {
  points: AiUsageTimeseriesPoint[];
}
```

- [ ] **Step 12: Write the failing test for `parseAiUsageRange`**

Create `src/__tests__/range.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { VALID_AI_USAGE_RANGES, parseAiUsageRange } from '../range';

describe('VALID_AI_USAGE_RANGES', () => {
  it('lists the four supported ranges', () => {
    expect(VALID_AI_USAGE_RANGES).toEqual(['24h', '7d', '30d', '90d']);
  });
});

describe('parseAiUsageRange', () => {
  it('returns the fallback when raw is undefined', () => {
    expect(parseAiUsageRange(undefined, '7d')).toBe('7d');
  });

  it('returns a valid raw value as-is', () => {
    expect(parseAiUsageRange('30d', '7d')).toBe('30d');
  });

  it('throws on an invalid range', () => {
    expect(() => parseAiUsageRange('bogus', '7d')).toThrow(
      'Invalid range: bogus. Valid: 24h | 7d | 30d | 90d',
    );
  });
});
```

- [ ] **Step 13: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/range.test.ts`
Expected: FAIL — `Cannot find module '../range'` (file does not exist yet).

- [ ] **Step 14: Create `src/range.ts`**

```ts
import type { AiUsageRange } from './types';

export const VALID_AI_USAGE_RANGES: readonly AiUsageRange[] = ['24h', '7d', '30d', '90d'];

export function parseAiUsageRange(
  raw: string | undefined,
  fallback: AiUsageRange,
): AiUsageRange {
  const value = raw ?? fallback;
  if ((VALID_AI_USAGE_RANGES as readonly string[]).includes(value)) {
    return value as AiUsageRange;
  }
  throw new Error(`Invalid range: ${value}. Valid: 24h | 7d | 30d | 90d`);
}
```

- [ ] **Step 15: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/range.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 16: Install dependencies and commit**

```bash
cd /home/vladimir-tkach/Projects/ai-usage
npm install
git add package.json package-lock.json tsconfig.json tsup.config.ts eslint.config.js vitest.config.ts vitest.setup.ts .gitignore .changeset LICENSE src/types.ts src/range.ts src/__tests__/range.test.ts
git commit -m "feat: scaffold package tooling, add domain types and range validation"
```

---

### Task 2: Root barrel (`src/index.ts`)

**Files:**
- Create: `src/index.ts`
- Test: `src/__tests__/index.test.ts`

**Interfaces:**
- Consumes: everything from `src/types.ts` and `src/range.ts` (Task 1).
- Produces: root entry re-exporting all of it — later tasks in `react/` and `server/` import types from `../types` directly (not through this barrel, to avoid pulling unrelated code into their bundles), but the package's public root import (`@idevconn/ai-usage`) is this file.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { VALID_AI_USAGE_RANGES, parseAiUsageRange } from '../index';
import type { AiUsageRecord, AiUsageSummary, AiUsageTimeseries } from '../index';

describe('root entry', () => {
  it('re-exports range utilities', () => {
    expect(VALID_AI_USAGE_RANGES).toContain('7d');
    expect(parseAiUsageRange('90d', '7d')).toBe('90d');
  });

  it('re-exports domain types (compile-time check)', () => {
    const record: AiUsageRecord = {
      timestamp: new Date().toISOString(),
      provider: 'openai',
      operation: 'chat',
      input_tokens: 10,
      output_tokens: 20,
      success: true,
      user_id: 'user-1',
      key_source: 'platform',
    };
    const summary: AiUsageSummary = {
      total_calls: 1,
      total_input_tokens: 10,
      total_output_tokens: 20,
      success_count: 1,
      error_count: 0,
      by_provider: [],
      by_operation: [],
      by_key_source: [],
      by_user: [],
    };
    const timeseries: AiUsageTimeseries = { points: [] };

    expect(record.provider).toBe('openai');
    expect(summary.total_calls).toBe(1);
    expect(timeseries.points).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/index.test.ts`
Expected: FAIL — `Cannot find module '../index'`.

- [ ] **Step 3: Create `src/index.ts`**

```ts
export type {
  AiUsageRange,
  AiUsageRecord,
  AiUsageBreakdownRow,
  AiUsageByUserRow,
  AiUsageSummary,
  AiUsageTimeseriesPoint,
  AiUsageTimeseries,
} from './types';

export { VALID_AI_USAGE_RANGES, parseAiUsageRange } from './range';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/index.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/index.ts src/__tests__/index.test.ts
git commit -m "feat: add root barrel export"
```

---

### Task 3: React format helpers (`formatNumber`, `formatTokens`)

**Files:**
- Create: `src/react/format.ts`
- Test: `src/react/__tests__/format.test.ts`

**Interfaces:**
- Produces: `formatNumber(value: number | undefined): string`, `formatTokens(value: number | undefined): string` — used by Task 6-8 tests are not required to use these, but hosts (and the package's own README examples) rely on these exact names/signatures.

- [ ] **Step 1: Write the failing test**

Create `src/react/__tests__/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatNumber, formatTokens } from '../format';

describe('formatNumber', () => {
  it('returns an em dash for undefined', () => {
    expect(formatNumber(undefined)).toBe('—');
  });

  it('formats zero as 0', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('adds thousands separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
});

describe('formatTokens', () => {
  it('returns an em dash for undefined', () => {
    expect(formatTokens(undefined)).toBe('—');
  });

  it('returns small values unchanged', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(999)).toBe('999');
  });

  it('abbreviates thousands with one decimal', () => {
    expect(formatTokens(12345)).toBe('12.3K');
  });

  it('abbreviates millions with one decimal', () => {
    expect(formatTokens(2_500_000)).toBe('2.5M');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/react/__tests__/format.test.ts`
Expected: FAIL — `Cannot find module '../format'`.

- [ ] **Step 3: Create `src/react/format.ts`**

```ts
export function formatNumber(value: number | undefined): string {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatTokens(value: number | undefined): string {
  if (value === undefined) return '—';
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/react/__tests__/format.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/react/format.ts src/react/__tests__/format.test.ts
git commit -m "feat: add formatNumber/formatTokens helpers"
```

---

### Task 4: React query-key and URL builders

**Files:**
- Create: `src/react/query-keys.ts`
- Test: `src/react/__tests__/query-keys.test.ts`

**Interfaces:**
- Consumes: `AiUsageRange` from `../types` (Task 1).
- Produces: `AI_USAGE_SUMMARY_QUERY_KEY(range, userId?)`, `AI_USAGE_TIMESERIES_QUERY_KEY(range, userId?)`, `buildAiUsageQueryPath(base: 'summary' | 'timeseries', range, userId?): string` — consumed by Task 5's hooks.

- [ ] **Step 1: Write the failing test**

Create `src/react/__tests__/query-keys.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  AI_USAGE_SUMMARY_QUERY_KEY,
  AI_USAGE_TIMESERIES_QUERY_KEY,
  buildAiUsageQueryPath,
} from '../query-keys';

describe('query keys', () => {
  it('normalizes a missing userId to null', () => {
    expect(AI_USAGE_SUMMARY_QUERY_KEY('7d')).toEqual(['ai-usage', 'summary', '7d', null]);
    expect(AI_USAGE_TIMESERIES_QUERY_KEY('30d')).toEqual(['ai-usage', 'timeseries', '30d', null]);
  });

  it('includes a provided userId', () => {
    expect(AI_USAGE_SUMMARY_QUERY_KEY('7d', 'user-1')).toEqual([
      'ai-usage',
      'summary',
      '7d',
      'user-1',
    ]);
  });
});

describe('buildAiUsageQueryPath', () => {
  it('builds a path without userId', () => {
    expect(buildAiUsageQueryPath('summary', '7d')).toBe('/admin/ai-usage/summary?range=7d');
  });

  it('builds a path with an encoded userId', () => {
    expect(buildAiUsageQueryPath('timeseries', '30d', 'user@example.com')).toBe(
      '/admin/ai-usage/timeseries?range=30d&userId=user%40example.com',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/react/__tests__/query-keys.test.ts`
Expected: FAIL — `Cannot find module '../query-keys'`.

- [ ] **Step 3: Create `src/react/query-keys.ts`**

```ts
import type { AiUsageRange } from '../types';

export const AI_USAGE_SUMMARY_QUERY_KEY = (range: AiUsageRange, userId?: string | null) =>
  ['ai-usage', 'summary', range, userId ?? null] as const;

export const AI_USAGE_TIMESERIES_QUERY_KEY = (range: AiUsageRange, userId?: string | null) =>
  ['ai-usage', 'timeseries', range, userId ?? null] as const;

export function buildAiUsageQueryPath(
  base: 'summary' | 'timeseries',
  range: AiUsageRange,
  userId?: string,
): string {
  const qs = userId ? `&userId=${encodeURIComponent(userId)}` : '';
  return `/admin/ai-usage/${base}?range=${range}${qs}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/react/__tests__/query-keys.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/react/query-keys.ts src/react/__tests__/query-keys.test.ts
git commit -m "feat: add ai-usage query-key and URL builders"
```

---

### Task 5: React hooks (`useAiUsageSummary`, `useAiUsageTimeseries`)

**Files:**
- Create: `src/react/use-ai-usage-summary.ts`, `src/react/use-ai-usage-timeseries.ts`
- Test: `src/react/__tests__/use-ai-usage-summary.test.tsx`, `src/react/__tests__/use-ai-usage-timeseries.test.tsx`

**Interfaces:**
- Consumes: `AiUsageRange`, `AiUsageSummary`, `AiUsageTimeseries` from `../types`; `AI_USAGE_SUMMARY_QUERY_KEY`, `AI_USAGE_TIMESERIES_QUERY_KEY`, `buildAiUsageQueryPath` from `./query-keys` (Task 4).
- Produces: `AiUsageFetchOptions { fetchFn: (url: string) => Promise<unknown> }`, `useAiUsageSummary(range, userId, options): UseQueryResult<AiUsageSummary>`, `useAiUsageTimeseries(range, userId, options): UseQueryResult<AiUsageTimeseries>` — consumed by the react barrel (Task 9) and by any host dashboard.

- [ ] **Step 1: Write the failing test for `useAiUsageSummary`**

Create `src/react/__tests__/use-ai-usage-summary.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAiUsageSummary } from '../use-ai-usage-summary';
import type { AiUsageSummary } from '../../types';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useAiUsageSummary', () => {
  it('calls fetchFn with the summary URL and returns its data', async () => {
    const summary: AiUsageSummary = {
      total_calls: 5,
      total_input_tokens: 50,
      total_output_tokens: 60,
      success_count: 5,
      error_count: 0,
      by_provider: [],
      by_operation: [],
      by_key_source: [],
      by_user: [],
    };
    const fetchFn = vi.fn().mockResolvedValue(summary);

    const { result } = renderHook(() => useAiUsageSummary('7d', undefined, { fetchFn }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchFn).toHaveBeenCalledWith('/admin/ai-usage/summary?range=7d');
    expect(result.current.data).toEqual(summary);
  });

  it('includes userId in the fetched URL when provided', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      total_calls: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      success_count: 0,
      error_count: 0,
      by_provider: [],
      by_operation: [],
      by_key_source: [],
      by_user: [],
    });

    const { result } = renderHook(() => useAiUsageSummary('24h', 'user-1', { fetchFn }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchFn).toHaveBeenCalledWith('/admin/ai-usage/summary?range=24h&userId=user-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/react/__tests__/use-ai-usage-summary.test.tsx`
Expected: FAIL — `Cannot find module '../use-ai-usage-summary'`.

- [ ] **Step 3: Create `src/react/use-ai-usage-summary.ts`**

```ts
import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query';
import type { AiUsageRange, AiUsageSummary } from '../types';
import { AI_USAGE_SUMMARY_QUERY_KEY, buildAiUsageQueryPath } from './query-keys';

export interface AiUsageFetchOptions {
  fetchFn: (url: string) => Promise<unknown>;
}

export function useAiUsageSummary(
  range: AiUsageRange,
  userId: string | undefined,
  options: AiUsageFetchOptions,
): UseQueryResult<AiUsageSummary> {
  return useQuery<AiUsageSummary>({
    queryKey: AI_USAGE_SUMMARY_QUERY_KEY(range, userId),
    queryFn: () =>
      options.fetchFn(buildAiUsageQueryPath('summary', range, userId)) as Promise<AiUsageSummary>,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/react/__tests__/use-ai-usage-summary.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for `useAiUsageTimeseries`**

Create `src/react/__tests__/use-ai-usage-timeseries.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAiUsageTimeseries } from '../use-ai-usage-timeseries';
import type { AiUsageTimeseries } from '../../types';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useAiUsageTimeseries', () => {
  it('calls fetchFn with the timeseries URL and returns its data', async () => {
    const timeseries: AiUsageTimeseries = { points: [{ date: '2026-09-01', calls: 3, input_tokens: 30, output_tokens: 40 }] };
    const fetchFn = vi.fn().mockResolvedValue(timeseries);

    const { result } = renderHook(() => useAiUsageTimeseries('30d', undefined, { fetchFn }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchFn).toHaveBeenCalledWith('/admin/ai-usage/timeseries?range=30d');
    expect(result.current.data).toEqual(timeseries);
  });

  it('includes userId in the fetched URL when provided', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ points: [] });

    const { result } = renderHook(() => useAiUsageTimeseries('90d', 'user-2', { fetchFn }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchFn).toHaveBeenCalledWith('/admin/ai-usage/timeseries?range=90d&userId=user-2');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/react/__tests__/use-ai-usage-timeseries.test.tsx`
Expected: FAIL — `Cannot find module '../use-ai-usage-timeseries'`.

- [ ] **Step 7: Create `src/react/use-ai-usage-timeseries.ts`**

```ts
import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query';
import type { AiUsageRange, AiUsageTimeseries } from '../types';
import { AI_USAGE_TIMESERIES_QUERY_KEY, buildAiUsageQueryPath } from './query-keys';
import type { AiUsageFetchOptions } from './use-ai-usage-summary';

export function useAiUsageTimeseries(
  range: AiUsageRange,
  userId: string | undefined,
  options: AiUsageFetchOptions,
): UseQueryResult<AiUsageTimeseries> {
  return useQuery<AiUsageTimeseries>({
    queryKey: AI_USAGE_TIMESERIES_QUERY_KEY(range, userId),
    queryFn: () =>
      options.fetchFn(
        buildAiUsageQueryPath('timeseries', range, userId),
      ) as Promise<AiUsageTimeseries>,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/react/__tests__/use-ai-usage-timeseries.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/react/use-ai-usage-summary.ts src/react/use-ai-usage-timeseries.ts src/react/__tests__/use-ai-usage-summary.test.tsx src/react/__tests__/use-ai-usage-timeseries.test.tsx
git commit -m "feat: add useAiUsageSummary/useAiUsageTimeseries hooks"
```

---

### Task 6: Headless component `AiUsageStat`

**Files:**
- Create: `src/react/ai-usage-stat.tsx`
- Test: `src/react/__tests__/ai-usage-stat.test.tsx`

**Interfaces:**
- Produces: `AiUsageStatState { value: number | string | undefined; isEmpty: boolean }`, `AiUsageStat(props: { loading: boolean; value: number | string | undefined; children: (state: AiUsageStatState) => ReactNode }): ReactNode`.

- [ ] **Step 1: Write the failing test**

Create `src/react/__tests__/ai-usage-stat.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiUsageStat } from '../ai-usage-stat';

describe('AiUsageStat', () => {
  it('passes the value through and marks non-empty when data is present', () => {
    render(
      <AiUsageStat loading={false} value={42}>
        {({ value, isEmpty }) => (
          <span data-testid="probe">{`${value}:${isEmpty}`}</span>
        )}
      </AiUsageStat>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('42:false');
  });

  it('hides the value and is not empty while loading', () => {
    render(
      <AiUsageStat loading={true} value={42}>
        {({ value, isEmpty }) => (
          <span data-testid="probe">{`${value}:${isEmpty}`}</span>
        )}
      </AiUsageStat>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('undefined:false');
  });

  it('marks empty when not loading and value is undefined', () => {
    render(
      <AiUsageStat loading={false} value={undefined}>
        {({ value, isEmpty }) => (
          <span data-testid="probe">{`${value}:${isEmpty}`}</span>
        )}
      </AiUsageStat>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('undefined:true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/react/__tests__/ai-usage-stat.test.tsx`
Expected: FAIL — `Cannot find module '../ai-usage-stat'`.

- [ ] **Step 3: Create `src/react/ai-usage-stat.tsx`**

```tsx
import type { ReactNode } from 'react';

export interface AiUsageStatState {
  value: number | string | undefined;
  isEmpty: boolean;
}

export interface AiUsageStatProps {
  loading: boolean;
  value: number | string | undefined;
  children: (state: AiUsageStatState) => ReactNode;
}

export function AiUsageStat({ loading, value, children }: AiUsageStatProps): ReactNode {
  const isEmpty = !loading && (value === undefined || value === null);
  return children({ value: loading ? undefined : value, isEmpty });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/react/__tests__/ai-usage-stat.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/react/ai-usage-stat.tsx src/react/__tests__/ai-usage-stat.test.tsx
git commit -m "feat: add AiUsageStat headless component"
```

---

### Task 7: Headless component `AiUsageBreakdownTable`

**Files:**
- Create: `src/react/ai-usage-breakdown-table.tsx`
- Test: `src/react/__tests__/ai-usage-breakdown-table.test.tsx`

**Interfaces:**
- Produces: `AiUsageBreakdownTableState<Row> { rows: Row[]; isEmpty: boolean }`, `AiUsageBreakdownTable<Row>(props: { rows: Row[] | undefined; loading: boolean; children: (state: AiUsageBreakdownTableState<Row>) => ReactNode }): ReactNode`.

- [ ] **Step 1: Write the failing test**

Create `src/react/__tests__/ai-usage-breakdown-table.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiUsageBreakdownTable } from '../ai-usage-breakdown-table';

interface Row {
  key: string;
  calls: number;
}

describe('AiUsageBreakdownTable', () => {
  it('normalizes missing rows to an empty array and marks empty', () => {
    render(
      <AiUsageBreakdownTable<Row> rows={undefined} loading={false}>
        {({ rows, isEmpty }) => (
          <span data-testid="probe">{`${rows.length}:${isEmpty}`}</span>
        )}
      </AiUsageBreakdownTable>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('0:true');
  });

  it('is not empty while loading even with no rows yet', () => {
    render(
      <AiUsageBreakdownTable<Row> rows={undefined} loading={true}>
        {({ rows, isEmpty }) => (
          <span data-testid="probe">{`${rows.length}:${isEmpty}`}</span>
        )}
      </AiUsageBreakdownTable>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('0:false');
  });

  it('passes rows through unchanged when present', () => {
    const rows: Row[] = [{ key: 'openai', calls: 3 }];
    render(
      <AiUsageBreakdownTable<Row> rows={rows} loading={false}>
        {({ rows: passed, isEmpty }) => (
          <span data-testid="probe">{`${passed.length}:${isEmpty}:${passed[0]?.key}`}</span>
        )}
      </AiUsageBreakdownTable>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('1:false:openai');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/react/__tests__/ai-usage-breakdown-table.test.tsx`
Expected: FAIL — `Cannot find module '../ai-usage-breakdown-table'`.

- [ ] **Step 3: Create `src/react/ai-usage-breakdown-table.tsx`**

```tsx
import type { ReactNode } from 'react';

export interface AiUsageBreakdownTableState<Row> {
  rows: Row[];
  isEmpty: boolean;
}

export interface AiUsageBreakdownTableProps<Row> {
  rows: Row[] | undefined;
  loading: boolean;
  children: (state: AiUsageBreakdownTableState<Row>) => ReactNode;
}

export function AiUsageBreakdownTable<Row>({
  rows,
  loading,
  children,
}: AiUsageBreakdownTableProps<Row>): ReactNode {
  const resolved = rows ?? [];
  const isEmpty = !loading && resolved.length === 0;
  return children({ rows: resolved, isEmpty });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/react/__tests__/ai-usage-breakdown-table.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/react/ai-usage-breakdown-table.tsx src/react/__tests__/ai-usage-breakdown-table.test.tsx
git commit -m "feat: add AiUsageBreakdownTable headless component"
```

---

### Task 8: Headless component `AiUsageChartData`

**Files:**
- Create: `src/react/ai-usage-chart-data.tsx`
- Test: `src/react/__tests__/ai-usage-chart-data.test.tsx`

**Interfaces:**
- Consumes: `AiUsageTimeseriesPoint` from `../types` (Task 1).
- Produces: `AiUsageChartDataState { points: AiUsageTimeseriesPoint[]; isEmpty: boolean }`, `AiUsageChartData(props: { points: AiUsageTimeseriesPoint[] | undefined; loading: boolean; children: (state: AiUsageChartDataState) => ReactNode }): ReactNode`.

- [ ] **Step 1: Write the failing test**

Create `src/react/__tests__/ai-usage-chart-data.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiUsageChartData } from '../ai-usage-chart-data';

describe('AiUsageChartData', () => {
  it('normalizes missing points to an empty array and marks empty', () => {
    render(
      <AiUsageChartData points={undefined} loading={false}>
        {({ points, isEmpty }) => (
          <span data-testid="probe">{`${points.length}:${isEmpty}`}</span>
        )}
      </AiUsageChartData>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('0:true');
  });

  it('is not empty while loading', () => {
    render(
      <AiUsageChartData points={undefined} loading={true}>
        {({ points, isEmpty }) => (
          <span data-testid="probe">{`${points.length}:${isEmpty}`}</span>
        )}
      </AiUsageChartData>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('0:false');
  });

  it('passes points through unchanged when present', () => {
    const points = [{ date: '2026-09-01', calls: 3, input_tokens: 30, output_tokens: 40 }];
    render(
      <AiUsageChartData points={points} loading={false}>
        {({ points: passed, isEmpty }) => (
          <span data-testid="probe">{`${passed.length}:${isEmpty}:${passed[0]?.date}`}</span>
        )}
      </AiUsageChartData>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('1:false:2026-09-01');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/react/__tests__/ai-usage-chart-data.test.tsx`
Expected: FAIL — `Cannot find module '../ai-usage-chart-data'`.

- [ ] **Step 3: Create `src/react/ai-usage-chart-data.tsx`**

```tsx
import type { ReactNode } from 'react';
import type { AiUsageTimeseriesPoint } from '../types';

export interface AiUsageChartDataState {
  points: AiUsageTimeseriesPoint[];
  isEmpty: boolean;
}

export interface AiUsageChartDataProps {
  points: AiUsageTimeseriesPoint[] | undefined;
  loading: boolean;
  children: (state: AiUsageChartDataState) => ReactNode;
}

export function AiUsageChartData({ points, loading, children }: AiUsageChartDataProps): ReactNode {
  const resolved = points ?? [];
  const isEmpty = !loading && resolved.length === 0;
  return children({ points: resolved, isEmpty });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/react/__tests__/ai-usage-chart-data.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/react/ai-usage-chart-data.tsx src/react/__tests__/ai-usage-chart-data.test.tsx
git commit -m "feat: add AiUsageChartData headless component"
```

---

### Task 9: React barrel (`src/react/index.ts`)

**Files:**
- Create: `src/react/index.ts`
- Test: `src/react/__tests__/index.test.ts`

**Interfaces:**
- Consumes: everything produced by Tasks 3-8.
- Produces: the public `@idevconn/ai-usage/react` entry.

- [ ] **Step 1: Write the failing test**

Create `src/react/__tests__/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatTokens,
  useAiUsageSummary,
  useAiUsageTimeseries,
  AiUsageStat,
  AiUsageBreakdownTable,
  AiUsageChartData,
} from '../index';

describe('react entry', () => {
  it('re-exports everything from a single import', () => {
    expect(typeof formatNumber).toBe('function');
    expect(typeof formatTokens).toBe('function');
    expect(typeof useAiUsageSummary).toBe('function');
    expect(typeof useAiUsageTimeseries).toBe('function');
    expect(typeof AiUsageStat).toBe('function');
    expect(typeof AiUsageBreakdownTable).toBe('function');
    expect(typeof AiUsageChartData).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/react/__tests__/index.test.ts`
Expected: FAIL — `Cannot find module '../index'`.

- [ ] **Step 3: Create `src/react/index.ts`**

```ts
export { formatNumber, formatTokens } from './format';
export {
  AI_USAGE_SUMMARY_QUERY_KEY,
  AI_USAGE_TIMESERIES_QUERY_KEY,
  buildAiUsageQueryPath,
} from './query-keys';
export { useAiUsageSummary } from './use-ai-usage-summary';
export type { AiUsageFetchOptions } from './use-ai-usage-summary';
export { useAiUsageTimeseries } from './use-ai-usage-timeseries';
export { AiUsageStat } from './ai-usage-stat';
export type { AiUsageStatProps, AiUsageStatState } from './ai-usage-stat';
export { AiUsageBreakdownTable } from './ai-usage-breakdown-table';
export type {
  AiUsageBreakdownTableProps,
  AiUsageBreakdownTableState,
} from './ai-usage-breakdown-table';
export { AiUsageChartData } from './ai-usage-chart-data';
export type { AiUsageChartDataProps, AiUsageChartDataState } from './ai-usage-chart-data';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/react/__tests__/index.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/react/index.ts src/react/__tests__/index.test.ts
git commit -m "feat: add react barrel export"
```

---

### Task 10: Server — `AiUsageDataSource` interface + DI token

**Files:**
- Create: `src/server/ai-usage-data-source.ts`
- Test: `src/server/__tests__/ai-usage-data-source.test.ts`

**Interfaces:**
- Consumes: `AiUsageRange`, `AiUsageSummary`, `AiUsageTimeseries` from `../types`.
- Produces: `AiUsageDataSource` interface, `AI_USAGE_DATA_SOURCE: symbol` DI token — consumed by Tasks 11 and 12.

- [ ] **Step 1: Write the failing test**

Create `src/server/__tests__/ai-usage-data-source.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { AI_USAGE_DATA_SOURCE } from '../ai-usage-data-source';

describe('AI_USAGE_DATA_SOURCE', () => {
  it('is a unique symbol usable as a DI token', () => {
    expect(typeof AI_USAGE_DATA_SOURCE).toBe('symbol');
    expect(AI_USAGE_DATA_SOURCE.toString()).toBe('Symbol(AI_USAGE_DATA_SOURCE)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/__tests__/ai-usage-data-source.test.ts`
Expected: FAIL — `Cannot find module '../ai-usage-data-source'`.

- [ ] **Step 3: Create `src/server/ai-usage-data-source.ts`**

```ts
import type { AiUsageRange, AiUsageSummary, AiUsageTimeseries } from '../types';

export const AI_USAGE_DATA_SOURCE = Symbol('AI_USAGE_DATA_SOURCE');

export interface AiUsageDataSource {
  getSummary(range: AiUsageRange, userId?: string): Promise<AiUsageSummary>;
  getTimeseries(range: AiUsageRange, userId?: string): Promise<AiUsageTimeseries>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/__tests__/ai-usage-data-source.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/server/ai-usage-data-source.ts src/server/__tests__/ai-usage-data-source.test.ts
git commit -m "feat: add AiUsageDataSource interface and DI token"
```

---

### Task 11: Server — `AdminAiUsageController`

**Files:**
- Create: `src/server/admin-ai-usage.controller.ts`
- Test: `src/server/__tests__/admin-ai-usage.controller.test.ts`

**Interfaces:**
- Consumes: `AI_USAGE_DATA_SOURCE`, `AiUsageDataSource` from `./ai-usage-data-source` (Task 10); `AiUsageRange`, `AiUsageSummary`, `AiUsageTimeseries` from `../types` (Task 1); `parseAiUsageRange` from `../range` (Task 1).
- Produces: `AdminAiUsageController` — consumed by `AiUsageModule.forRoot` (Task 12) and the server barrel (Task 13).

- [ ] **Step 1: Write the failing test**

Create `src/server/__tests__/admin-ai-usage.controller.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AdminAiUsageController } from '../admin-ai-usage.controller';
import type { AiUsageDataSource } from '../ai-usage-data-source';
import type { AiUsageSummary, AiUsageTimeseries } from '../../types';

function makeDataSource(): AiUsageDataSource {
  const summary = {} as unknown as AiUsageSummary;
  const timeseries = { points: [] } as AiUsageTimeseries;
  return {
    getSummary: vi.fn().mockResolvedValue(summary),
    getTimeseries: vi.fn().mockResolvedValue(timeseries),
  };
}

describe('AdminAiUsageController', () => {
  it('defaults the summary range to 7d', async () => {
    const dataSource = makeDataSource();
    const controller = new AdminAiUsageController(dataSource);

    await controller.summary(undefined, undefined);

    expect(dataSource.getSummary).toHaveBeenCalledWith('7d', undefined);
  });

  it('defaults the timeseries range to 30d', async () => {
    const dataSource = makeDataSource();
    const controller = new AdminAiUsageController(dataSource);

    await controller.timeseries(undefined, undefined);

    expect(dataSource.getTimeseries).toHaveBeenCalledWith('30d', undefined);
  });

  it('passes an explicit range and userId through', async () => {
    const dataSource = makeDataSource();
    const controller = new AdminAiUsageController(dataSource);

    await controller.summary('24h', 'user-1');

    expect(dataSource.getSummary).toHaveBeenCalledWith('24h', 'user-1');
  });

  it('throws BadRequestException on an invalid range', async () => {
    const dataSource = makeDataSource();
    const controller = new AdminAiUsageController(dataSource);

    await expect(controller.summary('bogus', undefined)).rejects.toThrow(BadRequestException);
    await expect(controller.summary('bogus', undefined)).rejects.toThrow(
      'Invalid range: bogus. Valid: 24h | 7d | 30d | 90d',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/__tests__/admin-ai-usage.controller.test.ts`
Expected: FAIL — `Cannot find module '../admin-ai-usage.controller'`.

- [ ] **Step 3: Create `src/server/admin-ai-usage.controller.ts`**

```ts
import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AiUsageRange, AiUsageSummary, AiUsageTimeseries } from '../types';
import { parseAiUsageRange } from '../range';
import { AI_USAGE_DATA_SOURCE, type AiUsageDataSource } from './ai-usage-data-source';

@ApiTags('admin')
@Controller('admin/ai-usage')
export class AdminAiUsageController {
  constructor(
    @Inject(AI_USAGE_DATA_SOURCE) private readonly dataSource: AiUsageDataSource,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Aggregate AI usage stats for the admin dashboard' })
  summary(
    @Query('range') range?: string,
    @Query('userId') userId?: string,
  ): Promise<AiUsageSummary> {
    const parsed = this.parseOrThrow(range, '7d');
    return this.dataSource.getSummary(parsed, userId || undefined);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Daily AI usage timeseries for the admin dashboard' })
  timeseries(
    @Query('range') range?: string,
    @Query('userId') userId?: string,
  ): Promise<AiUsageTimeseries> {
    const parsed = this.parseOrThrow(range, '30d');
    return this.dataSource.getTimeseries(parsed, userId || undefined);
  }

  private parseOrThrow(range: string | undefined, fallback: AiUsageRange): AiUsageRange {
    try {
      return parseAiUsageRange(range, fallback);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/__tests__/admin-ai-usage.controller.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/admin-ai-usage.controller.ts src/server/__tests__/admin-ai-usage.controller.test.ts
git commit -m "feat: add AdminAiUsageController"
```

---

### Task 12: Server — `AiUsageModule.forRoot`

**Files:**
- Create: `src/server/ai-usage.module.ts`
- Test: `src/server/__tests__/ai-usage.module.test.ts`

**Interfaces:**
- Consumes: `AI_USAGE_DATA_SOURCE`, `AiUsageDataSource` from `./ai-usage-data-source` (Task 10); `AdminAiUsageController` from `./admin-ai-usage.controller` (Task 11).
- Produces: `AiUsageModuleOptions { useClass?; useExisting?; useFactory?; inject?; imports? }`, `AiUsageModule.forRoot(options): DynamicModule` — consumed by the server barrel (Task 13) and by hosts.

- [ ] **Step 1: Write the failing test**

Create `src/server/__tests__/ai-usage.module.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { AiUsageModule } from '../ai-usage.module';
import { AI_USAGE_DATA_SOURCE, type AiUsageDataSource } from '../ai-usage-data-source';

class FakeDataSource implements AiUsageDataSource {
  getSummary = vi.fn();
  getTimeseries = vi.fn();
}

describe('AiUsageModule.forRoot', () => {
  it('binds useClass to the AI_USAGE_DATA_SOURCE token', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AiUsageModule.forRoot({ useClass: FakeDataSource })],
    }).compile();

    const dataSource = moduleRef.get<AiUsageDataSource>(AI_USAGE_DATA_SOURCE);
    expect(dataSource).toBeInstanceOf(FakeDataSource);
  });

  it('binds useFactory to the AI_USAGE_DATA_SOURCE token', async () => {
    const fake = new FakeDataSource();
    const moduleRef = await Test.createTestingModule({
      imports: [AiUsageModule.forRoot({ useFactory: () => fake })],
    }).compile();

    const dataSource = moduleRef.get<AiUsageDataSource>(AI_USAGE_DATA_SOURCE);
    expect(dataSource).toBe(fake);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/__tests__/ai-usage.module.test.ts`
Expected: FAIL — `Cannot find module '../ai-usage.module'`.

- [ ] **Step 3: Create `src/server/ai-usage.module.ts`**

```ts
import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { AI_USAGE_DATA_SOURCE, AiUsageDataSource } from './ai-usage-data-source';
import { AdminAiUsageController } from './admin-ai-usage.controller';

export interface AiUsageModuleOptions {
  useClass?: Type<AiUsageDataSource>;
  useExisting?: any;
  useFactory?: (...args: any[]) => AiUsageDataSource | Promise<AiUsageDataSource>;
  inject?: any[];
  imports?: any[];
}

@Module({})
export class AiUsageModule {
  static forRoot(options: AiUsageModuleOptions): DynamicModule {
    let provider: Provider;
    if (options.useFactory) {
      provider = {
        provide: AI_USAGE_DATA_SOURCE,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      };
    } else if (options.useClass) {
      provider = { provide: AI_USAGE_DATA_SOURCE, useClass: options.useClass };
    } else {
      provider = { provide: AI_USAGE_DATA_SOURCE, useExisting: options.useExisting };
    }

    return {
      module: AiUsageModule,
      imports: options.imports ?? [],
      controllers: [AdminAiUsageController],
      providers: [provider],
      exports: [AI_USAGE_DATA_SOURCE],
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/__tests__/ai-usage.module.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/ai-usage.module.ts src/server/__tests__/ai-usage.module.test.ts
git commit -m "feat: add AiUsageModule.forRoot"
```

---

### Task 13: Server barrel (`src/server/index.ts`)

**Files:**
- Create: `src/server/index.ts`
- Test: `src/server/__tests__/index.test.ts`

**Interfaces:**
- Consumes: everything produced by Tasks 10-12.
- Produces: the public `@idevconn/ai-usage/server` entry.

- [ ] **Step 1: Write the failing test**

Create `src/server/__tests__/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { AiUsageModule, AdminAiUsageController, AI_USAGE_DATA_SOURCE } from '../index';

describe('server entry', () => {
  it('re-exports everything from a single import', () => {
    expect(typeof AiUsageModule).toBe('function');
    expect(typeof AdminAiUsageController).toBe('function');
    expect(typeof AI_USAGE_DATA_SOURCE).toBe('symbol');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/__tests__/index.test.ts`
Expected: FAIL — `Cannot find module '../index'`.

- [ ] **Step 3: Create `src/server/index.ts`**

```ts
export { AI_USAGE_DATA_SOURCE } from './ai-usage-data-source';
export type { AiUsageDataSource } from './ai-usage-data-source';
export { AiUsageModule } from './ai-usage.module';
export type { AiUsageModuleOptions } from './ai-usage.module';
export { AdminAiUsageController } from './admin-ai-usage.controller';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/__tests__/index.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/server/index.ts src/server/__tests__/index.test.ts
git commit -m "feat: add server barrel export"
```

---

### Task 14: README + full verification pass

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: the full public API from Tasks 1-13 (documents it; no new production code).

- [ ] **Step 1: Write `README.md`**

```markdown
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
```

- [ ] **Step 2: Full verification pass**

Run, in order, from `/home/vladimir-tkach/Projects/ai-usage`:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Expected: all four commands exit 0. `npm run build` produces `dist/index.{js,cjs,d.ts}`, `dist/server.{js,cjs,d.ts}`, `dist/react.{js,cjs,d.ts}`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README covering root/server/react usage"
```
