const priceFormat = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  maximumFractionDigits: 0,
})

const timeFormat = new Intl.DateTimeFormat('zh-TW', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  hour12: false,
})

export function formatPrice(value: number): string {
  return priceFormat.format(value)
}

export function formatTime(timestamp: number): string {
  return timeFormat.format(timestamp)
}
