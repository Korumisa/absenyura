import { Camera, MapPin, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AttendStep = 'scan' | 'verify' | 'photo'

const STEPS: { id: AttendStep; label: string; short: string }[] = [
  { id: 'scan', label: 'Scan QR', short: 'QR' },
  { id: 'verify', label: 'Lokasi', short: 'GPS' },
  { id: 'photo', label: 'Foto & Kirim', short: 'Foto' },
]

/** Menyelesaikan temuan #2 — wizard 3 langkah absensi */
export function AttendWizardHeader({
  current,
  qrSkipped,
}: {
  current: AttendStep
  qrSkipped?: boolean
}) {
  const currentIndex = STEPS.findIndex((s) => s.id === current)

  return (
    <nav aria-label="Langkah absensi" className="border-b border-border bg-card px-4 py-4">
      <ol className="flex items-center justify-between gap-2">
        {STEPS.map((step, index) => {
          const done = index < currentIndex
          const active = step.id === current
          const Icon = step.id === 'scan' ? QrCode : step.id === 'verify' ? MapPin : Camera

          return (
            <li key={step.id} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors',
                  done && 'border-emerald-500 bg-emerald-500 text-white',
                  active && !done && 'border-indigo-600 bg-brand text-white',
                  !done && !active && 'border-border bg-slate-50 text-slate-400 dark:border-zinc-600 bg-muted',
                )}
                aria-current={active ? 'step' : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className={cn('text-center text-[11px] font-semibold sm:text-xs', active ? 'text-brand text-brand' : 'text-muted-foreground')}>
                {step.id === 'scan' && qrSkipped ? 'Tanpa QR' : step.label}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="mt-2 text-center text-xs text-muted-foreground" aria-live="polite">
        Langkah {currentIndex + 1} dari {STEPS.length}
      </p>
    </nav>
  )
}
