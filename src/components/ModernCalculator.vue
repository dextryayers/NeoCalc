<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { animate as anime } from 'animejs'
import { evaluate } from '../utils/parser.js'

/* ─── State ─── */
const input = ref('')
const exprStr = ref('')
const displayExpr = ref('')
const lastResult = ref(null)
const history = ref([])
const showHistory = ref(false)
const showScientific = ref(true)
const justEvaluated = ref(false)
const degMode = ref(true)
const isShiftActive = ref(false)
const memory = ref(null)
const openParens = ref(0)
const snackbar = ref({ show: false, message: '', color: 'error' })

const displayEl = ref(null)
const displayContainer = ref(null)

/* ─── Precision & formatting ─── */
function fmtPrecise(v) {
  return parseFloat(Number(v).toPrecision(12))
}

function fmtDisplay(n) {
  if (n === undefined || n === null || isNaN(n)) return '0'
  const s = Number(n)
  if (Math.abs(s) >= 1e10 || (Math.abs(s) < 1e-10 && s !== 0)) {
    return s.toExponential(8)
  }
  return String(fmtPrecise(s))
}

/* ─── Computed ─── */
const displayValue = computed(() => {
  if (input.value === '' || input.value === '-') return input.value || '0'
  if (justEvaluated.value && lastResult.value !== null) {
    return fmtDisplay(lastResult.value)
  }
  const n = parseFloat(input.value)
  if (!isNaN(n) && input.value !== '' && !input.value.includes('e')) {
    if (Math.abs(n) >= 1e10 || (Math.abs(n) < 1e-10 && n !== 0)) {
      return n.toExponential(8)
    }
  }
  return input.value
})

const displayFontSize = computed(() => {
  const len = displayValue.value.length
  if (len > 16) return '1.5rem'
  if (len > 12) return '1.8rem'
  if (len > 8) return '2.4rem'
  if (len > 5) return '3rem'
  return '3.6rem'
})

const memoryIndicator = computed(() => memory.value !== null)
const shiftLabel = computed(() => isShiftActive.value ? '2ND' : '2nd')

/* ─── Helpers ─── */
function showError(msg) {
  snackbar.value = { show: true, message: msg, color: 'error' }
}

function deactivateShift() {
  if (isShiftActive.value) isShiftActive.value = false
}

function flushInput() {
  if (input.value !== '' && input.value !== '-') {
    const val = input.value.startsWith('-') && input.value.length === 1 ? '' : input.value
    if (val) {
      exprStr.value += val
      displayExpr.value += val
    }
  }
}

function ensureParens(count) {
  for (let i = 0; i < count; i++) {
    exprStr.value += ')'
    displayExpr.value += ')'
  }
  openParens.value -= count
  if (openParens.value < 0) openParens.value = 0
}

function animateDisplay() {
  if (!displayContainer.value) return
  anime({
    targets: displayContainer.value,
    rotateX: [{ value: -90, duration: 120, easing: 'easeInQuad' }],
    delay: 0,
    complete: () => {
      anime({
        targets: displayContainer.value,
        rotateX: [{ value: 0, duration: 180, easing: 'easeOutBack' }],
      })
    },
  })
}

function animateShiftBtn(el) {
  anime({
    targets: el,
    scale: [{ value: 1.15, duration: 120 }, { value: 1, duration: 120 }],
    easing: 'easeInOutQuad',
  })
}

/* ─── Digit Input ─── */
function inputDigit(d) {
  if (justEvaluated.value) {
    exprStr.value = ''; displayExpr.value = ''; input.value = ''
    justEvaluated.value = false; openParens.value = 0
  }
  if (d === '.') {
    if (!input.value.includes('.')) input.value += '.'
    return
  }
  if (input.value === '0') { input.value = d; return }
  input.value += d
}

/* ─── EE (Enter Exponent) ─── */
function inputEE() {
  if (justEvaluated.value) {
    exprStr.value = ''; displayExpr.value = ''
    justEvaluated.value = false; openParens.value = 0
  }
  if (!input.value || input.value === '0') {
    input.value = '1e'
    return
  }
  if (input.value === '-') {
    input.value = '-1e'
    return
  }
  if (!input.value.includes('e')) {
    input.value += 'e'
  }
}

/* ─── Operators ─── */
function setOperator(op) {
  const opDisp = { '+': ' + ', '−': ' − ', '-': ' − ', '×': ' × ', '*': ' × ', '÷': ' ÷ ', '/': ' ÷ ', '^': ' ^ ' }
  const opExpr = { '+': '+', '−': '-', '-': '-', '×': '*', '*': '*', '÷': '/', '/': '/', '^': '^' }

  if (justEvaluated.value) {
    const r = lastResult.value
    exprStr.value = r !== null ? String(r) : ''
    displayExpr.value = r !== null ? fmtDisplay(r) : ''
    input.value = ''
    justEvaluated.value = false
  }
  const lastCh = exprStr.value.slice(-1)
  if (lastCh && '+-*/^'.includes(lastCh)) {
    exprStr.value = exprStr.value.slice(0, -1) + opExpr[op]
    displayExpr.value = displayExpr.value.slice(0, -3) + opDisp[op]
    deactivateShift()
    return
  }
  flushInput()
  if (!exprStr.value) {
    exprStr.value = '0'
    displayExpr.value = '0'
  }
  exprStr.value += opExpr[op]
  displayExpr.value += opDisp[op]
  input.value = ''
  deactivateShift()
}

/* ─── nPr ─── */
function setOperatorNPR() {
  if (justEvaluated.value) {
    const r = lastResult.value
    exprStr.value = r !== null ? String(r) : ''
    displayExpr.value = r !== null ? fmtDisplay(r) : ''
    input.value = ''
    justEvaluated.value = false
  }
  flushInput()
  exprStr.value += 'nPr'
  displayExpr.value += ' nPr '
  input.value = ''
  deactivateShift()
}

/* ─── nCr ─── */
function setOperatorNCR() {
  if (justEvaluated.value) {
    const r = lastResult.value
    exprStr.value = r !== null ? String(r) : ''
    displayExpr.value = r !== null ? fmtDisplay(r) : ''
    input.value = ''
    justEvaluated.value = false
  }
  flushInput()
  exprStr.value += 'nCr'
  displayExpr.value += ' nCr '
  input.value = ''
  deactivateShift()
}

/* ─── Scientific Functions ─── */
function applyFunc(fn) {
  const names = {
    sin: 'sin', cos: 'cos', tan: 'tan',
    arcsin: 'arcsin', arccos: 'arccos', arctan: 'arctan',
    sinh: 'sinh', cosh: 'cosh', tanh: 'tanh',
    arsinh: 'arsinh', arcosh: 'arcosh', artanh: 'artanh',
    log: 'log', ln: 'ln', log2: 'log2',
    sqrt: 'sqrt', cbrt: 'cbrt', exp: 'exp',
    abs: 'abs', floor: 'floor', ceil: 'ceil', round: 'round',
    sign: 'sign', trunc: 'trunc', fract: 'fract',
    gamma: 'gamma', erf: 'erf',
  }
  const name = names[fn]

  if (justEvaluated.value && lastResult.value !== null) {
    const val = lastResult.value
    const raw = `${name}(${val})`
    const { value, error } = evaluate(raw, { degMode: degMode.value })
    if (error) { showError(error); return }
    const formatted = fmtPrecise(value)
    displayExpr.value = raw
    input.value = String(formatted)
    lastResult.value = formatted
    deactivateShift()
    return
  }
  if (justEvaluated.value) {
    exprStr.value = ''; displayExpr.value = ''; input.value = ''
    justEvaluated.value = false; openParens.value = 0
  }
  flushInput()
  if (exprStr.value && !'+-×÷^/*('.includes(exprStr.value.slice(-1))) {
    exprStr.value += '*'
    displayExpr.value += '×'
  }
  exprStr.value += `${name}(`
  displayExpr.value += `${name}(`
  openParens.value++
  input.value = ''
  deactivateShift()
}

/* ─── Postfix / Immediate ─── */
function applyPostfix(op) {
  if (justEvaluated.value && lastResult.value !== null) {
    input.value = String(lastResult.value)
    justEvaluated.value = false
  }
  const val = parseFloat(input.value || '0')
  if (isNaN(val)) { showError('Math Error'); return }
  let result, label
  switch (op) {
    case 'square':       result = val * val;                       label = '²';  break
    case 'cube':         result = val * val * val;                 label = '³';  break
    case 'factorial': {
      if (val < 0 || !Number.isInteger(val)) { showError('Math Error'); return }
      let r = 1
      for (let i = 2; i <= val; i++) r *= i
      result = r; label = '!'; break
    }
    case 'reciprocal':   if (val === 0) { showError('Cannot divide by zero'); return }
                         result = 1 / val;                         label = '⁻¹'; break
    case 'tenPow':       result = Math.pow(10, val);               label = '10^'; break
    default: return
  }
  if (!Number.isFinite(result)) { showError('Overflow'); return }
  displayExpr.value = (justEvaluated.value ? '' : displayExpr.value) + (input.value || '0') + label
  input.value = String(fmtPrecise(result))
  justEvaluated.value = true
  deactivateShift()
}

/* ─── Random ─── */
function applyRand() {
  const val = fmtPrecise(Math.random())
  if (justEvaluated.value) {
    exprStr.value = ''; displayExpr.value = ''
    justEvaluated.value = false; openParens.value = 0
  }
  const prefix = displayExpr.value && !displayExpr.value.endsWith(' ') ? ' × ' : ''
  displayExpr.value += `${prefix}rand()`
  exprStr.value += val
  input.value = String(val)
  lastResult.value = val
  justEvaluated.value = true
  deactivateShift()
}

/* ─── Constants ─── */
function insertConst(c) {
  const val = c === 'pi' ? Math.PI : Math.E
  if (justEvaluated.value) {
    if (lastResult.value !== null) {
      exprStr.value = String(lastResult.value) + '*'
      displayExpr.value = fmtDisplay(lastResult.value) + '×'
    } else {
      exprStr.value = ''; displayExpr.value = ''
    }
    input.value = String(val)
    justEvaluated.value = false; openParens.value = 0
    deactivateShift()
    return
  }
  if (c === 'pi') {
    if (input.value && input.value !== '0') {
      exprStr.value += input.value + '*'
      displayExpr.value += input.value + '×'
    }
    input.value = String(Math.PI)
  } else if (c === 'e') {
    if (input.value && input.value !== '0') {
      exprStr.value += input.value + '*'
      displayExpr.value += input.value + '×'
    }
    input.value = String(Math.E)
  }
  deactivateShift()
}

/* ─── Percent ─── */
function percent() {
  const n = parseFloat(input.value || '0')
  if (!isNaN(n)) { input.value = String(n / 100); justEvaluated.value = false }
}

/* ─── Negate ─── */
function toggleSign() {
  if (input.value === '' || input.value === '0') { input.value = '-'; return }
  if (input.value.startsWith('-')) input.value = input.value.slice(1)
  else input.value = '-' + input.value
  justEvaluated.value = false
}

/* ─── CE / AC / C ─── */
function clearEntry() {
  input.value = '0'
  justEvaluated.value = false
}

function allClear() {
  input.value = ''; exprStr.value = ''; displayExpr.value = ''
  justEvaluated.value = false; openParens.value = 0
}

function backspace() {
  if (justEvaluated.value) return
  if (input.value.length > 1) input.value = input.value.slice(0, -1)
  else input.value = ''
}

const isAC = computed(() => input.value === '' || input.value === '0')

/* ─── Parentheses ─── */
function openParen() {
  if (justEvaluated.value) {
    exprStr.value = ''; displayExpr.value = ''; input.value = ''
    justEvaluated.value = false; openParens.value = 0
  }
  if (input.value && input.value !== '0') {
    exprStr.value += input.value + '*'
    displayExpr.value += input.value + '×'
    input.value = ''
  }
  exprStr.value += '('
  displayExpr.value += '('
  openParens.value++
}

function closeParen() {
  if (openParens.value <= 0) return
  flushInput()
  exprStr.value += ')'
  displayExpr.value += ')'
  openParens.value--
  justEvaluated.value = false
}

/* ─── Memory ─── */
function memClear() { memory.value = null }
function memRecall() {
  if (memory.value === null) return
  if (justEvaluated.value) {
    exprStr.value = ''; displayExpr.value = ''; justEvaluated.value = false; openParens.value = 0
  }
  input.value = String(memory.value)
}
function memAdd() {
  const n = parseFloat(input.value || '0')
  if (!isNaN(n)) memory.value = (memory.value ?? 0) + n
}
function memSubtract() {
  const n = parseFloat(input.value || '0')
  if (!isNaN(n)) memory.value = (memory.value ?? 0) - n
}

/* ─── ANS ─── */
function ansRecall() {
  if (lastResult.value === null) return
  if (justEvaluated.value) {
    exprStr.value = ''; displayExpr.value = ''; justEvaluated.value = false; openParens.value = 0
  }
  input.value = String(lastResult.value)
}

/* ─── Calculate ─── */
function calculate() {
  if (justEvaluated.value) return
  flushInput()
  if (openParens.value > 0) ensureParens(openParens.value)
  const raw = exprStr.value
  if (!raw) return
  const { value, error } = evaluate(raw, { degMode: degMode.value })
  if (error) {
    showError(error)
    exprStr.value = ''; displayExpr.value = ''; input.value = ''
    return
  }
  const formatted = fmtPrecise(value)
  const displayResult = fmtDisplay(formatted)

  history.value.unshift({
    expression: displayExpr.value,
    result: displayResult,
    id: Date.now(),
  })
  if (history.value.length > 20) history.value.pop()

  input.value = displayResult
  lastResult.value = formatted
  justEvaluated.value = true

  animateDisplay()
  deactivateShift()
}

/* ─── Keyboard ─── */
function handleKeydown(e) {
  const key = e.key
  if ((key >= '0' && key <= '9') || key === '.') { inputDigit(key); e.preventDefault(); return }
  if (key === '+') { setOperator('+'); e.preventDefault(); return }
  if (key === '-') { setOperator('-'); e.preventDefault(); return }
  if (key === '*') { setOperator('*'); e.preventDefault(); return }
  if (key === '/') { e.preventDefault(); setOperator('/'); return }
  if (key === 'Enter' || key === '=') { calculate(); e.preventDefault(); return }
  if (key === 'Escape') { allClear(); e.preventDefault(); return }
  if (key === 'Backspace') { backspace(); e.preventDefault(); return }
  if (key === '%') { percent(); e.preventDefault(); return }
  if (key === '^') {
    if (isShiftActive.value) { applyFunc('cbrt'); deactivateShift() }
    else setOperator('^')
    e.preventDefault(); return
  }
  if (key === '(') { openParen(); e.preventDefault(); return }
  if (key === ')') { closeParen(); e.preventDefault(); return }
  if (key === 'e' || key === 'E') { inputEE(); e.preventDefault(); return }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

function closeSnackbar() {
  snackbar.value.show = false
}
</script>

<template>
  <div class="calc-shell">
    <!-- Ambient background -->
    <div class="ambient-bg">
      <div class="glow-sphere g1"></div>
      <div class="glow-sphere g2"></div>
      <div class="glow-sphere g3"></div>
      <div class="glow-sphere g4"></div>
      <div class="noise-overlay"></div>
    </div>

    <div class="calc-card">
      <!-- ─── Top Bar ─── -->
      <div class="bar-top">
        <div class="bar-left">
          <div class="hamburger"><span></span><span></span><span></span></div>
          <span class="brand">N E O C A L C</span>
        </div>
        <div class="bar-mid">
          <button class="pill" :class="{ on: degMode }" @click="degMode = !degMode">{{ degMode ? 'DEG' : 'RAD' }}</button>
          <button class="pill mem-pill" v-if="memoryIndicator"><span class="dot"></span>M</button>
        </div>
        <div class="bar-right">
          <button class="pill shift-pill" :class="{ 'shift-active': isShiftActive }" @click="isShiftActive = !isShiftActive; animateShiftBtn($event.currentTarget)">{{ shiftLabel }}</button>
          <button class="tool-btn" @click="showHistory = !showHistory" :class="{ active: showHistory }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>
          <button class="tool-btn" @click="showScientific = !showScientific" :class="{ active: showScientific }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20h16"/><path d="M6 16V8l4 8V8"/><path d="M14 16v-4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v4"/><path d="M18 12h-4"/></svg>
          </button>
        </div>
      </div>

      <!-- ─── Memory + ANS Strip ─── -->
      <div class="mem-strip">
        <button class="mem-tag" @click="memClear" title="Memory Clear">MC</button>
        <button class="mem-tag" @click="memRecall" title="Memory Recall">MR</button>
        <button class="mem-tag" @click="memAdd" title="Memory Add">M+</button>
        <button class="mem-tag" @click="memSubtract" title="Memory Subtract">M−</button>
        <button class="mem-tag ans-tag" @click="ansRecall" title="Recall Last Answer">ANS</button>
      </div>

      <!-- ─── Display ─── -->
      <div class="display-box" ref="displayContainer">
        <div class="expr-text" :title="displayExpr || 'NeoCalc'">{{ displayExpr }}<span class="cur">|</span></div>
        <div class="val-text" ref="displayEl" :style="{ fontSize: displayFontSize }">{{ displayValue || '0' }}</div>
      </div>

      <div class="sep"></div>

      <!-- ─── Scientific Panel (6 rows × 5 cols = 30 buttons) ─── -->
      <transition name="sci-sweep">
        <div v-if="showScientific" class="sci-grid">
          <!-- Row 1: Trig -->
          <button class="sci-cell" @click="isShiftActive ? applyFunc('arcsin') : applyFunc('sin')">{{ isShiftActive ? 'sin⁻¹' : 'sin' }}</button>
          <button class="sci-cell" @click="isShiftActive ? applyFunc('arccos') : applyFunc('cos')">{{ isShiftActive ? 'cos⁻¹' : 'cos' }}</button>
          <button class="sci-cell" @click="isShiftActive ? applyFunc('arctan') : applyFunc('tan')">{{ isShiftActive ? 'tan⁻¹' : 'tan' }}</button>
          <button class="sci-cell" @click="openParen">(</button>
          <button class="sci-cell" @click="closeParen">)</button>

          <!-- Row 2: Hyperbolic -->
          <button class="sci-cell" @click="isShiftActive ? applyFunc('arsinh') : applyFunc('sinh')">{{ isShiftActive ? 'sinh⁻¹' : 'sinh' }}</button>
          <button class="sci-cell" @click="isShiftActive ? applyFunc('arcosh') : applyFunc('cosh')">{{ isShiftActive ? 'cosh⁻¹' : 'cosh' }}</button>
          <button class="sci-cell" @click="isShiftActive ? applyFunc('artanh') : applyFunc('tanh')">{{ isShiftActive ? 'tanh⁻¹' : 'tanh' }}</button>
          <button class="sci-cell" @click="insertConst('pi')">π</button>
          <button class="sci-cell" @click="insertConst('e')">e</button>

          <!-- Row 3: Powers & Roots -->
          <button class="sci-cell" @click="isShiftActive ? applyPostfix('cube') : applyPostfix('square')">{{ isShiftActive ? 'x³' : 'x²' }}</button>
          <button class="sci-cell" @click="isShiftActive ? applyFunc('cbrt') : applyFunc('sqrt')">{{ isShiftActive ? '∛' : '√' }}</button>
          <button class="sci-cell" @click="setOperator('^')">{{ isShiftActive ? 'x^(1/n)' : 'xⁿ' }}</button>
          <button class="sci-cell" @click="isShiftActive ? setOperatorNPR() : applyPostfix('factorial')">{{ isShiftActive ? 'nPr' : 'x!' }}</button>
          <button class="sci-cell" @click="setOperatorNCR()">nCr</button>

          <!-- Row 4: Logs & Exponential -->
          <button class="sci-cell" @click="isShiftActive ? applyPostfix('tenPow') : applyFunc('log')">{{ isShiftActive ? '10ˣ' : 'log' }}</button>
          <button class="sci-cell" @click="applyFunc('ln')">ln</button>
          <button class="sci-cell" @click="applyFunc('log2')">log₂</button>
          <button class="sci-cell" @click="applyFunc('exp')">eˣ</button>
          <button class="sci-cell" @click="applyFunc('abs')">|x|</button>

          <!-- Row 5: Numeric -->
          <button class="sci-cell" @click="applyPostfix('reciprocal')">1/x</button>
          <button class="sci-cell" @click="applyFunc('floor')">floor</button>
          <button class="sci-cell" @click="applyFunc('ceil')">ceil</button>
          <button class="sci-cell" @click="applyFunc('round')">round</button>
          <button class="sci-cell" @click="inputEE()">EE</button>

          <!-- Row 6: Advanced & Misc -->
          <button class="sci-cell" @click="applyFunc('sign')">sign</button>
          <button class="sci-cell" @click="applyFunc('trunc')">trunc</button>
          <button class="sci-cell" @click="applyFunc('fract')">fract</button>
          <button class="sci-cell sci-pct" @click="percent">%</button>
          <button class="sci-cell" @click="applyRand()">rand</button>
        </div>
      </transition>

      <!-- ─── Main Button Grid ─── -->
      <div class="main-grid">
        <button class="key key-num" @click="inputDigit('7')">7</button>
        <button class="key key-num" @click="inputDigit('8')">8</button>
        <button class="key key-num" @click="inputDigit('9')">9</button>
        <button class="key key-op" @click="setOperator('÷')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg></button>
        <button class="key key-clear" @click="allClear">{{ isAC ? 'AC' : 'C' }}</button>

        <button class="key key-num" @click="inputDigit('4')">4</button>
        <button class="key key-num" @click="inputDigit('5')">5</button>
        <button class="key key-num" @click="inputDigit('6')">6</button>
        <button class="key key-op" @click="setOperator('×')">×</button>
        <button class="key key-fn" @click="clearEntry">CE</button>

        <button class="key key-num" @click="inputDigit('1')">1</button>
        <button class="key key-num" @click="inputDigit('2')">2</button>
        <button class="key key-num" @click="inputDigit('3')">3</button>
        <button class="key key-op" @click="setOperator('−')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
        <button class="key key-fn" @click="toggleSign">±</button>

        <button class="key key-num key-wide" @click="inputDigit('0')">0</button>
        <button class="key key-num" @click="inputDigit('.')">.</button>
        <button class="key key-op" @click="setOperator('+')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
        <button class="key key-eq" @click="calculate"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="9" x2="19" y2="9"/><line x1="5" y1="15" x2="19" y2="15"/></svg></button>
      </div>

      <!-- ─── Copyright ─── -->
      <div class="copyright-wrap">
        <div class="copyright-glow"></div>
        <div class="copyright">© 2026 hanif abdurrohim</div>
      </div>
    </div>

    <!-- ─── History Panel ─── -->
    <transition name="hist-glide">
      <div v-if="showHistory" class="hist-panel">
        <div class="hist-head">
          <span class="hist-label">History</span>
          <button class="hist-clear" @click="history = []" v-if="history.length">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
        <div class="sep-thin"></div>
        <div class="hist-body" v-if="history.length">
          <div v-for="item in history" :key="item.id" class="hist-row">
            <span class="hist-expr">{{ item.expression }}</span>
            <span class="hist-res">= {{ item.result }}</span>
          </div>
        </div>
        <div v-else class="hist-empty">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.15"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>No history yet</span>
        </div>
      </div>
    </transition>

    <!-- ─── Hint ─── -->
    <div class="hint-bar">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01"/></svg>
      <span>Keyboard friendly • e=EE • Esc=Clear</span>
    </div>

    <!-- ─── Snackbar ─── -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top" timeout="3000" @update:model-value="closeSnackbar">
      {{ snackbar.message }}
      <template v-slot:actions><v-btn variant="text" density="compact" @click="closeSnackbar">✕</v-btn></template>
    </v-snackbar>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════
   EXPERT SCIENTIFIC CALCULATOR — NeoCalc
   ═══════════════════════════════════════════ */
.calc-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: #050508;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ═══ AMBIENT BACKGROUND ═══ */
.ambient-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
}
.glow-sphere {
  position: absolute; border-radius: 50%;
  filter: blur(120px); opacity: 0.15;
  will-change: transform;
}
.g1 { width: 500px; height: 500px; background: #6c5ce7; top: -140px; right: -120px; animation: drift1 14s ease-in-out infinite; }
.g2 { width: 380px; height: 380px; background: #00cec9; bottom: -100px; left: -120px; animation: drift2 16s ease-in-out infinite reverse; }
.g3 { width: 300px; height: 300px; background: #fd79a8; top: 40%; left: 50%; animation: drift3 18s ease-in-out infinite; }
.g4 { width: 200px; height: 200px; background: #fdcb6e; top: 20%; left: 10%; animation: drift1 20s ease-in-out infinite reverse; opacity: 0.08; }
@keyframes drift1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(35px, -40px) scale(1.08); }
  66% { transform: translate(-25px, 30px) scale(0.92); }
}
@keyframes drift2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-40px, 30px) scale(1.06); }
  66% { transform: translate(30px, -25px) scale(0.94); }
}
@keyframes drift3 {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  33% { transform: translate(calc(-50% + 25px), calc(-50% - 25px)) scale(1.04); }
  66% { transform: translate(calc(-50% - 20px), calc(-50% + 20px)) scale(0.96); }
}
.noise-overlay {
  position: absolute; inset: 0;
  opacity: 0.012;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 200px 200px;
}

/* ═══ CARD ═══ */
.calc-card {
  width: 100%;
  max-width: 580px;
  background: rgba(10, 10, 18, 0.92) !important;
  backdrop-filter: blur(48px) saturate(1.4) !important;
  -webkit-backdrop-filter: blur(48px) saturate(1.4) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  border-radius: 36px !important;
  padding: 24px 28px 20px;
  position: relative; z-index: 1;
  box-shadow:
    0 20px 64px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.015) inset,
    0 2px 0 rgba(255, 255, 255, 0.03) inset;
}

/* ═══ TOP BAR ═══ */
.bar-top {
  display: flex; align-items: center; justify-content: space-between;
  height: 52px; margin-bottom: 6px;
}
.bar-left { display: flex; align-items: center; gap: 14px; }
.hamburger {
  width: 32px; height: 32px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4.5px;
  cursor: pointer; border-radius: 8px;
  transition: background 0.15s;
}
.hamburger:hover { background: rgba(255,255,255,0.04); }
.hamburger span { display: block; width: 18px; height: 1.5px; background: rgba(255,255,255,0.2); border-radius: 2px; }
.brand {
  font-size: 0.85rem; font-weight: 800;
  color: rgba(255, 255, 255, 0.25);
  letter-spacing: 3px;
}
.bar-mid { display: flex; align-items: center; gap: 8px; }
.bar-right { display: flex; align-items: center; gap: 6px; }

.pill {
  all: unset; cursor: pointer;
  font-size: 0.65rem; font-weight: 700;
  padding: 5px 10px; border-radius: 6px;
  color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.03);
  transition: all 0.15s;
  line-height: 1.5;
}
.pill:hover { color: rgba(255, 255, 255, 0.4); }
.pill.on { color: #a29bfe; background: rgba(108, 92, 231, 0.12); border-color: rgba(108, 92, 231, 0.18); }
.mem-pill { display: flex; align-items: center; gap: 4px; }
.mem-pill .dot { width: 5px; height: 5px; border-radius: 50%; background: #6c5ce7; box-shadow: 0 0 8px rgba(108, 92, 231, 0.5); }
.shift-pill.shift-active {
  color: #fff;
  background: #e84393;
  border-color: #e84393;
  box-shadow: 0 0 18px rgba(232, 67, 147, 0.4);
}

.tool-btn {
  all: unset; cursor: pointer;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.18);
  transition: all 0.15s;
}
.tool-btn:hover { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.45); }
.tool-btn.active { color: #a29bfe; background: rgba(108,92,231,0.1); }

/* ═══ MEMORY STRIP ═══ */
.mem-strip {
  display: flex; gap: 8px; margin-bottom: 8px;
}
.mem-tag {
  all: unset; cursor: pointer;
  flex: 1; text-align: center;
  font-size: 0.72rem; font-weight: 600;
  padding: 7px 0;
  color: rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.02);
  transition: all 0.12s;
}
.mem-tag:hover { color: rgba(255, 255, 255, 0.4); background: rgba(255, 255, 255, 0.04); }
.ans-tag { color: rgba(108, 92, 231, 0.35); }
.ans-tag:hover { color: rgba(108, 92, 231, 0.65); background: rgba(108, 92, 231, 0.06); }

/* ═══ DISPLAY ═══ */
.display-box {
  padding: 10px 4px 16px;
  text-align: right;
  min-height: 120px;
  display: flex; flex-direction: column; justify-content: flex-end;
  perspective: 600px;
  transform-style: preserve-3d;
  will-change: transform;
}
.expr-text {
  font-size: 0.9rem;
  font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', ui-monospace, monospace;
  font-style: italic;
  color: rgba(255, 255, 255, 0.12);
  margin-bottom: 6px; min-height: 22px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  letter-spacing: 0.3px;
}
.cur {
  animation: blink 1s step-end infinite;
  font-weight: 200; font-style: normal; opacity: 0.4;
}
@keyframes blink { 50% { opacity: 0; } }
.val-text {
  font-weight: 800;
  color: #ffffff;
  line-height: 1.05;
  letter-spacing: -1px;
  transition: font-size 0.1s ease;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  backface-visibility: hidden;
  text-shadow: 0 0 40px rgba(108, 92, 231, 0.08);
}

.sep {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
  margin: 2px 0 14px;
}
.sep-thin {
  height: 1px;
  background: rgba(255,255,255,0.02);
  margin: 8px 0;
}

/* ═══ SCIENTIFIC GRID (5×6) ═══ */
.sci-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-bottom: 14px;
}
.sci-cell {
  all: unset; cursor: pointer; text-align: center;
  padding: 8px 0; border-radius: 10px;
  font-size: 0.78rem; font-weight: 500;
  color: rgba(162, 155, 254, 0.55);
  background: rgba(108, 92, 231, 0.035);
  border: 1px solid rgba(108, 92, 231, 0.05);
  transition: all 0.12s;
  will-change: transform;
  user-select: none;
}
.sci-cell:hover { background: rgba(108, 92, 231, 0.09); color: rgba(162, 155, 254, 0.9); }
.sci-cell:active { transform: scale(0.94); }
.sci-pct { color: rgba(253, 203, 110, 0.5); }
.sci-pct:hover { color: rgba(253, 203, 110, 0.85); background: rgba(253, 203, 110, 0.08); }

.sci-sweep-enter-active { animation: sciPop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); }
.sci-sweep-leave-active { animation: sciPop 0.15s ease reverse; }
@keyframes sciPop {
  from { opacity: 0; transform: translateY(-8px) scaleY(0.95); max-height: 0; }
  to { opacity: 1; transform: translateY(0) scaleY(1); max-height: 350px; }
}

/* ═══ MAIN BUTTON GRID ═══ */
.main-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.key {
  all: unset; cursor: pointer; text-align: center;
  padding: 18px 0;
  border-radius: 16px;
  font-size: 1.4rem;
  font-weight: 600;
  transition: transform 0.08s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.12s, box-shadow 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.02);
  user-select: none;
  will-change: transform;
  position: relative;
  overflow: hidden;
}
.key:active { transform: scale(0.92); }
.key-wide { grid-column: span 2; }

.key::after {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.08) 0%, transparent 60%);
  opacity: 0; transition: opacity 0.3s;
}
.key:hover::after { opacity: 1; }

.key-num {
  color: rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.02);
}
.key-num:hover { background: rgba(255, 255, 255, 0.04); }

.key-op {
  color: #a29bfe;
  background: rgba(108, 92, 231, 0.07);
}
.key-op:hover { background: rgba(108, 92, 231, 0.13); }

.key-fn {
  color: #fdcb6e;
  background: rgba(253, 203, 110, 0.04);
  font-size: 1.15rem;
}
.key-fn:hover { background: rgba(253, 203, 110, 0.1); }

.key-clear {
  color: #d63031;
  background: rgba(214, 48, 49, 0.06);
  font-size: 1rem;
}
.key-clear:hover { background: rgba(214, 48, 49, 0.12); }

.key-eq {
  color: #fff;
  font-size: 1.15rem;
  background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
  box-shadow: 0 4px 24px rgba(108, 92, 231, 0.3), 0 0 60px rgba(108, 92, 231, 0.08);
  border-color: transparent;
  animation: pulse-glow 2.5s ease-in-out infinite;
}
.key-eq:hover {
  box-shadow: 0 6px 32px rgba(108, 92, 231, 0.45), 0 0 80px rgba(108, 92, 231, 0.12);
  border-color: rgba(108, 92, 231, 0.3);
}
.key-eq::after { background: radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.15) 0%, transparent 60%); }

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 4px 24px rgba(108, 92, 231, 0.3), 0 0 60px rgba(108, 92, 231, 0.06); }
  50% { box-shadow: 0 4px 28px rgba(108, 92, 231, 0.4), 0 0 80px rgba(108, 92, 231, 0.14); }
}

/* ═══ COPYRIGHT ═══ */
.copyright-wrap {
  position: relative;
  margin-top: 10px;
  padding-top: 16px;
  overflow: hidden;
}
.copyright-glow {
  position: absolute;
  top: 0; left: -20%; right: -20%;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(108,92,231,0.4) 20%, rgba(162,155,254,0.6) 40%, rgba(253,203,110,0.5) 60%, rgba(232,67,147,0.4) 80%, transparent 100%);
  filter: blur(3px);
  animation: glow-sweep 4s ease-in-out infinite;
}
@keyframes glow-sweep {
  0%   { transform: translateX(-30%); opacity: 0.6; }
  50%  { transform: translateX(30%); opacity: 1; }
  100% { transform: translateX(-30%); opacity: 0.6; }
}
.copyright {
  text-align: center;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 3px;
  background: linear-gradient(135deg, rgba(162,155,254,0.35), rgba(253,203,110,0.25), rgba(232,67,147,0.2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  position: relative;
  z-index: 1;
}
.copyright::before {
  content: '© 2026 hanif abdurrohim';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(162,155,254,0.08), rgba(253,203,110,0.05));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: blur(8px);
  z-index: -1;
}

/* ═══ HISTORY PANEL ═══ */
.hist-panel {
  width: 100%; max-width: 580px; margin-top: 14px;
  background: rgba(10, 10, 18, 0.75);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 28px; padding: 18px 22px;
  position: relative; z-index: 1;
  max-height: 300px; overflow: hidden;
}
.hist-head { display: flex; justify-content: space-between; align-items: center; }
.hist-label { font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.18); letter-spacing: 2px; text-transform: uppercase; }
.hist-clear { all: unset; cursor: pointer; color: rgba(255,255,255,0.12); padding: 4px; border-radius: 6px; transition: all 0.12s; }
.hist-clear:hover { color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.04); }
.hist-body { max-height: 200px; overflow-y: auto; padding-top: 6px; }
.hist-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.015);
}
.hist-row:last-child { border-bottom: none; }
.hist-expr { font-size: 0.82rem; color: rgba(255,255,255,0.25); font-weight: 400; }
.hist-res { font-size: 0.92rem; color: rgba(255,255,255,0.75); font-weight: 600; }
.hist-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 18px; font-size: 0.8rem; color: rgba(255,255,255,0.1);
}

.hist-glide-enter-active { animation: histSlide 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.hist-glide-leave-active { animation: histSlide 0.18s ease reverse; }
@keyframes histSlide {
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
}

/* ═══ HINT BAR ═══ */
.hint-bar {
  display: flex; align-items: center; gap: 6px;
  margin-top: 14px; font-size: 0.6rem; color: rgba(255,255,255,0.07);
  position: relative; z-index: 1;
}
</style>
