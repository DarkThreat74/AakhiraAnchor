# Waqt — Build Plan

> This is the execution plan for building Waqt incrementally. Each phase produces a
> working, deployable state. Do not start the next phase until the current one is
> verified.
>
> **Read `AGENTS.md` first** — it contains the non-negotiable rules. This plan is
> the *what and when*; AGENTS.md is the *how and why*.

---

## Technical Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 14+ App Router, TypeScript | Spec requirement. App Router for route groups, server components, `after()`. |
| Database | Neon (Postgres) | Spec requirement. Serverless Postgres, branches for dev. |
| ORM | **Drizzle** | Spec's build prompt specifies Drizzle. Lightweight, SQL-first, better edge compatibility than Prisma. |
| Auth | **Auth.js (NextAuth v5) with Drizzle adapter** | Spec allows "NextAuth with Neon". Email/password + magic link. Drizzle adapter keeps schema in our control. |
| Styling | Tailwind CSS + CSS custom properties for tokens | Spec requirement. Tokens in `globals.css` per CODEBASE_PATTERNS.md §3. |
| Hosting | Vercel | Spec requirement. Cron, Web Push, edge functions. |
| Push | Vercel Web Push (or web-push library) | Spec requirement. |
| SMS | Twilio | Spec requirement. Opt-in only. |
| Prayer times | AlAdhan API | Spec requirement. Monthly fetch + cache. |
| Payments | Stripe | Spec requirement. Plus tier only. |
| LLM | OpenRouter (Claude/GPT) | For NL event entry only. Cost-controlled (max_tokens, rate limit). |
| Package manager | **pnpm** | CODEBASE_PATTERNS.md convention. `pnpm-lock.yaml` committed. |
| Content (hadith/dhikr/lessons) | Seeded tables, human-curated | **Never AI-generated.** Empty until user seeds. |

---

## Phase 0 — Project Scaffolding

**Goal:** A Next.js project with Drizzle connected to Neon, auth wired, deployed
to Vercel as a bare shell.

### Tasks
1. `pnpm create next-app waqt` (TypeScript, Tailwind, App Router, ESLint, src/)
2. Install dependencies:
   - `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`
   - `next-auth@beta`, `@auth/drizzle-adapter`
   - `bcryptjs`, `@types/bcryptjs` (if password auth)
3. Create `src/lib/env.ts` — centralize ALL env vars (Neon URL, auth secret,
   AlAdhan base URL, Twilio creds, Stripe creds, cron secret, app URL).
   Follow CODEBASE_PATTERNS.md §28 pattern.
4. Create `src/lib/env.public.ts` — client-safe vars only (app URL, AlAdhan
   public base if needed).
5. Create `.env.example` with all required vars (no real values).
6. Create `src/lib/db/client.ts` — Drizzle client using `@neondatabase/serverless`
   with connection pooling.
7. Translate the spec's SQL schema (section 3) into Drizzle table definitions in
   `src/lib/db/schema.ts`. All 16 tables:
   - `users`, `prayer_settings`, `prayer_times_cache`, `notification_prefs`,
     `push_subscriptions`, `prayer_log`, `oath_settings`, `oath_ledger`,
     `qadaa_ledger`, `qadaa_log_entries`, `events`, `huddle_task_pool`,
     `huddle_completions`, `daily_lessons`, `daily_lesson_views`,
     `dhikr_sequences`, `talks`, `onboarding_responses`
8. Generate initial migration: `drizzle-kit generate`.
9. Set up Auth.js with Drizzle adapter — email/password + magic link (Resend or
   Nodemailer for magic link). Create `src/lib/auth/config.ts`,
   `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth/session.ts`.
10. Create route groups: `(marketing)`, `(auth)`, `(app)`.
11. Create bare shell pages:
    - `(marketing)/page.tsx` — placeholder landing
    - `(auth)/login/page.tsx`, `(auth)/signup/page.tsx`
    - `(app)/page.tsx` — protected, shows "signed in as {email}"
12. Add `export const dynamic = 'force-dynamic'` to `(app)/layout.tsx` and
    `(auth)/layout.tsx`.
13. Create `src/lib/validation.ts` (UUID, email, phone, token regexes).
14. Create `src/lib/rateLimit.ts` (secure IP extraction, in-memory fixed window).
15. Create `src/lib/cronAuth.ts` (Bearer token verification).
16. Deploy to Vercel. Set env vars in Vercel dashboard. Run migration against Neon.

### Verification
- `pnpm exec tsc --noEmit` passes
- `pnpm run build` passes
- Deployed app loads; signup → login → see protected page works
- Neon has all tables

---

## Phase 1 — Calendar Core

**Goal:** A working day view + month view with tap-to-add and side-by-side overlap
stacking. No prayer logic yet — prove the scheduling UX standalone.

### Tasks
1. **Invoke `hallmark`** before any UI work. Determine design direction for the
   calendar (warm, grounded, contemplative — not tech blue).
2. Create `src/app/(app)/calendar/day/page.tsx` — server component fetching
   today's events.
3. Create `DayViewClient.tsx` — client component:
   - Scrollable hour grid (6am–10pm default, configurable).
   - Tapping an empty slot opens a bottom sheet (title + time, default 1hr block).
   - Tapping an existing event opens it for editing.
   - **Overlap handling:** when events overlap in time, render side-by-side
     (split column width evenly). No blocking, no warning modal. This is a
     deliberate product decision.
4. Create `src/app/(app)/calendar/month/page.tsx` — month view summarizing days,
   linking into day view.
5. Create API routes:
   - `POST /api/events` — create event
   - `GET /api/events?date=YYYY-MM-DD` — list events for a day
   - `PATCH /api/events/[id]` — update event
   - `DELETE /api/events/[id]` — delete event
6. All event routes: verify session, scope by `user_id`, validate input, rate
   limit (20/min per IP).
7. Design tokens in `globals.css` — warm palette, no pure black/white, named tokens.

### Verification
- Can create, edit, delete events via UI
- Overlapping events render side-by-side correctly
- Month view links to day view
- Mobile-responsive at 320/375/414/768px
- `tsc --noEmit` + `eslint --max-warnings=0` pass

---

## Phase 2 — Prayer Times

**Goal:** AlAdhan integration with monthly cache, prayer window overlay band on
day view.

### Tasks
1. Create `src/lib/aladhan.ts` — API client:
   - `fetchMonth(latitude, longitude, month, year, method)` → returns 30ish days
     of prayer times.
   - Method ID 2 (ISNA) default, configurable.
2. Create `POST /api/prayer-times/sync` — fetch + cache current month into
   `prayer_times_cache`. Triggered on location save + monthly cron.
3. Create `GET /api/prayer-times?date=YYYY-MM-DD` — read from cache.
4. Location capture UI: geolocation API → reverse geocode → save to
   `prayer_settings` (lat, lng, timezone) → trigger sync.
5. Prayer settings page: calculation method, madhab selector.
6. **Day view overlay:** render each prayer's window as a translucent background
   band (left border accent, subtle fill). Visually distinct from event cards
   (which sit on top with full opacity). The band reads as "context," never
   competes with scheduled events.
7. Cron route `POST /api/cron/prayer-times-sync` — monthly, re-fetches for all
   users. Verify `CRON_SECRET`.

### Verification
- Location capture saves to `prayer_settings` and triggers cache
- Day view shows prayer window bands behind events
- Cache hit on subsequent loads (no repeated API calls)
- `tsc --noEmit` + eslint pass

---

## Phase 3 — PWA Shell

**Goal:** Installable PWA with offline caching and Web Push subscription.

### Tasks
1. `public/manifest.webmanifest` — name, short_name, icons, theme colors,
   standalone display, start_url.
2. Service worker (`public/sw.js` or via `next-pwa` / `serwist`):
   - Cache current week's events + prayer times for offline viewing.
   - Register for Web Push.
3. Install prompt UI ("Add to Home Screen").
4. Web Push subscription flow:
   - `POST /api/notifications/subscribe` — save push subscription
     (endpoint, p256dh, auth) to `push_subscriptions`.
   - `POST /api/notifications/unsubscribe` — remove subscription.
5. VAPID key generation + env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`).
6. Test install-to-homescreen on Android Chrome + iOS Safari.

### Verification
- App installs on mobile
- Offline: can view cached week's events + prayer times
- Push subscription saves to DB
- `tsc --noEmit` + eslint pass

---

## Phase 4 — Prayer Check-In State Machine

**Goal:** Cron-driven scheduler fires check-ins per the exact state machine logic.
This is the core of the app — test thoroughly with fake windows first.

### Tasks
1. Create `src/lib/prayer/thresholds.ts` — configurable constants:
   - `EARLY_THRESHOLD = 0.0` (window opens)
   - `MID_THRESHOLD = 0.5` (50% elapsed)
   - `CLOSING_THRESHOLD_MINUTES = 20` (20 min before window ends)
2. Create `src/lib/prayer/stateMachine.ts` — the state machine:
   - `getCheckinStage(prayer, now, cachedTimes)` → returns which stage is due
     (early/mid/closing/none) based on window elapsed percentage.
   - `advanceStage(prayerLog, stage)` → updates `checkin_stage`, prevents
     re-firing the same stage.
   - `assumePrayedIfWindowClosed(prayerLog, now)` → sets `assumed_prayed` at
     window close, silently, no ledger charge.
3. Create `POST /api/prayer-log/checkin` — record a check-in response:
   - Handles all state machine transitions (Yes/No → follow-up, Yes → prayed).
   - "I will pray right now" → sends urgent push/SMS, stops further check-ins.
   - Writes to `prayer_log`, advances `checkin_stage`.
4. Create `GET /api/prayer-log/[date]` — get a day's prayer log.
5. Create `POST /api/cron/checkin-scheduler` — runs every 5 min:
   - Verify `CRON_SECRET`.
   - For each user: check cached prayer times against current time in their
     timezone. Fire due check-ins per state machine.
   - Respect `notification_prefs` (push vs push_sms vs sms).
   - Idempotent: check `checkin_stage` before firing.
   - At window close: set `assumed_prayed` silently.
6. Push notification dispatch: `src/lib/notifications/push.ts`.
7. Return-after-absence: `src/lib/prayer/absence.ts`:
   - Detect 7+ consecutive days of unmarked prayers.
   - On next app open: show ONE batch catch-up screen.
   - User chooses: add estimate to qadaa OR mark as unknown.
   - Never assume. Never flood with backdated reminders.
8. Create `POST /api/qadaa/catchup` — resolve the batch catch-up screen.
9. **Testing harness:** create a dev-only route or script that fast-forwards
   fake prayer windows (e.g., 1-minute windows) to test all state transitions
   before trusting real prayer times.

### Verification
- State machine transitions correctly for all 5 prayers
- Same stage never fires twice (idempotency)
- `assumed_prayed` set silently at window close, no ledger charge
- "I will pray right now" sends urgent notification, stops further check-ins
- Return-after-absence shows ONE batch screen, not a flood
- Fast-forwarded test windows pass all transitions
- `tsc --noEmit` + eslint pass

---

## Phase 5 — Onboarding

**Goal:** Full mandatory, non-skippable onboarding flow.

### Tasks
1. **Invoke `hallmark`** for onboarding UI design.
2. Create `src/app/(app)/onboarding/page.tsx` — multi-step wizard.
3. Gate: if `users.onboarding_completed = false`, redirect all `(app)` routes to
   `/onboarding`. Cannot skip.
4. Step 1 — Location capture (reuse Phase 2 logic) → save `prayer_settings` →
   trigger AlAdhan cache.
5. Step 2 — Virtue/framing screen: **PLACEHOLDER text block**, clearly marked.
   Do NOT generate hadith text. Add comment: `// TODO: User must fill with vetted content`.
6. Step 3 — Religiosity quiz (~10 questions):
   - Self-rating sliders (1-5): religiosity, prayer frequency, Quran reading.
   - Timed factual recall (10-second limit): "Name the five pillars of Islam,"
     etc. From a small seeded question bank — **placeholder content**.
   - Save to `onboarding_responses`.
7. Step 4 — Oath amount slider:
   - `src/lib/onboarding/oathRange.ts` — compute min/max from quiz score
     (higher self-rated religiosity → higher floor). **Draft formula, flag for
     user review** (open decision #6).
   - User picks exact value within range. Save to `oath_settings`.
8. Step 5 — Qadaa estimator:
   - `src/lib/onboarding/qadaaEstimate.ts` — years × 365 × 5, adjustable down.
   - Save as `onboarding_estimate` in `qadaa_ledger`. Number only decreases
     (via logged qadaa) unless new current-day misses occur.
9. Step 6 — Notification setup:
   - Three toggles: early/mid (`push`/`push_sms`/`sms`), final
     (`push`/`push_sms`/`sms`), other (locked to `push` only).
   - If any SMS option selected: require phone number entry + Twilio verification
     code before saving.
   - Save to `notification_prefs`.
10. On completion: set `users.onboarding_completed = true`, redirect to calendar.
11. State-driven step navigation (resume where left off, per CODEBASE_PATTERNS.md
    §24.1 pattern).

### Verification
- Cannot skip onboarding (redirect enforced)
- Can resume mid-flow after closing browser
- Location capture triggers prayer times cache
- Oath slider range reflects quiz score
- Qadaa estimate saves correctly
- SMS opt-in requires phone verification
- `tsc --noEmit` + eslint pass

---

## Phase 6 — Oath + Qadaa Ledger UI

**Goal:** Dedicated Accountability page (one deliberate tap to reach, not on home).

### Tasks
1. Create `src/app/(app)/accountability/page.tsx`:
   - **NOT linked from home/dashboard header.** Requires one deliberate tap.
   - This is not a shame display — it's a private accountability tool.
2. Oath ledger section:
   - Show: total owed, total logged as donated, running balance.
   - "Log a donation" button — decrements owed-vs-donated gap on trust.
   - **No payment processing, ever.** The app is a witness, not a collector.
3. Qadaa backlog section:
   - Show current backlog number.
   - "Log qadaa prayed" input — capped at 20 per submission.
   - **Server-side daily rate limit** (not just client-side) to prevent
     one-tap erasure of the whole backlog.
4. API routes:
   - `POST /api/oath/log-donation` — mark a ledger entry as donated.
   - `POST /api/qadaa/log` — log qadaa prayers (capped, rate-limited server-side).
5. Rate limit qadaa logging: e.g., 5 submissions per day per user (server-enforced).

### Verification
- Accountability page is not prominent on home
- Oath ledger shows correct balance
- Qadaa logging capped at 20/submission, rate-limited daily
- No payment processing anywhere in oath flow
- `tsc --noEmit` + eslint pass

---

## Phase 7 — SMS Integration

**Goal:** Twilio wired into the check-in scheduler, respecting three-tier prefs.

### Tasks
1. Create `src/lib/twilio.ts` — Twilio client (cached singleton).
2. Create `src/lib/notifications/channels.ts` — resolve which channel(s) to use
   per user per notification type (early/mid, final, other).
3. Create `src/lib/notifications/sms.ts` — send SMS, rate-limited per user
   (20/hr, 100/day per user — keyed by user ID, not IP).
4. Wire SMS into `checkin-scheduler` cron: only send SMS where
   `notification_prefs` is `push_sms` or `sms` for the relevant tier.
5. Phone verification flow:
   - `POST /api/notifications/verify-phone` — send Twilio verification code.
   - `POST /api/notifications/verify-code` — confirm code, mark
     `users.phone_verified = true`.
   - Phone verification is a prerequisite before any SMS setting can be activated.
6. `POST /api/notifications/prefs` — get/update channel settings.
7. Twilio webhook signature verification (`src/lib/twilioVerify.ts`) if handling
   inbound SMS (optional for MVP).

### Verification
- SMS only sends when user opted in for that tier
- Phone verification required before SMS activation
- SMS rate-limited per user (20/hr, 100/day)
- "Other reminders" never sends SMS (locked to push)
- `tsc --noEmit` + eslint pass

---

## Phase 8 — Huddle, Lesson, Dhikr, Talks

**Goal:** Content-bank-driven features. All read from seeded tables, never generate.

### Tasks
1. **Daily Huddle:**
   - `GET /api/huddle/today` — draw 5 tasks from `huddle_task_pool`.
   - Free tier: draw only from `is_default_free = true` rows (8-10 rows seeded).
   - Plus tier: draw from full pool (~30 rows seeded by user).
   - `POST /api/huddle/complete` — mark a task done for today.
   - UI: daily checklist of 5 tasks.
2. **Daily Lesson:**
   - `GET /api/lessons/today` — fetch one row from `daily_lessons` per user per
     day. Cycle through, avoid repeats until bank exhausted.
   - Display once, no completion pressure, no streak tracking.
   - **Empty state if table unseeded** — graceful, not broken.
3. **Dhikr Counter:**
   - Large tap-target counter UI with progress ring.
   - Driven by `dhikr_sequences` (phrase, transliteration, target count, order).
   - Auto-advances to next phrase when target count hit.
   - **Triggered automatically after marking a prayer as prayed.**
   - Empty state if table unseeded.
4. **Talks Library:**
   - Simple categorized list of external links/embeds from `talks` table.
   - **No audio file storage/hosting.** Curation + linking only.
   - Admin view or insert script for user to add talks manually.

### Verification
- Huddle draws correct pool based on tier
- Lesson cycles without repeats until exhausted
- Dhikr counter advances correctly, triggers after prayer check-in
- Talks library shows external links only
- All features show graceful empty states when tables unseeded
- `tsc --noEmit` + eslint pass

---

## Phase 9 — Voice/AI Event Entry

**Goal:** Mic button → Web Speech API → LLM parse → confirm-before-save.

### Tasks
1. Mic button using Web Speech API for speech-to-text capture.
2. `POST /api/events/parse`:
   - Send transcribed text + user's existing events for that day as context.
   - LLM (OpenRouter, Claude or GPT) with system prompt: return ONLY structured
     JSON `{title, start, end, type}`.
   - If start/end ambiguous: LLM flags as `ambiguous: true` — UI surfaces
     confirm/edit step. **Never auto-commit an ambiguous parse.**
   - Cap `max_tokens` (e.g., 400). Rate limit: 15/60s per IP.
3. Confirm-before-save UI: show parsed event, let user edit before committing.
4. Save with `created_via = 'voice_ai'`.

### Verification
- Voice capture works (Web Speech API)
- LLM returns structured JSON
- Ambiguous parses surface confirm step, never auto-commit
- Rate-limited, token-capped
- `tsc --noEmit` + eslint pass

---

## Phase 10 — Subscription Gate

**Goal:** Stripe Plus tier. Gate depth/convenience, never prayer features.

### Tasks
1. Create `src/lib/stripe.ts` — Stripe client (cached singleton).
2. `POST /api/webhooks/stripe` — webhook handler:
   - Verify signature (300s tolerance).
   - Handle: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`.
   - Update `users.subscription_tier`.
   - Idempotent (check `stripe_event_id` before processing).
   - Use `after()` for post-response work.
3. Checkout flow: `POST /api/stripe/checkout` → redirect to Stripe.
4. `src/lib/subscription.ts` — tier check helpers:
   - `isPlus(user)`, `getHuddlePoolSize(user)`, `getSmsAllowance(user)`.
5. **Gating (Plus only):**
   - Huddle full pool size (free = 8-10 tasks, Plus = ~30 tasks)
   - SMS beyond a small free monthly allowance (define cap — **open decision #7**)
   - AI tone personalization variety
   - Streak history / analytics depth
6. **Never gate (free forever):**
   - Prayer check-ins
   - Oath ledger
   - Qadaa ledger
   - Core calendar
   - Anything that makes it easier to ignore a missed prayer

### Verification
- Stripe checkout creates subscription, webhook updates tier
- Webhook idempotent (duplicate events don't double-process)
- Huddle pool size changes with tier
- Prayer features work on free tier
- `tsc --noEmit` + eslint pass

---

## Phase 11 — Polish + PWA Store Packaging (LAST)

**Goal:** Store-ready packages. Only after real usage validates the web version.

### Tasks
1. PWABuilder → Android App Bundle (.aab) via Trusted Web Activity for Google Play.
2. Capacitor → wrap PWA into native iOS shell (.ipa) for Apple App Store.
3. Ensure genuine native navigation feel per Apple's review guidelines.
4. Final design polish pass (invoke `hallmark audit`).
5. Final security audit (apply AGENTS.md §5 checklist across all routes).

### Verification
- Android .aab builds and installs
- iOS .ipa builds and installs
- Apple review guidelines satisfied (not a bare webview wrapper)
- `hallmark audit` score ≥ 4 on all dimensions
- Security audit: no critical/high findings

---

## Open Decisions Requiring User Input (Before Relevant Phase)

| # | Decision | Needed by phase | Status |
|---|----------|----------------|--------|
| 1 | App name confirmation ("Waqt" — domain + trademark) | Phase 0 | **ASK NOW** |
| 2 | Auth approach: email/password vs magic link vs both | Phase 0 | **ASK NOW** |
| 3 | Exact hadith/virtue text for onboarding | Phase 5 | Can defer (placeholder OK) |
| 4 | Exact dhikr sequences | Phase 8 | Can defer (empty state OK) |
| 5 | Daily lesson content bank | Phase 8 | Can defer (empty state OK) |
| 6 | Oath scoring formula (quiz → slider range) | Phase 5 | Draft, user reviews |
| 7 | Subscription price + SMS free-tier cap | Phase 10 | **ASK before Phase 10** |
| 8 | Talks library curated list | Phase 8 | Can defer (empty state OK) |

---

## Design Direction (To Confirm with Hallmark)

Waqt is a prayer-centered app. The design should feel:
- **Warm and grounded** — not cold tech blue. Think pre-dawn light, prayer rug
  textiles, ink on paper.
- **Contemplative, not gamified** — no streak shame, no aggressive notifications
  visual language. Accountability is private, not performative.
- **Calm density** — the calendar is data-heavy but should not feel cluttered.
  Prayer bands are context, not noise.
- **Mobile-first** — this is a PWA used on phones, primarily at prayer times.

Suggested palette direction (to be refined with Hallmark):
- Background: warm off-white (not pure #fff)
- Ink: warm near-black (not pure #000)
- Accent: a single grounded hue (deep teal? warm indigo? olive?) — to be determined
- Prayer band: translucent accent at ~10% opacity
- Surface: slightly warmer than background

**Invoke `hallmark` at the start of each UI phase to enforce anti-slop rules and
determine the specific design system.**
