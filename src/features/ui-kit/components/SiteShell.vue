<script setup lang="ts">
import { nextTick, onScopeDispose, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useMediaQuery, usePrefersReducedMotion } from '../composables/useMediaQuery'

/** 與 CSS 的 @media 斷點一致 */
const DESKTOP_QUERY = '(min-width: 720px)'

const uid = useId()
const scroller = useTemplateRef<HTMLElement>('scroller')
const sentinel = useTemplateRef<HTMLElement>('sentinel')
const hero = useTemplateRef<HTMLElement>('hero')
const header = useTemplateRef<HTMLElement>('header')
const toggle = useTemplateRef<HTMLButtonElement>('toggle')
const topHeading = useTemplateRef<HTMLElement>('topHeading')

const scrolled = shallowRef(false)
const showBackToTop = shallowRef(false)
const menuOpen = shallowRef(false)

const isDesktop = useMediaQuery(DESKTOP_QUERY)
const reducedMotion = usePrefersReducedMotion()

/**
 * 以 IntersectionObserver 取代 scroll 事件：
 * - 頂端的 1px 哨兵離開畫面，代表已經往下捲，header 加上陰影並縮小
 * - Hero 完全離開畫面後才顯示「回到頂部」
 */
watch(
  [scroller, sentinel, hero],
  ([root, sentinelEl, heroEl], _prev, onCleanup) => {
    if (!root || !sentinelEl || !heroEl) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === sentinelEl) scrolled.value = !entry.isIntersecting
          if (entry.target === heroEl) showBackToTop.value = !entry.isIntersecting
        }
      },
      { root },
    )
    observer.observe(sentinelEl)
    observer.observe(heroEl)
    onCleanup(() => observer.disconnect())
  },
  { immediate: true, flush: 'post' },
)

/** 切到桌機寬度時選單改為常駐顯示，關閉手機選單狀態，避免縮回手機寬度時選單突然展開 */
watch(isDesktop, (desktop) => {
  if (desktop) menuOpen.value = false
})

async function closeMenu(returnFocus: boolean) {
  if (!menuOpen.value) return
  menuOpen.value = false
  if (returnFocus) {
    await nextTick()
    toggle.value?.focus()
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (menuOpen.value && !header.value?.contains(event.target as Node)) void closeMenu(false)
}
document.addEventListener('pointerdown', onDocumentPointerDown)
onScopeDispose(() => document.removeEventListener('pointerdown', onDocumentPointerDown))

function backToTop() {
  scroller.value?.scrollTo({ top: 0, behavior: reducedMotion.value ? 'auto' : 'smooth' })
  // 焦點移回頁首，鍵盤使用者不必再從按鈕位置 Tab 回去
  topHeading.value?.focus({ preventScroll: true })
}

const sections = [
  { id: 'menu', title: '菜單', body: '單品手沖、義式咖啡與季節特調。' },
  { id: 'beans', title: '咖啡豆', body: '12 款單品與 3 款配方豆，每週烘焙。' },
  { id: 'stores', title: '門市', body: '台北、台中、高雄共 6 間門市。' },
  { id: 'about', title: '關於我們', body: '2016 年從一台小烘豆機開始。' },
]
</script>

<template>
  <div class="shell">
    <div ref="scroller" class="scroller" tabindex="0" role="region" aria-label="模擬網頁（可捲動）">
      <div ref="sentinel" class="sentinel" aria-hidden="true" />

      <header ref="header" class="header" :class="{ scrolled }" @keydown.esc="closeMenu(true)">
        <a href="#" class="logo" @click.prevent>晨霧咖啡</a>
        <button
          ref="toggle"
          type="button"
          class="menu-toggle"
          :aria-expanded="menuOpen"
          :aria-controls="`${uid}-nav`"
          @click="menuOpen = !menuOpen"
        >
          <span class="bars" aria-hidden="true" />
          <span class="visually-hidden">選單</span>
        </button>
        <nav :id="`${uid}-nav`" class="nav" :class="{ open: menuOpen }" aria-label="模擬網頁主選單">
          <ul>
            <li v-for="s in sections" :key="s.id">
              <a href="#" @click.prevent="closeMenu(false)">{{ s.title }}</a>
            </li>
          </ul>
        </nav>
      </header>

      <main class="content">
        <section ref="hero" class="hero">
          <h4 ref="topHeading" tabindex="-1">每一杯，都從清晨的山霧開始</h4>
          <p>往下捲動，看 header 變化與「回到頂部」按鈕出現。</p>
        </section>
        <section v-for="s in sections" :key="s.id" class="section">
          <h4>{{ s.title }}</h4>
          <p>{{ s.body }}</p>
          <p class="filler">這一段是用來撐出捲動距離的內容。實際專案中這裡會是商品列表、門市資訊或文章內容。</p>
        </section>
      </main>
    </div>

    <Transition name="fade">
      <button v-show="showBackToTop" type="button" class="back-to-top" aria-label="回到頂部" @click="backToTop">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 10l5-5 5 5" /></svg>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.shell {
  position: relative;
}

/* 用一個可捲動的容器模擬瀏覽器視窗 */
.scroller {
  height: 420px;
  overflow-y: auto;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg);
}

.sentinel {
  height: 1px;
  margin-bottom: -1px;
}

.header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 1rem;
  border-bottom: 1px solid transparent;
  background: var(--bg);
  transition:
    height 0.2s,
    box-shadow 0.2s;
}

.header.scrolled {
  height: 48px;
  border-bottom-color: var(--border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.logo {
  font-weight: 800;
  color: var(--text-h);
}

.menu-toggle {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.bars,
.bars::before,
.bars::after {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--text-h);
  transition: transform 0.2s;
}

.bars {
  position: relative;
}

.bars::before,
.bars::after {
  content: '';
  position: absolute;
  left: 0;
}

.bars::before {
  top: -6px;
}

.bars::after {
  top: 6px;
}

.menu-toggle[aria-expanded='true'] .bars {
  background: transparent;
}

.menu-toggle[aria-expanded='true'] .bars::before {
  transform: translateY(6px) rotate(45deg);
}

.menu-toggle[aria-expanded='true'] .bars::after {
  transform: translateY(-6px) rotate(-45deg);
}

.nav {
  display: none;
}

.nav.open {
  display: block;
  position: absolute;
  top: 100%;
  inset-inline: 0;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
}

.nav ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.nav a {
  display: block;
  padding: 0.5rem 0;
  color: var(--text);
}

@media (min-width: 720px) {
  .menu-toggle {
    display: none;
  }

  .nav,
  .nav.open {
    display: block;
    position: static;
    padding: 0;
    border: 0;
    box-shadow: none;
  }

  .nav ul {
    display: flex;
    gap: 1.25rem;
  }
}

.hero {
  display: grid;
  align-content: center;
  min-height: 220px;
  padding: 1.5rem;
  color: var(--on-accent);
  background: linear-gradient(135deg, #8b85ff, #564dff);
}

.hero h4 {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
  color: inherit;
}

.hero h4:focus {
  outline: none;
}

.section {
  padding: 1.25rem 1rem;
  border-bottom: 1px solid var(--border);
}

.section h4 {
  margin: 0 0 0.25rem;
}

.filler {
  margin-top: 0.5rem;
  min-height: 80px;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.back-to-top {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  color: var(--on-accent);
  border: 0;
  border-radius: 50%;
  background: var(--accent-solid);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.back-to-top svg {
  width: 1.125rem;
  height: 1.125rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
