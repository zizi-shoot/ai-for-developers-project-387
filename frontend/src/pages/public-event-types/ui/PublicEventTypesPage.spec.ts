import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
import { createMemoryHistory, createRouter } from 'vue-router'

import PublicEventTypesPage from './PublicEventTypesPage.vue'

const owner = { id: 'owner-1', name: 'Анна Смирнова' }
const eventTypes = [
  {
    id: 'event-type-2',
    title: 'Разбор проекта',
    description: 'Обсудим архитектуру и следующие шаги.',
    durationMinutes: 60,
  },
  {
    id: 'event-type-1',
    title: 'Знакомство',
    description: 'Короткая встреча для знакомства.',
    durationMinutes: 15,
  },
]

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
    },
  })
}

function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: PublicEventTypesPage },
      {
        path: '/event-types/:eventTypeId',
        name: 'event-booking',
        component: { template: '<div />' },
      },
    ],
  })

  return render(PublicEventTypesPage, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient: createQueryClient() }], PrimeVue],
    },
  })
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function requestPath(input: RequestInfo | URL) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return new URL(url).pathname
}

function mockPublicRequests(
  ownerResponse: unknown = owner,
  eventTypesResponse: unknown = eventTypes,
) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const path = requestPath(input)
    return Promise.resolve(jsonResponse(path === '/owner' ? ownerResponse : eventTypesResponse))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('публичный каталог типов событий', () => {
  it('показывает владельца и типы событий в порядке ответа API', async () => {
    mockPublicRequests()

    renderPage()

    expect(await screen.findByText('Анна Смирнова')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Выберите тип события', level: 1 })).toBeTruthy()
    expect(screen.getByText('Обсудим архитектуру и следующие шаги.')).toBeTruthy()
    expect(screen.getByText('60 мин')).toBeTruthy()
    expect(screen.getByText('15 мин')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Разбор проекта/ }).getAttribute('href')).toBe(
      '/event-types/event-type-2',
    )
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Разбор проекта', 'Знакомство'])
  })

  it('показывает skeleton во время первой загрузки', () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockReturnValue(new Promise<Response>(() => {})))

    renderPage()

    expect(screen.getByLabelText('Загрузка профиля владельца')).toBeTruthy()
    expect(screen.getByLabelText('Загрузка типов событий')).toBeTruthy()
  })

  it('показывает нейтральное пустое состояние', async () => {
    mockPublicRequests(owner, [])

    renderPage()

    expect(await screen.findByText('Нет доступных типов событий')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('блокирует каталог при некорректном ответе и повторяет запрос', async () => {
    const user = userEvent.setup()
    let eventTypesRequestCount = 0
    const fetchMock = vi.fn<typeof fetch>((input) => {
      if (requestPath(input) === '/owner') return Promise.resolve(jsonResponse(owner))

      eventTypesRequestCount += 1
      return Promise.resolve(
        jsonResponse(eventTypesRequestCount === 1 ? [{ id: 'broken' }] : eventTypes),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    renderPage()

    expect(await screen.findByText('Сервер вернул некорректные данные типов событий.')).toBeTruthy()
    expect(screen.queryByText('Разбор проекта')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Попробовать снова' }))

    expect(await screen.findByText('Разбор проекта')).toBeTruthy()
    expect(eventTypesRequestCount).toBe(2)
  })

  it('сохраняет каталог при ошибке профиля и позволяет повторить запрос', async () => {
    const user = userEvent.setup()
    let ownerRequestCount = 0
    const fetchMock = vi.fn<typeof fetch>((input) => {
      if (requestPath(input) === '/event-types') return Promise.resolve(jsonResponse(eventTypes))

      ownerRequestCount += 1
      return Promise.resolve(
        ownerRequestCount === 1
          ? jsonResponse({ code: 'OWNER_UNAVAILABLE', message: 'Профиль временно недоступен' }, 503)
          : jsonResponse(owner),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    renderPage()

    expect(await screen.findByText('Профиль временно недоступен')).toBeTruthy()
    expect(screen.getByText('Календарь')).toBeTruthy()
    expect(screen.getByText('Разбор проекта')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText('Анна Смирнова')).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Профиль временно недоступен')).toBeNull())
    expect(ownerRequestCount).toBe(2)
  })

  it('отдельно валидирует ответ профиля', async () => {
    mockPublicRequests({ id: 'owner-1' }, eventTypes)

    renderPage()

    expect(await screen.findByText('Сервер вернул некорректные данные профиля.')).toBeTruthy()
    expect(screen.getByText('Разбор проекта')).toBeTruthy()
  })
})
