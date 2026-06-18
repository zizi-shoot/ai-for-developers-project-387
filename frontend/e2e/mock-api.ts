import type { Page, Route } from '@playwright/test'

const apiBaseUrl = 'http://127.0.0.1:4010'

type ApiMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
type ApiMockResponse = NonNullable<Parameters<Route['fulfill']>[0]>
type ApiMockHandler = (route: Route) => ApiMockResponse | Promise<ApiMockResponse>

export async function mockApiRoute(
  page: Page,
  path: `/${string}`,
  method: ApiMethod,
  handler: ApiMockHandler,
) {
  await page.route(`${apiBaseUrl}${path}`, async (route) => {
    const request = route.request()
    const corsHeaders = {
      'Access-Control-Allow-Origin': request.headers().origin ?? '*',
      'Access-Control-Allow-Methods': `${method}, OPTIONS`,
      'Access-Control-Allow-Headers':
        request.headers()['access-control-request-headers'] ?? 'Content-Type',
    }

    // Централизованно эмулирует CORS-контракт API для preflight и фактических запросов.
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }

    if (request.method() !== method) {
      await route.fulfill({ status: 405, headers: corsHeaders })
      return
    }

    const response = await handler(route)
    await route.fulfill({
      ...response,
      headers: {
        ...corsHeaders,
        ...response.headers,
      },
    })
  })
}
