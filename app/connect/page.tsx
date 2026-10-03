import type { Metadata } from "next";
import Link from "next/link";
import { ConnectPanel } from "@/components/connect-panel";

export const metadata: Metadata = {
  title: "Connect an agent · Agent Wishlist",
  description: "Point Claude or Cursor at the Agent Wishlist MCP server.",
};

export default function ConnectPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          Agent Wishlist
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Connect an agent</h1>
        <p className="mt-2 text-zinc-400">
          Point Claude or Cursor at this MCP server. The demo agent that files wishes
          is Claude, connected this way.
        </p>
      </div>
      <ConnectPanel />
    </main>
  );
}
