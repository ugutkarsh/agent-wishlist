import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in · Agent Wishlist",
  description: "Sign in to see your agents' wishes.",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Agent Wishlist</h1>
      <p className="mt-2 text-zinc-400">
        Sign in to see only your wishes. Each account gets its own MCP key.
      </p>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <LoginForm />
      </div>
    </main>
  );
}
