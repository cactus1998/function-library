<script setup lang="ts">
import FeatureHeader from '../../components/FeatureHeader.vue'
import QuizApp from './components/QuizApp.vue'
import meta from './meta'
</script>

<template>
  <article class="interview-quiz-demo container">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>
    <QuizApp />

    <section class="tips" aria-labelledby="tips-title">
      <h3 id="tips-title">操作方式</h3>
      <ul>
        <li><strong>出題</strong>：勾選主題、難度與題數後按「開始作答」；各選項旁顯示在其他條件下的題數，沒有可出的題目時按鈕會停用。</li>
        <li><strong>作答</strong>：點選項或用方向鍵切換，左側題號可跳題，已作答的題號會標色。</li>
        <li><strong>交卷</strong>：還有題目未作答時會先提醒，未作答計為答錯。</li>
        <li><strong>對答案</strong>：結果頁預設只列答錯的題目，附正確答案與解析；可按「重做錯的 N 題」。</li>
        <li><strong>錯題本</strong>：答錯的題目會累積，下次勾選「只練錯題本」即可複習；重新整理頁面進度仍在。</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.interview-quiz-demo {
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
