import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { CreateEventTypePage } from '@/pages/event-type-create'
import { EventTypesListPage } from '@/pages/event-types-list'
import { OwnerShell } from '@/widgets/owner-shell'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'event-types-list' },
  },
  {
    path: '/admin',
    component: OwnerShell,
    children: [
      {
        path: 'event-types',
        name: 'event-types-list',
        component: EventTypesListPage,
      },
      {
        path: 'event-types/new',
        name: 'event-type-create',
        component: CreateEventTypePage,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
