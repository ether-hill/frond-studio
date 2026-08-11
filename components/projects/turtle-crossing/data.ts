// Turtle Crossing — content for the southwestern Ontario turtle conservation
// resource. All eight of Ontario's native turtle species are now listed as at
// risk; the copy below focuses on what that looks like in the southwest (the
// Carolinian zone: Essex to Long Point, the Thames and Sydenham watersheds,
// Pinery and the Lake Erie shore) and on what a person can actually do.

export type StatusId = "endangered" | "threatened" | "special-concern";

export const STATUS_LABEL: Record<StatusId, string> = {
  endangered: "Endangered",
  threatened: "Threatened",
  "special-concern": "Special Concern",
};

export type Species = {
  id: string;
  plate: string; // roman numeral for the field-guide plate
  common: string;
  latin: string;
  status: StatusId;
  size: string; // typical adult carapace length
  idMarks: string[];
  habitat: string;
  southwest: string;
  note: string;
};

export const SPECIES: Species[] = [
  {
    id: "snapping",
    plate: "I",
    common: "Snapping Turtle",
    latin: "Chelydra serpentina",
    status: "special-concern",
    size: "20–36 cm · up to 16 kg",
    idMarks: [
      "Massive head and a long, saw-toothed tail — almost as long as the shell",
      "Rugged carapace with three low keels, jagged at the rear edge",
      "Small plastron: it can't withdraw into its shell, so it defends itself instead",
    ],
    habitat:
      "Slow water with a soft mud bottom — marshes, rivers, drainage canals, farm ponds. Spends winter dormant under the mud, sometimes in groups.",
    southwest:
      "Still widespread across the southwest, from Essex drains to Long Point's marshes — which is exactly why it dominates the road-kill count every June.",
    note: "A female may not breed until her late teens and can nest for decades. Every adult killed on a road shoulder erases an irreplaceable breeder.",
  },
  {
    id: "painted",
    plate: "II",
    common: "Midland Painted Turtle",
    latin: "Chrysemys picta marginata",
    status: "special-concern",
    size: "10–19 cm",
    idMarks: [
      "Smooth dark shell rimmed with red and orange dashes",
      "Yellow stripes on the head and neck, red streaks on the legs",
      "The classic basker — lined up on logs, biggest first",
    ],
    habitat:
      "Ponds, marshes, bays and quiet river reaches with basking logs and soft bottoms. The most likely turtle in your local stormwater pond.",
    southwest:
      "The southwest's most familiar turtle — and still declining. Even the 'common' one is now federally listed.",
    note: "Hatchlings can freeze solid in the nest, survive the winter part-frozen, and dig out alive the following spring.",
  },
  {
    id: "blandings",
    plate: "III",
    common: "Blanding's Turtle",
    latin: "Emydoidea blandingii",
    status: "threatened",
    size: "18–27 cm",
    idMarks: [
      "High, domed shell like an army helmet, flecked with pale yellow",
      "Brilliant yellow chin and throat, visible at a distance",
      "An upturned mouthline that looks like a permanent smile",
    ],
    habitat:
      "Shallow wetland complexes — marshes, fens, vernal pools — connected by land. It commutes kilometres overland between wetlands every year.",
    southwest:
      "Scattered, shrinking populations in the big remaining wetlands. Those long overland walks cross roads, which is why this species is in trouble.",
    note: "May take 25 years to reach maturity and can live past 80. Its life plan assumes almost no adult ever dies — roads broke that assumption.",
  },
  {
    id: "map",
    plate: "IV",
    common: "Northern Map Turtle",
    latin: "Graptemys geographica",
    status: "special-concern",
    size: "10–27 cm · females much larger",
    idMarks: [
      "Fine yellow contour lines across an olive shell, like a topographic map",
      "Low keel down the spine; yellow spot behind each eye",
      "Wary — first off the log when you approach",
    ],
    habitat:
      "Big water: rivers and lakeshores with current, basking rocks and molluscs to eat. Females' broad jaws crush snails and clams.",
    southwest:
      "The Thames, the Sydenham, Lake St. Clair and the Erie shore. Threatened by shoreline hardening and by the collapse of native molluscs.",
    note: "Map turtles bask in wary stacks and dive at the first footstep — a spotting scope is the polite way to meet one.",
  },
  {
    id: "spotted",
    plate: "V",
    common: "Spotted Turtle",
    latin: "Clemmys guttata",
    status: "endangered",
    size: "9–13 cm",
    idMarks: [
      "Small jet-black shell scattered with yellow polka dots",
      "Orange-and-yellow mottling on the head and neck",
      "Often abroad in cold early spring water, before other turtles wake",
    ],
    habitat:
      "Shallow, clean, quiet water — fens, vernal pools, sphagnum seeps. Needs unpolluted wetlands with stable water through spring.",
    southwest:
      "Reduced to a handful of secret sites. Poaching for the pet trade is so severe that biologists keep every location confidential.",
    note: "If you are lucky enough to find one: enjoy it, photograph it in place, and never post the location publicly.",
  },
  {
    id: "softshell",
    plate: "VI",
    common: "Spiny Softshell",
    latin: "Apalone spinifera",
    status: "endangered",
    size: "13–43 cm · females much larger",
    idMarks: [
      "Flat, leathery, pancake-flexible shell — no scutes at all",
      "Long snorkel snout; breathes with just nostrils above water",
      "Small spines along the front shell edge; astonishingly fast",
    ],
    habitat:
      "Rivers and lakes with sandbars and gravel bars for nesting. Buries itself in sand in the shallows with only its snout showing.",
    southwest:
      "Canada's stronghold is here — the Thames and Sydenham rivers. Recovery crews cage nests and headstart hatchlings every summer.",
    note: "One of the continent's fastest swimming turtles, guarded in Ontario by one of its most hands-on recovery programs.",
  },
  {
    id: "musk",
    plate: "VII",
    common: "Eastern Musk Turtle",
    latin: "Sternotherus odoratus",
    status: "special-concern",
    size: "8–13 cm",
    idMarks: [
      "Tiny, steep-domed, algae-stained shell",
      "Two pale stripes along each side of the head; barbels on the chin",
      "Releases a musky smell when handled — the 'stinkpot'",
    ],
    habitat:
      "Clear, still water. Rarely basks in the open; walks along the bottom hunting snails and insects rather than swimming.",
    southwest:
      "Quiet bays and marshes, including Point Pelee and Rondeau. Vulnerable to anglers' hooks, motorboat wakes and shoreline 'cleanup'.",
    note: "It can stay down for months in winter, absorbing oxygen through its skin and throat lining — effectively breathing through its neck.",
  },
  {
    id: "wood",
    plate: "VIII",
    common: "Wood Turtle",
    latin: "Glyptemys insculpta",
    status: "endangered",
    size: "16–25 cm",
    idMarks: [
      "Sculpted shell — each scute rises in a pyramid of growth rings",
      "Bright orange neck and legs under a woodcarved brown shell",
      "Ontario's most terrestrial turtle, often found far from water",
    ],
    habitat:
      "Clean rivers with forested floodplains; summers in fields and woods. Famously 'stomps' the ground to lure earthworms to the surface.",
    southwest:
      "Effectively gone from the southwest — a warning of where the others are headed. Remaining Ontario sites are kept strictly secret.",
    note: "So prized by collectors that a single posted photo with GPS data can doom a population. Report sightings to scientists, not social media.",
  },
];

// ---------------------------------------------------------------------------
// The turtle year — southwestern Ontario season wheel
// ---------------------------------------------------------------------------

export type Season = {
  id: string;
  label: string; // ring label
  months: string; // long label
  headline: string;
  happening: string;
  doThis: string;
  peak?: boolean; // peak road-mortality period — drawn hot on the wheel
};

export const SEASONS: Season[] = [
  {
    id: "april",
    label: "APR",
    months: "April",
    headline: "Wake-up",
    happening:
      "Ice-out. Turtles surface from five months under the mud and haul out to bask — cold, slow and vulnerable. Spotted turtles are already courting in near-freezing water.",
    doThis:
      "Scan sunny logs and muskrat lodges from a distance. Leave basking turtles alone; they're rebuilding body heat they can't spare.",
  },
  {
    id: "may",
    label: "MAY",
    months: "May",
    headline: "On the move",
    happening:
      "Turtles disperse from overwintering wetlands to summer habitat. Blanding's turtles begin kilometre-scale overland treks. The first shells appear on road shoulders.",
    doThis:
      "Start driving like it's turtle season — because it is. Watch shoulders and centre lines on any road between wetlands, especially after rain.",
    peak: true,
  },
  {
    id: "june",
    label: "JUN",
    months: "June",
    headline: "Nesting — the critical month",
    happening:
      "Females leave the water to dig nests in sand and gravel — which too often means road shoulders. The first half of June is the deadliest fortnight of the turtle year.",
    doThis:
      "Slow down, especially at dawn and dusk near water. Help crossers (see the road guide below). Never relocate a nesting female — she's exactly where she means to be.",
    peak: true,
  },
  {
    id: "july",
    label: "JUL",
    months: "July",
    headline: "Eggs in the ground",
    happening:
      "Late nesters finish. Under the gravel, embryos develop — and nest temperature is deciding the sex of most species' hatchlings. Raccoons and skunks dig up the majority of unprotected nests within days.",
    doThis:
      "Know of a nest on your property? A conservation authority or the OTCC can advise on a wire nest cage — protection that can multiply survival.",
  },
  {
    id: "august",
    label: "AUG",
    months: "August",
    headline: "Quiet incubation",
    happening:
      "Adults settle into summer home ranges. Softshell recovery crews on the Thames and Sydenham monitor caged nests as the first clutches near hatching.",
    doThis:
      "Paddle gently past basking sites, keep shorelines natural, and leave fallen logs in the water — that 'dead tree' is critical infrastructure.",
  },
  {
    id: "september",
    label: "SEP",
    months: "September",
    headline: "Hatchlings",
    happening:
      "Toonie-sized hatchlings claw out of nests and head for water on instinct, crossing the same roads their mothers did. Most painted hatchlings stay put to overwinter in the nest.",
    doThis:
      "Spot a hatchling on pavement? Move it the way it was heading, to cover at the water's edge. It doesn't need raising — it needs to not be run over.",
    peak: true,
  },
  {
    id: "october",
    label: "OCT",
    months: "October",
    headline: "Last crossings",
    happening:
      "Final movements to overwintering wetlands. Turtles pile into soft-bottomed pools and settle under the mud as water temperatures fall.",
    doThis:
      "Keep watching the roads until the frosts. Then let the wetlands be — an overwintering turtle disturbed in November has no energy to spare.",
  },
  {
    id: "winter",
    label: "NOV–MAR",
    months: "November through March",
    headline: "Brumation",
    happening:
      "Five months under ice, heart barely beating, absorbing what little oxygen the water offers through skin and throat. They are not asleep — just profoundly slowed down.",
    doThis:
      "This is the season for the long game: speak up for wetland protection, and tell your municipality where you see turtles cross. Fencing and culverts get planned in winter.",
  },
];

// ---------------------------------------------------------------------------
// Road rescue trainer
// ---------------------------------------------------------------------------

export type Scenario = {
  id: string;
  title: string;
  setting: string;
  prompt: string;
  options: { text: string; correct?: boolean; feedback: string }[];
  fieldNote: string;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "painted-crossing",
    title: "The crosser",
    setting:
      "A county road near Rondeau, early June. A painted turtle is in your lane, walking steadily north — away from the marsh you can see to the south.",
    prompt: "It's safe to pull over. What do you do?",
    options: [
      {
        text: "Carry it back south, toward the marsh it came from",
        feedback:
          "It will just set out again — turtles hold a mental map and an agenda. Turned around, she'll re-cross the road, doubling her danger.",
      },
      {
        text: "Move it north — the direction it was already heading",
        correct: true,
        feedback:
          "Right. Always in the direction of travel, just past the shoulder. She's likely a female heading to a nesting site she may have used for decades.",
      },
      {
        text: "Drive it to a 'better' pond a few kilometres away",
        feedback:
          "Never relocate. Turtles moved out of their home range will spend weeks trying to walk home — crossing every road in between — and many die trying.",
      },
    ],
    fieldNote:
      "Hold small turtles like a hamburger — two hands, low to the ground. A dropped turtle can crack; a cracked shell is a broken skeleton.",
  },
  {
    id: "snapper",
    title: "The snapper",
    setting:
      "Highway 3 near Long Point. A snapping turtle the size of a hubcap is stopped on the centre line, hissing. Her neck is longer than you think.",
    prompt: "She won't fit in your hands and she doesn't want help. Now what?",
    options: [
      {
        text: "Grab her by the tail and swing her off the road",
        feedback:
          "Never. The tail connects directly to the spine — lifting her by it can dislocate vertebrae and cause permanent injury.",
      },
      {
        text: "Slide her onto a car mat and drag her across, direction of travel",
        correct: true,
        feedback:
          "The classic move. A floor mat, shovel or jacket becomes a turtle sled. You can also grip the shell above the back legs and 'wheelbarrow' her along — stay behind her; that neck reaches over halfway back.",
      },
      {
        text: "Stand over her and shoo her along with your boot",
        feedback:
          "You'll be there a while, in a live lane, aggravating 16 kilograms of dinosaur. Get her moving on something flat instead — and stay clear of the front half.",
      },
    ],
    fieldNote:
      "Snappers can't hide in their shells — the plastron is too small — so they stand and fight. It's not malice; it's their only option.",
  },
  {
    id: "injured",
    title: "The strike",
    setting:
      "You find a Blanding's turtle at the roadside with a cracked shell. She's bleeding, but her legs are moving. It looks hopeless.",
    prompt: "What's the call?",
    options: [
      {
        text: "It's kindest to leave her — a broken shell is fatal",
        feedback:
          "It usually isn't. Shells heal. Turtles survive injuries that would kill a mammal, and rehab centres routinely repair worse than this. She also may carry eggs that can still be saved.",
      },
      {
        text: "Box her up and call the Ontario Turtle Conservation Centre",
        correct: true,
        feedback:
          "Yes — 705-741-5000. A dry, ventilated box, no food or water, and note the exact location: she must be released where she was found, and volunteer 'Turtle Taxis' can relay her to Peterborough.",
      },
      {
        text: "Put her back in the nearest water so she's comfortable",
        feedback:
          "An injured turtle in water can drown. Keep her dry and contained, and get her to the professionals — recovery rates are remarkable.",
      },
    ],
    fieldNote:
      "Even turtles that die of their injuries matter: their eggs can be incubated, and hatchlings returned to their mother's wetland.",
  },
  {
    id: "nesting",
    title: "The digger",
    setting:
      "Your gravel driveway, second week of June. A snapping turtle has dug in and is laying eggs, twenty metres from the river.",
    prompt: "There's a turtle nesting in your driveway. What do you do?",
    options: [
      {
        text: "Move her and the eggs somewhere safer once she's done",
        feedback:
          "Digging up a nest usually kills it — eggs die if rotated, and handling them is illegal without permits. The nest stays; the safety measures come to it.",
      },
      {
        text: "Let her finish, then mark and protect the nest where it is",
        correct: true,
        feedback:
          "Exactly. She'll finish within an hour or two and leave forever — incubation is the sun's job. Mark the spot, drive around it, and ask your conservation authority or the OTCC about a wire nest cage against raccoons.",
      },
      {
        text: "Shoo her off before she gets settled",
        feedback:
          "She's chosen this spot for its sun and drainage, possibly for the tenth year running. Disturbed, she may dump her eggs in a worse place — or on the road shoulder.",
      },
    ],
    fieldNote:
      "Nests hatch in 60–90 days. If you've caged a nest, the cage needs openings or lifting by late August so hatchlings can escape.",
  },
  {
    id: "tempted",
    title: "The temptation",
    setting:
      "A friend finds a spotted turtle — tiny, polka-dotted, ridiculously charming — and wants to keep it in a terrarium 'to protect it'.",
    prompt: "What do you tell them?",
    options: [
      {
        text: "One turtle won't matter; at least it'll be safe inside",
        feedback:
          "One turtle is precisely what matters. Turtle populations survive on adult longevity; removing a single adult female from an endangered population can tip it toward extinction. It's also a serious offence.",
      },
      {
        text: "Photograph it, leave it exactly where it is, report it to the atlas",
        correct: true,
        feedback:
          "Right. Report it to the Ontario Reptile and Amphibian Atlas or iNaturalist (which hides at-risk locations automatically) — and never post the location publicly. Poachers mine social media for exactly this.",
      },
      {
        text: "Sell it — spotted turtles fetch hundreds online",
        feedback:
          "That's poaching an endangered species — fines run to the hundreds of thousands. Seen it happening? Report it: 1-877-847-7667 (MNRF TIPS).",
      },
    ],
    fieldNote:
      "Wild turtles make terrible pets and captive turtles make terrible wildlife: released pets spread disease into wild populations, so a kept turtle can never go back.",
  },
];

// ---------------------------------------------------------------------------
// Habitat cross-section hotspots
// ---------------------------------------------------------------------------

export type Hotspot = {
  id: string;
  x: number; // panorama viewBox coords (0–1200)
  y: number; // panorama viewBox coords (0–420)
  title: string;
  body: string;
};

export const HOTSPOTS: Hotspot[] = [
  {
    id: "openwater",
    x: 88,
    y: 330,
    title: "Deep water · brumation",
    body: "Soft-bottomed pools that don't freeze solid or run out of oxygen are where turtles spend five months a year. Dredging or 'pond cleanup' in the wrong spot removes the winter refuge for a whole population.",
  },
  {
    id: "marsh",
    x: 262,
    y: 282,
    title: "Emergent marsh · the pantry",
    body: "Cattail and bulrush beds are food, cover from herons and pike, and nursery habitat for hatchlings. Southwestern Ontario has lost over 85% of these wetlands since settlement — the deepest cut in the province.",
  },
  {
    id: "log",
    x: 430,
    y: 318,
    title: "Basking log · the furnace",
    body: "Turtles can't make body heat; the sun is their metabolism. Fallen timber in open water is where they warm up enough to digest, fight infection and ripen eggs. Leave dead wood in the water.",
  },
  {
    id: "bank",
    x: 592,
    y: 300,
    title: "Sand bank · the nursery",
    body: "Open, sunny, well-drained sand and gravel is scarce — which is why females settle for road shoulders. Nest temperature sets hatchling sex for most species: warm nests hatch females, cool nests hatch males.",
  },
  {
    id: "road",
    x: 800,
    y: 252,
    title: "The road · the gauntlet",
    body: "Roads between wetland and nesting ground are the region's turtle bottleneck. Fixes exist: exclusion fencing that funnels turtles into culvert 'ecopassages' cut reptile road deaths on the Long Point Causeway by roughly 90%.",
  },
  {
    id: "upland",
    x: 1030,
    y: 268,
    title: "Upland buffer · the corridor",
    body: "Meadow and woodland edges are how turtles travel between wetlands — Blanding's turtles commute kilometres overland. A mowed-to-the-waterline lawn is a wall; a natural buffer strip is a highway.",
  },
];

// ---------------------------------------------------------------------------
// Threats & actions
// ---------------------------------------------------------------------------

export type Threat = { stat: string; title: string; body: string };

export const THREATS: Threat[] = [
  {
    stat: ">85%",
    title: "Wetlands drained",
    body: "of southwestern Ontario's original wetlands are gone — drained for agriculture and development. What's left is fragmented into islands separated by roads and field tile.",
  },
  {
    stat: "8 / 8",
    title: "Species at risk",
    body: "Every one of Ontario's native turtle species is now federally or provincially listed. There is no 'safe' Ontario turtle left — even the painted turtle made the list.",
  },
  {
    stat: "~1 in 100",
    title: "Eggs that make it",
    body: "eggs survives to adulthood, in a good year. The math only works if adults live for decades — so every adult female flattened on a June road shoulder is a small extinction.",
  },
  {
    stat: "days",
    title: "Until a nest is raided",
    body: "Raccoons and skunks — thriving on our garbage — find and dig most unprotected nests within days of laying. In some wetlands, nest predation approaches 100% without caging.",
  },
];

export type ActionItem = { title: string; body: string };

export const ACTIONS: ActionItem[] = [
  {
    title: "Drive turtle-aware, May to October",
    body: "Scan shoulders and centre lines near water, especially dawn and dusk in June. That 'rock' on the causeway probably isn't one.",
  },
  {
    title: "Help them cross — their way",
    body: "Direction of travel, low to the ground, car-mat sled for snappers. Thirty seconds of your time versus thirty years of hers.",
  },
  {
    title: "Report every sighting",
    body: "Ontario Reptile and Amphibian Atlas or iNaturalist — alive or dead. Road-kill records are how crossing hotspots earn fencing and ecopassages.",
  },
  {
    title: "Call in the injured",
    body: "Ontario Turtle Conservation Centre: 705-741-5000. Dry box, exact location, no food or water. Volunteer Turtle Taxis cover the province.",
  },
  {
    title: "Keep your shoreline wild",
    body: "Leave logs in the water, keep a natural buffer instead of lawn, skip the rip-rap. A 'messy' shoreline is working habitat.",
  },
  {
    title: "Guard the nests you know",
    body: "A wire cage over a driveway or garden nest turns near-certain raccoon predation into a September hatch. Your conservation authority can help.",
  },
  {
    title: "Never buy, never keep, never post locations",
    body: "The pet trade is emptying wetlands of spotted and wood turtles. Report poaching to MNRF TIPS: 1-877-847-7667.",
  },
  {
    title: "Back the infrastructure",
    body: "Ecopassages, wetland protection, atlas funding. Tell your municipality where turtles cross — winter is when road projects get scoped.",
  },
];

// ---------------------------------------------------------------------------
// Resources — real organizations
// ---------------------------------------------------------------------------

export type Resource = {
  name: string;
  role: string;
  href: string;
  phone?: string;
};

export const RESOURCES: Resource[] = [
  {
    name: "Ontario Turtle Conservation Centre",
    role: "Turtle hospital, egg incubation and the province-wide Turtle Taxi network. The number to save in your phone.",
    href: "https://ontarioturtle.ca",
    phone: "705-741-5000",
  },
  {
    name: "Ontario Nature — Reptile & Amphibian Atlas",
    role: "The province's sightings database. Every record — including road-kill — sharpens the map of where protection is needed.",
    href: "https://ontarionature.org/programs/citizen-science/reptile-amphibian-atlas/",
  },
  {
    name: "iNaturalist Canada",
    role: "Snap, upload, done — at-risk species locations are automatically obscured from the public while still reaching scientists.",
    href: "https://inaturalist.ca",
  },
  {
    name: "Turtle Guardians",
    role: "Citizen-science training, nest monitoring and turtle-crossing volunteer programs you can join.",
    href: "https://www.turtleguardians.com",
  },
  {
    name: "Long Point Causeway Improvement Project",
    role: "The southwest's proof of concept: fencing and ecopassages on one of North America's worst road-mortality hotspots.",
    href: "https://www.longpointcauseway.com",
  },
  {
    name: "Toronto Zoo — Adopt-A-Pond",
    role: "Turtle Tally sightings program, curriculum resources and wetland stewardship guides for schools and landowners.",
    href: "https://www.torontozoo.com/adoptapond",
  },
  {
    name: "MNRF TIPS Line",
    role: "Report poaching or illegal sale of native turtles — anonymously if you prefer (or via Crime Stoppers).",
    href: "https://www.ontario.ca/page/report-natural-resource-crime",
    phone: "1-877-847-7667",
  },
  {
    name: "Your conservation authority",
    role: "UTRCA (Thames), St. Clair Region, Essex Region, Ausable Bayfield and Long Point Region all run wetland and species-at-risk stewardship programs.",
    href: "https://conservationontario.ca",
  },
];
