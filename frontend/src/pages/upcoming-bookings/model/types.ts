export type EventDurationMinutes = 15 | 30 | 45 | 60

export interface Booking {
  id: string
  eventTypeId: string
  startsAt: string
  guestName: string
  guestEmail: string
}

export interface EventTypeSummary {
  id: string
  title: string
  durationMinutes: EventDurationMinutes
}

export interface UpcomingBooking {
  booking: Booking
  eventType: EventTypeSummary
}

export interface BookingGroup {
  key: string
  label: string
  bookings: UpcomingBooking[]
}
