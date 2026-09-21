<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useCropper } from '../composables/useCropper'
import { useImageSource } from '../composables/useImageSource'
import { useUpload } from '../composables/useUpload'
import { createMockUploader } from '../services/mockUpload'
import type { CroppedResult, ExportCrop, LoadImage, Uploader } from '../types'
import { sourceRect } from '../utils/crop'
import { encodeWithinBudget, exportCrop as canvasExport, OUTPUT_SIZE } from '../utils/encode'
import { firstImageFile } from '../utils/file'
import AvatarPreview from './AvatarPreview.vue'
import CropViewport from './CropViewport.vue'
import DropZone from './DropZone.vue'
import UploadPanel from './UploadPanel.vue'

const props = defineProps<{
  /** 以下皆可注入，方便在沒有 canvas 與影像解碼的測試環境中執行 */
  loadImage?: LoadImage
  exportCrop?: ExportCrop
  uploader?: Uploader
}>()

const VIEWPORT_MAX = 280

const failureRate = ref(0.2)
const source = useImageSource(props.loadImage)
const { image, status, error } = source
const upload = useUpload(props.uploader ?? createMockUploader({ failureRate: () => failureRate.value }))

// 裁切框寬度 = min(280, 容器寬度)，窄螢幕跟著縮
const container = useTemplateRef<HTMLElement>('container')
const viewport = ref(VIEWPORT_MAX)

// 裁切區在載入圖片後才出現，因此跟著元素本身掛上 / 移除 observer
watch(container, (element, _, onCleanup) => {
  if (!element || typeof ResizeObserver === 'undefined') return
  const observer = new ResizeObserver(([entry]) => {
    if (entry) viewport.value = Math.max(160, Math.min(VIEWPORT_MAX, Math.floor(entry.contentRect.width)))
  })
  observer.observe(element)
  onCleanup(() => observer.disconnect())
})

const viewportComponent = useTemplateRef<InstanceType<typeof CropViewport>>('viewportComponent')
const cropper = useCropper(image, viewport, () => viewportComponent.value?.frame)

const result = shallowRef<CroppedResult | null>(null)
const exporting = ref(false)
const exportError = ref<string | null>(null)

function clearResult() {
  upload.reset()
  if (result.value) URL.revokeObjectURL(result.value.url)
  result.value = null
}

async function onFiles(files: File[]) {
  const file = firstImageFile(files)
  if (!file && files.length === 0) return
  const loaded = await source.load(file)
  if (loaded) clearResult()
}

async function finish() {
  const current = image.value
  if (!current || exporting.value) return
  exporting.value = true
  exportError.value = null
  try {
    const rect = sourceRect(cropper.crop.value, viewport.value)
    const encode = props.exportCrop ?? canvasExport
    const encoded = await encodeWithinBudget((quality) => encode(current.source, rect, OUTPUT_SIZE, quality))
    clearResult()
    result.value = { ...encoded, url: URL.createObjectURL(encoded.blob) }
  } catch (reason) {
    exportError.value = reason instanceof Error ? reason.message : '無法輸出圖片'
  } finally {
    exporting.value = false
  }
}

function startOver() {
  clearResult()
  source.clear()
}

/** 在頁面任何地方 Ctrl+V 貼上圖片；貼上的不是圖片（例如文字）就交給瀏覽器預設行為 */
function onPaste(event: ClipboardEvent) {
  const file = firstImageFile(event.clipboardData?.files)
  if (!file) return
  event.preventDefault()
  void onFiles([file])
}

onMounted(() => window.addEventListener('paste', onPaste))

onBeforeUnmount(() => {
  window.removeEventListener('paste', onPaste)
  if (result.value) URL.revokeObjectURL(result.value.url)
})

const busy = computed(() => status.value === 'loading')
</script>

<template>
  <div class="avatar-cropper">
    <DropZone v-if="!image" @files="onFiles" />

    <p v-if="busy" class="loading" role="status">讀取圖片中…</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div v-if="image && !result" class="workspace">
      <div ref="container" class="crop-col">
        <CropViewport ref="viewportComponent" :image="image" :size="viewport" :cropper="cropper" />
      </div>
      <div class="side">
        <AvatarPreview :image="image" :crop="cropper.crop.value" :viewport="viewport" />
        <p v-if="exportError" class="error" role="alert">{{ exportError }}</p>
        <div class="actions">
          <button type="button" class="primary" :disabled="exporting" @click="finish">
            {{ exporting ? '輸出中…' : '完成裁切' }}
          </button>
          <DropZone compact @files="onFiles" />
          <button type="button" @click="startOver">移除</button>
        </div>
      </div>
    </div>

    <UploadPanel
      v-if="image && result"
      :result="result"
      :original-bytes="image.file.size"
      :status="upload.status.value"
      :progress="upload.progress.value"
      :error="upload.error.value"
      @upload="upload.start(result.blob)"
      @cancel="upload.cancel"
      @retry="upload.retry"
      @recrop="clearResult"
    />

    <label class="demo">
      <span>模擬上傳失敗率 {{ Math.round(failureRate * 100) }}%</span>
      <input v-model.number="failureRate" type="range" min="0" max="1" step="0.1" />
    </label>
  </div>
</template>

<style scoped>
.avatar-cropper {
  display: grid;
  gap: 1rem;
}

.workspace {
  display: grid;
  gap: 1.5rem;
}

@media (min-width: 720px) {
  .workspace {
    grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
    align-items: start;
  }
}

.crop-col {
  min-width: 0;
  max-width: 280px;
  width: 100%;
  justify-self: center;
}

.side {
  display: grid;
  gap: 1rem;
  align-content: start;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.actions button {
  min-height: 2.75rem;
  padding: 0 1rem;
  color: var(--text);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: var(--bg);
  font: inherit;
  cursor: pointer;
}

.actions .primary {
  color: var(--on-accent);
  border-color: var(--accent-solid);
  background: var(--accent-solid);
  font-weight: 600;
}

.actions button:disabled {
  opacity: 0.6;
  cursor: progress;
}

.loading {
  margin: 0;
  color: var(--text-muted);
}

.error {
  margin: 0;
  padding: 0.5rem 0.75rem;
  color: var(--danger);
  border-radius: var(--radius);
  background: var(--danger-bg);
}

.demo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-subtle);
}

.demo input {
  flex: 1;
  min-width: 10rem;
  min-height: 2.75rem;
  accent-color: var(--accent-solid);
}
</style>
