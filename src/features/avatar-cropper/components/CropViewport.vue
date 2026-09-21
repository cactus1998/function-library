<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import type { Cropper } from '../composables/useCropper'
import type { LoadedImage } from '../types'

const props = defineProps<{ image: LoadedImage; size: number; cropper: Cropper }>()

const frame = useTemplateRef<HTMLDivElement>('frame')
defineExpose({ frame })

const zoomPercent = computed(() => Math.round(props.cropper.zoom.value * 100))

function onZoomInput(event: Event) {
  props.cropper.setZoom(Number((event.target as HTMLInputElement).value) / 100)
}

// Vue 的 @wheel 無法指定 passive: false，手動註冊才能 preventDefault 阻止頁面捲動
function onWheel(event: WheelEvent) {
  props.cropper.onWheel(event)
}
onMounted(() => frame.value?.addEventListener('wheel', onWheel, { passive: false }))
onBeforeUnmount(() => frame.value?.removeEventListener('wheel', onWheel))
</script>

<template>
  <div class="viewport">
    <div
      ref="frame"
      class="frame"
      :class="{ dragging: cropper.dragging.value }"
      :style="{ width: `${size}px`, height: `${size}px` }"
      tabindex="0"
      role="group"
      aria-label="裁切區域"
      aria-describedby="crop-help"
      @pointerdown="cropper.onPointerDown"
      @pointermove="cropper.onPointerMove"
      @pointerup="cropper.onPointerUp"
      @pointercancel="cropper.onPointerUp"
      @keydown="cropper.onKeydown"
    >
      <img
        :src="image.url"
        alt=""
        draggable="false"
        :width="image.width"
        :height="image.height"
        :style="{ transform: cropper.transform.value }"
      />
      <div class="mask" aria-hidden="true" />
    </div>
    <p id="crop-help" class="help">拖曳移動、滾輪或雙指縮放；鍵盤：方向鍵移動（Shift 加速）、+ / − 縮放、0 重設</p>

    <label class="zoom">
      <span>縮放</span>
      <input
        type="range"
        min="100"
        max="400"
        step="1"
        :value="zoomPercent"
        :aria-valuetext="`${zoomPercent}%`"
        @input="onZoomInput"
      />
      <output>{{ zoomPercent }}%</output>
    </label>
  </div>
</template>

<style scoped>
.viewport {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
}

.frame {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: #111;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.frame.dragging {
  cursor: grabbing;
}

.frame:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}

img {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  transform-origin: 0 0;
  will-change: transform;
  pointer-events: none;
}

/* 圓形遮罩：以巨大的 box-shadow 蓋住圓外 */
.mask {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: 0 0 0 999px rgb(0 0 0 / 0.55);
  outline: 2px solid rgb(255 255 255 / 0.8);
  outline-offset: -2px;
  pointer-events: none;
}

.help {
  max-width: 20rem;
  margin: 0;
  font-size: 0.75rem;
  text-align: center;
  color: var(--text-muted);
}

.zoom {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: min(100%, 280px);
  font-size: 0.875rem;
}

.zoom input {
  flex: 1;
  min-height: 2.75rem;
  accent-color: var(--accent-solid);
}

.zoom output {
  min-width: 3rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
