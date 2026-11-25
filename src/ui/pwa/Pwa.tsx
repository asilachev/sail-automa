import { Anchor, ArrowRight, ArrowsOut, Sun, WifiSlash } from '@phosphor-icons/react'
import { seaContours } from '../assets/art/index.ts'
import { Button, Picture, Sheet, Step, Steps } from '../components/index.ts'
import { Lattice, Placed, Tile } from '../home/Scene.tsx'
import { useT } from '../i18n/index.ts'
import styles from './pwa.module.css'

/** F1 · Install on iPhone (once): what installing gives, and Safari's three steps. */
export function InstallSheet({ onClose }: { onClose: () => void }) {
  const t = useT()
  const benefits = [
    [WifiSlash, 'pwa.offline'],
    [ArrowsOut, 'pwa.fullScreen'],
    [Sun, 'pwa.awake'],
  ] as const
  return (
    <Sheet title={t('pwa.iosTitle')} onClose={onClose}>
      {(close) => (
        <>
          <ul className={styles.benefits}>
            {benefits.map(([Icon, key]) => (
              <li key={key} className={styles.benefit}>
                <Icon size={22} weight="fill" aria-hidden />
                {t(key)}
              </li>
            ))}
          </ul>
          <Steps>
            <Step n={1}>{t('pwa.ios1')}</Step>
            <Step n={2}>{t('pwa.ios2')}</Step>
            <Step n={3}>{t('pwa.ios3')}</Step>
          </Steps>
          <div className={styles.ok}>
            <Button iconEnd={<ArrowRight size={20} weight="fill" aria-hidden />} onClick={close}>
              {t('pwa.iosOk')}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  )
}

/**
 * A1 · Splash: on each launch from the home screen, briefly, then it fades into Home (board 03:
 * it never replays within a session). The design's 390 × 844 scene stays centred on any screen.
 */
export function Splash({ leaving }: { leaving: boolean }) {
  const t = useT()
  return (
    <div className={styles.splash} data-leaving={leaving} aria-hidden="true">
      <img className={styles.contours} src={seaContours} alt="" draggable={false} />
      <div className={styles.stage}>
        <Lattice width={390} height={844} period={104} back={-771} forward={17} />
        <span className={styles.calm} />
        <Tile kind="kraken" side={66} x={298.5} y={185.5} />
        <Placed x={274} y={150}>
          <Picture name="tentacle" size={59} className={styles.tentacle} />
        </Placed>
        <Placed x={20} y={80}>
          <Picture name="cloud" size={128} className={styles.cloud} />
        </Placed>
        <Tile kind="island" side={66} x={350.5} y={549.5} />
        <Placed x={321} y={522}>
          <Picture name="island" size={59} className={styles.island} />
        </Placed>
        <Tile kind="anchor" side={66} x={194.5} y={601.5} />
        <Placed x={176} y={583}>
          <Anchor size={37} weight="bold" color="#8fd2c8" />
        </Placed>
        <Placed x={-36} y={632}>
          <Picture name="tentacle" size={168} className={styles.bigTentacle} />
        </Placed>
        <Placed x={113} y={432}>
          <Picture name="ship" size={165} className={styles.ship} />
        </Placed>
        <div className={styles.brand}>
          <Picture name="helm" size={124} className={styles.helm} />
          <p className={styles.wordmark}>{t('app.wordmark')}</p>
          <p className={styles.sub}>{t('app.sub')}</p>
        </div>
      </div>
      <p className={styles.footer}>{t('pwa.splashFooter')}</p>
    </div>
  )
}
