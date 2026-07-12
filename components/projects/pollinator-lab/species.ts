// Pollinator Lab — species catalogue.
//
// The whole app is data-driven from this file: categories drive the sidebar,
// each species carries its field-guide facts and a compact `model` spec that
// the procedural three.js builders (models.ts) turn into a creature. Adding a
// pollinator is a single object here — no renderer changes required.

export type Category =
  | "bees"
  | "moths"
  | "beetles"
  | "hummingbirds"
  | "bats";

export type TagKind = "region" | "time" | "trait" | "group";

export type Tag = { label: string; kind: TagKind };

export type Fact = { key: FactKey; body: string };
export type FactKey = "details" | "pollination" | "flowers" | "range" | "role";

// ---- procedural model spec ----------------------------------------------

export type ModelKind = "bee" | "moth" | "beetle" | "hummingbird" | "bat";

export type ModelSpec = {
  kind: ModelKind;
  /** Overall scale multiplier applied to the whole creature. */
  scale?: number;
  /** Primary body colour. */
  body: number;
  /** Secondary / banding colour. */
  body2?: number;
  /** Highlight (eyes, gorget, leg tips…). */
  accent?: number;
  /** Wing membrane / fur-tip colour. */
  wing?: number;
  /** Thin-film iridescence on the shell (orchid bees, jewel beetles). */
  iridescent?: boolean;
  /** Automotive clearcoat over the base — hard beetle shells. */
  clearcoat?: boolean;
  /** Fuzzy pile (bumble/honey bees, moth thorax). */
  fuzzy?: boolean;
  /** Metalness of the body material, 0..1. */
  metalness?: number;
  /** Wing / fur pattern used by the canvas texture painter. */
  pattern?: "plain" | "tiger" | "eyespots" | "bands" | "speckle";
  /** Wing colours for patterned lepidoptera. */
  wingA?: number;
  wingB?: number;
};

// ---- flower "fit" card ---------------------------------------------------

export type FlowerSpec = {
  name: string;
  /** Petal colour. */
  petal: string;
  /** Inner / throat colour. */
  center: string;
  /** Petal count for the procedural bloom. */
  petals: number;
  /** "trumpet" (long tubular, radial), "open" (flat daisy), "orchid", "spike". */
  form: "open" | "trumpet" | "orchid" | "spike" | "cup";
};

export type Species = {
  id: string;
  category: Category;
  name: string;
  latin: string;
  family: string;
  guideNo: number;
  tags: Tag[];
  facts: Fact[];
  flower: FlowerSpec;
  /** One-line "Today's Discovery" style curio. */
  curio: string;
  model: ModelSpec;
};

export type CategoryMeta = {
  id: Category;
  label: string;
  /** Latin/kingdom-ish subtitle line in the sidebar. */
  note: string;
  /** id of the species used for the sidebar thumbnail. */
  thumb: string;
};

export const CATEGORIES: CategoryMeta[] = [
  { id: "bees", label: "Bees", note: "Apoidea", thumb: "orchid-bee" },
  { id: "moths", label: "Moths", note: "Lepidoptera", thumb: "garden-tiger" },
  { id: "beetles", label: "Beetles", note: "Coleoptera", thumb: "jewel-beetle" },
  { id: "hummingbirds", label: "Hummingbirds", note: "Trochilidae", thumb: "ruby-throated" },
  { id: "bats", label: "Bats", note: "Chiroptera", thumb: "vesper-bat" },
];

export const SPECIES: Species[] = [
  // ---- BEES --------------------------------------------------------------
  {
    id: "orchid-bee",
    category: "bees",
    name: "Orchid Bee",
    latin: "Euglossa dilemma",
    family: "Apidae",
    guideNo: 7,
    tags: [
      { label: "Neotropical", kind: "region" },
      { label: "Diurnal", kind: "time" },
      { label: "Solitary", kind: "trait" },
      { label: "Fragrance Collector", kind: "group" },
    ],
    facts: [
      { key: "details", body: "Medium-sized bee (11–15 mm). Males are brilliantly iridescent green-to-blue; females are darker with green highlights." },
      { key: "pollination", body: "Visits a wide variety of flowers. Uses strong flight and agility to reach into long, complex blooms." },
      { key: "flowers", body: "Orchids, Catasetum, Stanhopea, vanilla, passionflower and fragrant forest flowers." },
      { key: "range", body: "Central America to northern South America — from Mexico to Brazil, now also Florida." },
      { key: "role", body: "Keystone pollinator of orchids and countless other neotropical forest plants." },
    ],
    flower: { name: "Cattleya Orchid", petal: "#c78fd8", center: "#f2c94c", petals: 5, form: "orchid" },
    curio: "Male orchid bees collect floral fragrances and store the scent in specialized pockets on their hind legs.",
    model: { kind: "bee", body: 0x1f8f5f, body2: 0x2b6fd6, accent: 0x120f14, wing: 0x9fb6c4, iridescent: true, metalness: 0.85 },
  },
  {
    id: "honey-bee",
    category: "bees",
    name: "Western Honey Bee",
    latin: "Apis mellifera",
    family: "Apidae",
    guideNo: 1,
    tags: [
      { label: "Cosmopolitan", kind: "region" },
      { label: "Diurnal", kind: "time" },
      { label: "Eusocial", kind: "trait" },
    ],
    facts: [
      { key: "details", body: "Amber-and-black worker, 12–15 mm, with a dense coat of branched hairs that trap pollen grains." },
      { key: "pollination", body: "Forages by scent and colour; packs pollen into corbiculae (pollen baskets) on the hind legs." },
      { key: "flowers", body: "Clover, almond, apple, canola, lavender and thousands of crop and wildflowers." },
      { key: "range", body: "Native to Eurasia and Africa; now managed on every continent except Antarctica." },
      { key: "role", body: "The most economically important managed pollinator on Earth — a third of what we eat depends on it." },
    ],
    flower: { name: "Lavender", petal: "#8a7dd6", center: "#5f56a8", petals: 6, form: "spike" },
    curio: "A honey bee communicates the direction and distance of flowers to the hive through a figure-eight 'waggle dance'.",
    model: { kind: "bee", body: 0xd79a2b, body2: 0x241a12, accent: 0x120f14, wing: 0xbfcedd, fuzzy: true, metalness: 0.1 },
  },
  {
    id: "bumble-bee",
    category: "bees",
    name: "Buff-tailed Bumble Bee",
    latin: "Bombus terrestris",
    family: "Apidae",
    guideNo: 3,
    tags: [
      { label: "Palearctic", kind: "region" },
      { label: "Diurnal", kind: "time" },
      { label: "Eusocial", kind: "trait" },
      { label: "Buzz Pollinator", kind: "group" },
    ],
    facts: [
      { key: "details", body: "Large and round (up to 22 mm), thickly furred in black with two lemon bands and a buff tail." },
      { key: "pollination", body: "A buzz pollinator — grips a flower and vibrates its flight muscles to shake pollen loose." },
      { key: "flowers", body: "Tomato, blueberry, heather, comfrey, foxglove and deep tubular flowers." },
      { key: "range", body: "Europe, North Africa and western Asia; introduced for greenhouse pollination worldwide." },
      { key: "role", body: "Vital for buzz-pollinated crops that honey bees cannot service, especially tomatoes." },
    ],
    flower: { name: "Foxglove", petal: "#d081b8", center: "#efd9e6", petals: 5, form: "trumpet" },
    curio: "Bumble bees can fly in colder, dimmer weather than most bees — their dense fur keeps their flight muscles warm.",
    model: { kind: "bee", body: 0x1c150f, body2: 0xf2c53d, accent: 0xf1ead9, wing: 0xc4d1dd, fuzzy: true, metalness: 0.05, scale: 1.15, pattern: "bands" },
  },
  {
    id: "carpenter-bee",
    category: "bees",
    name: "Violet Carpenter Bee",
    latin: "Xylocopa violacea",
    family: "Apidae",
    guideNo: 9,
    tags: [
      { label: "Palearctic", kind: "region" },
      { label: "Diurnal", kind: "time" },
      { label: "Solitary", kind: "trait" },
    ],
    facts: [
      { key: "details", body: "A big (up to 28 mm), glossy blue-black bee with smoky violet-sheened wings and a low, loud hum." },
      { key: "pollination", body: "Powerful enough to force open stiff, spring-loaded flowers; sometimes 'robs' nectar through the petal base." },
      { key: "flowers", body: "Wisteria, salvia, pea flowers, passionflower and other large sturdy blooms." },
      { key: "range", body: "Southern and central Europe, expanding north with warming summers." },
      { key: "role", body: "Effective pollinator of large legume and vine flowers few smaller bees can operate." },
    ],
    flower: { name: "Wisteria", petal: "#9a86d4", center: "#c9bff0", petals: 5, form: "spike" },
    curio: "Carpenter bees chew perfectly round tunnels into dead wood — you can sometimes hear the rasping from inside a beam.",
    model: { kind: "bee", body: 0x211d3a, body2: 0x3a2f66, accent: 0x6b4fb0, wing: 0x6a5a86, iridescent: true, metalness: 0.7, scale: 1.2 },
  },

  // ---- MOTHS -------------------------------------------------------------
  {
    id: "garden-tiger",
    category: "moths",
    name: "Garden Tiger",
    latin: "Arctia caja",
    family: "Erebidae",
    guideNo: 12,
    tags: [
      { label: "Nocturnal", kind: "time" },
      { label: "Nearctic", kind: "region" },
      { label: "Tiger Moth", kind: "group" },
    ],
    facts: [
      { key: "details", body: "Bold moth with a 5–7 cm span: chocolate-and-cream forewings over startling orange hindwings dotted blue-black." },
      { key: "pollination", body: "Visits pale, fragrant, night-blooming flowers, transferring pollen on its furred body." },
      { key: "flowers", body: "Evening primrose, night-blooming jasmine, honeysuckle and phlox." },
      { key: "range", body: "Across the northern hemisphere — Europe, northern Asia and North America." },
      { key: "role", body: "Nocturnal pollinator and, as a caterpillar, food for a wide web of birds and bats." },
    ],
    flower: { name: "Evening Primrose", petal: "#f4de6b", center: "#c9a63a", petals: 4, form: "open" },
    curio: "The garden tiger's vivid hindwings are a warning: it is toxic, and flashes them to startle predators.",
    model: { kind: "moth", body: 0x5a3d2b, accent: 0xe86a2a, wingA: 0x6b4a33, wingB: 0xf3ead2, pattern: "tiger", fuzzy: true, scale: 1.1 },
  },
  {
    id: "luna-moth",
    category: "moths",
    name: "Luna Moth",
    latin: "Actias luna",
    family: "Saturniidae",
    guideNo: 18,
    tags: [
      { label: "Nocturnal", kind: "time" },
      { label: "Nearctic", kind: "region" },
      { label: "Giant Silk Moth", kind: "group" },
    ],
    facts: [
      { key: "details", body: "Luminous pale-green wings up to 11 cm across, each with an eyespot and long curling hindwing tails." },
      { key: "pollination", body: "Adults do not feed, but carry pollen between blooms while searching for mates on warm nights." },
      { key: "flowers", body: "Visits pale night flowers incidentally; the caterpillar feeds on birch, walnut and sweetgum." },
      { key: "range", body: "Deciduous forests of eastern North America." },
      { key: "role", body: "An indicator of healthy woodland; its trailing tails jam bat echolocation." },
    ],
    flower: { name: "Moonflower", petal: "#f3f0e2", center: "#e7e0b6", petals: 5, form: "trumpet" },
    curio: "Adult luna moths have no mouthparts — they live about a week on stored energy, existing only to reproduce.",
    model: { kind: "moth", body: 0xdfe6c2, accent: 0xf0b8c8, wingA: 0xbfe0a8, wingB: 0xd9ecc4, pattern: "eyespots", fuzzy: true, scale: 1.25 },
  },
  {
    id: "hawk-moth",
    category: "moths",
    name: "Hummingbird Hawk-moth",
    latin: "Macroglossum stellatarum",
    family: "Sphingidae",
    guideNo: 21,
    tags: [
      { label: "Diurnal", kind: "time" },
      { label: "Palearctic", kind: "region" },
      { label: "Hawk Moth", kind: "group" },
    ],
    facts: [
      { key: "details", body: "A stout day-flying moth that hovers like a tiny bird, with orange hindwings and a fanned tail." },
      { key: "pollination", body: "Hovers at flowers and probes with an extremely long proboscis, transferring pollen mid-air." },
      { key: "flowers", body: "Red valerian, honeysuckle, jasmine, phlox and other long-throated tubular flowers." },
      { key: "range", body: "Southern Europe and North Africa, migrating far north across Europe and Asia each summer." },
      { key: "role", body: "One of the few moths that pollinate by day, servicing deep flowers other insects cannot reach." },
    ],
    flower: { name: "Red Valerian", petal: "#e0546a", center: "#f1b8bf", petals: 5, form: "spike" },
    curio: "The hummingbird hawk-moth beats its wings up to 85 times a second and can remember which flowers it has already emptied.",
    model: { kind: "moth", body: 0x6a5744, accent: 0xe08a2a, wingA: 0x8a7458, wingB: 0xe0913f, pattern: "bands", fuzzy: true, scale: 0.95 },
  },

  // ---- BEETLES -----------------------------------------------------------
  {
    id: "jewel-beetle",
    category: "beetles",
    name: "Jewel Beetle",
    latin: "Buprestidae",
    family: "Buprestidae",
    guideNo: 24,
    tags: [
      { label: "Coleoptera", kind: "group" },
      { label: "Wood-boring", kind: "trait" },
    ],
    facts: [
      { key: "details", body: "Brilliantly metallic, often green-gold; the elytra are textured or pitted and catch light like enamel." },
      { key: "pollination", body: "Accidental pollinators — they consume pollen and floral tissue, transferring pollen as they move." },
      { key: "flowers", body: "Magnolia, water lilies and various ancient, bowl-shaped floral lineages." },
      { key: "range", body: "Worldwide, with highest diversity in tropical forests." },
      { key: "role", body: "Vital decomposers of dead wood; among the oldest pollinators, predating bees by millions of years." },
    ],
    flower: { name: "Magnolia", petal: "#f3e7e0", center: "#e6c07a", petals: 6, form: "cup" },
    curio: "Some jewel-beetle elytra keep their colour for centuries and have been used as living jewellery in embroidery.",
    model: { kind: "beetle", body: 0x2f7a3a, body2: 0x8a8f2a, accent: 0x1a1410, clearcoat: true, iridescent: true, metalness: 0.9 },
  },
  {
    id: "rose-chafer",
    category: "beetles",
    name: "Rose Chafer",
    latin: "Cetonia aurata",
    family: "Scarabaeidae",
    guideNo: 27,
    tags: [
      { label: "Diurnal", kind: "time" },
      { label: "Palearctic", kind: "region" },
      { label: "Scarab", kind: "group" },
    ],
    facts: [
      { key: "details", body: "A rounded scarab of metallic emerald-gold, 14–20 mm, that flies with a low droning buzz on warm days." },
      { key: "pollination", body: "Feeds on pollen and petals inside open flowers, dusting itself and carrying pollen between blooms." },
      { key: "flowers", body: "Roses, elder, hawthorn, cow parsley and other open, pollen-rich flowers." },
      { key: "range", body: "Europe and into central Asia, in warm sunny meadows and gardens." },
      { key: "role", body: "A daytime beetle pollinator of open flowers; its grubs recycle decaying plant matter." },
    ],
    flower: { name: "Dog Rose", petal: "#f0b9c6", center: "#f2d873", petals: 5, form: "open" },
    curio: "Rose chafers can fly without opening their wing-cases — the membranous wings slip out through a notch at the side.",
    model: { kind: "beetle", body: 0x3f8f4a, body2: 0xb08a2e, accent: 0x1a1410, clearcoat: true, iridescent: true, metalness: 0.85, scale: 0.95 },
  },
  {
    id: "soldier-beetle",
    category: "beetles",
    name: "Soldier Beetle",
    latin: "Cantharidae",
    family: "Cantharidae",
    guideNo: 31,
    tags: [
      { label: "Diurnal", kind: "time" },
      { label: "Holarctic", kind: "region" },
    ],
    facts: [
      { key: "details", body: "A soft-bodied beetle, orange and black, with long straight wing-cases and a busy, ambling walk over flower heads." },
      { key: "pollination", body: "Spends whole days on flat flower clusters, moving constantly and spreading pollen as it feeds and mates." },
      { key: "flowers", body: "Umbellifers, goldenrod, daisies and other broad, flat-topped flower clusters." },
      { key: "range", body: "Temperate meadows across the northern hemisphere." },
      { key: "role", body: "A generalist pollinator of open flowers and a predator of aphids — doubly useful in a garden." },
    ],
    flower: { name: "Goldenrod", petal: "#f2c744", center: "#d99a2b", petals: 8, form: "spike" },
    curio: "Soldier beetles are so often seen mating on flower heads that one common species is nicknamed the 'bloodsucker' — though it is harmless.",
    model: { kind: "beetle", body: 0xd9772e, body2: 0x2a2018, accent: 0x1a1410, clearcoat: false, metalness: 0.2, scale: 0.85 },
  },

  // ---- HUMMINGBIRDS ------------------------------------------------------
  {
    id: "ruby-throated",
    category: "hummingbirds",
    name: "Ruby-throated",
    latin: "Archilochus colubris",
    family: "Trochilidae",
    guideNo: 45,
    tags: [
      { label: "Avian", kind: "region" },
      { label: "Migratory", kind: "trait" },
    ],
    facts: [
      { key: "details", body: "A tiny bird with an emerald-green back and crown; males flash a brilliant, iridescent red throat (a gorget)." },
      { key: "pollination", body: "Highly specialized. Transfers pollen on its forehead and bill while hovering to drink nectar." },
      { key: "flowers", body: "Trumpet creeper, cardinal flower, honeysuckle and bee balm." },
      { key: "range", body: "Breeds across eastern North America, winters in Central America." },
      { key: "role", body: "A crucial pollinator of red, tubular flowers, and a controller of small insect populations." },
    ],
    flower: { name: "Trumpet Creeper", petal: "#e2542f", center: "#f2a24a", petals: 5, form: "trumpet" },
    curio: "A ruby-throated hummingbird crosses the Gulf of Mexico in a single 800 km flight, nearly doubling its body weight in fat beforehand.",
    model: { kind: "hummingbird", body: 0x2f8f5a, body2: 0x1f6f4a, accent: 0xd23a2f, wing: 0x5a5148, iridescent: true, metalness: 0.6 },
  },
  {
    id: "violet-sabrewing",
    category: "hummingbirds",
    name: "Violet Sabrewing",
    latin: "Campylopterus hemileucurus",
    family: "Trochilidae",
    guideNo: 48,
    tags: [
      { label: "Neotropical", kind: "region" },
      { label: "Highland", kind: "trait" },
    ],
    facts: [
      { key: "details", body: "A large hummingbird cloaked in deep violet, with a boldly white-cornered tail and a curved black bill." },
      { key: "pollination", body: "Its long, decurved bill matches curved flowers exactly, pollinating them as it feeds." },
      { key: "flowers", body: "Heliconia, banana flowers, and long curved cloud-forest blooms." },
      { key: "range", body: "Mountain cloud forests from southern Mexico to Costa Rica and Panama." },
      { key: "role", body: "The key pollinator of curved, long-tubed highland flowers that shorter-billed birds cannot reach." },
    ],
    flower: { name: "Heliconia", petal: "#e04b3a", center: "#f0c23a", petals: 4, form: "spike" },
    curio: "The violet sabrewing's wings are stiffened and 'sabre'-shaped, letting the big bird hover with unusual power at exposed forest edges.",
    model: { kind: "hummingbird", body: 0x5a3f9e, body2: 0x3f2c78, accent: 0xf1ece0, wing: 0x4a4256, iridescent: true, metalness: 0.6, scale: 1.15 },
  },
  {
    id: "bee-hummingbird",
    category: "hummingbirds",
    name: "Bee Hummingbird",
    latin: "Mellisuga helenae",
    family: "Trochilidae",
    guideNo: 52,
    tags: [
      { label: "Neotropical", kind: "region" },
      { label: "Endemic", kind: "trait" },
    ],
    facts: [
      { key: "details", body: "The smallest bird on Earth — about 5.5 cm and 2 g. Breeding males wear a fiery pink-red head and gorget." },
      { key: "pollination", body: "Visits up to 1,500 flowers a day, carrying pollen on its head between them." },
      { key: "flowers", body: "Native Cuban shrubs and vines with small tubular flowers." },
      { key: "range", body: "Endemic to Cuba and the Isla de la Juventud." },
      { key: "role", body: "A specialist pollinator of Cuban flora; several plants depend almost entirely on it." },
    ],
    flower: { name: "Solandra Vine", petal: "#e6b84a", center: "#c98a2e", petals: 5, form: "trumpet" },
    curio: "A bee hummingbird's heart beats over 1,200 times a minute in flight, and its wings hum at up to 80 beats a second.",
    model: { kind: "hummingbird", body: 0x3f7fb0, body2: 0x2c5f8a, accent: 0xe0487a, wing: 0x5a5148, iridescent: true, metalness: 0.6, scale: 0.8 },
  },

  // ---- BATS --------------------------------------------------------------
  {
    id: "vesper-bat",
    category: "bats",
    name: "Vesper Bat",
    latin: "Vespertilionidae",
    family: "Vespertilionidae",
    guideNo: 62,
    tags: [
      { label: "Mammal", kind: "region" },
      { label: "Nocturnal", kind: "time" },
      { label: "Keystone Species", kind: "group" },
    ],
    facts: [
      { key: "details", body: "A small bat with yellow-brown to grey fur and an elongated muzzle built for reaching into deep flowers." },
      { key: "pollination", body: "Hovers to drink nectar; its fur collects copious pollen that is transferred between plants." },
      { key: "flowers", body: "Agave, saguaro, organ pipe cactus and other night-blooming cacti." },
      { key: "range", body: "Southwestern United States to Central America." },
      { key: "role", body: "Primary pollinator of agave — the plant used to make tequila — and of columnar cacti." },
    ],
    flower: { name: "Agave", petal: "#a9c46a", center: "#7f9e3a", petals: 6, form: "spike" },
    curio: "Without nectar-feeding bats there would be no wild agave — and no tequila; a single bat can pollinate dozens of plants a night.",
    model: { kind: "bat", body: 0x6a4a34, body2: 0x8a6a4a, accent: 0x3a2a20, wing: 0x4a352a, metalness: 0.05, scale: 1.05 },
  },
  {
    id: "flying-fox",
    category: "bats",
    name: "Flying Fox",
    latin: "Pteropus",
    family: "Pteropodidae",
    guideNo: 66,
    tags: [
      { label: "Mammal", kind: "region" },
      { label: "Nocturnal", kind: "time" },
      { label: "Megabat", kind: "group" },
    ],
    facts: [
      { key: "details", body: "A large fruit bat with a fox-like face, russet fur and a wingspan that can exceed 1.5 metres." },
      { key: "pollination", body: "Pushes its face deep into big night flowers for nectar, carrying pollen for kilometres between trees." },
      { key: "flowers", body: "Eucalyptus, baobab, durian, banana and kapok flowers." },
      { key: "range", body: "Tropical Asia, Australia, and islands of the Indian and Pacific Oceans." },
      { key: "role", body: "A long-distance pollinator and seed disperser that keeps rainforests genetically connected." },
    ],
    flower: { name: "Baobab", petal: "#f0ead4", center: "#c9a24a", petals: 5, form: "open" },
    curio: "Durian — the notorious 'king of fruits' — depends almost entirely on flying foxes to pollinate its flowers.",
    model: { kind: "bat", body: 0x8a4f2e, body2: 0xb0714a, accent: 0x3a251a, wing: 0x5a3524, metalness: 0.05, scale: 1.3 },
  },
  {
    id: "long-tongued-bat",
    category: "bats",
    name: "Long-tongued Bat",
    latin: "Glossophaga soricina",
    family: "Phyllostomidae",
    guideNo: 69,
    tags: [
      { label: "Mammal", kind: "region" },
      { label: "Nocturnal", kind: "time" },
      { label: "Nectarivore", kind: "trait" },
    ],
    facts: [
      { key: "details", body: "A small leaf-nosed bat with a slender snout and a tongue nearly as long as its body, tipped with brush-like papillae." },
      { key: "pollination", body: "Hovers at flowers like a hummingbird, lapping nectar and dusting its face with pollen." },
      { key: "flowers", body: "Calabash, balsa, banana and many bat-adapted night-blooming flowers." },
      { key: "range", body: "Mexico through Central America into northern South America." },
      { key: "role", body: "An agile hovering pollinator that services delicate flowers larger bats would damage." },
    ],
    flower: { name: "Calabash", petal: "#e7e0c4", center: "#b0964a", petals: 5, form: "cup" },
    curio: "Its tongue can extend past 8 cm and, uniquely among mammals, pumps blood into the tip to flare the nectar-mopping bristles.",
    model: { kind: "bat", body: 0x7a5a42, body2: 0x9a7858, accent: 0x3a2a20, wing: 0x4a382c, metalness: 0.05, scale: 0.9 },
  },
];

export const speciesById = (id: string) => SPECIES.find((s) => s.id === id)!;
export const speciesInCategory = (c: Category) => SPECIES.filter((s) => s.category === c);
export const categoryCount = (c: Category) => speciesInCategory(c).length;

export const FACT_META: Record<FactKey, { label: string; icon: string; tint: string }> = {
  details: { label: "Species Details", icon: "hex", tint: "#5b8fb0" },
  pollination: { label: "Pollination Traits", icon: "grid", tint: "#d17aa8" },
  flowers: { label: "Favorite Flowers", icon: "flower", tint: "#e0a53a" },
  range: { label: "Range", icon: "pin", tint: "#4f9e7a" },
  role: { label: "Ecological Role", icon: "leaf", tint: "#6aa84f" },
};

export const TAG_TINT: Record<TagKind, { bg: string; fg: string }> = {
  region: { bg: "#d8e8d0", fg: "#3f6b46" },
  time: { bg: "#f0e0c8", fg: "#8a5a2a" },
  trait: { bg: "#e6def0", fg: "#6a4f8f" },
  group: { bg: "#d4e6ee", fg: "#3f6b82" },
};
