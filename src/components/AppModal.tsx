import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import type { MutableRefObject, ReactNode } from 'react'
import { cn } from '../lib/cn'

const backdropClass =
  'fixed inset-0 bg-zinc-950/80 transition-opacity data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in'

const panelBaseClass =
  'relative w-full max-w-lg transform overflow-hidden rounded-lg border border-zinc-700 bg-brand-950 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in data-closed:sm:translate-y-0 data-closed:sm:scale-95'

export type AppModalProps = {
  open: boolean
  onClose: () => void
  /** Content inside the modal panel (may include `DialogTitle` from Headless UI). */
  children: ReactNode
  /** Optional width / layout overrides for `DialogPanel`. */
  panelClassName?: string
  /** Root z-index tier (backdrop/panel use consecutive values). */
  zIndex?: number
  /** Element to focus when the dialog opens (Headless UI `Dialog` `initialFocus`). */
  initialFocus?: MutableRefObject<HTMLElement | null>
}

/**
 * Shared Headless UI modal shell for this app (backdrop, centered panel, transitions).
 */
export function AppModal({
  open,
  onClose,
  children,
  panelClassName,
  zIndex = 70,
  initialFocus,
}: AppModalProps) {
  const z = zIndex
  return (
    <Dialog
      open={open}
      onClose={onClose}
      initialFocus={initialFocus}
      className="relative"
      style={{ zIndex: z }}
    >
      <DialogBackdrop transition className={backdropClass} />
      <div className="fixed inset-0 w-screen overflow-y-auto" style={{ zIndex: z + 1 }}>
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel transition className={cn(panelBaseClass, panelClassName)}>
            {children}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
