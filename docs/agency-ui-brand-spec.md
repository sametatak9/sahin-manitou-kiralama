# EMBAY Agency UI — Brand Spec

**Product:** EMBAY PANEL / EMBAY Agency  
**Current pilot tenant:** EMBAY YAPI  
**Scope:** Authenticated agency operations UI

## Identity assets

- Primary UI lockup: `public/reels/kit/embay_logo_beyaz.png` (web path: `/reels/kit/embay_logo_beyaz.png`). Use on the branded navy/blue tile only; preserve aspect ratio and do not recolor, distort, or redraw it.
- `public/brand/logo-seffaf.png` is a red/black background variant and is not used on the light agency shell.
- `public/embay-mark.svg` is a separate green EMBAY PANEL mark; it is not a substitute for the EMBAY YAPI logo.
- Do not add stock or generated imagery to the operations UI unless a future design task calls for it. The product interface and real tenant data remain the primary visual material.

## Tokens

| Role | Token | Value |
|---|---|---|
| EMBAY primary | `--color-brand-green` (legacy token name) | `#1E5BC6` |
| EMBAY deep blue | `--color-brand-darkgreen` (legacy token name) | `#16428F` |
| Primary tint | `--color-brand-lightbg` | `#EAF1FC` |
| Page background | `--color-ink-950` | `#F2F6FC` |
| Card surface | `--color-ink-900` | `#FFFFFF` |
| Primary text | `--color-ink-100` | `#0E1A33` |
| Muted text | `--color-ink-400` | `#586985` |
| Fine border | `--color-ink-700` | `#D5E0F2` |
| Success / wait / run / stop | `signal-go / signal-wait / signal-run / signal-stop` | preserve semantic state colors |

## Typography

- Headings and agency shell: Montserrat (existing project font token).
- Body: Plus Jakarta Sans with system sans-serif fallback.
- Numeric/code values: JetBrains Mono; use tabular figures for metrics.

## Components and motion

- White/light glass surfaces, 18–24 px radii, subtle blue-gray borders and restrained shadows.
- Primary actions use EMBAY blue; holographic blue/cyan is reserved for the agency control action and small highlights.
- Navigation, member profile, client switcher, cards, and buttons use short transitions (roughly 150–220 ms). No continuous decorative animation.
- Bot pulse/animation must remain tied to the real `running` status. Respect `prefers-reduced-motion` and retain visible keyboard focus.
- Do not show a green “connected/healthy” indicator unless it is backed by the corresponding live status data.
