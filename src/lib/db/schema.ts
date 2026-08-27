/**
 * Drizzle schema — single source of truth for the database.
 * Translated from the Waqt spec section 3 (Database Schema).
 *
 * See CODEBASE_PATTERNS.md §8 (Schema Discipline):
 * - Single-file schema, idempotent migrations
 * - TS types match DB schema exactly
 * - After schema changes, run `pnpm drizzle-kit generate` and tell the user
 *   to run the migration against their Neon database.
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  time,
  date,
  integer,
  numeric,
  jsonb,
  primaryKey,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ─── Enums ───

export const subscriptionTier = pgEnum('subscription_tier', ['free', 'plus']);

export const prayerName = pgEnum('prayer_name', [
  'fajr',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
]);

export const prayerStatus = pgEnum('prayer_status', [
  'pending',
  'prayed',
  'missed',
  'assumed_prayed',
]);

export const oathStatus = pgEnum('oath_status', ['owed', 'donated']);

export const eventType = pgEnum('event_type', ['block', 'task', 'reminder']);

export const eventCreatedVia = pgEnum('event_created_via', ['manual', 'voice_ai']);

export const userRole = pgEnum('user_role', ['user', 'admin']);

// ─── Users ───

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  // Display name — collected during onboarding, used in public calendar URL and header
  displayName: text('display_name'),
  // First name — used in prayer friends dashboard
  firstName: text('first_name'),
  phone: text('phone'),
  phoneVerified: boolean('phone_verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  subscriptionTier: subscriptionTier('subscription_tier').default('free').notNull(),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  role: userRole('role').default('user').notNull(),
  // Public calendar share token — null = sharing disabled, non-null = public read-only calendar at /user/[name]/[token]
  publicShareToken: text('public_share_token').unique(),
  // 6-character prayer share code — share with friends to let them see your prayer streaks
  prayerCode: text('prayer_code').unique(),
});

// ─── Prayer Friends (share streak access via code) ───

export const prayerFriends = pgTable(
  'prayer_friends',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // The user who added the friend
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    // The friend being added
    friendId: uuid('friend_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('prayer_friends_user_friend_idx').on(table.userId, table.friendId),
  ],
);

// ─── Prayer Settings (per-user location + calculation) ───

export const prayerSettings = pgTable('prayer_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  latitude: numeric('latitude', { precision: 9, scale: 6 }).notNull(),
  longitude: numeric('longitude', { precision: 9, scale: 6 }).notNull(),
  timezone: text('timezone').notNull(),
  // AlAdhan method ID, 2 = ISNA
  calculationMethod: integer('calculation_method').default(2).notNull(),
  // 'standard' or 'hanafi' — affects Asr calculation
  madhab: text('madhab').default('standard'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Prayer Times Cache (monthly, per user) ───

export const prayerTimesCache = pgTable(
  'prayer_times_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    fajr: time('fajr').notNull(),
    sunrise: time('sunrise').notNull(),
    dhuhr: time('dhuhr').notNull(),
    asr: time('asr').notNull(),
    maghrib: time('maghrib').notNull(),
    isha: time('isha').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('prayer_times_cache_user_date_idx').on(table.userId, table.date),
  ],
);

// ─── Notification Preferences ───

export const notificationPrefs = pgTable('notification_prefs', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  // 'push' | 'push_sms' | 'sms'
  prayerEarlyMid: text('prayer_early_mid').default('push').notNull(),
  prayerFinal: text('prayer_final').default('push').notNull(),
  // Locked to 'push' only — no SMS option for other reminders
  otherReminders: text('other_reminders').default('push').notNull(),
});

// ─── Web Push Subscriptions ───

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Prayer Log (one row per user per prayer per day) ───

export const prayerLog = pgTable(
  'prayer_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    prayerName: prayerName('prayer_name').notNull(),
    wentToMasjid: boolean('went_to_masjid'),
    status: prayerStatus('status').default('pending').notNull(),
    markedAt: timestamp('marked_at', { withTimezone: true }),
    lastCheckinAt: timestamp('last_checkin_at', { withTimezone: true }),
    // 0=none, 1=early, 2=mid, 3=closing
    checkinStage: integer('checkin_stage').default(0).notNull(),
  },
  (table) => [
    uniqueIndex('prayer_log_user_date_prayer_idx').on(
      table.userId,
      table.date,
      table.prayerName,
    ),
  ],
);

// ─── Sunnah Log (tracks sunnah/nafl prayers associated with fard prayers) ───

export const sunnahLog = pgTable(
  'sunnah_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    // e.g. "fajr_before", "dhuhr_before", "dhuhr_after", "witr"
    sunnahKey: text('sunnah_key').notNull(),
    // The fard prayer this sunnah is associated with (for ordering checks)
    associatedFard: prayerName('associated_fard').notNull(),
    prayed: boolean('prayed').default(false).notNull(),
    loggedAt: timestamp('logged_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('sunnah_log_user_date_key_idx').on(
      table.userId,
      table.date,
      table.sunnahKey,
    ),
  ],
);

// ─── Oath Settings ───

export const oathSettings = pgTable('oath_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  amountPerMissed: numeric('amount_per_missed', { precision: 6, scale: 2 }).notNull(),
  minSlider: numeric('min_slider', { precision: 6, scale: 2 }).default('1.00').notNull(),
  maxSlider: numeric('max_slider', { precision: 6, scale: 2 }).default('10.00').notNull(),
  setAt: timestamp('set_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Oath Ledger ───

export const oathLedger = pgTable('oath_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  prayerLogId: uuid('prayer_log_id').references(() => prayerLog.id),
  amount: numeric('amount', { precision: 6, scale: 2 }).notNull(),
  status: oathStatus('status').default('owed').notNull(),
  loggedDonatedAt: timestamp('logged_donated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Qadaa Ledger ───

export const qadaaLedger = pgTable('qadaa_ledger', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Per-salah qadaa counts — each tracks how many of that specific prayer are owed
  fajrOwed: integer('fajr_owed').default(0).notNull(),
  dhuhrOwed: integer('dhuhr_owed').default(0).notNull(),
  asrOwed: integer('asr_owed').default(0).notNull(),
  maghribOwed: integer('maghrib_owed').default(0).notNull(),
  ishaOwed: integer('isha_owed').default(0).notNull(),
  // Whether the initial setup has been completed
  setupCompleted: boolean('setup_completed').default(false).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const qadaaLogEntries = pgTable('qadaa_log_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  // Which prayer was logged as qadaa
  prayerName: text('prayer_name').notNull(),
  // Capped at 1-20 per submission
  amountLogged: integer('amount_logged').notNull(),
  loggedAt: timestamp('logged_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Calendar Events ───

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  type: eventType('type').default('block').notNull(),
  // Custom color (hex string like "#c2410c"). Null = use type-based default color.
  color: text('color'),
  // Whether to send a push notification 15 min before this event.
  // Defaults to true. User can disable per-event in the create/edit form.
  notify: boolean('notify').default(true).notNull(),
  // iCal RRULE string, null = one-off
  recurrenceRule: text('recurrence_rule'),
  createdVia: eventCreatedVia('created_via').default('manual').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  // When a push notification was sent for this event (null = not notified yet)
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
});

// ─── Daily Huddle ───

export const huddleTaskPool = pgTable('huddle_task_pool', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  category: text('category'),
  // true = included in free tier's smaller pool
  isDefaultFree: boolean('is_default_free').default(false).notNull(),
});

export const huddleCompletions = pgTable(
  'huddle_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => huddleTaskPool.id),
    date: date('date').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('huddle_completions_user_task_date_idx').on(
      table.userId,
      table.taskId,
      table.date,
    ),
  ],
);

// ─── Daily Lessons (curated content, NOT AI-generated) ───

export const dailyLessons = pgTable('daily_lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  // Must reference a vetted source
  sourceCitation: text('source_citation').notNull(),
  category: text('category'),
});

export const dailyLessonViews = pgTable(
  'daily_lesson_views',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id').references(() => dailyLessons.id),
    date: date('date').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date] })],
);

// ─── Dhikr Sequences (curated content, NOT AI-generated) ───

export const dhikrSequences = pgTable('dhikr_sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  phraseArabic: text('phrase_arabic').notNull(),
  phraseTransliteration: text('phrase_transliteration').notNull(),
  targetCount: integer('target_count').notNull(),
  sequenceOrder: integer('sequence_order').notNull(),
  sourceCitation: text('source_citation').notNull(),
});

// ─── Talks Library (external links only, never self-hosted) ───

export const talks = pgTable('talks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  speaker: text('speaker'),
  category: text('category'),
  externalUrl: text('external_url').notNull(),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Onboarding Responses ───

export const onboardingResponses = pgTable('onboarding_responses', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  // 1-5
  religiositySelfRating: integer('religiosity_self_rating'),
  // 1-5
  prayerFrequency: integer('prayer_frequency'),
  // 1-5
  quranReadingFrequency: integer('quran_reading_frequency'),
  yearsMissedEstimate: integer('years_missed_estimate'),
  responsesJson: jsonb('responses_json'),
  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Trusted Devices (FingerprintJS) ───

export const trustedDevices = pgTable('trusted_devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // SHA-256 hash of the FingerprintJS visitorId — never store raw fingerprint
  fingerprintHash: text('fingerprint_hash').notNull(),
  // Optional label for the user to identify the device (e.g. "iPhone 15")
  label: text('label'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  // One device per user — prevents duplicate entries
  userDeviceIdx: uniqueIndex('trusted_devices_user_hash_idx').on(t.userId, t.fingerprintHash),
}));

// ─── Goals (hierarchical goal tracking with tree/list views) ───

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Self-referencing FK — the cascade delete is handled in the migration SQL
  // because Drizzle's type inference can't handle () => goals.id in the same initializer
  parentId: uuid('parent_id'),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('active').notNull(), // active | done | archived
  sortOrder: integer('sort_order').default(0).notNull(),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const goalShareTokens = pgTable('goal_share_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Type Exports (for use in app code) ───

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PrayerSettings = typeof prayerSettings.$inferSelect;
export type PrayerTimesCache = typeof prayerTimesCache.$inferSelect;
export type NotificationPrefs = typeof notificationPrefs.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type PrayerLog = typeof prayerLog.$inferSelect;
export type NewPrayerLog = typeof prayerLog.$inferInsert;
export type OathSettings = typeof oathSettings.$inferSelect;
export type OathLedger = typeof oathLedger.$inferSelect;
export type QadaaLedger = typeof qadaaLedger.$inferSelect;
export type QadaaLogEntry = typeof qadaaLogEntries.$inferSelect;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type HuddleTaskPool = typeof huddleTaskPool.$inferSelect;
export type HuddleCompletion = typeof huddleCompletions.$inferSelect;
export type DailyLesson = typeof dailyLessons.$inferSelect;
export type DailyLessonView = typeof dailyLessonViews.$inferSelect;
export type DhikrSequence = typeof dhikrSequences.$inferSelect;
export type Talk = typeof talks.$inferSelect;
export type OnboardingResponse = typeof onboardingResponses.$inferSelect;
export type PrayerFriend = typeof prayerFriends.$inferSelect;
export type TrustedDevice = typeof trustedDevices.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type GoalShareToken = typeof goalShareTokens.$inferSelect;
