<script setup lang="ts">
import { ref } from 'vue'
import { MEMBER_MAX, NAME_MAX } from '../composables/useSplitBill'
import type { Member } from '../types'

const props = defineProps<{
  members: Member[]
  add: (name: string) => string | null
  rename: (id: string, name: string) => string | null
  remove: (id: string) => string | null
}>()

const emit = defineEmits<{ announce: [message: string] }>()

const newName = ref('')
const addError = ref<string | null>(null)
/** 每位成員的改名錯誤 */
const rowErrors = ref<Record<string, string>>({})

function onAdd() {
  const name = newName.value.trim()
  addError.value = props.add(newName.value)
  if (addError.value) return
  newName.value = ''
  emit('announce', `已新增 ${name}`)
}

function setRowError(id: string, message: string | null) {
  const next = { ...rowErrors.value }
  if (message) next[id] = message
  else delete next[id]
  rowErrors.value = next
}

function onRename(member: Member, event: Event) {
  const input = event.target as HTMLInputElement
  if (input.value.trim() === member.name) {
    setRowError(member.id, null)
    return
  }
  const error = props.rename(member.id, input.value)
  setRowError(member.id, error)
  // 名稱不合法時還原，避免畫面與資料不一致
  if (error) input.value = member.name
}

function onRenameKeydown(member: Member, event: KeyboardEvent) {
  const input = event.target as HTMLInputElement
  if (event.key === 'Enter') input.blur()
  else if (event.key === 'Escape') {
    input.value = member.name
    setRowError(member.id, null)
    input.blur()
  }
}

function onRemove(member: Member) {
  const error = props.remove(member.id)
  setRowError(member.id, error)
  emit('announce', error ?? `已刪除 ${member.name}`)
}
</script>

<template>
  <section class="members" aria-labelledby="members-title">
    <h3 id="members-title">成員（{{ members.length }}）</h3>
    <ul>
      <li v-for="member in members" :key="member.id">
        <div class="row">
          <input
            :value="member.name"
            :aria-label="`${member.name} 的名稱`"
            :maxlength="NAME_MAX * 2"
            :aria-invalid="!!rowErrors[member.id]"
            :aria-describedby="rowErrors[member.id] ? `member-error-${member.id}` : undefined"
            @change="onRename(member, $event)"
            @keydown="onRenameKeydown(member, $event)"
          />
          <button type="button" class="remove" :aria-label="`刪除『${member.name}』`" @click="onRemove(member)">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </div>
        <p v-if="rowErrors[member.id]" :id="`member-error-${member.id}`" class="error">{{ rowErrors[member.id] }}</p>
      </li>
    </ul>

    <form class="add" @submit.prevent="onAdd">
      <label for="new-member" class="visually-hidden">新成員名稱</label>
      <input
        id="new-member"
        v-model="newName"
        placeholder="新增成員"
        :maxlength="NAME_MAX * 2"
        :disabled="members.length >= MEMBER_MAX"
        :aria-invalid="!!addError"
        :aria-describedby="addError ? 'new-member-error' : undefined"
        @input="addError = null"
      />
      <button type="submit" :disabled="members.length >= MEMBER_MAX">新增</button>
    </form>
    <p v-if="addError" id="new-member-error" class="error">{{ addError }}</p>
  </section>
</template>

<style scoped>
h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 0.375rem;
  margin: 0 0 0.5rem;
  padding: 0;
  list-style: none;
}

.row,
.add {
  display: flex;
  gap: 0.25rem;
}

input {
  flex: 1;
  min-width: 0;
  min-height: 2.75rem;
  padding: 0 0.625rem;
  color: var(--text-h);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  font: inherit;
}

input[aria-invalid='true'] {
  border-color: var(--danger);
}

button {
  min-width: 2.75rem;
  min-height: 2.75rem;
  padding: 0 0.75rem;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  font: inherit;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.remove {
  display: grid;
  place-items: center;
  padding: 0;
}

.remove svg {
  width: 0.875rem;
  height: 0.875rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
}

.add {
  max-width: 22rem;
}

.error {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--danger);
}
</style>
