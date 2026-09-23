<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { detectDateInput, detectFlexGap } from '../data/detections'
import { SNIPPETS } from '../data/snippets'
import CompatCase from './CompatCase.vue'

interface Support {
  aspectRatio: boolean
  flexGap: boolean
  has: boolean
  lineClamp: boolean
  dateInput: boolean
}

const support = shallowRef<Support | null>(null)

onMounted(() => {
  support.value = {
    aspectRatio: CSS.supports('aspect-ratio: 1 / 1'),
    flexGap: detectFlexGap(),
    has: CSS.supports('selector(:has(*))'),
    lineClamp: CSS.supports('-webkit-line-clamp: 2'),
    dateInput: detectDateInput(),
  }
})

const tags = ['RWD', 'HTML5', 'CSS3', 'Ajax', 'Photoshop']

const plans = [
  { id: 'basic', name: '基本', price: 'NT$ 0' },
  { id: 'pro', name: '專業', price: 'NT$ 390' },
]
const selectedPlan = shallowRef('pro')

const longTitle = '中秋連假營業時間調整公告：9/25 至 9/27 門市營業時間改為 10:00–17:00，線上訂單照常出貨，客服回覆時間順延'

const dateValue = shallowRef('')
const dateError = shallowRef('')

function checkDate(event: Event) {
  const input = event.target as HTMLInputElement
  dateError.value = input.validity.patternMismatch ? '請輸入 YYYY-MM-DD，例如 2026-09-23' : ''
}
</script>

<template>
  <div class="cases">
    <CompatCase title="aspect-ratio 與 padding hack" :code="SNIPPETS.aspectRatio" :native-supported="support?.aspectRatio ?? null" can-force-fallback>
      <template #problem>
        <p>Safari 14 以前不支援 <code>aspect-ratio</code>。只寫這一行，卡片圖片區會變成 0 高度，圖片整個消失。</p>
      </template>
      <template #broken>
        <div class="card">
          <div class="collapsed" aria-hidden="true" />
          <p class="card-text">圖片區高度 0，版面直接跳到文字</p>
        </div>
      </template>
      <template #fixed="{ fallback }">
        <div class="card">
          <div class="ratio" :class="{ fallback }">
            <div class="ratio-fill">16 : 9</div>
          </div>
          <p class="card-text">{{ fallback ? 'padding-top: 56.25%' : 'aspect-ratio: 16 / 9' }}</p>
        </div>
      </template>
    </CompatCase>

    <CompatCase title="flex 的 gap" :code="SNIPPETS.flexGap" :native-supported="support?.flexGap ?? null" can-force-fallback>
      <template #problem>
        <p>
          Safari 14.1 以前 flex 版面不支援 <code>gap</code>，標籤全部黏在一起。而且 <code>@supports (gap: 1px)</code>
          在這些版本會誤判為支援，只能用 JS 實際量測。
        </p>
      </template>
      <template #broken>
        <ul class="tags no-gap">
          <li v-for="tag in tags" :key="tag">{{ tag }}</li>
        </ul>
      </template>
      <template #fixed="{ fallback }">
        <ul class="tags" :class="fallback ? 'margin-fallback' : 'flex-gap'">
          <li v-for="tag in tags" :key="tag">{{ tag }}</li>
        </ul>
      </template>
    </CompatCase>

    <CompatCase title=":has() 父層選擇器" :code="SNIPPETS.has" :native-supported="support?.has ?? null" can-force-fallback>
      <template #problem>
        <p>Firefox 121 以前不支援 <code>:has()</code>，「選中的方案卡片加框」不會生效，使用者看不出選了哪個。</p>
      </template>
      <template #broken>
        <div class="plans" role="radiogroup" aria-label="方案（未處理）">
          <label v-for="plan in plans" :key="plan.id" class="plan">
            <input type="radio" name="plan-broken" :checked="plan.id === 'pro'" disabled />
            {{ plan.name }} <small>{{ plan.price }}</small>
          </label>
        </div>
      </template>
      <template #fixed="{ fallback }">
        <div class="plans" :class="{ fallback }" role="radiogroup" aria-label="方案">
          <label v-for="plan in plans" :key="plan.id" class="plan" :class="{ 'is-checked': fallback && selectedPlan === plan.id }">
            <input v-model="selectedPlan" type="radio" name="plan-fixed" :value="plan.id" />
            {{ plan.name }} <small>{{ plan.price }}</small>
          </label>
        </div>
      </template>
    </CompatCase>

    <CompatCase title="行動版 100vh 被工具列蓋住" :code="SNIPPETS.dvh">
      <template #problem>
        <p>
          行動版 Safari／Chrome 的 <code>100vh</code> 是「網址列收起時」的高度。網址列還在時，底部按鈕會被工具列蓋住。
          <code>100dvh</code> 會隨工具列伸縮；先寫 <code>100vh</code> 再寫 <code>100dvh</code>，舊瀏覽器會忽略不認得的那行。
        </p>
      </template>
      <template #broken>
        <div class="phone">
          <div class="phone-bar top" aria-hidden="true">example.com</div>
          <div class="phone-screen vh">
            <p>全螢幕 Hero</p>
            <span class="phone-cta">立即預約</span>
          </div>
          <div class="phone-bar bottom" aria-hidden="true">‹ › ⋯</div>
        </div>
      </template>
      <template #fixed>
        <div class="phone">
          <div class="phone-bar top" aria-hidden="true">example.com</div>
          <div class="phone-screen dvh">
            <p>全螢幕 Hero</p>
            <span class="phone-cta">立即預約</span>
          </div>
          <div class="phone-bar bottom" aria-hidden="true">‹ › ⋯</div>
        </div>
      </template>
    </CompatCase>

    <CompatCase title="iOS 輸入框自動放大" :code="SNIPPETS.inputZoom">
      <template #problem>
        <p>
          iOS Safari 聚焦字級小於 16px 的輸入框時會放大整個頁面，離開後不會縮回，版面看起來像壞掉。桌機無法重現，請用 iPhone
          開這一頁點下面兩個欄位比較。
        </p>
      </template>
      <template #broken>
        <label class="zoom-field">
          Email（14px）
          <input type="email" class="small-input" placeholder="聚焦時頁面放大" />
        </label>
      </template>
      <template #fixed>
        <label class="zoom-field">
          Email（16px）
          <input type="email" class="normal-input" placeholder="聚焦時不放大" />
        </label>
      </template>
    </CompatCase>

    <CompatCase title="多行文字省略" :code="SNIPPETS.lineClamp" :native-supported="support?.lineClamp ?? null" can-force-fallback>
      <template #problem>
        <p>
          <code>line-clamp</code> 目前多數瀏覽器仍需要 <code>-webkit-</code> 前綴，而且必須搭配
          <code>display: -webkit-box</code>。只寫固定高度，文字會溢出蓋到下一個元素。
        </p>
      </template>
      <template #broken>
        <div class="news">
          <p class="news-title overflow">{{ longTitle }}</p>
          <p class="news-date">2026/09/15</p>
        </div>
      </template>
      <template #fixed="{ fallback }">
        <div class="news">
          <p class="news-title clamp" :class="{ fallback }">{{ longTitle }}</p>
          <p class="news-date">2026/09/15</p>
        </div>
      </template>
    </CompatCase>

    <CompatCase title="日期欄位" :code="SNIPPETS.dateInput" :native-supported="support?.dateInput ?? null" can-force-fallback>
      <template #problem>
        <p>
          Safari 14.1 以前的桌機版不支援 <code>type="date"</code>，會退回普通文字框，使用者不知道要輸入什麼格式，後端收到
          <code>9/23</code>、<code>2026.9.23</code> 各種寫法。
        </p>
      </template>
      <template #broken>
        <label class="zoom-field">
          預約日期
          <input type="text" value="9/23" readonly />
        </label>
      </template>
      <template #fixed="{ fallback }">
        <label v-if="!fallback" class="zoom-field">
          預約日期
          <input v-model="dateValue" type="date" />
        </label>
        <div v-else class="zoom-field">
          <label for="compat-date-fallback">預約日期（YYYY-MM-DD）</label>
          <input
            id="compat-date-fallback"
            v-model="dateValue"
            type="text"
            inputmode="numeric"
            pattern="\d{4}-\d{2}-\d{2}"
            placeholder="2026-09-23"
            :aria-invalid="!!dateError"
            aria-describedby="compat-date-error"
            @blur="checkDate"
          />
          <p id="compat-date-error" class="field-error">{{ dateError }}</p>
        </div>
      </template>
    </CompatCase>
  </div>
</template>

<style scoped>
.cases {
  display: grid;
  gap: 1rem;
}

/* ---------- aspect-ratio ---------- */
.card {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.card-text {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-family: var(--mono);
}

.collapsed {
  height: 0;
}

.ratio {
  position: relative;
  height: 0;
  padding-top: 56.25%;
}

@supports (aspect-ratio: 16 / 9) {
  .ratio:not(.fallback) {
    height: auto;
    padding-top: 0;
    aspect-ratio: 16 / 9;
  }
}

.ratio-fill {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--on-accent);
  background: linear-gradient(135deg, #8b85ff, #564dff);
}

/* ---------- flex gap ---------- */
.tags {
  display: flex;
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tags li {
  padding: 0.125rem 0.625rem;
  font-size: 0.8125rem;
  border: 1px solid var(--accent-border);
  border-radius: 999px;
  background: var(--accent-bg);
}

.margin-fallback {
  margin-top: -8px;
}

.margin-fallback li {
  margin: 8px 8px 0 0;
}

.flex-gap {
  gap: 8px;
}

/* ---------- :has() ---------- */
.plans {
  display: grid;
  gap: 0.5rem;
}

.plan {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
}

.plan small {
  margin-left: auto;
  color: var(--text-muted);
}

@supports selector(:has(*)) {
  .plans:not(.fallback) .plan:has(input:checked) {
    border-color: var(--accent);
    background: var(--accent-bg);
  }
}

.plan.is-checked {
  border-color: var(--accent);
  background: var(--accent-bg);
}

/* ---------- 100vh / dvh ---------- */
.phone {
  position: relative;
  width: 160px;
  height: 260px;
  margin-inline: auto;
  overflow: hidden;
  border: 6px solid var(--text-h);
  border-radius: 20px;
  background: var(--bg);
}

.phone-bar {
  position: absolute;
  inset-inline: 0;
  z-index: 1;
  height: 32px;
  display: grid;
  place-items: center;
  font-size: 0.6875rem;
  color: var(--text-muted);
  background: var(--surface);
  opacity: 0.97;
}

.phone-bar.top {
  top: 0;
}

.phone-bar.bottom {
  bottom: 0;
}

.phone-screen {
  position: absolute;
  top: 32px;
  inset-inline: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: var(--on-accent);
  background: linear-gradient(160deg, #8b85ff, #564dff);
}

/* 100vh：網址列收起時的高度，比目前可見區域高，底部被工具列蓋住 */
.phone-screen.vh {
  height: calc(100% - 32px);
}

/* 100dvh：目前可見的高度 */
.phone-screen.dvh {
  height: calc(100% - 64px);
}

.phone-cta {
  padding: 0.25rem;
  text-align: center;
  font-weight: 700;
  color: #564dff;
  border-radius: 4px;
  background: #fff;
}

/* ---------- iOS input zoom ---------- */
.zoom-field {
  display: grid;
  gap: 0.25rem;
  font-size: 0.8125rem;
}

.zoom-field input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
}

.small-input {
  font-size: 14px;
}

.normal-input,
.zoom-field input[type='date'],
#compat-date-fallback {
  font-size: 16px;
}

.field-error {
  min-height: 1.25em;
  font-size: 0.75rem;
  color: var(--danger);
}

/* ---------- line-clamp ---------- */
.news {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.news-title {
  line-height: 1.5;
  font-weight: 600;
}

.news-title.overflow {
  height: calc(1.5em * 2);
}

.news-title.clamp {
  max-height: calc(1.5em * 2);
  overflow: hidden;
}

@supports (-webkit-line-clamp: 2) {
  .news-title.clamp:not(.fallback) {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    max-height: none;
  }
}

.news-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}
</style>
