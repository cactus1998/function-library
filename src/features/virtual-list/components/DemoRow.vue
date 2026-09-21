<script setup lang="ts">
import type { ListItem } from '../utils/generateItems'

const { item, index, compact } = defineProps<{
  item: ListItem
  index: number
  /** 固定高度模式：內文只顯示一行 */
  compact: boolean
}>()
</script>

<template>
  <div class="demo-row" :class="{ compact }">
    <span class="index">#{{ index }}</span>
    <div class="content">
      <strong class="title">{{ item.title }}</strong>
      <p class="body">{{ item.body || '（無內文）' }}</p>
    </div>
  </div>
</template>

<style scoped>
.demo-row {
  display: flex;
  gap: 0.75rem;
  height: 100%;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
  line-height: 1.4;
}

.index {
  flex: 0 0 3.25rem;
  font-family: var(--mono);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}

.content {
  min-width: 0;
  flex: 1;
}

.title {
  color: var(--text-h);
}

.compact {
  align-items: center;
  padding-block: 0;
}

.compact .content {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
}

.compact .title {
  flex-shrink: 0;
}

.compact .body {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
