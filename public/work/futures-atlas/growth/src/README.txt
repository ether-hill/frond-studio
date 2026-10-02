growth.js is built from these two files plus the unchanged core modules of the
Futures Atlas Generatives app (futures-atlas-02, generatives/src/core, MIT).

To rebuild: put growth.ts next to a checkout of generatives/src, replace
src/pieces/differentialGrowth.ts with the patched copy here, and run
  esbuild growth.ts --bundle --format=iife --target=es2019 --outfile=growth.js

The patch adds four switches to the piece, all read from globals that growth.ts
sets: a RATE factor on every per-step displacement (window.__RATE, set in
index.html), a fold scale (__UNIT), a node budget with pruning turned off
(__MAX_NODES, __NO_PRUNE), and an offset (__OX, __OY) so the canvas shows the
middle of a slightly larger simulation. The files carry a .txt suffix so this
site's TypeScript build ignores them.

Tuning without a rebuild: index.html?rate=0.032&start=1000&stop=5800&unit=0.9&hold=9
