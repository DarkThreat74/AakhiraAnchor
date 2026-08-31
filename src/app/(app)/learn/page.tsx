import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import LearnClient from "./LearnClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learn · Waqt" };

export default async function LearnPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <LearnClient />;
}
