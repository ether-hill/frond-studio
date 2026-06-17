/**
 * Sets three key-point bullets on each project, condensed from the existing
 * (real) overview content. Run: SANITY_WRITE_TOKEN is read from .env.local
 *   set -a; . ./.env.local; set +a; node scripts/patch-keypoints.mjs
 */
import { createClient } from "@sanity/client";

const token = process.env.SANITY_WRITE_TOKEN;
if (!token) throw new Error("Set SANITY_WRITE_TOKEN");

const client = createClient({
  projectId: "pzulxnho",
  dataset: "production",
  apiVersion: "2024-10-01",
  token,
  useCdn: false,
});

const POINTS = {
  "ancient-wisdom-trust": ["Immersive, video-led design", "Scalable CMS for future growth", "Links to a growing text library"],
  "new-website-and-custom-graphics-for-all-things-fungi-festival": ["Interactive lineup, timetable & map", "Automated registration & Mailchimp", "Live iNaturalist data mapping"],
  "minor-am-website-development": ["Built from their Figma design", "Animated, energetic layouts", "Easy-to-update CMS"],
  "give-and-go-sports-education-website": ["Documentary rental platform", "Ecommerce + streaming integration", "Affiliate system for reach"],
  "timelapse-gallery": ["Process design & custom rigging", "Plant, fungi & slime-mold focus", "Architecture, events & industry work"],
  "logo-animation-gallery": ["Metallic, glitch, chrome & 3D reveals", "Built for social, web & signage", "Across many industries"],
  "moco-motion-control": ["Custom Arduino-driven rail rig", "Thousands of frames per centimetre", "Heliotropism grow-light prototype"],
  "whats-hot-lagos": ["Beautiful, scalable destination guide", "Staff-friendly CMS management", "Drone & video cinematography"],
  "thomas-custom-marine": ["Modern, differentiated web presence", "Custom video & cinemagraphs", "Google Maps business locator"],
  "danger-hockey-website": ["Action-packed, professional design", "Shopify ecommerce integration", "Custom video & logo animations"],
  "major-oem-manufacturer": ["New architecture & navigation", "WCAG AA accessibility", "Multilingual translation & catalogue"],
  "cunninghamsheetmetal-website-drone-videos-animated-timeline": ["Drone photography of the facility", "Restored & digitised archival media", "HD fullscreen video storytelling"],
  "thebracingexperts-website": ["80+ pages migrated", "Dynamic CMS filtering & tagging", "Multi-step forms & faster site"],
  "goodreautreecare-website-drone-videos-logo-graphics": ["Custom drone videos", "Animated video logo graphics", "Distinctive, professional presence"],
  "symcyto-art-website-content": ["Collaboration with Physarum polycephalum", "Timelapse bio-art & documentary", "Smart-enabled grow chambers"],
  "corporate-event-design-tenerife": ["A getaway for 100+ guests", "Drone-cinematography workshop", "Land Rover convoy to Mount Teide"],
  "canon-europe-ecommerce": ["Launched across 23 countries", "UX standards & production frameworks", "Promotions Hub & component system"],
  "clusewatches-ux-visual-design-frameworks": ["Design systems & guidelines", "Reusable templates & toolkits", "Modernised, pattern-based workflows"],
  "motorcitymotion-new-website": ["Delivered in under 10 days", "Advanced video solution & library", "Migration + performance gains"],
  "biophilia-matters-design-and-creative-strategy": ["Brand & business design", "Website + content design system", "Smart grow systems & timelapse"],
};

const run = async () => {
  let tx = client.transaction();
  for (const [slug, points] of Object.entries(POINTS)) {
    tx = tx.patch(`project-${slug}`, (p) => p.set({ keyPoints: points }));
  }
  const res = await tx.commit();
  console.log(`Patched keyPoints on ${Object.keys(POINTS).length} projects. ${res.transactionId}`);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
