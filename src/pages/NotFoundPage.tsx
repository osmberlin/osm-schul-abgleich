import { de } from '../i18n/de'
import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl items-center p-6">
      <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl shadow-black/20">
        <p className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          {de.notFound.badge}
        </p>
        <h1 className="mb-3 text-2xl font-semibold text-zinc-100">{de.notFound.title}</h1>
        <p className="mb-6 max-w-2xl text-zinc-300">{de.notFound.description}</p>
        <Link
          to="/"
          className="inline-flex items-center rounded-lg border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-800/50"
        >
          {de.notFound.homeCta}
        </Link>
      </div>
    </section>
  )
}
