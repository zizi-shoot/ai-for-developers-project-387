import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
import { createMemoryHistory, createRouter } from 'vue-router'

import EventTypesListPage from './EventTypesListPage.vue'

const eventTypes = [
  {
    id: 'event-type-1',
    title: 'Консультация',
    description: 'Обсудим задачу и следующие шаги.',
    durationMinutes: 30,
  },
  {
    id: 'event-type-2',
    title: 'Разбор проекта',
    description: 'Посмотрим на архитектуру проекта.',
    durationMinutes: 60,
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
      { path: '/admin/event-types', component: EventTypesListPage },
      {
        path: '/admin/event-types/new',
        name: 'event-type-create',
        component: { template: '<div />' },
      },
    ],
  })

  const result = render(EventTypesListPage, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient: createQueryClient() }], PrimeVue],
    },
  })

  return { ...result, router }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('страница типов событий владельца', () => {
  it('загружает и показывает события из admin API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(eventTypes))
    vi.stubGlobal('fetch', fetchMock)

    renderPage()

    expect(await screen.findByText('Консультация')).toBeTruthy()
    expect(screen.getByText('Обсудим задачу и следующие шаги.')).toBeTruthy()
    expect(screen.getByText('30 мин')).toBeTruthy()
    expect(screen.getByText('Разбор проекта')).toBeTruthy()
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).pathname).toBe('/admin/event-types')
  })

  it('показывает skeleton во время первой загрузки', () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockReturnValue(new Promise<Response>(() => {})))

    renderPage()

    expect(screen.getByLabelText('Загрузка типов событий')).toBeTruthy()
  })

  it('показывает пустое состояние и переход к созданию события', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([])))

    const { router } = renderPage()

    expect(await screen.findByText('Здесь появятся ваши события')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Создать первое событие' }))

    expect(router.currentRoute.value.fullPath).toBe('/admin/event-types/new')
  })

  it('показывает ошибку некорректного ответа и позволяет повторить запрос', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse([{ id: 'broken' }]))
      .mockResolvedValueOnce(jsonResponse(eventTypes))
    vi.stubGlobal('fetch', fetchMock)

    renderPage()

    expect(await screen.findByText('Сервер вернул некорректные данные типов событий.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Попробовать снова' }))

    expect(await screen.findByText('Консультация')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
