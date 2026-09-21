<script setup lang="ts">
import FeatureHeader from '../../components/FeatureHeader.vue'
import KanbanBoard from './components/KanbanBoard.vue'
import meta from './meta'
</script>

<template>
  <article class="kanban-demo container">
    <FeatureHeader :meta="meta" />

    <h2 class="section-title">互動展示</h2>

    <KanbanBoard />

    <section class="tips" aria-labelledby="tips-title">
      <h3 id="tips-title">操作方式</h3>
      <ul>
        <li><strong>滑鼠</strong>：拖曳卡片到任一欄位；點擊卡片編輯標題；拖到看板外或按 <kbd>Esc</kbd> 取消。</li>
        <li><strong>觸控</strong>：長按卡片 0.2 秒後拖曳；直接滑動則正常捲動。</li>
        <li>
          <strong>鍵盤</strong>：<kbd>Tab</kbd> 聚焦卡片，<kbd>Space</kbd> 拿起，方向鍵移動（左右換欄），
          <kbd>Space</kbd> 放下，<kbd>Esc</kbd> 取消；<kbd>Enter</kbd> 編輯。
        </li>
        <li>
          <strong>復原 / 重做</strong>：新增、編輯、刪除、移動都可復原，最多保留 50 筆；焦點在輸入框時交給瀏覽器原生的文字復原。
        </li>
        <li>
          <strong>自動儲存</strong>：看板存在 <code>localStorage</code>，重新整理後還原；歷史紀錄不保存。按「壓力測試」載入 300
          張卡片，把卡片拖到欄位底部邊緣可觀察自動捲動。
        </li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.kanban-demo {
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
