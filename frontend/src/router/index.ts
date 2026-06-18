import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { CreateEventTypePage } from '@/pages/event-type-create'
import { EventBookingPage } from '@/pages/event-booking'
import { EventTypesListPage } from '@/pages/event-types-list'
import { PublicEventTypesPage } from '@/pages/public-event-types'
import { UpcomingBookingsPage } from '@/pages/upcoming-bookings'
import { OwnerShell } from '@/widgets/owner-shell'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'public-event-types',
    component: PublicEventTypesPage,
  },
  {
    path: '/event-types/:eventTypeId',
    name: 'event-booking',
    component: EventBookingPage,
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
      {
        path: 'bookings/upcoming',
        name: 'upcoming-bookings',
        component: UpcomingBookingsPage,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
