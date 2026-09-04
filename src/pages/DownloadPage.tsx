import { CategoryLegendSwatch } from '../components/CategoryLegendSwatch'
import { HomeOfficialSourcesSection } from '../components/home/HomeOfficialSourcesSection'
import { de } from '../i18n/de'
import { formatDeInteger } from '../lib/formatNumber'
import { JEDESCHULE_WEEKLY_CSV_URL } from '../lib/jedeschuleUrls'
import { germanyMatchesCsvUrl } from '../lib/paths'
import {
  SCHOOLS_MATCH_CSV_COLUMNS,
  SCHOOLS_MATCH_CSV_DOWNLOAD_FILE_NAME,
} from '../lib/schoolsMatchCsv'
import { summaryQueryOptions } from '../lib/sharedDatasetQueries'
import { STATE_MATCH_CATEGORIES } from '../lib/stateMatchCategories'
import { StatusDateTime } from '../lib/statusDateTime'
import { ExclamationTriangleIcon } from '@heroicons/react/20/solid'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

const sectionLeadClass = 'mt-2 text-sm leading-relaxed text-zinc-400'
const headingClass = 'text-lg font-semibold text-zinc-100'
const bodyLinkClass =
  'font-medium text-emerald-400/90 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-300'
const csvButtonClass =
  'inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400'

function germanyRowCount(
  states: Array<{
    counts: {
      matched: number
      official_only: number
      osm_only: number
      ambiguous: number
      official_no_coord: number
    }
  }>,
) {
  return states.reduce((sum, s) => {
    return (
      sum +
      s.counts.matched +
      s.counts.official_only +
      s.counts.osm_only +
      s.counts.ambiguous +
      s.counts.official_no_coord
    )
  }, 0)
}

export function DownloadPage() {
  const t = de.download
  const q = useQuery({
    ...summaryQueryOptions(),
    retry: 1,
  })
  const rowCount = q.data?.states ? germanyRowCount(q.data.states) : null

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-100">{t.heading}</h1>
        <p className={sectionLeadClass}>{t.lead}</p>
      </header>

      <section className="mt-10" aria-labelledby="download-files-heading">
        <h2 id="download-files-heading" className={headingClass}>
          {t.filesHeading}
        </h2>
        <p className={sectionLeadClass}>{t.filesLead}</p>
        {q.isLoading && <p className="mt-3 text-sm text-zinc-400">{t.loading}</p>}
        {q.isError && <p className="mt-3 text-sm text-amber-200">{t.error}</p>}
        {q.data?.generatedAt ? (
          <p className="mt-2 text-sm text-zinc-500">
            {t.filesSnapshot}
            {': '}
            <StatusDateTime value={q.data.generatedAt} variant="inline" />
            {rowCount != null ? (
              <>
                {' · '}
                {t.filesRows}
                {': '}
                <span className="tabular-nums">{formatDeInteger(rowCount)}</span>
              </>
            ) : null}
          </p>
        ) : null}
        <p className="mt-4">
          <a
            href={germanyMatchesCsvUrl()}
            download={SCHOOLS_MATCH_CSV_DOWNLOAD_FILE_NAME}
            className={csvButtonClass}
          >
            {t.csvLink}
          </a>
        </p>
      </section>

      <section className="mt-10" aria-labelledby="download-jedeschule-heading">
        <h2 id="download-jedeschule-heading" className={headingClass}>
          {t.jedeschuleHeading}
        </h2>
        <p className={sectionLeadClass}>{t.jedeschuleLead}</p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <a
            href={JEDESCHULE_WEEKLY_CSV_URL}
            className={bodyLinkClass}
            target="_blank"
            rel="noreferrer"
          >
            {t.jedeschuleCsvLabel}
          </a>
          <a
            href={de.home.links.jedeschule.href}
            className={bodyLinkClass}
            target="_blank"
            rel="noreferrer"
          >
            {t.jedeschuleAboutLabel}
          </a>
        </p>
      </section>

      <section className="mt-10" aria-labelledby="download-licence-heading">
        <h2 id="download-licence-heading" className={headingClass}>
          {t.licenceHeading}
        </h2>
        <div
          className="mt-4 rounded-md bg-amber-500/10 p-4 outline outline-amber-500/25"
          role="status"
          aria-labelledby="download-licence-callout-title"
        >
          <div className="flex">
            <ExclamationTriangleIcon aria-hidden className="size-5 shrink-0 text-amber-400" />
            <div className="ml-3 min-w-0">
              <h3
                id="download-licence-callout-title"
                className="text-sm font-medium text-amber-100"
              >
                {t.licenceCalloutTitle}
              </h3>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-amber-100/85">
                <p>
                  {t.licenceCalloutLeadBeforeOdbl}
                  <a
                    href={de.footer.osmLinkHref}
                    className="font-medium text-amber-200 underline decoration-amber-500/50 hover:text-amber-50"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.licenceCalloutOdblLink}
                  </a>
                  {t.licenceCalloutLeadAfterOdbl}
                </p>
                <p>
                  {t.licenceCalloutCompatBefore}
                  <Link
                    to="/download"
                    hash="official-sources-heading"
                    className="font-medium text-amber-200 underline decoration-amber-500/50 hover:text-amber-50"
                  >
                    {t.licenceCalloutCompatLink}
                  </Link>
                  {t.licenceCalloutCompatAfter}
                </p>
                <p>{t.licenceCalloutPurpose}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeOfficialSourcesSection />

      <section className="mt-10" aria-labelledby="download-category-legend-heading">
        <h2 id="download-category-legend-heading" className={headingClass}>
          {t.categoryLegendHeading}
        </h2>
        <ul className="mt-3 space-y-3">
          {STATE_MATCH_CATEGORIES.map((cat) => (
            <li key={cat} className="flex gap-3 text-sm leading-relaxed text-zinc-400">
              <CategoryLegendSwatch category={cat} />
              <span>
                <code className="text-zinc-200">{cat}</code>
                {' – '}
                <span className="font-medium text-zinc-300">{de.state.categoryLabel[cat]}</span>
                {'. '}
                {t.categoryHelp[cat]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="download-legend-heading">
        <h2 id="download-legend-heading" className={headingClass}>
          {t.legendHeading}
        </h2>
        <p className={sectionLeadClass}>{t.legendLead}</p>
        <h3 className="mt-5 text-sm font-semibold text-zinc-200">{t.formatHeading}</h3>
        <p className={sectionLeadClass}>{t.formatLead}</p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-700/60">
          <table className="min-w-full border-collapse text-left text-sm text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-900/80 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                <th scope="col" className="px-3 py-2.5">
                  {t.legendColHeader}
                </th>
                <th scope="col" className="px-3 py-2.5">
                  {t.legendColMeaning}
                </th>
              </tr>
            </thead>
            <tbody>
              {SCHOOLS_MATCH_CSV_COLUMNS.map((col) => (
                <tr key={col.header} className="border-b border-zinc-800/90 odd:bg-zinc-950/30">
                  <th scope="row" className="px-3 py-2 font-mono text-xs font-medium text-zinc-200">
                    {col.header}
                  </th>
                  <td className="px-3 py-2 text-zinc-400">{col.descriptionDe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
