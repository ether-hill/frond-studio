import Link from "next/link";

export default function Wordmark({
  size = 25,
  link = true,
}: {
  size?: number;
  link?: boolean;
}) {
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
          width: "100%",
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
