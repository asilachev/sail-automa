// The K3+ kit as SVG URLs: our own drawings from the design (see README.md in this folder).
// One import point for every picture, so no screen reaches for a file by path.

import cloud from './cloud.svg'
import helm from './helm.svg'
import island from './island.svg'
import seaContours from './sea-contours.svg'
import ship from './ship.svg'
import symCannon from './sym-cannon.svg'
import symHelm from './sym-helm.svg'
import symHk from './sym-hk.svg'
import symTail from './sym-tail.svg'
import tentacle from './tentacle.svg'

/** The wooden helm: the app's mark (design component `Mark`). */
export { helm }

/** The four card symbols as wooden tokens (design components `Symbol / …`). */
export { symHelm, symHk, symTail, symCannon }

/** The board pieces: the ship, the Kraken's tentacle, the storm cloud and the island. */
export { ship, tentacle, cloud, island }

/** The ocean board's contour lines, a transparent overlay for a sea gradient. */
export { seaContours }
