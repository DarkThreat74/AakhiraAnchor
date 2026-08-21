import { NextRequest, NextResponse } from "next/server";
import { count, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdmin, AdminAuthError } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    // Count only non-admin users — admin accounts are not "users"
    const [userRow] = await db.select({ value: count() }).from(schema.users).where(ne(schema.users.role, "admin"));
    const [lessonRow] = await db.select({ value: count() }).from(schema.dailyLessons);
    const [dhikrRow] = await db.select({ value: count() }).from(schema.dhikrSequences);
    const [huddleRow] = await db.select({ value: count() }).from(schema.huddleTaskPool);
    const [talksRow] = await db.select({ value: count() }).from(schema.talks);

    return NextResponse.json({
      users: userRow?.value ?? 0,
      lessons: lessonRow?.value ?? 0,
      dhikr: dhikrRow?.value ?? 0,
      huddleTasks: huddleRow?.value ?? 0,
      talks: talksRow?.value ?? 0,
    });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
