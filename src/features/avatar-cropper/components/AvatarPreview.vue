<script setup lang="ts">
import type { CropState, LoadedImage } from '../types'

const props = defineProps<{ image: LoadedImage; crop: CropState; viewport: number }>()

const SIZES = [128, 64, 32]

/** 預覽不重繪 canvas：把裁切框的 transform 等比縮小到預覽尺寸 */
function transformFor(size: number): string {
  const k = size / props.viewport
  return `translate3d(${props.crop.x * k}px, ${props.crop.y * k}px, 0) scale(${props.crop.scale * k})`
}
</script>

<template>
  <section class="previews" aria-labelledby="preview-title">
    <h3 id="preview-title">預覽</h3>
    <ul>
      <li v-for="size in SIZES" :key="size">
        <div class="avatar" :style="{ width: `${size}px`, height: `${size}px` }">
          <img
            :src="image.url"
            :alt="`${size}px 預覽`"
            :width="image.width"
            :height="image.height"
            :style="{ transform: transformFor(size) }"
          />
        </div>
        <span>{{ size }}px</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

ul {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: grid;
  justify-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.avatar {
  position: relative;
  overflow: hidden;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--border);
}

img {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  transform-origin: 0 0;
}
</style>
