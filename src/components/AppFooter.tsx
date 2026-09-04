import { de } from '../i18n/de'
import { buildMaprouletteBrowseUrl, buildMaprouletteIdEditorCampaignUrl } from '../lib/editorLinks'
import { schoolCreatesChallengeId, schoolTagFixesChallengeId } from '../lib/maprouletteIds.const'
import { maprouletteSchoolCreatesJsonUrl, maprouletteTagFixesJsonUrl } from '../lib/paths'
import { HeartIcon } from '@heroicons/react/20/solid'
import { Link } from '@tanstack/react-router'

/** Geo + OSS credits: muted by default; footer group-hover uses same colors as the bottom links’ hover. */
const bodyFooterLinkClass =
  'rounded-sm underline underline-offset-2 transition-[color,text-decoration-color] duration-150 ' +
  'text-emerald-500/65 decoration-emerald-600/22 ' +
  'group-hover/footer:text-emerald-300 group-hover/footer:decoration-emerald-400 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-emerald-500/40'

/** Pipeline-Status + GitHub: always strong text; underline follows link hover or footer group-hover. */
const endFooterLinkClass =
  'text-emerald-300 underline decoration-zinc-600 underline-offset-2 transition-[text-decoration-color] duration-150 ' +
  'hover:decoration-emerald-400 ' +
  'group-hover/footer:decoration-emerald-400'

function FooterDot() {
  return (
    <span
      aria-hidden
      className="mx-1.5 text-zinc-500 transition-colors duration-150 group-hover/footer:text-emerald-300/70"
    >
      ·
    </span>
  )
}

function MaprouletteFooterRow({
  topicLabel,
  browseUrl,
  idEditorUrl,
  jsonUrl,
}: {
  topicLabel: string
  browseUrl: string | null
  idEditorUrl: string | null
  jsonUrl: string
}) {
  const f = de.footer
  const actions: { href: string; label: string }[] = []
  if (browseUrl) actions.push({ href: browseUrl, label: f.maprouletteCampaignLabel })
  if (idEditorUrl) actions.push({ href: idEditorUrl, label: f.maprouletteIdEditorLabel })
  actions.push({ href: jsonUrl, label: f.maprouletteJsonLabel })

  return (
    <p>
      {topicLabel}:{' '}
      {actions.map((action, i) => (
        <span key={action.href}>
          {i > 0 ? <FooterDot /> : null}
          <a href={action.href} className={endFooterLinkClass} target="_blank" rel="noreferrer">
            {action.label}
          </a>
        </span>
      ))}
    </p>
  )
}

export function AppFooter() {
  const f = de.footer
  const jedeschule = de.home.links.jedeschule

  return (
    <footer className="group/footer border-t border-zinc-800 bg-zinc-950/40 py-8 text-xs text-zinc-400">
      <div className="mx-auto max-w-5xl space-y-5 px-4">
        <p className="flex gap-2">
          <HeartIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-inherit" />
          <span>
            {f.geoDataLine}
            <a
              href={f.osmLinkHref}
              className={bodyFooterLinkClass}
              target="_blank"
              rel="noreferrer"
            >
              {f.osmLinkLabel}
            </a>
            {f.geoDataBetween}
            <a
              href={jedeschule.href}
              className={bodyFooterLinkClass}
              target="_blank"
              rel="noreferrer"
            >
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
                <a
                  href={item.href}
                  className={bodyFooterLinkClass}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.name}
                </a>
              </span>
            ))}
            .
          </span>
        </p>

        <div className="space-y-2">
          <p>
            <Link to="/status" className={endFooterLinkClass}>
              {de.navStatus}
            </Link>
            <FooterDot />
            <Link to="/changelog" className={endFooterLinkClass}>
              {de.navChangelog}
            </Link>
            <FooterDot />
            <Link to="/download" className={endFooterLinkClass}>
              {de.navDownload}
            </Link>
            <FooterDot />
            <a href={f.githubHref} className={endFooterLinkClass} target="_blank" rel="noreferrer">
              {f.githubLabel}
            </a>
          </p>
          <MaprouletteFooterRow
            topicLabel={f.maprouletteFeedLabel}
            browseUrl={buildMaprouletteBrowseUrl(schoolTagFixesChallengeId)}
            idEditorUrl={buildMaprouletteIdEditorCampaignUrl(schoolTagFixesChallengeId)}
            jsonUrl={maprouletteTagFixesJsonUrl()}
          />
          <MaprouletteFooterRow
            topicLabel={f.maprouletteCreatesFeedLabel}
            browseUrl={buildMaprouletteBrowseUrl(schoolCreatesChallengeId)}
            idEditorUrl={buildMaprouletteIdEditorCampaignUrl(schoolCreatesChallengeId)}
            jsonUrl={maprouletteSchoolCreatesJsonUrl()}
          />
        </div>
      </div>
    </footer>
  )
}
