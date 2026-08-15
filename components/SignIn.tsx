"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { raterLabel } from "@/lib/name";

/*
 * Password sign-in rather than magic links. Supabase's built-in mailer allows
 * only a couple of emails per hour per project, shared across the whole crew,
 * and every attempt spends one — which made email links unusable for a group
 * of three who all sign in around the same time. Accounts are created by hand
 * in the Supabase dashboard; there is deliberately no self-signup, since crew
 * membership is a fixed list.
 */
export function SignIn() {
  const { user, profile, isCrew, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);

    if (signInError) {
      // "Email not confirmed" means the dashboard account was created without
      // Auto Confirm ticked, which is a different fix from a wrong password.
      setError(
        /not confirmed/i.test(signInError.message)
          ? "That account still needs confirming — re-create it in Supabase with “Auto Confirm User” ticked."
          : signInError.message,
      );
      return;
    }

    setOpen(false);
    setPassword("");
  }

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="min-w-0 truncate text-muted">
          {profile ? raterLabel(profile.display_name) : user.email}
          {!isCrew && " · read only"}
        </span>
        <button
          onClick={signOut}
          className="shrink-0 rounded-md px-2 py-1 font-medium text-muted hover:bg-surface-hover hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface-hover"
      >
        Crew sign in
      </button>
    );
  }

  return (
    <form onSubmit={signIn} className="flex flex-col gap-2">
      <input
        type="email"
        required
        autoFocus
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-foreground"
      />
      <input
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-foreground"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-9 flex-1 rounded-lg bg-foreground px-3 text-xs font-medium text-background disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="h-9 rounded-lg px-3 text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-accent">{error}</p>}
    </form>
  );
}
