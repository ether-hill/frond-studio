import Link from "next/link";

export default function Wordmark({
  size = 25,
  link = true,
}: {
  size?: number;
  link?: boolean;
}) {
  const inner = (
    <span style={{ display: "flex", flexDirection: "column", lineHeight: 1, gap: 3 }}>
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
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.44em",
          textTransform: "uppercase",
          color: "var(--fg-dim)",
          paddingLeft: 1,
        }}
      >
        Studio
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
