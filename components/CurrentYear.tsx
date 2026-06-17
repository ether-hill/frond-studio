"use client";

import { useEffect, useState } from "react";

/** Renders the current year, correcting to the browser's clock after hydration
 * so the copyright rolls over to the new year automatically (no redeploy). */
export default function CurrentYear() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);
  return <span suppressHydrationWarning>{year}</span>;
}
