# Preview default font

`figtree-black.ttf` is Figtree Black (SIL Open Font License, `OFL.txt`), the face React
Bits' own demos use. It is troika's default font inside preview documents: without one,
troika asks a CDN which font covers the text, the sandbox refuses the request, and any
component using drei's `<Text>` (FluidGlass, for one) suspends and draws nothing. See
`DEFAULT_TEXT_FONT` in `app/api/element-preview/route.ts`.
