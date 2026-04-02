/** Shared top-left hover card for MapLibre school-point previews (detail map + land overview). */
export function MapPointHoverPanel({ name, categoryLine }: { name: string; categoryLine: string }) {
  return (
    <div
      className="pointer-events-none absolute left-2 top-2 z-10 max-w-[min(16rem,calc(100%-1rem))] rounded-md border border-zinc-600 bg-zinc-900 px-2.5 py-1.5 font-sans shadow-md"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium leading-snug text-zinc-50">{name}</p>
      <p className="mt-0.5 text-xs leading-snug text-zinc-400">{categoryLine}</p>
    </div>
  )
}
