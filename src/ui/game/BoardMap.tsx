import { ArrowFatRight } from '@phosphor-icons/react'
import type { Seat } from '../../engine/index.ts'
import type { Heading } from '../components/index.ts'
import { Picture } from '../components/index.ts'
import { useT } from '../i18n/index.ts'
import styles from './game.module.css'

/**
 * The ship's move on a strip of the ocean board's diamond grid (Components → Board Map / toward
 * the Bosun, toward you, straight, and their mirrored copies). The Bosun's side is on top and
 * yours below; the seat picks the sailing direction, so the arrow points the way the ship sails
 * at your table: from your left (seat left) or from your right (mirrored).
 */
export function BoardMap({ heading, seat }: { heading: Heading; seat: Seat }) {
  const t = useT()
  // The design's geometry, in its 326 × 104 frame: the lattice every 52 px, the ship's cell at
  // (70.5, 52.5) and the target half a cell up or down (toward a side) or a whole cell ahead.
  const start = { x: 70.5, y: 52.5 }
  const target =
    heading === 'straight'
      ? { x: start.x + 52, y: start.y }
      : { x: start.x + 26, y: start.y + (heading === 'bosun' ? -26 : 26) }
  const lines: string[] = []
  for (let c = -112; c <= 430; c += 52) {
    lines.push(`M${c} 0l104 104`, `M${c + 104} 0l-104 104`)
  }
  const diamond = (x: number, y: number, r = 23.5) =>
    `M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z`
  const mirrored = seat === 'right'
  const turn = heading === 'bosun' ? -45 : heading === 'you' ? 45 : 0
  const pos = (x: number) => (mirrored ? 326 - x : x)
  return (
    <figure
      className={styles.boardMap}
      data-mirrored={mirrored}
      role="img"
      aria-label={t(`miniMap.${heading}`)}
    >
      <svg className={styles.boardSvg} viewBox="0 0 326 104" aria-hidden="true">
        <g transform={mirrored ? 'translate(326 0) scale(-1 1)' : undefined}>
          <path className={styles.lattice} d={lines.join('')} />
          <path className={styles.startCell} d={diamond(start.x, start.y)} />
          <path className={styles.targetCell} d={diamond(target.x, target.y)} />
        </g>
      </svg>
      <span
        className={styles.boardArrow}
        style={{
          left: `${(pos(target.x) / 326) * 100}%`,
          top: `${(target.y / 104) * 100}%`,
          transform: `translate(-50%, -50%) rotate(${mirrored ? 180 - turn : turn}deg)`,
        }}
        aria-hidden="true"
      >
        <ArrowFatRight size={heading === 'straight' ? 22 : 24} weight="fill" />
      </span>
      <span
        className={styles.boardShip}
        style={{ left: `${(pos(start.x) / 326) * 100}%` }}
        aria-hidden="true"
      >
        <Picture name="ship" size={50} />
      </span>
      <span className={styles.boardSide} data-side="bosun" aria-hidden="true">
        {t('common.bosun')}
      </span>
      <span className={styles.boardSide} data-side="you" aria-hidden="true">
        {t('common.you')}
      </span>
    </figure>
  )
}
