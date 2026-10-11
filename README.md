<div align="center">
  <img width="1200" height="475" alt="Google AI Studio Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />

  # ⚡ Split Wiz
  **Intelligent Expense-Splitting & Exact-Paise Debt Settlement Platform**

  [![Hackathon](https://img.shields.io/badge/Event-ZeroCode%20Delhi%20Zonals-ff5722.svg)](https://techfest.org)
  [![Competition](https://img.shields.io/badge/Competition-IIT%20Bombay%20Techfest-0288d1.svg)](https://techfest.org)
  [![Host](https://img.shields.io/badge/Host-South%20Asian%20University-4caf50.svg)](http://sau.int)
  [![Platform](https://img.shields.io/badge/Engineered%20With-Google%20AI%20Studio-4285f4.svg)](https://ai.studio)
  [![Stack](https://img.shields.io/badge/Tech-Vanilla%20JS%20%7C%20HTML5%20%7C%20CSS3-f7df1e.svg)](#technology-stack)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

  <p align="center">
    <i>A prompt-engineered financial web app built under extreme hackathon rules where writing more than 5 lines of code incurred a penalty.</i>
  </p>
</div>

---

## 🏆 The Origin Story: ZeroCode @ IIT Bombay Techfest Zonals

**Split Wiz** was created for the **ZeroCode** competition held at **South Asian University (SAU), New Delhi**, serving as the Delhi Zonal qualifier for **IIT Bombay Techfest**.

This project marked my **very first time participating in a hackathon**, turning into a memorable experiment in prompt-driven software architecture.

### 🧩 The Rule Constraint & The Prompt-Engineering Solution

The competition introduced an unconventional, high-stakes rule:

> ⚠️ **The Constraint:** Writing **more than 5 lines of manual code** resulted in an immediate score penalty.

However, the organizers did **not** place any limit on the length or sophistication of the AI prompt! 

Recognizing this, the strategy was clear:
1. **Zero Hand-Coded Lines:** Rather than manually programming features and incurring penalties, the entire technical blueprint—from architectural constraints and crypto security to mathematical invariants and responsive UI design—was defined within a comprehensive, highly structured master prompt in **Google AI Studio**.
2. **Deterministic Prompt Engineering:** The prompt specified the full business logic:
   - Client-side PBKDF2 authentication with Web Crypto API.
   - Exact integer *paise* arithmetic to prevent floating-point calculation errors.
   - Greedy debt simplification to minimize financial transactions.
   - Three independent bill-splitting modes (Equal, Itemized, Custom).
   - An integrated 23-assertion automated verification test suite.
3. **Zip-File Submission:** The final prompt was packaged and submitted as a `.zip` file alongside the generated deployment, fulfilling all competition criteria while delivering a production-ready web application without manual line infractions.

This repository serves as a permanent archive and showcase of that successful hackathon experiment.

---

## 📋 The Official Competition Brief: Theme 1 — Bill Splitter

The competition task was defined in [`docs/project_theme.txt`](docs/project_theme.txt):

> **Theme 1: Bill Splitter**  
> *A group of friends has just finished dinner and wants to settle up fast. Build a page that splits the bill for them.*

### Core Feature Checklist:
- [x] **Occasion & Input Details:** Take an occasion name, the bill amount, and the number of people.
- [x] **Action Trigger:** Have a button that calculates and shows what each person pays.
- [x] **Exact Sum Conservation:** Show each person's share, ensuring the shares add up **exactly** to the total bill.
- [x] **Validation & Error Handling:** Display a clear message, and suppress results, if the bill or the number of people is empty, zero, or negative.
- [x] **Persistence:** Still display the calculated results and data after the page is reloaded.

### Strict Competition & Environment Rules:
- **100% Client-Side Execution:** Everything runs strictly inside the browser. No runtime AI calls, no runtime AI prompts, and no internet access required. The page was evaluated on hidden test inputs.
- **Model & Tooling Requirement:** Built solely inside **Google AI Studio** Build mode (`+ New app`) utilizing the **Gemini 3.8 Flash** model.
- **Text-Only Prompts:** All instructions to Gemini were given as typed text only; inserting or attaching images or documents was strictly prohibited.
- **Freedom Beyond the Checklist:** *"Everything beyond these 5 points is your choice."* Split Wiz exceeded this baseline by introducing itemized splitting, custom amounts, greedy debt simplification (min-cash-flow), client-side PBKDF2 cryptography, JSON import/export, and an automated 23-assertion regression test suite.

---

## 💡 What is Split Wiz?

**Split Wiz** is a lightweight, zero-dependency financial web application designed for friends, roommates, and travel groups to divide bills, track shared expenses, and settle balances effortlessly.

Unlike naive splitters that rely on floating-point arithmetic (which often lead to rounding discrepancies like `0.1 + 0.2 = 0.30000000000000004`), Split Wiz is built with an **exact-paise financial engine** that ensures every single paisa is accounted for, preserving a zero-sum financial invariant across all participants.

---

## ✨ Key Features

### 1. 🎯 Exact Paise Financial Calculations
- **Zero Floating-Point Error:** All monetary amounts are parsed and processed strictly as integer *paise* ($1\text{ INR} = 100\text{ paise}$).
- **Deterministic Remainder Allocation:** When dividing indivisible amounts (e.g., ₹100 split among 3 people = 3,333 paise each + 1 remainder paisa), Split Wiz deterministically distributes the remaining paise so the total shares equal the bill down to the exact paisa.
- **Strict Decimal Precision:** Validates user inputs up to exactly two decimal places and rejects invalid, zero, or negative bills.

### 2. 🤝 Greedy Debt Settlement Engine (Min-Cash-Flow)
- Computes each participant's **net balance** across all recorded expenses ($\text{Paid} - \text{Share}$).
- Validates the **zero-sum invariant** ($\sum \text{Net Balances} \equiv 0$).
- Implements a greedy algorithm that iteratively pairs the maximum debtor with the maximum creditor to simplify multi-party debts into the **minimum possible number of transactions**.

### 3. 📊 Three Flexible Bill-Splitting Modes
- **Equal Split:** Divides the total bill equally with automatic remainder allocation.
- **Split by Items:** Assigns specific line items only to the people who consumed them, recalculating sub-shares per item.
- **Custom Shares:** Allows manual entry of individual rupee/paise amounts with real-time balance reconciliation against the total bill.

### 4. 🔐 Client-Side Cryptographic Security
- Implements user authentication using the native **Web Crypto API** (`SubtleCrypto`).
- Generates salted password hashes using **PBKDF2** with **SHA-256** and **100,000 iterations**, avoiding insecure plain-text storage.

### 5. 💾 Resilient Storage & Backup
- **Graceful Fallback:** Persists user accounts and expenses in `localStorage`, automatically falling back to an in-memory store if storage is restricted or disabled.
- **JSON Backup:** One-click export and import of user expense history with schema versioning for data portability.

### 6. 🧪 Built-in Hackathon Verification Suite
- Embedded automated test harness directly inside `app.js` (Section 10).
- Runs 23 test assertions covering:
  - Basic equal splits (`₹100` between 2 people)
  - Odd-penny remainder distribution (`₹100` across 3 people)
  - Sub-unit edge cases (`₹0.02` across 3 people)
  - Input validation (zero bills, negative bills, excessive precision)
  - Duplicate participant detection
  - Multi-person greedy debt settlement simplification
  - Zero-sum balance invariant validation

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Core** | Pure Vanilla JavaScript (ES6+) | Zero external UI libraries, zero runtime bloat |
| **Markup & Semantics** | Semantic HTML5 | Accessible navigation, ARIA live banners, screen reader support |
| **Styling** | Vanilla CSS3 | Custom design system with modern CSS variables, clean card layout, responsive design |
| **Cryptography** | Web Crypto API (`SubtleCrypto`) | PBKDF2 + SHA-256 + 100,000 iterations for client authentication |
| **Generative Platform** | Google AI Studio | Gemini-powered prompt engineering environment |
| **Dev Environment** | Vite | Lightning-fast local development and preview server |

---

## 🚀 Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### 1. Clone & Install
```bash
git clone git@github.com:Dharmendra-05/Split-Wiz.git
cd "Split Wiz"
npm install
```

### 2. Configure Environment (Optional)
If running with Google AI Studio server-side integrations:
```bash
cp .env.example .env.local
# Set your GEMINI_API_KEY if using AI extensions
```

### 3. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000` to interact with Split Wiz.

> **Note:** Because Split Wiz is built with pure Vanilla JavaScript, you can also run it by opening `index.html` directly in any modern web browser or serving it with Python:
> ```bash
> python -m http.server 3000
> ```

---

## 📂 Project Structure

```text
Split Wiz/
├── docs/             # Hackathon challenge briefs & problem statement specifications
│   └── project_theme.txt # Official Theme 1: Bill Splitter problem statement & rules
├── index.html        # Semantic single-page application structure & modals
├── app.js            # Pure Vanilla JS application logic (math, crypto, settlement & tests)
├── style.css         # Custom responsive stylesheet & design system
├── metadata.json     # Google AI Studio application metadata
├── package.json      # Vite build and dev tooling configuration
├── vite.config.ts    # Vite local development configuration
├── tsconfig.json     # TypeScript configuration for linting
├── .env.example      # Sample environment configuration template
└── README.md         # Comprehensive project documentation & origin story
```

---

## 🔗 AI Studio Project

This application was originally designed and generated inside Google AI Studio:
- **Project URL:** [ai.studio/apps/1b5a65eb-84a3-4ce8-96dd-796a23671ad0](https://ai.studio/apps/1b5a65eb-84a3-4ce8-96dd-796a23671ad0)

---

## 📝 Reflection

Participating in the **ZeroCode** hackathon at South Asian University for the IIT Bombay Techfest zonals was an eye-opening first hackathon experience. The challenge forced a fundamental shift from traditional line-by-line coding to high-level systemic prompt specification.

By meticulously structuring the algorithmic rules, edge-case handling, and cryptographic requirements inside a single prompt, **Split Wiz** demonstrated that rigorous, production-grade applications with zero floating-point errors can be crafted through disciplined prompt architecture.

---

<div align="center">
  <sub>Built by <b>Dharmendra</b> for ZeroCode @ South Asian University • Delhi Zonals for IIT Bombay Techfest</sub>
</div>
