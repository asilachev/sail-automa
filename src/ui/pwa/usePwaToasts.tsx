import { ArrowClockwise, FloppyDisk, WifiSlash } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToasts } from '../components/index.ts'
import { useT } from '../i18n/index.ts'
import { storageWorks } from './pwa.ts'

/**
 * F3 · the offline and update-ready toasts, and the save-blocked warning. The service worker is in
 * prompt mode (vite.config.ts), so a new version waits for Reload instead of reloading mid-voyage;
 * the voyage is saved after every tap, so reloading is safe.
 */
export function usePwaToasts(): void {
  const toasts = useToasts()
  const t = useT()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!needRefresh) return
    toasts.push({
      key: 'update',
      icon: <ArrowClockwise size={18} weight="fill" aria-hidden />,
      text: t('pwa.update'),
      duration: 0,
      action: { label: t('pwa.reload'), run: () => void updateServiceWorker(true) },
    })
  }, [needRefresh, toasts, updateServiceWorker, t])

  useEffect(() => {
    const offline = () =>
      toasts.push({
        key: 'network',
        icon: <WifiSlash size={18} weight="fill" aria-hidden />,
        text: t('pwa.offlineToast'),
        duration: 5000,
      })
    const online = () => toasts.dismiss('network')
    if (!navigator.onLine) offline()
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => {
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
    }
  }, [toasts, t])

  // Private modes and some settings block storage: the voyage plays, but won't survive a reload.
  useEffect(() => {
    if (storageWorks()) return
    toasts.push({
      key: 'saveBlocked',
      icon: <FloppyDisk size={18} weight="fill" aria-hidden />,
      text: t('pwa.saveBlocked'),
      duration: 0,
    })
  }, [toasts, t])
}
