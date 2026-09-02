-- Homework tracker: classes (subjects) + homework assignments
-- Allows students to track homework with due dates, categorize by class,
-- and see them as colored dots on the calendar.

CREATE TYPE "homework_status" AS ENUM ('pending', 'completed');
CREATE TYPE "homework_priority" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "homework_kind" AS ENUM ('homework', 'test', 'project', 'quiz', 'reading', 'other');

-- Classes (subjects) — color-coded for calendar dots and list chips
CREATE TABLE "classes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "color" text NOT NULL,
  "archived" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "classes_user_id_idx" ON "classes" ("user_id");

-- Homework assignments
CREATE TABLE "homeworks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "description" text,
  "class_id" uuid REFERENCES "classes"("id") ON DELETE SET NULL,
  "due_date" date NOT NULL,
  "due_time" time,
  "priority" homework_priority DEFAULT 'medium' NOT NULL,
  "status" homework_status DEFAULT 'pending' NOT NULL,
  "kind" homework_kind DEFAULT 'homework' NOT NULL,
  "completed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "homeworks_user_due_idx" ON "homeworks" ("user_id", "due_date");
CREATE INDEX "homeworks_user_class_idx" ON "homeworks" ("user_id", "class_id");
CREATE INDEX "homeworks_user_status_idx" ON "homeworks" ("user_id", "status");
