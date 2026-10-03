import { Dashboard } from "@/components/dashboard";
import { requireAccount } from "@/lib/account";
import { createServiceClient } from "@/lib/supabase-server";
import { parseCluster, parseWish, sortClusters, type Cluster } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadDashboard(userId: string): Promise<{ clusters: Cluster[]; wishes: NonNullable<ReturnType<typeof parseWish>>[] }> {
  const supabase = createServiceClient();
  const [{ data: clusterRows, error: clusterError }, { data: wishRows, error: wishError }] =
    await Promise.all([
      supabase.from("clusters").select("*").eq("user_id", userId).order("score", { ascending: false }),
      supabase.from("wishes").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

  if (clusterError) throw new Error(clusterError.message);
  if (wishError) throw new Error(wishError.message);

  const wishes = (wishRows ?? []).flatMap((row) => {
    const wish = parseWish(row);
    return wish ? [wish] : [];
  });
  const byCluster = new Map<string, Cluster["wishes"]>();
  for (const wish of wishes) {
    if (!wish.cluster_id) continue;
    const list = byCluster.get(wish.cluster_id) ?? [];
    list.push(wish);
    byCluster.set(wish.cluster_id, list);
  }

  const clusters = sortClusters(
    (clusterRows ?? []).flatMap((row) => {
      const cluster = parseCluster(row);
      if (!cluster) return [];
      cluster.wishes = byCluster.get(cluster.id) ?? [];
      return [cluster];
    }),
  );

  return { clusters, wishes };
}

export default async function Home() {
  const account = await requireAccount();
  try {
    const { clusters, wishes } = await loadDashboard(account.userId);
    return (
      <Dashboard
        initialClusters={clusters}
        initialWishes={wishes}
        userId={account.userId}
        email={account.email}
      />
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the wishlist";
    return (
      <Dashboard
        initialClusters={[]}
        initialWishes={[]}
        userId={account.userId}
        email={account.email}
        loadError={message}
      />
    );
  }
}
