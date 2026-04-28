import { de } from '../i18n/de'
import { githubCommitUrlOnDefaultBranch } from '../lib/githubRepo'
import { changelogQueryOptions } from '../lib/sharedDatasetQueries'
import { useQuery } from '@tanstack/react-query'
import { ChangelogList } from '@tordans/changelog-kit'

export function ChangelogPage() {
  const q = useQuery({
    ...changelogQueryOptions(),
    retry: 1,
  })

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-16">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-100">
          {de.changelog.heading}
        </h1>
      </header>

      {q.isLoading && <p className="text-zinc-400">{de.changelog.loading}</p>}
      {q.isError && <p className="text-amber-200">{de.changelog.error}</p>}
      {q.isSuccess && (
        <ChangelogList
          className="mt-4"
          data={q.data}
          labels={{ empty: de.changelog.empty }}
          commitUrl={githubCommitUrlOnDefaultBranch}
        />
      )}
    </div>
  )
}
