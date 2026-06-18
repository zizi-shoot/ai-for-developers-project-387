import type { Slot } from './types'

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
})

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function toLocalDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function groupSlotsByLocalDate(slots: Slot[]) {
  return [...slots]
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))
    .reduce<Record<string, Slot[]>>((groups, slot) => {
      const key = toLocalDateKey(slot.startsAt)
      ;(groups[key] ??= []).push(slot)
      return groups
    }, {})
}

export function dateFromLocalKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

export function formatBookingDate(value: string | Date) {
  return dateFormatter.format(value instanceof Date ? value : new Date(value))
}

export function formatBookingTime(value: string | Date) {
  return timeFormatter.format(value instanceof Date ? value : new Date(value))
}

export function formatBookingDateTime(value: string | Date) {
  return dateTimeFormatter.format(value instanceof Date ? value : new Date(value))
}

export function getLocalTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}
