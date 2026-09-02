import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Homework is now a tab inside the unified Goals page.
// Redirect old links to /goals#homework for backwards compatibility.
export default function HomeworkPage() {
  redirect("/goals#homework");
}
