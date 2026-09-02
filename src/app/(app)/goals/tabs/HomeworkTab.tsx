"use client";

import HomeworkClient from "../../homework/HomeworkClient";
import type { Homework, Class } from "@/lib/db/schema";

// Thin wrapper that adapts the DB types to the HomeworkClient's expected prop types.
// HomeworkClient manages its own internal state and mutations.
export default function HomeworkTab({
  homework,
  classes,
}: {
  homework: Homework[];
  classes: Class[];
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
    />
  );
}
