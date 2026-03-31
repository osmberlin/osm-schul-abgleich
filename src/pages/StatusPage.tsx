import { useQuery } from '@tanstack/react-query'
import { PageBreadcrumb } from '../components/PageBreadcrumb'
import { de } from '../i18n/de'
import { cn } from '../lib/cn'
import { formatDurationMs } from '../lib/formatDuration'
import { nationalOfficialMetaUrl, nationalOsmMetaUrl, runsJsonUrl } from '../lib/paths'
import { type PipelineSourceMeta, pipelineSourceMetaSchema, runsFileSchema } from '../lib/schemas'

async function fetchNationalMeta(
  url: string,
): Promise<{ present: false } | { present: true; data: PipelineSourceMeta }> {
  const r = await fetch(url)
  if (!r.ok) return { present: false }
  const parsed = pipelineSourceMetaSchema.safeParse(await r.json())
  if (!parsed.success) return { present: false }
  return { present: true, data: parsed.data }
}

function SourceMetaCard({
  title,
  result,
}: {
  title: string
  result: { present: false } | { present: true; data: PipelineSourceMeta }
}) {
  if (!result.present) {
    return (
      <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{de.status.nationalMetaMissing}</p>
      </div>
    )
  }
  const { data } = result
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{title}</p>
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
            data.ok
              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100'
              : 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200',
          )}
        >
          {data.ok ? de.status.downloadOk : de.status.downloadFail}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        {de.status.refreshedAt}:{' '}
        {new Date(data.generatedAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
      </p>
      {data.pipelineStep === 'pipeline:download:jedeschule' && data.httpLastModified ? (
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          {de.status.jedeschuleHttpLastModified}: {data.httpLastModified}
        </p>
      ) : null}
      {data.pipelineStep === 'pipeline:download:jedeschule' && data.csvMaxUpdateTimestamp ? (
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          {de.status.jedeschuleCsvMaxUpdate}: {data.csvMaxUpdateTimestamp}
        </p>
      ) : null}
      {data.pipelineStep === 'pipeline:download:jedeschule' &&
      data.upstreamDatasetChanged !== undefined ? (
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          {data.upstreamDatasetChanged
            ? de.status.jedeschuleUpstreamChanged
            : de.status.jedeschuleUpstreamSame}
        </p>
      ) : null}
      {data.errorMessage ? (
        <pre className="mt-1.5 max-h-24 overflow-auto rounded bg-zinc-100 p-1.5 text-xs dark:bg-zinc-900">
          {data.errorMessage}
        </pre>
      ) : null}
    </div>
  )
}

export function StatusPage() {
  const runsQ = useQuery({
    queryKey: ['runs'],
    queryFn: async () => {
      const r = await fetch(runsJsonUrl())
      if (!r.ok) throw new Error(String(r.status))
      return runsFileSchema.parse(await r.json())
    },
  })

  const metaQ = useQuery({
    queryKey: ['national-pipeline-meta'],
    queryFn: async () => {
      const [jedeschule, osm] = await Promise.all([
        fetchNationalMeta(nationalOfficialMetaUrl()),
        fetchNationalMeta(nationalOsmMetaUrl()),
      ])
      return { jedeschule, osm }
    },
  })

  return (
    <div className="mx-auto max-w-4xl p-6 pb-16">
      <div className="mb-4">
        <PageBreadcrumb />
      </div>
      <h1 className="text-2xl font-semibold">{de.status.heading}</h1>

      <section className="mt-8" aria-labelledby="national-meta-heading">
        <h2
          id="national-meta-heading"
          className="text-lg font-medium text-zinc-900 dark:text-zinc-100"
        >
          {de.status.nationalMetaHeading}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {de.status.nationalMetaLead}
        </p>
        {metaQ.isLoading && <p className="mt-3 text-sm text-zinc-500">{de.status.loading}</p>}
        {metaQ.isError && (
          <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
            {de.status.nationalMetaError}
          </p>
        )}
        {metaQ.isSuccess && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SourceMetaCard title={de.status.sourceJedeschule} result={metaQ.data.jedeschule} />
            <SourceMetaCard title={de.status.sourceOsmDe} result={metaQ.data.osm} />
          </div>
        )}
      </section>

      <h2 className="mt-10 text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {de.status.runHistoryHeading}
      </h2>

      {runsQ.isLoading && <p className="mt-4 text-zinc-500">{de.status.loading}</p>}
      {runsQ.isError && <p className="mt-4 text-amber-800">{de.status.error}</p>}

      {runsQ.isSuccess && (
        <ul className="mt-4 divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
          {[...runsQ.data.runs].reverse().map((run) => (
            <li
              key={`${run.startedAt}-${run.finishedAt}-${run.durationMs}-${run.gitSha ?? ''}`}
              className="px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="min-w-0">
                  {de.status.started}: {new Date(run.startedAt).toLocaleString('de-DE')}
                </span>
                <span className="text-zinc-500">·</span>
                <span>
                  {de.status.finished}: {new Date(run.finishedAt).toLocaleString('de-DE')}
                </span>
                <span className="text-zinc-500">·</span>
                <span>
                  {de.status.duration}: {formatDurationMs(run.durationMs)}
                </span>
                <span
                  className={cn(
                    'ml-auto inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    run.overallOk
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100'
                      : 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-200',
                  )}
                >
                  {run.overallOk ? de.status.okBadgeOk : de.status.okBadgeFail}
                </span>
              </div>

              {run.matchSkipped ? (
                <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                  <span className="font-medium">{de.status.matchSkipped}.</span>{' '}
                  {run.matchSkipReason ?? ''}
                </p>
              ) : run.lands.length > 0 ? (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {de.status.matchRan}
                </p>
              ) : run.errors.length > 0 ? (
                <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                  {de.status.matchNotRunMissingInputs}
                </p>
              ) : null}

              {run.downloads ? (
                <div className="mt-2 rounded-md bg-zinc-50 p-2 text-xs dark:bg-zinc-900/50">
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">
                    {de.status.runDownloads}
                  </p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-zinc-600 dark:text-zinc-400">
                    <li>
                      {de.status.sourceJedeschule}:{' '}
                      {run.downloads.jedeschule.ok ? de.status.downloadOk : de.status.downloadFail}
                      {run.downloads.jedeschule.generatedAt
                        ? ` — ${new Date(run.downloads.jedeschule.generatedAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`
                        : ''}
                    </li>
                    <li>
                      {de.status.sourceOsmDe}:{' '}
                      {run.downloads.osm.ok ? de.status.downloadOk : de.status.downloadFail}
                      {run.downloads.osm.generatedAt
                        ? ` — ${new Date(run.downloads.osm.generatedAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`
                        : ''}
                    </li>
                  </ul>
                </div>
              ) : null}

              {run.errors.length > 0 && (
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-zinc-100 p-1.5 text-xs dark:bg-zinc-900">
                  {run.errors.join('\n')}
                </pre>
              )}
              <details className="mt-2 text-xs text-zinc-500">
                <summary>{de.status.lands}</summary>
                <ul className="mt-1 list-inside list-disc">
                  {run.lands.map((l) => (
                    <li key={l.code}>
                      {l.code} — {l.osmSource ?? '?'}
                      {l.osmSnapshotAt ? ` (${l.osmSnapshotAt})` : ''}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
