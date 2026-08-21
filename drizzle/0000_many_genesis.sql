CREATE TYPE "public"."event_created_via" AS ENUM('manual', 'voice_ai');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('block', 'task', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."oath_status" AS ENUM('owed', 'donated');--> statement-breakpoint
CREATE TYPE "public"."prayer_name" AS ENUM('fajr', 'dhuhr', 'asr', 'maghrib', 'isha');--> statement-breakpoint
CREATE TYPE "public"."prayer_status" AS ENUM('pending', 'prayed', 'missed', 'assumed_prayed');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'plus');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "daily_lesson_views" (
	"user_id" uuid NOT NULL,
	"lesson_id" uuid,
	"date" date NOT NULL,
	CONSTRAINT "daily_lesson_views_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "daily_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"source_citation" text NOT NULL,
	"category" text
);
--> statement-breakpoint
CREATE TABLE "dhikr_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phrase_arabic" text NOT NULL,
	"phrase_transliteration" text NOT NULL,
	"target_count" integer NOT NULL,
	"sequence_order" integer NOT NULL,
	"source_citation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"type" "event_type" DEFAULT 'block' NOT NULL,
	"recurrence_rule" text,
	"created_via" "event_created_via" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "huddle_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"task_id" uuid,
	"date" date NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "huddle_task_pool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" text,
	"is_default_free" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_prefs" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"prayer_early_mid" text DEFAULT 'push' NOT NULL,
	"prayer_final" text DEFAULT 'push' NOT NULL,
	"other_reminders" text DEFAULT 'push' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oath_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"prayer_log_id" uuid,
	"amount" numeric(6, 2) NOT NULL,
	"status" "oath_status" DEFAULT 'owed' NOT NULL,
	"logged_donated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oath_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"amount_per_missed" numeric(6, 2) NOT NULL,
	"min_slider" numeric(6, 2) DEFAULT '1.00' NOT NULL,
	"max_slider" numeric(6, 2) DEFAULT '10.00' NOT NULL,
	"set_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_responses" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"religiosity_self_rating" integer,
	"prayer_frequency" integer,
	"quran_reading_frequency" integer,
	"years_missed_estimate" integer,
	"responses_json" jsonb,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prayer_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"prayer_name" "prayer_name" NOT NULL,
	"went_to_masjid" boolean,
	"status" "prayer_status" DEFAULT 'pending' NOT NULL,
	"marked_at" timestamp with time zone,
	"last_checkin_at" timestamp with time zone,
	"checkin_stage" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prayer_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"timezone" text NOT NULL,
	"calculation_method" integer DEFAULT 2 NOT NULL,
	"madhab" text DEFAULT 'standard',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prayer_times_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"date" date NOT NULL,
	"fajr" time NOT NULL,
	"sunrise" time NOT NULL,
	"dhuhr" time NOT NULL,
	"asr" time NOT NULL,
	"maghrib" time NOT NULL,
	"isha" time NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qadaa_ledger" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"total_owed" integer DEFAULT 0 NOT NULL,
	"onboarding_estimate" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qadaa_log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"amount_logged" integer NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "talks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"speaker" text,
	"category" text,
	"external_url" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"phone" text,
	"phone_verified" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"subscription_tier" "subscription_tier" DEFAULT 'free' NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"public_share_token" text,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_public_share_token_unique" UNIQUE("public_share_token")
);
--> statement-breakpoint
ALTER TABLE "daily_lesson_views" ADD CONSTRAINT "daily_lesson_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_lesson_views" ADD CONSTRAINT "daily_lesson_views_lesson_id_daily_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."daily_lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "huddle_completions" ADD CONSTRAINT "huddle_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "huddle_completions" ADD CONSTRAINT "huddle_completions_task_id_huddle_task_pool_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."huddle_task_pool"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oath_ledger" ADD CONSTRAINT "oath_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oath_ledger" ADD CONSTRAINT "oath_ledger_prayer_log_id_prayer_log_id_fk" FOREIGN KEY ("prayer_log_id") REFERENCES "public"."prayer_log"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oath_settings" ADD CONSTRAINT "oath_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_responses" ADD CONSTRAINT "onboarding_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_log" ADD CONSTRAINT "prayer_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_settings" ADD CONSTRAINT "prayer_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_times_cache" ADD CONSTRAINT "prayer_times_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qadaa_ledger" ADD CONSTRAINT "qadaa_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qadaa_log_entries" ADD CONSTRAINT "qadaa_log_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "huddle_completions_user_task_date_idx" ON "huddle_completions" USING btree ("user_id","task_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "prayer_log_user_date_prayer_idx" ON "prayer_log" USING btree ("user_id","date","prayer_name");--> statement-breakpoint
CREATE UNIQUE INDEX "prayer_times_cache_user_date_idx" ON "prayer_times_cache" USING btree ("user_id","date");