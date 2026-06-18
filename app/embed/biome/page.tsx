import type { Metadata } from "next";
import { Suspense } from "react";
import EmbedMount from "./EmbedMount";

export const metadata: Metadata = {
  title: "Biome — embed",
  robots: { index: false, follow: false },
};

// Chromeless embed page. The card chrome comes from the mini itself, so the wrapper
// just sits flush (no margin, transparent). useSearchParams in EmbedMount requires a
// Suspense boundary under the Next 16 App Router.
export default function BiomeEmbedPage() {
  return (
    <div style={{ margin: 0 }}>
      <Suspense fallback={null}>
        <EmbedMount />
      </Suspense>
    </div>
  );
}
