"use server";

import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";

type AuthResult = { error: string } | { message: string };

function credentials(formData: FormData): { error: string } | { email: string; password: string } {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email.includes("@") || password.length < 8) {
    return { error: "Use a valid email and a password of at least 8 characters." };
  }
  return { email, password };
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const parsed = credentials(formData);
  if ("error" in parsed) return parsed;

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword(parsed);
  if (error) return { error: error.message };
  redirect("/");
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const parsed = credentials(formData);
  if ("error" in parsed) return parsed;

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signUp(parsed);
  if (error) return { error: error.message };
  if (!data.session) {
    return {
      message: "Account created. Confirm the email from Supabase, then sign in.",
    };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/login");
}
