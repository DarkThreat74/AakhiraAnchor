-- Add missing indexes for query performance

-- prayer_friends: index on friendId + status for pending request lookups
CREATE INDEX IF NOT EXISTS "prayer_friends_friend_status_idx"
  ON "prayer_friends" ("friend_id", "status");

-- homeworks: index on (userId, status, completedAt) for auto-prune
CREATE INDEX IF NOT EXISTS "homeworks_user_status_completed_idx"
  ON "homeworks" ("user_id", "status", "completed_at");

-- users: index on role for admin queries
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role");

-- users: index on createdAt for admin user list ordering
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" ("created_at");
