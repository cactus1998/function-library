<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import { useMessages } from '../composables/useMessages'
import { createMessagesApi } from '../services/apiClient'
import { createMockServer } from '../services/mockServer'
import { withRequestLog } from '../services/requestLog'
import type { RequestLogEntry, ServerSettings } from '../types'
import ContactForm from './ContactForm.vue'
import MessageList from './MessageList.vue'
import NetworkPanel from './NetworkPanel.vue'

const LOG_LIMIT = 30

const settings = reactive<ServerSettings>({ mode: 'normal', latency: 400 })
const log = shallowRef<RequestLogEntry[]>([])

/** 串接真實後端時，只要把 createMockServer(settings) 換成 window.fetch */
const fetcher = withRequestLog(createMockServer(settings), (entry) => {
  log.value = [entry, ...log.value].slice(0, LOG_LIMIT)
})
const api = createMessagesApi(fetcher)

const { page, data, status, error, retryNote, totalPages, goTo, reload, reset } = useMessages(api)
</script>

<template>
  <div class="ajax-app">
    <div class="columns">
      <ContactForm :api="api" @created="reset" />
      <MessageList
        :data="data"
        :status="status"
        :error="error"
        :retry-note="retryNote"
        :page="page"
        :total-pages="totalPages"
        @go-to="goTo"
        @reload="reload"
      />
    </div>
    <NetworkPanel :settings="settings" :log="log" @clear="log = []" />
  </div>
</template>

<style scoped>
.ajax-app {
  display: grid;
  gap: 1.5rem;
}

.columns {
  display: grid;
  gap: 1.5rem;
}

@media (min-width: 860px) {
  .columns {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
}
</style>
