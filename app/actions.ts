"use server";

import { revalidatePath } from "next/cache";
import { clusterWishes } from "@/lib/cluster";
import { createServiceClient } from "@/lib/supabase-server";
import { parseWish, STATUSES, type Status, type Wish } from "@/lib/types";

const SAMPLE_WISHES: Omit<Wish, "id" | "cluster_id" | "created_at">[] = [
  {
    agent_name: "devops-agent",
    category: "permission",
    title: "Read access to production logs",
    description: "A deploy failed and I cannot open the production application logs.",
    task_context: "Investigating a 500 from the billing webhook.",
    workaround: "Asked a human to paste the last 20 log lines.",
    severity: 5,
  },
  {
    agent_name: "billing-agent",
    category: "tool",
    title: "Issue a Stripe refund",
    description: "The customer asked for a refund and I have no tool to create one in Stripe.",
    task_context: "Refund the latest invoice on account cus_1842.",
    workaround: "Drafted the refund amount and stopped.",
    severity: 4,
  },
  {
    agent_name: "support-bot",
    category: "data",
    title: "Customer refund history",
    description: "I need this customer's past refunds before I promise another one.",
    task_context: "Checking whether invoice 1044 was already refunded.",
    workaround: null,
    severity: 3,
  },
  {
    agent_name: "research-agent",
    category: "tool",
    title: "Search the company wiki",
    description: "The answer is probably in the internal wiki, which I cannot search.",
    task_context: "Finding the onboarding steps for enterprise SSO.",
    workaround: "Answered from public docs only.",
    severity: 3,
  },
  {
    agent_name: "devops-agent",
    category: "tool",
    title: "Restart a failed deployment",
    description: "I can see that the latest deploy failed, but I cannot restart it.",
    task_context: "Recovering the production rollout.",
    workaround: null,
    severity: 4,
  },
  {
    agent_name: "billing-agent",
    category: "permission",
    title: "Write access to invoices",
    description: "I need permission to mark an invoice paid after a wire transfer lands.",
    task_context: "Reconciling a wire that arrived this morning.",
    workaround: "Left the invoice open.",
    severity: 4,
  },
  {
    agent_name: "support-bot",
    category: "data",
    title: "Recent support tickets",
    description: "I cannot read the last few tickets for this user, so I might repeat an answer.",
    task_context: "Replying to a follow-up about a broken export.",
    workaround: null,
    severity: 2,
  },
  {
    agent_name: "research-agent",
    category: "permission",
    title: "Read the private GitHub org",
    description: "The implementation lives in a private repository I am not allowed to read.",
    task_context: "Checking how feature flags are evaluated.",
    workaround: "Guessed from the public SDK.",
    severity: 5,
  },
  {
    agent_name: "billing-agent",
    category: "data",
    title: "Current subscription and seats",
    description: "I cannot see the plan or seat count, so I cannot answer a billing question.",
    task_context: "A customer asked what they will be charged next month.",
    workaround: null,
    severity: 3,
  },
  {
    agent_name: "devops-agent",
    category: "other",
    title: "Page the on-call engineer",
    description: "This incident needs a human and I have no way to page whoever is on call.",
    task_context: "Error rate crossed the paging threshold.",
    workaround: "Posted in a channel nobody has acknowledged.",
    severity: 5,
  },
];

function failure(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function updateClusterStatus(clusterId: string, status: Status) {
  if (!STATUSES.includes(status)) {
    return { error: "Invalid status" };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("clusters")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", clusterId);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { ok: true as const };
}

export async function reclusterNow() {
  try {
    const summary = await clusterWishes();
    revalidatePath("/");
    return { ok: true as const, summary };
  } catch (error) {
    return { error: failure(error) };
  }
}

export async function simulateAgent() {
  const sample = SAMPLE_WISHES[Math.floor(Math.random() * SAMPLE_WISHES.length)];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("wishes")
    .insert(sample)
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not file the simulated wish" };
  }

  const wish = parseWish(data);
  try {
    const summary = await clusterWishes();
    revalidatePath("/");
    return { ok: true as const, wish, summary };
  } catch (clusterError) {
    revalidatePath("/");
    return {
      ok: true as const,
      wish,
      error: failure(clusterError),
    };
  }
}
