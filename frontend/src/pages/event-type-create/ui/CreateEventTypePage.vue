<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'

import { eventDurations, type EventDurationMinutes } from '../model/types'
import { useCreateEventType } from '../model/use-create-event-type'

const router = useRouter()
const toast = useToast()
const mutation = useCreateEventType()

const title = ref('')
const description = ref('')
const durationMinutes = ref<EventDurationMinutes>(30)
const submitted = ref(false)
const touched = reactive({ title: false, description: false })

const durationOptions = eventDurations.map((duration) => ({
  label: `${duration} минут`,
  value: duration,
}))

const titleError = computed(() =>
  (submitted.value || touched.title) && !title.value.trim() ? 'Введите название события' : '',
)
const descriptionError = computed(() =>
  (submitted.value || touched.description) && !description.value.trim()
    ? 'Добавьте описание события'
    : '',
)

async function submitForm() {
  if (mutation.isPending.value) return

  submitted.value = true
  if (titleError.value || descriptionError.value) return

  try {
    await mutation.mutateAsync({
      title: title.value.trim(),
      description: description.value.trim(),
      durationMinutes: durationMinutes.value,
    })

    toast.add({
      severity: 'success',
      summary: 'Событие создано',
      detail: 'Новый тип события готов для бронирования.',
      life: 4000,
    })
    await router.push({ name: 'event-types-list' })
  } catch {
    // Сообщение об ошибке отображается из состояния mutation ниже формы.
  }
}

function cancel() {
  void router.push({ name: 'event-types-list' })
}
</script>

<template>
  <main class="create-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Типы событий</p>
        <h1>Создать событие</h1>
        <p class="page-description">
          Настройте встречу, которую гости смогут выбрать и забронировать.
        </p>
      </div>
    </header>

    <form class="event-form" novalidate @submit.prevent="submitForm">
      <section class="form-section" aria-labelledby="event-details-heading">
        <div class="section-copy">
          <h2 id="event-details-heading">Основная информация</h2>
          <p>Эти данные будут видны гостям на странице бронирования.</p>
        </div>

        <div class="fields">
          <div class="field">
            <label for="event-title">Название</label>
            <InputText
              id="event-title"
              v-model="title"
              :invalid="Boolean(titleError)"
              :disabled="mutation.isPending.value"
              aria-describedby="event-title-help event-title-error"
              placeholder="Например, Консультация"
              fluid
              @blur="touched.title = true"
            />
            <small id="event-title-help" class="field-help">Короткое и понятное название.</small>
            <small v-if="titleError" id="event-title-error" class="field-error">{{
              titleError
            }}</small>
          </div>

          <div class="field">
            <label for="event-description">Описание</label>
            <Textarea
              id="event-description"
              v-model="description"
              :invalid="Boolean(descriptionError)"
              :disabled="mutation.isPending.value"
              aria-describedby="event-description-help event-description-error"
              placeholder="Расскажите, чему будет посвящена встреча"
              rows="5"
              fluid
              @blur="touched.description = true"
            />
            <small id="event-description-help" class="field-help">
              Помогите гостю понять, чего ожидать от встречи.
            </small>
            <small v-if="descriptionError" id="event-description-error" class="field-error">
              {{ descriptionError }}
            </small>
          </div>
        </div>
      </section>

      <section class="form-section" aria-labelledby="duration-heading">
        <div class="section-copy">
          <h2 id="duration-heading">Длительность</h2>
          <p>Укажите, сколько времени займёт одна встреча.</p>
        </div>

        <div class="fields">
          <div class="field field--compact">
            <label for="event-duration">Длительность</label>
            <Select
              v-model="durationMinutes"
              input-id="event-duration"
              aria-label="Длительность"
              :options="durationOptions"
              option-label="label"
              option-value="value"
              :disabled="mutation.isPending.value"
              fluid
            />
          </div>
        </div>
      </section>

      <Message v-if="mutation.isError.value" severity="error" :closable="false">
        {{ mutation.error.value?.message || 'Не удалось создать событие.' }}
      </Message>

      <footer class="form-actions">
        <Button
          type="button"
          label="Отмена"
          severity="secondary"
          variant="outlined"
          :disabled="mutation.isPending.value"
          @click="cancel"
        />
        <Button
          type="submit"
          :label="mutation.isPending.value ? 'Создание…' : 'Создать событие'"
          :loading="mutation.isPending.value"
          :disabled="mutation.isPending.value"
        />
      </footer>
    </form>
  </main>
</template>

<style scoped>
.create-page {
  width: min(920px, 100%);
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

h1 {
  margin: 0;
  color: #171717;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  letter-spacing: -0.035em;
}

.page-description {
  max-width: 580px;
  margin: 0.65rem 0 0;
  color: #666;
  line-height: 1.55;
}

.event-form {
  overflow: hidden;
  border: 1px solid #e4e4e7;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 3%);
}

.form-section {
  display: grid;
  grid-template-columns: minmax(190px, 0.7fr) minmax(0, 1.3fr);
  gap: 3rem;
  padding: 2rem;
  border-bottom: 1px solid #ededed;
}

.section-copy h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 650;
}

.section-copy p {
  margin: 0.5rem 0 0;
  color: #737373;
  font-size: 0.875rem;
  line-height: 1.5;
}

.fields,
.field {
  display: grid;
  gap: 0.6rem;
}

.fields {
  gap: 1.5rem;
}

.field label {
  color: #262626;
  font-size: 0.875rem;
  font-weight: 600;
}

.field--compact {
  max-width: 240px;
}

.field-help,
.field-error {
  font-size: 0.78rem;
  line-height: 1.35;
}

.field-help {
  color: #737373;
}

.field-error {
  color: #dc2626;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 2rem;
  background: #fafafa;
}

.event-form > :deep(.p-message) {
  margin: 1.25rem 2rem 0;
}

@media (max-width: 720px) {
  .form-section {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 1.35rem;
  }

  .form-actions {
    padding: 1rem 1.35rem;
  }

  .field--compact {
    max-width: none;
  }

  .event-form > :deep(.p-message) {
    margin: 1rem 1.35rem 0;
  }
}
</style>
