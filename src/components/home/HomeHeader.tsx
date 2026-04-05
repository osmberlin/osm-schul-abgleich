import { de } from '../../i18n/de'
import { GITHUB_REPO_ROOT } from '../../lib/githubRepo'

const headerLinkClass =
  'font-medium text-emerald-300 underline decoration-emerald-300/30 underline-offset-2 hover:decoration-emerald-400'

export function HomeHeader() {
  const h = de.home
  return (
    <header className="mb-8 border-b border-zinc-700 pb-6">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-100">{h.heading}</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {h.leadIntro}
        <a
          href={h.links.jedeschule.href}
          className={headerLinkClass}
          target="_blank"
          rel="noreferrer"
        >
          {h.links.jedeschule.label}
        </a>
        {h.leadBetween}
        <a
          href={h.links.osmSchoolTag.href}
          className={headerLinkClass}
          target="_blank"
          rel="noreferrer"
        >
          {h.links.osmSchoolTag.label}
        </a>
        {h.leadOutro}
      </p>
      <p className="mt-2 text-sm text-zinc-400">
        <a href={GITHUB_REPO_ROOT} className={headerLinkClass} target="_blank" rel="noreferrer">
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
    </header>
  )
}
