import Link from "next/link";

export default function Wordmark({
  size = 25,
  link = true,
}: {
  size?: number;
  link?: boolean;
}) {
  // STUDIO is set to 0.4× the Frond size and letter-spaced (space-between) so its
  // ink box is *exactly* as wide as "Frond" — both edges flush. space-between
  // would only align the glyph boxes, but Schibsted Grotesk's side bearings differ
  // (F ink-left 0.080em vs S 0.012em; d vs o on the right), so the row is nudged
  // in by those differences. Coefficients are derived from the font's glyph bounds
  // and the measured Frond ink span; everything scales with `size`.
  const studioSize = size * 0.4;
  const colGap = size * 0.12;
  const studioLeft = size * 0.06855; // S box-left so S ink-left meets F ink-left
  const studioWidth = size * 2.55365; // row width so O ink-right meets d ink-right
  const inner = (
    <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1, gap: colGap }}>
      <span
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: size,
          fontWeight: 400,
          letterSpacing: "0.005em",
        }}
      >
        Frond
      </span>
      <span
        aria-label="Studio"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginLeft: studioLeft,
          width: studioWidth,
          fontFamily: "var(--font-body), sans-serif",
          fontSize: studioSize,
          fontWeight: 500,
          textTransform: "uppercase",
          color: "var(--fg-dim)",
        }}
      >
        {"Studio".split("").map((letter, i) => (
          <span key={i} aria-hidden="true">
            {letter}
          </span>
        ))}
      </span>
    </span>
  );

  if (!link) return inner;
  return (
    <Link href="/" aria-label="Frond Studio — home">
      {inner}
    </Link>
  );
}
