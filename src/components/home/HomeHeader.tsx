import { de } from '../../i18n/de'
import { APP_LOGO_SRC } from '../../lib/branding'
import { GITHUB_REPO_ROOT } from '../../lib/githubRepo'
import { Link } from '@tanstack/react-router'

const headerLinkClass =
  'font-medium text-emerald-300 underline decoration-emerald-300/30 underline-offset-2 hover:decoration-emerald-400'

/** In-body links: match surrounding copy until hover (then same as `headerLinkClass`). */
const leadLinkClass =
  'text-inherit font-normal no-underline decoration-transparent underline-offset-2 transition-[color,font-weight,text-decoration-color] duration-150 hover:font-medium hover:text-emerald-300 hover:underline hover:decoration-emerald-300/30 hover:decoration-emerald-400'

export function HomeHeader() {
  const h = de.home
  return (
    <header className="mb-8 border-b border-zinc-700 pb-6">
      <div className="flex items-start gap-6 lg:gap-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-100">{h.heading}</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {h.leadIntro}
            <a
              href={h.links.jedeschule.href}
              className={leadLinkClass}
              target="_blank"
              rel="noreferrer"
            >
              {h.links.jedeschule.label}
            </a>
            {h.leadBetween}
            {h.links.osmSchoolTags.map((tag, idx) => (
              <span key={tag.href}>
                {idx > 0 ? (idx === h.links.osmSchoolTags.length - 1 ? ' und ' : ', ') : null}
                <a href={tag.href} className={leadLinkClass} target="_blank" rel="noreferrer">
                  {tag.label}
                </a>
              </span>
            ))}
            {h.leadOutro}
          </p>
          <div className="mt-2 flex items-center justify-between gap-4 text-sm text-zinc-400">
            <p>
              <a
                href={GITHUB_REPO_ROOT}
                className={headerLinkClass}
                target="_blank"
                rel="noreferrer"
              >
                {h.githubCodeLinkLabel}
              </a>
              <span aria-hidden className="mx-1.5 text-zinc-500">
                ·
              </span>
              <a
                href={`${GITHUB_REPO_ROOT}/issues`}
                className={headerLinkClass}
                target="_blank"
                rel="noreferrer"
              >
                {h.githubIssuesLinkLabel}
              </a>
            </p>
            <Link to="/changelog" className={headerLinkClass}>
              {h.changelogLinkLabel}
            </Link>
          </div>
        </div>
        <img
          src={APP_LOGO_SRC}
          alt=""
          aria-hidden
          className="hidden h-24 w-auto max-w-[10rem] shrink-0 object-contain md:block lg:h-28 lg:max-w-[12rem]"
        />
      </div>
    </header>
  )
}
