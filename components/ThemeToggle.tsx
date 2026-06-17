"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

/**
 * Light/dark switch. The actual theme is set on <html data-theme> before paint
 * by the inline script in the layout (no flash); this control flips it and
 * persists the choice. The glyph is a half-filled circle — a literal "inversion"
 * mark — that rotates on toggle.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
    setTheme(current);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("frond-theme", next);
    } catch {
      /* storage blocked — session-only is fine */
    }
    setTheme(next);
  };

  const nextLabel = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label={`Switch to ${nextLabel} theme`}
      title={`Switch to ${nextLabel} theme`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        style={{
          display: "block",
          // Suppress the rotate until mounted so SSR/CSR match.
          transform: mounted && theme === "light" ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 3 A9 9 0 0 1 12 21 Z" fill="currentColor" />
      </svg>
    </button>
  );
}
