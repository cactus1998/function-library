import type { NewsItem } from '../types'
import { escapeHtml, formatDate, isPlainDate, isSafeUrl } from './html'

/** 圖片固定比例 16:9，寫上 width／height 讓瀏覽器在圖片載入前就保留空間 */
const IMAGE_WIDTH = 640
const IMAGE_HEIGHT = 360

function renderMedia(item: NewsItem): string {
  if (item.imageUrl && isSafeUrl(item.imageUrl, 'image')) {
    return [
      '<div class="news-card__media">',
      `<img src="${escapeHtml(item.imageUrl)}" alt="" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" loading="lazy" decoding="async" data-field="imageUrl">`,
      '</div>',
    ].join('\n        ')
  }
  return '<div class="news-card__media news-card__media--empty" aria-hidden="true"></div>'
}

function renderDate(value: string): string {
  if (!isPlainDate(value)) return ''
  return `<time datetime="${value}" data-field="publishedAt">${formatDate(value)}</time>`
}

function renderCard(item: NewsItem): string {
  const href = isSafeUrl(item.url, 'link') ? item.url : '#'
  const title = item.title.trim() || '（未命名）'
  const summary = item.summary?.trim()
  const category = item.category.trim()

  return `  <li class="news-card">
    <a class="news-card__link" href="${escapeHtml(href)}" data-field="url">
      ${renderMedia(item)}
      <div class="news-card__body">
        <p class="news-card__meta">${category ? `<span class="news-card__category" data-field="category">${escapeHtml(category)}</span>` : ''}${renderDate(item.publishedAt)}</p>
        <h3 class="news-card__title" data-field="title">${escapeHtml(title)}</h3>${
          summary ? `\n        <p class="news-card__summary" data-field="summary">${escapeHtml(summary)}</p>` : ''
        }
      </div>
    </a>
  </li>`
}

/**
 * 把資料套進交接模板，產生後端可直接輸出的 HTML。
 * 所有資料都經過跳脫，網址另外檢查協定；選填欄位缺值時整段省略，不留空標籤。
 */
export function renderNewsList(items: readonly NewsItem[]): string {
  if (items.length === 0) {
    return '<p class="news-empty">目前沒有最新消息，請稍後再來看看。</p>'
  }
  return `<ul class="news-list">\n${items.map(renderCard).join('\n')}\n</ul>`
}
