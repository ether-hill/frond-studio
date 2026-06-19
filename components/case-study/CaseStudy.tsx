import type { Project } from "@/content/projects/_types";
import Hero from "./Hero";
import MetaAndIntro from "./MetaAndIntro";
import Screengrab from "./Screengrab";
import BeforeAfter from "./BeforeAfter";
import FeatureRow from "./FeatureRow";
import DeviceStrip from "./DeviceStrip";
import IntegrationsStrip from "./IntegrationsStrip";
import Metrics from "./Metrics";
import Quote from "./Quote";
import MoreWork, { type MoreWorkItem } from "./MoreWork";

/**
 * Composes the canonical case-study sections top-to-bottom. Section reveals are
 * driven by the site's shared [data-rv]/[data-rvs] hooks (RevealRoot) — one
 * orchestrated entrance per section as it scrolls in. New project = new content
 * file; no changes here. `moreWork` is the cross-project list for the closing
 * "See more work" slider (current project already excluded by the route).
 */
export default function CaseStudy({ project, moreWork = [] }: { project: Project; moreWork?: MoreWorkItem[] }) {
  return (
    <>
      <div className="page-gutter" style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "var(--pad-top) var(--gutter) var(--pad-bottom)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--section-y)" }}>
          <Hero project={project} />
          <MetaAndIntro project={project} />
          <Screengrab slot={project.homepageGrab} />
          <BeforeAfter project={project} />

          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(56px,8vh,110px)" }}>
            {project.features.map((f, i) => (
              <FeatureRow key={f.title} feature={f} index={i} />
            ))}
          </div>

          <DeviceStrip devices={project.devices} />
          <IntegrationsStrip integrations={project.integrations} />
          <Metrics metrics={project.metrics} />
          {project.quote ? <Quote quote={project.quote} /> : null}
        </div>
      </div>

      <MoreWork items={moreWork} />
    </>
  );
}
