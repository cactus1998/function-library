<script setup lang="ts">
const faqs = [
  { q: '咖啡豆多久會出貨？', a: '接單後 48 小時內烘焙並出貨，週末訂單於週一烘焙。' },
  { q: '可以指定研磨粗細嗎？', a: '可以，結帳時選擇手沖、法壓、義式或不研磨。建議不研磨，香氣保存較久。' },
  { q: '訂閱可以暫停嗎？', a: '可以，在會員中心隨時暫停或取消，下一期扣款前一天都能修改。' },
  { q: '有提供企業發票嗎？', a: '有，結帳時填寫統一編號即可，電子發票會寄到訂購信箱。' },
]
</script>

<template>
  <!-- 原生 details／summary：不寫 JS 就有鍵盤操作與展開狀態；name 相同即為「一次只開一個」 -->
  <div class="faq">
    <details v-for="(item, i) in faqs" :key="item.q" name="ui-kit-faq" :open="i === 0">
      <summary>{{ item.q }}</summary>
      <div class="answer">
        <p>{{ item.a }}</p>
      </div>
    </details>
  </div>
</template>

<style scoped>
.faq {
  border-top: 1px solid var(--border);
}

details {
  border-bottom: 1px solid var(--border);
}

summary {
  position: relative;
  padding: 0.75rem 2rem 0.75rem 0;
  font-weight: 600;
  list-style: none;
  cursor: pointer;
}

summary::-webkit-details-marker {
  display: none;
}

summary::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 0.5rem;
  width: 0.5rem;
  height: 0.5rem;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: translateY(-75%) rotate(45deg);
  transition: transform 0.2s;
}

details[open] > summary::after {
  transform: translateY(-25%) rotate(-135deg);
}

.answer {
  padding-bottom: 0.75rem;
  font-size: 0.9375rem;
  color: var(--text-muted);
}

/*
 * 漸進增強：支援 ::details-content 與 interpolate-size 的瀏覽器（Chrome 131+）才有高度動畫，
 * 其他瀏覽器照樣能展開，只是沒有動畫。
 */
@supports (interpolate-size: allow-keywords) {
  .faq {
    interpolate-size: allow-keywords;
  }

  details::details-content {
    height: 0;
    overflow: hidden;
    transition:
      height 0.25s ease,
      content-visibility 0.25s allow-discrete;
  }

  details[open]::details-content {
    height: auto;
  }
}
</style>
