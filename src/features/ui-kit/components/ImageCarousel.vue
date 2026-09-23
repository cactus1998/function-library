<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { useCarousel } from '../composables/useCarousel'

interface Slide {
  id: string
  title: string
  body: string
  tone: string
}

const slides: Slide[] = [
  { id: 's1', title: '秋季新品上市', body: '桂花烏龍拿鐵，限定供應至 10 月底。', tone: 'linear-gradient(135deg, #f4b56a, #b4602a)' },
  { id: 's2', title: '訂閱享 85 折', body: '每月新鮮烘焙，隨時暫停不綁約。', tone: 'linear-gradient(135deg, #8b85ff, #3b33c9)' },
  { id: 's3', title: '手沖講座開放報名', body: '名額 20 位，報名即贈單品豆一包。', tone: 'linear-gradient(135deg, #5ec2a0, #1f6e57)' },
  { id: 's4', title: '企業採購方案', body: '辦公室咖啡一站搞定，歡迎來信洽詢。', tone: 'linear-gradient(135deg, #7a8699, #2c3440)' },
]

const track = useTemplateRef<HTMLElement>('track')
const { current, playing, userPaused, goTo, next, prev, togglePlay, onPointerEnter, onPointerLeave, onFocusIn, onFocusOut } =
  useCarousel(track, { count: slides.length })

const uid = useId()
</script>

<template>
  <section
    class="carousel"
    aria-roledescription="carousel"
    aria-label="最新活動"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <!-- 自動播放時不朗讀每次換頁，停止後才以 polite 宣告 -->
    <div :id="`${uid}-track`" ref="track" class="track" :aria-live="playing ? 'off' : 'polite'">
      <div
        v-for="(slide, i) in slides"
        :key="slide.id"
        class="slide"
        role="group"
        aria-roledescription="slide"
        :aria-label="`第 ${i + 1} 張，共 ${slides.length} 張`"
        :style="{ background: slide.tone }"
      >
        <h4>{{ slide.title }}</h4>
        <p>{{ slide.body }}</p>
        <a href="#" class="slide-link" :tabindex="i === current ? 0 : -1" @click.prevent>了解更多</a>
      </div>
    </div>

    <div class="controls">
      <button type="button" class="ctrl" :aria-label="userPaused ? '開始自動播放' : '暫停自動播放'" @click="togglePlay">
        <svg v-if="userPaused" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3l8 5-8 5z" /></svg>
        <svg v-else viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" /></svg>
      </button>
      <button type="button" class="ctrl" aria-label="上一張" :aria-controls="`${uid}-track`" @click="prev">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" class="stroke" /></svg>
      </button>
      <div class="dots">
        <button
          v-for="(slide, i) in slides"
          :key="slide.id"
          type="button"
          class="dot"
          :aria-label="`跳到第 ${i + 1} 張：${slide.title}`"
          :aria-current="i === current ? 'true' : undefined"
          :aria-controls="`${uid}-track`"
          @click="goTo(i)"
        />
      </div>
      <button type="button" class="ctrl" aria-label="下一張" :aria-controls="`${uid}-track`" @click="next">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" class="stroke" /></svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
.carousel {
  display: grid;
  gap: 0.5rem;
}

/* offsetLeft 以 track 為基準，需要 position: relative */
.track {
  position: relative;
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  border-radius: var(--radius-lg);
  scrollbar-width: none;
}

.track::-webkit-scrollbar {
  display: none;
}

.slide {
  flex: 0 0 100%;
  display: grid;
  align-content: end;
  justify-items: start;
  gap: 0.25rem;
  min-height: clamp(180px, 30vw, 280px);
  padding: 1.25rem 1.5rem;
  color: #fff;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.slide h4 {
  margin: 0;
  font-family: var(--display);
  font-size: clamp(1.25rem, 1rem + 1.5vw, 1.75rem);
  color: #fff;
}

.slide-link {
  margin-top: 0.5rem;
  padding: 0.25rem 0.875rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f1f1f;
  border-radius: 999px;
  background: #fff;
}

.slide-link:focus-visible {
  outline-color: #fff;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
}

.ctrl {
  display: inline-grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 1px solid var(--border-strong);
  border-radius: 50%;
  background: var(--bg);
  cursor: pointer;
}

.ctrl svg {
  width: 1rem;
  height: 1rem;
  fill: currentColor;
}

.ctrl .stroke {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
}

.dots {
  display: flex;
}

/* 視覺上是小圓點，點擊範圍維持 24px */
.dot {
  position: relative;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.dot::before {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: var(--border-strong);
  transition: transform 0.2s, background-color 0.2s;
}

.dot[aria-current='true']::before {
  background: var(--accent);
  transform: scale(1.3);
}

@media (prefers-reduced-motion: no-preference) {
  .track {
    scroll-behavior: smooth;
  }
}
</style>
