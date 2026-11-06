# Ordo: sacristy calendar

Original minimal desk calendar, deliberately distinct from the four bound books: dark wooden plinth and easel, warm paper, two restrained brass clips and red marker. The seven-column grid is ornamental and contains no date; the world calendar is authoritative. No external font or image dependency.

Canonical source: `../ordo-design.mjs`. `buildOrdoAssets(write,json)` emits `geometry.ordo_calendar`, a 128×128 padded atlas, normal/MER maps, texture set and the native 64×64 inventory icon. North (-Z) is the printed front. The plinth touches Y=0, the page leans back 10°, and all vertices fit the interaction envelope origin `[-5,0,-3]`, size `[10,12,6]` in Bedrock pixels. Nine closed cuboids / 54 faces, no alpha surfaces or zero-thickness planes. The rear support intentionally joins the wooden backing, not the paper face.

Reproduce diagnostic previews after building assets:

    blender -b --python addons/evangeliarium/tools/render-ordo-blender.py

Run from the repository root. The Blender scene packs the exported atlas and reproduces all exported cuboid transforms and per-face UVs. The script emits front, both obliques, rear, both sides, top, bottom, transparent 64px, 32px and 16px inventory samples, and two front views at half/quarter screen size. `render-manifest.json` records render parameters, geometry/texture source hashes and image hashes. The orthographic distance samples test screen-size readability, not perspective or Bedrock mipmapping. `render-ordo.mjs` is the optional shared Bedrock viewer route; it uses the required verified GPU helper with bounded fallback. The delivered captures use Blender Cycles CPU.

To keep before/after evidence outside authored assets, use `-- --output out/ordo-polish/before`. Optional `--geometry <file>` and `--texture <file>` load pinned exported sources for a reproducible baseline. Keep the same Blender version, render settings and camera parameters for both runs.

Checks: `node --experimental-strip-types --test addons/evangeliarium/tests/ordo-art.node.ts`. Visual inspection must confirm legible ORDO, seven columns, no rear support visible through paper, all six sides closed, a grounded plinth and a red marker distinguishable at inventory size.

These renders are diagnostic, not proof of Minecraft parity. In the imported package, place in all four directions, interact from every side, inspect above/below, break and replace, and check inventory scale and Content Log. World calendar interaction is owned by runtime; the model itself carries no local calendar state.

## Independent geometry and texture polish

The timber uses four atlas texels per Bedrock pixel on every face, instead of stretching the same 40×24 rectangle across everything from the broad back to a 0.35px plinth edge. The 40×40 wood tile retains two-texel padding; tests lock the density and prevent sampling outside that tile. The latest grain removes uninterrupted horizontal bands and repeated diagonal clusters, preserving the dark wood palette and the original board/brace/plinth geometry.

The former single 0.2px paper slab is now a 0.08px printed leaf on a 0.25px pad, revealed by 0.05px along both sides and the bottom. The printed face keeps the same width, height and date-free design. Clips still span the paper and backing; the marker overlaps only the printed leaf. Separate padded side/end tiles orient the page strata along depth, with four texels per long-axis pixel and eight along depth (minimum one texel). They no longer stretch a square 16×16 edge tile across every thin face. The grid moves one palette step darker for readability at reduced screen size.

Tests protect leaf/pad contact, clip/marker attachment, the interaction envelope, per-tile UV bounds, two-texel gutter separation/dilation, opaque color pixels, grid contrast and page-strata direction. There is one additional cuboid; runtime, UI, IDs, material assignment, poses and world state are unchanged.

Inspect `opposite-side.png` and `opposite-quarter.png` alongside the original views to check both clip joins and paper edges. `item-16.png` and `item-32.png` are direct camera renders at actual pixel sizes, not enlarged previews. At 16px, judge the pale calendar silhouette, dark base and red marker rather than the tiny ORDO lettering. The native distributed inventory asset remains 64px.
