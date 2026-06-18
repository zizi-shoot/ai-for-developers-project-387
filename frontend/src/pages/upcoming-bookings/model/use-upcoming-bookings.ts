import { useQuery } from '@tanstack/vue-query'

import { getUpcomingBookings } from '../api/get-upcoming-bookings'

export const upcomingBookingsQueryKey = ['admin', 'bookings', 'upcoming'] as const

export function useUpcomingBookings() {
  return useQuery({
    queryKey: upcomingBookingsQueryKey,
    queryFn: getUpcomingBookings,
    refetchOnWindowFocus: true,
  })
}
