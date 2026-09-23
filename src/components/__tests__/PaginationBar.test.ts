import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PaginationBar from '../PaginationBar.vue'

const base = { page: 2, totalPages: 5, pageSize: 10 as const, total: 45, startIndex: 10, endIndex: 20 }

describe('PaginationBar', () => {
  it('shows the current range and marks the active page', () => {
    const wrapper = mount(PaginationBar, { props: base })
    expect(wrapper.find('.range').text()).toBe('第 11–20 筆，共 45 筆')
    expect(wrapper.find('[aria-current="page"]').text()).toBe('2')
  })

  it('emits page changes from numbers and prev/next', async () => {
    const wrapper = mount(PaginationBar, { props: base })
    await wrapper.find('[aria-label="第 4 頁"]').trigger('click')
    const [prev, next] = wrapper.findAll('.step')
    await prev!.trigger('click')
    await next!.trigger('click')
    expect(wrapper.emitted('update:page')).toEqual([[4], [1], [3]])
  })

  it('does not emit for the current page and disables edges', async () => {
    const wrapper = mount(PaginationBar, { props: { ...base, page: 1, startIndex: 0, endIndex: 10 } })
    await wrapper.find('[aria-current="page"]').trigger('click')
    expect(wrapper.emitted('update:page')).toBeUndefined()
    expect(wrapper.findAll('.step')[0]!.attributes('disabled')).toBeDefined()
  })

  it('emits page size as a number', async () => {
    const wrapper = mount(PaginationBar, { props: base })
    await wrapper.find('select').setValue('30')
    expect(wrapper.emitted('update:pageSize')).toEqual([[30]])
  })

  it('hides page buttons when there is only one page', () => {
    const wrapper = mount(PaginationBar, {
      props: { ...base, page: 1, totalPages: 1, total: 4, startIndex: 0, endIndex: 4 },
    })
    expect(wrapper.find('.pages').exists()).toBe(false)
  })
})
