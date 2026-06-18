// Capability graph data — plain module (no "use client") so it can be imported by
// both the server page (the legend) and the client CapabilitiesGraph canvas.
// `val` ≈ where the studio's depth actually sits, inferred from the work (heavy on
// generative/creative coding, biophilic + systems design; lighter on commodity
// bits like stock photography). `LINKS` wire up how the disciplines cross over.

export type CapGroup = "design" | "dev" | "consult" | "ai" | "data" | "media";

export const GROUP_COLORS: Record<CapGroup, [number, number, number]> = {
  design: [255, 94, 160], // pink
  dev: [52, 211, 153], // green
  consult: [179, 156, 246], // purple
  ai: [34, 211, 238], // cyan
  data: [244, 196, 76], // gold
  media: [251, 139, 60], // orange
};

export const CAP_GROUPS: { key: CapGroup; label: string; color: string }[] = [
  { key: "design", label: "Design", color: "rgb(255,94,160)" },
  { key: "dev", label: "Development", color: "rgb(52,211,153)" },
  { key: "consult", label: "Strategy & consulting", color: "rgb(179,156,246)" },
  { key: "ai", label: "Positive AI", color: "rgb(34,211,238)" },
  { key: "data", label: "Data & viz", color: "rgb(244,196,76)" },
  { key: "media", label: "Media & art", color: "rgb(251,139,60)" },
];

export type CapNode = { id: string; label: string; group: CapGroup; val: number };

export const CAP_NODES: CapNode[] = [
  { id: "biophilic", label: "Biophilic design", group: "design", val: 10 },
  { id: "designsystems", label: "Design systems", group: "design", val: 9 },
  { id: "webdesign", label: "Web design", group: "design", val: 8 },
  { id: "brand", label: "Brand & identity", group: "design", val: 7 },
  { id: "artdirection", label: "Art direction", group: "design", val: 7 },
  { id: "uxui", label: "UX / UI", group: "design", val: 7 },
  { id: "motion", label: "Motion design", group: "design", val: 5 },
  { id: "editorial", label: "Editorial", group: "design", val: 4 },

  { id: "creativecoding", label: "Creative coding", group: "dev", val: 10 },
  { id: "generative", label: "Generative systems", group: "dev", val: 9 },
  { id: "frontend", label: "Front-end", group: "dev", val: 8 },
  { id: "webgl", label: "WebGL & shaders", group: "dev", val: 8 },
  { id: "prototyping", label: "Prototyping", group: "dev", val: 7 },
  { id: "fullstack", label: "Full-stack", group: "dev", val: 6 },
  { id: "webaudio", label: "Web Audio", group: "dev", val: 6 },

  { id: "strategy", label: "Strategy", group: "consult", val: 7 },
  { id: "creativedirection", label: "Creative direction", group: "consult", val: 7 },
  { id: "techdirection", label: "Technical direction", group: "consult", val: 6 },
  { id: "research", label: "Research", group: "consult", val: 6 },
  { id: "workshops", label: "Workshops", group: "consult", val: 6 },
  { id: "product", label: "Product thinking", group: "consult", val: 5 },

  { id: "positiveai", label: "Positive AI", group: "ai", val: 8 },
  { id: "aiintegration", label: "AI integration", group: "ai", val: 7 },
  { id: "agentic", label: "Agentic systems", group: "ai", val: 6 },
  { id: "aitooling", label: "AI tooling", group: "ai", val: 6 },

  { id: "dataviz", label: "Data visualisation", group: "data", val: 8 },
  { id: "infodesign", label: "Information design", group: "data", val: 5 },

  { id: "bioart", label: "Bio-art", group: "media", val: 7 },
  { id: "timelapse", label: "Timelapse & film", group: "media", val: 6 },
  { id: "photography", label: "Photography", group: "media", val: 4 },
];

export const CAP_LINKS: [string, string][] = [
  // design
  ["webdesign", "biophilic"], ["designsystems", "biophilic"], ["brand", "biophilic"],
  ["artdirection", "webdesign"], ["uxui", "designsystems"], ["motion", "webdesign"],
  ["editorial", "brand"], ["brand", "artdirection"], ["uxui", "webdesign"],
  // dev
  ["generative", "creativecoding"], ["frontend", "creativecoding"], ["webgl", "creativecoding"],
  ["fullstack", "frontend"], ["webaudio", "creativecoding"], ["prototyping", "frontend"], ["webgl", "generative"],
  // consult
  ["creativedirection", "strategy"], ["techdirection", "strategy"], ["workshops", "strategy"],
  ["research", "strategy"], ["product", "strategy"], ["research", "product"], ["research", "workshops"],
  // ai
  ["aiintegration", "positiveai"], ["agentic", "positiveai"], ["aitooling", "aiintegration"], ["agentic", "aitooling"],
  // data + media
  ["infodesign", "dataviz"], ["timelapse", "bioart"], ["photography", "timelapse"],
  // transdisciplinary hub ring
  ["biophilic", "creativecoding"], ["creativecoding", "positiveai"], ["positiveai", "strategy"],
  ["strategy", "dataviz"], ["dataviz", "bioart"], ["bioart", "biophilic"], ["biophilic", "strategy"],
  // thematic bridges
  ["biophilic", "generative"], ["generative", "bioart"], ["webgl", "dataviz"], ["generative", "dataviz"],
  ["positiveai", "creativecoding"], ["positiveai", "research"], ["designsystems", "frontend"], ["uxui", "frontend"],
  ["motion", "webgl"], ["creativedirection", "artdirection"], ["biophilic", "research"], ["aitooling", "creativecoding"],
  ["techdirection", "frontend"], ["product", "uxui"],
];
