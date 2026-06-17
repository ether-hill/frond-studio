"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Guarantees every route opens at the top. Next's App Router usually does this,
 * but the global smooth-scroll + tall generative pages let it occasionally land
 * mid-page; this forces an instant jump to the top on every pathname change.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // disable native scroll restoration so back/forward don't fight this
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
