# React Bits demo assets

The model and texture files React Bits' own demos load, kept here so their previews can
run inside the sandbox, which has no network. They are inlined into a preview document
as `data:` URLs by `app/api/element-preview/route.ts` (see `PREVIEW_ASSETS`) and are
used for nothing else.

From https://github.com/DavidHDev/react-bits (`public/assets/3d/`, `src/assets/lanyard/`),
fetched 2026-10-04, under the licence in `LICENSE.md`, which permits their use as part
of an application.

`lens.glb` is stored with its Draco compression removed (same geometry, decoded with
glTF-Transform): a Draco file makes drei fetch its decoder from gstatic.com, which the
sandbox cannot reach.
