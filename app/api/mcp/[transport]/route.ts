import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { scheduleCluster } from "@/lib/cluster";
import { createServiceClient } from "@/lib/supabase-server";

const categorySchema = z.enum(["tool", "permission", "data", "other"]);

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "file_wish",
      {
        title: "File a wish",
        description:
          "Call this whenever you cannot complete a task because you lack a tool, permission, or data. Be specific about what you needed and why. File the wish before you give up or invent a workaround.",
        inputSchema: z.object({
          agent_name: z
            .string()
            .min(1)
            .describe("Your name or role, for example billing-agent."),
          category: categorySchema.describe(
            "What is missing: tool, permission, data, or other.",
          ),
          title: z
            .string()
            .min(1)
            .describe("Short name of the capability you needed."),
          description: z
            .string()
            .min(1)
            .describe("What you needed and why the task could not be finished."),
          task_context: z
            .string()
            .optional()
            .describe("The task you were trying to complete."),
          workaround: z
            .string()
            .optional()
            .describe("What you did instead, if anything."),
          severity: z
            .number()
            .int()
            .min(1)
            .max(5)
            .describe("1 is a nice-to-have. 5 means you were completely blocked."),
        }),
      },
      async ({
        agent_name,
        category,
        title,
        description,
        task_context,
        workaround,
        severity,
      }) => {
        const supabase = createServiceClient();
        const { data, error } = await supabase
          .from("wishes")
          .insert({
            agent_name,
            category,
            title,
            description,
            task_context: task_context ?? null,
            workaround: workaround ?? null,
            severity,
          })
          .select("id")
          .single();

        if (error || !data) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Failed to file wish: ${error?.message ?? "unknown error"}`,
              },
            ],
          };
        }

        scheduleCluster();

        return {
          content: [
            {
              type: "text",
              text: `Wish filed. Humans will see it on the dashboard.\nWish id: ${data.id}`,
            },
          ],
        };
      },
    );

    server.registerTool(
      "list_top_wishes",
      {
        title: "List top wishes",
        description:
          "Call this before filing a new wish, to check whether another agent already asked for the same capability. Returns the highest-scoring clusters.",
        inputSchema: z.object({
          limit: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .describe("How many clusters to return. Defaults to 5."),
        }),
      },
      async ({ limit }) => {
        const supabase = createServiceClient();
        const { data, error } = await supabase
          .from("clusters")
          .select("title, summary, wish_count, status")
          .order("score", { ascending: false })
          .limit(limit ?? 5);

        if (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Failed to list wishes: ${error.message}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data ?? [], null, 2),
            },
          ],
        };
      },
    );

    server.registerTool(
      "upvote_wish",
      {
        title: "Upvote a wish",
        description:
          "Call this when list_top_wishes already contains the capability you need. It records your support on that cluster so humans rank it higher. Do not file a second wish for the same thing.",
        inputSchema: z.object({
          cluster_id: z
            .string()
            .uuid()
            .describe("The cluster id of the existing wish."),
          agent_name: z.string().min(1).describe("Your name or role."),
        }),
      },
      async ({ cluster_id, agent_name }) => {
        const supabase = createServiceClient();
        const { data: cluster, error: clusterError } = await supabase
          .from("clusters")
          .select("id, title, summary, category")
          .eq("id", cluster_id)
          .maybeSingle();

        if (clusterError || !cluster) {
          return {
            isError: true,
            content: [{ type: "text", text: "Cluster not found." }],
          };
        }

        const { data, error } = await supabase
          .from("wishes")
          .insert({
            agent_name,
            category: cluster.category ?? "other",
            title: cluster.title ?? "Upvote",
            description: cluster.summary ?? `Upvoted by ${agent_name}`,
            severity: 3,
            cluster_id,
          })
          .select("id")
          .single();

        if (error || !data) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Failed to upvote: ${error?.message ?? "unknown error"}`,
              },
            ],
          };
        }

        const { error: statsError } = await supabase.rpc(
          "recompute_cluster_stats",
          { cluster: cluster_id },
        );

        if (statsError) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Upvote saved but stats failed: ${statsError.message}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Upvoted cluster ${cluster_id}. Wish id: ${data.id}`,
            },
          ],
        };
      },
    );
  },
  {
    serverInfo: { name: "agent-wishlist", version: "0.1.0" },
    instructions:
      "When a task is blocked by a missing tool, permission, or data, call list_top_wishes first. Use upvote_wish if a cluster already matches. Otherwise call file_wish before you give up.",
  },
);

function withApiKey(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    const expected = process.env.MCP_API_KEY;
    const header = req.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ")
      ? header.slice("Bearer ".length)
      : "";

    if (!expected || token !== expected) {
      return new Response("Unauthorized", { status: 401 });
    }

    return handler(req);
  };
}

const handler = withApiKey(mcpHandler);

export const dynamic = "force-dynamic";

export { handler as GET, handler as POST, handler as DELETE };
