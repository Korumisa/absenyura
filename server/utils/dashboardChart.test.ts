import { describe, expect, test } from 'vitest'
import { buildWibDateKeys, fillChartData } from './dashboardChart'

describe('dashboardChart', () => {
  test('buildWibDateKeys returns contiguous WIB date keys ending today', () => {
    const now = new Date('2026-04-16T00:30:00.000Z')
    expect(buildWibDateKeys({ rangeDays: 3, now })).toEqual([
      '2026-04-14',
      '2026-04-15',
      '2026-04-16',
    ])
  })

  test('fillChartData fills missing dates with zeros', () => {
    const now = new Date('2026-04-16T00:30:00.000Z')
    const rows = [
      { date: '2026-04-15', count: 2, present: 1, late: 1, absent: 0, sick: 0, excused: 0 },
      { date: '2026-04-16', count: 1, present: 1, late: 0, absent: 0, sick: 0, excused: 0 },
    ]

    expect(fillChartData({ rangeDays: 3, now, rows })).toEqual([
      { date: '2026-04-14', count: 0, present: 0, late: 0, absent: 0, sick: 0, excused: 0 },
      { date: '2026-04-15', count: 2, present: 1, late: 1, absent: 0, sick: 0, excused: 0 },
      { date: '2026-04-16', count: 1, present: 1, late: 0, absent: 0, sick: 0, excused: 0 },
    ])
  })
})
