import { clusterWishes } from "@/lib/cluster";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expected = process.env.MCP_API_KEY;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : "";

  if (!expected || token !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await clusterWishes();
    return Response.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Clustering failed";
    console.error("[agent-wishlist] cluster route failed", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
