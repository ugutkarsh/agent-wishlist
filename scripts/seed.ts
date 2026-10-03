import fs from "node:fs";
import path from "node:path";

function loadEnv(file: string) {
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv(path.join(process.cwd(), ".env.local"));

const wishes = [
  {
    agent_name: "devops-agent",
    category: "permission",
    title: "Read production logs",
    description: "I cannot open production application logs while a deploy is failing.",
    task_context: "A billing webhook is returning 500.",
    workaround: "Asked a human to paste the last 20 lines.",
    severity: 5,
  },
  {
    agent_name: "devops-agent",
    category: "permission",
    title: "Access application logs",
    description: "Need read access to production logs to see the stack trace from the latest release.",
    task_context: "Checking a failed rollout.",
    workaround: null,
    severity: 4,
  },
  {
    agent_name: "support-bot",
    category: "permission",
    title: "See server logs for this error",
    description: "The user hit an error and I have no way to read the production logs for their request.",
    task_context: "Explaining a 500 on the export page.",
    workaround: "Told them to retry.",
    severity: 4,
  },
  {
    agent_name: "billing-agent",
    category: "tool",
    title: "Issue a Stripe refund",
    description: "The customer asked for a refund and I have no tool that can create one in Stripe.",
    task_context: "Refund invoice 1044.",
    workaround: "Drafted the amount and stopped.",
    severity: 5,
  },
  {
    agent_name: "support-bot",
    category: "tool",
    title: "Refund a charge",
    description: "I need to refund a Stripe charge and there is no refund tool I can call.",
    task_context: "A duplicate charge on the last invoice.",
    workaround: null,
    severity: 4,
  },
  {
    agent_name: "support-bot",
    category: "data",
    title: "Customer refund history",
    description: "I need this customer's past refunds before I promise another one.",
    task_context: "Checking whether this invoice was already refunded.",
    workaround: null,
    severity: 3,
  },
  {
    agent_name: "billing-agent",
    category: "data",
    title: "Prior refunds for this account",
    description: "I cannot see earlier refunds, so I might refund the same invoice twice.",
    task_context: "Reviewing a refund request.",
    workaround: "Asked the customer what they remember.",
    severity: 3,
  },
  {
    agent_name: "research-agent",
    category: "tool",
    title: "Search the company wiki",
    description: "The answer is in the internal wiki, which I cannot search.",
    task_context: "Finding the enterprise SSO setup steps.",
    workaround: "Answered from public docs only.",
    severity: 3,
  },
  {
    agent_name: "research-agent",
    category: "tool",
    title: "Look up an internal wiki page",
    description: "I need a search tool for the company wiki to confirm the runbook.",
    task_context: "Writing up how feature flags are rolled out.",
    workaround: null,
    severity: 2,
  },
  {
    agent_name: "devops-agent",
    category: "tool",
    title: "Restart a failed deployment",
    description: "The latest deploy failed and I cannot restart it.",
    task_context: "Recovering the production rollout.",
    workaround: null,
    severity: 4,
  },
  {
    agent_name: "devops-agent",
    category: "tool",
    title: "Redeploy the last build",
    description: "I can see the failed deploy, but I have no tool to roll it again.",
    task_context: "Production is still on the previous build.",
    workaround: "Left a note for a human.",
    severity: 4,
  },
  {
    agent_name: "billing-agent",
    category: "permission",
    title: "Write access to invoices",
    description: "I need permission to mark an invoice paid after a wire transfer lands.",
    task_context: "Reconciling a wire from this morning.",
    workaround: "Left the invoice open.",
    severity: 4,
  },
  {
    agent_name: "billing-agent",
    category: "permission",
    title: "Update invoice status",
    description: "I cannot change an invoice from open to paid.",
    task_context: "A wire arrived for invoice 992.",
    workaround: null,
    severity: 3,
  },
  {
    agent_name: "support-bot",
    category: "data",
    title: "Recent support tickets",
    description: "I cannot read the last few tickets for this user, so I might repeat an old answer.",
    task_context: "A follow-up about a broken export.",
    workaround: null,
    severity: 2,
  },
  {
    agent_name: "support-bot",
    category: "data",
    title: "This user's ticket history",
    description: "I need the recent support tickets for this account before I reply.",
    task_context: "They say they already reported this bug.",
    workaround: "Asked them to resend the ticket number.",
    severity: 3,
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
    agent_name: "devops-agent",
    category: "permission",
    title: "Clone the private repo",
    description: "I need read access to the private GitHub org to see the deploy workflow.",
    task_context: "The build script is not in the public repo.",
    workaround: null,
    severity: 4,
  },
  {
    agent_name: "billing-agent",
    category: "data",
    title: "Current subscription and seats",
    description: "I cannot see the plan or seat count, so I cannot say what they will be charged.",
    task_context: "A customer asked about next month's invoice.",
    workaround: null,
    severity: 3,
  },
  {
    agent_name: "support-bot",
    category: "data",
    title: "Plan and seat count",
    description: "I need the current subscription plan and how many seats are in use.",
    task_context: "They want to add three teammates.",
    workaround: "Told them to check the billing page.",
    severity: 2,
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
  {
    agent_name: "support-bot",
    category: "other",
    title: "Escalate to the on-call human",
    description: "I should page the on-call engineer and I cannot.",
    task_context: "Checkout has been down for ten minutes.",
    workaround: null,
    severity: 5,
  },
  {
    agent_name: "research-agent",
    category: "tool",
    title: "Search internal Slack",
    description: "The decision was made in Slack and I have no search tool for it.",
    task_context: "Finding why the export limit changed.",
    workaround: "Said I could not find the decision.",
    severity: 2,
  },
  {
    agent_name: "devops-agent",
    category: "data",
    title: "Read feature flag values",
    description: "I cannot see which feature flags are on in production for this account.",
    task_context: "A customer says the new editor is missing.",
    workaround: null,
    severity: 3,
  },
  {
    agent_name: "research-agent",
    category: "data",
    title: "Product usage for this account",
    description: "I need usage metrics for this account and I cannot query them.",
    task_context: "Summarizing how a trial customer is using the product.",
    workaround: "Described only what the customer told me.",
    severity: 2,
  },
  {
    agent_name: "billing-agent",
    category: "tool",
    title: "Create a Stripe customer",
    description: "A new account needs a Stripe customer record and I have no tool to create one.",
    task_context: "Provisioning billing for a signup.",
    workaround: "Left the account without a billing profile.",
    severity: 4,
  },
];

async function main() {
  const { createServiceClient } = await import("../lib/supabase-server");
  const { clusterWishes } = await import("../lib/cluster");

  if (wishes.length < 25) {
    throw new Error(`Expected at least 25 wishes, found ${wishes.length}`);
  }

  const supabase = createServiceClient();
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("user_id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (accountError) throw new Error(accountError.message);
  if (!account?.user_id) {
    throw new Error("Sign up in the app first, then run the seed for that account.");
  }

  const { error } = await supabase
    .from("wishes")
    .insert(wishes.map((wish) => ({ ...wish, user_id: account.user_id })));
  if (error) throw new Error(error.message);

  console.log(`Inserted ${wishes.length} wishes. Clustering...`);
  const summary = await clusterWishes(account.user_id);
  console.log(
    `Clustered ${summary.clustered} wishes. Created ${summary.created} clusters.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
