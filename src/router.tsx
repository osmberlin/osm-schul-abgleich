import { AppFooter } from './components/AppFooter'
import { AppHeader } from './components/AppHeader'
import { AenderungenPage } from './pages/AenderungenPage'
import { HomePage } from './pages/HomePage'
import { LandLayout } from './pages/LandLayout'
import { LandOverview } from './pages/LandOverview'
import { NotFoundPage } from './pages/NotFoundPage'
import { SchuleDetail } from './pages/SchuleDetail'
import { StatusPage } from './pages/StatusPage'
import { getOsmPendingObjectCount, useOsmAppActions } from './stores/osmAppStore'
import { QueryClient } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
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
    <NuqsAdapter>
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
    </NuqsAdapter>
  )
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
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

const landRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bundesland/$code',
  component: LandLayout,
})

const landIndexRoute = createRoute({
  getParentRoute: () => landRoute,
  path: '/',
  component: LandOverview,
})

const schuleRoute = createRoute({
  getParentRoute: () => landRoute,
  path: 'schule/$matchKey',
  component: SchuleDetail,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  statusRoute,
  aenderungenRoute,
  landRoute.addChildren([landIndexRoute, schuleRoute]),
])

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000 } },
})

export const router = createRouter({
  routeTree,
  context: { queryClient },
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
