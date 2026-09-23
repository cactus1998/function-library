<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { useContactForm } from '../composables/useContactForm'
import type { MessagesApi } from '../services/apiClient'
import type { FieldName, Message, Topic } from '../types'

const { api } = defineProps<{ api: MessagesApi }>()
const emit = defineEmits<{ created: [message: Message] }>()

const TOPIC_OPTIONS: { value: Topic; label: string }[] = [
  { value: 'order', label: '訂單問題' },
  { value: 'wholesale', label: '企業採購' },
  { value: 'feedback', label: '意見回饋' },
  { value: 'other', label: '其他' },
]
const MESSAGE_MAX = 500

const formEl = useTemplateRef<HTMLFormElement>('form')
const { values, errors, status, submitError, created, validateField, revalidateIfShown, submit, cancel, startOver } =
  useContactForm(api, formEl, (message) => emit('created', message))

const uid = useId()
const idOf = (field: FieldName) => `${uid}-${field}`
const errorIdOf = (field: FieldName) => `${uid}-${field}-error`
</script>

<template>
  <section class="contact" aria-labelledby="contact-title">
    <h3 id="contact-title">聯絡我們</h3>

    <div v-if="status === 'success' && created" class="done" role="status">
      <p><strong>已收到你的訊息（編號 #{{ created.id }}）</strong></p>
      <p>我們會在兩個工作天內回覆到 {{ created.email }}。</p>
      <button type="button" class="btn" @click="startOver">再寫一則</button>
    </div>

    <!-- novalidate：保留 required／type／minlength 做驗證，但由我們統一顯示訊息 -->
    <form v-else ref="form" novalidate :aria-busy="status === 'submitting'" @submit.prevent="submit">
      <div class="field">
        <label :for="idOf('name')">姓名 <span class="req" aria-hidden="true">*</span></label>
        <input
          :id="idOf('name')"
          v-model.trim="values.name"
          name="name"
          type="text"
          required
          minlength="2"
          maxlength="30"
          autocomplete="name"
          :aria-invalid="!!errors.name"
          :aria-describedby="errors.name ? errorIdOf('name') : undefined"
          @blur="validateField('name')"
          @input="revalidateIfShown('name')"
        />
        <p v-if="errors.name" :id="errorIdOf('name')" class="error">{{ errors.name }}</p>
      </div>

      <div class="field">
        <label :for="idOf('email')">Email <span class="req" aria-hidden="true">*</span></label>
        <input
          :id="idOf('email')"
          v-model.trim="values.email"
          name="email"
          type="email"
          required
          autocomplete="email"
          inputmode="email"
          :aria-invalid="!!errors.email"
          :aria-describedby="errors.email ? errorIdOf('email') : undefined"
          @blur="validateField('email')"
          @input="revalidateIfShown('email')"
        />
        <p v-if="errors.email" :id="errorIdOf('email')" class="error">{{ errors.email }}</p>
      </div>

      <div class="field">
        <label :for="idOf('topic')">詢問類別 <span class="req" aria-hidden="true">*</span></label>
        <select
          :id="idOf('topic')"
          v-model="values.topic"
          name="topic"
          required
          :aria-invalid="!!errors.topic"
          :aria-describedby="errors.topic ? errorIdOf('topic') : undefined"
        >
          <option v-for="opt in TOPIC_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <p v-if="errors.topic" :id="errorIdOf('topic')" class="error">{{ errors.topic }}</p>
      </div>

      <div class="field">
        <label :for="idOf('message')">內容 <span class="req" aria-hidden="true">*</span></label>
        <textarea
          :id="idOf('message')"
          v-model="values.message"
          name="message"
          rows="5"
          required
          minlength="10"
          :maxlength="MESSAGE_MAX"
          :aria-invalid="!!errors.message"
          :aria-describedby="`${uid}-message-count${errors.message ? ` ${errorIdOf('message')}` : ''}`"
          @blur="validateField('message')"
          @input="revalidateIfShown('message')"
        />
        <p :id="`${uid}-message-count`" class="count">{{ values.message.length }} / {{ MESSAGE_MAX }}</p>
        <p v-if="errors.message" :id="errorIdOf('message')" class="error">{{ errors.message }}</p>
      </div>

      <div v-if="status === 'error'" class="callout danger" role="alert">
        <p>{{ submitError }}</p>
        <p class="retry-hint">你的內容仍保留著。重試會沿用同一個請求編號，就算上一次其實已送達，也不會重複留言。</p>
      </div>

      <div class="actions">
        <button type="submit" class="btn primary" :disabled="status === 'submitting'">
          {{ status === 'submitting' ? '送出中…' : status === 'error' ? '重試送出' : '送出' }}
        </button>
        <button v-if="status === 'submitting'" type="button" class="btn" @click="cancel">取消</button>
      </div>
      <p class="visually-hidden" aria-live="polite">{{ status === 'submitting' ? '送出中' : '' }}</p>
    </form>
  </section>
</template>

<style scoped>
.contact h3 {
  font-size: 1.0625rem;
}

form {
  display: grid;
  gap: 0.875rem;
}

.field {
  display: grid;
  gap: 0.25rem;
}

label {
  font-size: 0.875rem;
  font-weight: 600;
}

.req {
  color: var(--danger);
}

input,
select,
textarea {
  width: 100%;
  min-height: 2.5rem;
  padding: 0.375rem 0.625rem;
  /* 16px 以上，iOS Safari 聚焦時不會自動放大 */
  font: inherit;
  font-size: 1rem;
  color: inherit;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
}

textarea {
  resize: vertical;
}

[aria-invalid='true'] {
  border-color: var(--danger);
  box-shadow: 0 0 0 1px var(--danger);
}

.error {
  font-size: 0.8125rem;
  color: var(--danger);
}

.count {
  justify-self: end;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.retry-hint {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  min-height: 2.5rem;
  padding: 0 1rem;
  font-size: 0.875rem;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
}

.btn.primary {
  color: var(--on-accent);
  border-color: var(--accent-solid);
  background: var(--accent-solid);
}

.btn.primary:hover:not(:disabled) {
  background: var(--accent-solid-hover);
}

.btn:disabled {
  opacity: 0.6;
  cursor: progress;
}

.done {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
  padding: 1rem;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius);
  background: var(--accent-bg);
}
</style>
