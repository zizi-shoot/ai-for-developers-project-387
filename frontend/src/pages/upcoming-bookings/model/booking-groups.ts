import type { BookingGroup, UpcomingBooking } from './types'

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
})
const dateWithWeekdayFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
})

function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase('ru-RU') + value.slice(1)
}

export function formatGroupLabel(date: Date, now = new Date()) {
  const dateKey = getDateKey(date)
  const todayKey = getDateKey(now)
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  if (dateKey === todayKey) return `Сегодня, ${dateFormatter.format(date)}`
  if (dateKey === getDateKey(tomorrow)) return `Завтра, ${dateFormatter.format(date)}`

  return capitalize(dateWithWeekdayFormatter.format(date))
}

export function formatMeetingTimeRange(item: UpcomingBooking) {
  const startsAt = new Date(item.booking.startsAt)
  const endsAt = new Date(startsAt.getTime() + item.eventType.durationMinutes * 60_000)
  return `${timeFormatter.format(startsAt)}–${timeFormatter.format(endsAt)}`
}

export function groupUpcomingBookings(
  bookings: UpcomingBooking[],
  now = new Date(),
): BookingGroup[] {
  const groups = new Map<string, BookingGroup>()

  for (const booking of bookings) {
    const date = new Date(booking.booking.startsAt)
    const key = getDateKey(date)
    const existingGroup = groups.get(key)

    if (existingGroup) {
      existingGroup.bookings.push(booking)
      continue
    }

    groups.set(key, {
      key,
      label: formatGroupLabel(date, now),
      bookings: [booking],
    })
  }

  return [...groups.values()]
}
