# Meeting Copilot asset checklist

Mark an asset complete only after visual approval, optimized export, placement at the exact path, manifest status update, and validator pass.

## P1 — brand and launch identity

### Brand

- [ ] `brand-symbol-primary.svg`
- [ ] `brand-logo-horizontal-light.svg`
- [ ] `brand-logo-horizontal-dark.svg`

### App and web icons

- [ ] `app-icon-master.svg`
- [ ] `app-icon-windows.ico`
- [ ] `favicon.svg`
- [ ] `favicon-32.png`

### Social

- [ ] `social-open-graph-default.webp`

## P2 — important experience states

### Brand variants

- [ ] `brand-symbol-monochrome.svg`

### Platform icons

- [ ] `apple-touch-icon-180.png`

### Empty states

- [ ] `illustration-empty-devices.svg`
- [ ] `illustration-empty-history.svg`

### Errors

- [ ] `illustration-error-offline.svg`
- [ ] `illustration-error-audio-permission.svg`

### Success

- [ ] `illustration-success-device-authorized.svg`

## P3 — optional onboarding

- [ ] `illustration-onboarding-push-to-talk.svg`

## Export quality

- [ ] Every filename is English, lowercase, and kebab-case.
- [ ] SVGs contain a `viewBox` and no unnecessary fixed dimensions.
- [ ] SVGs contain no embedded fonts, base64, editor metadata, or unapproved text.
- [ ] Logos and symbols remain clear at their minimum rendered size.
- [ ] Illustration family uses one stroke, corner, color, and shadow language.
- [ ] Universal assets were checked on both light and dark surfaces.
- [ ] Raster files are sRGB, metadata-free, and exported at exact dimensions.
- [ ] Windows ICO includes 16/24/32/48/64/128/256 px layers.
- [ ] Open Graph card was inspected as a small messaging preview.
- [ ] Every file stays below the manifest `maximumBytes` value.

## Placement and manifest

- [ ] Each file was placed in the exact folder from `docs/ASSET-INVENTORY.md`.
- [ ] The matching manifest record changed from `missing` to `ready` only after approval.
- [ ] No unregistered visual file was added.
- [ ] `pnpm assets:report` reports no wrong extension, oversize file, or orphan.
- [ ] `pnpm assets:validate` exits successfully before a public release.

## Engineering integration after approved delivery

- [ ] Install `lucide-react` once for both React renderers.
- [ ] Replace the 21 Unicode-icon source locations with mapped Lucide components or the approved brand symbol.
- [ ] Wire light/dark horizontal logos through `apps/web/src/config/assets.ts` with a live-text fallback.
- [ ] Add favicon and Apple-touch declarations to `apps/web/index.html`.
- [ ] Add `og:image`, image dimensions, `twitter:card`, and social-image metadata.
- [ ] Configure Electron Builder to use `apps/desktop/build/app-icon-windows.ico`.
- [ ] Remove the Google Fonts network dependency or approve a self-hosted font subset.
- [ ] Add large state illustrations only to account/main-window surfaces, never the compact overlay.
- [ ] Verify alt/decorative semantics and no duplicated accessible names.
- [ ] Verify web at 320/390/768/1280 px in light, dark, high contrast, and reduced motion.
- [ ] Verify Windows Explorer, installer, Start menu, taskbar, and 100/125/150/200% DPI.
