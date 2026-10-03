"use client";

import { useState, useTransition } from "react";
import { signIn, signUp } from "@/app/auth-actions";

export function LoginForm() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const creating = mode === "sign-up";

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = creating ? await signUp(form) : await signIn(form);
      if ("error" in result) setError(result.error);
      if ("message" in result) setNotice(result.message);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm text-zinc-300">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-amber-300/60"
        />
      </label>
      <label className="block text-sm text-zinc-300">
        Password
        <input
          name="password"
          type="password"
          autoComplete={creating ? "new-password" : "current-password"}
          minLength={8}
          required
          className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-amber-300/60"
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-200 disabled:opacity-50"
      >
        {pending ? "Working..." : creating ? "Create account" : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(creating ? "sign-in" : "sign-up");
          setError(null);
          setNotice(null);
        }}
        className="w-full text-sm text-zinc-400 hover:text-zinc-200"
      >
        {creating ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </form>
  );
}
