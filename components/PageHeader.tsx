type Props = {
  eyebrow?: string;
  title: string;
  intro?: string;
  introSerif?: boolean;
};

export default function PageHeader({ eyebrow, title, intro, introSerif }: Props) {
  return (
    <div>
      {eyebrow ? (
        <div
          data-rv
          style={{
            display: "flex",
            alignItems: "center",
            gap: 13,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: "var(--fg-dim)",
            marginBottom: "clamp(20px,3vh,30px)",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
          {eyebrow}
        </div>
      ) : null}

      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontWeight: 600,
          fontSize: "clamp(52px,9vw,148px)",
          lineHeight: 0.92,
          letterSpacing: "-0.035em",
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
            transitionDelay: "0.2s",
            maxWidth: introSerif ? "26ch" : 620,
            marginTop: "clamp(24px,3.5vh,42px)",
            fontFamily: introSerif ? "var(--font-display), sans-serif" : "var(--font-body), sans-serif",
            fontSize: introSerif ? "clamp(24px,2.6vw,40px)" : "clamp(16px,1.4vw,19px)",
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
