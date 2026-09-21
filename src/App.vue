<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="header">
    <RouterLink to="/" class="brand">Function Library</RouterLink>
  </header>
  <main class="main">
    <RouterView />
  </main>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}

.brand {
  font-weight: 600;
  color: var(--text-h);
  text-decoration: none;
}

.main {
  flex: 1;
  padding: 1.5rem 1rem 3rem;
}

@media (min-width: 768px) {
  .header {
    padding-inline: 2rem;
  }

  .main {
    padding-inline: 2rem;
  }
}
</style>
