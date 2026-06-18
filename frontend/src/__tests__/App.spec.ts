import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '../App.vue'
import { routes } from '../router'

async function renderApp(path = '/admin/event-types/new') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  await router.push(path)
  await router.isReady()

  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  })

  const result = render(App, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }], PrimeVue, ToastService],
    },
  })

  return { ...result, router }
}

function successfulResponse() {
  return new Response(
    JSON.stringify({
      id: 'event-type-1',
      title: 'Консультация',
      description: 'Обсудим задачу',
      durationMinutes: 30,
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } },
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('создание типа события', () => {
  it('показывает форму с длительностью 30 минут', async () => {
    await renderApp()

    expect(screen.getByRole('heading', { name: 'Создать событие' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Длительность' }).textContent).toBe('30 минут')
  })

  it('валидирует обязательные поля после blur и submit', async () => {
    const user = userEvent.setup()
    await renderApp()

    const title = screen.getByRole('textbox', { name: 'Название' })
    await user.click(title)
    await user.tab()

    expect(screen.getByText('Введите название события')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Создать событие' }))
    expect(screen.getByText('Добавьте описание события')).toBeTruthy()
  })

  it('отправляет очищенные данные, блокирует повторный submit и переходит к списку', async () => {
    const user = userEvent.setup()
    let resolveRequest: ((response: Response) => void) | undefined
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { router } = await renderApp()

    await user.type(screen.getByRole('textbox', { name: 'Название' }), '  Консультация  ')
    await user.type(screen.getByRole('textbox', { name: 'Описание' }), '  Обсудим задачу  ')
    const submit = screen.getByRole('button', { name: 'Создать событие' })
    await user.click(submit)
    await user.click(submit)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((submit as HTMLButtonElement).disabled).toBe(true)
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      title: 'Консультация',
      description: 'Обсудим задачу',
      durationMinutes: 30,
    })

    resolveRequest?.(successfulResponse())

    await waitFor(() => expect(router.currentRoute.value.name).toBe('event-types-list'))
    expect(await screen.findByText('Событие создано')).toBeTruthy()
  })

  it('показывает ошибку API и сохраняет введённые данные', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({ code: 'INVALID_EVENT', message: 'Проверьте параметры события' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    )
    await renderApp()

    const title = screen.getByRole('textbox', { name: 'Название' })
    await user.type(title, 'Консультация')
    await user.type(screen.getByRole('textbox', { name: 'Описание' }), 'Обсудим задачу')
    await user.click(screen.getByRole('button', { name: 'Создать событие' }))

    expect(await screen.findByText('Проверьте параметры события')).toBeTruthy()
    expect(title).toHaveProperty('value', 'Консультация')
  })
})

describe('навигация владельца', () => {
  it('переходит к предстоящим встречам из меню', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    const { router } = await renderApp('/admin/event-types')

    await user.click(screen.getAllByRole('link', { name: 'Предстоящие встречи' })[0]!)

    await waitFor(() => expect(router.currentRoute.value.name).toBe('upcoming-bookings'))
    expect(screen.getByRole('heading', { name: 'Предстоящие встречи' })).toBeTruthy()
  })
})
