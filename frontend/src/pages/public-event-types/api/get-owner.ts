import { ApiError, requestJson } from '@/shared/api'

import type { Owner } from '../model/types'

function isOwner(value: unknown): value is Owner {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<Owner>
  return typeof candidate.id === 'string' && typeof candidate.name === 'string'
}

export async function getOwner(): Promise<Owner> {
  const owner = await requestJson<unknown>('/owner')

  if (!isOwner(owner)) {
    throw new ApiError('Сервер вернул некорректные данные профиля.', 500)
  }

  return owner
}
