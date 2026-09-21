<script setup lang="ts">
import { useCounterStore } from '../stores/counter'

const counter = useCounterStore()
</script>

<template>
  <section class="about">
    <h1>About</h1>
    <p>count: {{ counter.count }} / double: {{ counter.doubleCount }}</p>
    <button type="button" @click="counter.increment()">Increment</button>
  </section>
</template>

<style scoped>
.about {
  padding: 2rem;
}
</style>
