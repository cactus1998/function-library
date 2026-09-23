import type { Question } from '../types'

export const vueQuestions: Question[] = [
  {
    id: 'vue-reactive-destructure',
    topic: 'vue',
    level: 'basic',
    prompt: '執行後 state.count 的值為何？',
    code: `const state = reactive({ count: 0 })
let { count } = state
count++`,
    options: ['0', '1', 'NaN', '拋出錯誤'],
    answer: 0,
    explanation:
      '解構會把當下的值複製到區域變數，失去與 Proxy 的連結。要保留響應性可用 toRefs(state) 或 toRef(state, "count")。',
  },
  {
    id: 'vue-computed-cache',
    topic: 'vue',
    level: 'basic',
    prompt: 'computed 與在模板中呼叫 method 的主要差異為何？',
    options: [
      'computed 可以接受參數',
      'computed 會依響應式依賴快取結果，依賴不變就不重新計算',
      'method 的結果會被快取',
      'computed 只能回傳字串',
    ],
    answer: 1,
    explanation: 'computed 只在依賴變動後第一次讀取時重新計算；method 每次重新渲染都會執行。',
  },
  {
    id: 'vue-v-if-show',
    topic: 'vue',
    level: 'basic',
    prompt: '關於 v-if 與 v-show，下列何者正確？',
    options: [
      'v-show 為 false 時元素不會被渲染到 DOM',
      'v-if 切換時只改變 CSS display',
      'v-show 永遠會渲染，只切換 display；適合頻繁切換',
      '兩者都支援 <template> 與 v-else',
    ],
    answer: 2,
    explanation:
      'v-if 會真正建立與銷毀元素（含子元件生命週期），初始成本低、切換成本高；v-show 相反。v-show 不支援 <template> 與 v-else。',
  },
  {
    id: 'vue-key-index',
    topic: 'vue',
    level: 'intermediate',
    prompt: 'v-for 列表可能插入、刪除或重新排序時，為什麼不建議用 index 當 key？',
    options: [
      'index 不是字串，Vue 不接受',
      '順序改變時 key 對應到不同資料，元件或輸入框的狀態會錯置',
      '使用 index 會讓 Vue 停止追蹤陣列',
      '沒有影響，只是風格問題',
    ],
    answer: 1,
    explanation:
      'Vue 依 key 決定重用哪個節點。在開頭插入一筆時所有 index 都位移，舊節點（含內部狀態）會被套上錯誤資料。應使用資料本身穩定的 id。',
  },
  {
    id: 'vue-next-tick',
    topic: 'vue',
    level: 'intermediate',
    prompt: '修改資料後要立刻讀取更新後的 DOM（例如捲動到新項目），應該怎麼做？',
    options: [
      '直接讀取，DOM 已同步更新',
      '使用 setTimeout(fn, 1000)',
      'await nextTick() 後再讀取',
      '呼叫 forceUpdate()',
    ],
    answer: 2,
    explanation: 'Vue 會把同一輪的變更合併，在下一個 microtask 才批次更新 DOM；nextTick 回傳的 Promise 在該次更新完成後 resolve。',
  },
  {
    id: 'vue-mounted',
    topic: 'vue',
    level: 'basic',
    prompt: 'Composition API 中，最早可以透過 template ref 存取 DOM 元素的生命週期為何？',
    options: ['setup 本體', 'onBeforeMount', 'onMounted', 'onBeforeUpdate'],
    answer: 2,
    explanation: 'setup 與 onBeforeMount 執行時元素尚未掛載，template ref 仍是 null；onMounted 時 ref 已指向真實 DOM。',
  },
  {
    id: 'vue-props-mutate',
    topic: 'vue',
    level: 'basic',
    prompt: '子元件想修改父元件傳入的 prop，正確做法為何？',
    options: [
      '直接修改 props.value',
      'emit 事件讓父元件修改，或使用 defineModel',
      '用 watch 監聽 prop 後重新賦值給 props',
      '把 prop 改成全域變數',
    ],
    answer: 1,
    explanation:
      'props 是單向資料流，子元件直接修改會出現警告，也讓資料來源難以追蹤。雙向綁定用 v-model，子元件以 defineModel() 或 emit("update:xxx") 通知。',
  },
  {
    id: 'vue-watch-getter',
    topic: 'vue',
    level: 'advanced',
    prompt: '執行 state.user.name = "b" 後，callback 會不會被呼叫？',
    code: `const state = reactive({ user: { name: 'a' } })
watch(() => state.user, callback)
state.user.name = 'b'`,
    options: ['會，reactive 物件預設深層監聽', '不會，getter 回傳的仍是同一個物件', '會，但延遲到下一輪', '拋出錯誤'],
    answer: 1,
    explanation:
      'getter 形式只在回傳值改變時觸發，而 state.user 參照沒變。需要加上 { deep: true }，或直接 watch(state.user, …)（傳入 reactive 物件會自動深層監聽）。',
  },
  {
    id: 'vue-v-model',
    topic: 'vue',
    level: 'intermediate',
    prompt: 'Vue 3 中，在自訂元件上使用 v-model，預設對應的 prop 與事件為何？',
    options: [
      'value / input',
      'modelValue / update:modelValue',
      'model / change',
      'value / update:value',
    ],
    answer: 1,
    explanation: 'Vue 3 預設為 modelValue 與 update:modelValue（Vue 2 是 value / input）。v-model:title 則對應 title / update:title。',
  },
  {
    id: 'vue-define-expose',
    topic: 'vue',
    level: 'intermediate',
    prompt: '<script setup> 元件中，父元件透過 template ref 取不到子元件的方法，原因為何？',
    options: [
      '<script setup> 元件預設是封閉的，需要 defineExpose 才會公開',
      'template ref 只能取得 DOM 元素',
      '方法必須寫在 methods 選項中',
      '需要改用 provide / inject',
    ],
    answer: 0,
    explanation: '<script setup> 的綁定預設不會暴露到元件實例上，要用 defineExpose({ focus }) 明確公開。',
  },
  {
    id: 'vue-shallow-ref',
    topic: 'vue',
    level: 'advanced',
    prompt: '執行 list.value.push(4) 後，畫面會不會更新？',
    code: 'const list = shallowRef([1, 2, 3])',
    options: [
      '會，shallowRef 與 ref 行為相同',
      '不會，shallowRef 只追蹤 .value 本身的替換',
      '會，但只更新第一個元素',
      '拋出錯誤，陣列是唯讀的',
    ],
    answer: 1,
    explanation:
      'shallowRef 不會把內部值轉成深層 Proxy，只有替換 .value 才觸發。應寫成 list.value = [...list.value, 4]，或修改後呼叫 triggerRef(list)。適合大型不可變資料。',
  },
  {
    id: 'vue-ref-unwrap',
    topic: 'vue',
    level: 'basic',
    prompt: '關於 ref 的 .value，下列何者正確？',
    options: [
      '在 <script setup> 與模板中都必須寫 .value',
      '在 <script setup> 要寫 .value，模板中的頂層 ref 會自動解包',
      '兩個地方都不用寫 .value',
      '只有物件型別的 ref 需要 .value',
    ],
    answer: 1,
    explanation:
      '模板會自動解包頂層的 ref。如果 ref 是巢狀在一般物件的屬性裡（例如 obj.count），模板中的運算式就不會自動解包。',
  },
  {
    id: 'vue-prevent-modifier',
    topic: 'vue',
    level: 'basic',
    prompt: '<form @submit.prevent="onSubmit"> 中的 .prevent 等同於什麼？',
    options: [
      'event.stopPropagation()',
      'event.preventDefault()',
      '只觸發一次',
      '事件只在元素本身觸發時處理',
    ],
    answer: 1,
    explanation: '.prevent 呼叫 preventDefault，避免表單送出時重新整理頁面。.stop 對應 stopPropagation，.once 只觸發一次，.self 只處理 target 是元素本身的事件。',
  },
  {
    id: 'vue-class-binding',
    topic: 'vue',
    level: 'basic',
    prompt: "isActive 為 true、hasError 為 false 時，下列元素的 class 為何？",
    code: `<div class="box" :class="{ active: isActive, 'text-danger': hasError }"></div>`,
    options: ['"box"', '"box active"', '"active"', '"box active text-danger"'],
    answer: 1,
    explanation: '物件語法中值為 truthy 的鍵才會加入 class，而且會和靜態的 class 合併。',
  },
  {
    id: 'vue-named-slot',
    topic: 'vue',
    level: 'basic',
    prompt: '<template #header> 是哪個寫法的縮寫？',
    options: ['v-bind:header', 'v-slot:header', 'v-on:header', 'slot="header"'],
    answer: 1,
    explanation: '# 是 v-slot 的縮寫，就像 : 是 v-bind、@ 是 v-on 的縮寫。作用域插槽可寫成 #item="{ item }" 取得子元件傳出的資料。',
  },
  {
    id: 'vue-emits-type',
    topic: 'vue',
    level: 'basic',
    prompt: "以 defineEmits<{ change: [id: number] }>() 宣告後，emit('change', '1') 會怎樣？",
    options: ['正常觸發，id 為 "1"', 'TypeScript 編譯錯誤：參數型別不符', '自動轉成數字 1', '事件不會被觸發，也沒有錯誤'],
    answer: 1,
    explanation:
      '以型別宣告 emits 可以在編譯期檢查事件名稱與參數，父元件的 @change 處理函式也會得到正確的參數型別。這只是型別檢查，執行期不會做轉換。',
  },
  {
    id: 'vue-for-if-priority',
    topic: 'vue',
    level: 'intermediate',
    prompt: 'Vue 3 中，下列模板會發生什麼事？',
    code: '<li v-for="item in items" v-if="item.visible">{{ item.name }}</li>',
    options: [
      '只渲染 visible 為 true 的項目',
      'v-if 先於 v-for 執行，此時 item 尚未定義而報錯',
      '渲染所有項目，v-if 被忽略',
      '和 Vue 2 行為完全相同',
    ],
    answer: 1,
    explanation:
      'Vue 3 中同一元素上 v-if 的優先順序高於 v-for（Vue 2 相反）。應該用 computed 先過濾，或把 v-for 移到外層的 <template>。',
  },
  {
    id: 'vue-watch-effect',
    topic: 'vue',
    level: 'intermediate',
    prompt: '關於 watchEffect，下列何者正確？',
    options: [
      '必須明確指定要監聽的來源',
      '預設要等依賴改變後才第一次執行',
      '立即執行一次，並自動追蹤執行期間同步讀取到的響應式依賴',
      '可以拿到變更前的舊值',
    ],
    answer: 2,
    explanation:
      'watchEffect 會立即執行並自動收集依賴，但 await 之後才讀取的值不會被追蹤。需要舊值、指定來源或延遲執行時用 watch。',
  },
  {
    id: 'vue-keep-alive',
    topic: 'vue',
    level: 'intermediate',
    prompt: '被 <KeepAlive> 包住的元件切換出去時，會發生什麼事？',
    options: [
      '元件被銷毀，觸發 onUnmounted',
      '元件實例被快取、狀態保留，觸發 onDeactivated',
      '元件重新渲染一次',
      '元件的 DOM 以 display: none 隱藏',
    ],
    answer: 1,
    explanation:
      'KeepAlive 會快取元件實例並把 DOM 移出畫面，再次顯示時觸發 onActivated。可用 include / exclude / max 控制快取範圍，避免記憶體無限成長。',
  },
  {
    id: 'vue-scoped-deep',
    topic: 'vue',
    level: 'intermediate',
    prompt: '父元件的 scoped 樣式想修改子元件內部的元素，應該怎麼寫？',
    options: [
      '直接寫子元件內部的 class 即可',
      '使用 :deep(.inner) 選擇器',
      '在子元件加上 !important',
      'scoped 樣式無法做到，只能改用全域樣式',
    ],
    answer: 1,
    explanation:
      'scoped 會在選擇器最後加上 data-v 屬性，只能選到自己模板中的元素（子元件只有根節點會帶父元件的 data-v）。:deep() 讓屬性選擇器加在前段，就能選到內部元素。',
  },
  {
    id: 'vue-lazy-route',
    topic: 'vue',
    level: 'intermediate',
    prompt: "路由設定 component: () => import('./views/About.vue') 的主要好處為何？",
    options: [
      '讓元件支援 SSR',
      '打包時拆成獨立 chunk，進入該路由時才下載',
      '讓元件的狀態在切換路由時保留',
      '讓元件可以使用 async setup',
    ],
    answer: 1,
    explanation: '動態 import 讓打包工具做 code splitting，縮小首次載入的 bundle。一般元件可用 defineAsyncComponent 達到同樣效果。',
  },
  {
    id: 'vue-store-to-refs',
    topic: 'vue',
    level: 'intermediate',
    prompt: '從 Pinia store 解構 state 時，要保留響應性應該怎麼做？',
    code: `const store = useCounterStore()
const { count } = store // count 不會隨 store 更新`,
    options: [
      '改用 const { count } = reactive(store)',
      '使用 storeToRefs(store) 解構 state 與 getters',
      '把 store 包在 computed 裡',
      'Pinia 不支援解構',
    ],
    answer: 1,
    explanation: 'store 是 reactive 物件，直接解構會失去響應性。storeToRefs 只會把 state 與 getters 轉成 ref；actions 可以直接從 store 解構。',
  },
  {
    id: 'vue-teleport',
    topic: 'vue',
    level: 'intermediate',
    prompt: '<Teleport to="body"> 最常用來解決什麼問題？',
    options: [
      '讓元件在路由切換時保留狀態',
      '把 modal 等浮層渲染到 body 下，避免被父層的 overflow 或 z-index 堆疊影響',
      '讓元件延遲載入',
      '讓元件在伺服器端渲染',
    ],
    answer: 1,
    explanation: 'Teleport 只改變 DOM 位置，元件的邏輯關係（props、emit、provide / inject）仍然屬於原本的父元件。',
  },
  {
    id: 'vue-key-reset',
    topic: 'vue',
    level: 'intermediate',
    prompt: '在元件上綁定 :key="userId"，當 userId 改變時會發生什麼事？',
    options: [
      '只更新 props，元件狀態保留',
      '舊元件被銷毀、重新建立一個新實例，內部狀態重置',
      '沒有任何效果，key 只能用在 v-for',
      '元件會被快取起來',
    ],
    answer: 1,
    explanation: 'key 不同代表不同的節點，Vue 不會重用。常用於切換資料時強制重置表單狀態，或觸發 <Transition> 動畫。',
  },
  {
    id: 'vue-proxy',
    topic: 'vue',
    level: 'advanced',
    prompt: 'Vue 3 改用 Proxy 實作響應式，相較 Vue 2 的 Object.defineProperty，主要解決了什麼？',
    options: [
      '讓響應式可以在 IE11 運作',
      '能偵測新增、刪除屬性與陣列索引的修改，不再需要 Vue.set',
      '讓所有資料預設都是唯讀的',
      '讓 computed 不再需要快取',
    ],
    answer: 1,
    explanation:
      'defineProperty 必須事先遍歷每個屬性定義 getter / setter，無法攔截新增屬性與 arr[i] = x。Proxy 攔截整個物件的操作，並且是存取時才延遲轉換巢狀物件。',
  },
  {
    id: 'vue-watch-batch',
    topic: 'vue',
    level: 'advanced',
    prompt: '下列程式碼中 console.log 會被呼叫幾次、輸出什麼？',
    code: `const count = ref(0)
watch(count, (v) => console.log(v))
count.value++
count.value++`,
    options: ['兩次：1、2', '一次：2', '一次：1', '不會呼叫'],
    answer: 1,
    explanation:
      'watch 的回呼預設會排入佇列，在同一個 tick 內合併執行，所以只會收到最後的值 2。需要每次變更都同步觸發時可設定 flush: "sync"。',
  },
  {
    id: 'vue-ref-in-reactive',
    topic: 'vue',
    level: 'advanced',
    prompt: '下列程式碼輸出什麼？',
    code: `const count = ref(1)
const state = reactive({ count })
count.value++
console.log(state.count)`,
    options: ['1', '2', 'Ref 物件', 'undefined'],
    answer: 1,
    explanation: 'ref 作為 reactive 物件的屬性時會自動解包並保持連結，state.count 讀到的就是 count.value。',
  },
  {
    id: 'vue-ref-in-array',
    topic: 'vue',
    level: 'advanced',
    prompt: '下列程式碼輸出什麼？',
    code: `const list = reactive([ref(1)])
console.log(isRef(list[0]))`,
    options: ['true', 'false', 'undefined', '拋出錯誤'],
    answer: 0,
    explanation: 'ref 放在 reactive 陣列或 Map 等集合中時不會自動解包，仍然要寫 list[0].value。只有作為物件屬性時才會解包。',
  },
  {
    id: 'vue-watch-cleanup',
    topic: 'vue',
    level: 'advanced',
    prompt: 'watch 依 id 抓資料，id 快速變化時舊的回應可能覆蓋新的，最好的處理方式為何？',
    options: [
      '把 watch 改成 watchEffect',
      '在 onCleanup（或 onWatcherCleanup）中 abort 上一次的請求',
      '加上 { deep: true }',
      '把請求改成同步',
    ],
    answer: 1,
    explanation:
      '每次回呼重新執行前，Vue 會先呼叫上一次註冊的清理函式。在清理函式裡呼叫 AbortController.abort()，或設旗標忽略過期的回應，就能避免競態條件。',
  },
  {
    id: 'vue-mark-raw',
    topic: 'vue',
    level: 'advanced',
    prompt: '把地圖或圖表函式庫的實例存進響應式狀態前，為什麼常會先用 markRaw 包起來？',
    options: [
      '讓實例變成唯讀',
      '避免它被轉成深層 Proxy，減少開銷，也避免 Proxy 破壞函式庫內部的相等比較',
      '讓實例可以被序列化',
      '讓實例在元件卸載時自動銷毀',
    ],
    answer: 1,
    explanation:
      'markRaw 標記的物件永遠不會被轉成 Proxy。大型第三方實例不需要響應式，被代理後除了效能變差，還可能因為 this 變成 Proxy 而出錯。',
  },
  {
    id: 'vue-mount-order',
    topic: 'vue',
    level: 'advanced',
    prompt: '父元件包含一個子元件，哪一個 onMounted 會先執行？',
    options: ['父元件', '子元件', '同時執行', '不一定，視渲染速度而定'],
    answer: 1,
    explanation:
      '順序是：父 setup → 父 onBeforeMount → 子 setup → 子 onBeforeMount → 子 onMounted → 父 onMounted。父元件 onMounted 時可以確定子元件都已經掛載。',
  },
  {
    id: 'vue-provide-primitive',
    topic: 'vue',
    level: 'advanced',
    prompt: "父元件寫 provide('count', count.value)，之後 count 改變時，子元件 inject 到的值會怎樣？",
    options: [
      '自動更新',
      '不會更新，傳入的只是當下的數字',
      '變成 undefined',
      '拋出警告並自動改為響應式',
    ],
    answer: 1,
    explanation:
      '要傳遞響應性就要 provide ref 本身：provide("count", count)。若不希望子元件修改，可以用 readonly(count)，另外提供修改用的函式。',
  },
]
