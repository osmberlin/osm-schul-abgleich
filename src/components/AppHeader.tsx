import { HeaderOsmActions } from './HeaderOsmActions'
import { PageBreadcrumb } from './PageBreadcrumb'

export function AppHeader() {
  return (
    <header className="border-b border-zinc-800 bg-brand-950/60">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <div className="min-w-0 flex-1">
          <PageBreadcrumb />
        </div>
        <HeaderOsmActions />
      </div>
    </header>
  )
}
