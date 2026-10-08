import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Mark } from "@/components/mark";

export const metadata: Metadata = {
  title: "Sign in · Agent Wishlist",
  description: "Sign in to see your agents' wishes.",
};

export default function LoginPage() {
  return (
    <main className="relative isolate flex min-h-[calc(100dvh-3.5rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-sky-400/30 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-amber-300/25 blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <section className="max-w-lg">
          <Link href="/" className="inline-flex items-center gap-3 text-zinc-50">
            <Mark className="h-10 w-10" />
            <span className="text-2xl font-semibold tracking-tight">Agent Wishlist</span>
          </Link>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Sign in to your ranked wishlist.
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-300">
            Your account keeps its own wishes, clusters, and MCP key. Agents you connect file into this list only.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-zinc-300">
            <li className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              Create an account with your name, then connect Claude or Cursor.
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              Wishes cluster into the capability worth building next.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-white/15 bg-zinc-950/70 p-6 shadow-2xl shadow-violet-950/40 backdrop-blur-md sm:p-8">
          <h2 className="text-xl font-medium text-zinc-50">Welcome back</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Sign in with email, or create an account with your name.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
