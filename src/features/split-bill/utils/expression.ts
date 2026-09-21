export type EvalResult = { ok: true; value: number } | { ok: false; error: string }

type Token = { type: 'number'; value: number } | { type: 'op'; value: '+' | '-' | '*' | '/' | '(' | ')' }

/** 全形數字與符號（中文輸入法常見）轉半形，× ÷ 轉成 * /，並去掉千分位逗號 */
export function normalizeExpression(text: string): string {
  return text
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[×xX]/g, '*')
    .replace(/÷/g, '/')
    .replace(/　/g, ' ')
    .replace(/(\d),(?=\d{3}(\D|$))/g, '$1')
}

function tokenize(text: string): Token[] | null {
  const tokens: Token[] = []
  let i = 0
  while (i < text.length) {
    const ch = text[i]!
    if (ch === ' ') {
      i += 1
      continue
    }
    if ('+-*/()'.includes(ch)) {
      tokens.push({ type: 'op', value: ch as '+' | '-' | '*' | '/' | '(' | ')' })
      i += 1
      continue
    }
    const match = /^(\d+(\.\d*)?|\.\d+)/.exec(text.slice(i))
    if (!match) return null
    tokens.push({ type: 'number', value: Number(match[0]) })
    i += match[0].length
  }
  return tokens
}

class ParseError extends Error {}

/**
 * 遞迴下降解析，文法：
 *   expr   := term (('+' | '-') term)*
 *   term   := factor (('*' | '/') factor)*
 *   factor := ('+' | '-') factor | number | '(' expr ')'
 * 不使用 eval / Function，輸入只可能產生數字。
 */
function parse(tokens: Token[]): number {
  let pos = 0
  const peek = () => tokens[pos]
  const isOp = (value: string) => {
    const token = peek()
    return token?.type === 'op' && token.value === value
  }

  function expr(): number {
    let value = term()
    while (isOp('+') || isOp('-')) {
      const op = (tokens[pos++] as { value: string }).value
      const right = term()
      value = op === '+' ? value + right : value - right
    }
    return value
  }

  function term(): number {
    let value = factor()
    while (isOp('*') || isOp('/')) {
      const op = (tokens[pos++] as { value: string }).value
      const right = factor()
      if (op === '/' && right === 0) throw new ParseError('不能除以 0')
      value = op === '*' ? value * right : value / right
    }
    return value
  }

  function factor(): number {
    const token = peek()
    if (!token) throw new ParseError('算式不完整')
    if (isOp('+') || isOp('-')) {
      pos += 1
      const value = factor()
      return token.value === '-' ? -value : value
    }
    if (token.type === 'number') {
      pos += 1
      return token.value
    }
    if (isOp('(')) {
      pos += 1
      const value = expr()
      if (!isOp(')')) throw new ParseError('括號沒有成對')
      pos += 1
      return value
    }
    throw new ParseError('算式格式不正確')
  }

  const value = expr()
  if (pos < tokens.length) throw new ParseError('算式格式不正確')
  return value
}

export function evaluate(text: string): EvalResult {
  const normalized = normalizeExpression(text).trim()
  if (!normalized) return { ok: false, error: '請輸入金額' }
  if (normalized.length > 100) return { ok: false, error: '算式太長' }
  const tokens = tokenize(normalized)
  if (!tokens) return { ok: false, error: '只能輸入數字與 + - * / ( )' }
  try {
    const value = parse(tokens)
    if (!Number.isFinite(value)) return { ok: false, error: '計算結果不是有效數字' }
    return { ok: true, value }
  } catch (error) {
    if (error instanceof ParseError) return { ok: false, error: error.message }
    throw error
  }
}

export const AMOUNT_MAX = 1_000_000

/** 帳目金額：算式結果四捨五入到整數元，需在 1–1,000,000 之間 */
export function parseAmount(text: string): EvalResult {
  const result = evaluate(text)
  if (!result.ok) return result
  const value = Math.round(result.value)
  if (value < 1) return { ok: false, error: '金額至少 NT$1' }
  if (value > AMOUNT_MAX) return { ok: false, error: '金額不能超過 NT$1,000,000' }
  return { ok: true, value }
}
