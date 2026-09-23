/** 交給後端套版的 HTML 骨架：保留 class、ARIA 屬性與狀態屬性，文字以實際資料替換 */
export const SNIPPETS = {
  carousel: `<section class="carousel" aria-roledescription="carousel" aria-label="最新活動">
  <div class="carousel__track" id="promo-track" aria-live="off">
    <div class="carousel__slide" role="group" aria-roledescription="slide" aria-label="第 1 張，共 4 張">
      <h4>秋季新品上市</h4>
      <p>桂花烏龍拿鐵，限定供應至 10 月底。</p>
      <a href="/news/1">了解更多</a>
    </div>
    <!-- 其餘 slide 同上，aria-label 依序遞增 -->
  </div>
  <div class="carousel__controls">
    <button type="button" aria-label="暫停自動播放">…</button>
    <button type="button" aria-label="上一張" aria-controls="promo-track">…</button>
    <button type="button" aria-label="跳到第 1 張：秋季新品上市" aria-current="true" aria-controls="promo-track"></button>
    <!-- 每張 slide 一個圓點 -->
    <button type="button" aria-label="下一張" aria-controls="promo-track">…</button>
  </div>
</section>`,

  accordion: `<!-- 不需要 JavaScript；name 相同的 details 一次只會展開一個 -->
<div class="faq">
  <details name="faq" open>
    <summary>咖啡豆多久會出貨？</summary>
    <div class="faq__answer">
      <p>接單後 48 小時內烘焙並出貨。</p>
    </div>
  </details>
  <details name="faq">
    <summary>可以指定研磨粗細嗎？</summary>
    <div class="faq__answer">
      <p>可以，結帳時選擇研磨方式。</p>
    </div>
  </details>
</div>`,

  tabs: `<div class="tabs">
  <div role="tablist" aria-label="商品資訊">
    <button type="button" role="tab" id="tab-flavor" aria-selected="true"
            aria-controls="panel-flavor" tabindex="0">風味</button>
    <button type="button" role="tab" id="tab-origin" aria-selected="false"
            aria-controls="panel-origin" tabindex="-1">產地</button>
  </div>
  <div role="tabpanel" id="panel-flavor" aria-labelledby="tab-flavor" tabindex="0">
    <p>柑橘、茉莉花香，尾韻帶紅茶感。</p>
  </div>
  <div role="tabpanel" id="panel-origin" aria-labelledby="tab-origin" tabindex="0" hidden>
    <p>衣索比亞耶加雪菲，水洗處理。</p>
  </div>
</div>`,

  shell: `<header class="site-header">
  <a href="/" class="logo">晨霧咖啡</a>
  <button type="button" class="menu-toggle" aria-expanded="false" aria-controls="site-nav">
    <span class="bars" aria-hidden="true"></span>
    <span class="visually-hidden">選單</span>
  </button>
  <nav id="site-nav" class="site-nav" aria-label="主選單">
    <ul>
      <li><a href="/menu">菜單</a></li>
      <li><a href="/beans">咖啡豆</a></li>
      <li><a href="/stores">門市</a></li>
    </ul>
  </nav>
</header>

<!-- 放在 body 最後；捲過 Hero 後由 JS 移除 hidden -->
<button type="button" class="back-to-top" aria-label="回到頂部" hidden>…</button>`,
} as const
