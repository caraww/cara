# Gallery theme implementation

This implementation adopts the approved Gallery direction across shared cara pages.

## Design tokens

| Token | Value | Use |
|---|---|---|
| Background | `#E9E9ED` | Main page canvas |
| Surface | `#FFFFFF` | Cards, panels, form surfaces |
| Text | `#242431` | Primary text |
| Muted | `#626273` | Secondary text |
| Accent | `#343B64` | Primary actions, active states, focus |
| Detail | `#9B8FC1` | Decorative details only |
| Soft accent | `#EEEEF5` | Secondary surfaces |

Contrast checks (WCAG relative luminance):
- `#242431` on `#E9E9ED`: **12.64:1**
- `#242431` on `#FFFFFF`: **15.31:1**
- `#626273` on `#E9E9ED`: **4.94:1**
- `#626273` on `#FFFFFF`: **5.98:1**
- White on `#343B64`: **10.74:1**

The lavender detail is decorative, not used as small text or a required control boundary.

## CSS loading order

1. Page-specific/base stylesheet (for example `home.css` or `studio.css`)
2. Page decoration and page-specific styles
3. `/css/polish.css?v=2`
4. `/css/tokens.css`, imported at the top of `polish.css`

Generated bracelet/color pages load the shared `polish.css?v=2` from `lib/generated-page-layout.js`. The standalone bead-color index also loads it explicitly. The offline screen loads tokens directly.

## Scope and invariants

- No changes to checkout, order creation, payment, pricing, Worker logic, gateway, or secrets.
- No changes to `js/palette.js`; all 33 physical bead colors remain the source of truth.
- Existing Vazirmatn fonts and RTL/Persian copy are retained.
- Reduced-motion preferences and visible keyboard focus remain supported.
- This is a stylesheet-only visual layer plus stylesheet wiring; no new dependencies.
- Browser screenshots/interactive visual audit were not available in the working environment, so responsive visual verification remains a follow-up before production release.
