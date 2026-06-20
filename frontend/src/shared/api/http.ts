interface ErrorResponse {
  code: string
  message: string
}

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL.trim().replace(/\/$/, '')
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<ErrorResponse>
  return typeof candidate.code === 'string' && typeof candidate.message === 'string'
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError('Не удалось связаться с сервером. Попробуйте ещё раз.', 0)
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const error = isErrorResponse(body) ? body : null
    throw new ApiError(
      error?.message || 'Сервер не смог обработать запрос.',
      response.status,
      error?.code,
    )
  }

  return body as T
}
