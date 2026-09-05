"use client";

import HomeworkClient from "../../homework/HomeworkClient";
import type { Homework, Class } from "@/lib/db/schema";

// Thin wrapper that adapts the DB types to the HomeworkClient's expected prop types.
// HomeworkClient manages its own internal state and mutations, but propagates
// changes back to the parent via onHomeworkChange so the Today tab stays in sync.
export default function HomeworkTab({
  homework,
  classes,
  onHomeworkChange,
}: {
  homework: Homework[];
  classes: Class[];
  onHomeworkChange?: (homework: Homework[]) => void;
}) {
  return (
    <HomeworkClient
      initialHomework={homework.map((h) => ({
        id: h.id,
        title: h.title,
        description: h.description,
        classId: h.classId,
        dueDate: h.dueDate,
        dueTime: h.dueTime,
        priority: h.priority,
        status: h.status,
        kind: h.kind,
        completedAt: h.completedAt,
      }))}
      initialClasses={classes.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        archived: c.archived,
      }))}
      onHomeworkChange={(updated) => {
        if (!onHomeworkChange) return;
        // Map back to the DB Homework shape expected by GoalsPageClient
        onHomeworkChange(
          updated.map((h) => ({
            id: h.id,
            userId: "", // not used by TodayTab display logic
            title: h.title,
            description: h.description,
            classId: h.classId,
            dueDate: h.dueDate,
            dueTime: h.dueTime,
            priority: h.priority,
            status: h.status,
            kind: h.kind,
            completedAt: h.completedAt,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        );
      }}
    />
  );
}
