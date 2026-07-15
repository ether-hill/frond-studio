// Object Viewer — the catalogue.
//
// A studio-lit 3D viewer for a small cabinet of curiosities. Every object is a
// real photoreal glTF model from Poly Haven (all CC0 / public domain), grouped
// into collections. Adding one is a single entry here plus its files under
// /public/models/object-viewer/<slug>/.

export type CollectionId = "arms" | "instruments" | "relics" | "curios";

export type ObjectItem = {
  id: string;
  collection: CollectionId;
  name: string;
  /** Short italic subtitle under the name. */
  subtitle: string;
  /** glTF path (loads its .bin + textures relative to it). */
  gltf: string;
  /** Real-world size in millimetres [x, y, z] from Poly Haven. */
  dims: [number, number, number];
  /** Triangle count. */
  poly: number;
  /** A couple of evocative sentences. */
  about: string;
  /** Material / finish chips. */
  materials: string[];
  /** Poly Haven author(s) for the CC0 credit. */
  author: string;
  /** Poly Haven asset page. */
  url: string;
  /** A one-line curio for the "Did you know" card. */
  note: string;
  /** Fixed orientation offset (radians about Y) for a flattering default view. */
  yaw?: number;
  /** Fixed tilt (radians about X). */
  pitch?: number;
};

export type CollectionMeta = {
  id: CollectionId;
  label: string;
  note: string;
  /** tint used for the sidebar thumbnail glyph. */
  accent: string;
};

export const COLLECTIONS: CollectionMeta[] = [
  { id: "arms", label: "Arms", note: "Blades & bludgeons", accent: "#8f95a3" },
  { id: "instruments", label: "Instruments", note: "Optics & mechanisms", accent: "#b08a4a" },
  { id: "relics", label: "Relics", note: "Statuary & treasure", accent: "#a5794a" },
  { id: "curios", label: "Curios", note: "Odds & ends", accent: "#c98a5a" },
];

export const OBJECTS: ObjectItem[] = [
  // ---- ARMS --------------------------------------------------------------
  {
    id: "antique_katana_01",
    collection: "arms",
    name: "Antique Katana",
    subtitle: "Japanese longsword",
    gltf: "/models/object-viewer/antique_katana_01/antique_katana_01_1k.gltf",
    dims: [93, 93, 1003],
    poly: 6670,
    about:
      "A curved, single-edged blade a little over a metre long, wrapped in a lacquered handle. The gentle sori (curvature) is the signature of a hand-forged katana.",
    materials: ["Steel", "Lacquer", "Ray skin"],
    author: "Tal Swicegood",
    url: "https://polyhaven.com/a/antique_katana_01",
    note: "A traditional katana is folded many times during forging, building up thousands of layers of steel.",
    yaw: -0.5,
  },
  {
    id: "ornate_war_hammer",
    collection: "arms",
    name: "Ornate War Hammer",
    subtitle: "Two-handed polearm",
    gltf: "/models/object-viewer/ornate_war_hammer/ornate_war_hammer_1k.gltf",
    dims: [144, 35, 711],
    poly: 5192,
    about:
      "A cross-shaped head on a long haft — a beak on one side to punch through plate, a hammer face on the other. Function dressed up as ceremony.",
    materials: ["Blackened steel", "Brass", "Wood"],
    author: "James Ray Cock, Ulan Cabanilla",
    url: "https://polyhaven.com/a/ornate_war_hammer",
    note: "War hammers rose alongside plate armour — when swords stopped cutting through steel, blunt force took over.",
    yaw: -0.4,
  },
  {
    id: "ornate_medieval_mace",
    collection: "arms",
    name: "Ornate Medieval Mace",
    subtitle: "Flanged bludgeon",
    gltf: "/models/object-viewer/ornate_medieval_mace/ornate_medieval_mace_1k.gltf",
    dims: [95, 102, 630],
    poly: 14762,
    about:
      "A flanged head crowning a decorated shaft. The raised ridges concentrate every swing into a single edge, splitting armour that a round head would only dent.",
    materials: ["Steel", "Gilt bronze"],
    author: "Ulan Cabanilla",
    url: "https://polyhaven.com/a/ornate_medieval_mace",
    note: "By the late Middle Ages the mace was as much a badge of rank as a weapon — the ceremonial mace still opens parliaments today.",
    yaw: -0.4,
  },
  // ---- INSTRUMENTS -------------------------------------------------------
  {
    id: "vintage_microscope",
    collection: "instruments",
    name: "Vintage Microscope",
    subtitle: "Brass compound scope",
    gltf: "/models/object-viewer/vintage_microscope/vintage_microscope_1k.gltf",
    dims: [107, 182, 400],
    poly: 20631,
    about:
      "A brass-and-black compound microscope on a horseshoe foot. Two lenses in a long tube multiply their magnification, opening a window onto the very small.",
    materials: ["Brass", "Enamelled iron", "Glass"],
    author: "Luis José Fernández Rodríguez",
    url: "https://polyhaven.com/a/vintage_microscope",
    note: "Compound microscopes like this revealed cells, microbes and crystals — and founded whole sciences in the process.",
    yaw: -0.6,
  },
  {
    id: "seadogs_compass",
    collection: "instruments",
    name: "Seadog's Compass",
    subtitle: "Lidded pocket compass",
    gltf: "/models/object-viewer/seadogs_compass/seadogs_compass_1k.gltf",
    dims: [81, 150, 87],
    poly: 11645,
    about:
      "A hinged brass compass with a sighting lid, worn smooth by handling. A magnetised needle floats to north no matter how the case is turned.",
    materials: ["Brass", "Glass"],
    author: "Benny Weimer",
    url: "https://polyhaven.com/a/seadogs_compass",
    note: "A magnetic compass points to the magnetic pole, which wanders — navigators correct for the drift with a 'declination' offset.",
    yaw: -0.3,
  },
  {
    id: "filmstrip_projector_8mm",
    collection: "instruments",
    name: "8mm Film Projector",
    subtitle: "Home cine projector",
    gltf: "/models/object-viewer/filmstrip_projector_8mm/filmstrip_projector_8mm_1k.gltf",
    dims: [254, 603, 345],
    poly: 32697,
    about:
      "A mid-century home projector with its two red reels raised like ears. It pulls 8mm film past a lamp frame by frame, throwing home movies onto the wall.",
    materials: ["Cast metal", "Bakelite", "Rubber"],
    author: "PeterM",
    url: "https://polyhaven.com/a/filmstrip_projector_8mm",
    note: "Film reads as motion because of persistence of vision — still frames flashed fast enough that the eye blends them together.",
    yaw: 0.4,
  },
  {
    id: "vintage_binocular",
    collection: "instruments",
    name: "Vintage Binoculars",
    subtitle: "Porro-prism field glasses",
    gltf: "/models/object-viewer/vintage_binocular/vintage_binocular_1k.gltf",
    dims: [194, 199, 68],
    poly: 19362,
    about:
      "Leather-clad field binoculars with the offset barrels of a Porro-prism design. Two small telescopes, folded by prisms so the image comes back the right way up.",
    materials: ["Leather", "Brass", "Glass"],
    author: "Luke",
    url: "https://polyhaven.com/a/vintage_binocular",
    note: "The prisms inside don't just fold the light to save length — they also flip the upside-down telescope image back upright.",
    yaw: 0,
    pitch: -0.2,
  },
  // ---- RELICS ------------------------------------------------------------
  {
    id: "treasure_chest",
    collection: "relics",
    name: "Treasure Chest",
    subtitle: "Iron-bound coffer",
    gltf: "/models/object-viewer/treasure_chest/treasure_chest_1k.gltf",
    dims: [959, 523, 619],
    poly: 103330,
    about:
      "A domed wooden chest banded in wrought iron, studded and hasped. Nearly a metre wide, it is the most detailed piece in the cabinet at over 100,000 triangles.",
    materials: ["Oak", "Wrought iron"],
    author: "Rico Cilliers",
    url: "https://polyhaven.com/a/treasure_chest",
    note: "Real sea chests had rounded lids so water would run off — and so nothing could be stacked on top to hide the lock.",
    yaw: -0.5,
  },
  {
    id: "bronze_ray_statue",
    collection: "relics",
    name: "Bronze Ray Statue",
    subtitle: "Cast manta sculpture",
    gltf: "/models/object-viewer/bronze_ray_statue/bronze_ray_statue_1k.gltf",
    dims: [707, 536, 590],
    poly: 1844,
    about:
      "A manta ray caught mid-glide, cast in patinated bronze on a plinth. Sweeping and almost weightless, its low polygon count belies how fluid it reads.",
    materials: ["Patinated bronze", "Marble"],
    author: "Tina",
    url: "https://polyhaven.com/a/bronze_ray_statue",
    note: "Manta rays 'fly' through water by flapping their fins like wings — the same motion this bronze freezes in place.",
    yaw: -0.6,
  },
  {
    id: "lion_head",
    collection: "relics",
    name: "Lion Head",
    subtitle: "Bronze wall bust",
    gltf: "/models/object-viewer/lion_head/lion_head_1k.gltf",
    dims: [321, 207, 436],
    poly: 47214,
    about:
      "A maned lion's head cast in dark bronze, every strand of the mane picked out in relief. The kind of piece that guards a doorway or anchors a mantel.",
    materials: ["Bronze"],
    author: "Tina",
    url: "https://polyhaven.com/a/lion_head",
    note: "Lions have guarded thresholds in art for millennia — from Assyrian gates to the pair outside the New York Public Library.",
    yaw: 0,
  },
  {
    id: "carved_wooden_elephant",
    collection: "relics",
    name: "Carved Wooden Elephant",
    subtitle: "Hardwood figurine",
    gltf: "/models/object-viewer/carved_wooden_elephant/carved_wooden_elephant_1k.gltf",
    dims: [109, 58, 96],
    poly: 2752,
    about:
      "A small elephant carved from a single block of hardwood, trunk raised. The grain runs right through the body — a souvenir with real warmth to it.",
    materials: ["Hardwood"],
    author: "Greg Zaal",
    url: "https://polyhaven.com/a/carved_wooden_elephant",
    note: "A raised trunk is read as a symbol of good luck — which is why so many carved elephants are posed exactly this way.",
    yaw: -0.5,
  },
  // ---- CURIOS ------------------------------------------------------------
  {
    id: "pocket_watch",
    collection: "curios",
    name: "Pocket Watch",
    subtitle: "Open-face timepiece",
    gltf: "/models/object-viewer/pocket_watch/pocket_watch_1k.gltf",
    dims: [58, 16, 76],
    poly: 15615,
    about:
      "A gold open-face pocket watch with a Roman dial and a ringed crown. Small, dense and jewel-like — the whole of clockwork shrunk into the palm.",
    materials: ["Gold plate", "Enamel", "Glass"],
    author: "PierreB3D",
    url: "https://polyhaven.com/a/pocket_watch",
    note: "Pocket watches faded after the First World War, when soldiers found wristwatches far quicker to read under fire.",
    yaw: 0,
    pitch: -0.25,
  },
  {
    id: "old_gas_mask",
    collection: "curios",
    name: "Old Gas Mask",
    subtitle: "Filtered respirator",
    gltf: "/models/object-viewer/old_gas_mask/old_gas_mask_1k.gltf",
    dims: [211, 309, 1126],
    poly: 18900,
    about:
      "A rubber respirator with round glass eyepieces and a long corrugated hose to a filter canister. Unsettling and industrial, worn thin with age.",
    materials: ["Rubber", "Canvas", "Glass"],
    author: "Michał Wiśniewski",
    url: "https://polyhaven.com/a/old_gas_mask",
    note: "Early gas-mask filters were packed with activated charcoal — the same material used today to purify water and air.",
    yaw: -0.4,
  },
  {
    id: "rubber_duck_toy",
    collection: "curios",
    name: "Rubber Duck",
    subtitle: "Bath toy",
    gltf: "/models/object-viewer/rubber_duck_toy/rubber_duck_toy_1k.gltf",
    dims: [214, 300, 286],
    poly: 4288,
    about:
      "The cheerful counterweight to everything else in the cabinet: a glossy yellow bath duck with an orange bill. Deliberately, defiantly ordinary.",
    materials: ["Vinyl"],
    author: "Plat251",
    url: "https://polyhaven.com/a/rubber_duck_toy",
    note: "Programmers 'rubber-duck debug' by explaining code line by line to a toy duck — saying it aloud is often enough to find the bug.",
    yaw: -0.6,
  },
];

export const objectById = (id: string) => OBJECTS.find((o) => o.id === id)!;
export const objectsInCollection = (c: CollectionId) => OBJECTS.filter((o) => o.collection === c);

/** Format Poly Haven millimetre dims to a friendly centimetre string. */
export function fmtDims(dims: [number, number, number]): string {
  const cm = dims.map((d) => d / 10);
  const fmt = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1));
  return `${fmt(cm[0])} × ${fmt(cm[1])} × ${fmt(cm[2])} cm`;
}
