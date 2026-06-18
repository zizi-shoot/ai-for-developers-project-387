<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'

import { formatMeetingTimeRange, groupUpcomingBookings } from '../model/booking-groups'
import { useUpcomingBookings } from '../model/use-upcoming-bookings'

const query = useUpcomingBookings()

const groups = computed(() => groupUpcomingBookings(query.data.value ?? []))
const hasResolvedData = computed(() => query.data.value !== undefined)
const hasBookings = computed(() => Boolean(query.data.value?.length))
const errorMessage = computed(
  () => query.error.value?.message || 'Не удалось загрузить предстоящие встречи.',
)

function retry() {
  void query.refetch()
}
</script>

<template>
  <main class="bookings-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Календарь</p>
        <div class="heading-line">
          <h1>Предстоящие встречи</h1>
          <span v-if="query.isFetching.value && hasResolvedData" class="refresh-status">
            Обновляем…
          </span>
        </div>
        <p>Все будущие бронирования вашего календаря в одном списке.</p>
      </div>
    </header>

    <section
      v-if="query.isPending.value"
      class="loading-state"
      aria-label="Загрузка предстоящих встреч"
      aria-busy="true"
    >
      <div v-for="index in 3" :key="index" class="loading-row">
        <Skeleton width="9rem" height="1rem" />
        <Skeleton width="100%" height="5.5rem" border-radius="12px" />
      </div>
    </section>

    <section v-else-if="query.isError.value && !hasResolvedData" class="error-state">
      <div class="state-mark" aria-hidden="true">!</div>
      <h2>Не удалось загрузить встречи</h2>
      <p>{{ errorMessage }}</p>
      <Button label="Попробовать снова" severity="secondary" @click="retry" />
    </section>

    <template v-else>
      <Message
        v-if="query.isError.value && hasResolvedData"
        severity="warn"
        :closable="false"
        class="refresh-error"
      >
        <div class="refresh-error-content">
          <span>Не удалось обновить список. Показаны ранее загруженные данные.</span>
          <Button label="Повторить" size="small" severity="secondary" text @click="retry" />
        </div>
      </Message>

      <section v-if="!hasBookings" class="empty-state">
        <div class="state-mark" aria-hidden="true">○</div>
        <h2>Предстоящих встреч пока нет</h2>
        <p>Новые бронирования появятся здесь автоматически.</p>
      </section>

      <div v-else class="booking-groups">
        <section
          v-for="group in groups"
          :key="group.key"
          class="booking-group"
          :aria-labelledby="`booking-date-${group.key}`"
        >
          <h2 :id="`booking-date-${group.key}`">{{ group.label }}</h2>

          <div class="booking-list">
            <article v-for="item in group.bookings" :key="item.booking.id" class="booking-card">
              <time :datetime="item.booking.startsAt" class="booking-time">
                {{ formatMeetingTimeRange(item) }}
              </time>

              <div class="booking-main">
                <h3>{{ item.eventType.title }}</h3>
                <span class="duration">{{ item.eventType.durationMinutes }} минут</span>
              </div>

              <div class="guest">
                <span class="guest-name">{{ item.booking.guestName }}</span>
                <a :href="`mailto:${item.booking.guestEmail}`">{{ item.booking.guestEmail }}</a>
              </div>
            </article>
          </div>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.bookings-page {
  width: min(1040px, 100%);
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.eyebrow {
  margin: 0 0 0.45rem;
  color: #737373;
  font-size: 0.8rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.heading-line {
  display: flex;
  align-items: baseline;
  gap: 0.8rem;
}

h1 {
  margin: 0;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  letter-spacing: -0.035em;
}

.page-header p:last-child {
  margin: 0.65rem 0 0;
  color: #737373;
  line-height: 1.5;
}

.refresh-status {
  color: #737373;
  font-size: 0.78rem;
}

.loading-state,
.booking-groups {
  display: grid;
  gap: 2rem;
}

.loading-row {
  display: grid;
  gap: 0.8rem;
}

.booking-group h2 {
  margin: 0 0 0.75rem;
  color: #525252;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.booking-list {
  overflow: hidden;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 3%);
}

.booking-card {
  display: grid;
  grid-template-columns: 130px minmax(180px, 1fr) minmax(210px, 0.8fr);
  align-items: center;
  gap: 1.5rem;
  min-height: 92px;
  padding: 1.25rem 1.5rem;
}

.booking-card + .booking-card {
  border-top: 1px solid #ededed;
}

.booking-time {
  color: #262626;
  font-size: 0.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.booking-main,
.guest {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.booking-main h3 {
  overflow: hidden;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duration {
  color: #737373;
  font-size: 0.78rem;
}

.guest-name {
  overflow: hidden;
  color: #404040;
  font-size: 0.875rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.guest a {
  overflow: hidden;
  color: #666;
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state,
.error-state {
  display: grid;
  min-height: 360px;
  place-items: center;
  align-content: center;
  padding: 2rem;
  border: 1px dashed #d4d4d8;
  border-radius: 14px;
  background: #fff;
  text-align: center;
}

.state-mark {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  place-items: center;
  border: 1px solid #dedede;
  border-radius: 12px;
  background: #fafafa;
  color: #525252;
  font-size: 1.25rem;
  font-weight: 700;
}

.empty-state h2,
.error-state h2 {
  margin: 0;
  font-size: 1.05rem;
}

.empty-state p,
.error-state p {
  margin: 0.5rem 0 1.25rem;
  color: #737373;
  line-height: 1.5;
}

.refresh-error {
  margin-bottom: 1.5rem;
}

.refresh-error-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

@media (max-width: 720px) {
  .booking-card {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 1.1rem 1.2rem;
  }

  .booking-main h3,
  .guest-name,
  .guest a {
    white-space: normal;
  }

  .refresh-error-content {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
