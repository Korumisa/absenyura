export type ChartRow = {
  date: string
  count: number
  present: number
  late: number
  absent: number
  sick: number
  excused: number
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

const toWibDateKey = (d: Date) => new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10)

const wibDayStartUtc = (dateKey: string) => new Date(`${dateKey}T00:00:00+07:00`)

export const buildWibDateKeys = ({ rangeDays, now = new Date() }: { rangeDays: number; now?: Date }) => {
  const todayKey = toWibDateKey(now)
  const todayStartUtc = wibDayStartUtc(todayKey)

  const keys: string[] = []
  for (let i = rangeDays - 1; i >= 0; i--) {
    keys.push(toWibDateKey(new Date(todayStartUtc.getTime() - i * 24 * 60 * 60 * 1000)))
  }
  return keys
}

export const getWibRangeUtc = ({ rangeDays, now = new Date() }: { rangeDays: number; now?: Date }) => {
  const keys = buildWibDateKeys({ rangeDays, now })
  const startUtc = wibDayStartUtc(keys[0])
  const endUtc = new Date(wibDayStartUtc(keys[keys.length - 1]).getTime() + 24 * 60 * 60 * 1000)
  return { startUtc, endUtc, keys }
}

export const fillChartData = ({
  rangeDays,
  now = new Date(),
  rows,
}: {
  rangeDays: number
  now?: Date
  rows: ChartRow[]
}) => {
  const keys = buildWibDateKeys({ rangeDays, now })
  const byDate = new Map(rows.map((r) => [r.date, r]))

  return keys.map((date) => {
    const row = byDate.get(date)
    return (
      row ?? {
        date,
        count: 0,
        present: 0,
        late: 0,
        absent: 0,
        sick: 0,
        excused: 0,
      }
    )
  })
}

