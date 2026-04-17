import { de } from '../i18n/de'
import { type StateCode, STATE_LABEL_DE } from '../lib/stateConfig'
import { AppBreadcrumb, type AppBreadcrumbCrumb } from './AppBreadcrumb'
import { useRouterState } from '@tanstack/react-router'

function shortSchoolKeySegment(encoded: string) {
  const d = decodeURIComponent(encoded)
  return d.length > 40 ? `${d.slice(0, 37)}…` : d
}

/** Brotkrumen in der globalen Kopfleiste (ersetzt den separaten Titel). */
export function PageBreadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const crumbs: { homeCurrent: boolean; items: AppBreadcrumbCrumb[] } = (() => {
    if (pathname === '/' || pathname === '') {
      return { homeCurrent: true, items: [] }
    }
    if (pathname === '/status') {
      return { homeCurrent: false, items: [{ name: de.navStatus, current: true }] }
    }
    if (pathname === '/aenderungen') {
      return { homeCurrent: false, items: [{ name: de.osm.reviewBreadcrumb, current: true }] }
    }

    const m = pathname.match(/^\/bundesland\/([^/]+)(?:\/schule\/(.+))?$/)
    if (m) {
      const stateKey = m[1]
      const schoolKeyEnc = m[2]
      const label = STATE_LABEL_DE[stateKey as StateCode] ?? stateKey
      if (schoolKeyEnc) {
        return {
          homeCurrent: false,
          items: [
            { name: label, to: `/bundesland/${stateKey}` },
            { name: shortSchoolKeySegment(schoolKeyEnc), current: true },
          ],
        }
      }
      return { homeCurrent: false, items: [{ name: label, current: true }] }
    }

    return { homeCurrent: true, items: [] }
  })()

  return (
    <AppBreadcrumb appTitle={de.appTitle} homeCurrent={crumbs.homeCurrent} items={crumbs.items} />
  )
}
