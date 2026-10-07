# Bklit preview data

`world-countries.json` is the world TopoJSON Bklit's own choropleth block loads at runtime
(https://github.com/subyfly/topojson, MIT — `LICENSE-world-countries`), fetched
2026-10-07. The sandbox has no network, so the choropleth preview reads this copy; see
`PREVIEW_PATCHES` in `app/api/element-preview/route.ts`.
