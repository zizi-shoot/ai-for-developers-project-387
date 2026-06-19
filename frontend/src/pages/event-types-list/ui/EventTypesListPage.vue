<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import { useRouter } from 'vue-router'

import { useEventTypesList } from '../model/use-event-types-list'

const router = useRouter()
const query = useEventTypesList()

const hasResolvedData = computed(() => query.data.value !== undefined)
const hasEventTypes = computed(() => Boolean(query.data.value?.length))
const errorMessage = computed(
  () => query.error.value?.message || 'Не удалось загрузить типы событий.',
)

function openCreatePage() {
  void router.push({ name: 'event-type-create' })
}

function retry() {
  void query.refetch()
}
</script>

<template>
  <main class="list-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Календарь</p>
        <div class="heading-line">
          <h1>Типы событий</h1>
          <span v-if="query.isFetching.value && hasResolvedData" class="refresh-status">
            Обновляем…
          </span>
        </div>
        <p>Создавайте встречи, которые гости смогут забронировать в вашем календаре.</p>
      </div>
      <Button label="Создать событие" @click="openCreatePage" />
    </header>

    <section
      v-if="query.isPending.value"
      class="loading-state"
      aria-label="Загрузка типов событий"
      aria-busy="true"
    >
      <Skeleton v-for="index in 3" :key="index" width="100%" height="7rem" border-radius="14px" />
    </section>

    <section v-else-if="query.isError.value && !hasResolvedData" class="error-state">
      <div class="state-mark" aria-hidden="true">!</div>
      <h2>Не удалось загрузить типы событий</h2>
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

      <section v-if="!hasEventTypes" class="empty-state">
        <div class="state-mark" aria-hidden="true">+</div>
        <h2>Здесь появятся ваши события</h2>
        <p>Создайте первый тип события, чтобы гости могли выбрать время встречи.</p>
        <Button label="Создать первое событие" severity="secondary" @click="openCreatePage" />
      </section>

      <section v-else class="event-types" aria-label="Типы событий">
        <article v-for="eventType in query.data.value" :key="eventType.id" class="event-card">
          <div class="event-details">
            <h2>{{ eventType.title }}</h2>
            <p>{{ eventType.description }}</p>
          </div>
          <span class="duration">{{ eventType.durationMinutes }} мин</span>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.list-page {
  width: min(1040px, 100%);
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
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

h1 {
  margin: 0;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  letter-spacing: -0.035em;
}

.heading-line {
  display: flex;
  align-items: baseline;
  gap: 0.8rem;
}

.refresh-status {
  color: #737373;
  font-size: 0.78rem;
}

.page-header p:last-child,
.empty-state p {
  color: #737373;
  line-height: 1.5;
}

.page-header p:last-child {
  margin: 0.65rem 0 0;
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
  font-size: 1.5rem;
}

.empty-state h2,
.error-state h2 {
  margin: 0;
  font-size: 1.05rem;
}

.empty-state p,
.error-state p {
  margin: 0.5rem 0 1.25rem;
}

.refresh-error {
  margin-bottom: 1.5rem;
}

.refresh-error-content {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

@media (max-width: 640px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .page-header :deep(.p-button) {
    width: 100%;
  }

  .event-card,
  .refresh-error-content {
    align-items: flex-start;
    flex-direction: column;
  }

  .event-card {
    gap: 0.85rem;
    padding: 1.2rem;
  }
}
</style>
