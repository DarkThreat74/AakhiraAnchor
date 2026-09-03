-- Add status and responded_at columns to prayer_friends
-- Changes the friend system from auto-accept to pending/accept/reject flow

CREATE TYPE "prayer_friend_status" AS ENUM ('pending', 'accepted', 'rejected');

ALTER TABLE "prayer_friends" ADD COLUMN "status" "prayer_friend_status" NOT NULL DEFAULT 'accepted';
ALTER TABLE "prayer_friends" ADD COLUMN "responded_at" timestamp with time zone;

-- Existing friendships are marked as accepted (they were auto-accepted before)
UPDATE "prayer_friends" SET "status" = 'accepted', "responded_at" = "created_at" WHERE "status" IS NULL OR "status" = 'accepted';
