<script setup lang="ts">
import { BREAKPOINTS, COLORS, SPACING, TYPE_SCALE } from '../data/tokens'
</script>

<template>
  <section class="spec" aria-labelledby="spec-title">
    <h2 id="spec-title">設計規格（與設計師對齊的交接表）</h2>
    <p class="intro">切版前先把設計稿整理成 token，確認後才動工；有疑問的地方回頭問設計師，而不是自己猜。</p>

    <div class="spec-grid">
      <div>
        <h3>斷點與格線</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th scope="col">斷點</th><th scope="col">寬度</th><th scope="col">欄數</th><th scope="col">欄距</th><th scope="col">左右留白</th></tr>
            </thead>
            <tbody>
              <tr v-for="(bp, i) in BREAKPOINTS" :key="bp.id">
                <th scope="row"><code>{{ bp.id }}</code> {{ bp.label }}</th>
                <td>{{ bp.min }}{{ BREAKPOINTS[i + 1] ? `–${BREAKPOINTS[i + 1]!.min - 1}` : '+' }}</td>
                <td>{{ bp.columns }}</td>
                <td>{{ bp.gutter }}px</td>
                <td>{{ bp.margin }}px</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3>字級</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th scope="col">用途</th><th scope="col">CSS</th><th scope="col">範圍</th></tr>
            </thead>
            <tbody>
              <tr v-for="t in TYPE_SCALE" :key="t.role">
                <th scope="row">{{ t.role }}</th>
                <td><code>{{ t.css }}</code></td>
                <td>{{ t.range }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3>色彩</h3>
        <ul class="swatches">
          <li v-for="c in COLORS" :key="c.name">
            <span class="chip" :style="{ background: c.value }" aria-hidden="true" />
            <span>
              <code>{{ c.name }}</code> {{ c.value }}<br />
              <small>{{ c.usage }}</small>
            </span>
          </li>
        </ul>
      </div>

      <div>
        <h3>間距（8px 基準）</h3>
        <ul class="spacing">
          <li v-for="s in SPACING" :key="s">
            <span class="bar" :style="{ width: `${s}px` }" aria-hidden="true" />
            <code>{{ s }}px</code>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.spec {
  margin-top: 2.5rem;
}

.spec h2 {
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-strong);
}

.intro {
  margin-bottom: 1.25rem;
  color: var(--text-muted);
}

.spec-grid {
  display: grid;
  gap: 1.5rem 2rem;
}

@media (min-width: 900px) {
  .spec-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  font-size: 0.8125rem;
  border-collapse: collapse;
}

th,
td {
  padding: 0.375rem 0.5rem;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid var(--border);
}

thead th {
  color: var(--text-muted);
  font-weight: 600;
}

tbody th {
  font-weight: 500;
}

.swatches,
.spacing {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8125rem;
}

.swatches li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  line-height: 1.4;
}

.chip {
  flex: none;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
}

small {
  color: var(--text-muted);
}

.spacing li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.spacing .bar {
  height: 0.75rem;
  border-radius: 2px;
  background: var(--accent);
}
</style>
