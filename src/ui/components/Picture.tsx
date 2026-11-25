import * as art from '../assets/art/index.ts'
import styles from './kit.module.css'

/**
 * The K3+ pictures (AGENTS.md → No official art): our own drawings, in `src/ui/assets/art/`
 * (issue #2). Every picture in the app goes through this one component. Ship, tentacle, cloud and
 * island keep their design frame's margin in the viewBox: size them at the frame's size.
 */
export type ArtName =
  | 'helm'
  | 'sym-helm'
  | 'sym-hk'
  | 'sym-tail'
  | 'sym-cannon'
  | 'ship'
  | 'tentacle'
  | 'cloud'
  | 'island'
  | 'sea-contours'

/** The drawings' URLs (issue #2). */
const ART: Readonly<Record<ArtName, string>> = {
  helm: art.helm,
  'sym-helm': art.symHelm,
  'sym-hk': art.symHk,
  'sym-tail': art.symTail,
  'sym-cannon': art.symCannon,
  ship: art.ship,
  tentacle: art.tentacle,
  cloud: art.cloud,
  island: art.island,
  'sea-contours': art.seaContours,
}

/**
 * One picture, `size` px square. Decorative unless `alt` is given: a picture next to its word
 * (a symbol chip's label) says nothing twice.
 */
export function Picture({
  name,
  size,
  alt,
  className,
}: {
  name: ArtName
  size: number
  alt?: string
  className?: string | undefined
}) {
  return (
    <img
      className={`${styles.picture} ${className ?? ''}`}
      src={ART[name]}
      width={size}
      height={size}
      alt={alt ?? ''}
      data-art={name}
      draggable={false}
    />
  )
}
