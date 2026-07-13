# Meeting Copilot asset audit

Date: 2026-07-13  
Branch: `asset-system-audit`  
Scope: Vite marketing/account web, Electron desktop main window and overlay, Windows packaging, responsive and light/dark states.

## Executive summary

The repository currently contains **zero versioned visual asset files** (`svg`, `png`, `webp`, `ico`, `jpg`, or animation files) outside generated/build directories. The interface is intentionally code-led, which is appropriate for this product, but the absence of a deliberate brand package causes Electron to ship with its default icon and the web app to have no favicon or social preview.

The audit defines **16 static assets**: 8 P1 launch requirements, 7 P2 experience improvements, and 1 P3 onboarding asset. No P0 item blocks the current interface from rendering. Three visual families need redesign: the provisional text/sparkle brand treatment, Unicode functional icons, and generic empty/device markers. There are **21 source locations** using Unicode symbols as UI icons or decoration.

Recommendation: keep the product mostly code-rendered, use **Lucide React** for all common functional icons, commission only the small brand/app/social package and five reusable state illustrations, and avoid photography, decorative hero art, authentication backgrounds, static avatars, PWA assets, and custom icons that do not have a domain-specific need.

## Audited surfaces

| Product area    | Routes / modes                                          | Asset relevance                                                                                     |
| --------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Marketing web   | `/`                                                     | Brand, favicon, Open Graph; product preview remains HTML/CSS.                                       |
| Account web     | `/account`                                              | Brand and one reusable empty-device illustration. Loading remains CSS skeleton.                     |
| Device approval | `/device`                                               | Brand and optional reusable success illustration. Form/state icons come from Lucide.                |
| Desktop main    | Meeting, History, Context, Audio, Settings, Diagnostics | Brand/app icon, Lucide navigation/actions, reusable history/offline/audio-permission illustrations. |
| Desktop overlay | hidden, minimized, compact, expanded                    | Functional icons only; no illustration or background image should compete with the meeting.         |
| Windows package | portable and NSIS installer                             | Multi-resolution `.ico` derived from the approved app-icon master.                                  |

## Current assets and references

### Versioned visual files

None. Generated `dist`, `out`, `release`, `.turbo`, dependency folders, and database JSON metadata were excluded from the asset count.

### Code-rendered visual elements

| Current treatment                            | Locations                            | Finding                                                      | Resolution                                                                   |
| -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `✦` as product mark                          | Web `Brand`; desktop header CSS      | Provisional identity and platform-dependent glyph rendering. | Replace with `brand-symbol-primary.svg`.                                     |
| Text `Meeting Copilot` as wordmark           | Web header/footer and desktop header | Accessible and resilient, but not a finished brand lockup.   | Use approved horizontal logo on marketing/account; keep live text fallback.  |
| `☀` / `☾`                                    | Web theme toggle                     | Unicode functional icons.                                    | Lucide `Sun` / `Moon`.                                                       |
| `▣`                                          | Device cards and authorization       | Ambiguous device glyph.                                      | Lucide `Monitor`.                                                            |
| `○`                                          | Web and desktop empty states         | Generic placeholder with weak semantics.                     | Lucide `Inbox` for compact states; illustration only in larger empty states. |
| `✓`, `⧉`, `◆`, `◇`, `×`                      | Lists and desktop answer actions     | Mixed visual weights and platform rendering.                 | Lucide `Check`, `Copy`, `Pin`, `PinOff`, `X`.                                |
| arrows, play/pause and minimize glyphs       | Desktop overlay and main window      | Mixed metaphor and inconsistent optical sizing.              | Lucide `Maximize2`, `Minimize2`, `Play`, `Pause`, `Minus`, `ArrowRight`.     |
| gradients, dots, skeleton and preview chrome | CSS                                  | Appropriate code-native visuals.                             | Keep in CSS; do not export from Figma.                                       |

### Icon-library status

No icon library is installed. The application mixes text labels, CSS shapes, and Unicode symbols. Adopt `lucide-react` for web and desktop renderers with outlined icons, 1.75 px stroke, rounded caps/joins, 20 px default size, 18 px dense actions, and 24 px only for touch/navigation emphasis. Do not export individual Lucide SVG files into the repository.

## Problems found

1. **No application identity files:** there is no approved symbol, logo lockup, app icon, favicon, or social card.
2. **Default Electron icon:** `apps/desktop/package.json` has no Windows icon path, and the current build logs confirm the default Electron icon is used.
3. **No web sharing image:** metadata has title and description but no `og:image`, `twitter:card`, or image dimensions.
4. **No favicon declarations:** `apps/web/index.html` does not declare SVG/PNG favicons or an Apple touch icon.
5. **Unicode icons in 21 source locations:** rendering varies by OS/font and the set mixes outline, filled, geometric, and typographic styles.
6. **External font dependency:** `apps/web/index.html` loads DM Sans from Google Fonts while shared tokens prefer Inter/Segoe UI/system. This is not an image URL, but it is an unnecessary visual-network dependency and privacy/performance risk.
7. **Brand/system disconnect:** web and desktop share color tokens but not a canonical brand asset registry.
8. **State art is absent:** large empty and recovery surfaces use a generic circle. Compact overlay states correctly remain text/icon-only.
9. **No automated asset contract:** before this audit there was no manifest, size limit, path validation, or orphan detection.

## Duplicated, unused, broken, and external assets

| Audit target                 | Result                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Duplicate visual files       | None; no visual files exist.                                                                                         |
| Unused visual files          | None.                                                                                                                |
| Broken image references      | None before the manifest was introduced; the UI currently references no image files.                                 |
| Generic filenames            | None.                                                                                                                |
| Oversized images             | None.                                                                                                                |
| External image URLs          | None. GitHub release links are navigation, not image dependencies.                                                   |
| External visual dependencies | Google Fonts stylesheet/font hosts only.                                                                             |
| Files expected but absent    | The new manifest intentionally records 16 planned files as `missing`; `pnpm assets:validate` enforces P1 completion. |

## Assets absent by category

- **Brand:** primary symbol, light/dark horizontal lockups, monochrome symbol.
- **Application identity:** master app icon, Windows ICO, SVG/PNG favicons, Apple touch icon.
- **Social:** one default Open Graph/Twitter image.
- **Reusable illustrations:** devices empty, history empty, offline, audio permission, device authorized, and future push-to-talk onboarding.
- **Not required:** photos, content thumbnails, avatars, auth backgrounds, hero images, textures, Lottie/Rive, PWA icons, mobile-store screenshots, and custom plan icons.

## Asset-system decisions

### Canonical locations

- Web runtime assets: `apps/web/public/assets/` because Vite serves this directory at `/assets/...` without bundler-specific imports.
- Windows build icon: `apps/desktop/build/app-icon-windows.ico`, the conventional Electron Builder source location.
- Manifest: `apps/web/public/assets/assets-manifest.json`.
- Typed web paths: `apps/web/src/config/assets.ts`.
- Do not copy the same runtime file into `src/assets` and `public/assets`. The master app icon is the source for derived platform files; derived output is not a duplicate source of truth.

### Naming

English, lowercase, kebab-case: `[category]-[context]-[variant]-[theme].[ext]`. Avoid `final`, `new`, dates, random numbers, and editor suffixes.

### Formats

- SVG: logos, symbols, vector illustrations, and master artwork.
- ICO: Windows executable/installer only, derived from the master.
- PNG: small platform-required raster icons.
- WebP: the social sharing card.
- No AVIF until there is raster content with a tested fallback. No Lottie/Rive until motion has demonstrated product value.

### Theme

Only horizontal wordmarks need explicit light/dark exports. Symbols and illustrations should use transparent backgrounds and a universal palette that works on both theme surfaces. Functional icon color always comes from CSS tokens.

### Responsive behavior

Brand lockups use the symbol-only form below 360 px when space is constrained. Illustrations use intrinsic width/height, `max-width`, no cropping, and remain secondary to text/action. The social card is fixed at 1200 × 630. No separate mobile illustration is justified.

### Performance

- SVG logo ≤ 30 KB; favicon SVG ≤ 10 KB; illustration SVG ≤ 100 KB.
- Open Graph WebP ≤ 250 KB; Apple icon ≤ 80 KB; Windows ICO ≤ 150 KB.
- Optimize SVG paths and remove editor metadata, embedded fonts, base64, unused groups, and fixed pixel dimensions.
- Preload only the favicon/critical brand asset after it exists. Illustrations below the fold load lazily. Always declare rendered dimensions to avoid layout shift.

## Accessibility rules

- Logos linked to home use the accessible name `Meeting Copilot — página inicial`; a repeated wordmark image can use `alt="Meeting Copilot"` only when it supplies the link name.
- Decorative symbols and illustrations use `alt=""`; informative state illustrations use the manifest's recommended alt text, while the adjacent heading/action remains the authoritative message.
- Common icon buttons retain visible labels or `aria-label`; tooltips supplement but do not replace accessible names.
- Never place operational instructions only inside artwork. The onboarding illustration may depict F9 but the actual shortcut remains live text because it is configurable.
- Status continues to combine text, shape, and color. Motion remains CSS-based and respects `prefers-reduced-motion`.

## Risks and recommendations

| Risk                                               | Severity | Recommendation                                                                                                        |
| -------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| Brand assets are created independently and drift   | High     | Approve `brand-symbol-primary` first; derive every icon/lockup from the same geometry.                                |
| Missing P1 files reach a release                   | High     | Run `pnpm assets:validate` in release CI after the designer delivery.                                                 |
| Windows ICO is generated incorrectly               | High     | Include 16, 24, 32, 48, 64, 128, and 256 px layers and verify shell/taskbar at 100–200% DPI.                          |
| SVGs use fonts or complex filters                  | Medium   | Convert only logo lettering to paths; keep illustration SVGs simple and optimized.                                    |
| Illustrations reduce clarity in overlay            | Medium   | Never render illustrations in minimized/compact overlay modes.                                                        |
| Google Fonts delays first paint or leaks a request | Medium   | Remove the external stylesheet and use the shared system stack, or self-host only if brand approval requires DM Sans. |
| Designers export unregistered files                | Medium   | Use exact manifest paths and run `pnpm assets:report` during production.                                              |

## Recommended delivery sequence

1. Approve the primary symbol and horizontal lockup.
2. Derive the app-icon master, Windows ICO, favicons, and Apple icon.
3. Produce the Open Graph card.
4. Replace Unicode icons with Lucide in code.
5. Add reusable state illustrations only after core launch identity is accepted.
6. Wire approved files into HTML/Electron configuration and make `assets:validate` a release gate.
