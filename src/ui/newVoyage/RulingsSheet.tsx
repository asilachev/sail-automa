import { DEFAULT_RULINGS, RULING_KEYS, RULING_OPTIONS, type Rulings } from '../../engine/index.ts'
import { RulingRow, Sheet } from '../components/index.ts'
import { useT, type MessageKey } from '../i18n/index.ts'
import styles from './newVoyage.module.css'
import { nextOption, rulingKey } from './texts.ts'

/**
 * B4 · Rulings: every ruling of docs/automa.md → Rulings with its answer and source. Change
 * steps to the ruling's next option (most have two); a ruling with one option has nothing to
 * change, so it shows no Change. Without `onChange` it is read-only: the game's menu shows the
 * voyage's rulings, fixed since New voyage (#9).
 */
export function RulingsSheet({
  rulings,
  onChange,
  onClose,
}: {
  rulings: Rulings
  onChange?: (rulings: Rulings) => void
  onClose: () => void
}) {
  const t = useT()
  return (
    <Sheet title={t('rulings.title')} onClose={onClose}>
      <p className={styles.lead}>{t('rulings.lead')}</p>
      <div className={styles.rulingsList}>
        {RULING_KEYS.map((key) => {
          const value = rulings[key]
          const changeable = onChange !== undefined && RULING_OPTIONS[key].length > 1
          return (
            <RulingRow
              key={key}
              question={t(`rulings.${key}.q` as MessageKey)}
              answer={t(rulingKey(key, value))}
              source={t(`rulings.${key}.source` as MessageKey)}
              isDefault={value === DEFAULT_RULINGS[key]}
              {...(changeable
                ? { onChange: () => onChange?.({ ...rulings, [key]: nextOption(key, value) }) }
                : {})}
            />
          )
        })}
      </div>
    </Sheet>
  )
}
