import { de } from '../../i18n/de'

export function HomeHeader() {
  return (
    <header className="mb-8 border-b border-zinc-700 pb-6">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-100">{de.home.heading}</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {de.home.leadIntro}
        <a
          href={de.home.links.jedeschule.href}
          className="font-medium text-emerald-300 underline decoration-emerald-300/30 underline-offset-2 hover:decoration-emerald-400"
          target="_blank"
          rel="noreferrer"
        >
          {de.home.links.jedeschule.label}
        </a>
        {de.home.leadBetween}
        <a
          href={de.home.links.osmSchoolTag.href}
          className="font-medium text-emerald-300 underline decoration-emerald-300/30 underline-offset-2 hover:decoration-emerald-400"
          target="_blank"
          rel="noreferrer"
        >
          {de.home.links.osmSchoolTag.label}
        </a>
        {de.home.leadOutro}
      </p>
    </header>
  )
}
