import Link from "next/link";

export default function Wordmark({
  size = 25,
  link = true,
}: {
  size?: number;
  link?: boolean;
}) {
  // The STUDIO letters are flush-distributed to "Frond"'s box width via
  // space-between, which aligns the glyph *boxes*. But in Schibsted Grotesk the
  // "d" stem sits ~0.0795em inside its box (right side bearing) while the "o"
  // sits only ~0.41px inside, so the o's ink lands a hair right of the d's.
  // Pull the row in by that side-bearing difference so the two ink edges meet.
  const oEdgeAlign = size * 0.0795 - 0.41;
  const inner = (
    <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1, gap: 3 }}>
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
          width: `calc(100% - ${oEdgeAlign}px)`,
          fontFamily: "var(--font-body), sans-serif",
          fontSize: 10,
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
