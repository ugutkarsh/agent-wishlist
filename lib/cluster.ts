import OpenAI from "openai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";

const COOLDOWN_MS = 10_000;

const categorySchema = z.enum(["tool", "permission", "data", "other"]);

const responseSchema = z.object({
  assignments: z.array(
    z.object({
      wish_id: z.string(),
      cluster_id: z.string().nullable().optional(),
      new_cluster_key: z.string().nullable().optional(),
    }),
  ),
  new_clusters: z.array(
    z.object({
      key: z.string().min(1),
      title: z.string().min(1),
      summary: z.string().min(1),
      category: z.preprocess(
        (value) =>
          value === "tool" ||
          value === "permission" ||
          value === "data" ||
          value === "other"
            ? value
            : "other",
        categorySchema,
      ),
    }),
  ),
});

export type ClusterSummary = {
  clustered: number;
  created: number;
  clusterIds: string[];
};

const SYSTEM_PROMPT = `You triage "wishes" filed by AI agents. For each unclustered wish, assign it to an existing cluster id or propose a new cluster with a short title (max 8 words, phrased as the thing to build, e.g. "Read access to production logs") and a one-sentence summary. Group semantically similar wishes. Respond with ONLY JSON: {"assignments":[{"wish_id":"...","cluster_id":"existing-uuid-or-null","new_cluster_key":"string-or-null"}],"new_clusters":[{"key":"...","title":"...","summary":"...","category":"tool|permission|data|other"}]}`;

type Lane = {
  inFlight: Promise<ClusterSummary> | null;
  lastStartedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
  needsFollowUp: boolean;
};

const lanes = new Map<string, Lane>();

function lane(userId: string): Lane {
  const existing = lanes.get(userId);
  if (existing) return existing;
  const created: Lane = {
    inFlight: null,
    lastStartedAt: 0,
    timer: null,
    needsFollowUp: false,
  };
  lanes.set(userId, created);
  return created;
}

function blankToNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null") return null;
  return trimmed;
}

function limitWords(title: string): string {
  return title.trim().split(/\s+/).slice(0, 8).join(" ");
}

function armFollowUp(userId: string) {
  const job = lane(userId);
  if (job.timer || !job.needsFollowUp) return;
  const wait = Math.max(COOLDOWN_MS - (Date.now() - job.lastStartedAt), 0);
  job.timer = setTimeout(() => {
    job.timer = null;
    if (!job.needsFollowUp) return;
    job.needsFollowUp = false;
    void clusterWishes(userId).catch((error) => {
      console.error("[agent-wishlist] clustering failed", error);
    });
  }, wait);
}

/** Non-blocking. Runs immediately, then at most once every 10 seconds per account. */
export function scheduleCluster(userId: string): void {
  const job = lane(userId);
  if (job.inFlight || Date.now() - job.lastStartedAt < COOLDOWN_MS) {
    job.needsFollowUp = true;
    armFollowUp(userId);
    return;
  }

  void clusterWishes(userId).catch((error) => {
    console.error("[agent-wishlist] clustering failed", error);
  });
}

export function clusterWishes(userId: string): Promise<ClusterSummary> {
  const job = lane(userId);
  if (job.inFlight) {
    job.needsFollowUp = true;
    armFollowUp(userId);
    return job.inFlight;
  }

  job.lastStartedAt = Date.now();
  job.inFlight = execute(userId).finally(() => {
    job.inFlight = null;
    if (job.needsFollowUp) armFollowUp(userId);
  });
  return job.inFlight;
}

async function execute(userId: string): Promise<ClusterSummary> {
  const supabase = createServiceClient();
  let clustered = 0;
  let created = 0;
  const clusterIds = new Set<string>();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const summary = await assignOnce(userId);
    clustered += summary.clustered;
    created += summary.created;
    for (const id of summary.clusterIds) clusterIds.add(id);
    if (summary.clustered === 0) break;

    const { count, error } = await supabase
      .from("wishes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("cluster_id", null);
    if (error) throw new Error(error.message);
    if (!count) break;
  }

  return { clustered, created, clusterIds: [...clusterIds] };
}

async function assignOnce(userId: string): Promise<ClusterSummary> {
  const supabase = createServiceClient();
  const [{ data: wishes, error: wishError }, { data: clusters, error: clusterError }] =
    await Promise.all([
      supabase
        .from("wishes")
        .select(
          "id, agent_name, category, title, description, task_context, workaround, severity",
        )
        .eq("user_id", userId)
        .is("cluster_id", null),
      supabase.from("clusters").select("id, title, summary, category").eq("user_id", userId),
    ]);

  if (wishError) throw new Error(wishError.message);
  if (clusterError) throw new Error(clusterError.message);

  const unclustered = wishes ?? [];
  const existing = clusters ?? [];
  if (unclustered.length === 0) {
    return { clustered: 0, created: 0, clusterIds: [] };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          instruction: `Assign all ${unclustered.length} wishes. Every wish_id must appear once. cluster_id must be an id from existing_clusters or null. new_cluster_key must match a key in new_clusters or be null. Wishes that describe the same missing capability must share one cluster, including paraphrases.`,
          unclustered_wishes: unclustered,
          existing_clusters: existing,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty clustering response");

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("OpenAI clustering response was not JSON");
  }

  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Clustering response was invalid: ${parsed.error.message}`);
  }

  const existingIds = new Set(existing.map((cluster) => cluster.id));
  const unclusteredIds = new Set(unclustered.map((wish) => wish.id));
  const clustersByKey = new Map(
    parsed.data.new_clusters.map((cluster) => [cluster.key, cluster]),
  );

  const resolved: { wishId: string; clusterId?: string; newKey?: string }[] = [];
  for (const assignment of parsed.data.assignments) {
    if (!unclusteredIds.has(assignment.wish_id)) continue;
    const clusterId = blankToNull(assignment.cluster_id);
    const newKey = blankToNull(assignment.new_cluster_key);
    if (clusterId && existingIds.has(clusterId)) {
      resolved.push({ wishId: assignment.wish_id, clusterId });
      continue;
    }
    if (newKey && clustersByKey.has(newKey)) {
      resolved.push({ wishId: assignment.wish_id, newKey });
    }
  }

  const keysToCreate = [
    ...new Set(
      resolved.flatMap((item) => (item.newKey ? [item.newKey] : [])),
    ),
  ];
  const createdIds = new Map<string, string>();

  for (const key of keysToCreate) {
    const cluster = clustersByKey.get(key);
    if (!cluster) continue;
    const { data, error } = await supabase
      .from("clusters")
      .insert({
        title: limitWords(cluster.title),
        summary: cluster.summary.trim(),
        category: cluster.category,
        user_id: userId,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create cluster");
    }
    createdIds.set(key, data.id);
  }

  const writes: { wishId: string; clusterId: string }[] = [];
  const seenWishes = new Set<string>();
  for (const item of resolved) {
    if (seenWishes.has(item.wishId)) continue;
    const clusterId =
      item.clusterId ?? (item.newKey ? createdIds.get(item.newKey) : undefined);
    if (!clusterId) continue;
    seenWishes.add(item.wishId);
    writes.push({ wishId: item.wishId, clusterId });
  }

  const touched = new Set<string>();
  await Promise.all(
    writes.map(async ({ wishId, clusterId }) => {
      const { error } = await supabase
        .from("wishes")
        .update({ cluster_id: clusterId })
        .eq("id", wishId)
        .eq("user_id", userId)
        .is("cluster_id", null);
      if (error) throw new Error(error.message);
      touched.add(clusterId);
    }),
  );

  await Promise.all(
    [...touched].map(async (clusterId) => {
      const { error } = await supabase.rpc("recompute_cluster_stats", {
        cluster: clusterId,
      });
      if (error) throw new Error(error.message);
    }),
  );

  return {
    clustered: writes.length,
    created: createdIds.size,
    clusterIds: [...touched],
  };
}
