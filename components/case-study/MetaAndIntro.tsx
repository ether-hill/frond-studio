import type { Project } from "@/content/projects/_types";

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--fg-faint)",
          marginBottom: 9,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "var(--text-body)", color: "var(--fg)", lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--fg-faint)",
          marginBottom: "clamp(12px,1.6vh,18px)",
        }}
      >
        {label}
      </h2>
      <p style={{ fontSize: "var(--text-lead)", lineHeight: 1.55, color: "var(--fg-dim)", maxWidth: "54ch" }}>{body}</p>
    </div>
  );
}

export default function MetaAndIntro({ project }: { project: Project }) {
  return (
    <section
      className="cs-meta-grid"
      data-rvs
      style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "clamp(40px,5vw,90px)", alignItems: "start" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 28, position: "sticky", top: 110 }}>
        <MetaRow label="Client">{project.client}</MetaRow>
        <MetaRow label="Year">{project.year}</MetaRow>
        <MetaRow label="Services">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {project.services.map((s) => (
              <span key={s} className="tag">
                {s}
              </span>
            ))}
          </div>
        </MetaRow>
        <MetaRow label="Live site">
          {project.liveUrl ? (
            <a className="linku" href={project.liveUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
              Visit site &#8599;
            </a>
          ) : (
            <span style={{ color: "var(--fg-faint)" }}>[[ URL pending ]]</span>
          )}
        </MetaRow>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(32px,4.5vh,52px)" }}>
        {project.intro && project.intro.length
          ? project.intro.map((b) => <Block key={b.label} label={b.label} body={b.body} />)
          : (
            <>
              {project.challenge ? <Block label="Challenge" body={project.challenge} /> : null}
              {project.approach ? <Block label="Approach" body={project.approach} /> : null}
            </>
          )}
      </div>
    </section>
  );
}
