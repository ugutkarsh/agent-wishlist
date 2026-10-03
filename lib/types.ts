export const CATEGORIES = ["tool", "permission", "data", "other"] as const;
export const STATUSES = ["open", "planned", "shipped"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Status = (typeof STATUSES)[number];

export type Wish = {
  id: string;
  agent_name: string;
  category: Category;
  title: string;
  description: string;
  task_context: string | null;
  workaround: string | null;
  severity: number | null;
  cluster_id: string | null;
  user_id: string | null;
  created_at: string;
};

export type Cluster = {
  id: string;
  title: string | null;
  summary: string | null;
  category: Category | null;
  wish_count: number;
  score: number;
  status: Status;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  wishes: Wish[];
};

function asCategory(value: unknown): Category {
  return value === "tool" ||
    value === "permission" ||
    value === "data" ||
    value === "other"
    ? value
    : "other";
}

function asStatus(value: unknown): Status {
  return value === "open" || value === "planned" || value === "shipped"
    ? value
    : "open";
}

function asNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function parseWish(value: unknown): Wish | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.agent_name !== "string") return null;
  if (typeof row.title !== "string" || typeof row.description !== "string") return null;

  return {
    id: row.id,
    agent_name: row.agent_name,
    category: asCategory(row.category),
    title: row.title,
    description: row.description,
    task_context: asNullableString(row.task_context),
    workaround: asNullableString(row.workaround),
    severity:
      row.severity == null ? null : Math.min(5, Math.max(1, asNumber(row.severity, 1))),
    cluster_id: asNullableString(row.cluster_id),
    user_id: asNullableString(row.user_id),
    created_at:
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
  };
}

export function parseCluster(value: unknown): Cluster | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") return null;

  return {
    id: row.id,
    title: asNullableString(row.title),
    summary: asNullableString(row.summary),
    category: row.category == null ? null : asCategory(row.category),
    wish_count: asNumber(row.wish_count),
    score: asNumber(row.score),
    status: asStatus(row.status),
    user_id: asNullableString(row.user_id),
    created_at:
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    updated_at:
      typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
    wishes: [],
  };
}

export function sortClusters(clusters: Cluster[]) {
  return [...clusters].sort(
    (a, b) => b.score - a.score || b.wish_count - a.wish_count,
  );
}
