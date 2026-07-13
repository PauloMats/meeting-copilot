# Meeting Copilot design system

## Audit summary

The existing product is operationally clear and visually competent, but the surfaces do not yet feel like one product system. The landing uses a decorative dark-only palette, the SaaS account exposes diagnostic JSON, form labels depend on placeholders, and the desktop navigation is a dense horizontal strip. Primary and secondary actions sometimes compete at the same visual weight.

Priority issues:

1. Account and billing hierarchy is not customer-ready.
2. Web has no user-controlled light/dark theme and tokens are not shared with desktop.
3. Authentication fields need persistent labels, helper/error text, loading, and disabled states.
4. Mobile spacing works but navigation and touch targets need deliberate compact behavior.
5. Desktop navigation needs a stable rail on wide screens and a compact bottom bar at narrow widths.
6. Empty/loading/success states need calm, action-oriented guidance.

## Foundations

The canonical code tokens live in `packages/design-system/src/tokens.css`.

- **Color:** semantic canvas, surface, text, border, brand, success, warning, danger, and focus roles. Light and dark map the same roles.
- **Typography:** system-first sans stack, 12–76 px responsive scale, tight display hierarchy, and readable 1.65 body line-height.
- **Spacing:** 4 px base scale from 4–80 px.
- **Radius:** 8, 12, 16, 24 px, plus pill.
- **Elevation:** borders group most content; low shadow for interactive/raised surfaces and medium shadow only for primary product previews.
- **Motion:** 120/180 ms with one ease-out curve; reduced-motion collapses duration.
- **Controls:** 44 px default interaction target and 48 px for primary mobile actions.

## Component rules

- One dominant action per section. Navigation remains a link; mutations remain buttons.
- Inputs always have visible labels and errors remain adjacent to their field/group.
- Cards are reserved for product previews, plans, grouped settings, and repeated account devices.
- Status combines text, icon/shape, and semantic color.
- Details/FAQ use native disclosure instead of modal content.
- Focus rings use the semantic focus token and never rely on color alone.

## Responsive navigation

- Marketing web: compact sticky header, visible product/account destinations, no mobile hamburger for only a few routes.
- SaaS account: focused account header and single-column content on compact screens.
- Electron: navigation rail on wide windows; bottom navigation on compact windows; overlay remains unchanged and operational.
