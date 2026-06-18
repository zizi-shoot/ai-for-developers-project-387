<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
const eventTypesActive = computed(() => route.path.startsWith('/admin/event-types'))
</script>

<template>
  <div class="owner-shell">
    <aside class="sidebar">
      <RouterLink class="brand" :to="{ name: 'event-types-list' }" aria-label="Календарь">
        <span class="brand-mark" aria-hidden="true">C</span>
        <span>Календарь</span>
      </RouterLink>

      <nav class="navigation" aria-label="Навигация владельца">
        <RouterLink
          class="nav-item"
          :class="{ 'nav-item--active': eventTypesActive }"
          :to="{ name: 'event-types-list' }"
        >
          <span class="nav-dot" aria-hidden="true"></span>
          Типы событий
        </RouterLink>
        <span class="nav-item nav-item--disabled" aria-disabled="true">
          <span class="nav-dot" aria-hidden="true"></span>
          Предстоящие встречи
          <small>Скоро</small>
        </span>
      </nav>

      <div class="sidebar-footer">
        <span class="avatar" aria-hidden="true">В</span>
        <div>
          <strong>Владелец</strong>
          <small>Личный календарь</small>
        </div>
      </div>
    </aside>

    <header class="mobile-header">
      <RouterLink class="brand" :to="{ name: 'event-types-list' }">
        <span class="brand-mark" aria-hidden="true">C</span>
        <span>Календарь</span>
      </RouterLink>
      <nav aria-label="Мобильная навигация">
        <RouterLink :to="{ name: 'event-types-list' }">Типы событий</RouterLink>
      </nav>
    </header>

    <div class="content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.owner-shell {
  min-height: 100vh;
}

.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 10;
  display: flex;
  width: 248px;
  flex-direction: column;
  padding: 1.25rem 1rem;
  border-right: 1px solid #e5e5e5;
  background: #fff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: #171717;
  font-size: 0.95rem;
  font-weight: 700;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  background: #171717;
  color: #fff;
  font-size: 0.8rem;
}

.navigation {
  display: grid;
  gap: 0.3rem;
  margin-top: 2rem;
}

.nav-item {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  color: #525252;
  font-size: 0.875rem;
  font-weight: 550;
  text-decoration: none;
}

.nav-item:hover,
.nav-item.router-link-active,
.nav-item--active {
  background: #f3f3f3;
  color: #171717;
}

.nav-dot {
  width: 8px;
  height: 8px;
  border: 1.5px solid currentColor;
  border-radius: 50%;
}

.nav-item--disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.nav-item small {
  margin-left: auto;
  font-size: 0.65rem;
  text-transform: uppercase;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: auto;
  padding: 0.8rem 0.6rem 0;
  border-top: 1px solid #ededed;
}

.avatar {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  background: #f0f0f0;
  color: #525252;
  font-size: 0.75rem;
  font-weight: 700;
}

.sidebar-footer div {
  display: grid;
  gap: 0.15rem;
}

.sidebar-footer strong {
  font-size: 0.8rem;
}

.sidebar-footer small {
  color: #737373;
  font-size: 0.72rem;
}

.content {
  min-height: 100vh;
  margin-left: 248px;
  padding: 3rem clamp(1.5rem, 5vw, 4rem);
}

.mobile-header {
  display: none;
}

@media (max-width: 800px) {
  .sidebar {
    display: none;
  }

  .mobile-header {
    display: flex;
    height: 64px;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0 1rem;
    border-bottom: 1px solid #e5e5e5;
    background: #fff;
  }

  .mobile-header nav a {
    color: #525252;
    font-size: 0.78rem;
    font-weight: 600;
    text-decoration: none;
  }

  .content {
    min-height: calc(100vh - 64px);
    margin-left: 0;
    padding: 2rem 1rem;
  }
}

@media (max-width: 420px) {
  .mobile-header .brand > span:last-child {
    display: none;
  }
}
</style>
