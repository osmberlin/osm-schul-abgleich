import { de } from '../../i18n/de'
import {
  BUNDESLAND_OFFICIAL_SOURCES,
  licenceTableRowHash,
} from '../../lib/bundeslandOfficialSources'
import {
  BUNDESLAND_OFFICIAL_SOURCES_FILE,
  githubBlobUrl,
  githubNewIssueLicenseResearchUrl,
} from '../../lib/githubRepo'
import { miniMarkdownNodes } from '../../lib/miniMarkdown'
import { STATE_LABEL_DE, STATE_ORDER } from '../../lib/stateConfig'
import { ScaleIcon } from '@heroicons/react/20/solid'
import { Link } from '@tanstack/react-router'
import { format, isValid, parseISO } from 'date-fns'
import { de as deLocale } from 'date-fns/locale/de'

const OSM_COMPAT_LEGEND_BASE_ORDER = ['unknown', 'no'] as const

/** `YYYY-MM-DD` → `d.m.yyyy` (German locale, no leading zeros on day/month). */
function formatOfficialSourceCheckedDate(isoDate: string): string {
  const parsed = parseISO(isoDate.trim())
  if (!isValid(parsed)) return isoDate
  return format(parsed, 'd.M.yyyy', { locale: deLocale })
}

export function HomeOfficialSourcesSection() {
  const t = de.home.officialSources
  const issueUrl = githubNewIssueLicenseResearchUrl()
  const editUrl = githubBlobUrl(BUNDESLAND_OFFICIAL_SOURCES_FILE)

  return (
    <section
      className="mt-10 rounded-xl border border-zinc-700/80 bg-zinc-900/40 p-5"
      aria-labelledby="official-sources-heading"
    >
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <ScaleIcon className="mt-0.5 size-6 shrink-0 text-emerald-400/90" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="official-sources-heading" className="text-lg font-semibold text-zinc-100">
            {t.heading}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t.lead}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">{t.disclaimer}</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <a
          href={issueUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          {t.ctaIssue}
        </a>
        <a
          href={editUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800/80 px-3 py-2 text-sm font-medium text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          {t.ctaEditFile}
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-700/60">
        <table className="min-w-full border-collapse text-left text-sm text-zinc-300">
          <thead>
            <tr className="border-b border-zinc-700 bg-zinc-900/80 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              <th scope="col" className="px-3 py-2.5 align-top">
                {t.colLand}
              </th>
              <th scope="col" className="px-3 py-2.5 align-top">
                {t.colOfficialLicense}
              </th>
              <th scope="col" className="px-3 py-2.5 align-top">
                {t.colOsmCompatible}
              </th>
              <th scope="col" className="px-3 py-2.5 align-top">
                {t.colChecked}
              </th>
            </tr>
          </thead>
          <tbody>
            {STATE_ORDER.map((code) => {
              const row = BUNDESLAND_OFFICIAL_SOURCES[code]
              const name = STATE_LABEL_DE[code]
              return (
                <tr
                  key={code}
                  id={licenceTableRowHash(code)}
                  className="scroll-mt-4 border-b border-zinc-800/90 odd:bg-zinc-950/30 [&:target>*]:bg-emerald-500/15 [&:target>*]:ring-1 [&:target>*]:ring-emerald-500/35 [&:target>*]:ring-inset"
                >
                  <th
                    scope="row"
                    title={`${code} — ${name}`}
                    className="px-3 py-2 align-top font-medium text-zinc-200"
                  >
                    <Link
                      to="/bundesland/$code"
                      params={{ code }}
                      className="text-emerald-400/90 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-300 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                      aria-label={`${de.home.toLand}: ${name}`}
                    >
                      {name}
                    </Link>
                  </th>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      <div>
                        <span
                          className={
                            row.officialLicense === 'unknown'
                              ? 'text-orange-300/55'
                              : 'text-zinc-300'
                          }
                        >
                          {row.officialLicense === 'unknown'
                            ? t.unknownLicense
                            : row.officialLicense}
                        </span>
                        {row.likelyNote ? (
                          <span className="mt-1 block text-xs text-zinc-500 italic">
                            {row.likelyNote}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-row flex-wrap items-baseline gap-x-3 gap-y-1">
                        <a
                          href={row.officialSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-400/90 underline decoration-emerald-600/40 hover:text-emerald-300"
                        >
                          {t.sourceLinkLabel}
                        </a>
                        {row.officialSourceRefUrl &&
                        row.officialSourceRefUrl !== row.officialSourceUrl ? (
                          <a
                            href={row.officialSourceRefUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-emerald-400/90 underline decoration-emerald-600/40 hover:text-emerald-300"
                          >
                            {t.officialSourceRefLink}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      <span
                        className={
                          row.osmCompatible === 'unknown' ? 'text-orange-300/55' : 'text-zinc-300'
                        }
                      >
                        {t.osmCompatibleLabel[row.osmCompatible]}
                      </span>
                      {row.osmCompatibilityRefUrl ? (
                        <a
                          href={row.osmCompatibilityRefUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-400/90 underline decoration-emerald-600/40 hover:text-emerald-300"
                        >
                          {t.osmCompatibilityRefLink}
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td
                    className="px-3 py-2 align-top text-xs leading-snug text-zinc-500"
                    {...(row.lastCheckedByGithub
                      ? { 'data-checked-by': row.lastCheckedByGithub }
                      : {})}
                  >
                    {row.lastCheckedAt ? formatOfficialSourceCheckedDate(row.lastCheckedAt) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 border-t border-zinc-700/60 pt-5">
        <h3
          id="official-sources-osm-legend-heading"
          className="text-sm font-semibold text-zinc-200"
        >
          {t.osmCompatLegendHeading}
        </h3>
        <ul
          className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-400"
          aria-labelledby="official-sources-osm-legend-heading"
        >
          {OSM_COMPAT_LEGEND_BASE_ORDER.map((key) => (
            <li key={key}>
              <span className="font-medium text-zinc-300">{t.osmCompatibleLabel[key]}</span>
              {' \u2013 '}
              {miniMarkdownNodes(t.osmCompatLegendText[key])}
            </li>
          ))}
          <li>
            <span className="font-medium text-zinc-300">{t.osmCompatibleLabel.yes_licence}</span>
            {' \u2013 '}
            {miniMarkdownNodes(t.osmCompatLegendText.yesLicenceOrWaiver)}
          </li>
        </ul>
      </div>
    </section>
  )
}
