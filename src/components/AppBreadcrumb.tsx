import { de } from '../i18n/de'
import { APP_LOGO_SRC } from '../lib/branding'
import { Link } from '@tanstack/react-router'

export type AppBreadcrumbCrumb =
  | { name: string; to: string; shortName?: string }
  | { name: string; current: true; shortName?: string }

function BreadcrumbCrumbLabel({ name, shortName }: { name: string; shortName?: string }) {
  if (shortName != null && shortName !== name) {
    return (
      <>
        <span className="hidden md:inline">{name}</span>
        <span className="md:hidden">{shortName}</span>
      </>
    )
  }
  return <>{name}</>
}

function BreadcrumbChevron() {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 44"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-full w-6 shrink-0 text-zinc-700"
    >
      <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
    </svg>
  )
}

type Props = {
  /** App name shown beside the home icon (replaces a separate title bar). */
  appTitle: string
  /** When true, home is the current page (not a link). */
  homeCurrent: boolean
  /** Segments after home; last entry must be `{ current: true }`. */
  items: AppBreadcrumbCrumb[]
  /** On narrow viewports, show only the home icon (e.g. school detail). Link `aria-label` still names the app. */
  hideAppTitleOnMobile?: boolean
}

export function AppBreadcrumb({ appTitle, homeCurrent, items, hideAppTitleOnMobile }: Props) {
  const homeSegmentClass =
    'group flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-200'
  const homeLogoClass =
    'h-5 w-auto max-w-[7.5rem] shrink-0 object-contain opacity-90 md:-ml-0.5 group-hover:opacity-100'

  /** Row height matches parent `AppHeader` (`h-14`); chevrons use `h-full`. */
  const rowClass = 'h-14'
  const appTitleClass = `text-brand-100${hideAppTitleOnMobile ? ' hidden md:inline' : ''}`

  return (
    <nav aria-label={de.breadcrumb.navLabel} className="flex min-w-0 flex-1">
      <ol role="list" className={`flex w-full min-w-0 flex-nowrap items-stretch ${rowClass}`}>
        <li className="flex shrink-0 items-center">
          {homeCurrent ? (
            <span className={homeSegmentClass} aria-current="page">
              <img src={APP_LOGO_SRC} alt="" aria-hidden className={homeLogoClass} />
              <span className={appTitleClass}>{appTitle}</span>
              <span className="sr-only">{de.breadcrumb.home}</span>
            </span>
          ) : (
            <Link
              to="/"
              className={homeSegmentClass}
              aria-label={`${de.breadcrumb.home} — ${appTitle}`}
            >
              <img src={APP_LOGO_SRC} alt="" aria-hidden className={homeLogoClass} />
              <span className={appTitleClass}>{appTitle}</span>
            </Link>
          )}
        </li>
        {items.map((page, index) => {
          const key = `${index}-${page.name}`
          if ('current' in page && page.current) {
            const a11yLong =
              page.shortName != null ? { 'aria-label': page.name, title: page.name } : {}
            return (
              <li key={key} className="flex h-full min-w-0 shrink-0 items-stretch">
                <BreadcrumbChevron />
                <span
                  aria-current="page"
                  className="ml-4 flex min-w-0 items-center truncate text-sm font-medium text-zinc-400"
                  {...a11yLong}
                >
                  <BreadcrumbCrumbLabel name={page.name} shortName={page.shortName} />
                </span>
              </li>
            )
          }
          const link = page as { name: string; to: string; shortName?: string }
          const linkA11y =
            link.shortName != null ? { 'aria-label': link.name, title: link.name } : {}
          return (
            <li key={key} className="flex h-full min-w-0 shrink-0 items-stretch">
              <BreadcrumbChevron />
              <Link
                to={link.to}
                className="ml-4 flex min-w-0 items-center truncate text-sm font-medium text-zinc-400 hover:text-zinc-200"
                {...linkA11y}
              >
                <BreadcrumbCrumbLabel name={link.name} shortName={link.shortName} />
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
