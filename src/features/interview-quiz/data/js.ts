import type { Question } from '../types'

export const jsQuestions: Question[] = [
  {
    id: 'js-typeof-null',
    topic: 'js',
    level: 'basic',
    prompt: '下列程式碼輸出什麼？',
    code: 'console.log(typeof null)',
    options: ["'null'", "'object'", "'undefined'", 'TypeError'],
    answer: 1,
    explanation:
      'typeof null 回傳 "object" 是語言早期實作留下的歷史包袱（型別標籤為 0）。判斷 null 要用 value === null。',
  },
  {
    id: 'js-event-loop',
    topic: 'js',
    level: 'intermediate',
    prompt: '下列程式碼的輸出順序為何？',
    code: `console.log(1)
setTimeout(() => console.log(2))
Promise.resolve().then(() => console.log(3))
console.log(4)`,
    options: ['1 2 3 4', '1 4 2 3', '1 4 3 2', '1 3 4 2'],
    answer: 2,
    explanation:
      '同步程式碼先執行（1、4）；目前任務結束後清空 microtask 佇列（Promise 回呼 3）；最後才輪到 macrotask（setTimeout 回呼 2）。',
  },
  {
    id: 'js-var-loop',
    topic: 'js',
    level: 'intermediate',
    prompt: '下列程式碼輸出什麼？',
    code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i))
}`,
    options: ['0 1 2', '3 3 3', '2 2 2', 'undefined ×3'],
    answer: 1,
    explanation:
      'var 是函式作用域，三個回呼共用同一個 i；回呼執行時迴圈早已結束，i 為 3。改用 let 每次迭代會建立新的綁定，輸出 0 1 2。',
  },
  {
    id: 'js-float',
    topic: 'js',
    level: 'basic',
    prompt: '0.1 + 0.2 === 0.3 的結果與原因為何？',
    options: [
      'true，JavaScript 會自動修正精度',
      'false，因為 IEEE 754 雙精度浮點數無法精確表示 0.1 與 0.2',
      'false，因為 === 會比較型別與記憶體位置',
      '拋出 RangeError',
    ],
    answer: 1,
    explanation:
      '0.1 + 0.2 實際為 0.30000000000000004。比較浮點數時可用 Math.abs(a - b) < Number.EPSILON，金額則改用整數（分）計算。',
  },
  {
    id: 'js-map-parseint',
    topic: 'js',
    level: 'advanced',
    prompt: '下列程式碼輸出什麼？',
    code: "console.log(['1', '2', '3'].map(parseInt))",
    options: ['[1, 2, 3]', '[1, NaN, NaN]', '[NaN, NaN, NaN]', '[1, 2, NaN]'],
    answer: 1,
    explanation:
      'map 傳入 (value, index)，等於呼叫 parseInt("1", 0)、parseInt("2", 1)、parseInt("3", 2)。radix 0 視為 10；radix 1 不合法；二進位沒有 3，所以後兩個是 NaN。',
  },
  {
    id: 'js-arrow-this',
    topic: 'js',
    level: 'basic',
    prompt: '關於箭頭函式，下列何者正確？',
    options: [
      '可以用 new 呼叫建立實例',
      '有自己的 arguments 物件',
      '沒有自己的 this，沿用定義時外層作用域的 this',
      'call / apply / bind 可以改變它的 this',
    ],
    answer: 2,
    explanation:
      '箭頭函式沒有自己的 this、arguments 與 prototype，不能當建構函式；call / apply / bind 只能傳參數，無法改變 this。',
  },
  {
    id: 'js-loose-equal',
    topic: 'js',
    level: 'basic',
    prompt: '下列哪個運算式的結果為 true？',
    options: ['null == 0', 'null == undefined', 'NaN === NaN', '[] == []'],
    answer: 1,
    explanation:
      '規格明定 null 與 undefined 用 == 比較時彼此相等，但不等於其他值（所以 null == 0 為 false）。NaN 不等於任何值包括自己；兩個陣列是不同參照。',
  },
  {
    id: 'js-tdz',
    topic: 'js',
    level: 'intermediate',
    prompt: '下列程式碼執行結果為何？',
    code: `console.log(a)
let a = 1`,
    options: ['undefined', '1', 'ReferenceError', 'null'],
    answer: 2,
    explanation:
      'let / const 也會提升，但宣告前處於暫時性死區（TDZ），存取會拋出 ReferenceError。若改成 var，才會輸出 undefined。',
  },
  {
    id: 'js-closure',
    topic: 'js',
    level: 'basic',
    prompt: '下列程式碼輸出什麼？',
    code: `function counter() {
  let n = 0
  return () => ++n
}
const c1 = counter()
const c2 = counter()
c1()
c1()
console.log(c2())`,
    options: ['1', '2', '3', 'NaN'],
    answer: 0,
    explanation: '每次呼叫 counter 都會建立新的作用域，c1 與 c2 各自閉包住不同的 n，互不影響。',
  },
  {
    id: 'js-promise-settled',
    topic: 'js',
    level: 'intermediate',
    prompt: '同時送出多個請求，希望全部結束後拿到每一個結果（包含失敗的），應使用哪個 API？',
    options: ['Promise.all', 'Promise.race', 'Promise.any', 'Promise.allSettled'],
    answer: 3,
    explanation:
      'Promise.all 只要一個 reject 就整體 reject；race 取最先結束的；any 取第一個成功的；allSettled 等全部結束，回傳每個的 { status, value | reason }。',
  },
  {
    id: 'js-async-order',
    topic: 'js',
    level: 'intermediate',
    prompt: '下列程式碼的輸出順序為何？',
    code: `async function f() {
  console.log('a')
  await null
  console.log('b')
}
f()
console.log('c')`,
    options: ['a b c', 'a c b', 'c a b', 'b a c'],
    answer: 1,
    explanation:
      'async 函式在第一個 await 之前同步執行（a）；await 之後的程式碼排入 microtask，等目前同步程式碼（c）跑完才執行（b）。',
  },
  {
    id: 'js-shallow-copy',
    topic: 'js',
    level: 'intermediate',
    prompt: '下列程式碼輸出什麼？',
    code: `const a = { inner: { x: 1 } }
const b = { ...a }
b.inner.x = 2
console.log(a.inner.x)`,
    options: ['1', '2', 'undefined', 'TypeError'],
    answer: 1,
    explanation:
      '展開運算子只做淺拷貝，b.inner 與 a.inner 指向同一個物件。需要深拷貝時可用 structuredClone(a)。',
  },
  {
    id: 'js-const-object',
    topic: 'js',
    level: 'basic',
    prompt: '下列程式碼輸出什麼？',
    code: `const obj = { a: 1 }
obj.a = 2
console.log(obj.a)`,
    options: ['1', '2', 'TypeError', 'undefined'],
    answer: 1,
    explanation: 'const 只禁止重新賦值（綁定不可變），不代表物件內容不可變。要凍結內容可用 Object.freeze（淺層）。',
  },
  {
    id: 'js-nan-includes',
    topic: 'js',
    level: 'basic',
    prompt: '下列程式碼輸出什麼？',
    code: 'console.log([NaN].indexOf(NaN), [NaN].includes(NaN))',
    options: ['0 true', '-1 true', '-1 false', '0 false'],
    answer: 1,
    explanation:
      'indexOf 使用嚴格相等（===），NaN 不等於自己所以找不到；includes 使用 SameValueZero 演算法，會把 NaN 視為相等。',
  },
  {
    id: 'js-truthy',
    topic: 'js',
    level: 'basic',
    prompt: '下列哪個值是 truthy？',
    options: ['0', "''", '[]', 'null'],
    answer: 2,
    explanation:
      'falsy 值只有 false、0、-0、0n、""、null、undefined、NaN。空陣列與空物件都是 truthy，判斷陣列是否為空要看 arr.length。',
  },
  {
    id: 'js-nullish',
    topic: 'js',
    level: 'basic',
    prompt: '下列程式碼輸出什麼？',
    code: `const n = 0
console.log(n || 10, n ?? 10)`,
    options: ['10 10', '0 0', '10 0', '0 10'],
    answer: 2,
    explanation: '|| 遇到任何 falsy 值都取右側；?? 只在左側為 null 或 undefined 時才取右側，所以 0 會被保留。',
  },
  {
    id: 'js-sort-default',
    topic: 'js',
    level: 'basic',
    prompt: '下列程式碼輸出什麼？',
    code: 'console.log([10, 1, 2].sort())',
    options: ['[1, 2, 10]', '[10, 2, 1]', '[1, 10, 2]', '[10, 1, 2]'],
    answer: 2,
    explanation:
      '沒有比較函式時，sort 會把元素轉成字串依 UTF-16 碼位排序，"10" 排在 "2" 前面。數字排序要寫 sort((a, b) => a - b)。另外 sort 會修改原陣列，不想修改可用 toSorted。',
  },
  {
    id: 'js-debounce',
    topic: 'js',
    level: 'intermediate',
    prompt: '搜尋框希望「使用者停止輸入 300ms 後」才送出請求，應使用哪種技巧？',
    options: ['throttle（節流）', 'debounce（防抖）', 'requestAnimationFrame', 'setInterval 輪詢'],
    answer: 1,
    explanation:
      'debounce 在事件停止觸發一段時間後才執行一次；throttle 則保證每段時間最多執行一次，適合捲動、resize 這類持續觸發的事件。',
  },
  {
    id: 'js-this-extract',
    topic: 'js',
    level: 'intermediate',
    prompt: '在 ES module（嚴格模式）中，下列程式碼輸出什麼？',
    code: `const obj = {
  name: 'a',
  getName() {
    return this?.name
  },
}
const fn = obj.getName
console.log(fn())`,
    options: ["'a'", 'undefined', 'TypeError', "''"],
    answer: 1,
    explanation:
      'this 由呼叫方式決定，不是定義位置。fn() 是一般函式呼叫，嚴格模式下 this 為 undefined，this?.name 得到 undefined。要保留 this 可用 obj.getName.bind(obj)。',
  },
  {
    id: 'js-event-delegation',
    topic: 'js',
    level: 'intermediate',
    prompt: '事件委派（event delegation）的主要好處為何？',
    options: [
      '讓事件不再冒泡，提升效能',
      '在父元素註冊一個 listener，即可處理之後動態新增的子元素',
      '讓事件在捕獲階段就被處理',
      '自動移除不再使用的 listener',
    ],
    answer: 1,
    explanation:
      '事件會冒泡到父元素，在父元素用 event.target.closest(selector) 判斷來源即可。listener 數量少，新增的子元素也不用另外綁定。',
  },
  {
    id: 'js-map-object',
    topic: 'js',
    level: 'intermediate',
    prompt: '關於 Map 與一般物件，下列何者正確？',
    options: [
      'Map 的 key 只能是字串或 Symbol',
      'Map 的 key 可以是物件等任意型別，並以 size 取得數量',
      '一般物件保證所有 key 依插入順序排列',
      'Map 可以直接用 JSON.stringify 序列化成內容',
    ],
    answer: 1,
    explanation:
      'Map 的 key 可以是任意值（以 SameValueZero 比較），依插入順序迭代，有 size 屬性。一般物件的整數 key 會排在前面；JSON.stringify(map) 只會得到 "{}"。',
  },
  {
    id: 'js-then-return',
    topic: 'js',
    level: 'intermediate',
    prompt: '下列程式碼輸出什麼？',
    code: `Promise.resolve(1)
  .then((x) => {
    x + 1
  })
  .then((x) => console.log(x))`,
    options: ['1', '2', 'undefined', 'Promise {<pending>}'],
    answer: 2,
    explanation:
      '箭頭函式使用區塊 { } 時需要明確 return，否則回傳 undefined，下一個 then 就收到 undefined。改成 (x) => x + 1 才會得到 2。',
  },
  {
    id: 'js-hoisting-function',
    topic: 'js',
    level: 'intermediate',
    prompt: '下列程式碼輸出什麼？',
    code: `console.log(typeof foo, typeof bar)
function foo() {}
var bar = function () {}`,
    options: [
      "'function' 'function'",
      "'function' 'undefined'",
      "'undefined' 'undefined'",
      'ReferenceError',
    ],
    answer: 1,
    explanation:
      '函式宣告整個被提升，可以在宣告前呼叫；函式表達式只提升 var bar 這個變數，值在執行到賦值那行之前都是 undefined。',
  },
  {
    id: 'js-nested-task',
    topic: 'js',
    level: 'advanced',
    prompt: '下列程式碼的輸出順序為何？',
    code: `setTimeout(() => console.log('t1'))
Promise.resolve().then(() => {
  console.log('p1')
  setTimeout(() => console.log('t2'))
  Promise.resolve().then(() => console.log('p2'))
})
console.log('s')`,
    options: ['s p1 t1 p2 t2', 's p1 p2 t1 t2', 's t1 p1 p2 t2', 's p1 t1 t2 p2'],
    answer: 1,
    explanation:
      'microtask 佇列要清空才會進入下一個 macrotask，執行中新加入的 microtask（p2）也會在同一輪執行。t2 排在 t1 之後，所以最後才執行。',
  },
  {
    id: 'js-prototype',
    topic: 'js',
    level: 'advanced',
    prompt: '已知 function Foo() {} 與 const f = new Foo()，下列哪個運算式為 false？',
    options: [
      'f instanceof Foo',
      'f instanceof Object',
      'Foo.prototype.constructor === Foo',
      'Object.getPrototypeOf(Foo) === Foo.prototype',
    ],
    answer: 3,
    explanation:
      'Foo.prototype 是實例 f 的原型；Foo 本身是函式，它的原型是 Function.prototype。原型鏈：f → Foo.prototype → Object.prototype → null。',
  },
  {
    id: 'js-generator',
    topic: 'js',
    level: 'advanced',
    prompt: '下列程式碼輸出什麼？',
    code: `function* g() {
  const x = yield 1
  yield x * 2
}
const it = g()
it.next()
console.log(it.next(5).value)`,
    options: ['2', '10', 'NaN', 'undefined'],
    answer: 1,
    explanation:
      '第一次 next() 執行到 yield 1 暫停；第二次 next(5) 的參數成為上一個 yield 運算式的值，所以 x 為 5，接著產出 10。',
  },
  {
    id: 'js-bind-new',
    topic: 'js',
    level: 'advanced',
    prompt: '下列程式碼輸出什麼？',
    code: `const B = function () {
  this.v = 1
}.bind({ v: 2 })
console.log(new B().v)`,
    options: ['1', '2', 'undefined', 'TypeError'],
    answer: 0,
    explanation:
      'this 綁定優先順序：new > bind / call / apply > 物件方法呼叫 > 預設綁定。用 new 呼叫 bind 過的函式時，this 仍是新建立的物件。',
  },
  {
    id: 'js-json-stringify',
    topic: 'js',
    level: 'advanced',
    prompt: '下列程式碼輸出什麼？',
    code: 'JSON.stringify({ a: undefined, b: () => 1, c: NaN, d: new Date(0) })',
    options: [
      '\'{"a":null,"b":null,"c":null,"d":{}}\'',
      '\'{"c":null,"d":"1970-01-01T00:00:00.000Z"}\'',
      '\'{"c":NaN,"d":"1970-01-01T00:00:00.000Z"}\'',
      'TypeError',
    ],
    answer: 1,
    explanation:
      '物件中值為 undefined 或函式的屬性會被略過；NaN 與 Infinity 變成 null；Date 透過 toJSON 轉成 ISO 字串。在陣列中 undefined 與函式則會變成 null。',
  },
  {
    id: 'js-weakmap',
    topic: 'js',
    level: 'advanced',
    prompt: '下列哪個情境最適合使用 WeakMap？',
    options: [
      '需要依插入順序迭代所有項目',
      '以 DOM 節點或物件為 key 存附加資料，物件被回收時資料也跟著釋放',
      '以字串為 key 做快取',
      '需要知道目前存了幾筆資料',
    ],
    answer: 1,
    explanation:
      'WeakMap 的 key 必須是物件（或非註冊的 Symbol），且是弱參照，不會阻止垃圾回收。代價是不能迭代，也沒有 size。',
  },
  {
    id: 'js-async-try',
    topic: 'js',
    level: 'advanced',
    prompt: '下列程式碼執行結果為何？',
    code: `async function f() {
  throw new Error('x')
}
try {
  f()
} catch {
  console.log('caught')
}`,
    options: [
      '輸出 caught',
      '不會輸出 caught，產生 unhandled promise rejection',
      '同步拋出錯誤，程式中止',
      "輸出 'x'",
    ],
    answer: 1,
    explanation:
      'async 函式內的錯誤會變成回傳 Promise 的 rejection，不會同步拋出。要寫成 await f() 放在 async 函式的 try 裡，或是 f().catch(...)。',
  },
  {
    id: 'js-key-order',
    topic: 'js',
    level: 'advanced',
    prompt: '下列程式碼輸出什麼？',
    code: "console.log(Object.keys({ b: 1, 2: 1, a: 1, 1: 1 }))",
    options: ["['b', '2', 'a', '1']", "['1', '2', 'b', 'a']", "['a', 'b', '1', '2']", "['1', '2', 'a', 'b']"],
    answer: 1,
    explanation:
      '物件自有屬性的順序：整數索引型的 key 依數值遞增排在前面，其餘字串 key 依插入順序，Symbol 最後。需要穩定順序時請用 Map。',
  },
  {
    id: 'js-array-plus',
    topic: 'js',
    level: 'advanced',
    prompt: '下列程式碼輸出什麼？',
    code: 'console.log([1, 2] + [3])',
    options: ['[1, 2, 3]', "'1,23'", "'1,2,3'", 'NaN'],
    answer: 1,
    explanation:
      '+ 遇到物件會先轉成原始值，陣列的 toString 以逗號串接：[1, 2] 變成 "1,2"，[3] 變成 "3"，兩者都是字串所以做字串串接。',
  },
  {
    id: 'js-structured-clone',
    topic: 'js',
    level: 'advanced',
    prompt: 'structuredClone({ fn: () => 1 }) 的結果為何？',
    options: [
      '回傳 { fn: () => 1 } 的深拷貝',
      '回傳 {}，函式被略過',
      '拋出 DataCloneError',
      '回傳 { fn: undefined }',
    ],
    answer: 2,
    explanation:
      'structuredClone 支援 Date、Map、Set、循環參照等，但無法複製函式與 DOM 節點，遇到時會拋出 DataCloneError。這點和 JSON 方式（直接略過函式）不同。',
  },
]
