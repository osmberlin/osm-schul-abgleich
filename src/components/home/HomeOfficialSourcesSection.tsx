import { DocumentTextIcon } from '@heroicons/react/20/solid'
import { de } from '../../i18n/de'
import {
  BUNDESLAND_OFFICIAL_SOURCES,
  type OsmLicenseCompatibility,
} from '../../lib/bundeslandOfficialSources'
import {
  BUNDESLAND_OFFICIAL_SOURCES_FILE,
  githubBlobUrl,
  githubNewIssueLicenseResearchUrl,
} from '../../lib/githubRepo'
import { STATE_LABEL_DE, STATE_ORDER } from '../../lib/stateConfig'

function OsmCompatibleBadge({ value }: { value: OsmLicenseCompatibility }) {
  const label = de.home.officialSources.osmCompatibleLabel[value]
  const tone =
    value === 'unknown'
      ? 'bg-zinc-700/80 text-zinc-200'
      : value === 'no'
        ? 'bg-rose-900/50 text-rose-100'
        : 'bg-emerald-900/40 text-emerald-100'
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  )
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
        <DocumentTextIcon className="mt-0.5 size-6 shrink-0 text-emerald-400/90" aria-hidden />
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
            <tr className="border-b border-zinc-700 bg-zinc-900/80 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              <th scope="col" className="px-3 py-2.5">
                {t.colLand}
              </th>
              <th scope="col" className="px-3 py-2.5">
                {t.colOfficialLicense}
              </th>
              <th scope="col" className="px-3 py-2.5">
                {t.colOsmCompatible}
              </th>
              <th scope="col" className="px-3 py-2.5">
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
                  className="border-b border-zinc-800/90 odd:bg-zinc-950/30 hover:bg-zinc-800/20"
                >
                  <th
                    scope="row"
                    title={name}
                    className="whitespace-nowrap px-3 py-2 font-medium text-zinc-200"
                  >
                    <span className="text-zinc-500">{code}</span>{' '}
                    <span className="sr-only">{name}</span>
                    <span className="hidden sm:inline">{name}</span>
                  </th>
                  <td className="max-w-[14rem] px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      <div>
                        <span className="break-words text-zinc-300">
                          {row.officialLicense === 'unknown'
                            ? t.unknownLicense
                            : row.officialLicense}
                        </span>
                        {row.likelyNote ? (
                          <span className="mt-1 block text-xs italic text-zinc-500">
                            {row.likelyNote}
                          </span>
                        ) : null}
                      </div>
                      <a
                        href={row.officialSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-400/90 underline decoration-emerald-600/40 hover:text-emerald-300"
                      >
                        {t.sourceLinkLabel}
                      </a>
                    </div>
                  </td>
                  <td className="max-w-[11rem] px-3 py-2 align-top">
                    <div className="flex flex-col gap-1">
                      <OsmCompatibleBadge value={row.osmCompatible} />
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
                  <td className="max-w-[9rem] px-3 py-2 align-top text-xs leading-snug text-zinc-500">
                    {row.lastCheckedAt && row.lastCheckedByGithub ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="break-words">
                          {t.checkedDateLine.replace('{date}', row.lastCheckedAt)}
                        </span>
                        <span className="break-all">
                          {t.checkedGithubLine.replace('{user}', row.lastCheckedByGithub)}
                        </span>
                      </div>
                    ) : row.lastCheckedAt ? (
                      <span className="break-words">
                        {t.checkedDateOnly.replace('{date}', row.lastCheckedAt)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
