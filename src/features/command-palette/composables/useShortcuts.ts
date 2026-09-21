import { computed, onScopeDispose, watch, type Ref } from 'vue'
import type { ShortcutBinding } from '../types'
import {
  detectMac,
  hasCommandModifier,
  isEditableTarget,
  isModifierKey,
  parseShortcut,
  sameStroke,
  strokeFromEvent,
  strokeToString,
  type KeyStroke,
} from '../utils/shortcut'

export const SEQUENCE_TIMEOUT = 1000

interface ParsedBinding {
  strokes: KeyStroke[]
  binding: ShortcutBinding
}

export interface ShortcutOptions {
  enabled: Ref<boolean>
  isMac?: boolean
  target?: Window
}

function startsWith(strokes: KeyStroke[], prefix: KeyStroke[]): boolean {
  return prefix.length <= strokes.length && prefix.every((s, i) => sameStroke(s, strokes[i]!))
}

export function useShortcuts(bindings: Ref<ShortcutBinding[]>, options: ShortcutOptions) {
  const { enabled, isMac = detectMac(), target = window } = options

  const parsed = computed<ParsedBinding[]>(() => {
    const seen = new Map<string, string>()
    const list: ParsedBinding[] = []
    for (const binding of bindings.value) {
      const strokes = parseShortcut(binding.shortcut, isMac)
      const key = strokes.map(strokeToString).join(' ')
      if (seen.has(key)) {
        if (import.meta.env.DEV) {
          console.warn(`[useShortcuts] "${binding.shortcut}" 重複註冊，保留先註冊者（${seen.get(key)}）`)
        }
        continue
      }
      seen.set(key, binding.shortcut)
      list.push({ strokes, binding })
    }
    return list
  })

  let buffer: KeyStroke[] = []
  let lastTime = 0

  function reset() {
    buffer = []
  }

  function candidates(editable: boolean): ParsedBinding[] {
    // 在輸入框中只允許單步且帶 Ctrl / Meta / Alt 的組合鍵
    return editable
      ? parsed.value.filter((p) => p.strokes.length === 1 && hasCommandModifier(p.strokes[0]!))
      : parsed.value
  }

  /** 完全符合回傳該綁定；是某個序列的前綴回傳 'prefix'；都不是回傳 null */
  function evaluate(sequence: KeyStroke[], list: ParsedBinding[]): ParsedBinding | 'prefix' | null {
    const exact = list.find((p) => p.strokes.length === sequence.length && startsWith(p.strokes, sequence))
    if (exact) return exact
    return list.some((p) => startsWith(p.strokes, sequence)) ? 'prefix' : null
  }

  function onKeydown(event: KeyboardEvent) {
    if (!enabled.value || event.isComposing || event.keyCode === 229 || isModifierKey(event.key)) return

    const now = performance.now()
    if (now - lastTime > SEQUENCE_TIMEOUT) reset()
    lastTime = now

    const list = candidates(isEditableTarget(event.target))
    const stroke = strokeFromEvent(event)

    let sequence = [...buffer, stroke]
    let result = evaluate(sequence, list)
    // 序列中斷：以目前這一鍵重新開始比對（例如「x g h」仍可觸發「g h」）
    if (result === null && buffer.length > 0) {
      sequence = [stroke]
      result = evaluate(sequence, list)
    }

    if (result === 'prefix') {
      buffer = sequence
    } else {
      reset()
      if (result) {
        event.preventDefault()
        result.binding.handler(event)
      }
    }
  }

  watch(enabled, (value) => {
    if (!value) reset()
  })

  target.addEventListener('keydown', onKeydown)
  onScopeDispose(() => target.removeEventListener('keydown', onKeydown))

  return { reset }
}
