# Rawaj (رواج): notes for Claude

Read this first. It is the handoff from the sessions that built the project, so you can carry on without
asking the owner to repeat themselves.

## The owner

- Non-technical. Writes Levantine Arabic, often phonetically or with typos ("بدي", "اشي", "هاذ"). **Reply in simple
  Levantine Arabic**, with no jargon. Give numbered, click-by-click steps for anything only they can do
  (accounts, payments, approvals, GitHub settings).
- Wants finished, working things, not demos. Don't put mock or placeholder systems on the live site, and don't
  delete or rebuild features that work.
- **Never sign up for, activate or pay for any service for them.** Prepare the code, then tell them exactly what to click.
- Halal is a hard requirement (see "Halal rules" below).
- Their other repository, `7brv6ymdsz-cmd/Mostfa`, is a separate book site («سكينة»). It once held a copy of this
  store, which was removed on purpose. Never copy or sync files there.

## What the product is

- **«رواج» / Rawaj**, tagline «خلّي شغلك يروج» / "Make your business thrive": a halal growth platform for small
  businesses. Arabic first, with English.
- Live at <https://7brv6ymdsz-cmd.github.io/raff-store/>. GitHub Pages deploys it from `main`. The repository still
  has its old name, `raff-store`.
- One monthly subscription, two plans, set in `data/store.json → settings.billing.plans`:
  - «احترافي» Pro: $119/month, one project.
  - «أعمال» Business: $249/month, up to 5 projects.
- **Product 1, live: Mizan (ميزان)**, a finance book inside the site at `#/mizan`.
  - Tabs: dashboard, entries, invoices, clients, pricing calculator, settings.
  - It opens only while the subscription is active and locks itself when the plan ends. The lock is enforced by
    row-level security (RLS) on the `mizan_*` tables, not only by the page.
- **Product 2, not built yet: the ads manager (مدير الإعلانات)**. The site shows it honestly as «قريباً» (coming soon).
  - What `platform.js` promises: you answer a few questions, and it builds the campaign on Facebook, Instagram and
    TikTok. Every day it pauses the losing ads and scales the winning ones, without ever going over a spend cap.
    It offers ready-made Arabic campaigns, connects ad accounts in one click, and reports real profit.
  - It needs the owner's Meta and TikTok developer apps and their approvals first (`docs/SETUP-AR.md` §3).
- The code started life as «رَفّ» (Raff), a complete Arabic store: catalog, cart, checkout, orders, coupons, reviews,
  support inbox and an admin panel. All of that still exists and is tested.
  - The homepage now runs in platform mode: `settings.landing = { on: true, mode: 'platform' }`.
  - The older digital products (ids 1–8; id 8 is the old Mizan spreadsheet) are `hidden` in `store.json`.

## Stack

- A static site in vanilla JS: no framework, no build step. GitHub Pages serves the repository root.
- The backend is optional: Supabase (Postgres, Auth, RLS, `security definer` RPCs and one Edge Function).
  - **`config.js` empty = "local" mode.** The catalog comes from `data/store.json` and orders go over WhatsApp.
    The admin keeps its data encrypted under a PIN in localStorage, and publishes by uploading `data/store.json`
    to GitHub.
  - **`config.js` filled = "cloud" mode** (`data.js` decides the mode).
- **`config.js` is still empty on the live site**, so Mizan shows its "server" locked view until the owner creates
  the Supabase project.
- **Payments: Lemon Squeezy subscriptions** (Lemon Squeezy is the merchant of record).
  - The owner pastes each plan's checkout link in admin → Settings → plans (`checkoutUrl`, empty for now).
  - The site adds `checkout[email]` and `checkout[custom][user_id]` to the link.
  - The webhook is `supabase/functions/billing-webhook`, a Deno function. It verifies the `X-Signature` HMAC and
    calls `billing_upsert` with the service role.
  - Its pure logic lives in `logic.js` and is tested by `tests/e2e/billing-logic.spec.js`.

## Map

| Path | What it is |
|---|---|
| `index.html` | Site shell: meta and OG tags, the CSP, and the script order (each tag has a `?v=` cache buster) |
| `boot.js` | Runs in `<head>` before first paint and sets classes, so the homepage never flashes |
| `config.js` | Supabase URL and anon key |
| `shared.js` | Shared by the store and the admin: product art, formatting, order codes |
| `data.js` | Data layer: local or cloud mode, auth, orders, friendly errors (including `halal_blocked:*`) |
| `store.js` | Storefront: catalog, cards, cart, checkout |
| `store3d.js` | Optional three.js hero, which is skipped on the platform homepage |
| `pages.js` | Hash router (`ROUTES.*`): account pages and the legal pages `#/terms`, `#/halal`, `#/privacy`, `#/data-deletion` |
| `help.js` | Answer system: instant answers, support chat, product Q&A |
| `mizan-app.js` | Mizan (`#/mizan/<tab>`), its subscription gate, and the account card |
| `platform.js` | Rawaj homepage content, in AR and EN, plus JSON-LD |
| `landing.js` | Draws the homepage (platform or single-product mode) and owns the language switch |
| `halal.js` | Halal screening in the browser, mirroring the SQL |
| `sound.js` | UI sounds, off by default: `RaffSound.play(name)`, `[data-sfx]`, `[data-sound-toggle]` |
| `store.css`, `landing.css`, `mizan.css` | Styles. Brand tokens are in `landing.css` (`#landing`) |
| `data/store.json` | The published catalog and settings: name, plans, homepage mode |
| `admin/` | Admin panel: products (with the halal check), orders, members and subscriptions (grant, end, suspend), settings (plans and checkout links), publishing |
| `supabase/setup.sql` | The whole database: tables, RLS, RPCs, halal terms. It must stay re-runnable |
| `supabase/functions/billing-webhook/` | Lemon Squeezy webhook (`index.ts`, `logic.js`) |
| `brand/` | Brand page (`/brand/`), logos, videos, sounds, downloadable kit |
| `tools/brand/` | Scripts that generate everything in `brand/` (see its README) |
| `docs/SETUP-AR.md` | The owner's launch steps, in Arabic. Keep it up to date when setup changes |
| `docs/SYSTEMS.md` | Older inventory of the store systems, from the رَفّ era |
| `tests/` | `e2e/` (Playwright), `db/` (SQL), `helpers/` (`serve.mjs`, `supabase-mock.js`, `fixtures.js`), `audit/` (Lighthouse) |

## Conventions and gotchas

- **CSP is `script-src 'self'`.** No inline `<script>` and no `on*=` attributes. Inline styles are fine.
- **Bump the `?v=N` on a file's tag in `index.html` or `admin/index.html` every time you change that file.**
  Otherwise returning visitors keep the old copy.
- **Script order matters.**
  - `mizan-app.js` loads before `pages.js`, because it registers `window.raffExtraRoutes.mizan`.
  - `halal.js` and `sound.js` load before `data.js` and `store.js`.
- The site is RTL Arabic by default. The homepage has an AR/EN switch, saved in localStorage as `raff.lang`.
- Arabic copy is friendly Levantine and short. English copy is plain.
- **Security lives in SQL** (RLS and `security definer` functions). Never trust the browser.
  - `setup.sql` runs twice in the tests.
  - When you add a table or RPC there, mirror it in `tests/helpers/supabase-mock.js` so the browser tests can use it.
- **Brand:**
  - Colours: ink `#121418`, emerald `#0E7C66`, deep `#0B5E4E`, saffron `#E7A33E`, mint `#E6F3EF`, sand `#FBFAF7`,
    slate `#5B5F6B`.
  - Font: IBM Plex Sans Arabic, self-hosted in `assets/fonts` (OFL).
  - Brand assets are regenerated with `tools/brand/`.
- **Tests read their catalog from `tests/fixtures/store.json`.** The exceptions are `landing.spec.js` and
  `platform.spec.js`, which read the real `data/store.json`.

## Halal rules (hard requirement)

- These categories are banned: alcohol, drugs, gambling, riba (interest), adult or indecent content, pork, sorcery,
  music, fraud. They are the values of `halal_terms.category`.
- **How screening works:**
  - On the server, `halal_violations()` checks text against `halal_terms`. It normalises Arabic, matches whole words,
    and allows Arabic prefixes such as ال، و، ب، ل، ف.
  - The trigger `assert_halal` on products raises `halal_blocked:<categories>`.
  - `RaffHalal.check` (`halal.js`) gives instant feedback in the browser.
  - Keep the two term lists and the prefix lists in sync.
- **Anything new that publishes text must go through the server check.** This includes ad copy, creatives and
  targeting in the ads manager.
- Sounds and videos we make contain **no music, no instruments and no bells**.
- To suspend a violating member: `admin_block_member` makes `subscription_active()` false, which locks Mizan and every
  tool. Their data is kept.

## Commands

```bash
npm ci
npm run lint          # ESLint + Stylelint + html-validate
npx playwright test   # desktop + @mobile projects; starts tests/helpers/serve.mjs on http://localhost:4173/raff-store/
npm run test:db       # supabase/setup.sql + tests/db/*.sql on a real PostgreSQL (15+)
```

PostgreSQL 16 is installed in Claude's cloud containers but not running. Start a throwaway server like this:

```bash
mkdir -p /tmp/pgt && chown postgres:postgres /tmp/pgt
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /tmp/pgt/data" > /dev/null
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgt/data -o '-p 5499 -k /tmp/pgt' -l /tmp/pgt/log start"
PGUSER=postgres PGHOST=/tmp/pgt PGPORT=5499 npm run test:db
```

- Playwright uses the preinstalled Chromium at `/opt/pw-browsers/chromium` (`playwright.config.js`). Don't run
  `playwright install`.
- **A few long end-to-end tests are flaky on a slow or busy container.** On 2026-11-08, in a fresh container, these
  failed now and then in full runs and passed when run alone: `members`, `cloud`, `first-sale`, `operations`,
  `digital`.
  - Re-run the failures on their own, or the whole suite with `--workers=1`, before you treat one as a bug. CI retries
    once.
  - When writing tests, wait for the saved row or text. An empty Mizan table shows one placeholder row, so a
    `toHaveCount(1)` alone can pass before a save lands.
- CI (`.github/workflows/ci.yml`) runs lint, the database tests and Playwright on every push to `main`.
- Before you push, run all three locally.
- So far, changes have been committed straight to `main` once everything passed, and the owner checks the live site.

## Status (2026-11-08)

Done and tested:
- The Rawaj brand, the platform homepage in AR and EN, and Mizan behind the subscription.
- Admin members view: grant or end a plan, suspend or unsuspend, MRR.
- Billing webhook and checkout prefill.
- Halal screening (SQL and browser), with consent at sign-up.
- Legal pages, the brand kit and the setup guide.
- Lint and the SQL tests pass. Playwright passes in CI, which retries once; locally a few long tests are flaky
  (see Commands).

Waiting on the owner. `docs/SETUP-AR.md` has their steps in Arabic:
1. Create the Supabase project, run `setup.sql`, fill in `config.js`, and sign up the first account, which becomes
   the owner.
2. Lemon Squeezy:
   - Create a store with the two subscription variants.
   - Paste the checkout links in the admin.
   - Deploy `billing-webhook` and set its secrets.
   - Do a full run in test mode.
3. Open question: which country do they get paid in, and do they have PayPal? This affects Lemon Squeezy payouts.
4. Developer apps:
   - Meta: a Business-type app with the Marketing API. To serve other people's ad accounts it also needs Business
     Verification and Advanced Access to `ads_management`.
   - TikTok: a Marketing API developer app.
5. Optional: rename the repository to `rawaj`, or add a custom domain.
   - After a rename, the old Pages URL stops working (GitHub does not redirect project sites).
   - Update every `raff-store` reference: `index.html` (canonical, `og:url`, `og:image`), `sitemap.xml`,
     `previewUrl`s in `data/store.json`, `REPO_UPLOAD` in `admin/admin.js`, `supabase/README.md`, `README.md`.
   - The local test path `/raff-store/` (`playwright.config.js`, `tests/helpers/serve.mjs`,
     `tests/e2e/digital.spec.js`) can stay.

## Next big piece: the ads manager

This is a suggested approach. It is not built, and it has not been agreed in detail with the owner. Confirm the
scope with them before you start.
- Build Meta (Facebook and Instagram) first, then TikTok.
- Connect ad accounts with OAuth through Supabase Edge Functions. Keep tokens server-side only, never in the browser.
- Gate everything by `subscription_active()`, like Mizan.
- Build a campaign wizard: questions turn into objective, audience, a hard daily or total spend cap, and Arabic
  ad copy.
- Every ad text and creative passes `halal_violations()` on the server before anything is published.
- Run a scheduled daily optimiser (`pg_cron` calling an Edge Function) that pauses losers and scales winners within
  the cap. Log every action, so the owner and customers can see what changed and why.
- Report profit using the member's Mizan data.
- Add to `#/privacy` and `#/data-deletion` whatever the app reviews ask for.

## Kept outside this repository

- The source and finished files of the older paid digital products (planners, guides, CV templates, spreadsheets).
  They are private on purpose, because this repository is public. The owner has them as a zip from the session
  that made them.
- The world market research report lives in the owner's other Claude account (Claude Docs). Its conclusions are
  already reflected in the plans, prices and homepage copy.
