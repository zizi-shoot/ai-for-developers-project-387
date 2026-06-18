import { useQuery } from '@tanstack/vue-query'

import { getEventTypes } from '../api/get-event-types'
import { getOwner } from '../api/get-owner'

export const publicOwnerQueryKey = ['public', 'owner'] as const
export const publicEventTypesQueryKey = ['public', 'event-types'] as const

export function usePublicOwner() {
  return useQuery({
    queryKey: publicOwnerQueryKey,
    queryFn: getOwner,
    refetchOnWindowFocus: true,
  })
}

export function usePublicEventTypes() {
  return useQuery({
    queryKey: publicEventTypesQueryKey,
    queryFn: getEventTypes,
    refetchOnWindowFocus: true,
  })
}
