import { de } from '../i18n/de'
import { parseOsmIdInput } from '../lib/parseOsmIdInput'
import { AppModal } from './AppModal'
import { DialogTitle } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'

export function OsmLocateSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const formId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setDraft('')
    setLocalError(null)
  }, [open])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = draft.trim()
    if (!t) {
      setLocalError(de.osmLocate.invalidFormat)
      return
    }
    if (!parseOsmIdInput(t)) {
      setLocalError(de.osmLocate.invalidFormat)
      return
    }
    setLocalError(null)
    void navigate({ to: '/', search: { osm: t }, replace: true })
    onClose()
  }

  return (
    <AppModal open={open} onClose={onClose} initialFocus={inputRef}>
      <form id={formId} onSubmit={onSubmit}>
        <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start sm:gap-4">
            <div className="mx-auto flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 sm:mx-0">
              <MagnifyingGlassIcon aria-hidden className="size-5 text-emerald-400" />
            </div>
            <div className="mt-3 min-w-0 flex-1 text-center sm:mt-0 sm:text-left">
              <DialogTitle className="text-base font-semibold text-zinc-100">
                {de.osmLocate.title}
              </DialogTitle>
              <p className="mt-2 text-sm text-zinc-400">{de.osmLocate.description}</p>
              <div className="mt-4">
                <label htmlFor={`${formId}-input`} className="sr-only">
                  OSM-Referenz
                </label>
                <input
                  ref={inputRef}
                  id={`${formId}-input`}
                  type="search"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setLocalError(null)
                  }}
                  placeholder={de.osmLocate.placeholder}
                  autoComplete="off"
                  className="block w-full rounded-md border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
                {localError != null && (
                  <p className="mt-2 text-sm text-amber-300" role="alert">
                    {localError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-zinc-800 bg-zinc-900/80 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 sm:w-auto"
          >
            {de.osmLocate.cancel}
          </button>
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 sm:w-auto"
          >
            {de.osmLocate.submit}
          </button>
        </div>
      </form>
    </AppModal>
  )
}

export function OsmLocateSearchTrigger() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={de.osmLocate.openAria}
        title={de.osmLocate.openAria}
        className="inline-flex shrink-0 items-center justify-center rounded-md border border-zinc-600 bg-zinc-900 p-2 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-50"
      >
        <MagnifyingGlassIcon className="size-5" aria-hidden />
      </button>
      <OsmLocateSearchDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}
