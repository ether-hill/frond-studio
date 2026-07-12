# Pollinator Lab — 3D model credits

The viewer can show downloaded glTF models alongside the procedural builds
(toggle: "Model" / "Procedural"). All models below are from **Poly Pizza**
(https://poly.pizza) under the **Creative Commons Attribution 3.0** licence
(CC-BY 3.0, https://creativecommons.org/licenses/by/3.0/). Attribution is also
shown on screen while each model is displayed.

| File | Species slot | Title | Author | Source |
| --- | --- | --- | --- | --- |
| `bee.glb` | Western Honey Bee | "Bee" | jeremy | https://poly.pizza/m/6ktZgxSVVn1 |
| `monarch.glb` | Garden Tiger | "Butterfly" | Poly by Google | https://poly.pizza/m/e9NAQQrCbLu |
| `beetle.glb` | Jewel Beetle | "Beetle" | Poly by Google | https://poly.pizza/m/4yufxgZ1QQ2 |
| `bat.glb` | Vesper Bat | "Bat" | jeremy | https://poly.pizza/m/fzJn9xTT-UO |

To add more: drop a `.glb` in this folder and add an entry to `MODEL_ASSETS`
in `components/projects/pollinator-lab/species.ts` keyed by the species id,
with a `credit`. Species without an entry fall back to the procedural build.
