import { HeartIcon } from '@heroicons/react/20/solid'
import { Link } from '@tanstack/react-router'
import { de } from '../i18n/de'

/** Geo + OSS credits: muted by default; footer group-hover uses same colors as the bottom links’ hover. */
const bodyFooterLinkClass =
  'rounded-sm underline underline-offset-2 transition-[color,text-decoration-color] duration-150 ' +
  'text-emerald-600/65 decoration-emerald-600/25 dark:text-emerald-500/65 dark:decoration-emerald-600/22 ' +
  'group-hover/footer:text-emerald-800 group-hover/footer:decoration-emerald-700 ' +
  'dark:group-hover/footer:text-emerald-300 dark:group-hover/footer:decoration-emerald-400 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-emerald-600/45 dark:focus-visible:outline-emerald-500/40'

/** Pipeline-Status + GitHub: always strong text; underline follows link hover or footer group-hover. */
const endFooterLinkClass =
  'text-emerald-800 underline decoration-zinc-300 underline-offset-2 transition-[text-decoration-color] duration-150 ' +
  'hover:decoration-emerald-700 dark:text-emerald-300 dark:decoration-zinc-600 dark:hover:decoration-emerald-400 ' +
  'group-hover/footer:decoration-emerald-700 dark:group-hover/footer:decoration-emerald-400'

export function AppFooter() {
  const f = de.footer
  const jedeschule = de.home.links.jedeschule

  return (
    <footer className="group/footer border-t border-zinc-200 bg-zinc-50/80 py-8 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
      <div className="mx-auto max-w-5xl space-y-5 px-4">
        <p className="flex gap-2">
          <HeartIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-inherit" />
          <span>
            {f.geoDataLine}
            <a href={f.osmLinkHref} className={bodyFooterLinkClass} target="_blank" rel="noreferrer">
              {f.osmLinkLabel}
            </a>
            {f.geoDataBetween}
            <a href={jedeschule.href} className={bodyFooterLinkClass} target="_blank" rel="noreferrer">
              {jedeschule.label}
            </a>
            .
          </span>
        </p>

        <p className="flex gap-2">
          <HeartIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-inherit" />
          <span>
            {f.openSourceComponentsLine}
            {f.openSourceThanks.map((item, i) => (
              <span key={item.href}>
                {i > 0 ? ', ' : null}
                <a href={item.href} className={bodyFooterLinkClass} target="_blank" rel="noreferrer">
                  {item.name}
                </a>
              </span>
            ))}
            .
          </span>
        </p>

        <p>
          <Link to="/status" className={endFooterLinkClass}>
            {de.navStatus}
          </Link>
          <span
            aria-hidden
            className="mx-1.5 text-zinc-400 transition-colors duration-150 group-hover/footer:text-emerald-800/55 dark:text-zinc-500 dark:group-hover/footer:text-emerald-300/70"
          >
            ·
          </span>
          <a href={f.githubHref} className={endFooterLinkClass} target="_blank" rel="noreferrer">
            {f.githubLabel}
          </a>
        </p>
      </div>
    </footer>
  )
}
