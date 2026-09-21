import { computed, type Ref } from 'vue'
import type { PlainDate } from '../types'
import {
  addDays,
  addMonths,
  addMonthsToMonth,
  clampDate,
  endOfWeek,
  monthOf,
  startOfWeek,
} from '../utils/plainDate'

export type NavResult = 'moved' | 'select' | 'ignored'

/**
 * WAI-ARIA Date Picker 的 grid 鍵盤模型。焦點日期由呼叫端持有，顯示中的月份由焦點推導：
 * 焦點移到前後月的補位格時月份自動切換。焦點不會移出 [min, max]。
 */
export function useCalendarNav(focused: Ref<PlainDate>, min: Ref<PlainDate>, max: Ref<PlainDate>) {
  const visibleMonth = computed(() => monthOf(focused.value))
  const canPrev = computed(() => visibleMonth.value > monthOf(min.value))
  const canNext = computed(() => visibleMonth.value < monthOf(max.value))

  function moveTo(date: PlainDate): boolean {
    const next = clampDate(date, min.value, max.value)
    if (next === focused.value) return false
    focused.value = next
    return true
  }

  function prevMonth() {
    if (canPrev.value) moveTo(addMonths(focused.value, -1))
  }

  function nextMonth() {
    if (canNext.value) moveTo(addMonths(focused.value, 1))
  }

  function targetFor(key: string, date: PlainDate): PlainDate | null {
    switch (key) {
      case 'ArrowLeft':
        return addDays(date, -1)
      case 'ArrowRight':
        return addDays(date, 1)
      case 'ArrowUp':
        return addDays(date, -7)
      case 'ArrowDown':
        return addDays(date, 7)
      case 'Home':
        return startOfWeek(date)
      case 'End':
        return endOfWeek(date)
      case 'PageUp':
        return addMonths(date, -1)
      case 'PageDown':
        return addMonths(date, 1)
      default:
        return null
    }
  }

  /** 處理過的按鍵會 preventDefault（避免方向鍵與 PageDown 捲動頁面） */
  function onKeydown(event: KeyboardEvent): NavResult {
    if (event.altKey || event.ctrlKey || event.metaKey) return 'ignored'
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      return 'select'
    }
    const target = targetFor(event.key, focused.value)
    if (!target) return 'ignored'
    event.preventDefault()
    moveTo(target)
    return 'moved'
  }

  return {
    visibleMonth,
    canPrev,
    canNext,
    prevMonthLabel: computed(() => addMonthsToMonth(visibleMonth.value, -1)),
    nextMonthLabel: computed(() => addMonthsToMonth(visibleMonth.value, 1)),
    moveTo,
    prevMonth,
    nextMonth,
    onKeydown,
  }
}
