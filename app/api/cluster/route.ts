import { lookupUserIdByApiKey } from "@/lib/account";
import { clusterWishes } from "@/lib/cluster";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : "";
  const userId = await lookupUserIdByApiKey(token);

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await clusterWishes(userId);
    return Response.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Clustering failed";
    console.error("[agent-wishlist] cluster route failed", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
