import { useQuery } from '@tanstack/vue-query'

import { getEventTypes } from '../api/get-event-types'

export const eventTypesListQueryKey = ['admin', 'event-types'] as const

export function useEventTypesList() {
  return useQuery({
    queryKey: eventTypesListQueryKey,
    queryFn: getEventTypes,
    refetchOnWindowFocus: true,
  })
}
