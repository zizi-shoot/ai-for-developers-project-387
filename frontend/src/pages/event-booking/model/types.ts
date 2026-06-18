export const eventDurations = [15, 30, 45, 60] as const

export type EventDurationMinutes = (typeof eventDurations)[number]

export interface EventType {
  id: string
  title: string
  description: string
  durationMinutes: EventDurationMinutes
}

export interface Slot {
  startsAt: string
}

export interface Booking {
  id: string
  eventTypeId: string
  startsAt: string
  guestName: string
  guestEmail: string
}

export interface CreateBookingRequest {
  eventTypeId: string
  startsAt: string
  guestName: string
  guestEmail: string
}
