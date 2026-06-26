# NeoCalc - Expert Scientific Calculator

> A premium, glassmorphism scientific calculator built with **Vue 3**, **Vuetify 4**, and **anime.js**. Features a full Shunting-Yard expression parser, 40+ mathematical functions, 2nd shift toggle, memory operations, ANS recall, and a cyberpunk-inspired neon UI.

<p align="center">
  <img src="https://img.shields.io/badge/Vue_3-4FC08D?logo=vue.js&logoColor=white" alt="Vue 3">
  <img src="https://img.shields.io/badge/Vuetify_4-1867C0?logo=vuetify&logoColor=white" alt="Vuetify 4">
  <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/anime.js-FF6B6B?logo=javascript&logoColor=white" alt="anime.js">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT">
</p>

---

## ✨ Features

### 🔢 Arithmetic & Operators
- Basic: `+`, `−`, `×`, `÷`, `^` (exponentiation)
- `nPr` (permutations), `nCr` (combinations)
- `%` (modulo remainder)
- Parentheses with auto-close on evaluate
- Implicit multiplication (`2π`, `3(2+1)`, `(a)(b)`)
- Unary minus & sign toggle (`±`)

### 📐 Trigonometric (DEG / RAD)
| Normal | Shift (2nd) |
|--------|-------------|
| `sin`  | `arcsin`    |
| `cos`  | `arccos`    |
| `tan`  | `arctan`    |

### 🌊 Hyperbolic
| Normal  | Shift (2nd) |
|---------|-------------|
| `sinh`  | `arsinh`    |
| `cosh`  | `arcosh`    |
| `tanh`  | `artanh`    |

### 📊 Powers & Roots
| Normal | Shift (2nd) |
|--------|-------------|
| `x²`   | `x³`        |
| `√`    | `∛`         |
| `xⁿ`   | —           |

### 📈 Logarithmic & Exponential
| Function | Description          |
|----------|----------------------|
| `log`    | Base-10 logarithm    |
| `ln`     | Natural logarithm    |
| `log₂`   | Base-2 logarithm     |
| `10ˣ`    | Power of ten         |
| `eˣ`     | Exponential function |

### 🔬 Advanced Functions
| Function  | Description                          |
|-----------|--------------------------------------|
| `abs(x)`  | Absolute value                       |
| `floor(x)`| Round down to nearest integer        |
| `ceil(x)` | Round up to nearest integer          |
| `round(x)`| Round to nearest integer             |
| `sign(x)` | Signum (−1, 0, 1)                    |
| `trunc(x)`| Truncate fractional part             |
| `fract(x)`| Fractional part (`x − trunc(x)`)     |
| `exp(x)`  | Euler's number raised to power x     |
| `gamma(x)`| Gamma function (Lanczos approx.)     |
| `erf(x)`  | Error function                       |
| `rand()`  | Random number 0–1                    |

### 🧮 Postfix (Immediate) Operators
| Button | Description              |
|--------|--------------------------|
| `x!`   | Factorial (integer ≥ 0)  |
| `x²`   | Square                   |
| `x³`   | Cube                     |
| `1/x`  | Reciprocal               |
| `10ˣ`  | Power of ten             |
| `%`    | Percent (divide by 100)  |

### 🧠 Memory & Recall
- **MC** — Clear memory
- **MR** — Recall stored value
- **M+** — Add current value to memory
- **M−** — Subtract current value from memory
- **ANS** — Recall last result

### 🧾 History
- Stores the last 20 calculations
- Toggle with the clock icon in the top bar
- Slide-in animation

### ⌨️ Keyboard Friendly
| Key            | Action                    |
|----------------|---------------------------|
| `0`–`9`        | Digit input               |
| `.`            | Decimal point             |
| `+` `-` `*` `/`| Operators                 |
| `Enter` / `=`  | Calculate                 |
| `Escape`       | All clear (AC)            |
| `Backspace`    | Delete last digit         |
| `%`            | Percent                   |
| `^`            | Exponentiation / cbrt (shift) |
| `(` `)`        | Parentheses               |
| `e` / `E`      | Scientific notation (EE)  |

### 🎨 UI / UX
- **Glassmorphism** card with `backdrop-filter: blur(48px)`
- **Ambient glow** spheres with floating animation
- **3D flip** animation on result (`anime.js`)
- **Pulsing glow** on the `=` button
- **Ripple hover** effect on all buttons
- **Scientific notation** auto-format for large/small results
- **Responsive** layout (works on mobile & desktop)

---

## 🚀 Installation

### Prerequisites

- **Node.js** v18.0.0 or later (recommended: v20+)
- **npm** v9+ or **yarn** v1.22+

### Step 1: Clone the repository

```bash
git clone https://github.com/dextryayers/NeoCalc.git
cd neocalc
```

Or download and extract the ZIP archive.

### Step 2: Install dependencies

```bash
npm install
```

This installs all required packages:

| Package              | Purpose                      |
|----------------------|------------------------------|
| `vue`                | Reactive UI framework        |
| `vuetify`            | Material Design component lib|
| `@mdi/font`          | Material Design Icons        |
| `animejs`            | JavaScript animation engine  |
| `animate.css`        | CSS animation library        |
| `vite`               | Build tool & dev server      |
| `vite-plugin-vuetify`| Vuetify Vite integration     |
| `@vitejs/plugin-vue` | Vue 3 Vite plugin            |

### Step 3: Start the development server

```bash
npm run dev
```

You should see output like:

```
  VITE v8.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

Open **http://localhost:5173/** in your browser.

### Step 4: Build for production

```bash
npm run build
```

The production build is output to the `dist/` directory and can be served with any static file server.

### Step 5: Preview production build

```bash
npm run preview
```

---

## 📁 Project Structure

```
neocalc/
├── index.html              # HTML entry point
├── package.json            # Dependencies & scripts
├── vite.config.js          # Vite configuration (Vue + Vuetify)
├── dist/                   # Production build output
├── public/
│   └── favicon.svg         # Browser tab icon
└── src/
    ├── main.js             # Vue app bootstrap + Vuetify config
    ├── App.vue             # Root component
    ├── utils/
    │   └── parser.js       # Shunting-Yard expression parser
    └── components/
        └── ModernCalculator.vue  # Main calculator component (988 lines)
```

---

## ⚙️ How It Works

### Expression Parser (`src/utils/parser.js`)

The calculator uses a **Shunting-Yard algorithm** — zero `eval()` / `Function()` calls. The pipeline is:

```
Input String → Tokenize → Implicit Multiply → Unary Minus → Shunting Yard (infix→RPN) → RPN Evaluate → Result
```

- **Tokenize**: Breaks the expression into tokens (NUMBER, PLUS, MINUS, FUNCTION, POSTFIX, etc.)
- **Insert Implicit Multiply**: Inserts `×` between `2π`, `3(`, `)(`, etc.
- **Handle Unary Minus**: Converts `−5` to `-1×5`, `3+−5` to `3+(-5)`
- **Shunting Yard**: Converts infix tokens to Reverse Polish Notation (RPN) with correct precedence and right-associativity for `^`
- **Evaluate RPN**: Pushes operands, applies operators/functions, checks for domain errors

### Precision

All binary and unary results pass through `toPrecision(12)` then back to `parseFloat()`, eliminating floating-point artifacts such as `0.1 + 0.2 = 0.30000000000000004` → `0.3`.

---

## 📖 Usage Examples

| Input | Result |
|-------|--------|
| `1 + 2 × 3` | `7` |
| `(1 + 2) × 3` | `9` |
| `sin(90)` (DEG) | `1` |
| `sin(π/2)` (RAD) | `1` |
| `5!` | `120` |
| `5 nPr 2` | `20` |
| `10 nCr 5` | `252` |
| `gamma(5)` | `24` |
| `erf(0)` | `0` |
| `exp(1)` | `2.718281828` |
| `1e5 + 2e3` | `102000` |
| `0.1 + 0.2` | `0.3` |

---

## 🧪 Running Tests

The parser has a built-in test suite using Node.js ESM:

```bash
node --input-type=module -e "
import { evaluate } from './src/utils/parser.js';
const r = evaluate('1+2');
console.log(r.value); // 3
"
```

Full test run (Windows PowerShell):

```powershell
@'
import { evaluate } from "./src/utils/parser.js";
const tests = [
  ["1+2", 3], ["0.1+0.2", 0.3], ["5!", 120],
  ["sin(90)", 1], ["gamma(5)", 24], ["erf(0)", 0],
  ["5 nPr 2", 20], ["10 nCr 5", 252],
];
let pass = 0, fail = 0;
for (const [expr, exp] of tests) {
  const { value, error } = evaluate(expr, { degMode: true });
  (Math.abs(value - exp) < 1e-10 && !error) ? pass++ : (fail++, console.log("FAIL:", expr, value, error));
}
console.log("Pass:", pass, "Fail:", fail);
'@ | node --input-type=module
```

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Vue 3 | ^3.5.38 | Reactive UI framework (Composition API + `<script setup>`) |
| Vuetify 4 | ^4.1.2 | Material Design component library |
| Vite | ^8.1.0 | Lightning-fast build tool & HMR dev server |
| anime.js | ^4.5.0 | JavaScript animation engine (3D flip, button effects) |
| animate.css | ^4.1.1 | CSS keyframe animations (panel transitions) |
| @mdi/font | ^7.4.47 | Material Design icon font |

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<p align="center">
  <strong>NeoCalc</strong> — Built with ❤️ by<br>
  <span style="background: linear-gradient(135deg, #a29bfe, #fdcb6e, #e84393); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 700;">© 2026 hanif abdurrohim</span>
</p>
