<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { useDesignOverlay } from '../composables/useDesignOverlay'
import { useElementSize } from '../composables/useElementSize'
import { breakpointFor, VIEWPORT_MAX, VIEWPORT_MIN, VIEWPORT_PRESETS } from '../data/tokens'
import LandingPage from './LandingPage.vue'

const viewportWidth = shallowRef(375)
const showGrid = shallowRef(false)
const debugBoxes = shallowRef(false)

const breakpoint = computed(() => breakpointFor(viewportWidth.value))

const stage = useTemplateRef<HTMLElement>('stage')
const frame = useTemplateRef<HTMLElement>('frame')
const { width: stageWidth } = useElementSize(stage)
const { height: frameHeight } = useElementSize(frame)

/** 模擬寬度大於可用空間時等比例縮小；只縮不放大 */
const scale = computed(() => (stageWidth.value > 0 ? Math.min(1, stageWidth.value / viewportWidth.value) : 1))

/** 窄於可用空間時置中 */
const frameLeft = computed(() => Math.max(0, (stageWidth.value - viewportWidth.value * scale.value) / 2))

const overlay = useDesignOverlay()
const { image, opacity, blend, density, visible, cssWidth } = overlay

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void overlay.load(file)
  // 允許重新選同一個檔案
  input.value = ''
}

function matchDesignWidth() {
  if (cssWidth.value > 0) {
    viewportWidth.value = Math.round(Math.min(VIEWPORT_MAX, Math.max(VIEWPORT_MIN, cssWidth.value)))
  }
}
</script>

<template>
  <section class="simulator" aria-labelledby="sim-title">
    <h3 id="sim-title" class="visually-hidden">視窗模擬器</h3>

    <div class="toolbar">
      <div class="presets" role="group" aria-label="預設寬度">
        <button
          v-for="preset in VIEWPORT_PRESETS"
          :key="preset.width"
          type="button"
          :aria-pressed="viewportWidth === preset.width"
          @click="viewportWidth = preset.width"
        >
          {{ preset.label }} <span class="num">{{ preset.width }}</span>
        </button>
      </div>

      <label class="range">
        <span>寬度 <output class="num">{{ viewportWidth }}px</output></span>
        <input v-model.number="viewportWidth" type="range" :min="VIEWPORT_MIN" :max="VIEWPORT_MAX" step="1" />
      </label>

      <p class="status" aria-live="polite">
        斷點 <strong>{{ breakpoint.id }}</strong>（{{ breakpoint.label }}）・{{ breakpoint.columns }} 欄
        <template v-if="scale < 1">・縮放 {{ Math.round(scale * 100) }}%</template>
      </p>

      <div class="switches">
        <label><input v-model="showGrid" type="checkbox" /> 格線疊圖</label>
        <label><input v-model="debugBoxes" type="checkbox" /> 顯示盒模型</label>
      </div>
    </div>

    <details class="overlay-panel">
      <summary>設計稿疊圖比對{{ image ? `：${image.name}` : '' }}</summary>
      <div class="overlay-body">
        <p class="hint">
          上傳 Photoshop／Illustrator 匯出的 PNG、JPG。圖片以左上角對齊頁面，依倍率換算成 CSS px。
        </p>
        <div class="overlay-row">
          <label class="file-btn">
            選擇設計稿
            <input type="file" accept="image/png,image/jpeg,image/webp" class="visually-hidden" @change="onFile" />
          </label>
          <template v-if="image">
            <button type="button" @click="matchDesignWidth">寬度設為設計稿 {{ Math.round(cssWidth) }}px</button>
            <button type="button" @click="overlay.clear">移除</button>
          </template>
        </div>
        <p v-if="overlay.error.value" class="callout danger" role="alert">{{ overlay.error.value }}</p>

        <div v-if="image" class="overlay-row">
          <label><input v-model="visible" type="checkbox" /> 顯示</label>
          <label>
            倍率
            <select v-model.number="density">
              <option :value="1">@1x</option>
              <option :value="2">@2x</option>
            </select>
          </label>
          <label>
            混合模式
            <select v-model="blend">
              <option value="normal">一般（調透明度）</option>
              <option value="difference">差異（對齊處變黑）</option>
            </select>
          </label>
          <label class="range">
            <span>透明度 <output class="num">{{ Math.round(opacity * 100) }}%</output></span>
            <input v-model.number="opacity" type="range" min="0" max="1" step="0.05" />
          </label>
        </div>
      </div>
    </details>

    <div ref="stage" class="stage" :style="{ height: `${frameHeight * scale}px` }">
      <div
        ref="frame"
        class="frame"
        role="region"
        :aria-label="`Landing Page 預覽，寬度 ${viewportWidth}px`"
        :style="{ width: `${viewportWidth}px`, left: `${frameLeft}px`, transform: `scale(${scale})` }"
      >
        <LandingPage :show-grid="showGrid" :debug-boxes="debugBoxes" />
        <img
          v-if="image && visible"
          :src="image.url"
          alt=""
          class="design-overlay"
          :style="{ width: `${cssWidth}px`, opacity: blend === 'difference' ? 1 : opacity, mixBlendMode: blend }"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.simulator {
  display: grid;
  gap: 0.75rem;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

button,
.file-btn {
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

button[aria-pressed='true'] {
  color: var(--on-accent);
  border-color: var(--accent-solid);
  background: var(--accent-solid);
}

.file-btn:focus-within {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.num {
  font-family: var(--mono);
  font-size: 0.8125rem;
}

.range {
  display: grid;
  gap: 0.125rem;
}

.range input {
  width: min(220px, 60vw);
}

.status {
  color: var(--text-muted);
}

.status strong {
  font-family: var(--mono);
  color: var(--accent);
}

.switches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.overlay-panel {
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.overlay-panel summary {
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.overlay-body {
  display: grid;
  gap: 0.75rem;
  padding: 0 1rem 1rem;
}

.hint {
  color: var(--text-muted);
}

.overlay-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}

select {
  margin-left: 0.25rem;
  padding: 0.125rem 0.25rem;
  font-size: 0.8125rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
}

/* stage 高度 = frame 實際高度 × 縮放比，縮放後下方不留空白 */
.stage {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: repeating-conic-gradient(var(--surface) 0 25%, var(--bg) 0 50%) 0 0 / 16px 16px;
}

.frame {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  box-shadow: 0 0 0 1px var(--border);
}

.design-overlay {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  height: auto;
  pointer-events: none;
}
</style>
