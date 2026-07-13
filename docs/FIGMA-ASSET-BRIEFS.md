# Meeting Copilot Figma asset briefs

## Shared visual direction

The product is calm, technical, discreet, and fast. Use precise rounded geometry, restrained detail, generous negative space, and the existing green brand role. Avoid mascots, generic AI brains, robots, microphones with sound explosions, glassmorphism, stock imagery, and decorative scenes unrelated to a live technical meeting.

Reference colors from `packages/design-system/src/tokens.css`: light brand `#117b68`, dark brand `#5ad9bd`, light text `#15201f`, dark text `#eef7f5`, light soft surface `#dff4ee`, and dark soft surface `#153b34`. Figma components should use semantic variable names rather than page-specific colors.

## AS-001 Primary brand symbol

**File:** `brand-symbol-primary.svg`  
**Folder:** `apps/web/public/assets/brand/symbols/`  
**Category:** Brand identity  
**Priority:** P1  
**Format:** SVG  
**Dimension:** 64 × 64 viewBox  
**Ratio:** 1:1  
**Theme:** Universal  
**Screen/route:** All web headers/footers, desktop header, product preview  
**Component:** `Brand`, desktop `.product-mark`

**Objective:** Create a recognizable mark for an assistant that surfaces the right answer at the right moment without suggesting hidden or continuous recording.

**Visual direction:** Abstract intersection of a concise speech cue and a focus/signal point. Simple enough to remain distinctive at 16–24 px. Rounded, geometric, and not character-based.

**Composition:** One closed primary silhouette or at most two intersecting shapes. Preserve a clear center and avoid thin internal gaps.

**Colors:** Brand role on transparent background. It must remain legible against both canvas themes without a container.

**Safety area:** 12.5% on every side.

**Export rules:** Outline strokes if their visual weight would otherwise change; include `viewBox`; remove fixed dimensions, metadata, masks, fonts, and base64; target ≤ 30 KB.

**Avoid:** Sparkle glyphs, generic chat bubbles, OpenAI-like knots, robot heads, waveform clichés, letters `M`/`C` forced into a monogram.

## AS-002 Horizontal logo — light surfaces

**File:** `brand-logo-horizontal-light.svg`  
**Folder:** `apps/web/public/assets/brand/logos/`  
**Category:** Brand identity  
**Priority:** P1  
**Format:** SVG  
**Dimension:** 320 × 72 artboard  
**Ratio:** 40:9  
**Theme:** Light  
**Screen/route:** Marketing/account headers and footer in light theme  
**Component:** `Brand`

**Objective:** Combine the approved symbol and Meeting Copilot wordmark in a compact, trustworthy lockup.

**Visual direction:** Product name is primary; symbol supports it. Use a modern sans with neutral technical character and optical compatibility with the UI system stack.

**Composition:** Symbol left, wordmark right, vertical centers optically aligned. Clear gap approximately half the symbol width.

**Colors:** Primary symbol in `brand`; wordmark equivalent to light `text` (`#15201f`). Transparent background.

**Safety area:** One half-symbol around the lockup.

**Export rules:** Convert approved lettering to paths, preserve clean groups, include `viewBox`, target ≤ 30 KB, verify at 140–180 px rendered width.

**Avoid:** Tagline, gradients, glow, shadows, ultra-tight kerning, all-uppercase name.

## AS-003 Horizontal logo — dark surfaces

**File:** `brand-logo-horizontal-dark.svg`  
**Folder:** `apps/web/public/assets/brand/logos/`  
**Category:** Brand identity  
**Priority:** P1  
**Format:** SVG  
**Dimension:** 320 × 72 artboard  
**Ratio:** 40:9  
**Theme:** Dark  
**Screen/route:** Marketing/account headers and footer in dark theme  
**Component:** `Brand`

**Objective:** Preserve the exact approved light-logo geometry with colors calibrated for dark surfaces.

**Visual direction:** Same lockup and spacing as AS-002; only semantic color roles change.

**Composition:** Identical bounds and path order to AS-002 to prevent layout movement during theme changes.

**Colors:** Symbol in dark `brand` (`#5ad9bd`); wordmark equivalent to dark `text` (`#eef7f5`). Transparent background.

**Safety area:** One half-symbol around the lockup.

**Export rules:** Duplicate the approved component variant, not a separate redraw. Match viewBox exactly to AS-002 and target ≤ 30 KB.

**Avoid:** Different proportions, altered kerning, pure white if it creates excessive glare, dark background rectangle.

## AS-004 Monochrome brand symbol

**File:** `brand-symbol-monochrome.svg`  
**Folder:** `apps/web/public/assets/brand/symbols/`  
**Category:** Brand identity  
**Priority:** P2  
**Format:** SVG  
**Dimension:** 64 × 64 viewBox  
**Ratio:** 1:1  
**Theme:** Universal  
**Screen/route:** Release notes, one-color email/print contexts  
**Component:** External brand applications

**Objective:** Provide a single-color form of the approved symbol for constrained backgrounds and production methods.

**Visual direction:** Exact AS-001 silhouette without tonal dependence.

**Composition:** Merge shapes where needed so the mark survives one-color rendering.

**Colors:** One fill using `currentColor` where technically safe.

**Safety area:** 12.5% on every side.

**Export rules:** One-color paths, no opacity, no background, include `viewBox`, target ≤ 20 KB.

**Avoid:** A second symbol concept, grayscale gradients, hairline negative spaces.

## AS-005 App-icon master

**File:** `app-icon-master.svg`  
**Folder:** `apps/web/public/assets/app-icons/`  
**Category:** App icon  
**Priority:** P1  
**Format:** SVG master  
**Dimension:** 1024 × 1024 artboard  
**Ratio:** 1:1  
**Theme:** Universal  
**Screen/route:** Source for platform icons and release artwork  
**Component:** Packaging source

**Objective:** Turn the brand symbol into a clear Windows application tile that remains recognizable in taskbar and Start menu sizes.

**Visual direction:** Brand symbol centered on a calm brand/surface composition. Slightly bolder than the web mark for small-size resilience.

**Composition:** Essential mark inside the central 70%; all meaningful geometry inside the central 80% safe area. Background may be a simple solid or very subtle token-based gradient.

**Colors:** Brand and high-contrast on-brand/surface roles. Universal, without theme-dependent switching.

**Safety area:** 10% hard safe area; 20% for essential geometry.

**Export rules:** Keep a vector master component. Test raster previews at 16, 24, 32, 48, and 256 px. Target ≤ 30 KB for the SVG.

**Avoid:** Text, letters, tiny details, baked Windows rounded corners, transparent symbol with insufficient contrast.

## AS-006 Windows ICO

**File:** `app-icon-windows.ico`  
**Folder:** `apps/desktop/build/`  
**Category:** App icon derivative  
**Priority:** P1  
**Format:** ICO  
**Dimension:** Embedded 16, 24, 32, 48, 64, 128, and 256 px  
**Ratio:** 1:1  
**Theme:** Universal  
**Screen/route:** Windows EXE, installer, shortcut, taskbar  
**Component:** Electron Builder configuration

**Objective:** Package AS-005 correctly for Windows shell contexts and 100–200% display scaling.

**Visual direction:** No new design. Use carefully inspected raster exports from AS-005; apply optical simplification only in the 16/24 px layers if required.

**Composition:** Match the master and preserve transparent edges.

**Colors:** Same as AS-005, embedded in sRGB.

**Safety area:** Inherited from AS-005.

**Export rules:** Figma exports PNG source layers; engineering combines them into one ICO. Verify every embedded size, alpha channel, taskbar, Explorer, Start menu, installer, and shortcut. Target ≤ 150 KB.

**Avoid:** Renaming a PNG to ICO, one-size-only ICO, JPEG compression, unapproved small-size redraw.

## AS-007 Vector favicon

**File:** `favicon.svg`  
**Folder:** `apps/web/public/assets/app-icons/`  
**Category:** App icon  
**Priority:** P1  
**Format:** SVG  
**Dimension:** 32 × 32 viewBox  
**Ratio:** 1:1  
**Theme:** Universal  
**Screen/route:** Browser tab  
**Component:** `apps/web/index.html`

**Objective:** Make the product identifiable at browser-tab scale.

**Visual direction:** Simplified app-icon symbol; maximize silhouette and contrast.

**Composition:** Essential geometry within 28 × 28 logical pixels. Remove details that disappear at 16 px.

**Colors:** Universal brand/on-brand pairing; transparent outside the icon shape.

**Safety area:** 2 logical pixels.

**Export rules:** Hand-inspect at 16/32 px, include `viewBox`, remove dimensions and metadata, target ≤ 10 KB.

**Avoid:** Full wordmark, thin strokes, theme-specific background assumptions.

## AS-008 Raster favicon fallback

**File:** `favicon-32.png`  
**Folder:** `apps/web/public/assets/app-icons/`  
**Category:** App icon derivative  
**Priority:** P1  
**Format:** PNG  
**Dimension:** 32 × 32 px  
**Ratio:** 1:1  
**Theme:** Universal  
**Screen/route:** Browser fallback  
**Component:** `apps/web/index.html`

**Objective:** Provide a predictable raster fallback derived from AS-007/AS-005.

**Visual direction:** Pixel-snapped, optically equivalent to AS-007.

**Composition:** Centered with transparent outer pixels.

**Colors:** sRGB with alpha.

**Safety area:** 2 px.

**Export rules:** Export at exact size, inspect without interpolation, strip metadata, target ≤ 20 KB.

**Avoid:** Browser screenshot, blurred downscale, opaque white background.

## AS-009 Apple touch icon

**File:** `apple-touch-icon-180.png`  
**Folder:** `apps/web/public/assets/app-icons/`  
**Category:** App icon derivative  
**Priority:** P2  
**Format:** PNG  
**Dimension:** 180 × 180 px  
**Ratio:** 1:1  
**Theme:** Universal  
**Screen/route:** iOS bookmark/home screen  
**Component:** `apps/web/index.html`

**Objective:** Provide a polished bookmark tile without implying that the web app is a PWA.

**Visual direction:** AS-005 composition on an opaque approved background; iOS supplies the corner mask.

**Composition:** Essential geometry inside central 80%.

**Colors:** sRGB, opaque background.

**Safety area:** 10% outer area.

**Export rules:** Exact 180 px PNG, no pre-rounded corners, strip metadata, target ≤ 80 KB.

**Avoid:** Transparency, baked gloss, PWA badge, text.

## AS-010 Default Open Graph card

**File:** `social-open-graph-default.webp`  
**Folder:** `apps/web/public/assets/social/`  
**Category:** Promotional/social  
**Priority:** P1  
**Format:** WebP  
**Dimension:** 1200 × 630 px  
**Ratio:** 1.91:1  
**Theme:** Universal  
**Screen/route:** Shared links for all routes  
**Component:** Open Graph and Twitter metadata

**Objective:** Explain the product in one glance when a link is shared.

**Visual direction:** Calm dark-neutral composition using the approved logo and a simplified HTML-preview-inspired transcript/answer motif.

**Composition:** Logo top-left; short headline `Respostas rápidas para reuniões técnicas`; abstract product panel on the right. Keep all content inside 72 px margins.

**Colors:** Universal dark surface with brand accent and high-contrast text.

**Safety area:** 72 px perimeter; reserve central 1080 × 486 for critical content.

**Export rules:** Export PNG from Figma, convert to WebP, strip metadata, inspect at small messaging-preview size, target ≤ 250 KB.

**Avoid:** Pricing, screenshots with tiny UI text, unsupported claims, gradients that band after compression, QR codes.

## Shared illustration system

AS-011 through AS-016 use a single component family: transparent background, rounded 2 px-equivalent line language, 12% breathing room, brand accent plus mid-value neutral surfaces, no characters, no embedded copy, no heavy shadow, and at most one focal object with two supporting shapes. Each SVG is universal and ≤ 100 KB.

## AS-011 Empty devices

**File:** `illustration-empty-devices.svg`  
**Folder:** `apps/web/public/assets/illustrations/empty-states/`  
**Category:** Illustration / empty state  
**Priority:** P2  
**Format:** SVG  
**Dimension:** 320 × 240 viewBox  
**Ratio:** 4:3  
**Theme:** Universal  
**Screen/route:** `/account` with no authorized computers  
**Component:** Account device empty state

**Objective:** Clarify that the account is ready but no computer is linked.

**Visual direction:** One restrained desktop/laptop outline with an open connection point and a small approved brand signal.

**Composition:** Device centered low; connection point above/right; generous empty area.

**Colors:** Brand accent, neutral outline, transparent background.

**Safety area:** 12%.

**Export rules:** Shared illustration rules; decorative use may set `alt=""` when the empty-state heading is present.

**Avoid:** Error symbols, disconnected cables, sad faces, instructions inside the image.

## AS-012 Empty history

**File:** `illustration-empty-history.svg`  
**Folder:** `apps/web/public/assets/illustrations/empty-states/`  
**Category:** Illustration / empty state  
**Priority:** P2  
**Format:** SVG  
**Dimension:** 320 × 240 viewBox  
**Ratio:** 4:3  
**Theme:** Universal  
**Screen/route:** Desktop History before any answered turn  
**Component:** Desktop `EmptyState`

**Objective:** Communicate an intentionally empty current session, not data loss.

**Visual direction:** Two lightweight conversation/answer rows with a subtle clock/history arc, all inactive.

**Composition:** Stacked cards centered with one open space indicating the next turn.

**Colors:** Neutral surfaces with one brand line; transparent background.

**Safety area:** 12%.

**Export rules:** Shared illustration rules; no timestamps or transcript text.

**Avoid:** Archive boxes, database cylinders, permanent-history implications, user content.

## AS-013 Offline error

**File:** `illustration-error-offline.svg`  
**Folder:** `apps/web/public/assets/illustrations/errors/`  
**Category:** Illustration / error  
**Priority:** P2  
**Format:** SVG  
**Dimension:** 320 × 240 viewBox  
**Ratio:** 4:3  
**Theme:** Universal  
**Screen/route:** Desktop/API connection failure  
**Component:** Large `ErrorState`

**Objective:** Support a calm, recoverable network error without creating alarm.

**Visual direction:** Two product endpoints separated by a small interrupted line; retry path remains visually available.

**Composition:** Balanced endpoints left/right, interruption in center, no large warning triangle.

**Colors:** Neutral + warning accent; danger only as a small supporting role.

**Safety area:** 12%.

**Export rules:** Shared illustration rules; adjacent live text supplies impact and recovery action.

**Avoid:** Wi-Fi-only metaphor, red full-frame art, server racks, error codes in artwork.

## AS-014 Audio permission error

**File:** `illustration-error-audio-permission.svg`  
**Folder:** `apps/web/public/assets/illustrations/errors/`  
**Category:** Illustration / error  
**Priority:** P2  
**Format:** SVG  
**Dimension:** 320 × 240 viewBox  
**Ratio:** 4:3  
**Theme:** Universal  
**Screen/route:** Desktop Audio and permission-recovery state  
**Component:** Large `ErrorState`, audio diagnostics

**Objective:** Explain that Windows permission is needed without implying recording occurred.

**Visual direction:** Minimal microphone/audio-source outline paired with an unlocked permission control state.

**Composition:** Audio source left, small permission switch/shield right, neutral connection between them.

**Colors:** Brand + warning neutral; transparent background.

**Safety area:** 12%.

**Export rules:** Shared illustration rules; permission steps remain live text.

**Avoid:** Active red recording dot, surveillance imagery, lock that implies account security failure.

## AS-015 Device authorized success

**File:** `illustration-success-device-authorized.svg`  
**Folder:** `apps/web/public/assets/illustrations/success/`  
**Category:** Illustration / success  
**Priority:** P2  
**Format:** SVG  
**Dimension:** 320 × 240 viewBox  
**Ratio:** 4:3  
**Theme:** Universal  
**Screen/route:** `/device` after approval  
**Component:** Device authorization success state

**Objective:** Confirm that the exact computer is now connected and the user can return to the app.

**Visual direction:** Device outline with one contained check and a subtle brand signal.

**Composition:** Device centered; check overlaps the lower-right edge without obscuring the device.

**Colors:** Brand and success roles, neutral outline, transparent background.

**Safety area:** 12%.

**Export rules:** Shared illustration rules; the success heading and next action remain live text.

**Avoid:** Confetti, trophy, multiple devices, payment-success metaphor.

## AS-016 Push-to-talk onboarding

**File:** `illustration-onboarding-push-to-talk.svg`  
**Folder:** `apps/web/public/assets/illustrations/onboarding/`  
**Category:** Illustration / onboarding  
**Priority:** P3  
**Format:** SVG  
**Dimension:** 640 × 400 viewBox  
**Ratio:** 16:10  
**Theme:** Universal  
**Screen/route:** Future desktop first-run and help documentation  
**Component:** Future onboarding panel

**Objective:** Demonstrate the press-and-hold mental model without embedding a fixed shortcut or suggesting continuous listening.

**Visual direction:** Three-step spatial sequence: idle key, held key with short bounded audio segment, answer card. No animation required.

**Composition:** Left-to-right flow with three equal zones and simple connecting progression. Use a generic keycap shape; the actual configured key is live UI text layered by code.

**Colors:** Brand accent only on the active middle step; neutral idle/completed states.

**Safety area:** 10%.

**Export rules:** Shared illustration rules; design must also remain understandable at 320 px wide.

**Avoid:** `F9` outlined into paths, endless waveform, meeting participants, bot joining a call, animation-only explanation.
