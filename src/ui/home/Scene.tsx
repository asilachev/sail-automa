import type { CSSProperties, ReactNode } from 'react'
import styles from './scene.module.css'

/**
 * The ocean board's lattice: thin cream lines at 45° both ways, `period` px apart along the top
 * edge, as the design draws them (Scene → Lattice). `back` and `forward` are where the first `\`
 * and `/` lines cross the top edge.
 */
export function Lattice({
  width,
  height,
  period,
  back,
  forward,
}: {
  width: number
  height: number
  period: number
  back: number
  forward: number
}) {
  const lines: string[] = []
  // The first line of each set that still reaches the box, then every period after it.
  const first = (offset: number, from: number) =>
    from + ((((offset - from) % period) + period) % period)
  for (let x = first(back, -height); x < width; x += period)
    lines.push(`M${x} 0l${height} ${height}`)
  for (let x = first(forward, 0); x < width + height; x += period)
    lines.push(`M${x} 0l${-height} ${height}`)
  return (
    <svg
      className={styles.lattice}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <path d={lines.join('')} />
    </svg>
  )
}

export type TileKind = 'anchor' | 'island' | 'kraken'

/**
 * A board token standing on its corner (Scene → Tile · …): a square of `side` px turned 45°, its
 * printed border inside, centred on (`x`, `y`). `children` stand on it, positioned by the caller.
 */
export function Tile({
  kind,
  side,
  x,
  y,
  children,
}: {
  kind: TileKind
  side: number
  x: number
  y: number
  children?: ReactNode
}) {
  const style = {
    '--side': `${side}px`,
    left: x - side / 2,
    top: y - side / 2,
  } as CSSProperties
  return (
    <>
      <span className={styles.tile} data-kind={kind} style={style} aria-hidden="true">
        <span className={styles.printed} />
      </span>
      {children}
    </>
  )
}

/** A positioned picture or icon in a scene, at the design's bounds. */
export function Placed({
  x,
  y,
  flip = false,
  children,
}: {
  x: number
  y: number
  flip?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={styles.placed}
      style={{ left: x, top: y, transform: flip ? 'scaleX(-1)' : undefined }}
      aria-hidden="true"
    >
      {children}
    </span>
  )
}
