"use client";

import { useState } from "react";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Footer newsletter signup — email + submit. POSTs to /api/subscribe (a stub
 * that validates and accepts; connect a real provider there to actually
 * capture). Shows inline success / error states; degrades to a plain form.
 */
export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "loading") return;
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setState("error");
      setMsg("Please enter a valid email.");
      return;
    }
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) throw new Error();
      setState("done");
      setEmail("");
    } catch {
      setState("error");
      setMsg("Something went wrong — try again?");
    }
  };

  if (state === "done") {
    return (
      <p style={{ color: "var(--fg-dim)", fontSize: "var(--text-body)", lineHeight: 1.55, maxWidth: "30ch" }}>
        You&apos;re on the list — thanks for signing up. 🌱
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="news-form" noValidate>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === "error") setState("idle");
        }}
        placeholder="you@email.com"
        aria-label="Email address"
        aria-invalid={state === "error"}
        className="news-input"
      />
      <button type="submit" className="pill pill-solid news-btn" disabled={state === "loading"}>
        {state === "loading" ? "…" : "Sign up"}
      </button>
      {state === "error" && (
        <span className="news-msg" role="alert">
          {msg}
        </span>
      )}
    </form>
  );
}
