// Pollinator Lab — inline SVG icon set (nav rail, category glyphs, fact icons,
// tool rail). All hand-drawn line/solid marks so the app is fully self-contained
// with no image assets.

import type { ReactNode } from "react";

const wrap = (children: ReactNode, vb = "0 0 24 24") => (
  <svg viewBox={vb} width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export function Glyph({ name }: { name: string }) {
  switch (name) {
    case "flower":
      return wrap(
        <>
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="12" cy="6.2" rx="2.1" ry="3.4" transform={`rotate(${a} 12 12)`} />
          ))}
        </>
      );
    case "chevron":
      return wrap(<path d="M9 6l6 6-6 6" />);
    case "arrow-left":
      return wrap(<path d="M15 6l-6 6 6 6" />);
    case "reset":
      return wrap(<><path d="M4 12a8 8 0 1 0 2.3-5.6" /><path d="M4 4v3.5H7.5" /></>);
    case "expand":
      return wrap(<><path d="M4 9V4h5" /><path d="M20 15v5h-5" /><path d="M20 9V4h-5" /><path d="M4 15v5h5" /></>);
    case "info":
      return wrap(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r="0.6" fill="currentColor" /></>);
    case "more":
      return wrap(<><circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" /></>);
    // nav rail
    case "nav-home":
      return wrap(<><path d="M4 11l8-6 8 6" /><path d="M6 10v9h12v-9" /></>);
    case "nav-explore":
      return wrap(<><circle cx="12" cy="12" r="8.5" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>);
    case "nav-notes":
      return wrap(<><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 9h8M8 13h6" /></>);
    case "nav-garden":
      return wrap(<><path d="M12 20v-7" /><path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5z" /><path d="M12 13c3 0 5-2 5-5-3 0-5 2-5 5z" /></>);
    case "nav-learn":
      return wrap(<><path d="M3 8l9-4 9 4-9 4z" /><path d="M7 10v5c0 1.5 10 1.5 10 0v-5" /></>);
    case "nav-more":
      return wrap(<circle cx="12" cy="12" r="8.5" />);
    // categories
    case "cat-bees":
      return wrap(<><ellipse cx="12" cy="13" rx="4" ry="6" /><path d="M8 11h8M8 14h8" /><path d="M8 9C5 6 3 7 4 9M16 9c3-3 5-2 4 0" /><circle cx="12" cy="6" r="1.6" /></>);
    case "cat-moths":
      return wrap(<><path d="M12 8v9" /><path d="M12 9C9 5 3 5 4 10c-1 4 5 5 8 2" /><path d="M12 9c3-4 9-4 8 1 1 4-5 5-8 2" /></>);
    case "cat-beetles":
      return wrap(<><ellipse cx="12" cy="13" rx="5" ry="6.5" /><path d="M12 7v12" /><circle cx="12" cy="6" r="1.4" /><path d="M7 11l-3-1M17 11l3-1M7 15l-3 1M17 15l3 1" /></>);
    case "cat-hummingbirds":
      return wrap(<><path d="M6 10c3-2 7-1 9 2" /><path d="M15 12l5-1" /><path d="M6 10c-2 3-1 6 2 7l3-4" /><circle cx="8" cy="9" r="0.6" fill="currentColor" /></>);
    case "cat-bats":
      return wrap(<><path d="M12 8v7" /><path d="M12 9C9 6 5 8 3 6c0 4 2 6 4 6l5 1" /><path d="M12 9c3-3 7-1 9-3 0 4-2 6-4 6l-5 1" /><path d="M11 7l1-1 1 1" /></>);
    // sprigs
    case "sprig-l":
      return wrap(<><path d="M3 20c6-1 10-5 12-11" /><circle cx="16" cy="8" r="1.4" fill="currentColor" stroke="none" /><circle cx="10" cy="14" r="1.2" fill="currentColor" stroke="none" /><circle cx="6" cy="18" r="1" fill="currentColor" stroke="none" /></>);
    case "sprig-r":
      return wrap(<><path d="M21 20c-6-1-10-5-12-11" /><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" /><circle cx="14" cy="14" r="1.2" fill="currentColor" stroke="none" /><circle cx="18" cy="18" r="1" fill="currentColor" stroke="none" /></>);
    // top actions
    case "act-notebook":
      return wrap(<><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 4v16" /><path d="M12 9h4M12 13h4" /></>);
    case "act-compare":
      return wrap(<><circle cx="8" cy="12" r="4" /><circle cx="16" cy="12" r="4" /></>);
    case "act-share":
      return wrap(<><circle cx="6" cy="12" r="2" /><circle cx="17" cy="6" r="2" /><circle cx="17" cy="18" r="2" /><path d="M8 11l7-4M8 13l7 4" /></>);
    default:
      return wrap(<circle cx="12" cy="12" r="8" />);
  }
}

export function FactIcon({ name }: { name: string }) {
  switch (name) {
    case "hex":
      return wrap(<path d="M12 3l7 4.5v9L12 21l-7-4.5v-9z" />);
    case "grid":
      return wrap(<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>);
    case "flower":
      return <Glyph name="flower" />;
    case "pin":
      return wrap(<><path d="M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11z" /><circle cx="12" cy="10" r="2" /></>);
    case "leaf":
      return wrap(<><path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z" /><path d="M5 19c4-5 8-8 12-10" /></>);
    default:
      return wrap(<circle cx="12" cy="12" r="8" />);
  }
}

export function ToolIcon({ name }: { name: string }) {
  switch (name) {
    case "3D":
      return wrap(<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></>);
    case "Size":
      return wrap(<><path d="M4 8V4h4M20 16v4h-4M4 4l16 16" /></>);
    case "Scope":
      return wrap(<><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4M11 8v6M8 11h6" /></>);
    case "AR View":
      return wrap(<><path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" /><circle cx="12" cy="12" r="2.5" /></>);
    default:
      return wrap(<circle cx="12" cy="12" r="8" />);
  }
}
