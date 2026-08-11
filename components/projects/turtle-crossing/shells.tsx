/**
 * Field-guide plate portraits — stylized top-down turtle illustrations, one per
 * species, drawn as SVG from shared primitives (carapace, scute grid, legs,
 * tail) with species-specific proportions and shell patterning. Designed for
 * the cream plate background; colors are naturalistic and self-contained.
 */

type Geo = { cx: number; cy: number; rx: number; ry: number };

/** Latitude + longitude curves approximating a scute grid over the carapace. */
function ScuteGrid({ g, stroke, width = 1.6 }: { g: Geo; stroke: string; width?: number }) {
  const { cx, cy, rx, ry } = g;
  const lats = [-0.52, -0.18, 0.18, 0.52].map((t) => {
    const y = cy + ry * t;
    const halfW = rx * Math.sqrt(Math.max(0, 1 - t * t));
    const bow = ry * 0.09;
    return `M ${cx - halfW} ${y} Q ${cx} ${y + bow} ${cx + halfW} ${y}`;
  });
  const lonHalf = (side: 1 | -1) => {
    const x = cx + side * rx * 0.42;
    const yTop = cy - ry * 0.88;
    const yBot = cy + ry * 0.88;
    return `M ${cx + side * rx * 0.12} ${yTop} Q ${x} ${cy} ${cx + side * rx * 0.18} ${yBot}`;
  };
  return (
    <g fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" opacity={0.85}>
      {lats.map((d, i) => (
        <path key={i} d={d} />
      ))}
      <path d={lonHalf(1)} />
      <path d={lonHalf(-1)} />
    </g>
  );
}

function Legs({ skin, toes, spread = 1 }: { skin: string; toes: string; spread?: number }) {
  const leg = (x: number, y: number, rot: number) => (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <ellipse cx={x} cy={y} rx={17 * spread} ry={10} fill={skin} />
      <g stroke={toes} strokeWidth={1.4} strokeLinecap="round">
        <line x1={x + 12 * spread} y1={y - 5} x2={x + 19 * spread} y2={y - 7} />
        <line x1={x + 14 * spread} y1={y} x2={x + 21 * spread} y2={y} />
        <line x1={x + 12 * spread} y1={y + 5} x2={x + 19 * spread} y2={y + 7} />
      </g>
    </g>
  );
  return (
    <g>
      {leg(58, 96, -140)}
      {leg(162, 96, -40)}
      {leg(56, 190, 140)}
      {leg(164, 190, 40)}
    </g>
  );
}

function Head({
  skin,
  y = 46,
  r = 15,
  neckW = 20,
  children,
}: {
  skin: string;
  y?: number;
  r?: number;
  neckW?: number;
  children?: React.ReactNode;
}) {
  return (
    <g>
      <path d={`M ${110 - neckW / 2} ${y + r + 26} Q 110 ${y + r} ${110 + neckW / 2} ${y + r + 26} Z`} fill={skin} />
      <rect x={110 - neckW / 2} y={y + r * 0.4} width={neckW} height={30} rx={neckW / 2} fill={skin} />
      <ellipse cx={110} cy={y} rx={r} ry={r * 1.18} fill={skin} />
      <circle cx={103} cy={y - 4} r={2.1} fill="#1d1a14" />
      <circle cx={117} cy={y - 4} r={2.1} fill="#1d1a14" />
      {children}
    </g>
  );
}

function Tail({ skin, len = 26, w = 9 }: { skin: string; len?: number; w?: number }) {
  return <path d={`M ${110 - w / 2} 216 Q 110 ${216 + len * 0.6} 110 ${216 + len} Q 110 ${216 + len * 0.55} ${110 + w / 2} 216 Z`} fill={skin} />;
}

function Carapace({ g, fill, edge, children }: { g: Geo; fill: string; edge: string; children?: React.ReactNode }) {
  const id = `cara-${Math.round(g.rx)}-${Math.round(g.ry)}-${fill.replace("#", "")}`;
  return (
    <g>
      <ellipse cx={g.cx} cy={g.cy} rx={g.rx + 5} ry={g.ry + 5} fill={edge} />
      <ellipse cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} fill={fill} />
      <clipPath id={id}>
        <ellipse cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} />
      </clipPath>
      <g clipPath={`url(#${id})`}>{children}</g>
      <ellipse cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} fill="none" stroke="rgba(30,24,14,0.35)" strokeWidth={1.4} />
    </g>
  );
}

const G: Geo = { cx: 110, cy: 148, rx: 62, ry: 76 };

function Snapping() {
  const shell = "#5c5442";
  const skin = "#6e6450";
  return (
    <g>
      <Tail skin={skin} len={46} w={12} />
      {/* saw-tooth tail ridge */}
      <g fill="#57503f">
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M ${106.5} ${222 + i * 8} l 3.5 -5 l 3.5 5 Z`} />
        ))}
      </g>
      <Legs skin={skin} toes="#3c362a" spread={1.12} />
      <Head skin={skin} r={19} neckW={27} y={42} />
      <Carapace g={G} fill={shell} edge="#4a4335">
        <ScuteGrid g={G} stroke="#443d2f" />
        {/* three keels */}
        <g stroke="#6d6450" strokeWidth={3.4} strokeLinecap="round" fill="none">
          <path d="M 110 78 Q 113 148 110 218" />
          <path d="M 84 92 Q 88 148 86 206" />
          <path d="M 136 92 Q 132 148 134 206" />
        </g>
        {/* serrated rear margin */}
        <g fill="#4a4335">
          {[-3, -2, -1, 0, 1, 2, 3].map((i) => (
            <path key={i} d={`M ${110 + i * 16 - 7} 226 l 7 -11 l 7 11 Z`} />
          ))}
        </g>
      </Carapace>
    </g>
  );
}

function Painted() {
  const shell = "#4c5a45";
  const skin = "#3f4a3a";
  return (
    <g>
      <Tail skin={skin} len={20} />
      <Legs skin={skin} toes="#2c352a" />
      {/* red streaks on legs */}
      <g stroke="#b5533c" strokeWidth={2} strokeLinecap="round">
        <line x1={52} y1={92} x2={66} y2={100} />
        <line x1={168} y1={92} x2={154} y2={100} />
      </g>
      <Head skin={skin}>
        <g stroke="#e0c153" strokeWidth={1.7} strokeLinecap="round" fill="none">
          <path d="M 104 56 Q 106 70 104 80" />
          <path d="M 116 56 Q 114 70 116 80" />
          <path d="M 110 60 Q 110 70 110 78" />
        </g>
        <circle cx={101} cy={52} r={2.4} fill="#e0c153" />
        <circle cx={119} cy={52} r={2.4} fill="#e0c153" />
      </Head>
      <Carapace g={G} fill={shell} edge="#3e4a39">
        <ScuteGrid g={G} stroke="#39443434" width={1.8} />
        <ScuteGrid g={G} stroke="#394434" />
        {/* red marginal dashes */}
        <g stroke="#c25b40" strokeWidth={4.6} strokeLinecap="round" fill="none">
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2 + 0.22;
            const x1 = 110 + Math.cos(a) * 58, y1 = 148 + Math.sin(a) * 72;
            const x2 = 110 + Math.cos(a + 0.12) * 58, y2 = 148 + Math.sin(a + 0.12) * 72;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
      </Carapace>
    </g>
  );
}

function Blandings() {
  const g: Geo = { cx: 110, cy: 148, rx: 58, ry: 74 };
  const shell = "#3d453e";
  const skin = "#4a5147";
  return (
    <g>
      <Tail skin={skin} len={22} />
      <Legs skin={skin} toes="#31382f" />
      <Head skin={skin} r={16}>
        {/* the yellow throat */}
        <path d="M 96 52 Q 110 74 124 52 Q 118 44 110 44 Q 102 44 96 52 Z" fill="#e6c455" opacity={0.95} />
        {/* smile */}
        <path d="M 99 44 Q 110 52 121 44" fill="none" stroke="#2b3028" strokeWidth={1.5} strokeLinecap="round" />
      </Head>
      <Carapace g={g} fill={shell} edge="#333a34">
        {/* domed highlight */}
        <ellipse cx={104} cy={126} rx={34} ry={44} fill="rgba(236,224,190,0.10)" />
        <ScuteGrid g={g} stroke="#2e352f" />
        {/* pale flecks */}
        <g fill="#d8c88f" opacity={0.8}>
          {[[86, 104], [128, 96], [102, 140], [140, 150], [80, 168], [118, 184], [96, 200], [134, 118], [88, 132], [124, 164], [108, 112], [142, 186]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width={4.6} height={1.9} rx={1} transform={`rotate(${(i * 47) % 180} ${x} ${y})`} />
          ))}
        </g>
      </Carapace>
    </g>
  );
}

function MapTurtle() {
  const shell = "#4f5f47";
  const skin = "#46523f";
  return (
    <g>
      <Tail skin={skin} len={20} />
      <Legs skin={skin} toes="#303a2c" />
      <Head skin={skin}>
        {/* yellow spot behind each eye */}
        <circle cx={99} cy={49} r={3} fill="#ddce76" />
        <circle cx={121} cy={49} r={3} fill="#ddce76" />
        <g stroke="#ddce76" strokeWidth={1.3} strokeLinecap="round" fill="none">
          <path d="M 103 60 Q 105 72 103 80" />
          <path d="M 117 60 Q 115 72 117 80" />
        </g>
      </Head>
      <Carapace g={G} fill={shell} edge="#41503b">
        <ScuteGrid g={G} stroke="#3a4635" />
        {/* topographic contour squiggles */}
        <g fill="none" stroke="#d6cd93" strokeWidth={1.3} opacity={0.9}>
          {[[84, 112, 10], [132, 106, 12], [104, 146, 11], [138, 158, 9], [82, 164, 9], [112, 188, 12], [92, 138, 6], [128, 132, 6]].map(([x, y, r], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={r} ry={r * 0.62} transform={`rotate(${(i * 33) % 90} ${x} ${y})`} />
              <ellipse cx={x} cy={y} rx={r * 0.5} ry={r * 0.3} transform={`rotate(${(i * 33) % 90} ${x} ${y})`} />
            </g>
          ))}
        </g>
        {/* low keel */}
        <path d="M 110 76 Q 112 148 110 220" fill="none" stroke="#5c6b52" strokeWidth={3} strokeLinecap="round" />
      </Carapace>
    </g>
  );
}

function Spotted() {
  const g: Geo = { cx: 110, cy: 148, rx: 54, ry: 68 };
  const shell = "#2e3230";
  const skin = "#3a3d38";
  return (
    <g>
      <Tail skin={skin} len={18} w={7} />
      <Legs skin={skin} toes="#262924" spread={0.9} />
      <g fill="#d99a4e" opacity={0.85}>
        <circle cx={60} cy={98} r={2} />
        <circle cx={160} cy={98} r={2} />
        <circle cx={58} cy={188} r={2} />
        <circle cx={162} cy={188} r={2} />
      </g>
      <Head skin={skin} r={13} neckW={16}>
        <circle cx={104} cy={40} r={1.8} fill="#e8cf5e" />
        <circle cx={116} cy={38} r={1.8} fill="#e8cf5e" />
        <path d="M 102 62 Q 110 68 118 62" fill="none" stroke="#d99a4e" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
      </Head>
      <Carapace g={g} fill={shell} edge="#242725">
        <ScuteGrid g={g} stroke="#212422" />
        {/* the polka dots */}
        <g fill="#ecd05e">
          {[[92, 100, 2.6], [124, 96, 2.2], [108, 118, 2.8], [136, 128, 2.3], [84, 132, 2.5], [116, 148, 2.4], [96, 162, 2.7], [138, 166, 2.2], [110, 184, 2.6], [86, 194, 2.2], [128, 198, 2.5], [104, 96, 1.9], [80, 112, 2.0], [142, 148, 2.0]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      </Carapace>
    </g>
  );
}

function Softshell() {
  const g: Geo = { cx: 110, cy: 150, rx: 72, ry: 74 };
  const shell = "#8b7c55";
  const skin = "#8f7f57";
  return (
    <g>
      <Tail skin={skin} len={16} w={7} />
      <Legs skin={skin} toes="#5f5439" spread={1.05} />
      {/* long snorkel snout */}
      <g>
        <rect x={102} y={44} width={16} height={34} rx={8} fill={skin} />
        <ellipse cx={110} cy={40} rx={9} ry={10} fill={skin} />
        <rect x={106.6} y={22} width={6.8} height={20} rx={3.4} fill={skin} />
        <circle cx={108.6} cy={24} r={1} fill="#2b2517" />
        <circle cx={111.4} cy={24} r={1} fill="#2b2517" />
        <circle cx={104} cy={38} r={2} fill="#1d1a14" />
        <circle cx={116} cy={38} r={2} fill="#1d1a14" />
      </g>
      <Carapace g={g} fill={shell} edge="#7a6c49">
        {/* leathery — no scutes; soft radial shading + ocelli */}
        <ellipse cx={104} cy={132} rx={44} ry={40} fill="rgba(255,244,214,0.10)" />
        <g fill="none" stroke="#6a5d3e" strokeWidth={1.6} opacity={0.9}>
          {[[88, 118, 5], [126, 110, 4], [108, 146, 5.5], [140, 150, 4], [82, 158, 4.5], [116, 182, 5], [94, 190, 3.5], [134, 186, 3.5], [110, 108, 3.5], [76, 136, 3.5], [144, 128, 3.5]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
        {/* spines along the front edge */}
        <g fill="#6a5d3e">
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M ${110 + i * 12 - 3} ${79 + Math.abs(i) * 2.6} l 3 -6 l 3 6 Z`} />
          ))}
        </g>
      </Carapace>
    </g>
  );
}

function Musk() {
  const g: Geo = { cx: 110, cy: 150, rx: 48, ry: 60 };
  const shell = "#4c4438";
  const skin = "#4f483c";
  return (
    <g>
      <Tail skin={skin} len={14} w={6} />
      <Legs skin={skin} toes="#332e25" spread={0.82} />
      <Head skin={skin} r={13} neckW={16} y={56}>
        {/* two pale head stripes each side */}
        <g stroke="#cfc394" strokeWidth={1.5} strokeLinecap="round" fill="none">
          <path d="M 100 50 Q 96 62 98 74" />
          <path d="M 120 50 Q 124 62 122 74" />
          <path d="M 104 58 Q 102 68 103 78" />
          <path d="M 116 58 Q 118 68 117 78" />
        </g>
        {/* chin barbels */}
        <line x1={107} y1={70} x2={106} y2={75} stroke={skin} strokeWidth={2} strokeLinecap="round" />
        <line x1={113} y1={70} x2={114} y2={75} stroke={skin} strokeWidth={2} strokeLinecap="round" />
      </Head>
      <Carapace g={g} fill={shell} edge="#3e372d">
        {/* steep dome + algae stains */}
        <ellipse cx={104} cy={132} rx={26} ry={34} fill="rgba(240,230,200,0.10)" />
        <ScuteGrid g={g} stroke="#39332a" />
        <g fill="#556247" opacity={0.55}>
          <ellipse cx={96} cy={150} rx={12} ry={7} transform="rotate(24 96 150)" />
          <ellipse cx={126} cy={170} rx={9} ry={5} transform="rotate(-18 126 170)" />
          <ellipse cx={112} cy={116} rx={8} ry={5} transform="rotate(40 112 116)" />
        </g>
      </Carapace>
    </g>
  );
}

function Wood() {
  const g: Geo = { cx: 110, cy: 148, rx: 60, ry: 74 };
  const shell = "#6d5c3f";
  const skin = "#5c5340";
  const orange = "#c07840";
  return (
    <g>
      <Tail skin={skin} len={24} />
      <Legs skin={orange} toes="#8a5426" />
      <Head skin={skin} r={15}>
        {/* orange throat */}
        <path d="M 99 54 Q 110 70 121 54 Q 116 46 110 46 Q 104 46 99 54 Z" fill={orange} opacity={0.9} />
      </Head>
      <Carapace g={g} fill={shell} edge="#5b4c33">
        <ScuteGrid g={g} stroke="#4a3e2a" width={2} />
        {/* sculpted pyramids: concentric growth rings per scute */}
        <g fill="none" stroke="#4a3e2a" strokeWidth={1.1} opacity={0.9}>
          {[[110, 100], [110, 138], [110, 176], [78, 118], [142, 118], [76, 160], [144, 160], [88, 198], [132, 198], [110, 210]].map(([x, y], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={13} ry={10} />
              <ellipse cx={x} cy={y} rx={8.5} ry={6.5} />
              <ellipse cx={x} cy={y} rx={4} ry={3} fill="#7d6b49" stroke="none" />
            </g>
          ))}
        </g>
      </Carapace>
    </g>
  );
}

const PORTRAITS: Record<string, () => React.ReactElement> = {
  snapping: Snapping,
  painted: Painted,
  blandings: Blandings,
  map: MapTurtle,
  spotted: Spotted,
  softshell: Softshell,
  musk: Musk,
  wood: Wood,
};

export function ShellPortrait({ id, className }: { id: string; className?: string }) {
  const Draw = PORTRAITS[id] ?? Painted;
  return (
    <svg viewBox="0 0 220 280" className={className} role="img" aria-label="Species illustration">
      <Draw />
    </svg>
  );
}
