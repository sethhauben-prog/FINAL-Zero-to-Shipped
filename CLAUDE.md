# Zero to Shipped — Project Instructions

## Project
A plain HTML/CSS/JS learning platform with no build step or framework. Open files directly in a browser or serve with `python3 -m http.server 3000` from the project root.

## Stack
- Vanilla HTML, CSS, JavaScript (no framework, no bundler)
- Supabase JS via CDN (`@supabase/supabase-js@2`) for auth and database
- `canvas-confetti` via CDN for project completion celebration
- Google Fonts: Playfair Display, IBM Plex Mono, Manrope

## File Structure
- `index.html` — Landing page (sticky white nav with tabs, rocket animation, track cards)
- `signup.html` — Sign up page (split layout, email + Google OAuth)
- `login.html` — Login page (split layout, email + Google OAuth)
- `dashboard.html` — Post-login track selector (My Dashboard / My Projects / My Profile tabs; Admin tab injected for admin users)
- `web-apps.html` — Web Apps track (project selector + individual project views, 7 projects)
- `my-projects.html` — Authenticated user's saved project library (add, edit, delete cards)
- `project-library.html` — Public showcase of projects shared with the Zero to Shipped community (reads from Supabase `shared_projects` table)
- `testimonials.html` — Public testimonials page
- `admin.html` — Admin-only panel (role-gated via `profiles.role`)
- `supabase-config.js` — Supabase client (**committed to git** — anon key is public/safe; protected by RLS)

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
```
- Headings: Playfair Display (serif, italic for accents)
- Mono labels/eyebrows: IBM Plex Mono
- Body/buttons: Manrope

## Layout Patterns
- **Landing page:** sticky white nav with tab bar (Project Library | Testimonials) + Login/Sign Up buttons top-right; blue hero below; rocket SVG easter egg
- **Auth pages:** full-viewport split — left panel (55%, royal blue) with headline + testimonial, right panel (45%, cream) with form
- **Dashboard:** sticky nav with tabs (My Dashboard / My Projects / My Profile + Admin for admins), compact blue hero, 4-column orientation strip with dividers, 2-column track cards
- **Web Apps track:** two-mode page — selector view (7 project cards in 2-column grid, p7 centered when alone) and project view (individual project with accordions). Controlled by `showProject(id)` / `showSelector()` JS. URL hash routing (`#p1`–`#p7`).
- **My Projects / Project Library / Testimonials:** sticky white nav with same public tabs, blue hero, card grid
- **Eyebrows:** IBM Plex Mono, 10px, uppercase, `letter-spacing: 0.18em`
- **Buttons:** pill shape (`border-radius: 50px`) for nav; rectangular (`border-radius: 6px`) for form submits

## Nav Tab Pattern
Public pages (index, project-library, testimonials) share a sticky white nav:
- Logo left
- `.page-tabs` center — tabs with `border-bottom: 2px solid transparent` / `.active` uses `var(--royal)`
- Login + Sign Up buttons right
Authenticated pages (dashboard, my-projects) use same nav structure with different tabs + Log Out button.
Admin tab (gold color) is injected into dashboard nav after role check — only visible to `role = 'admin'` users.

## Color Usage
- Projects 1–3: `--royal` (blue)
- Projects 4–6: `--gold`
- Project 7: `--green` (Creator tier)
- All `--p-color` CSS variables map to one of these three per project

## Web Apps Track — Projects
```
p1: Your First Dashboard      — Starter      — Claude Free, GitHub, Vercel
p2: Dashboard with Claude Code — Beginner    — Claude Code, GitHub, Vercel, Terminal
p3: Dashboard Creator App     — Intermediate — Claude Code, Supabase, React
p4: Admin Dashboard           — Advanced     — Claude Code, Supabase
p5: Monetization — Stripe     — Pro          — Claude Code, Stripe, Supabase
p6: Mobile App                — Ninja        — React Native, Expo
p7: Build Your Own            — Creator      — Claude Code, Your Stack
```
- `ORDER = ['p1','p2','p3','p4','p5','p6','p7']`
- `LABELS` map each id to "Project X of 7 · Level"
- p7 selector card is centered in the 2-col grid when alone (CSS: `grid-column: 1 / -1; max-width: calc(50% - 10px); margin: 0 auto`)

## Project Cards (web-apps.html selector)
- Each card has a "Project Completed" checkbox injected by `initCompletionCards()` on load (iterates `ORDER`)
- Completion state syncs with the individual project view

## Individual Project View Features
- Step checkboxes with progress counters in accordion headers (localStorage: `zts_p1`–`zts_p7`)
- Copy buttons on all code blocks
- Read progress bar (fixed, top of page)
- **Completion section** at the bottom of each project:
  - "Yes, I completed this project" checkbox + inline star rating (1 Hard, 5 Easy) — "How easy were the steps to follow?"
  - Live project URL input
  - "Save to my Project Library" + "Share with the Zero to Shipped Project Library" checkboxes (two-column row)
  - ← Back to Projects / Next Project → nav buttons
  - Confetti fires on first completion (localStorage: `zts_confetti_p1`–`zts_confetti_p7`)
- Completion data stored in localStorage: `zts_completion` — `{ p1: { done, url, save, share, rating }, ... }`
- `syncProfileToSupabase()` called on done/share/rating changes — syncs to `profiles` table
- `syncSharedProject(projectId, isShare)` called on share toggle — upserts/deletes from `shared_projects` table

## My Projects Library (`my-projects.html`)
- Reads/writes `zts_my_projects` in localStorage — array of project objects
- Project object shape: `{ id, trackId, title, level, tools[], url, description, notes, share, savedAt }`
- Track projects saved via `saveToProjectLibrary(projectId, true/false)` in web-apps.html
- Manually added projects get id `'manual-' + Date.now()`
- Cards show: iframe preview thumbnail (1280×800 scaled to 0.28), tools, URL, notes, saved date — no title or level badge
- Each card has an **Edit** button (royal blue, IBM Plex Mono) and a delete (✕) button
- `+ Add Project` modal — fields: Project Name, What did you build, Live URL, Tools Used, Notes, Share checkbox
- Edit reuses the same modal pre-populated with existing data; modal title/save button text update accordingly
- Share checkbox in modal: on save, upserts to `shared_projects` in Supabase; on uncheck, deletes from `shared_projects`
- `updateLibraryShareFlag(projectId, isShare)` syncs the `share` flag in localStorage

## Project Library (`project-library.html`)
- Public page (no auth required)
- Reads from Supabase `shared_projects` table (ordered by `shared_at` desc) — **not** localStorage
- Loads Supabase CDN + `supabase-config.js`
- Shows cards for all rows where `url` is present
- Same card layout as my-projects.html but without edit/delete buttons

## Supabase Database Tables

### `profiles`
Auto-created on signup via trigger `on_auth_user_created`.
- `id` (uuid, FK auth.users)
- `role` (text, default 'user') — set to 'admin' manually for admin users
- `last_login` (timestamptz) — updated by trigger `on_auth_user_login`
- `login_count` (int)
- `plan` (text, default 'free')
- `projects_completed` (text[])
- `projects_shared` (text[])
- `project_ratings` (jsonb)
- `is_active` (bool, default true)

### `shared_projects`
Stores projects users share with the public library.
- `id` (uuid)
- `user_id` (uuid, FK auth.users)
- `project_id` (text) — e.g. 'p1', 'manual-1234'
- `url`, `tools` (text[]), `description`, `notes` (text)
- `shared_at` (timestamptz)
- Unique constraint: `(user_id, project_id)`
- RLS: public SELECT, authenticated INSERT/UPDATE/DELETE own rows

### RLS / Functions
- `is_admin()` Postgres function (security definer) — returns true if current user's `profiles.role = 'admin'`
- Admin panel uses anon key but RLS on `profiles` allows admins to see all rows via `is_admin()`

## Admin Panel (`admin.html`)
- Auth guard + role check: non-admins redirected to `dashboard.html`
- Stats row: Total Users, Joined This Week, Projects Completed, Projects Shared
- User table: Email, Signup Date, Last Login, Logins, Plan, Projects Completed (colored pills), Posted Project, Actions
- Search by email (live filter) + sort dropdown (signup date / last login / login count asc/desc)
- Per-user actions: Reset Password (sends email), View Completions (modal), Deactivate/Reactivate
- Star Reviews by Project section: 7 cards with avg rating, distribution bars, review count

## Dashboard Completion Badge
- Web Apps track card shows "X / 7 completed" badge (`id="web-completion-badge"`)
- Reads `zts_completion` from localStorage on page load (plain IIFE, not inside async auth guard)
- Counts `['p1','p2','p3','p4','p5','p6','p7']`

## Environment & Keys
- `.env` holds keys as source of truth (gitignored): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CONSOLE_CLIENT_SECRET`
- `supabase-config.js` is committed to git — anon key is a public client-side key, safe to expose, protected by RLS
- Plain HTML can't auto-read `.env`, so `supabase-config.js` is the runtime config file

## Auth (Supabase)
- `supabase-config.js` must be loaded before any inline auth scripts
- **Email/password:** `signUp` stores `full_name` in user metadata; on success redirects to `dashboard.html`
- **Google OAuth:** `signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/dashboard.html' } })`
  - Google Cloud Console app name: "Zero to Shipped" (Branding page)
  - Authorized redirect URI in Google Console: `https://acpzzaikuoyjyfayqxic.supabase.co/auth/v1/callback`
  - Supabase: Authentication → Providers → Google — Client ID + Secret configured
  - Publishing status: Production (Audience page in Google Console)
- Email confirmation: **disabled** in Supabase (Authentication → Sign In / Providers → Confirm email off)
- All protected pages check session on load and redirect to `login.html` if none
- Both login.html and signup.html have "Continue with Google" button (Google SVG logo, white background)

## Deployment
- **GitHub:** https://github.com/sethhauben-prog/FINAL-Zero-to-Shipped (public repo, main branch)
- **Vercel:** https://final-zero-to-shipped.vercel.app (auto-deploys on every `git push`)
- To deploy changes: `git add . && git commit -m "message" && git push`
- Supabase Site URL: `https://final-zero-to-shipped.vercel.app`

## Conventions
- All CSS lives in `<style>` blocks within each HTML file — no separate stylesheet
- No external JS dependencies except Supabase CDN, canvas-confetti CDN, and Google Fonts
- Each page is fully self-contained
- Responsive breakpoint at 860px (auth pages stack to single column); 640px for track card grids
- Do not add a build system, framework, or package.json unless explicitly requested
- localStorage key prefix: `zts_` for all user progress data
