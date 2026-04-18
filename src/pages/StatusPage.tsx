import { de } from '../i18n/de'
import { cn } from '../lib/cn'
import { formatDurationMs } from '../lib/formatDuration'
import type { PipelineSourceMeta } from '../lib/schemas'
import { nationalPipelineMetaQueryOptions, runsQueryOptions } from '../lib/sharedDatasetQueries'
import { useQuery } from '@tanstack/react-query'

type RunDownloadStatus = {
  ok: boolean
  generatedAt?: string
  sourceMode?: 'fresh' | 'reused' | 'failed'
  sourceModeReason?: string
}

function renderSourceMode(mode?: 'fresh' | 'reused' | 'failed') {
  if (mode === 'fresh') return de.status.sourceModeFresh
  if (mode === 'reused') return de.status.sourceModeReused
  if (mode === 'failed') return de.status.sourceModeFailed
  return null
}

function renderSourceModeReason(reason?: string) {
  switch (reason) {
    case 'scheduled_non_friday':
      return de.status.sourceModeReasonScheduledNonFriday
    case 'manual_official_reuse':
      return de.status.sourceModeReasonManualReuse
    default:
      return null
  }
}

function renderRunContext(runContext?: string) {
  switch (runContext) {
    case 'refresh_scheduled_nightly':
      return de.status.runContextScheduledNightly
    case 'refresh_manual_nightly':
      return de.status.runContextManualNightly
    // Legacy contexts kept for older run history entries.
    case 'refresh_scheduled_weekly_official':
      return de.status.runContextScheduledWeeklyOfficial
    case 'refresh_scheduled_daily_reuse_official':
      return de.status.runContextScheduledDailyReuse
    case 'refresh_scheduled_bootstrap_official':
      return de.status.runContextScheduledBootstrap
    case 'refresh_manual_full':
      return de.status.runContextManualFull
    case 'refresh_manual_osm_only':
      return de.status.runContextManualOsmOnly
    case 'deploy_push_stored':
      return de.status.runContextPushStored
    default:
      return de.status.runContextUnknown
  }
}

function SourceMetaCard({
  title,
  result,
  latestRunDownload,
}: {
  title: string
  result: { present: false } | { present: true; data: PipelineSourceMeta }
  latestRunDownload?: RunDownloadStatus
}) {
  if (!result.present) {
    return (
      <div className="rounded-lg border border-zinc-700 p-3">
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="mt-1 text-xs text-zinc-400">{de.status.nationalMetaMissing}</p>
      </div>
    )
  }
  const { data } = result
  const mode = latestRunDownload?.sourceMode ?? data.sourceMode
  const modeText = renderSourceMode(mode)
  const modeReason = renderSourceModeReason(
    latestRunDownload?.sourceModeReason ?? data.sourceModeReason,
  )
  const sourcePullAt = latestRunDownload?.generatedAt ?? data.generatedAt
  return (
    <div className="rounded-lg border border-zinc-700 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
            data.ok ? 'bg-emerald-900/50 text-emerald-100' : 'bg-red-950/60 text-red-200',
          )}
        >
          {data.ok ? de.status.downloadOk : de.status.downloadFail}
        </span>
        {modeText ? (
          <span className="inline-flex rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-200">
            {modeText}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        {de.status.lastPullAt}:{' '}
        {new Date(sourcePullAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
      </p>
      {modeReason ? <p className="mt-1 text-xs text-zinc-400">{modeReason}</p> : null}
      {data.pipelineStep === 'pipeline:download:jedeschule' && data.httpLastModified ? (
        <p className="mt-1 text-xs text-zinc-400">
          {de.status.jedeschuleHttpLastModified}: {data.httpLastModified}
        </p>
      ) : null}
      {data.pipelineStep === 'pipeline:download:jedeschule' && data.csvMaxUpdateTimestamp ? (
        <p className="mt-1 text-xs text-zinc-400">
          {de.status.jedeschuleCsvMaxUpdate}: {data.csvMaxUpdateTimestamp}
        </p>
      ) : null}
      {data.pipelineStep === 'pipeline:download:jedeschule' &&
      data.upstreamDatasetChanged !== undefined ? (
        <p className="mt-1 text-xs text-zinc-400">
          {data.upstreamDatasetChanged
            ? de.status.jedeschuleUpstreamChanged
            : de.status.jedeschuleUpstreamSame}
        </p>
      ) : null}
      {data.errorMessage ? (
        <pre className="mt-1.5 max-h-24 overflow-auto rounded bg-zinc-900 p-1.5 text-xs">
          {data.errorMessage}
        </pre>
      ) : null}
    </div>
  )
}

export function StatusPage() {
  const runsQ = useQuery(runsQueryOptions())

  const metaQ = useQuery(nationalPipelineMetaQueryOptions())
  const latestRun = runsQ.data ? [...runsQ.data.runs].reverse()[0] : null

  return (
    <div className="mx-auto max-w-4xl p-6 pb-16">
      <h1 className="text-2xl font-semibold text-zinc-100">{de.status.heading}</h1>

      <section className="mt-8" aria-labelledby="national-meta-heading">
        <h2 id="national-meta-heading" className="text-lg font-medium text-zinc-100">
          {de.status.nationalMetaHeading}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">{de.status.nationalMetaLead}</p>
        {metaQ.isLoading && <p className="mt-3 text-sm text-zinc-400">{de.status.loading}</p>}
        {metaQ.isError && (
          <p className="mt-3 text-sm text-amber-200">{de.status.nationalMetaError}</p>
        )}
        {metaQ.isSuccess && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SourceMetaCard
              title={de.status.sourceJedeschule}
              result={metaQ.data.jedeschule}
              latestRunDownload={latestRun?.downloads?.jedeschule}
            />
            <SourceMetaCard
              title={de.status.sourceOsmDe}
              result={metaQ.data.osm}
              latestRunDownload={latestRun?.downloads?.osm}
            />
          </div>
        )}
      </section>

      <h2 className="mt-10 text-lg font-medium text-zinc-100">{de.status.runHistoryHeading}</h2>

      {runsQ.isLoading && <p className="mt-4 text-zinc-400">{de.status.loading}</p>}
      {runsQ.isError && <p className="mt-4 text-amber-200">{de.status.error}</p>}

      {runsQ.isSuccess && (
        <>
          {runsQ.data.droppedRuns > 0 ? (
            <p className="mt-4 text-xs text-amber-200">
              {de.status.runsDroppedWarning.replace('{count}', String(runsQ.data.droppedRuns))}
            </p>
          ) : null}
          <ul className="mt-4 divide-y divide-zinc-700 overflow-hidden rounded-lg border border-zinc-700">
            {[...runsQ.data.runs].reverse().map((run) => (
              <li
                key={`${run.startedAt}-${run.finishedAt}-${run.durationMs}-${run.gitSha ?? ''}`}
                className="px-2.5 py-2.5 sm:px-3 sm:py-3"
              >
                <p className="text-xs text-zinc-400">{renderRunContext(run.runContext)}</p>
                <div className="flex flex-col items-start gap-1 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
                  <span className="min-w-0">
                    {de.status.started}: {new Date(run.startedAt).toLocaleString('de-DE')}
                  </span>
                  <span className="hidden text-zinc-400 sm:inline">·</span>
                  <span>
                    {de.status.finished}: {new Date(run.finishedAt).toLocaleString('de-DE')}
                  </span>
                  <span className="hidden text-zinc-400 sm:inline">·</span>
                  <span>
                    {de.status.duration}: {formatDurationMs(run.durationMs)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium sm:ml-auto',
                      run.overallOk
                        ? 'bg-emerald-900/50 text-emerald-100'
                        : 'bg-red-950/60 text-red-200',
                    )}
                  >
                    {run.overallOk ? de.status.okBadgeOk : de.status.okBadgeFail}
                  </span>
                </div>

                {run.matchSkipped ? (
                  <p className="mt-2 rounded-md bg-amber-950/40 px-2 py-1.5 text-xs text-amber-100">
                    <span className="font-medium">{de.status.matchSkipped}.</span>{' '}
                    {run.matchSkipReason ?? ''}
                  </p>
                ) : run.states.length > 0 ? (
                  <p className="mt-2 text-xs text-zinc-400">{de.status.matchRan}</p>
                ) : run.errors.length > 0 ? (
                  <p className="mt-2 text-xs text-amber-200">
                    {de.status.matchNotRunMissingInputs}
                  </p>
                ) : null}

                {run.downloads ? (
                  <div className="mt-2 rounded-md bg-zinc-900/50 p-2 text-xs">
                    <p className="font-medium text-zinc-200">{de.status.runDownloads}</p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-zinc-400">
                      <li>
                        {de.status.sourceJedeschule}:{' '}
                        {run.downloads.jedeschule.ok
                          ? de.status.downloadOk
                          : de.status.downloadFail}
                        {run.downloads.jedeschule.sourceMode
                          ? ` (${renderSourceMode(run.downloads.jedeschule.sourceMode)})`
                          : ''}
                        {run.downloads.jedeschule.generatedAt
                          ? ` — ${new Date(run.downloads.jedeschule.generatedAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`
                          : ''}
                      </li>
                      <li>
                        {de.status.sourceOsmDe}:{' '}
                        {run.downloads.osm.ok ? de.status.downloadOk : de.status.downloadFail}
                        {run.downloads.osm.sourceMode
                          ? ` (${renderSourceMode(run.downloads.osm.sourceMode)})`
                          : ''}
                        {run.downloads.osm.generatedAt
                          ? ` — ${new Date(run.downloads.osm.generatedAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`
                          : ''}
                      </li>
                    </ul>
                  </div>
                ) : null}

                {run.errors.length > 0 && (
                  <pre className="mt-2 max-h-32 overflow-auto rounded bg-zinc-900 p-1.5 text-xs">
                    {run.errors.join('\n')}
                  </pre>
                )}
                <details className="mt-2 text-xs text-zinc-400">
                  <summary>{de.status.states}</summary>
                  <ul className="mt-1 list-inside list-disc">
                    {run.states.map((l) => (
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
        </>
      )}
    </div>
  )
}
