"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { authRedirectTo, useAuth } from "@/lib/useAuth";

export function SignIn() {
  const { user, profile, isCrew, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: authRedirectTo() },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  if (loading) return null;

  if (user) {
    return (
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="min-w-0 truncate text-muted">
          {profile?.display_name ?? user.email}
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

  if (status === "sent") {
    return (
      <p className="rounded-lg border border-border px-3 py-2 text-xs text-muted">
        Check <span className="text-foreground">{email}</span> for a sign-in
        link.
      </p>
    );
  }

  return (
    <form onSubmit={sendLink} className="flex flex-col gap-2">
      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-foreground"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className="flex-1 rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Email me a link"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      {status === "error" && <p className="text-xs text-accent">{message}</p>}
    </form>
  );
}
