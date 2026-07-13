# Meeting Copilot asset inventory

This inventory is the canonical human-readable contract. `apps/web/public/assets/assets-manifest.json` contains the same 16 records for automation.

## Decisions

- **Functional icons:** Lucide React, outlined, 1.75 px stroke, rounded caps/joins.
- **Static files:** only approved brand, platform, social, and reusable state art.
- **Web location:** `apps/web/public/assets/`; public URLs start with `/assets/`.
- **Desktop icon location:** `apps/desktop/build/app-icon-windows.ico`.
- **Theme:** explicit light/dark only for horizontal logos; everything else is universal.
- **Raster behavior:** no crop for icons/illustrations; Open Graph uses a fixed 1200 × 630 composition.

## P1 — required for launch

| ID     | Asset                              | Exact file                        | Folder                                  | Format | Dimension / ratio                | Theme     | Usage                                        | Priority                 | Status  |
| ------ | ---------------------------------- | --------------------------------- | --------------------------------------- | ------ | -------------------------------- | --------- | -------------------------------------------- | ------------------------ | ------- |
| AS-001 | Primary brand symbol               | `brand-symbol-primary.svg`        | `apps/web/public/assets/brand/symbols/` | SVG    | 64 × 64 viewBox; square          | universal | Web/desktop product mark and preview         | P1 — required for launch | missing |
| AS-002 | Horizontal logo for light surfaces | `brand-logo-horizontal-light.svg` | `apps/web/public/assets/brand/logos/`   | SVG    | 320 × 72; 40:9                   | light     | Web/account header and footer in light theme | P1 — required for launch | missing |
| AS-003 | Horizontal logo for dark surfaces  | `brand-logo-horizontal-dark.svg`  | `apps/web/public/assets/brand/logos/`   | SVG    | 320 × 72; 40:9                   | dark      | Web/account header and footer in dark theme  | P1 — required for launch | missing |
| AS-005 | App-icon master                    | `app-icon-master.svg`             | `apps/web/public/assets/app-icons/`     | SVG    | 1024 × 1024 artboard; square     | universal | Source of all platform icons                 | P1 — required for launch | missing |
| AS-006 | Windows application icon           | `app-icon-windows.ico`            | `apps/desktop/build/`                   | ICO    | 16/24/32/48/64/128/256 px layers | universal | EXE, NSIS, shortcut, taskbar                 | P1 — required for launch | missing |
| AS-007 | Vector favicon                     | `favicon.svg`                     | `apps/web/public/assets/app-icons/`     | SVG    | 32 × 32 viewBox; square          | universal | Modern browser tab                           | P1 — required for launch | missing |
| AS-008 | Raster favicon fallback            | `favicon-32.png`                  | `apps/web/public/assets/app-icons/`     | PNG    | 32 × 32 px                       | universal | Browser fallback                             | P1 — required for launch | missing |
| AS-010 | Default social card                | `social-open-graph-default.webp`  | `apps/web/public/assets/social/`        | WebP   | 1200 × 630; 1.91:1               | universal | Open Graph, X/Twitter, messaging previews    | P1 — required for launch | missing |

## P2 and P3 — experience improvements

| ID     | Asset                     | Exact file                                   | Folder                                               | Format | Dimension / ratio       | Theme     | Usage                             | Priority                   | Status  |
| ------ | ------------------------- | -------------------------------------------- | ---------------------------------------------------- | ------ | ----------------------- | --------- | --------------------------------- | -------------------------- | ------- |
| AS-004 | Monochrome brand symbol   | `brand-symbol-monochrome.svg`                | `apps/web/public/assets/brand/symbols/`              | SVG    | 64 × 64 viewBox; square | universal | One-color release/email contexts  | P2 — important improvement | missing |
| AS-009 | Apple touch icon          | `apple-touch-icon-180.png`                   | `apps/web/public/assets/app-icons/`                  | PNG    | 180 × 180 px            | universal | iOS bookmark/home-screen tile     | P2 — important improvement | missing |
| AS-011 | Empty authorized devices  | `illustration-empty-devices.svg`             | `apps/web/public/assets/illustrations/empty-states/` | SVG    | 320 × 240; 4:3          | universal | Empty device list in account      | P2 — important improvement | missing |
| AS-012 | Empty local history       | `illustration-empty-history.svg`             | `apps/web/public/assets/illustrations/empty-states/` | SVG    | 320 × 240; 4:3          | universal | Desktop History empty state       | P2 — important improvement | missing |
| AS-013 | Offline service error     | `illustration-error-offline.svg`             | `apps/web/public/assets/illustrations/errors/`       | SVG    | 320 × 240; 4:3          | universal | Desktop/API unavailable recovery  | P2 — important improvement | missing |
| AS-014 | Audio permission error    | `illustration-error-audio-permission.svg`    | `apps/web/public/assets/illustrations/errors/`       | SVG    | 320 × 240; 4:3          | universal | Desktop audio permission recovery | P2 — important improvement | missing |
| AS-015 | Device authorized success | `illustration-success-device-authorized.svg` | `apps/web/public/assets/illustrations/success/`      | SVG    | 320 × 240; 4:3          | universal | Device authorization confirmation | P2 — important improvement | missing |
| AS-016 | Push-to-talk onboarding   | `illustration-onboarding-push-to-talk.svg`   | `apps/web/public/assets/illustrations/onboarding/`   | SVG    | 640 × 400; 16:10        | universal | Future onboarding/help            | P3 — optional              | missing |

## Recommended alt text and loading

| ID              | Recommended alt text                                                                | Loading / rendering                                          |
| --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| AS-001          | `Símbolo do Meeting Copilot` when informative; empty when adjacent to product name. | Eager in header; fixed 24–32 px dimensions.                  |
| AS-002 / AS-003 | `Meeting Copilot` when the image names the link; otherwise empty.                   | Eager in header, lazy in footer; 160 × 36 rendered baseline. |
| AS-004          | Context-dependent; usually decorative.                                              | Lazy unless used as primary identity.                        |
| AS-005          | `Ícone do aplicativo Meeting Copilot` in documentation only.                        | Never loaded in product runtime.                             |
| AS-006–AS-009   | No HTML alt; platform metadata assets.                                              | Declared in HTML/build configuration.                        |
| AS-010          | `Meeting Copilot — respostas rápidas para reuniões técnicas`.                       | Metadata only; not rendered in page body.                    |
| AS-011          | `Nenhum computador autorizado`.                                                     | Lazy; rendered at 160–240 px wide with intrinsic ratio.      |
| AS-012          | `Histórico da sessão vazio`.                                                        | Lazy; desktop only, max 200 px wide.                         |
| AS-013          | `Conexão com o serviço indisponível`.                                               | Lazy; message/action must remain live text.                  |
| AS-014          | `Permissão de áudio necessária`.                                                    | Lazy; instructions must remain live text.                    |
| AS-015          | `Computador autorizado com sucesso`.                                                | Lazy; success message remains live text.                     |
| AS-016          | `Como usar a tecla de captura durante uma pergunta`.                                | Lazy; never embed the configurable key as image-only text.   |

## Figma export rules

### Brand SVG

- Use 64 × 64 and 320 × 72 frames with pixel-aligned geometry.
- Keep transparent backgrounds and 12.5% clear space around the symbol.
- Convert approved wordmark lettering to paths; do not outline regular UI text.
- Export with `viewBox`, no fixed width/height, no embedded fonts/base64, and no editor metadata.
- Optimize after export and verify at 16, 24, 32, and 160 px widths.

### App icons

- Build `app-icon-master.svg` on a 1024 px frame with essential geometry inside the central 80% safe area.
- Export PNG derivatives from the same component; do not redraw at each size.
- Generate the ICO after Figma export with 16, 24, 32, 48, 64, 128, and 256 px layers.
- Do not include rounded corners in the master unless they are part of the mark; platforms may apply masks.

### Illustration SVG

- 4:3 frame, transparent background, 12% safety margin.
- Minimal technical line style, rounded geometry, no people, no embedded text, and no heavy shadows.
- Use a universal palette centered on brand green and mid-value neutrals that remains legible on both `canvas` themes.
- Maximum 100 KB after SVG optimization. Avoid masks and filters unless they materially simplify the drawing.

### Social WebP

- Compose at 1200 × 630 and keep identity/text inside a 72 px safety margin.
- Use one short message, the approved symbol/wordmark, and a restrained product-preview motif.
- Export lossless PNG from Figma, convert to WebP at visually lossless quality, remove metadata, and keep ≤ 250 KB.

## Functional icon mapping — Lucide React

Install one library for both renderers: `lucide-react`. Default size is 20 px, dense action size 18 px, touch/navigation size 24 px, stroke 1.75, `absoluteStrokeWidth` disabled. Active state changes color/surface, not icon family. Icon-only buttons keep 44 × 44 px minimum hit area and require `aria-label`; dense desktop overlay actions may render 36 px only when pointer-only and a keyboard equivalent exists.

| Function        | Lucide icon  | Current component / treatment |  Size | Active / inactive                   | Semantic color           | Tooltip / accessible name          |
| --------------- | ------------ | ----------------------------- | ----: | ----------------------------------- | ------------------------ | ---------------------------------- |
| Theme light     | `Sun`        | Web `ThemeButton` `☀`         |    20 | Same outline                        | text secondary           | `Usar tema claro`                  |
| Theme dark      | `Moon`       | Web `ThemeButton` `☾`         |    20 | Same outline                        | text secondary           | `Usar tema escuro`                 |
| Device          | `Monitor`    | Account/device `▣`            | 20/24 | Brand-soft container when selected  | text / brand             | Label from surrounding content     |
| Empty state     | `Inbox`      | Web/Desktop `○`               |    24 | N/A                                 | text tertiary            | Decorative when heading exists     |
| Copy            | `Copy`       | `QuickAnswer` `⧉`             |    18 | Replace with `Check` after success  | text secondary / success | Localized copy label               |
| Copied          | `Check`      | `QuickAnswer` `✓`             |    18 | Temporary success                   | success                  | Localized copied label             |
| Pin             | `Pin`        | `QuickAnswer` `◇`             |    18 | `PinOff` when pinned                | text secondary / brand   | Localized pin label                |
| Unpin           | `PinOff`     | `QuickAnswer` `◆`             |    18 | Pressed surface                     | brand                    | Localized unpin label              |
| Close/discard   | `X`          | Overlay/answer `×`            |    18 | Danger only for destructive discard | text secondary / danger  | Localized action label             |
| Expand          | `Maximize2`  | Overlay `↗`                   |    18 | N/A                                 | text secondary           | `Expandir overlay`                 |
| Compact         | `Minimize2`  | Overlay `↙`                   |    18 | N/A                                 | text secondary           | `Compactar overlay`                |
| Pause           | `Pause`      | Overlay `Ⅱ`                   |    18 | Pressed surface                     | warning                  | `Pausar escuta assistida`          |
| Resume          | `Play`       | Overlay `▶`                   |    18 | Brand surface                       | brand                    | `Retomar escuta assistida`         |
| Minimize        | `Minus`      | Overlay `—`                   |    18 | N/A                                 | text secondary           | `Minimizar overlay`                |
| Next/open audio | `ArrowRight` | Main window `→`               |    18 | N/A                                 | brand                    | Visible text remains               |
| Meeting nav     | `Mic`        | Text-only navigation          | 20/24 | Brand text + soft surface           | brand / text secondary   | Visible navigation label           |
| History nav     | `History`    | Text-only navigation          | 20/24 | Same rule                           | brand / text secondary   | Visible navigation label           |
| Context nav     | `Files`      | Text-only navigation          | 20/24 | Same rule                           | brand / text secondary   | Visible navigation label           |
| Audio nav       | `AudioLines` | Text-only navigation          | 20/24 | Same rule                           | brand / text secondary   | Visible navigation label           |
| Settings nav    | `Settings`   | Text-only navigation          | 20/24 | Same rule                           | brand / text secondary   | Visible navigation label           |
| Diagnostics nav | `Activity`   | Text-only navigation          | 20/24 | Same rule                           | brand / text secondary   | Visible navigation label           |
| Refresh sources | `RefreshCw`  | `SourcePicker` text action    |    18 | Spin via CSS only while loading     | text secondary           | Visible localized label            |
| Download        | `Download`   | Web download links            |    18 | N/A                                 | on-brand                 | Keep visible text                  |
| Logout          | `LogOut`     | Account button                |    18 | N/A                                 | text secondary           | Keep visible text                  |
| Revoke device   | `Trash2`     | Account danger action         |    18 | N/A                                 | danger                   | Keep visible text and confirmation |

## Product-exclusive icons

No custom domain icon is justified yet. Listening, transcription, AI answer, privacy, devices, plans, and status all have clear Lucide equivalents or are better represented by text/CSS state. The brand symbol is identity, not a functional icon.

## Assets que não devem ser produzidos no Figma

| Element                                      | Technical solution                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Common functional icons                      | Lucide React components, never copied SVG files.                                               |
| Loading spinner                              | CSS border/transform with reduced-motion fallback.                                             |
| Skeletons                                    | Existing CSS gradient with fixed dimensions and `aria-busy`.                                   |
| Status dots and audio indicators             | CSS shape plus visible state text.                                                             |
| Gradients, glows and preview chrome          | CSS using design-system color tokens.                                                          |
| Buttons, inputs, cards, badges and chips     | React/CSS components from semantic tokens.                                                     |
| Shadows, borders, separators and focus rings | Shared CSS tokens.                                                                             |
| Initial avatars                              | Runtime initials with deterministic color and accessible name if avatars are later introduced. |
| Plan icons                                   | Text hierarchy and feature lists; custom plan art adds no clarity.                             |
| Charts/progress                              | Semantic HTML/SVG generated from data, not static screenshots.                                 |
| Product preview                              | Existing responsive HTML/CSS preview; do not replace it with a screenshot.                     |
| Authentication background                    | Not needed; current minimal CSS surface is clearer and faster.                                 |
| Hero/background imagery                      | Not needed; the operational product preview carries the message.                               |
| PWA icons/splash screens                     | Not needed until a manifest/service worker and installable web scope exist.                    |

## Next actions and automatic updates

1. Create and approve AS-001, then derive AS-002/AS-003 and AS-005 before any illustration work.
2. Export to the exact folders in this inventory; do not create alternate filenames or copy assets into `src/assets`.
3. Update only the matching manifest `status` to `ready` after visual approval and optimization.
4. Run `pnpm assets:report` while producing files and `pnpm assets:validate` before release.
5. Complete the one-time engineering wiring listed in `docs/ASSET-CHECKLIST.md` after the P1 files exist.

The manifest and typed registry detect the files immediately without path changes. Runtime references are deliberately not activated while files are `missing`, because broken brand URLs and a missing Electron ICO would degrade the current app and block packaging. After the one-time P1 wiring:

- AS-001–AS-003 update marketing, account, device-approval, footer, and desktop product identity.
- AS-006 updates portable/installer executables, Windows shortcuts, Explorer, Start, and taskbar after rebuilding.
- AS-007–AS-009 update browser and iOS bookmark identity.
- AS-010 updates link previews after deployment and cache refresh by each crawler.
- AS-011–AS-015 update only their corresponding large empty/error/success surfaces; compact overlay states remain icon/text-only.
- AS-016 updates the future onboarding/help surface when that feature is implemented.
