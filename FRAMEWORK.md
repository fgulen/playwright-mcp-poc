# FRAMEWORK.md — Playwright Test Framework Generation Rules

> **When to activate this file:**
> After the MCP/CLI setup screen is confirmed (Setup Tab checklist complete),
> Claude Code / Cline / Kiro reads this file and scaffolds the full test framework
> based on the active Test Plan and Prompts from the dashboard.

---

## Trigger Condition

Generate the framework when the user sends any of the following in chat:
- "generate framework"
- "create framework"
- "scaffold tests"
- "framework oluştur"
- "testleri oluştur"

Before generating, confirm:
1. At least one prompt exists in the Prompt tab
2. Target URL is set in the Test Plan tab
3. `.env` file does not already exist (avoid overwrite without confirmation)

---

## Output Structure

Generate the following file tree under `./playwright-framework/`:

```
playwright-framework/
├── .env                        ← Environment variables (never commit)
├── .env.example                ← Safe template to commit
├── .gitignore
├── package.json
├── playwright.config.ts
├── global-setup.ts             ← Browser launch, full screen, video
├── global-teardown.ts
│
├── pages/                      ← Page Object Models
│   ├── BasePage.ts             ← Screenshot, navigation, wait helpers
│   └── [derived from prompts]  ← One POM file per logical page/flow
│
├── tests/                      ← Generated test files
│   └── [test-plan-id]/
│       └── [prompt-slug].spec.ts
│
├── fixtures/
│   └── test-fixtures.ts        ← Shared Playwright fixtures
│
├── utils/
│   ├── reporter.ts             ← Markdown report generator
│   ├── logger.ts               ← Step logger
│   └── screenshotter.ts        ← Error/checkpoint screenshot helper
│
├── reports/
│   └── .gitkeep               ← Output dir for REPORT.md + artifacts
│
└── README.md                   ← Auto-generated setup instructions
```

---

## .env File

Generate `.env` with values extracted from the dashboard Test Plan:

```dotenv
# ── Target ────────────────────────────────────────────────
BASE_URL=https://www.bahn.de
TEST_PLAN_ID=TP-001
TEST_PLAN_NAME=Deutsche Bahn – Fahrplan Booking Flow

# ── Browser ───────────────────────────────────────────────
BROWSER=chromium
HEADLESS=false
SLOW_MO=0

# ── Viewport ──────────────────────────────────────────────
# Full screen is achieved via maximizedWindow in config.
# These are fallback dimensions if maximization fails.
VIEWPORT_WIDTH=1920
VIEWPORT_HEIGHT=1080

# ── Video & Tracing ───────────────────────────────────────
VIDEO=on
# Options: off | on | retain-on-failure
TRACE=retain-on-failure
# Options: off | on | retain-on-failure

# ── Timeouts (ms) ─────────────────────────────────────────
DEFAULT_TIMEOUT=10000
EXPECT_TIMEOUT=8000
NAVIGATION_TIMEOUT=20000
ACTION_RETRY_COUNT=2

# ── Paths ─────────────────────────────────────────────────
REPORT_OUTPUT_DIR=./reports
SCREENSHOT_DIR=./reports/screenshots
VIDEO_DIR=./reports/videos

# ── Security ──────────────────────────────────────────────
# Never fill these for production. Test accounts only.
TEST_USER=
TEST_PASS=
# PURCHASE_GUARD=true  ← Do not change. Prevents checkout actions.
PURCHASE_GUARD=true
```

Generate `.env.example` as a copy with all values cleared/commented.

---

## .gitignore

```gitignore
node_modules/
.env
reports/
playwright-report/
test-results/
*.png
*.webm
*.zip
```

---

## package.json

```json
{
  "name": "testpilot-playwright-framework",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "test:report": "playwright show-report",
    "install:browsers": "playwright install chromium"
  },
  "devDependencies": {
    "@playwright/test": "^1.44.0",
    "dotenv": "^16.4.5",
    "typescript": "^5.4.5"
  }
}
```

---

## playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,          // sequential — mirrors prompt order
  retries: Number(process.env.ACTION_RETRY_COUNT ?? 2),
  workers: 1,
  timeout: Number(process.env.DEFAULT_TIMEOUT ?? 10000),

  expect: {
    timeout: Number(process.env.EXPECT_TIMEOUT ?? 8000),
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['./utils/reporter.ts'],      // custom Markdown reporter
  ],

  use: {
    baseURL: process.env.BASE_URL,
    headless: process.env.HEADLESS === 'true',
    slowMo: Number(process.env.SLOW_MO ?? 0),

    // ── Full screen ──────────────────────────────────────
    launchOptions: {
      args: ['--start-maximized'],
    },
    viewport: null,              // null = use maximized window size

    // ── Video ────────────────────────────────────────────
    video: (process.env.VIDEO ?? 'on') as 'on' | 'off' | 'retain-on-failure',

    // ── Tracing ──────────────────────────────────────────
    trace: (process.env.TRACE ?? 'retain-on-failure') as
      'on' | 'off' | 'retain-on-failure',

    // ── Screenshots on failure ────────────────────────────
    screenshot: 'only-on-failure',

    // ── Navigation timeout ────────────────────────────────
    navigationTimeout: Number(process.env.NAVIGATION_TIMEOUT ?? 20000),
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  outputDir: process.env.REPORT_OUTPUT_DIR ?? './reports',
});
```

---

## global-setup.ts

```typescript
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('\n🎬 TestPilot — Global Setup');
  console.log(`   Plan   : ${process.env.TEST_PLAN_ID} – ${process.env.TEST_PLAN_NAME}`);
  console.log(`   Target : ${process.env.BASE_URL}`);
  console.log(`   Video  : ${process.env.VIDEO}`);
  console.log(`   Guard  : PURCHASE_GUARD=${process.env.PURCHASE_GUARD}\n`);

  if (process.env.PURCHASE_GUARD !== 'true') {
    throw new Error(
      '🚨 PURCHASE_GUARD is not set to true. Aborting to prevent accidental checkout.'
    );
  }
}

export default globalSetup;
```

---

## BasePage.ts (Page Object Model Base)

```typescript
import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export class BasePage {
  readonly page: Page;
  readonly screenshotDir: string;

  constructor(page: Page) {
    this.page = page;
    this.screenshotDir = process.env.SCREENSHOT_DIR ?? './reports/screenshots';
    fs.mkdirSync(this.screenshotDir, { recursive: true });
  }

  // ── Navigation ────────────────────────────────────────────────────
  async goto(url?: string) {
    await this.page.goto(url ?? process.env.BASE_URL ?? '/');
    await this.page.waitForLoadState('networkidle');
  }

  // ── Screenshot ────────────────────────────────────────────────────
  async screenshot(name: string) {
    const filePath = path.join(this.screenshotDir, `${name}.png`);
    await this.page.screenshot({ path: filePath, fullPage: true });
    console.log(`   📸 Screenshot saved: ${filePath}`);
    return filePath;
  }

  async screenshotOnError(stepName: string, error: Error) {
    const ts = Date.now();
    const filePath = await this.screenshot(`ERROR_${stepName}_${ts}`);
    console.error(`   ❌ Error at step "${stepName}": ${error.message}`);
    console.error(`   📸 Error screenshot: ${filePath}`);
  }

  // ── Purchase Guard ────────────────────────────────────────────────
  guardedAction(actionName: string) {
    const blocked = ['weiter zur buchung', 'kaufen', 'bezahlen', 'checkout', 'pay'];
    if (blocked.some(b => actionName.toLowerCase().includes(b))) {
      throw new Error(
        `🚨 PURCHASE_GUARD blocked action: "${actionName}". This step is not allowed.`
      );
    }
  }

  // ── Waiting helpers ───────────────────────────────────────────────
  async waitForSelector(selector: string, timeout?: number) {
    await this.page.waitForSelector(selector, {
      state: 'visible',
      timeout: timeout ?? Number(process.env.DEFAULT_TIMEOUT),
    });
  }

  async retryClick(selector: string, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        await this.page.click(selector);
        return;
      } catch (e) {
        if (i === retries) throw e;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  // ── Step logger ───────────────────────────────────────────────────
  async step(description: string, action: () => Promise<void>) {
    console.log(`   ▶ ${description}`);
    try {
      await action();
      console.log(`   ✓ ${description}`);
    } catch (error) {
      await this.screenshotOnError(description.replace(/\s+/g, '_'), error as Error);
      throw error;
    }
  }
}
```

---

## POM Generation Rules

One POM file is generated per **logical page or flow** detected in the prompts.

### Detection logic:
- If a prompt mentions a URL or page transition → new POM class
- Group prompts by page they operate on

### Example: `pages/BahnSearchPage.ts`

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class BahnSearchPage extends BasePage {
  // ── Selectors ────────────────────────────────────────────────────
  private readonly selectors = {
    fromInput:       '[data-testid="from-input"], #REQ0JourneyStopsS0G',
    toInput:         '[data-testid="to-input"],   #REQ0JourneyStopsZ0G',
    dateInput:       '[data-testid="date-input"],  #REQ0JourneyDate',
    timeInput:       '[data-testid="time-input"],  #REQ0JourneyTime',
    searchButton:    '[data-testid="search-btn"],  #searchButton',
    advancedOptions: 'text=Weitere Optionen, text=Erweiterte Suche',
    classSelect:     '[name="REQ0JourneyClassArgs"]',
    bahnCardSelect:  '[name="REQ0Tariff_TravellerReductionClass0"]',
  };

  // ── Actions ───────────────────────────────────────────────────────
  async fillFrom(value: string) {
    await this.step(`Fill "Von": ${value}`, async () => {
      await this.page.fill(this.selectors.fromInput, value);
      await this.page.waitForSelector('.autocomplete-suggestion', { timeout: 5000 });
      await this.page.click(`.autocomplete-suggestion >> text="${value}"`);
    });
  }

  async fillTo(value: string) {
    await this.step(`Fill "Nach": ${value}`, async () => {
      await this.page.fill(this.selectors.toInput, value);
      await this.page.waitForSelector('.autocomplete-suggestion', { timeout: 5000 });
      await this.page.click(`.autocomplete-suggestion >> text="${value}"`);
    });
  }

  async fillTomorrowDate() {
    await this.step('Fill tomorrow\'s date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formatted = tomorrow.toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      await this.page.fill(this.selectors.dateInput, formatted);
    });
  }

  async selectFirstClass() {
    await this.step('Select 1. Klasse', async () => {
      await this.page.selectOption(this.selectors.classSelect, '1');
    });
  }

  async selectBahnCard25() {
    await this.step('Select BahnCard 25', async () => {
      await this.page.selectOption(this.selectors.bahnCardSelect, '1');
    });
  }

  async submitSearch() {
    await this.step('Submit search form', async () => {
      this.guardedAction('search');               // allowed — not a purchase
      await this.page.click(this.selectors.searchButton);
      await this.page.waitForLoadState('networkidle');
    });
  }
}
```

### Naming Convention for POM files:
| Prompt topic | POM filename |
|---|---|
| Landing / navigation | `HomePage.ts` |
| Search form | `SearchPage.ts` |
| Results list | `ResultsPage.ts` |
| Ticket detail | `DetailPage.ts` |
| Pricing / tariff | `PricingPage.ts` |

---

## Test File Generation Rules

Each prompt becomes one `describe` block inside a `.spec.ts` file.
Group all prompts from the same test plan under `tests/[TEST_PLAN_ID]/`.

### Template: `tests/TP-001/db-booking-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { BahnSearchPage }  from '../../pages/BahnSearchPage';
import { BahnResultsPage } from '../../pages/BahnResultsPage';
import { BahnDetailPage }  from '../../pages/BahnDetailPage';

test.describe('TP-001 – Deutsche Bahn Booking Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Full screen is set in config via --start-maximized + viewport:null
  });

  // ── P-01: Landing ─────────────────────────────────────────────────
  test('P-01 – Landing page loads and form is visible', async ({ page }) => {
    const homePage = new BahnSearchPage(page);
    await homePage.goto();
    await homePage.screenshot('p01_landing');
    await expect(page).toHaveTitle(/Bahn/i);
  });

  // ── P-02: Form fill ───────────────────────────────────────────────
  test('P-02 – Fill search form', async ({ page }) => {
    const searchPage = new BahnSearchPage(page);
    await searchPage.goto();
    await searchPage.fillFrom('Köln Hbf');
    await searchPage.fillTo('Berlin Hbf');
    await searchPage.fillTomorrowDate();
    await searchPage.screenshot('p02_form_filled');
  });

  // ── P-07: Purchase guard ──────────────────────────────────────────
  test('P-07 – Purchase guard must block checkout actions', async ({ page }) => {
    const base = new BahnSearchPage(page);
    expect(() => base.guardedAction('Weiter zur Buchung')).toThrow('PURCHASE_GUARD');
  });

});
```

---

## Video Recording

Video is enabled by default via `playwright.config.ts` (`video: 'on'`).

Files are saved to `./reports/videos/` automatically by Playwright.

Naming: Playwright generates `[test-title]-[hash].webm`.
After the run, `utils/reporter.ts` lists video paths in `REPORT.md`.

---

## Screenshot Rules

| Trigger | Method | File name pattern |
|---|---|---|
| Playwright test failure | `screenshot: 'only-on-failure'` in config | `test-failed-*.png` (auto) |
| Explicit checkpoint | `basePage.screenshot('p01_landing')` | `p01_landing.png` |
| Caught error in step | `basePage.screenshotOnError(stepName, err)` | `ERROR_stepName_timestamp.png` |

All screenshots land in `SCREENSHOT_DIR` (default `./reports/screenshots/`).

---

## REPORT.md Generation — utils/reporter.ts

Implement a custom Playwright reporter that writes `./reports/REPORT.md` after each run.

```typescript
// utils/reporter.ts
import type {
  Reporter, TestCase, TestResult, Suite, FullResult
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

class MarkdownReporter implements Reporter {
  private lines: string[] = [];
  private start = Date.now();

  onBegin(_config: unknown, suite: Suite) {
    const now = new Date().toISOString();
    this.lines.push(
      `# TestPilot – Test Run Report`,
      ``,
      `| Field | Value |`,
      `|---|---|`,
      `| Plan ID | ${process.env.TEST_PLAN_ID ?? 'N/A'} |`,
      `| Plan Name | ${process.env.TEST_PLAN_NAME ?? 'N/A'} |`,
      `| Target URL | ${process.env.BASE_URL ?? 'N/A'} |`,
      `| Started | ${now} |`,
      `| Total Tests | ${suite.allTests().length} |`,
      ``,
      `## Results`,
      ``,
      `| # | Test | Status | Duration | Notes |`,
      `|---|---|---|---|---|`,
    );
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const icon   = result.status === 'passed'  ? '✅'
                 : result.status === 'failed'  ? '❌'
                 : result.status === 'skipped' ? '⏭️'
                 : '⚠️';
    const dur    = `${(result.duration / 1000).toFixed(1)}s`;
    const errors = result.errors.map(e => e.message?.split('\n')[0] ?? '').join('; ');
    const shots  = result.attachments
      .filter(a => a.name === 'screenshot')
      .map(a => `[screenshot](${a.path})`)
      .join(', ');

    this.lines.push(
      `| – | ${test.title} | ${icon} ${result.status} | ${dur} | ${errors || shots || ''} |`
    );
  }

  onEnd(result: FullResult) {
    const totalMs = Date.now() - this.start;
    const allTests = result as unknown as { passed: number; failed: number; skipped: number };

    this.lines.push(
      ``,
      `## Summary`,
      ``,
      `| Metric | Value |`,
      `|---|---|`,
      `| Total Duration | ${(totalMs / 1000).toFixed(1)}s |`,
      `| Passed | ✅ ${(allTests as any).stats?.expected ?? '-'} |`,
      `| Failed | ❌ ${(allTests as any).stats?.unexpected ?? '-'} |`,
      `| Skipped | ⏭️ ${(allTests as any).stats?.skipped ?? '-'} |`,
      ``,
      `## Videos`,
      ``,
      `Videos are saved in \`./reports/videos/\`.`,
      `Open with: \`npx playwright show-report\``,
      ``,
      `## Screenshots`,
      ``,
      `Screenshots on failure are saved in \`./reports/screenshots/\`.`,
      ``,
      `---`,
      `_Generated by TestPilot — ${new Date().toISOString()}_`,
    );

    const outDir = process.env.REPORT_OUTPUT_DIR ?? './reports';
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'REPORT.md'), this.lines.join('\n'), 'utf-8');
    console.log(`\n📄 Markdown report written to ${outDir}/REPORT.md\n`);
  }
}

export default MarkdownReporter;
```

---

## README.md (Auto-generated)

```markdown
# TestPilot Playwright Framework

Generated by TestPilot POC Dashboard.
Plan: **{{TEST_PLAN_ID}}** – {{TEST_PLAN_NAME}}

## Quick Start

\`\`\`bash
cd playwright-framework
npm install
npx playwright install chromium
cp .env.example .env   # fill in your values
npm test
\`\`\`

## Run headed (visible browser, full screen)
\`\`\`bash
npm run test:headed
\`\`\`

## View HTML report
\`\`\`bash
npm run test:report
\`\`\`

## Outputs
| Path | Content |
|---|---|
| `reports/REPORT.md` | Markdown summary (prompts → results) |
| `reports/screenshots/` | Error + checkpoint screenshots |
| `reports/videos/` | Full session recordings (.webm) |
| `playwright-report/` | Playwright HTML report |

## Purchase Guard
`PURCHASE_GUARD=true` in `.env` blocks all checkout/payment actions.
Do not disable this in demo environments.
```

---

## Generation Constraints (Claude Code must respect these)

1. **Never hardcode credentials** — read from `.env`, fall back to empty string.
2. **Never disable PURCHASE_GUARD** — it must remain `true` in all generated files.
3. **POM selectors are best-effort** — add a comment `// TODO: verify selector` if the actual DOM selector is unknown. Do not invent CSS that will silently fail.
4. **One test per prompt** — do not merge prompts into one test block.
5. **TypeScript only** — no `.js` test files.
6. **No third-party test helpers** — only `@playwright/test` + `dotenv`.
7. **Video always on for headed runs** — never set `video: 'off'` in config.
8. **Full screen via config** — use `viewport: null` + `--start-maximized`, not `page.setViewportSize()`.
9. **REPORT.md must always be written** — even if all tests fail.
10. **Screenshot on every caught error** — never swallow an error silently.
