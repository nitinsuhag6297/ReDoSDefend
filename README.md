# 🛡️ ReDoS-Proof DFA Security Filter

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A high-performance, algorithmic security filter and regex engine designed to completely eliminate **Regular Expression Denial of Service (ReDoS)** attacks and catastrophic backtracking by transforming vulnerable patterns into deterministic finite automata ($\mathcal{O}(n)$ match time).

---

## 📌 Table of Contents

- [Overview](#-overview)
  - [The Problem: Catastrophic Backtracking](#the-problem-catastrophic-backtracking)
  - [The Solution: Deterministic State Machines](#the-solution-deterministic-state-machines)
- [Key Features](#-key-features)
- [Algorithmic Architecture](#-algorithmic-architecture)
  - [Thompson's Construction (Regex $\rightarrow$ NFA)](#1-thompsons-construction-regex-%E2%86%92-nfa)
  - [Powerset Construction (NFA $\rightarrow$ DFA)](#2-powerset-subset-construction-nfa-%E2%86%92-dfa)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Cloning the Repository](#cloning-the-repository)
  - [Backend Setup (FastAPI)](#backend-setup-fastapi)
  - [Frontend Setup (React + Vite)](#frontend-setup-react--vite)
  - [Quick Start Scripts (Windows)](#quick-start-scripts-windows)
- [Testing & Benchmarking](#-testing--benchmarking)
  - [Compile Testing (Vulnerability Auditing)](#compile-testing-vulnerability-auditing)
  - [Stress Testing (Linearity & Load Verification)](#stress-testing-linearity--load-verification)
- [Security Guardrails & Firewall](#-security-guardrails--firewall)
- [Interactive Visualization](#-interactive-visualization)
- [Author](#-author)
- [License](#-license)

---

## 📖 Overview

### The Problem: Catastrophic Backtracking
Traditional backtracking regular expression engines (such as Python's standard `re` module, JavaScript's built-in `RegExp`, or PCRE) utilize recursive depth-first search algorithms with backtracking. When faced with ambiguous patterns containing nested quantifiers or overlapping alternations (e.g., `(a+)+$`), an adversary can craft an adversarial input string (e.g., `aaaaaaaaaaaaaaaaaaaa!`) that triggers exponential matching steps $\mathcal{O}(2^n)$.

This stalls CPU cores, exhausts thread pools, causes event-loop starvation, and results in full-system **Regular Expression Denial of Service (ReDoS)**.

### The Solution: Deterministic State Machines
The **ReDoS-Proof DFA Security Filter** inspects and transforms regular expressions using theoretical automata principles:
1. The regex syntax tree is converted into a **Non-Deterministic Finite Automaton (NFA)** with $\varepsilon$-transitions via **Thompson's Construction**.
2. The NFA is compiled into a strictly equivalent **Deterministic Finite Automaton (DFA)** using **Powerset Construction** ($\varepsilon$-closure and subset construction).
3. The resulting DFA inspects any text in strictly linear time—guaranteeing $\mathcal{O}(n)$ worst-case matching time relative to the input text length, completely eliminating backtracking.

```
Input Regex ───► Lexer & AST Parser ───► Thompson's Construction (NFA)
                                                      │
                                                      ▼
Protected Execution ◄─── Linear-Time Engine ◄─── Powerset Construction (DFA)
 (Strictly O(n))        (Zero Backtracking)    (State Explosion Guardrails)
```

---

## ✨ Key Features

- 🔄 **NFA to DFA Conversion Engine**: Deterministic compilation pipeline utilizing Thompson's construction and Powerset subset construction with epsilon-closure calculation.
- ⚡ **Strict $\mathcal{O}(n)$ Execution Guarantee**: Every DFA-compiled regular expression scans input characters in lockstep; matching time is strictly proportional to text length, immune to adversarial payloads.
- 🧪 **Compile-Time Vulnerability Analysis**: Early detection checks that parse regex syntax trees, flag exponential/polynomial ambiguity candidates, and reject uncompilable or malformed constructs before runtime.
- 📈 **Dynamic Stress Testing & Benchmarking Suite**: Automated harness executing parallel stress tests comparing standard backtracking engines against the DFA filter under heavy, adversarial loads.
- 🛡️ **Defensive Firewall Guardrails**: Built-in state-explosion governors protecting the compiler against malicious patterns designed to blow up the powerset state space ($2^{|Q|}$).
- 📊 **Interactive Web Workspace**: Modern, reactive frontend featuring real-time state machine inspection and interactive latency curves plotted with Recharts.

---

## 🧠 Algorithmic Architecture

```
+-------------------------------------------------------------------------+
|                              REGEX PATTERN                              |
|                              e.g. (a|b)*abb                             |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                      1. Thompson's Construction                         |
|  - Converts AST into NFA with epsilon (ε) transitions                   |
|  - Creates at most 2 * |Regex| states and 4 * |Regex| transitions        |
|  - Linear construction time: O(m)                                       |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                  2. Powerset (Subset) Construction                      |
|  - Computes ε-closure for candidate state configurations                |
|  - Eliminates nondeterminism by merging concurrent states               |
|  - Enforces DFA state budget limit (guards against state explosion)     |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                      3. Deterministic Match Engine                      |
|  - Transitions on exactly one state per input character                 |
|  - Guaranteed O(n) running time, independent of pattern complexity      |
+-------------------------------------------------------------------------+
```

### 1. Thompson's Construction (Regex $\rightarrow$ NFA)
Builds state machines compositionally from the pattern's abstract syntax tree (AST). Supports base characters, concatenation, union/alternation (`|`), and Kleene star/plus (`*`, `+`). State complexity remains bounded: an expression of length $m$ produces an NFA with at most $2m$ states.

### 2. Powerset (Subset) Construction (NFA $\rightarrow$ DFA)
Transforms the NFA's powerset $2^Q$ of reachable states into single deterministic states using fixed-point $\varepsilon$-closure computations. Transitions are pre-computed or memoized on demand, ensuring that during text matching, each input symbol requires exactly one array/hash lookup.

---

## 💻 Tech Stack

| Domain | Technologies & Algorithms |
| :--- | :--- |
| **Backend Core** | **Python 3.10+**, **FastAPI**, **Uvicorn**, **Pydantic** |
| **Algorithms** | **Thompson's Construction**, **Powerset Construction**, **$\varepsilon$-Closure Graph Traversal** |
| **Frontend UI** | **React 18**, **TypeScript**, **Vite** |
| **Styling & Icons** | **Tailwind CSS**, **Lucide React** |
| **Data Visualization** | **Recharts** (Execution Latency vs. Input Length curves) |
| **Testing & QA** | **Pytest**, **Benchmarking Harness** |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your system:
- **Python**: `3.10` or higher
- **Node.js**: `18.x` or higher
- **npm** or **pnpm** / **yarn**
- **Git**

### Cloning the Repository

```bash
git clone https://github.com/nitinsuhag6297/redos-nfa-dfa-filter.git
cd redos-nfa-dfa-filter
```

---

### Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Launch the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   The backend API will be available at `http://127.0.0.1:8000`. You can explore the interactive OpenAPI documentation at `http://127.0.0.1:8000/docs`.

---

### Frontend Setup (React + Vite)

1. Open a new terminal session and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install client dependencies:
   ```bash
   npm install
   ```

3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

---

### Quick Start Scripts (Windows)

For convenience on Windows environments, helper launcher batch scripts are included at the root of the project:

- **Start Both (Full-Stack)**: Double-click or run `start-all.bat`
- **Backend Only**: Run `start-backend.bat`
- **Frontend Only**: Run `start-frontend.bat`

---

## 🧪 Testing & Benchmarking

The project includes unit, property, and stress testing suites to validate correctness, measure linearity, and verify ReDoS prevention.

### Compile Testing (Vulnerability Auditing)
To execute compile tests and verify that the parser accurately constructs NFAs and DFAs across standard and adversarial regex patterns:

```bash
cd backend
pytest tests/test_dfa.py -v
```

### Stress Testing (Linearity & Load Verification)
The stress test suite benchmarks the DFA security filter directly against Python's native backtracking engine (`re`). It subjects both engines to increasing lengths of adversarial inputs (e.g., `(a+)+$` against `"a" * n + "!"`):

```bash
cd backend
pytest tests/test_linearity.py -v -s
```

#### Expected Benchmark Behavior:
- **Native Backtracking Engine (`re`)**: Execution time escalates exponentially ($\mathcal{O}(2^n)$), freezing at input lengths $> 25$ characters.
- **ReDoS-Proof DFA Engine**: Execution time scales strictly as a flat linear curve ($\mathcal{O}(n)$), successfully processing inputs of $10,000+$ characters in sub-milliseconds.

---

## 🛡️ Security Guardrails & Firewall

While DFAs guarantee $\mathcal{O}(n)$ matching time, constructing a DFA from an arbitrary NFA carries a theoretical worst-case space complexity of $\mathcal{O}(2^m)$ states (*State Explosion Problem*).

To prevent memory-exhaustion attacks against the compiler itself, the security filter implements the following guardrails:

| Guardrail | Mechanism | Defense Objective |
| :--- | :--- | :--- |
| **Max State Cap** | Hard ceiling on states created during subset construction | Prevents compiler memory exhaustion on explosive patterns |
| **Complexity Budget** | Limits maximum allowed repetitions & nested quantifier depths | Halts deeply recursive or pathological grammar expansions |
| **Input String Length Limit**| Configurable ceiling on max payload evaluations | Blocks network socket flooding and oversized payloads |
| **Fallback / Reject Protocol**| Clean rejection with actionable diagnostics | Refuses to serve unsafe expressions to client runtimes |

---

## 📊 Interactive Visualization

The included React dashboard provides side-by-side benchmarking and visualization:
- **Live Regex Playground**: Input custom regex patterns and test payload strings in real time.
- **Performance Curves**: Real-time charts powered by Recharts plotting execution latency vs. input size ($N$) for both backtracking and DFA algorithms.
- **Engine Comparison**: Direct metrics showcasing transition count, memory footprint, and algorithmic execution time.

---

## 👨‍💻 Author

**Nitin Suhag**
- GitHub: [@nitinsuhag6297](https://github.com/nitinsuhag6297)
- Repository: [redos-nfa-dfa-filter](https://github.com/nitinsuhag6297/redos-nfa-dfa-filter.git)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and integrate it into your security pipelines and Web Application Firewalls (WAFs).
