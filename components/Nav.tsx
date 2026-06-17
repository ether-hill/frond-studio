"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NAV_LINKS } from "@/lib/site";
import Wordmark from "./Wordmark";
import ThemeToggle from "./ThemeToggle";

export default function Nav() {
  const navRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Scroll-direction show/hide with a few px hysteresis.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const el = navRef.current;
      if (el) {
        if (y < 8) el.setAttribute("data-nav", "top");
        else if (y > lastY + 3) el.setAttribute("data-nav", "hidden");
        else if (y < lastY - 3) el.setAttribute("data-nav", "solid");
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Body scroll lock + focus management + Escape while the mobile menu is open.
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMenuOpen(false);
      };
      document.addEventListener("keydown", onKey);
      menuRef.current?.querySelector<HTMLElement>("a,button")?.focus();
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
        burgerRef.current?.focus();
      };
    }
    document.body.style.overflow = "";
  }, [menuOpen]);

  const labelStyle: React.CSSProperties = { fontFamily: "var(--font-mono)" };

  return (
    <>
      <header ref={navRef} className="nav-bar" data-nav="top">
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            padding: "16px var(--gutter)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <Wordmark />

          <div style={{ display: "flex", alignItems: "center", gap: "clamp(18px,2.4vw,40px)" }}>
            <nav
              className="nav-links"
              aria-label="Primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 36,
                ...labelStyle,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--fg-dim)",
              }}
            >
              {NAV_LINKS.map((l) => (
                <Link key={l.href} className="linku" href={l.href}>
                  {l.label}
                </Link>
              ))}
            </nav>

            <ThemeToggle />

            <button
              ref={burgerRef}
              className="nav-burger"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              style={{
                alignItems: "center",
                gap: 9,
                border: "1px solid var(--line)",
                background: "transparent",
                color: "var(--fg)",
                borderRadius: 999,
                padding: "10px 17px",
                cursor: "pointer",
                ...labelStyle,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        ref={menuRef}
        id="mobile-menu"
        className="m-menu"
        data-open={menuOpen}
        aria-hidden={!menuOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "var(--bg-0)",
          display: "flex",
          flexDirection: "column",
          padding: "18px 24px 40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Wordmark size={24} link={false} />
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            style={{
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--fg)",
              borderRadius: 999,
              padding: "10px 18px",
              cursor: "pointer",
              ...labelStyle,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Close
          </button>
        </div>

        <nav
          aria-label="Site"
          style={{ margin: "auto 0", display: "flex", flexDirection: "column", gap: 2 }}
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              className="mlink"
              href={l.href}
              onClick={() => setMenuOpen(false)}
              tabIndex={menuOpen ? 0 : -1}
              style={{
                fontFamily: "var(--font-display), sans-serif",
                fontSize: "clamp(44px,15vw,76px)",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                lineHeight: 1.16,
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            borderTop: "1px solid var(--line)",
            paddingTop: 24,
          }}
        >
          <Link
            href="/contact"
            onClick={() => setMenuOpen(false)}
            tabIndex={menuOpen ? 0 : -1}
            className="pill pill-ghost"
            style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", padding: "12px 22px" }}
          >
            Start a project
          </Link>
        </div>
      </div>
    </>
  );
}
