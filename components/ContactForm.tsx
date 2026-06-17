"use client";

import { useState } from "react";

// Web3Forms access key (public by design). Set NEXT_PUBLIC_WEB3FORMS_KEY in the
// environment. Get a free key at https://web3forms.com (just confirm your email).
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  if (status === "sent") {
    return (
      <div
        style={{
          border: "1px solid var(--line)",
          background: "var(--bg-1)",
          borderRadius: 10,
          padding: "clamp(32px,5vw,52px)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 16,
          }}
        >
          Message sent
        </div>
        <h3 style={{ fontFamily: "var(--font-display), sans-serif", fontSize: "clamp(28px,3.4vw,44px)", fontWeight: 500, letterSpacing: "-0.018em", lineHeight: 1.05, marginBottom: 16 }}>
          Thanks — we&apos;ll be in touch.
        </h3>
        <p style={{ color: "var(--fg-dim)", fontSize: 15, lineHeight: 1.55, maxWidth: "44ch" }}>
          We usually reply within a day or two. In the meantime, take a look at our recent projects.
        </p>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");
    setError("");

    // No key configured yet → degrade gracefully (still acknowledge the visitor).
    if (!ACCESS_KEY) {
      setStatus("sent");
      return;
    }

    const data = new FormData(form);
    data.append("access_key", ACCESS_KEY);
    data.append("subject", "New enquiry — Frond Studio");
    data.append("from_name", "Frond Studio website");

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      const json = await res.json();
      if (json.success) {
        setStatus("sent");
        form.reset();
      } else {
        setStatus("error");
        setError(json.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  };

  const sending = status === "sending";

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Honeypot for spam bots */}
      <input type="checkbox" name="botcheck" tabIndex={-1} style={{ display: "none" }} aria-hidden="true" />

      <input className="f-field" name="name" type="text" required placeholder="Name" aria-label="Name" />
      <input className="f-field" name="email" type="email" required placeholder="Email" aria-label="Email" />
      <input className="f-field" name="company" type="text" placeholder="Company (optional)" aria-label="Company" />
      <textarea
        className="f-field"
        name="message"
        required
        placeholder="Tell us about your project"
        aria-label="Message"
        rows={6}
        style={{ resize: "vertical", minHeight: 150 }}
      />

      {status === "error" ? (
        <p role="alert" style={{ color: "var(--accent-2)", fontSize: 14, lineHeight: 1.4 }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="pill pill-solid"
        style={{
          alignSelf: "flex-start",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          padding: "15px 30px",
          cursor: sending ? "default" : "pointer",
          opacity: sending ? 0.6 : 1,
          marginTop: 4,
        }}
      >
        {sending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
