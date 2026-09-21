import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLeaderElection } from '../composables/useLeaderElection'
import { settle, withScope } from './helpers'

interface Waiter {
  callback: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

/** 單一 exclusive lock 的最小 LockManager：依請求順序授予，callback 的 Promise 結束才釋放 */
function createLocks() {
  const queue: Waiter[] = []
  let held = false

  function grantNext() {
    if (held) return
    const next = queue.shift()
    if (!next) return
    held = true
    next.callback().then(
      (value) => {
        held = false
        next.resolve(value)
        grantNext()
      },
      (error: unknown) => {
        held = false
        next.reject(error)
        grantNext()
      },
    )
  }

  const locks = {
    request(_name: string, options: { signal?: AbortSignal }, callback: () => Promise<unknown>) {
      return new Promise((resolve, reject) => {
        const waiter: Waiter = { callback, resolve, reject }
        options.signal?.addEventListener('abort', () => {
          const index = queue.indexOf(waiter)
          if (index === -1) return
          queue.splice(index, 1)
          reject(new DOMException('The request was aborted', 'AbortError'))
        })
        queue.push(waiter)
        grantNext()
      })
    },
  }
  return { locks: locks as unknown as LockManager, queue }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useLeaderElection', () => {
  it('makes the first tab leader and queues the rest', async () => {
    const { locks } = createLocks()
    const first = withScope(() => useLeaderElection('leader', locks))
    const second = withScope(() => useLeaderElection('leader', locks))
    await settle()
    expect(first.result.isLeader.value).toBe(true)
    expect(second.result.isLeader.value).toBe(false)
    expect(first.result.supported).toBe(true)
    first.stop()
    second.stop()
  })

  it('hands leadership to the next tab when the leader closes (AC-07, EC-10)', async () => {
    const { locks } = createLocks()
    const first = withScope(() => useLeaderElection('leader', locks))
    const second = withScope(() => useLeaderElection('leader', locks))
    await settle()
    first.stop()
    expect(first.result.isLeader.value).toBe(false)
    await settle()
    expect(second.result.isLeader.value).toBe(true)
    second.stop()
  })

  it('leaves the queue quietly when disposed while waiting', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { locks, queue } = createLocks()
    const first = withScope(() => useLeaderElection('leader', locks))
    const second = withScope(() => useLeaderElection('leader', locks))
    await settle()
    second.stop()
    expect(queue).toHaveLength(0)
    first.stop()
    await settle()
    expect(second.result.isLeader.value).toBe(false)
    expect(error).not.toHaveBeenCalled()
  })

  it('reports no support when Web Locks are missing (EC-11)', () => {
    const { result, stop } = withScope(() => useLeaderElection('leader', null))
    expect(result).toMatchObject({ supported: false })
    expect(result.isLeader.value).toBe(false)
    stop()
  })
})
