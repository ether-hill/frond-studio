type Props = {
  title: string;
  intro?: string;
  introSerif?: boolean;
  /** 25%-smaller headline (used on the design-system reference page). */
  compact?: boolean;
};

export default function PageHeader({ title, intro, introSerif, compact }: Props) {
  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontWeight: 600,
          // page hero; `compact` drops a step (design-system reference page)
          fontSize: compact ? "var(--text-headline)" : "var(--text-display)",
          lineHeight: 0.92,
          letterSpacing: "-0.038em",
        }}
      >
        <span className="mask-line">
          <span>{title}</span>
        </span>
      </h1>

      {intro ? (
        <p
          data-rv
          style={{
            transitionDelay: "0.15s",
            maxWidth: introSerif ? "26ch" : 620,
            marginTop: "clamp(24px,3.5vh,42px)",
            fontFamily: introSerif ? "var(--font-display), sans-serif" : "var(--font-body), sans-serif",
            fontSize: introSerif ? "var(--text-subtitle)" : "var(--text-lead)",
            fontWeight: introSerif ? 400 : undefined,
            lineHeight: introSerif ? 1.18 : 1.55,
            letterSpacing: introSerif ? "-0.012em" : undefined,
            color: introSerif ? "var(--fg)" : "var(--fg-dim)",
          }}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}
