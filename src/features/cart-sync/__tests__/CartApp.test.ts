import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import CartApp from '../components/CartApp.vue'
import CartSyncDemo from '../index.vue'
import { installSyncPlugin } from '../plugins/syncPlugin'
import { createBus, settle } from './helpers'

let bus: ReturnType<typeof createBus>
const wrappers: VueWrapper[] = []

/** 每個分頁一個 pinia；先裝好注入假 channel 的 plugin，元件內的 installSyncPlugin 就不會再裝預設版 */
function tabPinia(): Pinia {
  const pinia = createPinia()
  createApp({}).use(pinia)
  installSyncPlugin(pinia, { createChannel: bus.create, saveDelay: 0 })
  return pinia
}

function mountTab() {
  const wrapper = mount(CartApp, { global: { plugins: [tabPinia()] } })
  wrappers.push(wrapper)
  return wrapper
}

function cartNames(wrapper: VueWrapper) {
  return wrapper.findAll('.row .name').map((node) => node.text())
}

beforeEach(() => {
  localStorage.clear()
  bus = createBus()
})

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

describe('CartApp', () => {
  it('syncs a product added in one tab to the other (AC-01)', async () => {
    const a = mountTab()
    const b = mountTab()
    await a.get('button[aria-label="加入『機械鍵盤』"]').trigger('click')
    await settle()
    expect(cartNames(b)).toEqual(['機械鍵盤'])
    expect(b.get('.total').text()).toBe(a.get('.total').text())
    expect(b.get('[aria-live]').text()).toMatch(/^分頁 \w{3} 將『機械鍵盤』改為 1 件$/)
  })

  it('shows the tab status and an empty cart message', () => {
    const a = mountTab()
    expect(a.text()).toContain('購物車是空的')
    expect(a.get('.status-bar').text()).toContain('BroadcastChannel')
    // jsdom 沒有 navigator.locks
    expect(a.get('.status-bar').text()).toContain('無 leader 選舉')
  })

  it('updates, removes and clears items through the UI', async () => {
    const a = mountTab()
    await a.get('button[aria-label="加入『機械鍵盤』"]').trigger('click')
    await a.get('button[aria-label="加入『無線滑鼠』"]').trigger('click')
    await a.get('button[aria-label="增加『機械鍵盤』數量"]').trigger('click')
    expect(a.get('input[aria-label="『機械鍵盤』數量"]').element).toHaveProperty('value', '2')
    await a.get('button[aria-label="移除『無線滑鼠』"]').trigger('click')
    expect(cartNames(a)).toEqual(['機械鍵盤'])
    await a.get('.clear').trigger('click')
    expect(a.text()).toContain('購物車是空的')
  })

  it('stops syncing after the simulated offline switch is turned on', async () => {
    const a = mountTab()
    const b = mountTab()
    await b.get('.toggle input').setValue(false)
    await a.get('button[aria-label="加入『機械鍵盤』"]').trigger('click')
    await settle()
    expect(cartNames(b)).toEqual([])
    expect(b.text()).toContain('模擬離線')
  })

  it('closes its channel when unmounted (AC-12)', () => {
    const a = mountTab()
    expect(bus.channels.size).toBe(1)
    a.unmount()
    wrappers.splice(wrappers.indexOf(a), 1)
    expect(bus.channels.size).toBe(0)
  })
})

describe('cart-sync page', () => {
  async function mountPage(query: Record<string, string>) {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { render: () => null } },
        { path: '/features/cart-sync', component: CartSyncDemo },
      ],
    })
    await router.push({ path: '/features/cart-sync', query })
    const wrapper = mount(CartSyncDemo, { global: { plugins: [router, tabPinia()] } })
    wrappers.push(wrapper)
    return { wrapper, router }
  }

  it('shows two same-origin iframes pointing at the embed view by default', async () => {
    const { wrapper } = await mountPage({})
    const frames = wrapper.findAll('iframe')
    expect(frames.map((frame) => frame.attributes('title'))).toEqual(['分頁 1', '分頁 2'])
    expect(frames[0].attributes('src')).toBe('/features/cart-sync?embed=1')
    expect(wrapper.find('.cart-app').exists()).toBe(false)
  })

  it('renders only the cart inside an iframe, never nested iframes (EC-20)', async () => {
    const { wrapper } = await mountPage({ embed: '1' })
    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.find('[role="radiogroup"]').exists()).toBe(false)
    expect(wrapper.find('.cart-app').exists()).toBe(true)
  })

  it('switches to the single-tab view through the query string', async () => {
    const { wrapper, router } = await mountPage({})
    await wrapper.get('input[value="single"]').trigger('change')
    // 路由導航會經過多段 Promise，等全部完成
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ view: 'single' })
    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.find('.cart-app').exists()).toBe(true)
    expect(wrapper.get('a[target="_blank"]').attributes('href')).toBe('/features/cart-sync?view=single')
  })
})
