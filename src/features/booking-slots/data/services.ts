import type { Service, ServiceId } from '../types'

export const SERVICES: readonly Service[] = [
  { id: 'cut', name: '剪髮', duration: 30, price: 400 },
  { id: 'wash-cut', name: '洗剪', duration: 60, price: 600 },
  { id: 'color', name: '染髮', duration: 120, price: 2200 },
  { id: 'perm', name: '燙髮', duration: 150, price: 2800 },
]

export function findService(id: ServiceId): Service {
  const service = SERVICES.find((s) => s.id === id)
  if (!service) throw new Error(`Unknown service "${id}"`)
  return service
}

export function isServiceId(value: unknown): value is ServiceId {
  return SERVICES.some((s) => s.id === value)
}
