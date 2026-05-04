import { de } from '../i18n/de'
import { cn } from '../lib/cn'
import { formatDurationMs } from '../lib/formatDuration'
import { GITHUB_ACTIONS_URL } from '../lib/githubRepo'
import type { PipelineRunContextKnown, PipelineSourceModeReasonKnown } from '../lib/schemas'
import {
  nationalPipelineMetaQueryOptions,
  runsQueryOptions,
  summaryQueryOptions,
} from '../lib/sharedDatasetQueries'
import { StatusDateTime } from '../lib/statusDateTime'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const RUN_CONTEXT_LABELS: Record<PipelineRunContextKnown, string> = {
  refresh_scheduled_nightly: de.status.runContextScheduledNightly,
  refresh_manual_nightly: de.status.runContextManualNightly,
  refresh_scheduled_weekly_official: de.status.runContextScheduledWeeklyOfficial,
  refresh_scheduled_daily_reuse_official: de.status.runContextScheduledDailyReuse,
  refresh_scheduled_bootstrap_official: de.status.runContextScheduledBootstrap,
  refresh_manual_full: de.status.runContextManualFull,
  refresh_manual_osm_only: de.status.runContextManualOsmOnly,
  deploy_push_stored: de.status.runContextPushStored,
}

const SOURCE_MODE_REASON_LABELS: Record<PipelineSourceModeReasonKnown, string> = {
  scheduled_non_friday: de.status.sourceModeReasonScheduledNonFriday,
  manual_official_reuse: de.status.sourceModeReasonManualReuse,
  overpass_fetch_failed: de.status.sourceModeReasonOverpassFetchFailed,
}

function renderSourceMode(mode?: 'fresh' | 'reused' | 'failed') {
  if (mode === 'fresh') return de.status.sourceModeFresh
  if (mode === 'reused') return de.status.sourceModeReused
  if (mode === 'failed') return de.status.sourceModeFailed
  return null
}

function renderSourceModeReason(reason?: string) {
  if (!reason) return null
  return SOURCE_MODE_REASON_LABELS[reason as PipelineSourceModeReasonKnown] ?? null
}

function renderRunContext(runContext?: string) {
  if (!runContext) return de.status.runContextUnknown
  return RUN_CONTEXT_LABELS[runContext as PipelineRunContextKnown] ?? de.status.runContextUnknown
}

function isDefaultRunContext(runContext?: string) {
  return !runContext || runContext === 'refresh_scheduled_nightly'
}

function statusBadgeClasses(ok: boolean) {
  return cn(
    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
    ok ? 'bg-emerald-900/50 text-emerald-100' : 'bg-red-950/60 text-red-200',
  )
}

function renderKpiTimestampOrMissing(value?: string, tone?: 'sky' | 'emerald' | 'violet') {
  const toneDateClass =
    tone === 'sky' ? 'text-sky-400' : tone === 'emerald' ? 'text-emerald-400' : 'text-violet-400'
  if (!value) {
    return <p className="text-sm text-zinc-500">{de.status.timestampMissing}</p>
  }
  return (
    <StatusDateTime
      value={value}
      variant="kpi"
      className="w-full"
      dateClassName={toneDateClass}
      timeClassName="text-zinc-500"
      relativeClassName="text-zinc-500"
    />
  )
}

function renderTechnicalTimestampOrMissing(value?: string) {
  if (!value) {
    return <p className="text-xs text-zinc-500">{de.status.timestampMissing}</p>
  }
  return (
    <StatusDateTime value={value} className="text-zinc-300" relativeClassName="text-zinc-500" />
  )
}

function DetailRow({
  label,
  children,
  labelClassName,
}: {
  label: ReactNode
  children: ReactNode
  labelClassName?: string
}) {
  return (
    <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
      <dt className={cn('text-sm font-medium text-zinc-100', labelClassName)}>{label}</dt>
      <dd className="mt-1 text-sm text-zinc-300 sm:col-span-2 sm:mt-0">{children}</dd>
    </div>
  )
}

function DetailBox({
  title,
  subtitle,
  headerRight,
  children,
}: {
  title: ReactNode
  subtitle?: ReactNode
  headerRight?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900/40">
      <div className="px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
          {headerRight}
        </div>
        {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
      </div>
      <div className="border-t border-zinc-700">
        <dl className="divide-y divide-zinc-700">{children}</dl>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  note,
  tone,
}: {
  title: string
  value?: string
  note: string
  tone: 'sky' | 'emerald' | 'violet'
}) {
  const toneClasses = {
    sky: {
      footerBg: 'bg-sky-950/20',
      footerBorder: 'border-sky-900/40',
      border: 'border-sky-900/30',
    },
    emerald: {
      footerBg: 'bg-emerald-950/20',
      footerBorder: 'border-emerald-900/40',
      border: 'border-emerald-900/30',
    },
    violet: {
      footerBg: 'bg-violet-950/20',
      footerBorder: 'border-violet-900/40',
      border: 'border-violet-900/30',
    },
  }[tone]

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-lg border bg-zinc-900/40',
        toneClasses.border,
      )}
    >
      <div className="min-w-0 flex-1 px-4 pt-4 sm:px-5">
        <p className="truncate text-base font-normal text-zinc-100">{title}</p>
        <div className="mt-2">{renderKpiTimestampOrMissing(value, tone)}</div>
      </div>
      <div
        className={cn(
          'mt-4 border-t px-4 py-2.5 text-xs text-zinc-400 sm:px-5',
          toneClasses.footerBg,
          toneClasses.footerBorder,
        )}
      >
        {note}
      </div>
    </article>
  )
}

export function StatusPage() {
  const runsQ = useQuery(runsQueryOptions())
  const summaryQ = useQuery(summaryQueryOptions())
  const metaQ = useQuery(nationalPipelineMetaQueryOptions())
  const latestRun = runsQ.data ? [...runsQ.data.runs].reverse()[0] : null
  const osmMeta = metaQ.data?.osm.present ? metaQ.data.osm.data : null
  const officialMeta = metaQ.data?.jedeschule.present ? metaQ.data.jedeschule.data : null
  const osmKpiDate =
    osmMeta?.ok === true
      ? (osmMeta.overpassResponseTimestamp ?? osmMeta.generatedAt)
      : osmMeta?.generatedAt
  const officialKpiDate = officialMeta?.csvMaxUpdateTimestamp ?? officialMeta?.generatedAt

  return (
    <div className="mx-auto max-w-4xl p-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-semibold text-zinc-100">{de.status.heading}</h1>
        <a
          href={GITHUB_ACTIONS_URL}
          className="shrink-0 text-sm font-medium text-emerald-300 underline decoration-emerald-300/30 underline-offset-2 hover:decoration-emerald-400"
          target="_blank"
          rel="noreferrer"
        >
          {de.status.githubActionsLink}
        </a>
      </div>

      <section className="mt-8" aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="text-lg font-medium text-zinc-100">
          {de.status.kpiHeading}
        </h2>
        {(metaQ.isLoading || summaryQ.isLoading) && (
          <p className="mt-3 text-sm text-zinc-400">{de.status.loading}</p>
        )}
        {metaQ.isError && summaryQ.isError && (
          <p className="mt-3 text-sm text-amber-200">{de.status.kpiError}</p>
        )}
        {metaQ.isSuccess || summaryQ.isSuccess ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <KpiCard
                title={de.status.kpiOsmDataDate}
                value={osmKpiDate}
                note={de.status.kpiOsmDataDateHint}
                tone="sky"
              />
              <KpiCard
                title={de.status.kpiJedeschuleDataDate}
                value={officialKpiDate}
                note={de.status.kpiJedeschuleDataDateHint}
                tone="emerald"
              />
              <KpiCard
                title={de.status.kpiCompareDate}
                value={summaryQ.data?.generatedAt}
                note={de.status.kpiCompareDateHint}
                tone="violet"
              />
            </div>
            {latestRun?.matchSkipped ? (
              <p className="mt-3 rounded-md border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
                {de.status.kpiMatchSkippedHint}
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="mt-8">
        {metaQ.isLoading && <p className="mt-3 text-sm text-zinc-400">{de.status.loading}</p>}
        {metaQ.isError && (
          <p className="mt-3 text-sm text-amber-200">{de.status.nationalMetaError}</p>
        )}
        {metaQ.isSuccess ? (
          <details className="mt-4 text-xs text-zinc-400">
            <summary className="cursor-pointer hover:underline">
              {de.status.technicalHeading}
            </summary>
            <div className="mt-3 space-y-4">
              <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900/40">
                <div className="px-4 py-4 sm:px-6">
                  <h3 className="text-base font-semibold text-zinc-100">
                    {de.status.sourceJedeschule}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">{de.status.technicalOfficialLead}</p>
                </div>
                {metaQ.data.jedeschule.present ? (
                  <div className="border-t border-zinc-700">
                    <dl className="divide-y divide-zinc-700">
                      <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-zinc-100">
                          {de.status.downloadOk}
                        </dt>
                        <dd className="mt-1 text-sm text-zinc-300 sm:col-span-2 sm:mt-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={statusBadgeClasses(metaQ.data.jedeschule.data.ok)}>
                              {metaQ.data.jedeschule.data.ok
                                ? de.status.downloadOk
                                : de.status.downloadFail}
                            </span>
                            {renderSourceMode(
                              latestRun?.downloads?.jedeschule.sourceMode ??
                                metaQ.data.jedeschule.data.sourceMode,
                            ) ? (
                              <span className="inline-flex rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-200">
                                {renderSourceMode(
                                  latestRun?.downloads?.jedeschule.sourceMode ??
                                    metaQ.data.jedeschule.data.sourceMode,
                                )}
                              </span>
                            ) : null}
                          </div>
                        </dd>
                      </div>
                      {renderSourceModeReason(
                        latestRun?.downloads?.jedeschule.sourceModeReason ??
                          metaQ.data.jedeschule.data.sourceModeReason,
                      ) ? (
                        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-zinc-100">
                            {de.status.runSectionContext}
                          </dt>
                          <dd className="mt-1 text-sm text-zinc-300 sm:col-span-2 sm:mt-0">
                            {renderSourceModeReason(
                              latestRun?.downloads?.jedeschule.sourceModeReason ??
                                metaQ.data.jedeschule.data.sourceModeReason,
                            )}
                          </dd>
                        </div>
                      ) : null}
                      <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-zinc-100">
                          {de.status.jedeschuleCsvMaxUpdate}
                        </dt>
                        <dd className="mt-1 text-sm text-zinc-300 sm:col-span-2 sm:mt-0">
                          {renderTechnicalTimestampOrMissing(
                            metaQ.data.jedeschule.data.csvMaxUpdateTimestamp,
                          )}
                          <p className="mt-1 text-xs text-zinc-500">
                            {de.status.technicalCsvMaxUpdateMeaning}
                          </p>
                        </dd>
                      </div>
                      <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-zinc-100">
                          {de.status.lastPullAt}
                        </dt>
                        <dd className="mt-1 text-sm text-zinc-300 sm:col-span-2 sm:mt-0">
                          {renderTechnicalTimestampOrMissing(
                            metaQ.data.jedeschule.data.generatedAt,
                          )}
                          <p className="mt-1 text-xs text-zinc-500">
                            {de.status.technicalGeneratedAtMeaning}
                          </p>
                        </dd>
                      </div>
                      {metaQ.data.jedeschule.data.httpLastModified ? (
                        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-zinc-100">
                            {de.status.jedeschuleHttpLastModified}
                          </dt>
                          <dd className="mt-1 text-sm text-zinc-300 sm:col-span-2 sm:mt-0">
                            <StatusDateTime
                              value={metaQ.data.jedeschule.data.httpLastModified}
                              className="text-zinc-300"
                            />
                            <p className="mt-1 text-xs text-zinc-500">
                              {de.status.technicalHttpLastModifiedMeaning}
                            </p>
                          </dd>
                        </div>
                      ) : null}
                      {metaQ.data.jedeschule.data.upstreamDatasetChanged !== undefined ? (
                        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-zinc-100">
                            {metaQ.data.jedeschule.data.upstreamDatasetChanged
                              ? de.status.jedeschuleUpstreamChanged
                              : de.status.jedeschuleUpstreamSame}
                          </dt>
                          <dd className="mt-1 text-sm text-zinc-300 sm:col-span-2 sm:mt-0">
                            <p className="text-xs text-zinc-500">
                              {de.status.technicalUpstreamChangeMeaning}
                            </p>
                          </dd>
                        </div>
                      ) : null}
                      {metaQ.data.jedeschule.data.errorMessage ? (
                        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-amber-100">
                            {de.status.technicalErrorMeaning}
                          </dt>
                          <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                            <pre className="max-h-24 overflow-auto rounded bg-zinc-900 p-1.5 text-xs text-zinc-200">
                              {metaQ.data.jedeschule.data.errorMessage}
                            </pre>
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                ) : (
                  <div className="border-t border-zinc-700 px-4 py-4 text-sm text-zinc-400 sm:px-6">
                    {de.status.nationalMetaMissing}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900/40">
                <div className="px-4 py-4 sm:px-6">
                  <h3 className="text-base font-semibold text-zinc-100">{de.status.sourceOsmDe}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{de.status.technicalOsmLead}</p>
                </div>
                {metaQ.data.osm.present ? (
                  <div className="border-t border-zinc-700">
                    <dl className="divide-y divide-zinc-700">
                      <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-zinc-100">
                          {de.status.downloadOk}
                        </dt>
                        <dd className="mt-1 text-sm text-zinc-300 sm:col-span-2 sm:mt-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={statusBadgeClasses(metaQ.data.osm.data.ok)}>
                              {metaQ.data.osm.data.ok
                                ? de.status.downloadOk
                                : de.status.downloadFail}
                            </span>
                            {renderSourceMode(
                              latestRun?.downloads?.osm.sourceMode ??
                                metaQ.data.osm.data.sourceMode,
                            ) ? (
                              <span className="inline-flex rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-200">
                                {renderSourceMode(
                                  latestRun?.downloads?.osm.sourceMode ??
                                    metaQ.data.osm.data.sourceMode,
                                )}
                              </span>
                            ) : null}
                          </div>
                        </dd>
                      </div>
                      {renderSourceModeReason(
                        latestRun?.downloads?.osm.sourceModeReason ??
                          metaQ.data.osm.data.sourceModeReason,
                      ) ? (
                        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-zinc-100">
                            {de.status.runSectionContext}
                          </dt>
                          <dd className="mt-1 text-sm text-zinc-300 sm:col-span-2 sm:mt-0">
                            {renderSourceModeReason(
                              latestRun?.downloads?.osm.sourceModeReason ??
                                metaQ.data.osm.data.sourceModeReason,
                            )}
                          </dd>
                        </div>
                      ) : null}
                      <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-zinc-100">
                          {de.status.osmSnapshotAt}
                        </dt>
                        <dd className="mt-1 text-sm text-zinc-300 sm:col-span-2 sm:mt-0">
                          {renderTechnicalTimestampOrMissing(
                            metaQ.data.osm.data.overpassResponseTimestamp,
                          )}
                          <p className="mt-1 text-xs text-zinc-500">
                            {de.status.technicalOsmSnapshotMeaning}
                          </p>
                        </dd>
                      </div>
                      <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-zinc-100">
                          {de.status.lastPullAt}
                        </dt>
                        <dd className="mt-1 text-sm text-zinc-300 sm:col-span-2 sm:mt-0">
                          {renderTechnicalTimestampOrMissing(metaQ.data.osm.data.generatedAt)}
                          <p className="mt-1 text-xs text-zinc-500">
                            {de.status.technicalGeneratedAtMeaning}
                          </p>
                        </dd>
                      </div>
                      {metaQ.data.osm.data.errorMessage ? (
                        <div className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                          <dt className="text-sm font-medium text-amber-100">
                            {de.status.technicalErrorMeaning}
                          </dt>
                          <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                            <pre className="max-h-24 overflow-auto rounded bg-zinc-900 p-1.5 text-xs text-zinc-200">
                              {metaQ.data.osm.data.errorMessage}
                            </pre>
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                ) : (
                  <div className="border-t border-zinc-700 px-4 py-4 text-sm text-zinc-400 sm:px-6">
                    {de.status.nationalMetaMissing}
                  </div>
                )}
              </div>
            </div>
          </details>
        ) : null}
      </section>

      <h2 className="mt-10 text-lg font-medium text-zinc-100">{de.status.runHistoryHeading}</h2>

      {runsQ.isLoading && <p className="mt-4 text-zinc-400">{de.status.loading}</p>}
      {runsQ.isError && <p className="mt-4 text-amber-200">{de.status.error}</p>}

      {runsQ.isSuccess && (
        <>
          {runsQ.data.droppedRuns > 0 ? (
            <div className="mt-4 space-y-1 rounded-md border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
              <p>
                {de.status.runsDroppedWarning.replace('{count}', String(runsQ.data.droppedRuns))}
              </p>
              <p>
                {de.status.runsDroppedDiagnostics
                  .replace('{parseErrors}', String(runsQ.data.droppedRunDiagnostics.parseErrors))
                  .replace(
                    '{schemaMismatches}',
                    String(runsQ.data.droppedRunDiagnostics.schemaMismatches),
                  )}
              </p>
            </div>
          ) : null}
          <ul className="mt-4 space-y-3">
            {[...runsQ.data.runs].reverse().map((run) => {
              const runDownloads = run.downloads
              return (
                <li
                  key={`${run.startedAt}-${run.finishedAt}-${run.durationMs}-${run.gitSha ?? ''}`}
                >
                  <DetailBox
                    title={de.status.runCardHeading}
                    headerRight={
                      <div className="flex items-center gap-2">
                        {run.gitSha ? (
                          <span className="text-xs text-zinc-500">
                            {de.status.gitSha}: <span className="font-mono">{run.gitSha}</span>
                          </span>
                        ) : null}
                        <span className={statusBadgeClasses(run.overallOk)}>
                          {run.overallOk ? de.status.okBadgeOk : de.status.okBadgeFail}
                        </span>
                      </div>
                    }
                  >
                    <DetailRow label={de.status.runSectionWhen}>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="shrink-0 text-zinc-500">{de.status.started}:</span>
                          <StatusDateTime
                            value={run.startedAt}
                            variant="inline"
                            className="min-w-0 text-zinc-300"
                          />
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="shrink-0 text-zinc-500">{de.status.finished}:</span>
                          <StatusDateTime
                            value={run.finishedAt}
                            variant="inline"
                            className="min-w-0 text-zinc-300"
                          />
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="shrink-0 text-zinc-500">{de.status.duration}:</span>
                          <span className="text-zinc-200">{formatDurationMs(run.durationMs)}</span>
                        </div>
                      </div>
                    </DetailRow>

                    <DetailRow label={de.status.runSectionDownloads}>
                      {runDownloads ? (
                        <div className="space-y-2 text-sm text-zinc-300">
                          <div>
                            <p className="font-medium text-zinc-300">
                              {de.status.sourceJedeschule}
                            </p>
                            <p>
                              {runDownloads.jedeschule.ok
                                ? de.status.downloadOk
                                : de.status.downloadFail}
                              {runDownloads.jedeschule.sourceMode
                                ? ` (${renderSourceMode(runDownloads.jedeschule.sourceMode)})`
                                : ''}
                            </p>
                            {runDownloads.jedeschule.generatedAt ? (
                              <StatusDateTime
                                value={runDownloads.jedeschule.generatedAt}
                                variant="inline"
                                className="mt-1 text-zinc-300"
                              />
                            ) : null}
                            {runDownloads.jedeschule.sourceModeReason ? (
                              <p className="mt-1">
                                {renderSourceModeReason(runDownloads.jedeschule.sourceModeReason)}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-300">{de.status.sourceOsmDe}</p>
                            <p>
                              {runDownloads.osm.ok ? de.status.downloadOk : de.status.downloadFail}
                              {runDownloads.osm.sourceMode
                                ? ` (${renderSourceMode(runDownloads.osm.sourceMode)})`
                                : ''}
                            </p>
                            {runDownloads.osm.generatedAt ? (
                              <StatusDateTime
                                value={runDownloads.osm.generatedAt}
                                variant="inline"
                                className="mt-1 text-zinc-300"
                              />
                            ) : null}
                            {runDownloads.osm.sourceModeReason ? (
                              <p className="mt-1">
                                {renderSourceModeReason(runDownloads.osm.sourceModeReason)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">{de.status.runDownloadsMissing}</p>
                      )}
                    </DetailRow>

                    <DetailRow label={de.status.runSectionCompare}>
                      {run.matchSkipped ? (
                        <p className="rounded-md border border-amber-800/60 bg-amber-950/30 px-2 py-1.5 text-sm text-amber-100">
                          <span className="font-medium">{de.status.matchSkipped}.</span>{' '}
                          {run.matchSkipReason ?? ''}
                        </p>
                      ) : run.states.length > 0 ? (
                        <p className="text-sm text-zinc-300">{de.status.matchRan}</p>
                      ) : run.errors.length > 0 ? (
                        <p className="text-sm text-amber-200">
                          {de.status.matchNotRunMissingInputs}
                        </p>
                      ) : null}
                    </DetailRow>

                    <DetailRow label={de.status.runSectionContext}>
                      <p className="text-sm text-zinc-300">{renderRunContext(run.runContext)}</p>
                      {isDefaultRunContext(run.runContext) ? (
                        <p className="text-sm text-zinc-500">{de.status.runContextDefaultHint}</p>
                      ) : null}
                    </DetailRow>

                    {run.errors.length > 0 ? (
                      <DetailRow
                        label={de.status.errorPayloadSummary}
                        labelClassName="text-amber-100"
                      >
                        <pre className="max-h-32 overflow-auto rounded bg-zinc-900 p-1.5 text-xs text-zinc-200">
                          {run.errors.join('\n')}
                        </pre>
                      </DetailRow>
                    ) : null}
                  </DetailBox>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
