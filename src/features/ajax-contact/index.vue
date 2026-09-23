<script setup lang="ts">
import FeatureHeader from '../../components/FeatureHeader.vue'
import AjaxApp from './components/AjaxApp.vue'
import meta from './meta'
</script>

<template>
  <article class="ajax-demo container">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>
    <AjaxApp />

    <section class="tips" aria-labelledby="tips-title">
      <h3 id="tips-title">操作方式</h3>
      <ul>
        <li><strong>前端驗證</strong>：什麼都不填直接送出，焦點會跳到第一個錯誤欄位；修正後錯誤即時消失。</li>
        <li><strong>伺服器驗證</strong>：Email 填 <code>test@mailinator.com</code>，前端格式正確，但伺服器回 422「不接受拋棄式信箱」。</li>
        <li><strong>逾時與取消</strong>：伺服器狀態選「沒有回應」，5 秒後顯示逾時；送出中可以按「取消」。</li>
        <li><strong>自動重試</strong>：選「不穩定」後切換分頁，Network 面板會出現 503 與自動重試的請求，狀態列顯示倒數。</li>
        <li><strong>冪等</strong>：「不穩定」模式下送出留言遇到 504 時按「重試送出」，列表裡只會多一則留言。</li>
        <li><strong>競態</strong>：延遲調到 2000ms，連點不同頁碼，Network 面板中被取代的請求顯示 <code>(canceled)</code>。</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.ajax-demo {
  padding-top: 1rem;
  padding-bottom: 5rem;
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
