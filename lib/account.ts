import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { createServiceClient } from "@/lib/supabase-server";

export type Account = {
  userId: string;
  email: string;
  mcpApiKey: string;
};

export const accountStore = new AsyncLocalStorage<{ userId: string }>();

export function currentUserId() {
  return accountStore.getStore()?.userId ?? null;
}

export async function lookupUserIdByApiKey(token: string) {
  if (!token) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("user_id")
    .eq("mcp_api_key", token)
    .maybeSingle();
  if (error || typeof data?.user_id !== "string") return null;
  return data.user_id;
}

function newKey() {
  return `awl_${randomBytes(24).toString("hex")}`;
}

export async function ensureAccount(user: { id: string; email?: string | null }) {
  const supabase = createServiceClient();
  const existing = await supabase
    .from("accounts")
    .select("user_id, mcp_api_key")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing.error) {
    const missing = existing.error.message.toLowerCase().includes("accounts");
    throw new Error(
      missing
        ? "Accounts are not set up yet. Run supabase/auth.sql in the Supabase SQL editor, then sign in again."
        : existing.error.message,
    );
  }

  if (typeof existing.data?.user_id === "string" && typeof existing.data.mcp_api_key === "string") {
    return {
      userId: existing.data.user_id,
      email: user.email ?? "",
      mcpApiKey: existing.data.mcp_api_key,
    } satisfies Account;
  }

  const created = await supabase
    .from("accounts")
    .insert({ user_id: user.id, mcp_api_key: newKey() })
    .select("user_id, mcp_api_key")
    .single();

  if (created.error || typeof created.data?.user_id !== "string" || typeof created.data.mcp_api_key !== "string") {
    throw new Error(created.error?.message ?? "Could not issue an MCP key");
  }

  return {
    userId: created.data.user_id,
    email: user.email ?? "",
    mcpApiKey: created.data.mcp_api_key,
  } satisfies Account;
}

export async function requireAccount() {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return ensureAccount(data.user);
}
