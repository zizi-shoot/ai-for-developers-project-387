<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'

import { usePublicEventTypes, usePublicOwner } from '../model/use-public-event-types'

const ownerQuery = usePublicOwner()
const eventTypesQuery = usePublicEventTypes()

const ownerName = computed(() => ownerQuery.data.value?.name || 'Календарь')
const ownerErrorMessage = computed(
  () => ownerQuery.error.value?.message || 'Не удалось загрузить профиль владельца.',
)
const eventTypesErrorMessage = computed(
  () => eventTypesQuery.error.value?.message || 'Не удалось загрузить типы событий.',
)

function retryOwner() {
  void ownerQuery.refetch()
}

function retryEventTypes() {
  void eventTypesQuery.refetch()
}
</script>

<template>
  <main class="public-page">
    <header class="page-header">
      <Skeleton
        v-if="ownerQuery.isPending.value"
        width="9rem"
        height="1rem"
        aria-label="Загрузка профиля владельца"
      />
      <p v-else class="owner-name">{{ ownerName }}</p>
      <h1>Выберите тип события</h1>
      <p class="page-description">Выберите подходящий формат встречи.</p>
    </header>

    <Message
      v-if="ownerQuery.isError.value"
      severity="warn"
      :closable="false"
      class="owner-warning"
    >
      <div class="warning-content">
        <span>{{ ownerErrorMessage }}</span>
        <Button
          label="Повторить"
          size="small"
          severity="secondary"
          text
          :loading="ownerQuery.isFetching.value"
          @click="retryOwner"
        />
      </div>
    </Message>

    <section
      v-if="eventTypesQuery.isPending.value"
      class="loading-state"
      aria-label="Загрузка типов событий"
      aria-busy="true"
    >
      <Skeleton v-for="index in 3" :key="index" width="100%" height="7rem" border-radius="14px" />
    </section>

    <section
      v-else-if="eventTypesQuery.isError.value && !eventTypesQuery.data.value"
      class="error-state"
    >
      <div class="state-mark" aria-hidden="true">!</div>
      <h2>Не удалось загрузить типы событий</h2>
      <p>{{ eventTypesErrorMessage }}</p>
      <Button
        label="Попробовать снова"
        severity="secondary"
        :loading="eventTypesQuery.isFetching.value"
        @click="retryEventTypes"
      />
    </section>

    <template v-else>
      <Message
        v-if="eventTypesQuery.isError.value"
        severity="warn"
        :closable="false"
        class="catalog-warning"
      >
        <div class="warning-content">
          <span>Не удалось обновить каталог. Показаны ранее загруженные данные.</span>
          <Button
            label="Повторить"
            size="small"
            severity="secondary"
            text
            @click="retryEventTypes"
          />
        </div>
      </Message>

      <section v-if="!eventTypesQuery.data.value?.length" class="empty-state">
        <div class="state-mark" aria-hidden="true">○</div>
        <h2>Нет доступных типов событий</h2>
        <p>Владелец календаря пока не добавил встречи для бронирования.</p>
      </section>

      <section v-else class="event-types" aria-label="Доступные типы событий">
        <RouterLink
          v-for="eventType in eventTypesQuery.data.value"
          :key="eventType.id"
          :to="{ name: 'event-booking', params: { eventTypeId: eventType.id } }"
          class="event-card"
        >
          <div class="event-details">
            <h2>{{ eventType.title }}</h2>
            <p>{{ eventType.description }}</p>
          </div>
          <span class="duration">{{ eventType.durationMinutes }} мин</span>
        </RouterLink>
      </section>
    </template>
  </main>
</template>

<style scoped>
.public-page {
  width: min(720px, 100%);
  min-height: 100vh;
  margin: 0 auto;
  padding: clamp(3rem, 8vw, 6rem) 1.25rem;
}

.page-header {
  margin-bottom: 2rem;
  text-align: center;
}

.page-header :deep(.p-skeleton) {
  margin: 0 auto 0.85rem;
}

.owner-name {
  margin: 0 0 0.85rem;
  color: #525252;
  font-size: 0.9rem;
  font-weight: 650;
}

h1 {
  margin: 0;
  font-size: clamp(1.8rem, 5vw, 2.5rem);
  letter-spacing: -0.04em;
}

.page-description {
  margin: 0.75rem 0 0;
  color: #737373;
  line-height: 1.5;
}

.owner-warning,
.catalog-warning {
  margin-bottom: 1rem;
}

.warning-content {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.loading-state,
.event-types {
  display: grid;
  gap: 0.85rem;
}

.event-card {
  display: flex;
  min-height: 112px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.4rem 1.5rem;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 3%);
  color: inherit;
  text-decoration: none;
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}

.event-card:hover {
  border-color: #b5b5b9;
  box-shadow: 0 8px 24px rgb(0 0 0 / 7%);
  transform: translateY(-1px);
}

.event-card:focus-visible {
  outline: 3px solid rgb(23 23 23 / 20%);
  outline-offset: 2px;
}

.event-details {
  min-width: 0;
}

.event-details h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 650;
}

.event-details p {
  margin: 0.5rem 0 0;
  color: #737373;
  line-height: 1.5;
}

.duration {
  flex: 0 0 auto;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  background: #f3f3f3;
  color: #525252;
  font-size: 0.78rem;
  font-weight: 650;
  white-space: nowrap;
}

.empty-state,
.error-state {
  display: grid;
  min-height: 320px;
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

@media (max-width: 560px) {
  .public-page {
    padding-top: 2.5rem;
  }

  .event-card,
  .warning-content {
    align-items: flex-start;
    flex-direction: column;
  }

  .event-card {
    gap: 0.85rem;
    padding: 1.2rem;
  }
}
</style>
