import type { Question } from '../types'

export const tsQuestions: Question[] = [
  {
    id: 'ts-unknown-any',
    topic: 'ts',
    level: 'basic',
    prompt: '關於 unknown 與 any，下列何者正確？',
    options: [
      '兩者完全相同，只是名稱不同',
      'unknown 的值在使用前必須先縮小型別（narrowing）',
      'any 比 unknown 更安全',
      'unknown 不能被賦予任何值',
    ],
    answer: 1,
    explanation:
      '任何值都能賦給 unknown，但要先用 typeof、instanceof 或型別守衛縮小型別才能存取屬性或呼叫；any 則直接關閉型別檢查。',
  },
  {
    id: 'ts-keyof',
    topic: 'ts',
    level: 'basic',
    prompt: 'type K 的型別為何？',
    code: 'type K = keyof { a: 1; b: 2 }',
    options: ["'a' | 'b'", '1 | 2', 'string', "['a', 'b']"],
    answer: 0,
    explanation: 'keyof 取出物件型別所有鍵組成的 union，這裡是字面量型別 "a" | "b"。',
  },
  {
    id: 'ts-typeof-object',
    topic: 'ts',
    level: 'intermediate',
    prompt: 'if 區塊內 x 的型別為何？',
    code: `function f(x: string | string[] | null) {
  if (typeof x === 'object') {
    x
  }
}`,
    options: ['string[]', 'string[] | null', 'object', 'string | string[]'],
    answer: 1,
    explanation:
      'typeof null 也是 "object"，TypeScript 據此縮小為 string[] | null。要排除 null 需再加上 x !== null 或改用 Array.isArray(x)。',
  },
  {
    id: 'ts-never-exhaustive',
    topic: 'ts',
    level: 'intermediate',
    prompt: '在 switch 的 default 寫 const check: never = shape 的目的為何？',
    code: `type Shape = { kind: 'circle' } | { kind: 'square' }
function area(shape: Shape) {
  switch (shape.kind) {
    case 'circle': return 1
    case 'square': return 2
    default: {
      const check: never = shape
      return check
    }
  }
}`,
    options: [
      '讓 default 在執行期拋出錯誤',
      '在編譯期確認 union 的每個成員都被處理過',
      '把 shape 轉型成 never 以提升效能',
      '避免 ESLint 警告，沒有型別上的作用',
    ],
    answer: 1,
    explanation:
      '所有 case 都處理後，default 裡的 shape 會縮小為 never。之後 Shape 新增成員卻忘了處理時，該成員無法賦值給 never，編譯即報錯。',
  },
  {
    id: 'ts-interface-merge',
    topic: 'ts',
    level: 'intermediate',
    prompt: '下列哪件事只有 interface 做得到，type alias 做不到？',
    options: ['描述物件形狀', '被 class implements', '宣告合併（declaration merging）', '使用泛型參數'],
    answer: 2,
    explanation:
      '同名 interface 會自動合併，常用於擴充第三方型別（例如 vue-router 的 RouteMeta）。同名 type 則會報重複宣告錯誤。',
  },
  {
    id: 'ts-generic-constraint',
    topic: 'ts',
    level: 'intermediate',
    prompt: '下列呼叫結果為何？',
    code: `function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
getProp({ a: 1 }, 'b')`,
    options: ['回傳 undefined，型別為 unknown', '編譯錯誤：\'b\' 不能指派給 \'a\'', '回傳 undefined，型別為 number', '執行期拋出 TypeError'],
    answer: 1,
    explanation: 'K 被約束為 keyof T，也就是 "a"，傳入 "b" 在編譯期就被擋下。回傳型別 T[K] 則精確為 number。',
  },
  {
    id: 'ts-as-const',
    topic: 'ts',
    level: 'basic',
    prompt: 'arr 的型別為何？',
    code: "const arr = ['a', 'b'] as const",
    options: ['string[]', "('a' | 'b')[]", "readonly ['a', 'b']", 'readonly string[]'],
    answer: 2,
    explanation: 'as const 讓陣列推論為唯讀 tuple，元素保留字面量型別。常搭配 (typeof arr)[number] 取得 "a" | "b"。',
  },
  {
    id: 'ts-distributive',
    topic: 'ts',
    level: 'advanced',
    prompt: 'type R 的型別為何？',
    code: `type IsString<T> = T extends string ? 'yes' : 'no'
type R = IsString<string | number>`,
    options: ["'yes'", "'no'", "'yes' | 'no'", 'never'],
    answer: 2,
    explanation:
      '裸型別參數的條件型別會對 union 分配：分別計算 IsString<string> 與 IsString<number> 再合併。寫成 [T] extends [string] 可關閉分配。',
  },
  {
    id: 'ts-satisfies',
    topic: 'ts',
    level: 'advanced',
    prompt: 'config.port 的型別為何？',
    code: 'const config = { port: 3000 } satisfies Record<string, number | string>',
    options: ['number', 'string | number', '3000', 'unknown'],
    answer: 0,
    explanation:
      'satisfies 只檢查值是否符合型別，不改變推論結果，所以 port 保留推論出的 number。若寫成型別註記 const config: Record<…>，就會變成 string | number。',
  },
  {
    id: 'ts-excess-property',
    topic: 'ts',
    level: 'intermediate',
    prompt: '(1) 與 (2) 何者會編譯錯誤？',
    code: `interface Named { name: string }
const p = { name: 'a', age: 1 }
const n: Named = p                     // (1)
const m: Named = { name: 'a', age: 1 } // (2)`,
    options: ['只有 (1)', '只有 (2)', '兩者都會', '兩者都不會'],
    answer: 1,
    explanation:
      'TypeScript 是結構型別，多出屬性的變數仍可賦值，所以 (1) 通過。直接寫物件字面量時會做額外屬性檢查（excess property check），(2) 報錯。',
  },
  {
    id: 'ts-utility',
    topic: 'ts',
    level: 'basic',
    prompt: '要讓 User 的所有屬性都變成可選，應使用哪個工具型別？',
    options: ['Required<User>', 'Partial<User>', 'Readonly<User>', 'Pick<User, keyof User>'],
    answer: 1,
    explanation: 'Partial<T> 等於 { [K in keyof T]?: T[K] }；Required 相反，移除所有 ?；Readonly 加上 readonly。',
  },
  {
    id: 'ts-optional-param',
    topic: 'ts',
    level: 'basic',
    prompt: '函式內參數 b 的型別為何？',
    code: 'function f(a: string, b?: number) {}',
    options: ['number', 'number | undefined', 'number | null', 'unknown'],
    answer: 1,
    explanation: '可選參數在函式內的型別會自動加上 undefined，使用前需要判斷，或給預設值 b = 0 讓型別回到 number。',
  },
  {
    id: 'ts-literal-union',
    topic: 'ts',
    level: 'basic',
    prompt: '下列程式碼的結果為何？',
    code: `type Dir = 'up' | 'down'
const d: Dir = 'left'`,
    options: ['正常編譯，d 為 string', '編譯錯誤：\'left\' 不能指派給 Dir', '執行期錯誤', '自動把 Dir 擴充成三個值'],
    answer: 1,
    explanation: '字面量聯合型別只接受列出的值，常用來取代魔術字串，搭配 switch 也能得到窮舉檢查。',
  },
  {
    id: 'ts-readonly-array',
    topic: 'ts',
    level: 'basic',
    prompt: '下列程式碼的結果為何？',
    code: `const arr: readonly number[] = [1]
arr.push(2)`,
    options: [
      '正常執行，arr 為 [1, 2]',
      "編譯錯誤：readonly number[] 上沒有 'push'",
      '執行期拋出 TypeError',
      '正常編譯，但 push 不會生效',
    ],
    answer: 1,
    explanation:
      'readonly 陣列型別移除了所有會修改陣列的方法。這只是編譯期限制，編譯後就是一般陣列；執行期不可變需要 Object.freeze。',
  },
  {
    id: 'ts-assertion',
    topic: 'ts',
    level: 'basic',
    prompt: '關於型別斷言 value as Foo，下列何者正確？',
    options: [
      '執行期會把 value 轉換成 Foo',
      '執行期會檢查 value 是否符合 Foo，不符合就拋錯',
      '只影響編譯器的判斷，編譯後不會留下任何檢查',
      '等同於 new Foo(value)',
    ],
    answer: 2,
    explanation:
      '斷言會在編譯時被移除，錯誤的斷言會把問題延後到執行期才爆發。處理外部資料（API 回應）時應使用型別守衛或 schema 驗證。',
  },
  {
    id: 'ts-enum-reverse',
    topic: 'ts',
    level: 'basic',
    prompt: '下列程式碼輸出什麼？',
    code: `enum E { A, B }
console.log(E[0])`,
    options: ["'A'", '0', 'undefined', '編譯錯誤'],
    answer: 0,
    explanation:
      '數字 enum 會產生反向映射：E.A === 0 且 E[0] === "A"。字串 enum 沒有反向映射。許多團隊改用 as const 物件取代 enum。',
  },
  {
    id: 'ts-tuple',
    topic: 'ts',
    level: 'basic',
    prompt: '下列賦值的結果為何？',
    code: `let t: [string, number] = ['a', 1]
t = [1, 'a']`,
    options: ['正常編譯', '編譯錯誤：各位置的型別不符', '執行期錯誤', 't 自動變成 (string | number)[]'],
    answer: 1,
    explanation: 'tuple 固定每個位置的型別與長度，順序不同就不相容。useState 這類回傳 [值, setter] 的 API 就是 tuple。',
  },
  {
    id: 'ts-record',
    topic: 'ts',
    level: 'intermediate',
    prompt: "Record<'a' | 'b', number> 等同於下列哪個型別？",
    options: [
      '{ [key: string]: number }',
      '{ a: number; b: number }',
      '{ a?: number; b?: number }',
      "Array<'a' | 'b'>",
    ],
    answer: 1,
    explanation: 'Record<K, V> 等於 { [P in K]: V }。K 是字面量聯合時，每個鍵都是必填屬性。',
  },
  {
    id: 'ts-omit',
    topic: 'ts',
    level: 'intermediate',
    prompt: 'type R 的型別為何？',
    code: "type R = Omit<{ a: 1; b: 2; c: 3 }, 'a' | 'b'>",
    options: ['{ a: 1; b: 2 }', '{ c: 3 }', '{ a?: 1; b?: 2; c: 3 }', 'never'],
    answer: 1,
    explanation: 'Omit<T, K> 移除指定的鍵，等於 Pick<T, Exclude<keyof T, K>>。Pick 則是只保留指定的鍵。',
  },
  {
    id: 'ts-type-predicate',
    topic: 'ts',
    level: 'intermediate',
    prompt: '函式回傳型別寫成 x is string 的作用為何？',
    code: `function isString(x: unknown): x is string {
  return typeof x === 'string'
}`,
    options: [
      '在執行期強制把 x 轉成字串',
      '回傳 true 時，呼叫端會把 x 縮小為 string',
      '等同於回傳 boolean，沒有其他作用',
      '讓函式只能接受字串參數',
    ],
    answer: 1,
    explanation:
      '這是使用者自訂型別守衛（type predicate）。常用在 filter：arr.filter((x): x is string => typeof x === "string") 會得到 string[]。判斷邏輯寫錯時 TypeScript 不會發現，要自己確保正確。',
  },
  {
    id: 'ts-return-type',
    topic: 'ts',
    level: 'intermediate',
    prompt: 'type R 的型別為何？',
    code: `const fn = () => ({ ok: true })
type R = ReturnType<typeof fn>`,
    options: ['{ ok: true }', '{ ok: boolean }', 'boolean', '() => { ok: boolean }'],
    answer: 1,
    explanation:
      '物件字面量中的屬性會被放寬（widening）成 boolean。要保留字面量可寫 ({ ok: true }) as const，得到 { readonly ok: true }。',
  },
  {
    id: 'ts-query-selector',
    topic: 'ts',
    level: 'intermediate',
    prompt: "開啟 strictNullChecks 時，document.querySelector('div') 的回傳型別為何？",
    options: ['HTMLDivElement', 'HTMLDivElement | null', 'Element', 'Element | undefined'],
    answer: 1,
    explanation:
      'lib.dom 對標籤名稱有多載，會推論出 HTMLDivElement；找不到元素時回傳 null，所以必須先處理 null。傳入一般 CSS 選擇器（例如 ".box"）時則是 Element | null。',
  },
  {
    id: 'ts-infer',
    topic: 'ts',
    level: 'advanced',
    prompt: 'type R 的型別為何？',
    code: `type ElementType<T> = T extends (infer U)[] ? U : never
type R = ElementType<string[]>`,
    options: ['string[]', 'string', 'never', 'unknown'],
    answer: 1,
    explanation: 'infer 在條件型別中宣告一個待推論的型別變數。ReturnType、Parameters、Awaited 等內建工具型別都是用 infer 實作。',
  },
  {
    id: 'ts-mapped-modifier',
    topic: 'ts',
    level: 'advanced',
    prompt: 'Mutable<T> 的作用為何？',
    code: 'type Mutable<T> = { -readonly [K in keyof T]: T[K] }',
    options: [
      '把所有屬性變成 readonly',
      '移除所有屬性的 readonly',
      '移除所有屬性',
      '把所有屬性變成可選',
    ],
    answer: 1,
    explanation: '映射型別可以用 + / - 加上或移除修飾符。內建的 Required<T> 就是 { [K in keyof T]-?: T[K] }。',
  },
  {
    id: 'ts-template-literal',
    topic: 'ts',
    level: 'advanced',
    prompt: 'type E 的型別為何？',
    code: "type E = `on${Capitalize<'click' | 'focus'>}`",
    options: ["'onclick' | 'onfocus'", "'onClick' | 'onFocus'", 'string', "'onClick' & 'onFocus'"],
    answer: 1,
    explanation: '模板字面量型別遇到聯合型別會逐一展開組合。常用來從事件名稱推導 props 名稱，例如 Vue 的 onUpdate:modelValue。',
  },
  {
    id: 'ts-strict-function-types',
    topic: 'ts',
    level: 'advanced',
    prompt: '開啟 strictFunctionTypes 時，(1) 與 (2) 何者會編譯錯誤？',
    code: `type Handler = (x: string | number) => void
const a: Handler = (x: string) => {}                      // (1)
const b: (x: string) => void = (x: string | number) => {} // (2)`,
    options: ['只有 (1)', '只有 (2)', '兩者都會', '兩者都不會'],
    answer: 0,
    explanation:
      '函式參數是逆變的：Handler 可能收到 number，但 (1) 的實作只能處理 string，所以不安全。(2) 的實作能處理更寬的型別，可以安全替代。注意用方法語法宣告的型別仍是雙變（bivariant）。',
  },
  {
    id: 'ts-keyof-any',
    topic: 'ts',
    level: 'advanced',
    prompt: 'keyof any 的型別為何？',
    options: ['string', 'string | number', 'string | number | symbol', 'never'],
    answer: 2,
    explanation: '物件的鍵可以是 string、number 或 symbol，所以 keyof any 就是 PropertyKey。常用在泛型約束 K extends keyof any。',
  },
  {
    id: 'ts-is-never',
    topic: 'ts',
    level: 'advanced',
    prompt: 'type R 的型別為何？',
    code: `type IsNever<T> = T extends never ? true : false
type R = IsNever<never>`,
    options: ['true', 'false', 'never', 'boolean'],
    answer: 2,
    explanation:
      'never 可看成空的聯合型別，分配式條件型別對空聯合不會計算任何分支，結果是 never。正確寫法是 [T] extends [never] ? true : false。',
  },
  {
    id: 'ts-branded',
    topic: 'ts',
    level: 'advanced',
    prompt: '下列 branded type 的主要目的為何？',
    code: "type UserId = string & { readonly __brand: 'UserId' }",
    options: [
      '在執行期為字串加上 __brand 屬性',
      '讓一般字串或其他 ID 無法直接傳入需要 UserId 的地方',
      '讓 UserId 可以和 number 互相賦值',
      '減少打包後的程式碼大小',
    ],
    answer: 1,
    explanation:
      'TypeScript 是結構型別，UserId 與 OrderId 如果都是 string 就能互換。加上只存在於型別層的標記可以模擬名目型別，由驗證函式負責產生合法的值。',
  },
  {
    id: 'ts-empty-object',
    topic: 'ts',
    level: 'advanced',
    prompt: '開啟 strictNullChecks 時，下列哪個值不能指派給型別 {}？',
    options: ['0', "''", '[]', 'null'],
    answer: 3,
    explanation:
      '{} 代表「任何非 null / undefined 的值」，包括原始型別，並不是「空物件」。要表示真正的空物件可用 Record<string, never>。',
  },
]
