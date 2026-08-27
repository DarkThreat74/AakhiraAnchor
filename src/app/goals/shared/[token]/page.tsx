import SharedGoalsClient from "./SharedGoalsClient";

export const dynamic = "force-dynamic";

export default async function SharedGoalsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedGoalsClient token={token} />;
}
