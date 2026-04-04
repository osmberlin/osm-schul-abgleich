import { de } from '../i18n/de'
import { isOsmOAuthConfigured } from '../lib/osmOAuthConfig'
import {
  useOsmAppActions,
  useOsmAuthInitialized,
  useOsmDisplayName,
  usePendingEditCount,
} from '../stores/osmAppStore'
import { Link } from '@tanstack/react-router'
import { useCallback, useState } from 'react'

export function HeaderOsmActions() {
  const authInitialized = useOsmAuthInitialized()
  const displayName = useOsmDisplayName()
  const pendingCount = usePendingEditCount()
  const { login: doLogin, logout: doLogout } = useOsmAppActions()

  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const onLogin = useCallback(async () => {
    if (!isOsmOAuthConfigured()) return
    setLoginBusy(true)
    setLoginError(null)
    try {
      await doLogin()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setLoginError(msg || de.osm.loginFailed)
    } finally {
      setLoginBusy(false)
    }
  }, [doLogin])

  const loggedIn = Boolean(displayName)

  if (!authInitialized) {
    return <span className="shrink-0 text-xs text-zinc-500">{de.osm.authLoading}</span>
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
      {pendingCount > 0 && (
        <Link
          to="/aenderungen"
          className="text-sm font-medium text-amber-300 underline decoration-amber-300/40 underline-offset-2 hover:text-amber-200"
        >
          {de.osm.reviewLink}
        </Link>
      )}
      {!isOsmOAuthConfigured() && (
        <span
          className="max-w-[10rem] text-right text-xs text-zinc-500"
          title={de.osm.oauthMissingHint}
        >
          {de.osm.oauthMissingShort}
        </span>
      )}
      {isOsmOAuthConfigured() && !loggedIn && (
        <div className="flex max-w-[min(100%,18rem)] flex-col items-end gap-1">
          <button
            type="button"
            disabled={loginBusy}
            onClick={() => void onLogin()}
            className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loginBusy ? de.osm.loginBusy : de.osm.login}
          </button>
          {loginError != null && (
            <p className="text-right text-xs leading-snug text-red-300/95">
              <span className="font-medium">{de.osm.loginFailed}</span>
              {loginError !== de.osm.loginFailed && (
                <>
                  {': '}
                  <span className="font-mono break-all opacity-90">{loginError}</span>
                </>
              )}
              {loginError !== 'Popup was blocked' && (
                <span className="mt-1 block font-sans text-zinc-400">
                  {de.osm.oauthSpaRegistrationHint}
                </span>
              )}
            </p>
          )}
        </div>
      )}
      {loggedIn && (
        <>
          <span
            className="max-w-[9rem] truncate text-sm text-zinc-300"
            title={displayName ?? undefined}
          >
            {displayName}
          </span>
          <button
            type="button"
            onClick={doLogout}
            className="text-sm font-medium text-zinc-400 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-200"
          >
            {de.osm.logout}
          </button>
        </>
      )}
    </div>
  )
}
