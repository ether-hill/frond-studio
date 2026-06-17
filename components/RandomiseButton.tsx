"use client";

/**
 * Shared RANDOMISE control for live generative backgrounds. Dispatches a window
 * event the matching canvas listens for (the CTA mycelium, the hero Jones model).
 */
export default function RandomiseButton({
  event,
  label = "Randomise ↻",
  title,
  position = "top-right",
}: {
  event: string;
  label?: string;
  title?: string;
  position?: "top-right" | "bottom-right";
}) {
  const vEdge =
    position === "bottom-right"
      ? { bottom: "clamp(20px,3vw,32px)" }
      : { top: "clamp(20px,3vw,32px)" };
  return (
    <button
      type="button"
      aria-label={title || "Randomise the background"}
      onClick={() => window.dispatchEvent(new CustomEvent(event))}
      style={{
        position: "absolute",
        ...vEdge,
        right: "clamp(20px,3vw,32px)",
        zIndex: 4,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--fg-dim)",
        background: "color-mix(in srgb, var(--bg-0) 55%, transparent)",
        border: "1px solid var(--line)",
        borderRadius: 3,
        padding: "9px 14px",
        cursor: "pointer",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        transition: "color .2s, border-color .2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--fg)";
        e.currentTarget.style.borderColor = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--fg-dim)";
        e.currentTarget.style.borderColor = "var(--line)";
      }}
    >
      {label}
    </button>
  );
}
