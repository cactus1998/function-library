<script setup lang="ts">
import { nextTick, shallowRef, useId, useTemplateRef } from 'vue'

const { showGrid = false, debugBoxes = false } = defineProps<{
  showGrid?: boolean
  debugBoxes?: boolean
}>()

const navId = useId()
const menuOpen = shallowRef(false)
const toggleButton = useTemplateRef<HTMLButtonElement>('toggle')

async function closeMenu() {
  if (!menuOpen.value) return
  menuOpen.value = false
  await nextTick()
  toggleButton.value?.focus()
}

const email = shallowRef('')
const subscribed = shallowRef(false)

function subscribe() {
  subscribed.value = true
}

interface Product {
  id: string
  name: string
  note: string
  price: number
  tone: string
}

const products: Product[] = [
  { id: 'ethiopia', name: '衣索比亞 耶加雪菲', note: '柑橘、茉莉、紅茶尾韻', price: 420, tone: 'linear-gradient(135deg, #f1c27d, #c8753a)' },
  { id: 'kenya', name: '肯亞 AA', note: '黑醋栗、番茄、明亮酸質', price: 460, tone: 'linear-gradient(135deg, #d98c6a, #8e3b2b)' },
  { id: 'colombia', name: '哥倫比亞 慧蘭', note: '焦糖、堅果、柔和甜感', price: 380, tone: 'linear-gradient(135deg, #c9a57a, #6f4a2e)' },
  { id: 'blend', name: '晨霧 招牌配方', note: '可可、黑糖、厚實口感', price: 350, tone: 'linear-gradient(135deg, #9b7b61, #3b2a20)' },
]

const features = [
  { title: '產地直送', body: '與 12 座莊園直接合作，每批生豆附產區與處理法履歷。' },
  { title: '48 小時內烘焙', body: '接單後才烘焙，出貨時仍在最佳賞味期的起點。' },
  { title: '訂閱彈性', body: '每月、雙週或單次購買，隨時暫停，不綁約。' },
]

const priceFormat = new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 })
</script>

<template>
  <div class="landing-root">
    <div class="landing" :class="{ debug: debugBoxes }" @keydown.esc="closeMenu">
      <header class="site-header">
        <div class="wrap header-inner">
          <a href="#top" class="logo" @click.prevent>晨霧咖啡</a>

          <button
            ref="toggle"
            type="button"
            class="nav-toggle"
            :aria-expanded="menuOpen"
            :aria-controls="navId"
            @click="menuOpen = !menuOpen"
          >
            <span class="bars" aria-hidden="true" />
            <span class="visually-hidden">主選單</span>
          </button>

          <nav :id="navId" class="nav" :class="{ open: menuOpen }" aria-label="主選單">
            <ul>
              <li><a href="#beans" @click.prevent="menuOpen = false">咖啡豆</a></li>
              <li><a href="#story" @click.prevent="menuOpen = false">品牌故事</a></li>
              <li><a href="#subscribe" @click.prevent="menuOpen = false">訂閱</a></li>
              <li><a href="#contact" class="nav-cta" @click.prevent="menuOpen = false">門市據點</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        <section class="hero" aria-labelledby="hero-title">
          <div class="wrap hero-inner">
            <div class="hero-copy">
              <p class="eyebrow">Morning Mist Coffee Roasters</p>
              <h1 id="hero-title">每一杯，<br />都從清晨的山霧開始</h1>
              <p class="lead">精選單一產區咖啡豆，小批次烘焙，48 小時內送到你家門口。</p>
              <div class="hero-actions">
                <a href="#beans" class="btn btn-primary" @click.prevent>選購咖啡豆</a>
                <a href="#story" class="btn btn-ghost" @click.prevent>認識我們</a>
              </div>
            </div>

            <figure class="hero-art" aria-hidden="true">
              <svg viewBox="0 0 320 280" role="presentation">
                <ellipse cx="160" cy="250" rx="120" ry="16" fill="#e6dacb" />
                <path d="M70 110h160v70a70 70 0 0 1-70 70h-20a70 70 0 0 1-70-70z" fill="#2b1d14" />
                <path d="M230 130h18a30 30 0 0 1 0 60h-22" fill="none" stroke="#2b1d14" stroke-width="14" />
                <ellipse cx="150" cy="110" rx="80" ry="14" fill="#6f4a2e" />
                <path d="M120 80c-12-20 12-30 0-52M160 80c-12-20 12-30 0-52M200 80c-12-20 12-30 0-52" fill="none" stroke="#c8a98a" stroke-width="6" stroke-linecap="round" />
              </svg>
            </figure>
          </div>
        </section>

        <section id="story" class="features" aria-labelledby="features-title">
          <div class="wrap">
            <h2 id="features-title" class="section-heading">為什麼選擇晨霧</h2>
            <ul class="feature-grid">
              <li v-for="(item, i) in features" :key="item.title" class="feature">
                <span class="feature-index" aria-hidden="true">0{{ i + 1 }}</span>
                <h3>{{ item.title }}</h3>
                <p>{{ item.body }}</p>
              </li>
            </ul>
          </div>
        </section>

        <section id="beans" class="products" aria-labelledby="products-title">
          <div class="wrap">
            <h2 id="products-title" class="section-heading">本月推薦</h2>
            <ul class="product-grid">
              <li v-for="product in products" :key="product.id">
                <article class="product">
                  <div class="product-photo" :style="{ backgroundImage: product.tone }" role="img" :aria-label="`${product.name} 包裝示意`" />
                  <div class="product-body">
                    <h3>{{ product.name }}</h3>
                    <p class="product-note">{{ product.note }}</p>
                    <p class="product-price">
                      {{ priceFormat.format(product.price) }}<span class="unit"> / 半磅</span>
                    </p>
                  </div>
                </article>
              </li>
            </ul>
          </div>
        </section>

        <section class="quote" aria-label="顧客評價">
          <div class="wrap">
            <figure>
              <blockquote>
                <p>「訂閱半年，每次開封的香氣都讓早晨變得值得期待。耶加雪菲的柑橘調是我的最愛。」</p>
              </blockquote>
              <figcaption>— 林小姐，台北・訂閱會員</figcaption>
            </figure>
          </div>
        </section>

        <section id="subscribe" class="newsletter" aria-labelledby="newsletter-title">
          <div class="wrap newsletter-inner">
            <div>
              <h2 id="newsletter-title" class="section-heading">訂閱烘焙通知</h2>
              <p>新豆上架與限量批次，第一時間寄給你。</p>
            </div>
            <form v-if="!subscribed" class="newsletter-form" @submit.prevent="subscribe">
              <label for="landing-email" class="visually-hidden">Email</label>
              <input id="landing-email" v-model="email" type="email" required autocomplete="email" placeholder="you@example.com" />
              <button type="submit" class="btn btn-primary">訂閱</button>
            </form>
            <p v-else class="newsletter-done" role="status">已訂閱：{{ email }}</p>
          </div>
        </section>
      </main>

      <footer id="contact" class="site-footer">
        <div class="wrap footer-grid">
          <div>
            <p class="logo">晨霧咖啡</p>
            <p>台北市大安區晨霧路 1 號</p>
          </div>
          <nav aria-label="商品">
            <h2 class="footer-title">商品</h2>
            <ul>
              <li><a href="#beans" @click.prevent>單品咖啡豆</a></li>
              <li><a href="#beans" @click.prevent>配方豆</a></li>
              <li><a href="#beans" @click.prevent>濾掛包</a></li>
            </ul>
          </nav>
          <nav aria-label="服務">
            <h2 class="footer-title">服務</h2>
            <ul>
              <li><a href="#subscribe" @click.prevent>訂閱方案</a></li>
              <li><a href="#contact" @click.prevent>企業採購</a></li>
              <li><a href="#contact" @click.prevent>常見問題</a></li>
            </ul>
          </nav>
          <div>
            <h2 class="footer-title">營業時間</h2>
            <p>週一至週五 08:00–18:00<br />週末 09:00–17:00</p>
          </div>
        </div>
        <p class="wrap copyright"><small>© 2026 Morning Mist Coffee Roasters</small></p>
      </footer>

      <div v-if="showGrid" class="grid-overlay" aria-hidden="true">
        <div class="wrap grid-columns">
          <span v-for="n in 12" :key="n" class="grid-col" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * mobile-first：預設即手機版，往上以 min-width 疊加。
 * 斷點與 data/tokens.ts 的 BREAKPOINTS 一致：640px、1024px。
 * 正式頁面把 @container landing 換成 @media 即可。
 */
.landing-root {
  container: landing / inline-size;
}

.landing {
  --l-cream: #f7f1e8;
  --l-paper: #fffdf9;
  --l-ink: #2b1d14;
  --l-muted: #6b5a4e;
  --l-brand: #a5541f;
  --l-brand-hover: #87420f;
  --l-line: #e6dacb;

  --cols: 4;
  --gutter: 16px;
  --margin: 20px;
  --max: 1200px;
  --section-space: 64px;

  position: relative;
  color-scheme: light;
  font: 1rem/1.75 system-ui, -apple-system, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  color: var(--l-ink);
  background: var(--l-cream);
}

@container landing (min-width: 640px) {
  .landing {
    --cols: 8;
    --gutter: 24px;
    --margin: 32px;
    --section-space: 80px;
  }
}

@container landing (min-width: 1024px) {
  .landing {
    --cols: 12;
    --margin: 48px;
    --section-space: 96px;
  }
}

.landing h1,
.landing h2,
.landing h3 {
  font-family: inherit;
  color: var(--l-ink);
  border: 0;
  padding: 0;
}

.landing ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.landing a {
  color: inherit;
}

.wrap {
  max-width: var(--max);
  margin-inline: auto;
  padding-inline: var(--margin);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 24px;
  font-weight: 600;
  border: 2px solid transparent;
  border-radius: 999px;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.2s;
}

.landing .btn-primary {
  color: #fff;
  background: var(--l-brand);
}

.landing .btn-primary:hover {
  background: var(--l-brand-hover);
  text-decoration: none;
}

.btn-ghost {
  border-color: var(--l-ink);
}

.btn-ghost:hover {
  text-decoration: none;
  background: rgba(43, 29, 20, 0.06);
}

.landing :focus-visible {
  outline: 3px solid var(--l-brand);
  outline-offset: 2px;
}

/* ---------- header ---------- */
.site-header {
  position: relative;
  z-index: 2;
  border-bottom: 1px solid var(--l-line);
  background: var(--l-cream);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
}

.logo {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-decoration: none;
}

.nav-toggle {
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
  width: 22px;
  height: 2px;
  background: var(--l-ink);
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
  top: -7px;
}

.bars::after {
  top: 7px;
}

.nav-toggle[aria-expanded='true'] .bars {
  background: transparent;
}

.nav-toggle[aria-expanded='true'] .bars::before {
  transform: translateY(7px) rotate(45deg);
}

.nav-toggle[aria-expanded='true'] .bars::after {
  transform: translateY(-7px) rotate(-45deg);
}

.nav {
  display: none;
}

.nav.open {
  display: block;
  position: absolute;
  top: 100%;
  inset-inline: 0;
  padding: 8px var(--margin) 16px;
  border-bottom: 1px solid var(--l-line);
  background: var(--l-cream);
}

.nav a {
  display: block;
  padding: 10px 0;
  text-decoration: none;
}

.landing .nav-cta {
  font-weight: 700;
  color: var(--l-brand);
}

@container landing (min-width: 640px) {
  .nav-toggle {
    display: none;
  }

  .nav,
  .nav.open {
    display: block;
    position: static;
    padding: 0;
    border: 0;
  }

  .nav ul {
    display: flex;
    align-items: center;
    gap: 28px;
  }

  .nav a {
    padding: 8px 0;
  }

  .nav a:hover {
    color: var(--l-brand);
  }
}

/* ---------- hero ---------- */
.hero {
  padding-block: 48px var(--section-space);
}

.hero-inner {
  display: grid;
  gap: 32px;
  align-items: center;
}

.eyebrow {
  margin-bottom: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--l-brand);
}

.hero h1 {
  margin: 0 0 16px;
  font-size: clamp(2rem, 1.2rem + 4cqi, 3.75rem);
  line-height: 1.2;
  letter-spacing: 0.02em;
}

.lead {
  max-width: 32em;
  font-size: 1.125rem;
  color: var(--l-muted);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.hero-art {
  margin: 0;
  justify-self: center;
  width: min(100%, 360px);
}

.hero-art svg {
  display: block;
  width: 100%;
  height: auto;
}

@container landing (min-width: 1024px) {
  .hero {
    padding-top: 72px;
  }

  .hero-inner {
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    column-gap: var(--gutter);
  }

  .hero-copy {
    grid-column: 1 / span 7;
  }

  .hero-art {
    grid-column: 8 / -1;
    width: 100%;
    max-width: 420px;
  }
}

/* ---------- sections ---------- */
.section-heading {
  margin: 0 0 32px;
  font-size: clamp(1.5rem, 1.1rem + 2cqi, 2.25rem);
  line-height: 1.3;
}

.features {
  padding-block: var(--section-space);
  background: var(--l-paper);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: var(--gutter);
}

.feature {
  padding: 24px;
  border: 1px solid var(--l-line);
  border-radius: 16px;
}

.feature-index {
  display: block;
  margin-bottom: 8px;
  font-weight: 800;
  color: var(--l-brand);
}

.feature h3 {
  margin: 0 0 8px;
  font-size: 1.125rem;
}

.feature p {
  color: var(--l-muted);
}

.products {
  padding-block: var(--section-space);
}

/* 手機 1 欄、平板 2 欄、桌機 4 欄 */
.product-grid {
  display: grid;
  gap: var(--gutter);
}

@container landing (min-width: 640px) {
  .product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container landing (min-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.product {
  height: 100%;
  overflow: hidden;
  border-radius: 16px;
  background: var(--l-paper);
  box-shadow: 0 1px 2px rgba(43, 29, 20, 0.08);
}

.product-photo {
  aspect-ratio: 4 / 3;
  background-size: cover;
}

.product-body {
  padding: 16px 20px 20px;
}

.product h3 {
  margin: 0 0 4px;
  font-size: 1.125rem;
}

.product-note {
  font-size: 0.875rem;
  color: var(--l-muted);
}

.product-price {
  margin-top: 12px;
  font-size: 1.125rem;
  font-weight: 700;
}

.unit {
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--l-muted);
}

.quote {
  padding-block: var(--section-space);
  color: #fff;
  background: var(--l-ink);
}

.quote figure {
  max-width: 44em;
  margin: 0 auto;
  text-align: center;
}

.quote blockquote {
  margin: 0 0 16px;
  font-size: clamp(1.125rem, 0.9rem + 1.2cqi, 1.5rem);
  line-height: 1.6;
}

.quote figcaption {
  color: #d9c7b5;
}

.newsletter {
  padding-block: var(--section-space);
}

.newsletter-inner {
  display: grid;
  gap: 24px;
}

.newsletter .section-heading {
  margin-bottom: 8px;
}

.newsletter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

/* 16px 以上，iOS Safari 聚焦時不會自動放大 */
.newsletter-form input {
  flex: 1 1 220px;
  min-width: 0;
  min-height: 44px;
  padding: 0 16px;
  font-size: 1rem;
  color: var(--l-ink);
  border: 1px solid var(--l-line);
  border-radius: 999px;
  background: #fff;
}

.newsletter-done {
  align-self: center;
  font-weight: 600;
  color: var(--l-brand);
}

@container landing (min-width: 1024px) {
  .newsletter-inner {
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    column-gap: var(--gutter);
    align-items: center;
  }

  .newsletter-inner > :first-child {
    grid-column: 1 / span 6;
  }

  .newsletter-inner > :last-child {
    grid-column: 7 / -1;
  }
}

/* ---------- footer ---------- */
.site-footer {
  padding-top: 48px;
  font-size: 0.875rem;
  color: #d9c7b5;
  background: #1e140e;
}

.site-footer .logo {
  margin-bottom: 8px;
  color: #fff;
}

.footer-grid {
  display: grid;
  gap: 32px;
}

@container landing (min-width: 640px) {
  .footer-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container landing (min-width: 1024px) {
  .footer-grid {
    grid-template-columns: 2fr repeat(3, minmax(0, 1fr));
  }
}

.landing .footer-title {
  margin: 0 0 8px;
  font-size: 0.875rem;
  color: #fff;
}

.site-footer a {
  display: inline-block;
  padding: 4px 0;
  text-decoration: none;
}

.site-footer a:hover {
  color: #fff;
}

.copyright {
  margin-top: 32px;
  padding-block: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* ---------- 除錯工具 ---------- */
.grid-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
}

.grid-columns {
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: var(--gutter);
  height: 100%;
}

.grid-col {
  background: rgba(239, 68, 68, 0.12);
  border-inline: 1px solid rgba(239, 68, 68, 0.3);
}

.grid-col:nth-child(n + 5) {
  display: none;
}

@container landing (min-width: 640px) {
  .grid-col:nth-child(n + 5) {
    display: block;
  }

  .grid-col:nth-child(n + 9) {
    display: none;
  }
}

@container landing (min-width: 1024px) {
  .grid-col:nth-child(n + 9) {
    display: block;
  }
}

.debug :deep(*) {
  outline: 1px solid rgba(37, 99, 235, 0.45);
}
</style>
