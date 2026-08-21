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
  phone: text('phone'),
  phoneVerified: boolean('phone_verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  subscriptionTier: subscriptionTier('subscription_tier').default('free').notNull(),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  role: userRole('role').default('user').notNull(),
  // Public calendar share token — null = sharing disabled, non-null = public read-only calendar at /user/public/[token]
  publicShareToken: text('public_share_token').unique(),
});

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
  totalOwed: integer('total_owed').default(0).notNull(),
  onboardingEstimate: integer('onboarding_estimate').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const qadaaLogEntries = pgTable('qadaa_log_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
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
  // iCal RRULE string, null = one-off
  recurrenceRule: text('recurrence_rule'),
  createdVia: eventCreatedVia('created_via').default('manual').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
