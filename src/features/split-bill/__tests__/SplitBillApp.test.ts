import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SplitBillApp from '../components/SplitBillApp.vue'

const wrappers: VueWrapper[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  vi.useRealTimers()
})

function mountApp(props: { confirm?: (message: string) => boolean } = {}) {
  let n = 0
  const writeText = vi.fn().mockResolvedValue(undefined)
  const wrapper = mount(SplitBillApp, {
    attachTo: document.body,
    props: { options: { storage: null, createId: () => `id${++n}` }, clipboard: { writeText }, ...props },
  })
  wrappers.push(wrapper)
  return { wrapper, writeText }
}

async function addExpense(wrapper: VueWrapper, title: string, amount: string) {
  await wrapper.get('#expense-title').setValue(title)
  await wrapper.get('#expense-amount').setValue(amount)
  await wrapper.get('form.expense-form').trigger('submit')
  await flushPromises()
}

const status = (wrapper: VueWrapper) => wrapper.get('[role="status"].visually-hidden').text()
const transfers = (wrapper: VueWrapper) => wrapper.findAll('.transfers li').map((li) => li.findAll('span').map((span) => span.text()).join(' '))

describe('SplitBillApp', () => {
  it('adds an equally split dinner and shows the transfers (AC-01)', async () => {
    const { wrapper } = mountApp()
    expect(wrapper.text()).toContain('大家都結清了')
    await addExpense(wrapper, '晚餐', '1000')
    expect(transfers(wrapper)).toEqual(['小明 → 我 NT$333', '小華 → 我 NT$333'])
    expect(wrapper.get('.expenses').text()).toContain('3 人平分')
    expect(status(wrapper)).toBe('已加入「晚餐」')
    // 表單清空，可以接著輸入下一筆
    expect((wrapper.get('#expense-title').element as HTMLInputElement).value).toBe('')
  })

  it('previews expression results and errors while typing (AC-02, EC-06)', async () => {
    const { wrapper } = mountApp()
    await wrapper.get('#expense-amount').setValue('1280+350')
    expect(wrapper.get('#expense-amount-hint').text()).toBe('= NT$1,630')
    await wrapper.get('#expense-amount').setValue('100/0')
    expect(wrapper.get('#expense-amount-hint').text()).toBe('不能除以 0')
    expect(wrapper.get('#expense-amount').attributes('aria-invalid')).toBe('true')
  })

  it('shows validation errors only after submitting (EC-06, EC-17)', async () => {
    const { wrapper } = mountApp()
    expect(wrapper.find('.errors').exists()).toBe(false)
    await wrapper.findAll('input[name="split-mode"]')[0]!.setValue(true)
    for (const box of wrapper.findAll('.people input[type="checkbox"]')) await box.setValue(false)
    await wrapper.get('form.expense-form').trigger('submit')
    const errors = wrapper.get('.errors').text()
    expect(errors).toContain('請輸入金額')
    expect(errors).toContain('請輸入帳目名稱')
    expect(errors).toContain('至少要有 1 位參與者')
    expect(wrapper.find('.expenses li').exists()).toBe(false)
  })

  it('disables saving until exact amounts add up (AC-03, EC-03)', async () => {
    const { wrapper } = mountApp()
    await wrapper.get('#expense-title').setValue('機票')
    await wrapper.get('#expense-amount').setValue('1000')
    await wrapper.get('input[name="split-mode"][value="exact"]').setValue(true)
    await wrapper.get('#exact-m-me').setValue('400')
    await wrapper.get('#exact-m-ming').setValue('500')
    expect(wrapper.get('.remaining').text()).toBe('還差 NT$100')
    expect(wrapper.get('button.primary').attributes('disabled')).toBeDefined()
    await wrapper.get('#exact-m-hua').setValue('100')
    expect(wrapper.get('.remaining').text()).toBe('金額相符')
    await wrapper.get('form.expense-form').trigger('submit')
    expect(wrapper.get('.expenses').text()).toContain('指定金額')
  })

  it('splits by shares and includes the service charge (EC-02, EC-04)', async () => {
    const { wrapper } = mountApp()
    await wrapper.get('input[name="split-mode"][value="shares"]').setValue(true)
    await wrapper.get('#share-m-me').setValue('2')
    await wrapper.get('.check input[type="checkbox"]').setValue(true)
    await addExpense(wrapper, '燒肉', '1234')
    const owed = wrapper.findAll('.settlement tbody tr').map((tr) => tr.findAll('td')[1]!.text())
    // 1357 按 2:1:1 分
    expect(owed).toEqual(['NT$679', 'NT$339', 'NT$339'])
    expect(wrapper.get('.expenses').text()).toContain('NT$1,357')
  })

  it('edits an expense and focuses the form', async () => {
    const { wrapper } = mountApp()
    await addExpense(wrapper, '晚餐', '900')
    await wrapper.get('button[aria-label="編輯『晚餐』"]').trigger('click')
    await flushPromises()
    expect(document.activeElement?.id).toBe('expense-title')
    expect(wrapper.get('#expense-form-title').text()).toBe('編輯「晚餐」')
    await wrapper.get('#expense-amount').setValue('1200')
    await wrapper.get('form.expense-form').trigger('submit')
    await flushPromises()
    expect(wrapper.findAll('.expenses li')).toHaveLength(1)
    expect(wrapper.get('.expenses').text()).toContain('NT$1,200')
    expect(status(wrapper)).toBe('已更新「晚餐」')
  })

  it('removes an expense with an undo toast (AC-05, EC-10)', async () => {
    vi.useFakeTimers()
    const { wrapper } = mountApp()
    await addExpense(wrapper, '晚餐', '900')
    await wrapper.get('button[aria-label="刪除『晚餐』"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.toast').text()).toContain('已刪除「晚餐」')
    await wrapper.get('.toast button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.toast').exists()).toBe(false)
    expect(wrapper.findAll('.expenses li')).toHaveLength(1)
    expect(status(wrapper)).toBe('已復原「晚餐」')

    await wrapper.get('button[aria-label="刪除『晚餐』"]').trigger('click')
    await vi.advanceTimersByTimeAsync(5000)
    expect(wrapper.find('.toast').exists()).toBe(false)
    expect(wrapper.text()).toContain('還沒有帳目')
  })

  it('adds members, blocks removing involved members and shows why (EC-08, EC-09)', async () => {
    const { wrapper } = mountApp()
    await wrapper.get('#new-member').setValue('小美')
    await wrapper.get('form.add').trigger('submit')
    expect(wrapper.findAll('.members li')).toHaveLength(4)
    // 新成員自動加入平分
    expect(wrapper.findAll('.people input[type="checkbox"]')).toHaveLength(4)

    await wrapper.get('#new-member').setValue('小美')
    await wrapper.get('form.add').trigger('submit')
    expect(wrapper.get('#new-member-error').text()).toBe('已有同名成員')

    await addExpense(wrapper, '晚餐', '1000')
    await wrapper.get('button[aria-label="刪除『小明』"]').trigger('click')
    expect(wrapper.text()).toContain('小明 有相關帳目，請先修改帳目')
    expect(wrapper.findAll('.members li')).toHaveLength(4)
  })

  it('renames a member on change and reverts invalid names', async () => {
    const { wrapper } = mountApp()
    const input = wrapper.get('input[aria-label="小明 的名稱"]')
    // setValue 會同時觸發 input 與 change
    await input.setValue('小華')
    expect(wrapper.text()).toContain('已有同名成員')
    expect((input.element as HTMLInputElement).value).toBe('小明')
    await input.setValue('阿明')
    expect(wrapper.get('#expense-payer').text()).toContain('阿明')
  })

  it('copies the settlement text and announces it (AC-07)', async () => {
    const { wrapper, writeText } = mountApp()
    await addExpense(wrapper, '晚餐', '1000')
    await wrapper.get('button.copy').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('聚餐分帳（1 筆，共 NT$1,000）\n小明 → 我 NT$333\n小華 → 我 NT$333')
    expect(status(wrapper)).toBe('已複製結算文字')
  })

  it('asks before resetting', async () => {
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    const { wrapper } = mountApp({ confirm })
    await addExpense(wrapper, '晚餐', '1000')
    await wrapper.get('button.reset').trigger('click')
    expect(wrapper.findAll('.expenses li')).toHaveLength(1)
    await wrapper.get('button.reset').trigger('click')
    expect(wrapper.text()).toContain('還沒有帳目')
    expect(confirm).toHaveBeenCalledTimes(2)
  })
})
