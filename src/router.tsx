import { AppFooter } from './components/AppFooter'
import { AppHeader } from './components/AppHeader'
import { parseIndexRouteMapSearch, validateIndexRouteSearch } from './lib/indexRouteSearch'
import { runOsmLocateRedirect } from './lib/osmLocateRedirect'
import { stringifySearchPretty } from './lib/routerSearchStringify'
import { resolveStateCodeForLonLat } from './lib/stateCodeForLonLatFromBoundaries'
import { validateStateRouteSearch } from './lib/stateRouteSearch'
import { AenderungenPage } from './pages/AenderungenPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SchuleDetail } from './pages/SchuleDetail'
import { StateLayout } from './pages/StateLayout'
import { StateOverview } from './pages/StateOverview'
import { StatusPage } from './pages/StatusPage'
import { getOsmPendingObjectCount, useOsmAppActions } from './stores/osmAppStore'
import { QueryClient } from '@tanstack/react-query'
import {
  createRootRoute,
  createRoute,
  createRouter,
  defaultParseSearch,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { useEffect } from 'react'

function OsmAuthBootstrap() {
  const { initAuth } = useOsmAppActions()
  useEffect(() => {
    void initAuth()
  }, [initAuth])
  return null
}

function PendingEditsBeforeUnload() {
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (getOsmPendingObjectCount() > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])
  return null
}

function RootLayout() {
  return (
    <>
      <OsmAuthBootstrap />
      <PendingEditsBeforeUnload />
      <div className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-zinc-800 focus:p-2 focus:text-zinc-100"
        >
          Zum Inhalt
        </a>
        <AppHeader />
        <main id="main" className="min-h-[70vh]">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </>
  )
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: validateIndexRouteSearch,
  component: HomePage,
  beforeLoad: async ({ search }) => {
    const osm = typeof search.osm === 'string' ? search.osm.trim() : ''
    if (osm) {
      await runOsmLocateRedirect(osm)
    }
    const triple = parseIndexRouteMapSearch(search as Record<string, unknown>)
    if (!triple) return
    const [, lat, lon] = triple
    const code = await resolveStateCodeForLonLat(lon, lat)
    if (!code) return
    throw redirect({
      to: '/bundesland/$code',
      params: { code },
      search: true,
      replace: true,
    })
  },
})

const statusRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/status',
  component: StatusPage,
})

const aenderungenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/aenderungen',
  component: AenderungenPage,
})

const stateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bundesland/$code',
  validateSearch: validateStateRouteSearch,
  component: StateLayout,
  beforeLoad: async ({ search }) => {
    const osm = typeof search.osm === 'string' ? search.osm.trim() : ''
    if (!osm) return
    await runOsmLocateRedirect(osm)
  },
})

const stateIndexRoute = createRoute({
  getParentRoute: () => stateRoute,
  path: '/',
  component: StateOverview,
})

const schuleRoute = createRoute({
  getParentRoute: () => stateRoute,
  path: 'schule/$matchKey',
  component: SchuleDetail,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  statusRoute,
  aenderungenRoute,
  stateRoute.addChildren([stateIndexRoute, schuleRoute]),
])

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
})

export const router = createRouter({
  routeTree,
  context: { queryClient },
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  parseSearch: defaultParseSearch,
  stringifySearch: stringifySearchPretty,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
