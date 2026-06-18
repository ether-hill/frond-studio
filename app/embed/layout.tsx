// Chromeless layout for /embed/* — NO Nav/Footer. The root app/layout.tsx already
// supplies <html>/<body>, fonts and the theme script; embeds get their card chrome
// from the mini builder itself, so the body just needs to be transparent.

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh", background: "var(--bg-0, #0b0a08)" }}>{children}</div>;
}
