"use client";

/**
 * Shared RANDOMISE control for live generative backgrounds. Dispatches a window
 * event the matching canvas listens for (the CTA mycelium, the hero Jones model).
 * `variant="circle"` is the big round hero treatment (a small caption over a
 * larger RANDOMISE label, with an occasional subtle bounce); the default `pill`
 * is the compact corner chip used elsewhere.
 */
export default function RandomiseButton({
  event,
  label = "Randomise ↻",
  caption,
  title,
  position = "top-right",
  variant = "pill",
}: {
  event: string;
  label?: string;
  caption?: string;
  title?: string;
  position?: "top-right" | "bottom-right";
  variant?: "pill" | "circle";
}) {
  const fire = () => window.dispatchEvent(new CustomEvent(event));

  if (variant === "circle") {
    return (
      <button type="button" className="rand-circle" aria-label={title || "Randomise the background"} onClick={fire}>
        {caption && <span className="rand-circle-cap">{caption}</span>}
        <span className="rand-circle-label">{label}</span>
      </button>
    );
  }

  const vEdge =
    position === "bottom-right"
      ? { bottom: "clamp(20px,3vw,32px)" }
      : { top: "clamp(20px,3vw,32px)" };
  return (
    <button
      type="button"
      aria-label={title || "Randomise the background"}
      onClick={fire}
      style={{
        position: "absolute",
        ...vEdge,
        right: "var(--content-edge)",
        zIndex: 4,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--fg-dim)",
        background: "color-mix(in srgb, var(--bg-0) 55%, transparent)",
        border: "1px solid var(--line)",
        borderRadius: 999,
        padding: "10px 18px",
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
