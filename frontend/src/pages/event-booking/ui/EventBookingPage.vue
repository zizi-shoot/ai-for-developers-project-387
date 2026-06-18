<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'

import { ApiError } from '@/shared/api'

import {
  dateFromLocalKey,
  formatBookingDate,
  formatBookingDateTime,
  formatBookingTime,
  getLocalTimeZone,
  groupSlotsByLocalDate,
  toLocalDateKey,
} from '../model/booking-date'
import { useCreateBooking, useEventType, useEventTypeSlots } from '../model/use-event-booking'
import type { Booking, Slot } from '../model/types'

type Step = 'slots' | 'details' | 'success'

const route = useRoute()
const eventTypeId = computed(() => String(route.params.eventTypeId ?? ''))
const eventTypeQuery = useEventType(eventTypeId)
const slotsQuery = useEventTypeSlots(eventTypeId)
const bookingMutation = useCreateBooking(eventTypeId)

const step = ref<Step>('slots')
const selectedDate = ref<Date | null>(null)
const selectedSlot = ref<Slot | null>(null)
const booking = ref<Booking | null>(null)
const conflictMessage = ref('')
const submitted = ref(false)
const touched = reactive({ guestName: false, guestEmail: false })
const form = reactive({ guestName: '', guestEmail: '' })

const slotsByDate = computed(() => groupSlotsByLocalDate(slotsQuery.data.value ?? []))
const availableDateKeys = computed(() => Object.keys(slotsByDate.value).sort())
const selectedDateKey = computed(() =>
  selectedDate.value ? toLocalDateKey(selectedDate.value) : '',
)
const selectedDateSlots = computed(() => slotsByDate.value[selectedDateKey.value] ?? [])
const timeZone = getLocalTimeZone()
const isEventTypeNotFound = computed(
  () => eventTypeQuery.error.value instanceof ApiError && eventTypeQuery.error.value.status === 404,
)

const calendarMinDate = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const firstAvailable = availableDateKeys.value[0]
  if (!firstAvailable) return today
  const slotDate = dateFromLocalKey(firstAvailable)
  return slotDate < today ? slotDate : today
})

const calendarMaxDate = computed(() => {
  const end = new Date(calendarMinDate.value)
  end.setDate(end.getDate() + 13)
  const lastAvailable = availableDateKeys.value[availableDateKeys.value.length - 1]
  if (!lastAvailable) return end
  const slotDate = dateFromLocalKey(lastAvailable)
  return slotDate > end ? slotDate : end
})

const disabledDates = computed(() => {
  const available = new Set(availableDateKeys.value)
  const dates: Date[] = []
  const cursor = new Date(calendarMinDate.value)

  while (cursor <= calendarMaxDate.value) {
    if (!available.has(toLocalDateKey(cursor))) dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
})

const guestNameError = computed(() =>
  (submitted.value || touched.guestName) && !form.guestName.trim() ? 'Введите ваше имя' : '',
)
const guestEmailError = computed(() => {
  if (!submitted.value && !touched.guestEmail) return ''
  const email = form.guestEmail.trim()
  if (!email) return 'Введите email'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Введите корректный email'
})

watch(
  availableDateKeys,
  (keys) => {
    if (!keys.length) {
      selectedDate.value = null
      selectedSlot.value = null
      return
    }

    if (!selectedDate.value || !keys.includes(toLocalDateKey(selectedDate.value))) {
      selectedDate.value = dateFromLocalKey(keys[0]!)
      selectedSlot.value = null
    }
  },
  { immediate: true },
)

function selectSlot(slot: Slot) {
  selectedSlot.value = slot
  conflictMessage.value = ''
  bookingMutation.reset()
  step.value = 'details'
}

function backToSlots() {
  bookingMutation.reset()
  conflictMessage.value = ''
  step.value = 'slots'
}

async function submitBooking() {
  if (!selectedSlot.value || bookingMutation.isPending.value) return

  submitted.value = true
  if (guestNameError.value || guestEmailError.value) return

  try {
    booking.value = await bookingMutation.mutateAsync({
      eventTypeId: eventTypeId.value,
      startsAt: selectedSlot.value.startsAt,
      guestName: form.guestName.trim(),
      guestEmail: form.guestEmail.trim(),
    })
    step.value = 'success'
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      conflictMessage.value =
        'Этот слот уже заняли. Мы обновили расписание — выберите другое время.'
      selectedSlot.value = null
      step.value = 'slots'
      await slotsQuery.refetch()
    }
  }
}

function retryLoading() {
  void eventTypeQuery.refetch()
  void slotsQuery.refetch()
}
</script>

<template>
  <main class="booking-page">
    <RouterLink class="back-link" to="/" aria-label="Вернуться к типам событий">
      <span aria-hidden="true">←</span> Все типы событий
    </RouterLink>

    <section
      v-if="eventTypeQuery.isPending.value || slotsQuery.isPending.value"
      class="booking-card booking-loading"
      aria-label="Загрузка страницы бронирования"
      aria-busy="true"
    >
      <Skeleton width="45%" height="1.5rem" />
      <Skeleton width="70%" height="1rem" />
      <Skeleton width="100%" height="22rem" border-radius="14px" />
    </section>

    <section
      v-else-if="eventTypeQuery.isError.value || slotsQuery.isError.value"
      class="booking-card state-card"
    >
      <div class="state-mark" aria-hidden="true">!</div>
      <h1>
        {{ isEventTypeNotFound ? 'Тип события не найден' : 'Не удалось загрузить расписание' }}
      </h1>
      <p>
        {{ eventTypeQuery.error.value?.message || slotsQuery.error.value?.message || 'Попробуйте ещё раз.' }}
      </p>
      <RouterLink v-if="isEventTypeNotFound" class="primary-link" to="/">
        Вернуться к типам событий
      </RouterLink>
      <Button v-else label="Попробовать снова" severity="secondary" @click="retryLoading" />
    </section>

    <section v-else-if="eventTypeQuery.data.value" class="booking-card">
      <aside class="event-summary">
        <p class="eyebrow">Бронирование встречи</p>
        <h1>{{ eventTypeQuery.data.value.title }}</h1>
        <p class="event-description">{{ eventTypeQuery.data.value.description }}</p>
        <dl class="event-meta">
          <div>
            <dt>Длительность</dt>
            <dd>{{ eventTypeQuery.data.value.durationMinutes }} минут</dd>
          </div>
          <div>
            <dt>Часовой пояс</dt>
            <dd>{{ timeZone }}</dd>
          </div>
        </dl>
      </aside>

      <div class="booking-content">
        <template v-if="step === 'slots'">
          <header class="step-header">
            <p class="step-label">Шаг 1 из 2</p>
            <h2>Выберите дату и время</h2>
          </header>

          <Message v-if="conflictMessage" severity="warn" :closable="false">
            {{ conflictMessage }}
          </Message>

          <div v-if="!availableDateKeys.length" class="empty-slots">
            <h3>Свободных слотов пока нет</h3>
            <p>Попробуйте проверить расписание позже или выберите другой тип события.</p>
            <Button label="Обновить расписание" severity="secondary" @click="slotsQuery.refetch()" />
          </div>

          <div v-else class="slot-picker">
            <DatePicker
              v-model="selectedDate"
              inline
              :manual-input="false"
              :min-date="calendarMinDate"
              :max-date="calendarMaxDate"
              :disabled-dates="disabledDates"
              aria-label="Дата встречи"
            />

            <section class="times" aria-label="Свободное время">
              <h3 v-if="selectedDate">{{ formatBookingDate(selectedDate) }}</h3>
              <div class="time-grid">
                <Button
                  v-for="slot in selectedDateSlots"
                  :key="slot.startsAt"
                  :label="formatBookingTime(slot.startsAt)"
                  severity="secondary"
                  variant="outlined"
                  @click="selectSlot(slot)"
                />
              </div>
            </section>
          </div>
        </template>

        <template v-else-if="step === 'details' && selectedSlot">
          <header class="step-header">
            <p class="step-label">Шаг 2 из 2</p>
            <h2>Ваши данные</h2>
            <p>{{ formatBookingDateTime(selectedSlot.startsAt) }}</p>
          </header>

          <form class="guest-form" novalidate @submit.prevent="submitBooking">
            <div class="field">
              <label for="guest-name">Имя</label>
              <InputText
                id="guest-name"
                v-model="form.guestName"
                autocomplete="name"
                :invalid="Boolean(guestNameError)"
                :disabled="bookingMutation.isPending.value"
                aria-describedby="guest-name-error"
                fluid
                @blur="touched.guestName = true"
              />
              <small v-if="guestNameError" id="guest-name-error" class="field-error">{{ guestNameError }}</small>
            </div>

            <div class="field">
              <label for="guest-email">Email</label>
              <InputText
                id="guest-email"
                v-model="form.guestEmail"
                type="email"
                autocomplete="email"
                :invalid="Boolean(guestEmailError)"
                :disabled="bookingMutation.isPending.value"
                aria-describedby="guest-email-error"
                fluid
                @blur="touched.guestEmail = true"
              />
              <small v-if="guestEmailError" id="guest-email-error" class="field-error">{{ guestEmailError }}</small>
            </div>

            <Message v-if="bookingMutation.isError.value" severity="error" :closable="false">
              {{ bookingMutation.error.value?.message || 'Не удалось создать бронирование.' }}
            </Message>

            <footer class="form-actions">
              <Button
                type="button"
                label="Назад"
                severity="secondary"
                variant="outlined"
                :disabled="bookingMutation.isPending.value"
                @click="backToSlots"
              />
              <Button
                type="submit"
                :label="bookingMutation.isPending.value ? 'Бронируем…' : 'Забронировать'"
                :loading="bookingMutation.isPending.value"
                :disabled="bookingMutation.isPending.value"
              />
            </footer>
          </form>
        </template>

        <template v-else-if="step === 'success' && booking">
          <div class="success-state">
            <div class="success-mark" aria-hidden="true">✓</div>
            <p class="step-label">Встреча забронирована</p>
            <h2>До встречи!</h2>
            <dl class="confirmation-details">
              <div>
                <dt>Дата и время</dt>
                <dd>{{ formatBookingDateTime(booking.startsAt) }}</dd>
              </div>
              <div>
                <dt>Гость</dt>
                <dd>{{ booking.guestName }}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{{ booking.guestEmail }}</dd>
              </div>
            </dl>
            <RouterLink class="primary-link" to="/">Вернуться к типам событий</RouterLink>
          </div>
        </template>
      </div>
    </section>
  </main>
</template>

<style scoped>
.booking-page {
  width: min(1100px, 100%);
  min-height: 100vh;
  margin: 0 auto;
  padding: clamp(1.5rem, 5vw, 4rem) 1.25rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 1.25rem;
  color: #525252;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}

.back-link:hover { color: #171717; }

.booking-card {
  display: grid;
  grid-template-columns: minmax(260px, 0.75fr) minmax(0, 1.45fr);
  overflow: hidden;
  border: 1px solid #e4e4e7;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 36px rgb(0 0 0 / 5%);
}

.booking-loading,
.state-card {
  display: grid;
  grid-template-columns: 1fr;
  min-height: 520px;
  align-content: center;
  justify-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.event-summary {
  padding: clamp(1.5rem, 4vw, 2.5rem);
  border-right: 1px solid #ededed;
  background: #fafafa;
}

.eyebrow,
.step-label {
  margin: 0 0 0.65rem;
  color: #737373;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

h1, h2, h3, p { overflow-wrap: anywhere; }
h1 { margin: 0; font-size: clamp(1.6rem, 4vw, 2.1rem); letter-spacing: -0.035em; }
.event-description { margin: 0.85rem 0 0; color: #666; line-height: 1.6; }

.event-meta,
.confirmation-details {
  display: grid;
  gap: 1rem;
  margin: 2rem 0 0;
}

.event-meta div,
.confirmation-details div { display: grid; gap: 0.25rem; }
dt { color: #737373; font-size: 0.78rem; }
dd { margin: 0; font-size: 0.9rem; font-weight: 600; }

.booking-content { min-width: 0; padding: clamp(1.5rem, 4vw, 2.5rem); }
.step-header { margin-bottom: 1.5rem; }
.step-header h2 { margin: 0; font-size: 1.35rem; }
.step-header p:last-child { margin: 0.5rem 0 0; color: #666; }

.slot-picker { display: grid; grid-template-columns: minmax(280px, 1fr) minmax(160px, 0.6fr); gap: 1.5rem; }
.slot-picker :deep(.p-datepicker) { width: 100%; border: 0; padding: 0; }
.slot-picker :deep(.p-datepicker-calendar-container),
.slot-picker :deep(.p-datepicker-calendar) { width: 100%; }

.times { min-width: 0; border-left: 1px solid #ededed; padding-left: 1.5rem; }
.times h3 { margin: 0 0 1rem; font-size: 0.9rem; text-transform: capitalize; }
.time-grid { display: grid; gap: 0.6rem; }
.time-grid :deep(.p-button) { width: 100%; }

.empty-slots,
.success-state { display: grid; min-height: 330px; place-items: center; align-content: center; text-align: center; }
.empty-slots h3, .success-state h2 { margin: 0; }
.empty-slots p { max-width: 430px; margin: 0.6rem 0 1.25rem; color: #737373; line-height: 1.5; }

.guest-form,
.field { display: grid; gap: 0.6rem; }
.guest-form { gap: 1.35rem; }
.field label { font-size: 0.875rem; font-weight: 600; }
.field-error { color: #b42318; font-size: 0.78rem; }
.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 0.5rem; }

.success-mark,
.state-mark {
  display: grid;
  width: 52px;
  height: 52px;
  margin-bottom: 1rem;
  place-items: center;
  border-radius: 50%;
  background: #ecfdf3;
  color: #16794a;
  font-size: 1.3rem;
  font-weight: 800;
}

.state-mark { background: #fafafa; color: #525252; }
.confirmation-details { width: min(420px, 100%); margin: 1.5rem 0; text-align: left; }
.confirmation-details div { padding-bottom: 0.75rem; border-bottom: 1px solid #ededed; }
.primary-link { display: inline-flex; padding: 0.7rem 1rem; border-radius: 8px; background: #171717; color: #fff; font-size: 0.9rem; font-weight: 650; text-decoration: none; }
.state-card p { margin: 0 0 0.5rem; color: #737373; }

@media (max-width: 780px) {
  .booking-card { grid-template-columns: 1fr; }
  .event-summary { border-right: 0; border-bottom: 1px solid #ededed; }
  .slot-picker { grid-template-columns: 1fr; }
  .times { border-left: 0; border-top: 1px solid #ededed; padding: 1.5rem 0 0; }
  .time-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 420px) {
  .booking-page { padding-inline: 0.75rem; }
  .time-grid { grid-template-columns: 1fr; }
  .form-actions { display: grid; }
}
</style>
