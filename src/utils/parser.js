/**
 * Shunting Yard — Tokenizer, Infix→RPN converter, and RPN evaluator.
 *
 * Supports:
 *   Infix: +, -, × (or *), ÷ (or /), ^, nPr, nCr, % (modulo)
 *   Prefix: sin, cos, tan, arcsin, arccos, arctan,
 *           sinh, cosh, tanh, arsinh, arcosh, artanh,
 *           log, ln, log2, sqrt, cbrt, exp,
 *           abs, floor, ceil, round, sign, trunc, fract,
 *           gamma, erf, rand (nullary)
 *   Postfix: ! (factorial), ², ³
 *   Constants: π (pi), e (euler)
 *   Unary minus, implicit multiplication, auto-close parentheses
 *   Scientific notation (1e5, 1e-3, 1e+2)
 */

const TOKEN = {
  NUMBER: 0, PLUS: 1, MINUS: 2, MULTIPLY: 3, DIVIDE: 4,
  POWER: 5, NPR: 6, NCR: 12, MODULO: 13,
  LPAREN: 7, RPAREN: 8, FUNCTION: 9, POSTFIX: 10, EOF: 11,
}

const PRECEDENCE = {
  '+': 2, '-': 2,
  '×': 3, '*': 3, '÷': 3, '/': 3,
  '^': 5,
  'nPr': 1, 'nCr': 1,
  '%': 3,
}

const RIGHT_ASSOC = new Set(['^'])

const FUNCTIONS = {
  sin: true, cos: true, tan: true,
  arcsin: true, arccos: true, arctan: true,
  sinh: true, cosh: true, tanh: true,
  arsinh: true, arcosh: true, artanh: true,
  log: true, ln: true, log2: true,
  sqrt: true, cbrt: true, exp: true,
  abs: true, floor: true, ceil: true, round: true,
  sign: true, trunc: true, fract: true,
  gamma: true, erf: true,
  rand: true,
}

const NULLARY_FUNCTIONS = new Set(['rand'])
const POSTFIX_OPS = { '!': true, '²': true, '³': true }
const FUNCTION_NAMES = Object.keys(FUNCTIONS).sort((a, b) => b.length - a.length)

/* ─── Lanczos Gamma approximation ─── */
function gammaFn(x) {
  if (x <= 0) {
    if (Number.isInteger(x)) throw new Error('Math Error')
    return Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x))
  }
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  let xm1 = x - 1
  let a = c[0]
  for (let k = 1; k < g + 2; k++) a += c[k] / (xm1 + k)
  const t = xm1 + g + 0.5
  return Math.sqrt(2 * Math.PI) * Math.pow(t, xm1 + 0.5) * Math.exp(-t) * a
}

/* ─── Error function approximation ─── */
function erfFn(x) {
  if (x === 0) return 0
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x)
  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return sign * y
}

/**
 * Tokenize an expression string into an array of tokens.
 */
function tokenize(expr) {
  const tokens = []
  let i = 0
  const len = expr.length

  while (i < len) {
    const ch = expr[i]

    if (ch === ' ') { i++; continue }

    // Numbers with full scientific notation support
    if (/\d/.test(ch) || (ch === '.' && i + 1 < len && /\d/.test(expr[i + 1]))) {
      let num = ''
      while (i < len && /\d/.test(expr[i])) { num += expr[i]; i++ }
      if (i < len && expr[i] === '.') { num += '.'; i++; while (i < len && /\d/.test(expr[i])) { num += expr[i]; i++ } }
      if (i < len && (expr[i] === 'e' || expr[i] === 'E')) {
        num += expr[i]; i++
        if (i < len && (expr[i] === '+' || expr[i] === '-')) { num += expr[i]; i++ }
        while (i < len && /\d/.test(expr[i])) { num += expr[i]; i++ }
      }
      const val = parseFloat(num)
      if (isNaN(val)) throw new SyntaxError(`Invalid number: "${num}"`)
      tokens.push({ type: TOKEN.NUMBER, value: val })
      continue
    }

    // Constants: π
    if (ch === 'π') {
      tokens.push({ type: TOKEN.NUMBER, value: Math.PI }); i++; continue
    }

    // Euler constant e — only if NOT followed by a function name like exp or erf
    if (ch === 'e' && (i === 0 || /[\s(/*+\-^]/.test(expr[i - 1]))) {
      const remaining = expr.slice(i, i + 5)
      const isFuncStart = FUNCTION_NAMES.some(fn => remaining.startsWith(fn))
      if (!isFuncStart) {
        tokens.push({ type: TOKEN.NUMBER, value: Math.E }); i++; continue
      }
    }

    // Textual constant: pi
    if (expr.slice(i, i + 2) === 'pi' && (i + 2 >= len || /[\s)\/*+\-^]/.test(expr[i + 2]))) {
      tokens.push({ type: TOKEN.NUMBER, value: Math.PI }); i += 2; continue
    }

    // Functions (prefix)
    let matched = false
    for (const fn of FUNCTION_NAMES) {
      if (expr.slice(i, i + fn.length) === fn) {
        tokens.push({ type: TOKEN.FUNCTION, value: fn })
        i += fn.length
        matched = true
        break
      }
    }
    if (matched) continue

    // Postfix operators (!, ², ³)
    if (ch in POSTFIX_OPS) {
      tokens.push({ type: TOKEN.POSTFIX, value: ch })
      i++
      continue
    }

    // Multi-character operators
    if (expr.slice(i, i + 3) === 'nPr') {
      tokens.push({ type: TOKEN.NPR, value: 'nPr' }); i += 3; continue
    }
    if (expr.slice(i, i + 3) === 'nCr') {
      tokens.push({ type: TOKEN.NCR, value: 'nCr' }); i += 3; continue
    }

    // Modulo / percent operator in expressions
    if (ch === '%') {
      tokens.push({ type: TOKEN.MODULO, value: '%' }); i++; continue
    }

    // Basic operators
    const opMap = {
      '+': TOKEN.PLUS, '−': TOKEN.MINUS, '-': TOKEN.MINUS,
      '×': TOKEN.MULTIPLY, '*': TOKEN.MULTIPLY,
      '÷': TOKEN.DIVIDE, '/': TOKEN.DIVIDE,
      '^': TOKEN.POWER,
    }
    if (ch in opMap) {
      tokens.push({ type: opMap[ch], value: ch }); i++; continue
    }

    if (ch === '(') { tokens.push({ type: TOKEN.LPAREN }); i++; continue }
    if (ch === ')') { tokens.push({ type: TOKEN.RPAREN }); i++; continue }

    i++
  }

  tokens.push({ type: TOKEN.EOF, value: null })
  return tokens
}

/**
 * Insert implicit multiplication tokens where needed.
 */
function insertImplicitMultiply(tokens) {
  const result = []
  for (let i = 0; i < tokens.length; i++) {
    result.push(tokens[i])
    const curr = tokens[i]
    const next = tokens[i + 1]
    if (!next || next.type === TOKEN.EOF) continue
    const needsMultiply =
      ((curr.type === TOKEN.NUMBER || curr.type === TOKEN.POSTFIX || curr.type === TOKEN.RPAREN) &&
       (next.type === TOKEN.NUMBER || next.type === TOKEN.LPAREN || next.type === TOKEN.FUNCTION)) ||
      (curr.type === TOKEN.RPAREN && next.type === TOKEN.LPAREN)
    if (needsMultiply) {
      result.push({ type: TOKEN.MULTIPLY, value: '×' })
    }
  }
  return result
}

/**
 * Handle unary minus.
 */
function handleUnaryMinus(tokens) {
  const result = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type === TOKEN.MINUS) {
      const prev = result[result.length - 1]
      const isUnary = !prev || prev.type === TOKEN.LPAREN || prev.type === TOKEN.FUNCTION ||
        prev.type === TOKEN.PLUS || prev.type === TOKEN.MINUS ||
        prev.type === TOKEN.MULTIPLY || prev.type === TOKEN.DIVIDE ||
        prev.type === TOKEN.POWER || prev.type === TOKEN.NPR ||
        prev.type === TOKEN.NCR || prev.type === TOKEN.MODULO
      if (isUnary) {
        const next = tokens[i + 1]
        if (next && next.type === TOKEN.NUMBER) {
          result.push({ type: TOKEN.NUMBER, value: -next.value })
          i++
          continue
        }
        result.push({ type: TOKEN.NUMBER, value: -1 })
        result.push({ type: TOKEN.MULTIPLY, value: '×' })
        continue
      }
    }
    result.push(t)
  }
  return result
}

/**
 * Shunting Yard: Convert infix token array to RPN.
 */
function shuntingYard(tokens) {
  const output = []
  const stack = []

  for (const token of tokens) {
    switch (token.type) {
      case TOKEN.NUMBER:
        output.push(token)
        break

      case TOKEN.FUNCTION:
        stack.push(token)
        break

      case TOKEN.POSTFIX:
        output.push(token)
        break

      case TOKEN.LPAREN:
        stack.push(token)
        break

      case TOKEN.RPAREN:
        while (stack.length > 0 && stack[stack.length - 1].type !== TOKEN.LPAREN) {
          output.push(stack.pop())
        }
        if (stack.length > 0 && stack[stack.length - 1].type === TOKEN.LPAREN) {
          stack.pop()
        }
        if (stack.length > 0 && stack[stack.length - 1].type === TOKEN.FUNCTION) {
          output.push(stack.pop())
        }
        break

      case TOKEN.PLUS: case TOKEN.MINUS: case TOKEN.MULTIPLY:
      case TOKEN.DIVIDE: case TOKEN.POWER:
      case TOKEN.NPR: case TOKEN.NCR: case TOKEN.MODULO:
        const opPrec = PRECEDENCE[token.value]
        while (stack.length > 0) {
          const top = stack[stack.length - 1]
          if (top.type === TOKEN.LPAREN) break
          if (top.type === TOKEN.FUNCTION) { output.push(stack.pop()); continue }
          const topPrec = PRECEDENCE[top.value]
          if (topPrec === undefined) break
          if (topPrec > opPrec || (topPrec === opPrec && !RIGHT_ASSOC.has(token.value))) {
            output.push(stack.pop())
          } else break
        }
        stack.push(token)
        break
    }
  }

  while (stack.length > 0) {
    const t = stack.pop()
    if (t.type === TOKEN.LPAREN || t.type === TOKEN.RPAREN) continue
    output.push(t)
  }

  return output
}

function fmtPrecise(v) {
  return parseFloat(Number(v).toPrecision(12))
}

/**
 * Evaluate an RPN token array and return the numeric result.
 */
function evaluateRPN(rpn, opts = {}) {
  const { degMode = true } = opts
  const stack = []

  const degToRad = (x) => degMode ? x * Math.PI / 180 : x
  const radToDeg = (x) => degMode ? x * 180 / Math.PI : x

  for (const token of rpn) {
    switch (token.type) {
      case TOKEN.NUMBER:
        stack.push(token.value)
        break

      case TOKEN.POSTFIX: {
        const a = stack.pop()
        if (a === undefined) throw new EvalError('Insufficient operands')
        switch (token.value) {
          case '!': {
            if (a < 0 || !Number.isInteger(a)) throw new EvalError('Math Error')
            let r = 1
            for (let i = 2; i <= a; i++) r *= i
            stack.push(r)
            break
          }
          case '²': stack.push(a * a); break
          case '³': stack.push(a * a * a); break
          default: throw new EvalError(`Unknown postfix: ${token.value}`)
        }
        break
      }

      case TOKEN.FUNCTION: {
        if (NULLARY_FUNCTIONS.has(token.value)) {
          switch (token.value) {
            case 'rand': stack.push(Math.random()); break
            default: throw new EvalError(`Unknown function: ${token.value}`)
          }
          break
        }
        const a = stack.pop()
        if (a === undefined) throw new EvalError('Insufficient operands')
        switch (token.value) {
          // Trig
          case 'sin':    stack.push(fmtPrecise(Math.sin(degToRad(a)))); break
          case 'cos':    stack.push(fmtPrecise(Math.cos(degToRad(a)))); break
          case 'tan':    stack.push(fmtPrecise(Math.tan(degToRad(a)))); break
          case 'arcsin': {
            if (a < -1 || a > 1) throw new EvalError('Math Error')
            stack.push(fmtPrecise(radToDeg(Math.asin(a)))); break
          }
          case 'arccos': {
            if (a < -1 || a > 1) throw new EvalError('Math Error')
            stack.push(fmtPrecise(radToDeg(Math.acos(a)))); break
          }
          case 'arctan': stack.push(fmtPrecise(radToDeg(Math.atan(a)))); break
          // Hyperbolic
          case 'sinh':   stack.push(fmtPrecise(Math.sinh(a))); break
          case 'cosh':   stack.push(fmtPrecise(Math.cosh(a))); break
          case 'tanh':   stack.push(fmtPrecise(Math.tanh(a))); break
          case 'arsinh': stack.push(fmtPrecise(Math.asinh(a))); break
          case 'arcosh': {
            if (a < 1) throw new EvalError('Math Error')
            stack.push(fmtPrecise(Math.acosh(a))); break
          }
          case 'artanh': {
            if (a <= -1 || a >= 1) throw new EvalError('Math Error')
            stack.push(fmtPrecise(Math.atanh(a))); break
          }
          // Logs
          case 'log':  { if (a <= 0) throw new EvalError('Math Error'); stack.push(fmtPrecise(Math.log10(a))); break }
          case 'ln':   { if (a <= 0) throw new EvalError('Math Error'); stack.push(fmtPrecise(Math.log(a))); break }
          case 'log2': { if (a <= 0) throw new EvalError('Math Error'); stack.push(fmtPrecise(Math.log2(a))); break }
          // Roots & exp
          case 'sqrt': { if (a < 0) throw new EvalError('Math Error'); stack.push(fmtPrecise(Math.sqrt(a))); break }
          case 'cbrt': stack.push(fmtPrecise(Math.cbrt(a))); break
          case 'exp':  stack.push(fmtPrecise(Math.exp(a))); break
          // Numeric
          case 'abs':   stack.push(Math.abs(a)); break
          case 'floor': stack.push(Math.floor(a)); break
          case 'ceil':  stack.push(Math.ceil(a)); break
          case 'round': stack.push(Math.round(a)); break
          case 'sign':  stack.push(a > 0 ? 1 : a < 0 ? -1 : 0); break
          case 'trunc': stack.push(Math.trunc(a)); break
          case 'fract': stack.push(fmtPrecise(a - Math.trunc(a))); break
          // Advanced
          case 'gamma': {
            try { stack.push(fmtPrecise(gammaFn(a))) }
            catch (e) { throw new EvalError(e.message) }
            break
          }
          case 'erf': stack.push(fmtPrecise(erfFn(a))); break
          default: throw new EvalError(`Unknown function: ${token.value}`)
        }
        break
      }

      case TOKEN.PLUS: {
        const [b, a] = [stack.pop(), stack.pop()]
        if (a === undefined || b === undefined) throw new EvalError('Insufficient operands')
        stack.push(fmtPrecise(a + b))
        break
      }
      case TOKEN.MINUS: {
        const [b, a] = [stack.pop(), stack.pop()]
        if (a === undefined || b === undefined) throw new EvalError('Insufficient operands')
        stack.push(fmtPrecise(a - b))
        break
      }
      case TOKEN.MULTIPLY: {
        const [b, a] = [stack.pop(), stack.pop()]
        if (a === undefined || b === undefined) throw new EvalError('Insufficient operands')
        stack.push(fmtPrecise(a * b))
        break
      }
      case TOKEN.DIVIDE: {
        const [b, a] = [stack.pop(), stack.pop()]
        if (a === undefined || b === undefined) throw new EvalError('Insufficient operands')
        if (b === 0) throw new EvalError('Cannot divide by zero')
        stack.push(fmtPrecise(a / b))
        break
      }
      case TOKEN.POWER: {
        const [b, a] = [stack.pop(), stack.pop()]
        if (a === undefined || b === undefined) throw new EvalError('Insufficient operands')
        const r = Math.pow(a, b)
        if (!Number.isFinite(r)) throw new EvalError('Overflow')
        stack.push(fmtPrecise(r))
        break
      }
      case TOKEN.NPR: {
        const [b, a] = [stack.pop(), stack.pop()]
        if (a === undefined || b === undefined) throw new EvalError('Insufficient operands')
        if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || b > a) {
          throw new EvalError('Math Error')
        }
        let r = 1
        for (let i = 0; i < b; i++) r *= (a - i)
        stack.push(r)
        break
      }
      case TOKEN.NCR: {
        const [b, a] = [stack.pop(), stack.pop()]
        if (a === undefined || b === undefined) throw new EvalError('Insufficient operands')
        if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || b > a) {
          throw new EvalError('Math Error')
        }
        const k = Math.min(b, a - b)
        let r = 1
        for (let i = 0; i < k; i++) r = r * (a - i) / (i + 1)
        stack.push(Math.round(r))
        break
      }
      case TOKEN.MODULO: {
        const [b, a] = [stack.pop(), stack.pop()]
        if (a === undefined || b === undefined) throw new EvalError('Insufficient operands')
        if (b === 0) throw new EvalError('Cannot divide by zero')
        stack.push(a % b)
        break
      }
    }

    const last = stack[stack.length - 1]
    if (typeof last === 'number' && !Number.isFinite(last)) {
      if (isNaN(last)) throw new EvalError('Math Error')
      throw new EvalError('Overflow')
    }
  }

  if (stack.length !== 1) throw new EvalError('Syntax Error')
  return stack[0]
}

/**
 * Parse and evaluate a full expression string in one shot.
 */
function evaluate(expr, opts = {}) {
  try {
    const tokens = tokenize(expr)
    const withImplicit = insertImplicitMultiply(tokens)
    const withUnary = handleUnaryMinus(withImplicit)
    const rpn = shuntingYard(withUnary)
    const result = evaluateRPN(rpn, opts)
    return { value: result, error: null }
  } catch (err) {
    if (err instanceof EvalError || err instanceof SyntaxError) {
      return { value: NaN, error: err.message }
    }
    return { value: NaN, error: 'Syntax Error' }
  }
}

export {
  TOKEN, tokenize, insertImplicitMultiply,
  handleUnaryMinus, shuntingYard, evaluateRPN, evaluate,
}
