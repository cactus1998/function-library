<script setup lang="ts">
import FeatureHeader from '../../components/FeatureHeader.vue'
import BookingApp from './components/BookingApp.vue'
import meta from './meta'
</script>

<template>
  <article class="booking-demo container">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>
    <BookingApp />

    <section class="tips" aria-labelledby="tips-title">
      <h3 id="tips-title">操作方式</h3>
      <ul>
        <li><strong>服務時長</strong>：切到「燙髮（2.5 小時）」，上午的時段全部消失，因為 11:00 開始會跨到午休。</li>
        <li><strong>提前預約</strong>：在 Demo 控制把現在時間設為今天 15:10，今天最早只能約 17:30；設為 22:30，今天整天不可預約。</li>
        <li><strong>時區</strong>：把「你的時區」改成 <code>America/Los_Angeles</code>，每個時段會附註當地時間，下午的時段顯示「前一天」。</li>
        <li><strong>鍵盤</strong>：Tab 進入日曆後用方向鍵、Home / End、PageUp / PageDown 移動，Enter 選取。</li>
        <li><strong>競態</strong>：快速連按「下個月」再按回來，畫面只套用最後一個月份的回應；60 秒內切回來不會重新載入。</li>
        <li><strong>衝突</strong>：勾選「時段被別人搶先預約」後送出，會看到 409 提示，時段被清除但姓名電話仍在。</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.booking-demo {
  padding-top: 1rem;
  padding-bottom: 3rem;
}

.section-title {
  max-width: 760px;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-strong);
}

.tips {
  margin-top: 2rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}

.tips h3 {
  font-size: 0.9375rem;
}

.tips ul {
  display: grid;
  gap: 0.375rem;
  margin: 0;
  padding-left: 1.25rem;
}
</style>
