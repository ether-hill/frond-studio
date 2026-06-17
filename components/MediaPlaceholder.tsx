/**
 * Stand-in for the prototype's <image-slot>. Replace with a real responsive
 * <img>/<video> (or CMS media component) and pass the asset in production.
 */
export default function MediaPlaceholder({ label }: { label?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(120% 120% at 30% 20%, color-mix(in srgb, var(--accent) 8%, var(--media)) 0%, var(--media) 60%)",
      }}
    >
      {label ? (
        <span
          style={{
            fontFamily: "var(--font-body), sans-serif",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--fg-faint)",
            padding: "0 16px",
            textAlign: "center",
          }}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
