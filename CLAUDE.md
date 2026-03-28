# GoLive Labs — Project Instructions

## Project
A plain HTML/CSS/JS learning platform with no build step or framework. Open files directly in a browser or serve with `python3 -m http.server 3000` from the project root.

## Stack
- Vanilla HTML, CSS, JavaScript (no framework, no bundler)
- Supabase JS via CDN (`@supabase/supabase-js@2`) for auth and database
- `canvas-confetti` via CDN for project completion celebration
- Google Fonts: Playfair Display, IBM Plex Mono, Manrope

## File Structure
- `index.html` — Landing page (sticky white nav with tabs, rocket animation, track cards, FAQ accordion)
- `signup.html` — Sign up page (split layout, email + Google OAuth)
- `login.html` — Login page (split layout, email + Google OAuth)
- `dashboard.html` — Post-login track selector (My Dashboard / My Projects / My Profile tabs; Admin tab injected for admin users)
- `web-apps.html` — Web Apps track (project selector + individual project views, 8 projects)
- `my-projects.html` — Authenticated user's saved project library (add, edit, delete cards); syncs to Supabase `profiles.my_projects`
- `project-library.html` — Public showcase of projects shared with the GoLive Labs community (reads from Supabase `shared_projects` table)
- `testimonials.html` — Public testimonials page
- `pricing.html` — Public pricing page (Free vs Creator $10/mo, comparison table, FAQ)
- `privacy-policy.html` — Privacy policy
- `terms.html` — Terms & Conditions
- `admin.html` — Admin-only panel (role-gated via `profiles.role`)
- `supabase-config.js` — Supabase client (**committed to git** — anon key is public/safe; protected by RLS)

## API (Vercel Serverless Functions — `/api/*.js`)
All functions use native `fetch` with REST APIs — **zero npm dependencies**.
- `api/create-checkout.js` — Creates Stripe Checkout session (subscription mode, $10/mo)
- `api/verify-payment.js` — Verifies Stripe session payment status, returns `{ paid: true/false }`
- `api/webhook.js` — Stripe webhook handler (manual HMAC-SHA256 sig verification via Node `crypto`); handles `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
- `api/cancel-subscription.js` — Cancels all active Stripe subscriptions for a user
- `api/claude.js` — AI site audit: scrapes homepage + up to 5 sub-pages via Jina Reader (`r.jina.ai`), sends to `claude-sonnet-4-6`, returns structured JSON audit

### Webhook config (CRITICAL)
`handler.config = { api: { bodyParser: false } }` must be set **before** `module.exports = handler` — setting it after overwrites it.

### vercel.json
```json
{ "functions": { "api/*.js": { "maxDuration": 60 } } }
```

## Design System
```
--bg: #f8f6f1          (cream background)
--surface: #ffffff
--surface2: #f0ede6
--border: #e0dbd0
--royal: #1a3db5       (primary brand blue)
--royal-dark: #142e8a
--gold: #c9922a        (accent)
--text: #1a1a1a
--text-muted: #6b6660
--text-dim: #a09b94
--green: #1a7a4a
--p8: #7c3aed          (Expert/p8 purple)
```
- Headings: Playfair Display (serif, italic for accents)
- Mono labels/eyebrows: IBM Plex Mono
- Body/buttons: Manrope

## Layout Patterns
- **Landing page:** sticky white nav with tab bar (Project Library | Testimonials | Pricing) + Login/Sign Up buttons top-right; blue hero below; rocket SVG easter egg; FAQ accordion below track cards
- **Auth pages:** full-viewport split — left panel (55%, royal blue) with headline + testimonial, right panel (45%, cream) with form
- **Dashboard:** sticky nav with tabs (My Dashboard / My Projects / My Profile + Admin for admins), compact blue hero, 4-column orientation strip (expandable, shows "get unstuck" tip when open), 2-column track cards
- **Web Apps track:** two-mode page — selector view (8 project cards) and project view (individual project with accordions). Controlled by `showProject(id)` / `showSelector()` JS. URL hash routing (`#p1`–`#p8`).
- **My Projects / Project Library / Testimonials / Pricing:** sticky white nav with same public tabs, blue hero, content
- **Eyebrows:** IBM Plex Mono, 10px, uppercase, `letter-spacing: 0.18em`
- **Buttons:** pill shape (`border-radius: 50px`) for nav; rectangular (`border-radius: 6px`) for form submits

## Nav Tab Pattern
Public pages (index, project-library, testimonials, pricing) share a sticky white nav:
- Logo left
- `.page-tabs` center — tabs with `border-bottom: 2px solid transparent` / `.active` uses `var(--royal)`
- Login + Sign Up buttons right
Authenticated pages (dashboard, my-projects) use same nav structure with different tabs + Log Out button.
Admin tab (gold color) is injected into dashboard nav after role check — only visible to `role = 'admin'` users.
Mobile nav: hamburger at `max-width: 700px`, tabs hidden via `.site-nav > div { display: none !important; }` to override inline `style="display:flex"`.

## Color Usage
- Projects 1–3: `--royal` (blue)
- Projects 4–6: `--gold`
- Project 7: `--green` (Creator tier)
- Project 8: `#7c3aed` (Expert/purple)
- All `--p-color` CSS variables map to one of these per project

## Web Apps Track — Projects
```
p1: Chat, Build & Ship                        — Starter      — 1–2 hrs   — Claude Free, GitHub, Vercel
p2: Build and Deploy with Claude Code         — Beginner     — 1–3 hrs   — Claude Code, GitHub, Vercel, Terminal
p3: Add Logins, a Database & Integrations     — Intermediate — 2–5 hrs   — Claude Code, Supabase, React
p4: Admin Dashboard                           — Advanced     — 3–7 hrs   — Claude Code, Supabase
p5: Monetization — Stripe                     — Pro          — 3–7 hrs   — Claude Code, Stripe, Supabase
p6: Mobile App                                — Ninja        — 5–9 hrs   — React Native, Expo
p7: Build Your Own                            — Creator      — varies    — Claude Code, Your Stack
p8: Launch Checklist                          — Expert       — 1–3 hrs   — Claude API, Custom Domain, Vercel, Legal Pages
```
- `ORDER = ['p1','p2','p3','p4','p5','p6','p7','p8']`
- `LABELS` map each id to "Project X of 8 · Level"
- p7 selector card is centered in the 2-col grid when alone

## Pricing / Paywall
- **Free:** Projects determined by `app_settings.locked_projects` — admin-configurable
- **Creator — $10/mo:** Unlocks all projects regardless of locked_projects config
- `profiles.plan` column: `'free'` (default) or `'paid'`
- `profiles.stripe_customer_id` column: Stripe customer ID stored on subscription
- Payment flow: `startCheckout()` → `/api/create-checkout` → Stripe Checkout → `verifyAndUnlock(sessionId)` → `/api/verify-payment` → client updates Supabase `profiles.plan = 'paid'`
- Webhook also updates plan on `checkout.session.completed` and resets on `customer.subscription.deleted`
- Lock UI: dynamically applied via `applyPaywall()` / `lockProject(id)` — locks any project in `window._lockedProjects`
- `unlockAll()` removes locks on all `window._lockedProjects` when user pays
- Cancellation on My Profile page: calls `/api/cancel-subscription`, then updates plan client-side

## Project Cards (web-apps.html selector)
- Each card has a "Project Completed" checkbox injected by `initCompletionCards()` on load (iterates `ORDER`)
- Completion state syncs with the individual project view

## Individual Project View Features
- Step checkboxes with progress counters in accordion headers (localStorage: `zts_p1`–`zts_p8`)
- Copy buttons on all code blocks
- Read progress bar (fixed, top of page)
- **"Get unstuck" callout** — blue info block injected after `.skill-unlock` section on each project open via `placeUnstuckCallout(id)`. Permanent (no dismiss). Tells users to paste errors into Claude.ai or Claude Code terminal.
- **Completion section** dynamically injected by `initProjectCompletion(projectId)` — skips p8
  - "Yes, I completed this project" checkbox + inline star rating (1 Hard, 5 Easy) + comment textarea
  - Live project URL input (left-aligned)
  - "Get Certificate" checkbox — shows downloadable Canvas certificate when checked
  - "Save to my Project Library" + "Share with the GoLive Labs Project Library" checkboxes
  - Achievement badge section: Canvas PNG download (800×420) + LinkedIn post copy
  - ← Back to Projects / Next Project → nav buttons
  - Confetti fires on first completion
- Completion data stored in localStorage: `zts_completion` — `{ p1: { done, url, save, share, rating, comment, cert }, ... }`
- `syncProfileToSupabase()` called on done/share/rating changes — syncs to `profiles` table
- `syncSharedProject(projectId, isShare)` called on share toggle — upserts/deletes from `shared_projects` table

## p8 — Launch Checklist (Special Structure)
- No completion section (p8 is skipped in `initProjectCompletion`)
- Step 1 accordion: Connect a Custom Domain
- Step 2 accordion: Add a Privacy Policy & Terms
- Step 3 is NOT an accordion — always-open `<div class="audit-section-wrap">` with purple border/gradient
- AI Site Audit tool:
  - URL input → `runAudit()` → POST `/api/claude`
  - After results: input hides, action bar shows audited URL + page count badge + "↻ Refresh Score" + "✕ New URL" buttons
  - `clearAudit()` resets to input state
  - Results persist until user clicks New URL or navigates away
  - Claude API model: `claude-sonnet-4-6`
  - Jina Reader scrapes homepage (8000 chars) + up to 5 sub-pages (4000 chars each), 30k total
  - Prompt explicitly lists all discovered pages so Claude doesn't flag existing pages as missing

## My Projects Library (`my-projects.html`)
- Reads/writes `zts_my_projects` in localStorage AND syncs to Supabase `profiles.my_projects` (JSONB)
- On load: merges cloud + local (cloud wins conflicts, local-only items pushed up)
- Project object shape: `{ id, trackId, title, level, tools[], url, description, notes, share, savedAt }`
- Track projects saved via `saveToProjectLibrary(projectId, true/false)` in web-apps.html
- Manually added projects get id `'manual-' + Date.now()`
- Cards show: iframe preview thumbnail, tools, URL, notes, saved date
- Each card has an **Edit** button and a delete (✕) button
- `+ Add Project` modal — fields: Project Name, What did you build, Live URL, Tools Used, Notes, Share checkbox
- Share checkbox: on save, upserts to `shared_projects` in Supabase; on uncheck, deletes from `shared_projects`

## Project Library (`project-library.html`)
- Public page (no auth required)
- Reads from Supabase `shared_projects` table (ordered by `shared_at` desc) — **not** localStorage

## Supabase Database Tables

### `profiles`
Auto-created on signup via trigger `on_auth_user_created`.
- `id` (uuid, FK auth.users)
- `email` (text)
- `role` (text, default 'user') — set to 'admin' manually
- `last_login` (timestamptz)
- `login_count` (int, default 0)
- `plan` (text, default 'free') — `'free'` or `'paid'`
- `stripe_customer_id` (text) — set by webhook on checkout
- `projects_completed` (text[], default '{}')
- `projects_shared` (text[], default '{}')
- `project_ratings` (jsonb, default '{}')
- `is_active` (bool, default true)
- `deactivated` (bool)
- `my_projects` (jsonb, default '[]') — cross-device project library sync

### `shared_projects`
- `id` (uuid), `user_id` (uuid, FK auth.users), `project_id` (text)
- `url`, `tools` (text[]), `description`, `notes` (text), `shared_at` (timestamptz)
- Unique constraint: `(user_id, project_id)`
- RLS: public SELECT, authenticated INSERT/UPDATE/DELETE own rows, admin DELETE via `is_admin()`

### `app_settings`
- `key` (text, primary key), `value` (jsonb)
- RLS: public SELECT, admin write via `is_admin()`
- Currently stores: `locked_projects` — array of project IDs locked for free users (e.g. `["p3","p4","p5","p6","p7","p8"]`)

### RLS / Functions
- `is_admin()` Postgres function (security definer)
- `handle_new_user()` trigger — inserts profile on signup
- `handle_user_login()` trigger — updates `last_login` + increments `login_count`

## Admin Panel (`admin.html`)
- Auth guard + role check: non-admins redirected to `dashboard.html`
- **Stats row:** Total Users, Joined This Week, Projects Completed, Projects Shared
- **User table:** Email, Signup Date, Last Login, Logins, Plan, Projects Completed, Posted Project, Actions
  - Search by email + sort dropdown
  - Per-user actions: Reset Password, View Completions, Deactivate/Reactivate
- **Star Reviews by Project:** 8 cards with avg rating, star distribution, count
- **Project Library Posts:** lists all `shared_projects` with iframe thumbnail, user email, URL, description, date + Delete button (uses `is_admin()` RLS policy)
- **Paywall Configuration:** 8 checkboxes (one per project); checked = locked for free users. Saves to `app_settings.locked_projects` via upsert.

## Dashboard — Orientation Strip
- 4-column expandable strip (collapsible on mobile)
- On mobile: shows summary text collapsed, full grid when expanded
- When expanded: shows a blue "get unstuck" tip below the 4 tiles — tells users to use Claude.ai or Claude Code terminal when stuck

## Landing Page — FAQ
- Accordion section below track cards (above footer)
- 8 questions covering: experience required, time to ship, what gets built, AI tools, pricing, certificates, tech stack, getting stuck
- One item open at a time via `toggleFaq(btn)`

## Dashboard Completion Badge
- Web Apps track card shows "X / 8 completed" badge (`id="web-completion-badge"`)
- Counts `['p1','p2','p3','p4','p5','p6','p7','p8']`

## Environment & Keys
- `.env` (gitignored): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CONSOLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `ZERO2SHIPPEDKEY`
- `supabase-config.js` is committed to git — anon key is safe, protected by RLS
- `ZERO2SHIPPEDKEY` is the Anthropic API key (note: has leading space in .env — code uses `.trim()`)

## Auth (Supabase)
- `supabase-config.js` must be loaded before any inline auth scripts
- **Email/password:** `signUp` stores `full_name` in user metadata
- **Google OAuth:** `signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/dashboard.html' } })`
  - Authorized redirect URI: `https://acpzzaikuoyjyfayqxic.supabase.co/auth/v1/callback`
- Email confirmation: **disabled** in Supabase
- All protected pages use `getSessionWithRetry()` — waits up to 3s for OAuth redirect
- Supabase client uses `{ auth: { flowType: 'implicit' } }`

## Deployment
- **GitHub:** https://github.com/sethhauben-prog/FINAL-Zero-to-Shipped (public repo, main branch)
- **Vercel:** https://final-zero-to-shipped.vercel.app (auto-deploys on every `git push`)
- **Custom domain:** goliveailabs.com (A record → Vercel IP in Namecheap)
- To deploy: `git add . && git commit -m "message" && git push`
- Supabase Site URL: `https://final-zero-to-shipped.vercel.app`

## Conventions
- All CSS lives in `<style>` blocks within each HTML file — no separate stylesheet
- No external JS dependencies except Supabase CDN, canvas-confetti CDN, and Google Fonts
- Each page is fully self-contained
- Responsive breakpoint at 860px (auth pages stack); 700px for nav hamburger; 640px for track card grids
- Do not add a build system, framework, or package.json unless explicitly requested
- localStorage key prefix: `zts_` for all user progress data
- API functions use native `fetch` only — no npm packages
- Brand name: **GoLive Labs** (styled as `GoLive <em>Labs</em>` in nav logo)
