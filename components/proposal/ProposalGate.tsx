"use client";

import { useEffect, useState } from "react";
import ProposalView, { type ProposalDoc } from "./ProposalView";
import s from "./proposal.module.css";

export type Sealed = { v: number; iterations: number; salt: string; iv: string; data: string };

const fromB64 = (b: string) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));

async function open(sealed: Sealed, password: string): Promise<ProposalDoc> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: fromB64(sealed.salt), iterations: sealed.iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(sealed.iv) }, key, fromB64(sealed.data));
  return JSON.parse(new TextDecoder().decode(plain));
}

export default function ProposalGate({ sealed, storageKey }: { sealed: Sealed; storageKey: string }) {
  const [doc, setDoc] = useState<ProposalDoc | null>(null);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "wrong" | "restoring">("restoring");

  // Reopen without asking again in the same browser session.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(storageKey);
    } catch {}
    if (!saved) return setState("idle");
    open(sealed, saved)
      .then((d) => setDoc(d))
      .catch(() => setState("idle"));
  }, [sealed, storageKey]);

  // Jump to the section in the URL once the content exists.
  useEffect(() => {
    if (!doc || !location.hash) return;
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }, [doc]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    try {
      const d = await open(sealed, password.trim());
      try {
        sessionStorage.setItem(storageKey, password.trim());
      } catch {}
      setDoc(d);
    } catch {
      setState("wrong");
    }
  }

  if (doc) return <ProposalView doc={doc} />;

  return (
    <main className={s.gate}>
      {state !== "restoring" && (
        <form className={s.gateForm} onSubmit={submit}>
          <h1 className={s.gateTitle}>This page is private</h1>
          <p className={s.gateText}>Enter the password you were sent to read the proposal.</p>
          <label className={s.srOnly} htmlFor="proposal-password">Password</label>
          <div className={s.gateRow}>
            <input
              id="proposal-password"
              className={s.gateInput}
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (state === "wrong") setState("idle");
              }}
              placeholder="Password"
            />
            <button className={s.gateButton} type="submit" disabled={!password || state === "busy"}>
              {state === "busy" ? "Opening" : "Open"}
            </button>
          </div>
          <p className={s.gateError} aria-live="polite">
            {state === "wrong" ? "That password did not work. Check it and try again." : ""}
          </p>
        </form>
      )}
    </main>
  );
}
