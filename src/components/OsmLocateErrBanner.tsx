import { useNavigate, useRouterState } from '@tanstack/react-router'
import { de } from '../i18n/de'
import type { OsmLocateErrKey } from '../lib/indexRouteSearch'

function messageForErr(err: OsmLocateErrKey): string {
  if (err === 'invalid') return de.osmLocate.invalidFormat
  if (err === 'outside') return de.osmLocate.outsideGermany
  return de.osmLocate.resolveFailed
}

/** Start page only: shows `?osmLocateErr=` from router redirect after failed OSM locate. */
export function OsmLocateErrBanner() {
  const navigate = useNavigate()
  const err = useRouterState({
    select: (s): OsmLocateErrKey | null => {
      if (s.location.pathname !== '/') return null
      const v = s.location.search.osmLocateErr
      return v === 'invalid' || v === 'outside' || v === 'fetch' ? v : null
    },
  })

  if (!err) return null

  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-amber-700/80 bg-amber-950/90 px-4 py-3 text-sm text-amber-100"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p>{messageForErr(err)}</p>
        <button
          type="button"
          className="shrink-0 rounded text-amber-200 underline hover:text-amber-50"
          onClick={() => void navigate({ to: '/', search: {}, replace: true })}
        >
          {de.osmLocate.bannerDismiss}
        </button>
      </div>
    </div>
  )
}
