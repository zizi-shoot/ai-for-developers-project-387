import { describe, expect, it } from 'vitest'

import { dateFromLocalKey, groupSlotsByLocalDate, toLocalDateKey } from './booking-date'

describe('локальная группировка слотов', () => {
  it('сортирует слоты и группирует их по локальной календарной дате', () => {
    const first = new Date(2030, 4, 10, 9, 30).toISOString()
    const second = new Date(2030, 4, 10, 11, 0).toISOString()
    const nextDay = new Date(2030, 4, 11, 8, 0).toISOString()

    const groups = groupSlotsByLocalDate([
      { startsAt: second },
      { startsAt: nextDay },
      { startsAt: first },
    ])

    expect(Object.keys(groups)).toEqual(['2030-05-10', '2030-05-11'])
    expect(groups[toLocalDateKey(first)]).toEqual([{ startsAt: first }, { startsAt: second }])
  })

  it('восстанавливает локальную дату из ключа без сдвига дня', () => {
    const date = dateFromLocalKey('2030-05-10')

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2030, 4, 10])
  })
})
