# Art: the K3+ kit

Every picture in Bosun is our own. There is no official Sail art in this repo (`docs/decisions.md`).
These drawings were made for this project in pen.dev, in the design file `~/Graphics/sail-automa.pen`
(`docs/design.md`), and they are MIT-licensed with the code (`LICENSE`).

Each SVG is the vector source frame in the design, with every path's position flattened into the
frame's coordinates, consecutive paths of one colour merged, numbers rounded to 0.01 px and no
editor metadata. Import them from `index.ts`, never by path.

| File | Design component it replaces (PNG fill) | Source frame | viewBox |
| --- | --- | --- | --- |
| `helm.svg` | `Mark` (k3d-helm-t.png), the app's logo | Components → Section · Symbols → Generated → `Gen · K3 detailed helm` | tight |
| `sym-helm.svg` | `Symbol / Helm` (k3w-sym-helm.png) | Generated · card symbols → `Gen · K3 wooden sym-helm` | tight |
| `sym-hk.svg` | `Symbol / Helm & Kraken` (k3w-sym-hk.png) | Generated · card symbols → `Gen · K3 wooden sym-hk` | tight |
| `sym-tail.svg` | `Symbol / Tail` (k3w-sym-tail.png) | Generated · card symbols → `Gen · K3 wooden sym-tail` | tight |
| `sym-cannon.svg` | `Symbol / Cannon` (k3w-sym-cannon.png) | Generated · card symbols → `Gen · K3 wooden sym-cannon` | tight |
| `ship.svg` | `Art · ship` (k3d-ship.png) | Generated → `Gen · K3 detailed ship` | the frame, 260 × 240 |
| `tentacle.svg` | `Art · tentacle` (k3d-tentacle.png) | Generated → `Gen · K3 detailed tentacle` | the frame, 200 × 240 |
| `cloud.svg` | `Art · cloud`, `Cloud` (k3d-cloud.png) | Generated → `Gen · K3 detailed cloud` | the frame, 240 × 190 |
| `island.svg` | `Art · island` (k3d-island.png) | Generated → `Gen · K3 detailed island` | the frame, 220 × 200 |
| `sea-contours.svg` | the sea's overlay (sea-contours.png) | Generated → `Gen · Sea contours` | the frame, 360 × 240 |

**Sizes.** The mark and the symbols are trimmed to the drawing, as their PNGs were. The board
pieces and the contours keep their source frame's box, because their PNGs did too and the design
places them at sizes that include that margin: an `<img>` at the design's size shows the piece at
the design's size.

**The sea.** `sea-contours.svg` holds only the cream contour lines (`#fdf4c0`), on a transparent
ground. The design lays it over a gradient of `--sea-light` to `--sea`, at 95 % on the sea and at
38 % on the board maps; draw the gradient in CSS.

**Older sets.** The archive (Archive · old designs → Section · Old drawing sources) keeps the earlier
kits: the engraved sketches (K1), the painted set (K2), the plain meeples and stamp symbols (K3).
The kit above is the one the current design uses (K3+, picked on 19 Nov 2026).

**Icons.** `npm run icons` (`scripts/gen-icons.mjs`) renders the favicons and app icons in
`public/` from `helm.svg` (and `sym-helm.svg` for 16 px), following design board 05 · Icon and
favicons.
