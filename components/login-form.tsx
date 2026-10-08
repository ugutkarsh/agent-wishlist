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
      {creating ? (
        <label className="block text-sm text-zinc-200">
          Name
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            className="mt-1.5 w-full rounded-2xl border border-white/15 bg-zinc-950/80 px-3 py-2.5 text-zinc-50 outline-none ring-amber-300/40 placeholder:text-zinc-600 focus:ring-2"
            placeholder="Ada Lovelace"
          />
        </label>
      ) : null}
      <label className="block text-sm text-zinc-200">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1.5 w-full rounded-2xl border border-white/15 bg-zinc-950/80 px-3 py-2.5 text-zinc-50 outline-none ring-amber-300/40 placeholder:text-zinc-600 focus:ring-2"
          placeholder="you@company.com"
        />
      </label>
      <label className="block text-sm text-zinc-200">
        Password
        <input
          name="password"
          type="password"
          autoComplete={creating ? "new-password" : "current-password"}
          minLength={8}
          required
          className="mt-1.5 w-full rounded-2xl border border-white/15 bg-zinc-950/80 px-3 py-2.5 text-zinc-50 outline-none ring-amber-300/40 placeholder:text-zinc-600 focus:ring-2"
          placeholder="At least 8 characters"
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-amber-300 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-200 disabled:opacity-50"
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
