import { Anchor } from '@phosphor-icons/react'
import { Picture } from '../components/index.ts'
import styles from './result.module.css'

/** The design's diagonal lattice over the sea (E1, E2 → Scene → Lattice), 358 × 172. */
const LATTICE =
  'M-126 0l172 172m-40-172l-172 172m120-172l172 172m-40-172l-172 172m120-172l172 172m-40-172l-172 172m120-172l172 172m-40-172l-172 172m120-172l172 172m-40-172l-172 172m120-172l172 172m-40-172l-172 172m120-172l172 172m-40-172l-172 172'

/**
 * The voyage's end hero (design E1 · Land ho, E2 · The Kraken wins): a sea scene of K3+ pieces
 * above the title. The scene keeps the design's 358 px composition, centred, so on a 360 px phone
 * its edges crop instead of the pieces drifting apart.
 */
export function Hero({
  outcome,
  title,
  sub,
}: {
  outcome: 'won' | 'lost'
  title: string
  sub: string
}) {
  return (
    <section className={styles.hero} data-outcome={outcome} aria-labelledby="voyage-end-title">
      <div className={styles.scene} aria-hidden="true">
        <div className={styles.canvas}>
          <Picture name="sea-contours" size={358} className={`${styles.contours}`} />
          <svg className={styles.lattice} viewBox="0 0 358 172" width="358" height="172">
            <path d={LATTICE} />
          </svg>
          {outcome === 'won' ? <WonPieces /> : <LostPieces />}
        </div>
      </div>
      <div className={styles.heroText}>
        <h1 id="voyage-end-title" className={styles.heroTitle}>
          {title}
        </h1>
        <p className={styles.heroSub}>{sub}</p>
      </div>
    </section>
  )
}

/** E1: the ship beside the island, an anchor tile under it and a Kraken token at the edge. */
function WonPieces() {
  return (
    <>
      <span className={`${styles.tile} ${styles.tileKraken}`} />
      <Picture name="tentacle" size={46} className={`${styles.wonTentacle}`} />
      <Picture name="island" size={176} className={`${styles.wonIsland}`} />
      <span className={`${styles.tile} ${styles.tileAnchor}`} />
      <Anchor size={29} weight="bold" className={styles.wonAnchor} />
      <Picture name="ship" size={136} className={`${styles.wonShip}`} />
    </>
  )
}

/** E2: storm clouds and three tentacles round the ship. */
function LostPieces() {
  return (
    <>
      <Picture name="cloud" size={104} className={`${styles.cloudLeft}`} />
      <Picture name="cloud" size={92} className={`${styles.cloudRight}`} />
      <Picture name="tentacle" size={144} className={`${styles.tentacleLeft}`} />
      <Picture name="tentacle" size={158} className={`${styles.tentacleRight}`} />
      <Picture name="ship" size={112} className={`${styles.lostShip}`} />
      <Picture name="tentacle" size={100} className={`${styles.tentacleFront}`} />
    </>
  )
}
