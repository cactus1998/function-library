/** 一個按鍵步驟：修飾鍵狀態加上主鍵（小寫） */
export interface KeyStroke {
  key: string
  meta: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
}

type NavigatorWithUAData = Navigator & { userAgentData?: { platform?: string } }

export function detectMac(nav: Navigator | undefined = globalThis.navigator): boolean {
  if (!nav) return false
  const platform = (nav as NavigatorWithUAData).userAgentData?.platform ?? nav.platform ?? ''
  return /mac|iphone|ipad/i.test(platform)
}

const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Alt', 'Shift', 'CapsLock', 'AltGraph'])

export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(key)
}

/**
 * 解析快捷鍵字串。空白分隔序列步驟，`+` 分隔組合鍵：
 * 'mod+shift+l' 為一步，'g h' 為兩步。`mod` 在 macOS 對應 Meta，其他平台對應 Control。
 */
export function parseShortcut(shortcut: string, isMac: boolean): KeyStroke[] {
  return shortcut
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((step) => {
      const stroke: KeyStroke = { key: '', meta: false, ctrl: false, alt: false, shift: false }
      for (const part of step.split('+')) {
        if (part === 'mod') {
          if (isMac) stroke.meta = true
          else stroke.ctrl = true
        } else if (part === 'meta' || part === 'cmd') stroke.meta = true
        else if (part === 'ctrl') stroke.ctrl = true
        else if (part === 'alt' || part === 'option') stroke.alt = true
        else if (part === 'shift') stroke.shift = true
        else stroke.key = part
      }
      if (!stroke.key) throw new Error(`Invalid shortcut "${shortcut}": missing key`)
      return stroke
    })
}

export function strokeFromEvent(event: KeyboardEvent): KeyStroke {
  return {
    key: event.key.toLowerCase(),
    meta: event.metaKey,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
  }
}

export function sameStroke(a: KeyStroke, b: KeyStroke): boolean {
  return (
    a.key === b.key && a.meta === b.meta && a.ctrl === b.ctrl && a.alt === b.alt && a.shift === b.shift
  )
}

/** 帶 Ctrl / Meta / Alt 的按鍵不會輸入文字，在輸入框中也應該觸發 */
export function hasCommandModifier(stroke: KeyStroke): boolean {
  return stroke.meta || stroke.ctrl || stroke.alt
}

export function strokeToString(stroke: KeyStroke): string {
  return [stroke.meta && 'meta', stroke.ctrl && 'ctrl', stroke.alt && 'alt', stroke.shift && 'shift', stroke.key]
    .filter(Boolean)
    .join('+')
}

const KEY_LABELS: Record<string, string> = {
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  enter: 'Enter',
  escape: 'Esc',
  backspace: 'Backspace',
  ' ': 'Space',
}

function keyLabel(key: string): string {
  return KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key[0]!.toUpperCase() + key.slice(1))
}

/** 顯示用的按鍵標籤：每個步驟一組 <kbd> */
export function formatShortcut(shortcut: string, isMac: boolean): string[][] {
  return parseShortcut(shortcut, isMac).map((stroke) => {
    const keys: string[] = []
    if (isMac) {
      if (stroke.ctrl) keys.push('⌃')
      if (stroke.alt) keys.push('⌥')
      if (stroke.shift) keys.push('⇧')
      if (stroke.meta) keys.push('⌘')
    } else {
      if (stroke.ctrl) keys.push('Ctrl')
      if (stroke.alt) keys.push('Alt')
      if (stroke.shift) keys.push('Shift')
      if (stroke.meta) keys.push('Win')
    }
    keys.push(keyLabel(stroke.key))
    return keys
  })
}

/**
 * 轉成 aria-keyshortcuts 格式（'Control+Shift+L'）。
 * 該屬性以空白分隔「替代」快捷鍵，無法表達序列鍵，因此序列鍵回傳 undefined。
 */
export function toAriaKeyShortcuts(shortcut: string, isMac: boolean): string | undefined {
  const strokes = parseShortcut(shortcut, isMac)
  if (strokes.length !== 1) return undefined
  const stroke = strokes[0]!
  return [
    stroke.meta && 'Meta',
    stroke.ctrl && 'Control',
    stroke.alt && 'Alt',
    stroke.shift && 'Shift',
    stroke.key.length === 1 ? stroke.key.toUpperCase() : keyLabel(stroke.key),
  ]
    .filter(Boolean)
    .join('+')
}

/** 焦點在可輸入元素時，單鍵與序列鍵不應觸發 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag !== 'INPUT') return false
  const type = (target as HTMLInputElement).type
  return !['button', 'checkbox', 'radio', 'range', 'reset', 'submit', 'color', 'file', 'image'].includes(type)
}
