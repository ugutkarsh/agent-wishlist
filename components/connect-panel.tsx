"use client";

import { useEffect, useState } from "react";

const SYSTEM_PROMPT =
  "If you can't complete a task because of a missing tool, permission, or data, call file_wish before giving up";

function config(url: string) {
  return JSON.stringify(
    {
      mcpServers: {
        "agent-wishlist": {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            url,
            "--header",
            "Authorization:${AUTH_HEADER}",
          ],
          env: {
            AUTH_HEADER: "Bearer YOUR_MCP_API_KEY",
          },
        },
      },
    },
    null,
    2,
  );
}

export function ConnectPanel() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setUrl(`${window.location.origin}/api/mcp/mcp`);
  }, []);

  async function copy(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1600);
  }

  const snippet = url ? config(url) : "";

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">MCP URL</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <code className="flex-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-amber-100">
            {url || "Loading URL..."}
          </code>
          <button
            type="button"
            disabled={!url}
            onClick={() => copy("url", url)}
            className="rounded-full border border-white/10 px-4 py-2 text-sm disabled:opacity-50"
          >
            {copied === "url" ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Claude Desktop and Cursor</h2>
        <p className="text-sm leading-6 text-zinc-400">
          Replace <span className="text-zinc-200">YOUR_MCP_API_KEY</span> with the
          value from your <span className="text-zinc-200">.env.local</span>. Paste
          the JSON into Claude Desktop at{" "}
          <span className="text-zinc-200">
            ~/Library/Application Support/Claude/claude_desktop_config.json
          </span>{" "}
          and into Cursor at <span className="text-zinc-200">~/.cursor/mcp.json</span>{" "}
          (or the project <span className="text-zinc-200">.cursor/mcp.json</span>).
          The header has no space before the variable so Claude Desktop and Cursor
          pass it through correctly. Restart the client after saving.
        </p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-zinc-200">
            {snippet || "Loading config..."}
          </pre>
          <button
            type="button"
            disabled={!snippet}
            onClick={() => copy("config", snippet)}
            className="absolute top-3 right-3 rounded-full border border-white/10 bg-zinc-950 px-3 py-1 text-xs disabled:opacity-50"
          >
            {copied === "config" ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">System prompt snippet</h2>
        <p className="text-sm text-zinc-400">
          Add this to the agent&apos;s instructions so it files a wish instead of
          failing quietly.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm leading-6">
            {SYSTEM_PROMPT}
          </p>
          <button
            type="button"
            onClick={() => copy("prompt", SYSTEM_PROMPT)}
            className="rounded-full border border-white/10 px-4 py-2 text-sm"
          >
            {copied === "prompt" ? "Copied" : "Copy"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">The three tools</h2>
        <ul className="space-y-3 text-sm leading-6 text-zinc-300">
          <li>
            <span className="font-medium text-zinc-100">file_wish</span> — call this
            when you cannot finish a task because a tool, permission, or data is
            missing. Say what you needed and why.
          </li>
          <li>
            <span className="font-medium text-zinc-100">list_top_wishes</span> — call
            this first to see whether another agent already asked for the same thing.
          </li>
          <li>
            <span className="font-medium text-zinc-100">upvote_wish</span> — if a
            cluster already matches, add your support instead of filing a duplicate.
          </li>
        </ul>
      </section>
    </div>
  );
}
