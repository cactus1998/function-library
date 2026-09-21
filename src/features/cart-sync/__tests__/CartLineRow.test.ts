import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CartLineRow from '../components/CartLineRow.vue'
import { findProduct } from '../data/products'
import type { CartItem, CartLine } from '../types'
import { line } from './helpers'

const SELF = 'self0000'

function item(qty: number, extra: Partial<CartLine> = {}): CartItem {
  const product = findProduct('keyboard')!
  return { product, line: line('keyboard', qty, 1, SELF, extra), subtotal: product.price * qty }
}

function mountRow(qty = 2, extra: Partial<CartLine> = {}) {
  const wrapper = mount(CartLineRow, { props: { item: item(qty, extra), selfTabId: SELF } })
  const input = wrapper.get<HTMLInputElement>('input')
  return { wrapper, input }
}

async function type(input: ReturnType<typeof mountRow>['input'], text: string) {
  await input.trigger('focus')
  await input.setValue(text)
}

describe('CartLineRow', () => {
  it('emits the parsed quantity on blur (EC-16)', async () => {
    const { wrapper, input } = mountRow()
    await type(input, '3.7')
    await input.trigger('blur')
    expect(wrapper.emitted('change')).toEqual([[3]])
    expect(input.element.value).toBe('3')
  })

  it('commits on Enter and clamps to 99', async () => {
    const { wrapper, input } = mountRow()
    await type(input, '150')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('change')).toEqual([[99]])
  })

  it.each(['', 'abc'])('restores the current quantity for %j (EC-16)', async (text) => {
    const { wrapper, input } = mountRow(4)
    await type(input, text)
    await input.trigger('blur')
    expect(wrapper.emitted('change')).toBeUndefined()
    expect(input.element.value).toBe('4')
  })

  it('does not delete the item when 0 is typed', async () => {
    const { wrapper, input } = mountRow(4)
    await type(input, '0')
    await input.trigger('blur')
    expect(wrapper.emitted('change')).toEqual([[1]])
    expect(wrapper.emitted('remove')).toBeUndefined()
  })

  it('reverts the draft on Escape', async () => {
    const { wrapper, input } = mountRow(4)
    await type(input, '9')
    await input.trigger('keydown', { key: 'Escape' })
    expect(input.element.value).toBe('4')
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('keeps the user draft while a remote update arrives, then writes on blur', async () => {
    const { wrapper, input } = mountRow(2)
    await type(input, '6')
    await wrapper.setProps({ item: item(5, { tabId: 'other' }) })
    expect(input.element.value).toBe('6')
    await input.trigger('blur')
    expect(wrapper.emitted('change')).toEqual([[6]])
  })

  it('follows remote updates when not editing', async () => {
    const { wrapper, input } = mountRow(2)
    await wrapper.setProps({ item: item(5, { tabId: 'bc90ffff' }) })
    expect(input.element.value).toBe('5')
    expect(wrapper.text()).toContain('分頁 BC9 修改')
  })

  it('steps with the buttons and disables them at the limits', async () => {
    const { wrapper } = mountRow(1)
    const [minus, plus] = wrapper.findAll('.stepper button')
    expect(minus.attributes('disabled')).toBeDefined()
    await plus.trigger('click')
    expect(wrapper.emitted('change')).toEqual([[2]])

    await wrapper.setProps({ item: item(99) })
    expect(plus.attributes('disabled')).toBeDefined()
    expect(minus.attributes('aria-label')).toBe('減少『機械鍵盤』數量')
  })

  it('marks stock corrections and emits remove', async () => {
    const { wrapper } = mountRow(1, { corrected: true, tabId: 'leader' })
    expect(wrapper.text()).toContain('已依庫存調整')
    await wrapper.get('.remove').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})
