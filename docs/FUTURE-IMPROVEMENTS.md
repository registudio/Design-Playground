# Potential future improvements

Deferred by user selection on 22 September 2026.

- Content 1: Per-element practical guidance: ideal placement, interaction style, accessibility considerations and browser requirements.
- Content 2: Richer attribution: author, direct source link, license, engine, dependencies and supported framework. Verify metadata upstream before displaying it.
- Features 1: Dedicated pinned comparison workspace with engines, measured bundle cost and behavior comparisons. The compact selected gallery is the current lightweight starting point.
- Features 2: Reusable full-project presets for templates, sections, typography, colors, motion and elements.
- Performance 2: Adaptive preview resolution, frame rate and WebGL quality based on device capability and observed load.

Implemented selection: UI/UX 1–3, Content 3, Features 3, Performance 1 and 3. The initial precompile shortlist is curated, not inferred from usage analytics.

## Next round — five ideas per category

These are proposals, not implemented features. The deferred items above remain in the backlog.

### UI/UX

1. Saved filter views — return to named combinations such as “Subtle Motion effects”.
2. Compare drawer — pin two or three previews with synchronized replay.
3. Touch-friendly structure editing — explicit move handles and accessible move announcements.
4. Selection placement map — see where every chosen effect lands in the assembled page.
5. Undoable bulk actions — clear, move, or remove several selections with one recovery action.

### Content

1. Usage notes — ideal placement, interaction trigger, and common mistakes for each element.
2. Verified source metadata — author, license, version, and direct documentation links.
3. Accessibility notes — keyboard, reduced-motion, contrast, and screen-reader considerations.
4. Real-world examples — show each effect in a hero, product page, or editorial layout.
5. Compatibility labels — distinguish WebGL requirements, touch support, and framework constraints.

### Features

1. Reusable project presets — save complete brand, section, and motion configurations.
2. Custom demo content — replace carousel illustrations, headlines, and gallery media with uploaded assets.
3. Section-level element editing — tune an effect directly in the assembled page.
4. Export target adapters — generate integration scaffolds for React, Next.js, and plain HTML.
5. Snapshot comparison — inspect side-by-side visual and configuration differences before restoring.

### Performance

1. Adaptive preview quality — lower WebGL resolution and frame rate when the device is under load.
2. Persisted compiled previews — reuse versioned bundles across server restarts and deployments.
3. Shared dependency caching — avoid duplicate downloads across preview frames.
4. Verified visual posters — show a captured image of the actual element while its runtime loads.
5. Performance budgets — track cold/warm time-to-visual, dropped frames, and memory per element in CI.
