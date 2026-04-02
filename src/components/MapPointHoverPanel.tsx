/** Shared top-left hover card for MapLibre school-point previews (detail map + land overview). */
export function MapPointHoverPanel({
  entries,
}: {
  entries: ReadonlyArray<{ name: string; categoryLine: string }>
}) {
  if (entries.length === 0) return null
  return (
    <div
      className="pointer-events-none absolute left-2 top-2 z-10 max-h-[min(70vh,calc(100%-1rem))] max-w-[min(18rem,calc(100%-1rem))] overflow-y-auto rounded-md border border-zinc-600 bg-zinc-900 px-2.5 py-1.5 font-sans shadow-md"
      role="status"
      aria-live="polite"
    >
      {entries.map((entry, i) => (
        <div key={i} className={i > 0 ? 'mt-2 border-t border-zinc-700 pt-2' : ''}>
          <p className="text-sm font-medium leading-snug text-zinc-50">{entry.name}</p>
          <p className="mt-0.5 text-xs leading-snug text-zinc-400">{entry.categoryLine}</p>
        </div>
      ))}
    </div>
  )
}
