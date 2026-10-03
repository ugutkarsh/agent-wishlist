"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { reclusterNow, simulateAgent, updateClusterStatus } from "@/app/actions";
import { createBrowserClient } from "@/lib/supabase-browser";
import {
  parseCluster,
  parseWish,
  sortClusters,
  type Category,
  type Cluster,
  type Status,
  type Wish,
} from "@/lib/types";

const categoryClass: Record<Category, string> = {
  tool: "bg-sky-400/15 text-sky-200 ring-sky-400/30",
  permission: "bg-amber-400/15 text-amber-200 ring-amber-400/30",
  data: "bg-violet-400/15 text-violet-200 ring-violet-400/30",
  other: "bg-zinc-400/15 text-zinc-200 ring-zinc-400/30",
};

const statusClass: Record<Status, string> = {
  open: "text-emerald-200 ring-emerald-400/40",
  planned: "text-amber-200 ring-amber-400/40",
  shipped: "text-sky-200 ring-sky-400/40",
};

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function relativeTime(iso: string, now: number) {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function upsertWish(wishes: Wish[], wish: Wish) {
  const without = wishes.filter((item) => item.id !== wish.id);
  return [wish, ...without].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function Dashboard({
  initialClusters,
  initialWishes,
  loadError,
}: {
  initialClusters: Cluster[];
  initialWishes: Wish[];
  loadError?: string;
}) {
  const [clusters, setClusters] = useState(initialClusters);
  const [wishes, setWishes] = useState(initialWishes);
  const [openClusters, setOpenClusters] = useState<string[]>([]);
  const [flashIds, setFlashIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [clusterPending, startCluster] = useTransition();
  const [simulatePending, startSimulate] = useTransition();

  function toast(message: string) {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }

  function flash(id: string) {
    setFlashIds((current) => (current.includes(id) ? current : [...current, id]));
    window.setTimeout(() => {
      setFlashIds((current) => current.filter((item) => item !== id));
    }, 1600);
  }

  useEffect(() => {
    if (loadError) toast(loadError);
    // The load error is fixed for this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadError]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30000);
    const start = window.setTimeout(() => setNow(Date.now()), 0);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(start);
    };
  }, []);

  useEffect(() => {
    const supabase = createBrowserClient();

    async function refreshClusterWishes(clusterId: string) {
      const { data, error } = await supabase
        .from("wishes")
        .select("*")
        .eq("cluster_id", clusterId)
        .order("created_at", { ascending: false });
      if (error || !data) return;
      const rows = data.flatMap((row) => {
        const wish = parseWish(row);
        return wish ? [wish] : [];
      });
      setClusters((current) =>
        current.map((cluster) =>
          cluster.id === clusterId ? { ...cluster, wishes: rows } : cluster,
        ),
      );
    }

    const channel = supabase
      .channel("agent-wishlist")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wishes" },
        (payload) => {
          const wish = parseWish(payload.new);
          if (!wish) return;
          setWishes((current) => upsertWish(current, wish));
          flash(wish.id);
          if (wish.cluster_id) {
            setClusters((current) =>
              current.map((cluster) =>
                cluster.id === wish.cluster_id
                  ? { ...cluster, wishes: upsertWish(cluster.wishes, wish) }
                  : cluster,
              ),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "clusters" },
        (payload) => {
          const cluster = parseCluster(payload.new);
          if (!cluster) return;
          setClusters((current) => {
            const rest = current.filter((item) => item.id !== cluster.id);
            return sortClusters([...rest, cluster]);
          });
          flash(cluster.id);
          void refreshClusterWishes(cluster.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "clusters" },
        (payload) => {
          const cluster = parseCluster(payload.new);
          if (!cluster) return;
          setClusters((current) => {
            const exists = current.some((item) => item.id === cluster.id);
            const next = exists
              ? current.map((item) =>
                  item.id === cluster.id
                    ? { ...cluster, wishes: item.wishes }
                    : item,
                )
              : [...current, cluster];
            return sortClusters(next);
          });
          flash(cluster.id);
          void refreshClusterWishes(cluster.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const agents = new Set(wishes.map((wish) => wish.agent_name)).size;
  const feed = wishes.slice(0, 12);

  function onStatus(clusterId: string, status: Status) {
    const previous = clusters.find((cluster) => cluster.id === clusterId)?.status;
    setClusters((current) =>
      current.map((cluster) =>
        cluster.id === clusterId ? { ...cluster, status } : cluster,
      ),
    );
    setSavingStatus(clusterId);
    void updateClusterStatus(clusterId, status).then((result) => {
      setSavingStatus(null);
      if ("error" in result && result.error) {
        if (previous) {
          setClusters((current) =>
            current.map((cluster) =>
              cluster.id === clusterId ? { ...cluster, status: previous } : cluster,
            ),
          );
        }
        toast(result.error);
        return;
      }
      toast(`Marked as ${status}.`);
    });
  }

  function onRecluster() {
    startCluster(async () => {
      const result = await reclusterNow();
      if ("error" in result && result.error) {
        toast(result.error);
        return;
      }
      if ("summary" in result && result.summary) {
        const { clustered, created } = result.summary;
        toast(
          clustered === 0
            ? "No unclustered wishes."
            : `Clustered ${clustered} wishes. Created ${created} clusters.`,
        );
      }
    });
  }

  function onSimulate() {
    startSimulate(async () => {
      const result = await simulateAgent();
      if ("error" in result && result.error && !("ok" in result)) {
        toast(result.error);
        return;
      }
      if ("wish" in result && result.wish) {
        setWishes((current) => upsertWish(current, result.wish as Wish));
        flash(result.wish.id);
      }
      if ("error" in result && result.error) {
        toast(`Wish filed, but clustering failed: ${result.error}`);
        return;
      }
      toast("Wish filed. Humans will see it on the dashboard.");
    });
  }

  return (
    <div>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Agent Wishlist
            </h1>
            <p className="mt-2 text-zinc-400">What agents wish they had. Ranked.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/connect"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-100 transition hover:bg-white/5"
            >
              Connect an agent
            </Link>
            <button
              type="button"
              onClick={onRecluster}
              disabled={clusterPending}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-100 transition hover:bg-white/5 disabled:opacity-50"
            >
              {clusterPending ? "Clustering..." : "Re-cluster now"}
            </button>
            <button
              type="button"
              onClick={onSimulate}
              disabled={simulatePending}
              className="rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-200 disabled:opacity-50"
            >
              {simulatePending ? "Filing wish..." : "Simulate an agent"}
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Wishes" value={wishes.length} />
          <Stat label="Clusters" value={clusters.length} />
          <Stat label="Agents reporting" value={agents} />
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="space-y-4">
            {clusters.length === 0 ? (
              <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8">
                <h2 className="text-lg font-medium">No wishes clustered yet</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                  When an agent gets stuck, it should call{" "}
                  <span className="text-zinc-200">file_wish</span>. Open{" "}
                  <Link href="/connect" className="text-zinc-200 underline">
                    Connect an agent
                  </Link>{" "}
                  for the MCP URL and a config you can paste into Claude or Cursor.
                  Press Simulate an agent to try the live feed without connecting one.
                </p>
              </section>
            ) : (
              clusters.map((cluster, index) => (
                <article
                  key={cluster.id}
                  className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${
                    flashIds.includes(cluster.id) ? "wish-flash" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs tracking-wide text-zinc-500 uppercase">
                        Rank {index + 1}
                      </p>
                      <h2 className="mt-1 text-lg font-medium text-zinc-50">
                        {cluster.title ?? "Untitled cluster"}
                      </h2>
                      {cluster.summary ? (
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                          {cluster.summary}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-2xl text-amber-200">
                        {formatScore(cluster.score)}
                      </p>
                      <p className="text-xs text-zinc-500">score</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {cluster.category ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-inset ${categoryClass[cluster.category]}`}
                      >
                        {cluster.category}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
                      {cluster.wish_count} {cluster.wish_count === 1 ? "wish" : "wishes"}
                    </span>
                    <label className="sr-only" htmlFor={`status-${cluster.id}`}>
                      Status for {cluster.title ?? "cluster"}
                    </label>
                    <select
                      id={`status-${cluster.id}`}
                      value={cluster.status}
                      disabled={savingStatus === cluster.id}
                      onChange={(event) =>
                        onStatus(cluster.id, event.target.value as Status)
                      }
                      className={`rounded-full bg-zinc-950 px-2.5 py-1 text-xs ring-1 ring-inset disabled:opacity-50 ${statusClass[cluster.status]}`}
                    >
                      <option value="open">open</option>
                      <option value="planned">planned</option>
                      <option value="shipped">shipped</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenClusters((current) =>
                        current.includes(cluster.id)
                          ? current.filter((id) => id !== cluster.id)
                          : [...current, cluster.id],
                      )
                    }
                    className="mt-4 text-sm text-zinc-400 hover:text-zinc-200"
                  >
                    {openClusters.includes(cluster.id) ? "Hide" : "Show"} underlying wishes
                  </button>

                  {openClusters.includes(cluster.id) ? (
                    <ul className="mt-3 space-y-3 border-t border-white/10 pt-3">
                      {cluster.wishes.length === 0 ? (
                        <li className="text-sm text-zinc-500">No wishes in this cluster yet.</li>
                      ) : (
                        cluster.wishes.map((wish) => (
                          <WishDetails key={wish.id} wish={wish} now={now} />
                        ))
                      )}
                    </ul>
                  ) : null}
                </article>
              ))
            )}
          </main>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:sticky lg:top-6">
            <h2 className="text-sm font-medium tracking-wide text-zinc-300 uppercase">
              Live feed
            </h2>
            {feed.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                New wishes show up here as agents file them.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {feed.map((wish) => (
                  <li
                    key={wish.id}
                    className={`rounded-xl px-3 py-2 ${
                      flashIds.includes(wish.id) ? "wish-flash" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">{wish.title}</p>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {now ? relativeTime(wish.created_at, now) : ""}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-400">
                      {wish.agent_name}
                      <span className="text-zinc-600"> · </span>
                      {wish.category}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </div>

      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((item) => (
          <p
            key={item.id}
            role="status"
            className="pointer-events-auto rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 shadow-lg"
          >
            {item.message}
          </p>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-xs tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 font-mono text-2xl">{value}</p>
    </div>
  );
}

function WishDetails({ wish, now }: { wish: Wish; now: number | null }) {
  return (
    <li className="rounded-xl bg-black/20 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs text-amber-100/90">{wish.agent_name}</p>
        <p className="text-xs text-zinc-500">
          {wish.severity ? `Severity ${wish.severity}` : "No severity"}
          {now ? ` · ${relativeTime(wish.created_at, now)}` : ""}
        </p>
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-200">{wish.description}</p>
      {wish.task_context ? (
        <p className="mt-2 text-xs leading-5 text-zinc-400">
          <span className="text-zinc-500">Task: </span>
          {wish.task_context}
        </p>
      ) : null}
      {wish.workaround ? (
        <p className="mt-1 text-xs leading-5 text-zinc-400">
          <span className="text-zinc-500">Workaround: </span>
          {wish.workaround}
        </p>
      ) : null}
    </li>
  );
}
