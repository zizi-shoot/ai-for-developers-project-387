<script setup lang="ts">
import Button from 'primevue/button'
import { useRouter } from 'vue-router'

const router = useRouter()

function openCreatePage() {
  void router.push({ name: 'event-type-create' })
}
</script>

<template>
  <main class="list-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Календарь</p>
        <h1>Типы событий</h1>
        <p>Создавайте встречи, которые гости смогут забронировать в вашем календаре.</p>
      </div>
      <Button label="Создать событие" @click="openCreatePage" />
    </header>

    <section class="empty-state">
      <div class="empty-mark" aria-hidden="true">+</div>
      <h2>Здесь появятся ваши события</h2>
      <p>Список типов событий будет добавлен на следующем этапе.</p>
      <Button label="Создать первое событие" severity="secondary" @click="openCreatePage" />
    </section>
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

.page-header p:last-child,
.empty-state p {
  color: #737373;
  line-height: 1.5;
}

.page-header p:last-child {
  margin: 0.65rem 0 0;
}

.empty-state {
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

.empty-mark {
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

.empty-state h2 {
  margin: 0;
  font-size: 1.05rem;
}

.empty-state p {
  margin: 0.5rem 0 1.25rem;
}

@media (max-width: 640px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .page-header :deep(.p-button) {
    width: 100%;
  }
}
</style>
