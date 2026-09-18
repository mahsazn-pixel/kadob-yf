import { PERSIAN_MONTHS } from '../lib/types'

interface OccasionDateFieldsProps {
  month: string
  day: string
  onMonth: (value: string) => void
  onDay: (value: string) => void
  repeats: boolean
  onRepeats: (value: boolean) => void
  compact?: boolean
}

export default function OccasionDateFields({
  month,
  day,
  onMonth,
  onDay,
  repeats,
  onRepeats,
  compact = false,
}: OccasionDateFieldsProps) {
  const fieldClass = compact
    ? 'flex-1 px-3 py-2 rounded-lg border border-stone-200 text-sm outline-none focus:border-primary-400'
    : 'flex-1 px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:border-primary-400'

  return (
    <div className="space-y-2 w-full">
      <div className="flex gap-2">
        <select
          value={month}
          onChange={(e) => onMonth(e.target.value)}
          className={fieldClass}
        >
          <option value="">ماه</option>
          {PERSIAN_MONTHS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          value={day}
          onChange={(e) => onDay(e.target.value)}
          className={fieldClass}
        >
          <option value="">روز</option>
          {Array.from({ length: 31 }, (_, i) => {
            const d = String(i + 1).padStart(2, '0')
            return <option key={d} value={d}>{i + 1}</option>
          })}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
        <input
          type="checkbox"
          checked={repeats}
          onChange={(e) => onRepeats(e.target.checked)}
          className="rounded border-stone-300 text-primary-500 focus:ring-primary-400"
        />
        هر سال تکرار شود؟
      </label>
    </div>
  )
}
