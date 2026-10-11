/**
 * Split Wiz — Pure Vanilla JavaScript Application Logic
 * Exact Paise Monetary Calculations, Advanced Splitting & Greedy Debt Settlement
 */

'use strict';

// ============================================================================
// 1. CONSTANTS & STORAGE SCHEMA KEYS
// ============================================================================

const STORAGE_KEYS = {
  USERS: 'splitwiz_users',
  SESSION: 'splitwiz_session',
  SCHEMA_VERSION: '1.1.0'
};

// In-memory fallback if localStorage fails or is blocked
let memoryFallbackStore = {};
let isStorageAvailable = true;

// Active state
let currentUser = null;
let currentExpenses = [];
let lastCalculatedResult = null;
let activeEditingExpenseId = null;
let activeParticipantRows = []; // { id, name }

// Advanced Splitting State
let activeSplitMethod = 'equal'; // 'equal' | 'items' | 'custom'
let draftItems = [
  { id: 'item_1', name: 'Food / Drinks', priceStr: '', participantIds: [] }
];
let draftCustomShares = {}; // participantId -> amountStr

// ============================================================================
// 2. RESILIENT STORAGE MANAGER
// ============================================================================

const StorageManager = {
  init() {
    try {
      const testKey = '__splitwiz_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      isStorageAvailable = true;
    } catch (e) {
      isStorageAvailable = false;
      this.showStorageWarning('Local storage is disabled or unavailable. Changes will be stored in memory for this session only.');
    }
  },

  showStorageWarning(msg) {
    const banner = document.getElementById('storage-error-banner');
    const msgEl = document.getElementById('storage-error-message');
    if (banner && msgEl) {
      msgEl.textContent = msg;
      banner.classList.remove('hidden');
    }
  },

  get(key) {
    if (isStorageAvailable) {
      try {
        const item = window.localStorage.getItem(key);
        if (!item) return null;
        return JSON.parse(item);
      } catch (err) {
        console.error('Error parsing localStorage item for key:', key, err);
        this.showStorageWarning(`Corrupted data detected for ${key}. Existing data was preserved.`);
        return null;
      }
    }
    return memoryFallbackStore[key] || null;
  },

  set(key, value) {
    const serialized = JSON.stringify(value);
    if (isStorageAvailable) {
      try {
        window.localStorage.setItem(key, serialized);
        return true;
      } catch (err) {
        console.error('Error writing to localStorage:', key, err);
        this.showStorageWarning('Unable to save data to storage (quota exceeded or storage restricted). Saved in memory only.');
        memoryFallbackStore[key] = value;
        return false;
      }
    } else {
      memoryFallbackStore[key] = value;
      return true;
    }
  },

  remove(key) {
    if (isStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
      } catch (err) {
        console.error('Error removing key from localStorage:', key, err);
      }
    }
    delete memoryFallbackStore[key];
  }
};

// ============================================================================
// 3. CRYPTOGRAPHY UTIL (PBKDF2 Password Hashing)
// ============================================================================

const CryptoUtil = {
  async hashPassword(password, saltHex = null) {
    const encoder = new TextEncoder();
    const pwBuffer = encoder.encode(password);

    if (window.crypto && window.crypto.subtle) {
      let saltBytes;
      if (saltHex) {
        saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      } else {
        saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
        saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      }

      const key = await window.crypto.subtle.importKey(
        'raw',
        pwBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
      );

      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 100000,
          hash: 'SHA-256'
        },
        key,
        256
      );

      const hashHex = Array.from(new Uint8Array(derivedBits))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return {
        salt: saltHex,
        hash: hashHex,
        algorithm: 'PBKDF2-SHA256',
        iterations: 100000
      };
    } else {
      throw new Error('Web Cryptography API is unavailable in this environment.');
    }
  },

  async verifyPassword(password, storedSalt, storedHash) {
    const res = await this.hashPassword(password, storedSalt);
    return res.hash === storedHash;
  }
};

// ============================================================================
// 4. MONETARY CALCULATIONS & EXACT PAISE ENGINE
// ============================================================================

const PaiseCalc = {
  /**
   * Strictly parses an Indian Rupee string to integer paise.
   * Rejects negatives, zero, non-numbers, and anything with > 2 decimal places.
   * When allowZero is true, accepts zero (used for custom shares).
   */
  parseInputToPaise(inputStr, allowZero = false) {
    if (inputStr === null || inputStr === undefined) {
      return { ok: false, error: 'Please enter a valid amount.' };
    }

    const trimmed = String(inputStr).trim();
    if (!trimmed) {
      return { ok: false, error: 'Please enter a valid amount.' };
    }

    if (trimmed.startsWith('-')) {
      return { ok: false, error: 'Bill amount cannot be negative.' };
    }

    const validPattern = /^\d+(\.\d{1,2})?$/;
    if (!validPattern.test(trimmed)) {
      if (/^\d+\.\d{3,}$/.test(trimmed)) {
        return { ok: false, error: 'Bill amount cannot have more than 2 decimal places.' };
      }
      return { ok: false, error: 'Please enter a valid amount.' };
    }

    const parts = trimmed.split('.');
    const whole = parseInt(parts[0], 10);
    const fractionPart = parts[1] || '';
    const fraction = parseInt((fractionPart + '00').slice(0, 2), 10);

    const totalPaise = (whole * 100) + fraction;

    if (isNaN(totalPaise)) {
      return { ok: false, error: 'Please enter a valid amount.' };
    }

    if (!allowZero && totalPaise === 0) {
      return { ok: false, error: 'Bill amount cannot be zero.' };
    }

    if (totalPaise < 0) {
      return { ok: false, error: 'Bill amount cannot be negative.' };
    }

    return { ok: true, paise: totalPaise };
  },

  /**
   * Formats integer paise into ₹X,XX,XX.XX with exact representation
   */
  formatPaise(paise, includeSign = false) {
    const isNegative = paise < 0;
    const abs = Math.abs(paise);
    const rupees = Math.floor(abs / 100);
    const remainder = abs % 100;
    const remStr = remainder.toString().padStart(2, '0');

    const formattedRupees = rupees.toLocaleString('en-IN');
    const signPrefix = isNegative ? '-₹' : (includeSign && paise > 0 ? '+₹' : '₹');
    return `${signPrefix}${formattedRupees}.${remStr}`;
  },

  /**
   * Mode A: Equal bill splitting with deterministic remainder distribution.
   * Invariant: sum of all shares must equal totalPaise exactly.
   */
  splitEqually(totalPaise, participants) {
    const count = participants.length;
    if (count <= 0) {
      throw new Error('Participants list cannot be empty.');
    }

    const baseShare = Math.floor(totalPaise / count);
    const remainder = totalPaise % count;

    let sum = 0;
    const shares = participants.map((p, index) => {
      const extraPaisa = index < remainder ? 1 : 0;
      const sharePaise = baseShare + extraPaisa;
      sum += sharePaise;

      return {
        id: p.id,
        name: p.name,
        sharePaise
      };
    });

    if (sum !== totalPaise) {
      throw new Error(`Calculation invariant failed: sum of shares (${sum}) does not equal total bill (${totalPaise})`);
    }

    return {
      shares,
      totalPaise,
      remainderPaise: remainder,
      baseSharePaise: baseShare
    };
  },

  /**
   * Mode B: Split by Items.
   * Each item is split equally only among its selected participants using integer paise.
   */
  splitByItems(totalPaise, participants, items) {
    if (!items || items.length === 0) {
      throw new Error('Please add at least one item.');
    }

    let itemsTotalPaise = 0;
    const participantShareMap = {};
    const participantItemBreakdown = {};

    participants.forEach(p => {
      participantShareMap[p.id] = 0;
      participantItemBreakdown[p.id] = [];
    });

    // Validate and process each item
    items.forEach((item, idx) => {
      const itemNum = idx + 1;
      const itemName = (item.name || '').trim();
      if (!itemName) {
        throw new Error(`Item #${itemNum} name cannot be blank.`);
      }

      const priceRes = this.parseInputToPaise(item.priceStr, false);
      if (!priceRes.ok) {
        throw new Error(`Item #${itemNum} ('${itemName}'): ${priceRes.error}`);
      }
      const itemPaise = priceRes.paise;
      itemsTotalPaise += itemPaise;

      const selectedIds = item.participantIds || [];
      const validSelectedIds = selectedIds.filter(id => participants.some(p => p.id === id));

      if (validSelectedIds.length === 0) {
        throw new Error(`Item #${itemNum} ('${itemName}') has no participants selected.`);
      }

      // Split this item's price equally among only its selected participants
      const count = validSelectedIds.length;
      const baseShare = Math.floor(itemPaise / count);
      const remainder = itemPaise % count;

      validSelectedIds.forEach((pid, pIdx) => {
        const extra = pIdx < remainder ? 1 : 0;
        const allocatedPaise = baseShare + extra;
        participantShareMap[pid] += allocatedPaise;

        participantItemBreakdown[pid].push({
          itemName,
          itemPricePaise: itemPaise,
          allocatedPaise,
          sharedWithCount: count
        });
      });
    });

    // Invariant: Total of items must equal the overall bill exactly
    if (itemsTotalPaise !== totalPaise) {
      const diffPaise = Math.abs(itemsTotalPaise - totalPaise);
      throw new Error(
        `Total of items (${this.formatPaise(itemsTotalPaise)}) does not match the bill amount (${this.formatPaise(totalPaise)}). Difference: ${this.formatPaise(diffPaise)}.`
      );
    }

    let finalSum = 0;
    const shares = participants.map(p => {
      const sharePaise = participantShareMap[p.id] || 0;
      finalSum += sharePaise;
      return {
        id: p.id,
        name: p.name,
        sharePaise,
        breakdown: participantItemBreakdown[p.id] || []
      };
    });

    if (finalSum !== totalPaise) {
      throw new Error(`Item calculation discrepancy: shares sum (${finalSum}) does not match bill (${totalPaise})`);
    }

    return {
      shares,
      totalPaise,
      items: items.map(item => ({
        id: item.id,
        name: item.name.trim(),
        pricePaise: this.parseInputToPaise(item.priceStr).paise,
        participantIds: [...item.participantIds]
      }))
    };
  },

  /**
   * Mode C: Custom Shares.
   * Direct amount per participant; sum must equal the overall bill.
   */
  splitByCustomShares(totalPaise, participants, customMap) {
    let customSum = 0;
    const shares = [];

    participants.forEach(p => {
      const rawVal = customMap[p.id] !== undefined ? customMap[p.id] : '';
      if (rawVal === '') {
        throw new Error(`Please enter an amount for ${p.name}.`);
      }

      const parseRes = this.parseInputToPaise(rawVal, true); // 0 is allowed
      if (!parseRes.ok) {
        throw new Error(`Share for ${p.name}: ${parseRes.error}`);
      }

      const sharePaise = parseRes.paise;
      customSum += sharePaise;

      shares.push({
        id: p.id,
        name: p.name,
        sharePaise
      });
    });

    if (customSum !== totalPaise) {
      const diffPaise = Math.abs(customSum - totalPaise);
      throw new Error(
        `Total of custom shares (${this.formatPaise(customSum)}) does not match the bill amount (${this.formatPaise(totalPaise)}). Difference: ${this.formatPaise(diffPaise)}.`
      );
    }

    return {
      shares,
      totalPaise,
      customShares: { ...customMap }
    };
  }
};

// ============================================================================
// 5. GREEDY DEBT SETTLEMENT ENGINE
// ============================================================================

const SettlementEngine = {
  calculateNetBalances(expenses) {
    const balances = new Map();

    expenses.forEach(exp => {
      if (!balances.has(exp.payerName)) {
        balances.set(exp.payerName, {
          id: exp.payerId,
          name: exp.payerName,
          paidPaise: 0,
          sharePaise: 0,
          netPaise: 0
        });
      }
      const payerRec = balances.get(exp.payerName);
      payerRec.paidPaise += exp.totalPaise;

      exp.participants.forEach(p => {
        if (!balances.has(p.name)) {
          balances.set(p.name, {
            id: p.id,
            name: p.name,
            paidPaise: 0,
            sharePaise: 0,
            netPaise: 0
          });
        }
        const pRec = balances.get(p.name);
        pRec.sharePaise += p.sharePaise;
      });
    });

    let totalNet = 0;
    const list = Array.from(balances.values()).map(item => {
      item.netPaise = item.paidPaise - item.sharePaise;
      totalNet += item.netPaise;
      return item;
    });

    return {
      balances: list,
      isZeroSum: totalNet === 0,
      residualPaise: totalNet
    };
  },

  simplifyDebts(netBalancesList) {
    const creditors = [];
    const debtors = [];

    netBalancesList.forEach(item => {
      if (item.netPaise > 0) {
        creditors.push({ name: item.name, amount: item.netPaise });
      } else if (item.netPaise < 0) {
        debtors.push({ name: item.name, amount: Math.abs(item.netPaise) });
      }
    });

    const transactions = [];

    while (creditors.length > 0 && debtors.length > 0) {
      creditors.sort((a, b) => b.amount - a.amount);
      debtors.sort((a, b) => b.amount - a.amount);

      const topCreditor = creditors[0];
      const topDebtor = debtors[0];

      const transferAmount = Math.min(topCreditor.amount, topDebtor.amount);

      if (transferAmount > 0) {
        transactions.push({
          debtor: topDebtor.name,
          creditor: topCreditor.name,
          amountPaise: transferAmount
        });

        topCreditor.amount -= transferAmount;
        topDebtor.amount -= transferAmount;
      }

      if (topCreditor.amount === 0) creditors.shift();
      if (topDebtor.amount === 0) debtors.shift();
    }

    return transactions;
  }
};

// ============================================================================
// 6. USER & SESSION MANAGEMENT
// ============================================================================

const UserManager = {
  getUsers() {
    return StorageManager.get(STORAGE_KEYS.USERS) || [];
  },

  saveUsers(users) {
    return StorageManager.set(STORAGE_KEYS.USERS, users);
  },

  async register(fullname, username, password) {
    const users = this.getUsers();
    const cleanUsername = username.trim().toLowerCase();

    if (users.some(u => u.username === cleanUsername)) {
      throw new Error('Username already exists. Please choose another.');
    }

    const { salt, hash, algorithm, iterations } = await CryptoUtil.hashPassword(password);

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: fullname.trim(),
      username: cleanUsername,
      salt,
      hash,
      algorithm,
      iterations,
      expenses: [],
      lastCalculation: null,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  },

  async login(username, password) {
    const users = this.getUsers();
    const cleanUsername = username.trim().toLowerCase();
    const user = users.find(u => u.username === cleanUsername);

    if (!user) {
      throw new Error('Invalid username or password.');
    }

    const isValid = await CryptoUtil.verifyPassword(password, user.salt, user.hash);
    if (!isValid) {
      throw new Error('Invalid username or password.');
    }

    this.createSession(user.id);
    return user;
  },

  createSession(userId) {
    StorageManager.set(STORAGE_KEYS.SESSION, {
      userId,
      loginTime: Date.now()
    });
  },

  getSession() {
    return StorageManager.get(STORAGE_KEYS.SESSION);
  },

  clearSession() {
    StorageManager.remove(STORAGE_KEYS.SESSION);
  },

  updateCurrentUserState() {
    if (!currentUser) return;
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
      users[idx].expenses = currentExpenses;
      users[idx].lastCalculation = lastCalculatedResult;
      this.saveUsers(users);
    }
  }
};

// ============================================================================
// 7. UI CONTROLLERS & VIEW ROUTING
// ============================================================================

const UI = {
  switchSection(sectionId) {
    const sections = ['dashboard', 'new-expense', 'settle-up', 'history'];
    sections.forEach(s => {
      const el = document.getElementById(`section-${s}`);
      if (el) el.classList.toggle('hidden', s !== sectionId);
    });

    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === sectionId);
    });

    const mobileDropdown = document.getElementById('mobile-nav-dropdown');
    if (mobileDropdown) mobileDropdown.classList.add('hidden');

    if (sectionId === 'dashboard') {
      this.renderDashboard();
    } else if (sectionId === 'settle-up') {
      this.renderSettleUp();
    } else if (sectionId === 'history') {
      this.renderHistory();
    }
  },

  showNotification(message, type = 'info', duration = 3500) {
    const banner = document.getElementById('global-notification');
    const msgEl = document.getElementById('notification-message');
    if (!banner || !msgEl) return;

    banner.className = `notification-banner ${type}`;
    msgEl.textContent = message;
    banner.classList.remove('hidden');

    const sr = document.getElementById('sr-announcements');
    if (sr) sr.textContent = message;

    if (banner._timer) clearTimeout(banner._timer);
    banner._timer = setTimeout(() => {
      banner.classList.add('hidden');
    }, duration);
  },

  setAuthVisible(isAuth) {
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const mainHeader = document.getElementById('main-header');

    if (authView) authView.classList.toggle('hidden', !isAuth);
    if (appView) appView.classList.toggle('hidden', isAuth);
    if (mainHeader) mainHeader.classList.toggle('hidden', isAuth);

    if (!isAuth && currentUser) {
      const nameEl = document.getElementById('nav-user-name');
      const welcomeEl = document.getElementById('dashboard-welcome-heading');
      if (nameEl) nameEl.textContent = currentUser.name;
      if (welcomeEl) welcomeEl.textContent = `Welcome back, ${currentUser.name}`;
      this.switchSection('dashboard');
    }
  },

  // ==========================================================================
  // DASHBOARD RENDERING
  // ==========================================================================
  renderDashboard() {
    if (!currentUser) return;

    const totalCount = currentExpenses.length;
    const totalSpendingPaise = currentExpenses.reduce((acc, exp) => acc + exp.totalPaise, 0);
    const netBalData = SettlementEngine.calculateNetBalances(currentExpenses);

    let userOwedPaise = 0;
    let userOwePaise = 0;

    const userBal = netBalData.balances.find(
      b => b.name.toLowerCase() === currentUser.name.toLowerCase()
    );

    if (userBal) {
      if (userBal.netPaise > 0) {
        userOwedPaise = userBal.netPaise;
      } else if (userBal.netPaise < 0) {
        userOwePaise = Math.abs(userBal.netPaise);
      }
    }

    const countEl = document.getElementById('dash-total-count');
    const spendEl = document.getElementById('dash-total-spending');
    const owedEl = document.getElementById('dash-you-are-owed');
    const oweEl = document.getElementById('dash-you-owe');

    if (countEl) countEl.textContent = totalCount;
    if (spendEl) spendEl.textContent = PaiseCalc.formatPaise(totalSpendingPaise);
    if (owedEl) owedEl.textContent = PaiseCalc.formatPaise(userOwedPaise);
    if (oweEl) oweEl.textContent = PaiseCalc.formatPaise(userOwePaise);

    const container = document.getElementById('dashboard-recent-container');
    if (!container) return;

    if (totalCount === 0) {
      container.innerHTML = `
        <div class="empty-card" style="padding: 2.5rem 1rem;">
          <span class="empty-icon" aria-hidden="true">🧾</span>
          <h3 class="empty-title">No expenses yet.</h3>
          <p class="empty-desc">Split your first bill to get started with exact tracking.</p>
          <button type="button" class="btn-primary mt-md" data-nav="new-expense">Split Your First Bill</button>
        </div>
      `;
      const btn = container.querySelector('button[data-nav="new-expense"]');
      if (btn) btn.addEventListener('click', () => this.switchSection('new-expense'));
      return;
    }

    const recent = [...currentExpenses].reverse().slice(0, 5);
    let html = '<div class="recent-list">';
    recent.forEach(exp => {
      const methodLabel = this.getMethodLabel(exp.splittingMethod);
      html += `
        <div class="recent-item">
          <div class="recent-item-info">
            <span class="recent-item-title">${escapeHTML(exp.occasion)} <small class="badge" style="font-size:0.7rem;">${methodLabel}</small></span>
            <span class="recent-item-meta">${exp.date || 'No date'} &bull; Paid by ${escapeHTML(exp.payerName)} &bull; ${exp.participants.length} people</span>
          </div>
          <div class="recent-item-amount">
            <span class="tabular">${PaiseCalc.formatPaise(exp.totalPaise)}</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  getMethodLabel(method) {
    if (method === 'items') return 'Split by Items';
    if (method === 'custom') return 'Custom Shares';
    return 'Equal Split';
  },

  // ==========================================================================
  // PARTICIPANT ROWS (FORM SECTION B & C)
  // ==========================================================================
  initParticipantRows(participants = null) {
    if (participants && participants.length > 0) {
      activeParticipantRows = participants.map((p, idx) => ({
        id: p.id || `p_${idx + 1}`,
        name: p.name || ''
      }));
    } else {
      activeParticipantRows = [
        { id: 'p_1', name: currentUser ? currentUser.name : 'Alice' },
        { id: 'p_2', name: 'Bob' }
      ];
    }

    // Default item assignments
    if (draftItems.length === 1 && draftItems[0].participantIds.length === 0) {
      draftItems[0].participantIds = activeParticipantRows.map(p => p.id);
    }

    this.renderParticipantRows();
    this.renderItemsList();
    this.renderCustomShares();
  },

  renderParticipantRows() {
    const container = document.getElementById('participant-rows-container');
    const badge = document.getElementById('participant-count-badge');
    if (!container) return;

    container.innerHTML = '';
    const count = activeParticipantRows.length;
    if (badge) badge.textContent = `${count} ${count === 1 ? 'Person' : 'People'}`;

    activeParticipantRows.forEach((p, index) => {
      const row = document.createElement('div');
      row.className = 'participant-row';
      row.dataset.id = p.id;

      row.innerHTML = `
        <span class="participant-num">${index + 1}.</span>
        <input
          type="text"
          class="form-input participant-input"
          value="${escapeHTML(p.name)}"
          placeholder="Friend's Name"
          aria-label="Participant ${index + 1} Name"
          required
        />
        <button
          type="button"
          class="btn-remove-participant"
          title="Remove participant"
          aria-label="Remove participant ${index + 1}"
          ${count <= 1 ? 'disabled' : ''}
        >
          &times;
        </button>
      `;

      const input = row.querySelector('.participant-input');
      input.addEventListener('input', (e) => {
        p.name = e.target.value;
        this.updatePayerDropdown();
        this.renderItemsList();
        this.renderCustomShares();
      });

      const removeBtn = row.querySelector('.btn-remove-participant');
      removeBtn.addEventListener('click', () => {
        if (activeParticipantRows.length <= 1) {
          this.showNotification('You must have at least one participant.', 'error');
          return;
        }
        activeParticipantRows = activeParticipantRows.filter(item => item.id !== p.id);

        // Clean up from draft items
        draftItems.forEach(item => {
          item.participantIds = item.participantIds.filter(id => id !== p.id);
        });
        delete draftCustomShares[p.id];

        this.renderParticipantRows();
        this.updatePayerDropdown();
        this.renderItemsList();
        this.renderCustomShares();
      });

      container.appendChild(row);
    });

    this.updatePayerDropdown();
  },

  addParticipantRow() {
    const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    activeParticipantRows.push({ id: newId, name: '' });
    this.renderParticipantRows();
    this.renderItemsList();
    this.renderCustomShares();

    const inputs = document.querySelectorAll('.participant-input');
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus();
    }
  },

  updatePayerDropdown(selectedPayerId = null) {
    const select = document.getElementById('select-payer');
    if (!select) return;

    const currentSelected = selectedPayerId || select.value;
    select.innerHTML = '<option value="">Select payer from participants...</option>';

    let stillExists = false;
    activeParticipantRows.forEach(p => {
      const trimmedName = p.name.trim();
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = trimmedName || `Participant (${p.id})`;
      if (p.id === currentSelected) {
        option.selected = true;
        stillExists = true;
      }
      select.appendChild(option);
    });

    if (!stillExists && currentSelected) {
      select.value = '';
    }
  },

  // ==========================================================================
  // ADVANCED SPLIT: MODE B — ITEMS SPLIT UI
  // ==========================================================================
  renderItemsList() {
    const container = document.getElementById('items-list-container');
    if (!container) return;

    container.innerHTML = '';

    draftItems.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.dataset.id = item.id;

      // Participant checkboxes
      const pillsHtml = activeParticipantRows.map(p => {
        const isChecked = item.participantIds.includes(p.id);
        const pDisplayName = p.name.trim() || `Person ${p.id}`;
        return `
          <label class="participant-checkbox-pill ${isChecked ? 'checked' : ''}">
            <input type="checkbox" data-pid="${p.id}" ${isChecked ? 'checked' : ''} />
            <span>${escapeHTML(pDisplayName)}</span>
          </label>
        `;
      }).join('');

      card.innerHTML = `
        <div class="item-card-top">
          <input
            type="text"
            class="form-input item-name-input"
            placeholder="e.g. Pizza, Drinks, Dessert"
            value="${escapeHTML(item.name)}"
            aria-label="Item ${index + 1} Name"
          />
          <div class="item-price-wrapper">
            <span class="currency-symbol" aria-hidden="true" style="left:0.6rem;font-size:0.85rem;">₹</span>
            <input
              type="text"
              inputmode="decimal"
              class="form-input item-price-input"
              placeholder="0.00"
              value="${escapeHTML(item.priceStr || '')}"
              aria-label="Item ${index + 1} Price"
            />
          </div>
          <button
            type="button"
            class="btn-remove-participant btn-remove-item"
            title="Remove item"
            aria-label="Remove Item ${index + 1}"
            ${draftItems.length <= 1 ? 'disabled' : ''}
          >
            &times;
          </button>
        </div>

        <div class="item-card-bottom">
          <div class="item-participants-selector">
            <span class="item-assign-label">Consumed by:</span>
            ${pillsHtml}
          </div>
          <button type="button" class="btn-assign-all" data-id="${item.id}">
            Assign to everyone
          </button>
        </div>
      `;

      // Inputs Listeners
      const nameInput = card.querySelector('.item-name-input');
      nameInput.addEventListener('input', (e) => {
        item.name = e.target.value;
      });

      const priceInput = card.querySelector('.item-price-input');
      priceInput.addEventListener('input', (e) => {
        item.priceStr = e.target.value;
        this.updateItemsRunningTotal();
      });

      // Remove item
      const removeBtn = card.querySelector('.btn-remove-item');
      removeBtn.addEventListener('click', () => {
        if (draftItems.length <= 1) return;
        draftItems = draftItems.filter(it => it.id !== item.id);
        this.renderItemsList();
        this.updateItemsRunningTotal();
      });

      // Participant pills
      card.querySelectorAll('.participant-checkbox-pill input').forEach(chk => {
        chk.addEventListener('change', (e) => {
          const pid = e.target.dataset.pid;
          if (e.target.checked) {
            if (!item.participantIds.includes(pid)) item.participantIds.push(pid);
          } else {
            item.participantIds = item.participantIds.filter(id => id !== pid);
          }
          chk.closest('.participant-checkbox-pill').classList.toggle('checked', e.target.checked);
        });
      });

      // Assign to all button
      const assignAllBtn = card.querySelector('.btn-assign-all');
      assignAllBtn.addEventListener('click', () => {
        const allIds = activeParticipantRows.map(p => p.id);
        const isAllSelected = allIds.every(id => item.participantIds.includes(id));
        if (isAllSelected) {
          item.participantIds = [];
        } else {
          item.participantIds = [...allIds];
        }
        this.renderItemsList();
      });

      container.appendChild(card);
    });

    this.updateItemsRunningTotal();
  },

  addItemRow() {
    const newId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    draftItems.push({
      id: newId,
      name: '',
      priceStr: '',
      participantIds: activeParticipantRows.map(p => p.id) // default to all
    });
    this.renderItemsList();

    const inputs = document.querySelectorAll('.item-name-input');
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus();
    }
  },

  updateItemsRunningTotal() {
    const totalEl = document.getElementById('items-running-total');
    const targetEl = document.getElementById('items-target-bill');
    const diffEl = document.getElementById('items-diff-status');
    if (!totalEl || !targetEl || !diffEl) return;

    const billInput = document.getElementById('input-bill-amount');
    const billParse = PaiseCalc.parseInputToPaise(billInput ? billInput.value : '', true);
    const targetPaise = billParse.ok ? billParse.paise : 0;

    let itemsSumPaise = 0;
    draftItems.forEach(item => {
      const p = PaiseCalc.parseInputToPaise(item.priceStr, true);
      if (p.ok) itemsSumPaise += p.paise;
    });

    totalEl.textContent = PaiseCalc.formatPaise(itemsSumPaise);
    targetEl.textContent = PaiseCalc.formatPaise(targetPaise);

    const diff = targetPaise - itemsSumPaise;
    if (diff === 0 && targetPaise > 0) {
      diffEl.textContent = '✓ Exactly matches total bill (0 paise remaining)';
      diffEl.className = 'tracker-diff matched';
    } else if (diff > 0) {
      diffEl.textContent = `₹${(diff / 100).toFixed(2)} remaining to allocate`;
      diffEl.className = 'tracker-diff mismatched';
    } else {
      diffEl.textContent = `Items exceed bill by ₹${(Math.abs(diff) / 100).toFixed(2)}`;
      diffEl.className = 'tracker-diff mismatched';
    }
  },

  // ==========================================================================
  // ADVANCED SPLIT: MODE C — CUSTOM SHARES UI
  // ==========================================================================
  renderCustomShares() {
    const container = document.getElementById('custom-shares-container');
    if (!container) return;

    container.innerHTML = '';

    activeParticipantRows.forEach(p => {
      const row = document.createElement('div');
      row.className = 'custom-share-row';

      const currentVal = draftCustomShares[p.id] !== undefined ? draftCustomShares[p.id] : '';
      const pDisplayName = p.name.trim() || `Person ${p.id}`;

      row.innerHTML = `
        <span class="custom-share-name">${escapeHTML(pDisplayName)}</span>
        <div class="custom-share-input-wrapper">
          <span class="currency-symbol" aria-hidden="true" style="left:0.6rem;font-size:0.85rem;">₹</span>
          <input
            type="text"
            inputmode="decimal"
            class="form-input item-price-input custom-share-input"
            placeholder="0.00"
            value="${escapeHTML(currentVal)}"
            data-pid="${p.id}"
            aria-label="Share for ${escapeHTML(pDisplayName)}"
          />
        </div>
      `;

      const input = row.querySelector('.custom-share-input');
      input.addEventListener('input', (e) => {
        draftCustomShares[p.id] = e.target.value;
        this.updateCustomSharesTotal();
      });

      container.appendChild(row);
    });

    this.updateCustomSharesTotal();
  },

  autofillCustomShares() {
    const billInput = document.getElementById('input-bill-amount');
    const billParse = PaiseCalc.parseInputToPaise(billInput ? billInput.value : '', false);

    if (!billParse.ok) {
      this.showNotification('Please enter a valid bill amount first to auto-fill.', 'error');
      return;
    }

    if (activeParticipantRows.length === 0) return;

    const equalRes = PaiseCalc.splitEqually(billParse.paise, activeParticipantRows);
    equalRes.shares.forEach(s => {
      draftCustomShares[s.id] = (s.sharePaise / 100).toFixed(2);
    });

    this.renderCustomShares();
    this.showNotification('Auto-filled custom shares with equal split baseline.', 'info');
  },

  updateCustomSharesTotal() {
    const totalEl = document.getElementById('custom-shares-total');
    const targetEl = document.getElementById('custom-target-bill');
    const diffEl = document.getElementById('custom-diff-status');
    if (!totalEl || !targetEl || !diffEl) return;

    const billInput = document.getElementById('input-bill-amount');
    const billParse = PaiseCalc.parseInputToPaise(billInput ? billInput.value : '', true);
    const targetPaise = billParse.ok ? billParse.paise : 0;

    let customSumPaise = 0;
    activeParticipantRows.forEach(p => {
      const val = draftCustomShares[p.id] || '';
      const parsed = PaiseCalc.parseInputToPaise(val, true);
      if (parsed.ok) customSumPaise += parsed.paise;
    });

    totalEl.textContent = PaiseCalc.formatPaise(customSumPaise);
    targetEl.textContent = PaiseCalc.formatPaise(targetPaise);

    const diff = targetPaise - customSumPaise;
    if (diff === 0 && targetPaise > 0) {
      diffEl.textContent = '✓ Exactly matches total bill (0 paise remaining)';
      diffEl.className = 'tracker-diff matched';
    } else if (diff > 0) {
      diffEl.textContent = `₹${(diff / 100).toFixed(2)} remaining to assign`;
      diffEl.className = 'tracker-diff mismatched';
    } else {
      diffEl.textContent = `Shares exceed bill by ₹${(Math.abs(diff) / 100).toFixed(2)}`;
      diffEl.className = 'tracker-diff mismatched';
    }
  },

  setSplitMethod(method) {
    activeSplitMethod = method;

    // Tabs state
    document.querySelectorAll('.method-tab').forEach(tab => {
      const isMatch = tab.dataset.method === method;
      tab.classList.toggle('active', isMatch);
      tab.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    // Panels
    const panels = {
      equal: document.getElementById('split-mode-equal-panel'),
      items: document.getElementById('split-mode-items-panel'),
      custom: document.getElementById('split-mode-custom-panel')
    };

    Object.keys(panels).forEach(k => {
      if (panels[k]) panels[k].classList.toggle('hidden', k !== method);
    });

    // Indicator in accordion header
    const indicator = document.getElementById('active-method-indicator');
    if (indicator) {
      indicator.textContent = this.getMethodLabel(method);
    }

    if (method === 'items') {
      this.renderItemsList();
    } else if (method === 'custom') {
      this.renderCustomShares();
    }
  },

  // ==========================================================================
  // RESULT CARD RENDERING
  // ==========================================================================
  renderResultCard(calcData) {
    const placeholder = document.getElementById('result-placeholder-card');
    const card = document.getElementById('calculated-result-card');
    if (!card) return;

    if (!calcData) {
      if (placeholder) placeholder.classList.remove('hidden');
      card.classList.add('hidden');
      return;
    }

    if (placeholder) placeholder.classList.add('hidden');
    card.classList.remove('hidden');

    document.getElementById('result-display-date').textContent = calcData.date || new Date().toLocaleDateString();
    document.getElementById('result-occasion-name').textContent = calcData.occasion;
    document.getElementById('result-total-bill').textContent = PaiseCalc.formatPaise(calcData.totalPaise);
    document.getElementById('result-payer-name').textContent = calcData.payerName;
    document.getElementById('result-participant-count').textContent = calcData.participants.length;

    // Method badge
    const methodBadge = document.getElementById('result-method-badge');
    if (methodBadge) {
      methodBadge.textContent = this.getMethodLabel(calcData.splittingMethod);
    }

    // Shares list
    const sharesList = document.getElementById('result-shares-list');
    sharesList.innerHTML = '';

    let sumShares = 0;
    calcData.participants.forEach(p => {
      sumShares += p.sharePaise;
      const row = document.createElement('div');
      row.className = 'share-row';

      const isPayer = p.id === calcData.payerId || p.name.trim().toLowerCase() === calcData.payerName.trim().toLowerCase();

      // If items breakdown exists
      let subItemsText = '';
      if (p.breakdown && p.breakdown.length > 0) {
        subItemsText = `<div class="text-sm text-muted mt-sm" style="font-size:0.75rem;">${
          p.breakdown.map(b => `${escapeHTML(b.itemName)} (${PaiseCalc.formatPaise(b.allocatedPaise)})`).join(', ')
        }</div>`;
      }

      row.innerHTML = `
        <div class="share-person" style="display:flex;flex-direction:column;align-items:flex-start;gap:0.15rem;">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span>${escapeHTML(p.name)}</span>
            ${isPayer ? '<span class="badge-payer">Paid the bill</span>' : ''}
          </div>
          ${subItemsText}
        </div>
        <div class="share-amount tabular">
          ${PaiseCalc.formatPaise(p.sharePaise)}
        </div>
      `;
      sharesList.appendChild(row);
    });

    // Optional Itemized Breakdown container
    const itemizedBox = document.getElementById('result-itemized-container');
    const itemizedList = document.getElementById('result-itemized-list');
    if (calcData.splittingMethod === 'items' && calcData.items && calcData.items.length > 0) {
      if (itemizedBox && itemizedList) {
        itemizedBox.classList.remove('hidden');
        itemizedList.innerHTML = '';
        calcData.items.forEach(it => {
          const row = document.createElement('div');
          row.className = 'itemized-row';
          const consumerNames = calcData.participants
            .filter(p => it.participantIds.includes(p.id))
            .map(p => escapeHTML(p.name))
            .join(', ');

          row.innerHTML = `
            <div class="itemized-desc">
              <span class="itemized-name">${escapeHTML(it.name)}</span>
              <span class="itemized-consumers">${consumerNames || 'None'}</span>
            </div>
            <strong class="tabular">${PaiseCalc.formatPaise(it.pricePaise)}</strong>
          `;
          itemizedList.appendChild(row);
        });
      }
    } else {
      if (itemizedBox) itemizedBox.classList.add('hidden');
    }

    document.getElementById('result-sum-shares').textContent = PaiseCalc.formatPaise(sumShares);
    document.getElementById('result-original-total').textContent = PaiseCalc.formatPaise(calcData.totalPaise);

    const exactBadge = document.getElementById('result-exactness-badge');
    if (sumShares === calcData.totalPaise) {
      exactBadge.textContent = '✓ Exactly balanced (0 paise difference)';
      exactBadge.className = 'exactness-badge text-success';
    } else {
      exactBadge.textContent = `⚠ Imbalance detected: ${sumShares - calcData.totalPaise} paise`;
      exactBadge.className = 'exactness-badge text-danger';
    }

    const saveBtn = document.getElementById('btn-save-expense');
    const viewHistoryBtn = document.getElementById('btn-view-in-history');
    const saveMsg = document.getElementById('save-status-message');

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = activeEditingExpenseId ? 'Update Expense' : 'Save Expense';
    }
    if (viewHistoryBtn) viewHistoryBtn.classList.add('hidden');
    if (saveMsg) saveMsg.classList.add('hidden');
  },

  // ==========================================================================
  // SETTLE UP RENDERING
  // ==========================================================================
  renderSettleUp() {
    const emptyState = document.getElementById('settle-empty-state');
    const balancedState = document.getElementById('settle-balanced-state');
    const content = document.getElementById('settle-content-container');
    const transfersList = document.getElementById('settlement-transfers-list');
    const countBadge = document.getElementById('settlement-count-badge');
    const tableBody = document.getElementById('balances-table-body');
    const invariantBadge = document.getElementById('balance-invariant-badge');

    if (currentExpenses.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (balancedState) balancedState.classList.add('hidden');
      if (content) content.classList.add('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    const netBalData = SettlementEngine.calculateNetBalances(currentExpenses);

    if (invariantBadge) {
      if (netBalData.isZeroSum) {
        invariantBadge.className = 'badge-success';
        invariantBadge.textContent = 'Balanced (₹0.00 net)';
      } else {
        invariantBadge.className = 'badge text-danger';
        invariantBadge.textContent = `Discrepancy: ${netBalData.residualPaise} paise`;
      }
    }

    if (tableBody) {
      tableBody.innerHTML = '';
      netBalData.balances.forEach(b => {
        const tr = document.createElement('tr');
        const netFormatted = PaiseCalc.formatPaise(b.netPaise, true);
        const netClass = b.netPaise > 0 ? 'text-success font-bold' : (b.netPaise < 0 ? 'text-danger font-bold' : 'text-muted');

        tr.innerHTML = `
          <td><strong>${escapeHTML(b.name)}</strong></td>
          <td class="text-right tabular">${PaiseCalc.formatPaise(b.paidPaise)}</td>
          <td class="text-right tabular">${PaiseCalc.formatPaise(b.sharePaise)}</td>
          <td class="text-right tabular ${netClass}">${netFormatted}</td>
        `;
        tableBody.appendChild(tr);
      });
    }

    const transfers = SettlementEngine.simplifyDebts(netBalData.balances);

    if (transfers.length === 0) {
      if (balancedState) balancedState.classList.remove('hidden');
      if (transfersList) transfersList.innerHTML = '';
      if (countBadge) countBadge.textContent = '0 Transfers';
    } else {
      if (balancedState) balancedState.classList.add('hidden');
      if (countBadge) countBadge.textContent = `${transfers.length} ${transfers.length === 1 ? 'Transfer' : 'Transfers'}`;

      if (transfersList) {
        transfersList.innerHTML = '';
        transfers.forEach(t => {
          const item = document.createElement('div');
          item.className = 'transfer-card';
          item.innerHTML = `
            <div class="transfer-parties">
              <span class="transfer-debtor">${escapeHTML(t.debtor)}</span>
              <span class="transfer-arrow" aria-hidden="true">&rarr;</span>
              <span class="transfer-creditor">${escapeHTML(t.creditor)}</span>
            </div>
            <div class="transfer-amount-badge tabular">
              ${PaiseCalc.formatPaise(t.amountPaise)}
            </div>
          `;
          transfersList.appendChild(item);
        });
      }
    }
  },

  // ==========================================================================
  // HISTORY RENDERING & MODAL DETAILS
  // ==========================================================================
  renderHistory() {
    const container = document.getElementById('history-list-container');
    const emptyState = document.getElementById('history-empty-state');
    const payerFilter = document.getElementById('history-filter-payer');
    const searchInput = document.getElementById('history-search');

    if (!container) return;

    if (currentExpenses.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      container.classList.add('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    if (payerFilter) {
      const selectedPayer = payerFilter.value;
      const payers = Array.from(new Set(currentExpenses.map(e => e.payerName)));
      payerFilter.innerHTML = '<option value="">All Payers</option>';
      payers.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        if (p === selectedPayer) opt.selected = true;
        payerFilter.appendChild(opt);
      });
    }

    const searchTerm = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const filterPayerVal = payerFilter ? payerFilter.value : '';

    let filtered = [...currentExpenses].reverse();

    if (searchTerm) {
      filtered = filtered.filter(exp => exp.occasion.toLowerCase().includes(searchTerm));
    }
    if (filterPayerVal) {
      filtered = filtered.filter(exp => exp.payerName === filterPayerVal);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-card" style="padding: 2rem;">
          <p class="text-muted">No expenses match your search or filter.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    filtered.forEach(exp => {
      const card = document.createElement('div');
      card.className = 'history-card';
      const methodLabel = this.getMethodLabel(exp.splittingMethod);

      const chipsHtml = exp.participants.map(p => `
        <span class="share-chip">${escapeHTML(p.name)}: <strong>${PaiseCalc.formatPaise(p.sharePaise)}</strong></span>
      `).join('');

      card.innerHTML = `
        <div class="history-main-info">
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <h3 class="history-occasion">${escapeHTML(exp.occasion)}</h3>
            <span class="badge">${methodLabel}</span>
          </div>
          <div class="history-meta-row">
            <span>📅 ${exp.date || 'No date'}</span>
            <span>👤 Paid by <strong>${escapeHTML(exp.payerName)}</strong></span>
            <span>👥 ${exp.participants.length} people</span>
          </div>
          <div class="history-shares-chips mt-sm">
            ${chipsHtml}
          </div>
        </div>

        <div class="history-amount-col">
          <span class="history-amount tabular">${PaiseCalc.formatPaise(exp.totalPaise)}</span>
        </div>

        <div class="history-actions-col">
          <button type="button" class="btn-secondary btn-sm btn-view-expense" data-id="${exp.id}">View Details</button>
          <button type="button" class="btn-secondary btn-sm btn-edit-expense" data-id="${exp.id}">Edit</button>
          <button type="button" class="btn-secondary btn-sm btn-delete-expense" data-id="${exp.id}" title="Delete expense">Delete</button>
        </div>
      `;

      card.querySelector('.btn-view-expense').addEventListener('click', () => {
        this.openExpenseDetailsModal(exp.id);
      });

      card.querySelector('.btn-edit-expense').addEventListener('click', () => {
        this.loadExpenseForEditing(exp.id);
      });

      card.querySelector('.btn-delete-expense').addEventListener('click', () => {
        this.confirmDeleteExpense(exp.id, exp.occasion);
      });

      container.appendChild(card);
    });
  },

  openExpenseDetailsModal(expenseId) {
    const exp = currentExpenses.find(e => e.id === expenseId);
    if (!exp) return;

    const modal = document.getElementById('modal-details');
    const content = document.getElementById('modal-details-content');
    const editBtn = document.getElementById('modal-details-edit');
    const doneBtn = document.getElementById('modal-details-done');
    const closeBtn = document.getElementById('modal-details-close');

    if (!modal || !content) return;

    const methodLabel = this.getMethodLabel(exp.splittingMethod);

    let itemizedSection = '';
    if (exp.splittingMethod === 'items' && exp.items && exp.items.length > 0) {
      const itemsRows = exp.items.map(it => {
        const consumers = exp.participants
          .filter(p => it.participantIds.includes(p.id))
          .map(p => escapeHTML(p.name))
          .join(', ');
        return `
          <div class="itemized-row">
            <div class="itemized-desc">
              <span class="itemized-name">${escapeHTML(it.name)}</span>
              <span class="itemized-consumers">${consumers}</span>
            </div>
            <strong class="tabular">${PaiseCalc.formatPaise(it.pricePaise)}</strong>
          </div>
        `;
      }).join('');

      itemizedSection = `
        <div class="mt-md">
          <h4 class="itemized-subheading">Items Breakdown</h4>
          <div class="itemized-list">${itemsRows}</div>
        </div>
      `;
    }

    const participantsRows = exp.participants.map(p => `
      <div class="share-row">
        <span>${escapeHTML(p.name)} ${p.id === exp.payerId ? '<span class="badge-payer">Paid the bill</span>' : ''}</span>
        <strong class="tabular">${PaiseCalc.formatPaise(p.sharePaise)}</strong>
      </div>
    `).join('');

    content.innerHTML = `
      <div style="margin-bottom:1rem;">
        <span class="badge">${methodLabel}</span>
        <h2 style="font-size:1.4rem;font-weight:700;margin:0.25rem 0;">${escapeHTML(exp.occasion)}</h2>
        <p class="text-sm text-muted">Date: ${exp.date || 'N/A'} &bull; Paid by ${escapeHTML(exp.payerName)}</p>
        <p style="font-size:1.2rem;font-weight:700;margin-top:0.5rem;">Total: <span class="tabular">${PaiseCalc.formatPaise(exp.totalPaise)}</span></p>
      </div>

      <div>
        <h4 class="shares-subheading">Participant Allocations</h4>
        <div class="shares-list">${participantsRows}</div>
      </div>

      ${itemizedSection}
    `;

    modal.classList.remove('hidden');

    const closeModal = () => modal.classList.add('hidden');
    doneBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    editBtn.onclick = () => {
      closeModal();
      this.loadExpenseForEditing(exp.id);
    };
  },

  loadExpenseForEditing(expenseId) {
    const exp = currentExpenses.find(e => e.id === expenseId);
    if (!exp) return;

    activeEditingExpenseId = expenseId;
    this.switchSection('new-expense');

    document.getElementById('input-occasion').value = exp.occasion;
    document.getElementById('input-bill-amount').value = (exp.totalPaise / 100).toFixed(2);
    document.getElementById('input-expense-date').value = exp.date || '';

    // Load participants
    this.initParticipantRows(exp.participants);
    this.updatePayerDropdown(exp.payerId);

    // Load split method
    const method = exp.splittingMethod || 'equal';
    this.setSplitMethod(method);

    // Expand accordion if advanced method
    const accordionContent = document.getElementById('advanced-split-content');
    const accordionArrow = document.getElementById('accordion-arrow-icon');
    const accordionToggle = document.getElementById('btn-toggle-advanced-split');
    if (method !== 'equal') {
      if (accordionContent) accordionContent.classList.remove('hidden');
      if (accordionArrow) accordionArrow.classList.add('open');
      if (accordionToggle) accordionToggle.setAttribute('aria-expanded', 'true');
    }

    // Populate draft items if available
    if (method === 'items' && exp.items) {
      draftItems = exp.items.map(it => ({
        id: it.id,
        name: it.name,
        priceStr: (it.pricePaise / 100).toFixed(2),
        participantIds: [...it.participantIds]
      }));
      this.renderItemsList();
    }

    // Populate custom shares if available
    if (method === 'custom' && exp.customShares) {
      draftCustomShares = { ...exp.customShares };
      this.renderCustomShares();
    } else if (method === 'custom') {
      exp.participants.forEach(p => {
        draftCustomShares[p.id] = (p.sharePaise / 100).toFixed(2);
      });
      this.renderCustomShares();
    }

    const banner = document.getElementById('editing-mode-banner');
    const nameEl = document.getElementById('editing-expense-name');
    const heading = document.getElementById('expense-form-heading');

    if (banner && nameEl) {
      nameEl.textContent = exp.occasion;
      banner.classList.remove('hidden');
    }
    if (heading) heading.textContent = 'Edit Expense';

    this.renderResultCard(exp);
  },

  cancelEditing() {
    activeEditingExpenseId = null;
    const banner = document.getElementById('editing-mode-banner');
    const heading = document.getElementById('expense-form-heading');
    if (banner) banner.classList.add('hidden');
    if (heading) heading.textContent = 'Split a Bill';

    this.clearExpenseForm();
  },

  confirmDeleteExpense(expenseId, occasionName) {
    const modal = document.getElementById('modal-confirm');
    const titleEl = document.getElementById('modal-confirm-title');
    const msgEl = document.getElementById('modal-confirm-message');
    const cancelBtn = document.getElementById('modal-confirm-cancel');
    const proceedBtn = document.getElementById('modal-confirm-proceed');

    if (!modal) return;

    titleEl.textContent = 'Delete Expense';
    msgEl.textContent = `Are you sure you want to permanently delete "${occasionName}"? This will update all settlement balances.`;
    modal.classList.remove('hidden');

    const handleCancel = () => {
      modal.classList.add('hidden');
      cleanup();
    };

    const handleProceed = () => {
      modal.classList.add('hidden');
      cleanup();
      this.executeDeleteExpense(expenseId);
    };

    function cleanup() {
      cancelBtn.removeEventListener('click', handleCancel);
      proceedBtn.removeEventListener('click', handleProceed);
    }

    cancelBtn.addEventListener('click', handleCancel);
    proceedBtn.addEventListener('click', handleProceed);
  },

  executeDeleteExpense(expenseId) {
    currentExpenses = currentExpenses.filter(e => e.id !== expenseId);

    UserManager.updateCurrentUserState();
    this.showNotification('Expense deleted successfully.', 'info');
    this.renderDashboard();
    this.renderHistory();
    this.renderSettleUp();

    if (activeEditingExpenseId === expenseId) {
      this.cancelEditing();
    }
  },

  clearExpenseForm() {
    document.getElementById('form-expense').reset();
    document.getElementById('input-expense-date').value = new Date().toISOString().split('T')[0];
    this.initParticipantRows();
    this.setSplitMethod('equal');

    // Collapse advanced split
    const accordionContent = document.getElementById('advanced-split-content');
    const accordionArrow = document.getElementById('accordion-arrow-icon');
    const accordionToggle = document.getElementById('btn-toggle-advanced-split');
    if (accordionContent) accordionContent.classList.add('hidden');
    if (accordionArrow) accordionArrow.classList.remove('open');
    if (accordionToggle) accordionToggle.setAttribute('aria-expanded', 'false');

    this.clearValidationErrors();

    if (!activeEditingExpenseId) {
      this.renderResultCard(null);
    }
  },

  clearValidationErrors() {
    const errorBox = document.getElementById('expense-form-error');
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('hidden');
    }
    document.querySelectorAll('.field-error-msg').forEach(el => {
      el.textContent = '';
      el.classList.add('hidden');
    });
  },

  showFieldError(fieldId, errorMsg) {
    const errEl = document.getElementById(`error-${fieldId}`);
    if (errEl) {
      errEl.textContent = errorMsg;
      errEl.classList.remove('hidden');
    }
  }
};

// ============================================================================
// 8. FORM SUBMISSION & VALIDATION PIPELINE
// ============================================================================

const FormHandler = {
  validateAndCalculate() {
    UI.clearValidationErrors();

    const occasionInput = document.getElementById('input-occasion');
    const billAmountInput = document.getElementById('input-bill-amount');
    const dateInput = document.getElementById('input-expense-date');
    const payerSelect = document.getElementById('select-payer');
    const errorSummary = document.getElementById('expense-form-error');

    const showError = (msg, fieldId = null) => {
      if (errorSummary) {
        errorSummary.textContent = msg;
        errorSummary.classList.remove('hidden');
      }
      if (fieldId) {
        UI.showFieldError(fieldId, msg);
      }
      const sr = document.getElementById('sr-announcements');
      if (sr) sr.textContent = `Validation error: ${msg}`;
    };

    // 1. Occasion name
    const occasion = (occasionInput ? occasionInput.value : '').trim();
    if (!occasion) {
      showError('Please enter an occasion name.', 'occasion');
      return null;
    }

    // 2-5. Bill amount validation
    const billAmountRaw = billAmountInput ? billAmountInput.value : '';
    const paiseResult = PaiseCalc.parseInputToPaise(billAmountRaw, false);
    if (!paiseResult.ok) {
      showError(paiseResult.error, 'bill-amount');
      return null;
    }
    const totalPaise = paiseResult.paise;

    // 6. Participant count - Require at least two participants
    if (!activeParticipantRows || activeParticipantRows.length < 2) {
      showError('Please enter at least two participants.', 'participants');
      return null;
    }

    // 7. Participant names
    for (let i = 0; i < activeParticipantRows.length; i++) {
      const pName = activeParticipantRows[i].name.trim();
      if (!pName) {
        showError('Participant names cannot be blank.', 'participants');
        return null;
      }
    }

    // 8. Duplicate participant names check
    const seenNames = new Set();
    for (let i = 0; i < activeParticipantRows.length; i++) {
      const normalized = activeParticipantRows[i].name.trim().toLowerCase();
      if (seenNames.has(normalized)) {
        showError('Duplicate participant names are not allowed.', 'participants');
        return null;
      }
      seenNames.add(normalized);
    }

    // 9. Payer selection
    const payerId = payerSelect ? payerSelect.value : '';
    if (!payerId) {
      showError('Please select a payer from the participant list.', 'payer');
      return null;
    }

    const payer = activeParticipantRows.find(p => p.id === payerId);
    if (!payer) {
      showError('Please select a payer from the participant list.', 'payer');
      return null;
    }

    const cleanedParticipants = activeParticipantRows.map(p => ({
      id: p.id,
      name: p.name.trim()
    }));

    // Perform calculation based on activeSplitMethod
    let splitResult;
    try {
      if (activeSplitMethod === 'items') {
        splitResult = PaiseCalc.splitByItems(totalPaise, cleanedParticipants, draftItems);
      } else if (activeSplitMethod === 'custom') {
        splitResult = PaiseCalc.splitByCustomShares(totalPaise, cleanedParticipants, draftCustomShares);
      } else {
        // Mode A: Equal
        splitResult = PaiseCalc.splitEqually(totalPaise, cleanedParticipants);
      }
    } catch (err) {
      showError(err.message, activeSplitMethod === 'items' ? 'items' : (activeSplitMethod === 'custom' ? 'custom-shares' : null));
      return null;
    }

    const expenseDate = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().split('T')[0];

    const calculationResult = {
      occasion,
      totalPaise,
      date: expenseDate,
      payerId: payer.id,
      payerName: payer.name.trim(),
      participants: splitResult.shares,
      splittingMethod: activeSplitMethod,
      items: splitResult.items || null,
      customShares: splitResult.customShares || null,
      remainderPaise: splitResult.remainderPaise || 0
    };

    return calculationResult;
  },

  handleSaveExpense() {
    if (!lastCalculatedResult) {
      UI.showNotification('No valid calculation to save. Please split a bill first.', 'error');
      return;
    }

    const saveBtn = document.getElementById('btn-save-expense');
    const viewHistoryBtn = document.getElementById('btn-view-in-history');
    const saveMsg = document.getElementById('save-status-message');

    if (saveBtn) saveBtn.disabled = true;

    try {
      const now = new Date().toISOString();

      if (activeEditingExpenseId) {
        const idx = currentExpenses.findIndex(e => e.id === activeEditingExpenseId);
        if (idx !== -1) {
          currentExpenses[idx] = {
            ...currentExpenses[idx],
            occasion: lastCalculatedResult.occasion,
            totalPaise: lastCalculatedResult.totalPaise,
            date: lastCalculatedResult.date,
            payerId: lastCalculatedResult.payerId,
            payerName: lastCalculatedResult.payerName,
            participants: lastCalculatedResult.participants,
            splittingMethod: lastCalculatedResult.splittingMethod,
            items: lastCalculatedResult.items || null,
            customShares: lastCalculatedResult.customShares || null,
            updatedAt: now
          };
        }
        UI.showNotification(`Expense "${lastCalculatedResult.occasion}" updated successfully.`, 'success');
        activeEditingExpenseId = null;
        document.getElementById('editing-mode-banner').classList.add('hidden');
        document.getElementById('expense-form-heading').textContent = 'Split a Bill';
      } else {
        const newExpense = {
          id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          ownerId: currentUser.id,
          occasion: lastCalculatedResult.occasion,
          totalPaise: lastCalculatedResult.totalPaise,
          currency: 'INR',
          date: lastCalculatedResult.date,
          createdAt: now,
          updatedAt: now,
          payerId: lastCalculatedResult.payerId,
          payerName: lastCalculatedResult.payerName,
          participants: lastCalculatedResult.participants,
          splittingMethod: lastCalculatedResult.splittingMethod,
          items: lastCalculatedResult.items || null,
          customShares: lastCalculatedResult.customShares || null,
          participantCount: lastCalculatedResult.participants.length
        };
        currentExpenses.push(newExpense);
        UI.showNotification(`Expense "${lastCalculatedResult.occasion}" saved successfully!`, 'success');
      }

      UserManager.updateCurrentUserState();

      UI.renderDashboard();
      UI.renderSettleUp();
      UI.renderHistory();

      if (saveMsg) {
        saveMsg.textContent = '✓ Expense saved to your records.';
        saveMsg.className = 'save-feedback success';
        saveMsg.classList.remove('hidden');
      }
      if (viewHistoryBtn) {
        viewHistoryBtn.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Save expense failed:', err);
      UI.showNotification(`Failed to save expense: ${err.message}`, 'error');
      if (saveBtn) saveBtn.disabled = false;
    }
  }
};

// ============================================================================
// 9. BACKUP & RESTORATION (JSON EXPORT & IMPORT)
// ============================================================================

const BackupRestore = {
  exportData() {
    if (!currentUser) return;

    const exportPayload = {
      format: 'splitwiz_backup',
      version: STORAGE_KEYS.SCHEMA_VERSION,
      exportTimestamp: new Date().toISOString(),
      user: {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.username
      },
      expenses: currentExpenses,
      lastCalculation: lastCalculatedResult
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `splitwiz_backup_${currentUser.username}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    UI.showNotification('Backup exported successfully.', 'success');
  },

  importFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        if (!parsed || parsed.format !== 'splitwiz_backup') {
          throw new Error('Invalid file format. Must be a Split Wiz JSON backup.');
        }

        if (!Array.isArray(parsed.expenses)) {
          throw new Error('Malformed backup: expenses list is missing or invalid.');
        }

        for (const exp of parsed.expenses) {
          if (!exp.id || !exp.occasion || typeof exp.totalPaise !== 'number' || exp.totalPaise <= 0) {
            throw new Error('Malformed expense detected in backup file.');
          }
          if (!Array.isArray(exp.participants) || exp.participants.length === 0) {
            throw new Error('Expense missing valid participants in backup.');
          }
          const sumPaise = exp.participants.reduce((acc, p) => acc + (p.sharePaise || 0), 0);
          if (sumPaise !== exp.totalPaise) {
            throw new Error(`Expense "${exp.occasion}" has invalid shares sum.`);
          }
        }

        const modal = document.getElementById('modal-confirm');
        const titleEl = document.getElementById('modal-confirm-title');
        const msgEl = document.getElementById('modal-confirm-message');
        const cancelBtn = document.getElementById('modal-confirm-cancel');
        const proceedBtn = document.getElementById('modal-confirm-proceed');

        titleEl.textContent = 'Import Backup';
        msgEl.textContent = `This backup contains ${parsed.expenses.length} expenses. Do you want to restore these expenses into your account?`;
        modal.classList.remove('hidden');

        const onCancel = () => {
          modal.classList.add('hidden');
          cancelBtn.removeEventListener('click', onCancel);
          proceedBtn.removeEventListener('click', onProceed);
        };

        const onProceed = () => {
          modal.classList.add('hidden');
          cancelBtn.removeEventListener('click', onCancel);
          proceedBtn.removeEventListener('click', onProceed);

          currentExpenses = parsed.expenses;
          if (parsed.lastCalculation) {
            lastCalculatedResult = parsed.lastCalculation;
          }
          UserManager.updateCurrentUserState();

          UI.renderDashboard();
          UI.renderHistory();
          UI.renderSettleUp();
          if (lastCalculatedResult) {
            UI.renderResultCard(lastCalculatedResult);
          }

          UI.showNotification(`Successfully restored ${currentExpenses.length} expenses.`, 'success');
        };

        cancelBtn.addEventListener('click', onCancel);
        proceedBtn.addEventListener('click', onProceed);

      } catch (err) {
        console.error('Import failed:', err);
        UI.showNotification(`Import failed: ${err.message}`, 'error');
      }
    };

    reader.readAsText(file);
  }
};

// ============================================================================
// 10. AUTOMATED HACKATHON VERIFICATION SUITE
// ============================================================================

const TestVerificationSuite = {
  runTests() {
    const results = [];

    function test(name, fn) {
      try {
        const res = fn();
        results.push({ name, passed: true, details: res || 'Passed' });
      } catch (e) {
        results.push({ name, passed: false, details: e.message });
      }
    }

    function assertEquals(actual, expected, msg) {
      if (actual !== expected) {
        throw new Error(`${msg}: expected ${expected}, got ${actual}`);
      }
    }

    // TEST 1 — BASIC SPLIT
    test('TEST 1: Basic Split (₹100, Alice & Bob)', () => {
      const p = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];
      const res = PaiseCalc.splitEqually(10000, p);
      assertEquals(res.shares[0].sharePaise, 5000, "Alice's share");
      assertEquals(res.shares[1].sharePaise, 5000, "Bob's share");
      assertEquals(res.shares[0].sharePaise + res.shares[1].sharePaise, 10000, 'Exact sum');
      return 'Alice: ₹50.00, Bob: ₹50.00 (Exact ₹100.00)';
    });

    // TEST 2 — REMAINDER DISTRIBUTION
    test('TEST 2: Remainder Distribution (₹100, 3 people)', () => {
      const p = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }, { id: '3', name: 'Charlie' }];
      const res = PaiseCalc.splitEqually(10000, p);
      assertEquals(res.shares[0].sharePaise, 3334, 'Alice +1 paisa');
      assertEquals(res.shares[1].sharePaise, 3333, 'Bob');
      assertEquals(res.shares[2].sharePaise, 3333, 'Charlie');
      const sum = res.shares.reduce((a, s) => a + s.sharePaise, 0);
      assertEquals(sum, 10000, 'Sum of shares equals 10000 paise');
      return 'Alice: ₹33.34, Bob: ₹33.33, Charlie: ₹33.33 (Sum: ₹100.00)';
    });

    // TEST 3 — SMALL AMOUNT
    test('TEST 3: Small Amount (₹0.02, 3 people)', () => {
      const p = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }, { id: '3', name: 'Charlie' }];
      const res = PaiseCalc.splitEqually(2, p);
      assertEquals(res.shares[0].sharePaise, 1, 'Alice');
      assertEquals(res.shares[1].sharePaise, 1, 'Bob');
      assertEquals(res.shares[2].sharePaise, 0, 'Charlie');
      const sum = res.shares.reduce((a, s) => a + s.sharePaise, 0);
      assertEquals(sum, 2, 'Sum equals 2 paise');
      return 'Shares: 1p, 1p, 0p. No paise lost or gained.';
    });

    // TEST 6 — ZERO BILL REJECTION
    test('TEST 6: Zero Bill Rejection', () => {
      const res = PaiseCalc.parseInputToPaise('0.00', false);
      if (res.ok) throw new Error('Expected zero bill to fail validation');
      assertEquals(res.error, 'Bill amount cannot be zero.', 'Error message');
      return 'Correctly rejected with "Bill amount cannot be zero."';
    });

    // TEST 7 — NEGATIVE BILL REJECTION
    test('TEST 7: Negative Bill Rejection', () => {
      const res = PaiseCalc.parseInputToPaise('-100.00', false);
      if (res.ok) throw new Error('Expected negative bill to fail validation');
      assertEquals(res.error, 'Bill amount cannot be negative.', 'Error message');
      return 'Correctly rejected with "Bill amount cannot be negative."';
    });

    // TEST 8 — INVALID PRECISION (>2 decimal places)
    test('TEST 8: Decimal Precision Enforcement', () => {
      const res = PaiseCalc.parseInputToPaise('100.555', false);
      if (res.ok) throw new Error('Expected 3 decimals to fail');
      assertEquals(res.error, 'Bill amount cannot have more than 2 decimal places.', 'Precision error message');
      return 'Amounts with >2 decimal places strictly rejected';
    });

    // TEST 10 — DUPLICATE PARTICIPANTS
    test('TEST 10: Duplicate Participants Detection', () => {
      const list = [{ name: 'Alice' }, { name: ' alice ' }];
      const seen = new Set();
      let hasDup = false;
      for (const item of list) {
        const norm = item.name.trim().toLowerCase();
        if (seen.has(norm)) {
          hasDup = true;
          break;
        }
        seen.add(norm);
      }
      assertEquals(hasDup, true, 'Duplicate detected');
      return 'Case-insensitive trimmed duplicate correctly flagged';
    });

    // ADVANCED TEST: ITEM-BASED SPLIT (Prompt Example)
    test('ADVANCED TEST: Item-Based Split (₹900, 4 items)', () => {
      const participants = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Charlie' }
      ];
      const items = [
        { id: 'i1', name: 'Main course', priceStr: '300.00', participantIds: ['1'] },
        { id: 'i2', name: 'Pizza', priceStr: '400.00', participantIds: ['2'] },
        { id: 'i3', name: 'Sweet', priceStr: '20.00', participantIds: ['3'] },
        { id: 'i4', name: 'Shared drinks', priceStr: '180.00', participantIds: ['1', '2', '3'] }
      ];
      const res = PaiseCalc.splitByItems(90000, participants, items);
      const aliceShare = res.shares.find(s => s.name === 'Alice').sharePaise;
      const bobShare = res.shares.find(s => s.name === 'Bob').sharePaise;
      const charlieShare = res.shares.find(s => s.name === 'Charlie').sharePaise;

      assertEquals(aliceShare, 36000, 'Alice: ₹360.00');
      assertEquals(bobShare, 46000, 'Bob: ₹460.00');
      assertEquals(charlieShare, 8000, 'Charlie: ₹80.00');
      assertEquals(aliceShare + bobShare + charlieShare, 90000, 'Sum is ₹900.00');
      return 'Alice: ₹360.00, Bob: ₹460.00, Charlie: ₹80.00 (Sum: ₹900.00 exact)';
    });

    // ADVANCED TEST: CUSTOM SHARES SPLIT
    test('ADVANCED TEST: Custom Shares Split (₹100, 60/40)', () => {
      const participants = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ];
      const customMap = { '1': '60.00', '2': '40.00' };
      const res = PaiseCalc.splitByCustomShares(10000, participants, customMap);
      assertEquals(res.shares[0].sharePaise, 6000, 'Alice');
      assertEquals(res.shares[1].sharePaise, 4000, 'Bob');
      assertEquals(res.shares[0].sharePaise + res.shares[1].sharePaise, 10000, 'Sum');
      return 'Alice: ₹60.00, Bob: ₹40.00 (Exact match)';
    });

    // ADVANCED TEST: ITEM TOTAL MISMATCH REJECTION
    test('ADVANCED TEST: Item Total Mismatch Rejection', () => {
      const participants = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];
      const items = [{ id: 'i1', name: 'Pizza', priceStr: '850.00', participantIds: ['1', '2'] }];
      let threw = false;
      try {
        PaiseCalc.splitByItems(90000, participants, items);
      } catch (e) {
        threw = true;
      }
      assertEquals(threw, true, 'Item mismatch throws');
      return 'Correctly rejects item total differing from bill';
    });

    // TEST 17 — GREEDY DEBT SETTLEMENT
    test('TEST 17: Settlement (Alice pays ₹900 for Alice, Bob, Charlie)', () => {
      const mockExpense = {
        id: 'test_exp',
        totalPaise: 90000,
        payerId: '1',
        payerName: 'Alice',
        participants: [
          { id: '1', name: 'Alice', sharePaise: 30000 },
          { id: '2', name: 'Bob', sharePaise: 30000 },
          { id: '3', name: 'Charlie', sharePaise: 30000 }
        ]
      };
      const net = SettlementEngine.calculateNetBalances([mockExpense]);
      assertEquals(net.isZeroSum, true, 'Zero sum invariant');

      const aliceBal = net.balances.find(b => b.name === 'Alice').netPaise;
      const bobBal = net.balances.find(b => b.name === 'Bob').netPaise;
      const charlieBal = net.balances.find(b => b.name === 'Charlie').netPaise;

      assertEquals(aliceBal, 60000, 'Alice net (+60000p)');
      assertEquals(bobBal, -30000, 'Bob net (-30000p)');
      assertEquals(charlieBal, -30000, 'Charlie net (-30000p)');

      const transfers = SettlementEngine.simplifyDebts(net.balances);
      assertEquals(transfers.length, 2, 'Two settlement transfers');
      assertEquals(transfers[0].amountPaise, 30000, 'Transfer 1 amount');
      assertEquals(transfers[1].amountPaise, 30000, 'Transfer 2 amount');
      return 'Bob pays Alice ₹300.00 & Charlie pays Alice ₹300.00';
    });

    // TEST 23 — BALANCE INVARIANT
    test('TEST 23: Balance Invariant Zero-Sum Check', () => {
      const expenses = [
        {
          totalPaise: 15000,
          payerName: 'Alice',
          payerId: '1',
          participants: [
            { id: '1', name: 'Alice', sharePaise: 5000 },
            { id: '2', name: 'Bob', sharePaise: 5000 },
            { id: '3', name: 'Charlie', sharePaise: 5000 }
          ]
        },
        {
          totalPaise: 6000,
          payerName: 'Bob',
          payerId: '2',
          participants: [
            { id: '1', name: 'Alice', sharePaise: 3000 },
            { id: '2', name: 'Bob', sharePaise: 3000 }
          ]
        }
      ];
      const res = SettlementEngine.calculateNetBalances(expenses);
      assertEquals(res.isZeroSum, true, 'Net balances sum is zero');
      assertEquals(res.residualPaise, 0, 'Zero residual paise');
      return 'Exact 0-paise residual across multiple expenses';
    });

    return results;
  },

  displayResults() {
    const modal = document.getElementById('modal-verification');
    const container = document.getElementById('verification-results-container');
    if (!modal || !container) return;

    container.innerHTML = '<div class="text-muted">Running test cases...</div>';
    modal.classList.remove('hidden');

    const results = this.runTests();
    container.innerHTML = '';

    results.forEach(r => {
      const item = document.createElement('div');
      item.className = `test-item ${r.passed ? 'pass' : 'fail'}`;
      item.innerHTML = `
        <div>
          <strong>${r.name}</strong>
          <div class="text-sm text-muted">${r.details}</div>
        </div>
        <span class="test-status-badge ${r.passed ? 'pass' : 'fail'}">
          ${r.passed ? 'PASS' : 'FAIL'}
        </span>
      `;
      container.appendChild(item);
    });
  }
};

// ============================================================================
// 11. HTML ESCAPING UTILITY
// ============================================================================

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================================
// 12. APPLICATION INITIALIZATION & EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  StorageManager.init();

  const dateInput = document.getElementById('input-expense-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Check existing session
  const session = UserManager.getSession();
  if (session && session.userId) {
    const users = UserManager.getUsers();
    const user = users.find(u => u.id === session.userId);
    if (user) {
      currentUser = user;
      currentExpenses = user.expenses || [];
      lastCalculatedResult = user.lastCalculation || null;

      UI.setAuthVisible(false);
      UI.initParticipantRows();

      if (lastCalculatedResult) {
        UI.renderResultCard(lastCalculatedResult);
      }
    } else {
      UserManager.clearSession();
      UI.setAuthVisible(true);
    }
  } else {
    UI.setAuthVisible(true);
  }

  // --------------------------------------------------------------------------
  // Navigation Links
  // --------------------------------------------------------------------------
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.dataset.nav;
      if (target) UI.switchSection(target);
    });
  });

  const mobileToggle = document.getElementById('btn-mobile-menu-toggle');
  const mobileDropdown = document.getElementById('mobile-nav-dropdown');
  if (mobileToggle && mobileDropdown) {
    mobileToggle.addEventListener('click', () => {
      const isHidden = mobileDropdown.classList.contains('hidden');
      mobileDropdown.classList.toggle('hidden');
      mobileToggle.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });
  }

  const handleLogout = () => {
    UserManager.clearSession();
    currentUser = null;
    currentExpenses = [];
    lastCalculatedResult = null;
    activeEditingExpenseId = null;
    UI.setAuthVisible(true);
    UI.showNotification('You have been logged out.', 'info');
  };

  const btnLogout = document.getElementById('btn-logout');
  const btnMobileLogout = document.getElementById('btn-mobile-logout');
  if (btnLogout) btnLogout.addEventListener('click', handleLogout);
  if (btnMobileLogout) btnMobileLogout.addEventListener('click', handleLogout);

  // --------------------------------------------------------------------------
  // Authentication Forms (Login & Register)
  // --------------------------------------------------------------------------
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const panelLogin = document.getElementById('auth-login-panel');
  const panelRegister = document.getElementById('auth-register-panel');

  if (tabLogin && tabRegister && panelLogin && panelRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabLogin.setAttribute('aria-selected', 'true');
      tabRegister.classList.remove('active');
      tabRegister.setAttribute('aria-selected', 'false');
      panelLogin.classList.remove('hidden');
      panelRegister.classList.add('hidden');
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabRegister.setAttribute('aria-selected', 'true');
      tabLogin.classList.remove('active');
      tabLogin.setAttribute('aria-selected', 'false');
      panelRegister.classList.remove('hidden');
      panelLogin.classList.add('hidden');
    });
  }

  const formLogin = document.getElementById('form-login');
  const loginErrorBox = document.getElementById('login-error-box');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (loginErrorBox) loginErrorBox.classList.add('hidden');

      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;

      if (!username.trim() || !password) {
        if (loginErrorBox) {
          loginErrorBox.textContent = 'Please enter both username and password.';
          loginErrorBox.classList.remove('hidden');
        }
        return;
      }

      try {
        const user = await UserManager.login(username, password);
        currentUser = user;
        currentExpenses = user.expenses || [];
        lastCalculatedResult = user.lastCalculation || null;

        UI.setAuthVisible(false);
        UI.initParticipantRows();
        if (lastCalculatedResult) {
          UI.renderResultCard(lastCalculatedResult);
        }
        UI.showNotification(`Welcome back, ${user.name}!`, 'success');
      } catch (err) {
        if (loginErrorBox) {
          loginErrorBox.textContent = err.message;
          loginErrorBox.classList.remove('hidden');
        }
      }
    });
  }

  const formRegister = document.getElementById('form-register');
  const registerErrorBox = document.getElementById('register-error-box');
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (registerErrorBox) registerErrorBox.classList.add('hidden');

      const fullname = document.getElementById('register-fullname').value;
      const username = document.getElementById('register-username').value;
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;

      if (!fullname.trim() || !username.trim() || !password) {
        if (registerErrorBox) {
          registerErrorBox.textContent = 'All fields are required.';
          registerErrorBox.classList.remove('hidden');
        }
        return;
      }

      if (username.trim().length < 3) {
        if (registerErrorBox) {
          registerErrorBox.textContent = 'Username must be at least 3 characters.';
          registerErrorBox.classList.remove('hidden');
        }
        return;
      }

      if (password.length < 6) {
        if (registerErrorBox) {
          registerErrorBox.textContent = 'Password must be at least 6 characters.';
          registerErrorBox.classList.remove('hidden');
        }
        return;
      }

      if (password !== confirmPassword) {
        if (registerErrorBox) {
          registerErrorBox.textContent = 'Passwords do not match.';
          registerErrorBox.classList.remove('hidden');
        }
        return;
      }

      try {
        const user = await UserManager.register(fullname, username, password);
        UserManager.createSession(user.id);
        currentUser = user;
        currentExpenses = [];
        lastCalculatedResult = null;

        UI.setAuthVisible(false);
        UI.initParticipantRows();
        UI.showNotification(`Account created! Welcome, ${user.name}.`, 'success');
      } catch (err) {
        if (registerErrorBox) {
          registerErrorBox.textContent = err.message;
          registerErrorBox.classList.remove('hidden');
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // New Expense Form, Accordion & Method Switching
  // --------------------------------------------------------------------------

  // Bill amount input listener to update diff trackers live
  const billAmountInput = document.getElementById('input-bill-amount');
  if (billAmountInput) {
    billAmountInput.addEventListener('input', () => {
      UI.updateItemsRunningTotal();
      UI.updateCustomSharesTotal();
    });
  }

  // Accordion toggle
  const accordionToggle = document.getElementById('btn-toggle-advanced-split');
  const accordionContent = document.getElementById('advanced-split-content');
  const accordionArrow = document.getElementById('accordion-arrow-icon');
  if (accordionToggle && accordionContent) {
    accordionToggle.addEventListener('click', () => {
      const isHidden = accordionContent.classList.contains('hidden');
      accordionContent.classList.toggle('hidden');
      if (accordionArrow) accordionArrow.classList.toggle('open', isHidden);
      accordionToggle.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });
  }

  // Method tab buttons
  document.querySelectorAll('.method-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const method = e.currentTarget.dataset.method;
      if (method) UI.setSplitMethod(method);
    });
  });

  // Add Item Button
  const btnAddItem = document.getElementById('btn-add-item');
  if (btnAddItem) {
    btnAddItem.addEventListener('click', () => {
      UI.addItemRow();
    });
  }

  // Autofill Custom Shares Button
  const btnAutofillCustom = document.getElementById('btn-autofill-custom');
  if (btnAutofillCustom) {
    btnAutofillCustom.addEventListener('click', () => {
      UI.autofillCustomShares();
    });
  }

  // Split Bill Submission
  const formExpense = document.getElementById('form-expense');
  if (formExpense) {
    formExpense.addEventListener('submit', (e) => {
      e.preventDefault();
      const calc = FormHandler.validateAndCalculate();
      if (calc) {
        lastCalculatedResult = calc;
        UserManager.updateCurrentUserState();
        UI.renderResultCard(calc);
        UI.showNotification('Bill split calculated successfully!', 'info');
      }
    });
  }

  const btnClearForm = document.getElementById('btn-clear-form');
  if (btnClearForm) {
    btnClearForm.addEventListener('click', () => {
      UI.clearExpenseForm();
      UI.showNotification('Form cleared.', 'info');
    });
  }

  const btnAddPart = document.getElementById('btn-add-participant');
  if (btnAddPart) {
    btnAddPart.addEventListener('click', () => {
      UI.addParticipantRow();
    });
  }

  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', () => {
      UI.cancelEditing();
    });
  }

  const btnSaveExpense = document.getElementById('btn-save-expense');
  if (btnSaveExpense) {
    btnSaveExpense.addEventListener('click', () => {
      FormHandler.handleSaveExpense();
    });
  }

  const btnViewInHistory = document.getElementById('btn-view-in-history');
  if (btnViewInHistory) {
    btnViewInHistory.addEventListener('click', () => {
      UI.switchSection('history');
    });
  }

  // --------------------------------------------------------------------------
  // History Search & Filter Handlers
  // --------------------------------------------------------------------------
  const historySearch = document.getElementById('history-search');
  const historyPayerFilter = document.getElementById('history-filter-payer');
  const btnResetFilters = document.getElementById('btn-reset-filters');

  if (historySearch) {
    historySearch.addEventListener('input', () => UI.renderHistory());
  }
  if (historyPayerFilter) {
    historyPayerFilter.addEventListener('change', () => UI.renderHistory());
  }
  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      if (historySearch) historySearch.value = '';
      if (historyPayerFilter) historyPayerFilter.value = '';
      UI.renderHistory();
    });
  }

  // --------------------------------------------------------------------------
  // JSON Export & Import
  // --------------------------------------------------------------------------
  const btnExport = document.getElementById('btn-export-json');
  const inputImport = document.getElementById('input-import-file');

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      BackupRestore.exportData();
    });
  }

  if (inputImport) {
    inputImport.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        BackupRestore.importFile(file);
      }
      e.target.value = '';
    });
  }

  // --------------------------------------------------------------------------
  // Notifications & Banner Dismissal
  // --------------------------------------------------------------------------
  const notifDismiss = document.getElementById('notification-dismiss');
  if (notifDismiss) {
    notifDismiss.addEventListener('click', () => {
      document.getElementById('global-notification').classList.add('hidden');
    });
  }

  const storageDismiss = document.getElementById('storage-error-dismiss');
  if (storageDismiss) {
    storageDismiss.addEventListener('click', () => {
      document.getElementById('storage-error-banner').classList.add('hidden');
    });
  }

  // --------------------------------------------------------------------------
  // Test Verification Suite Modal Trigger
  // --------------------------------------------------------------------------
  const btnOpenVerify = document.getElementById('btn-open-verification');
  const modalVerify = document.getElementById('modal-verification');
  const btnCloseVerify = document.getElementById('modal-verification-close');
  const btnCloseVerify2 = document.getElementById('modal-verification-close-btn');
  const btnRunAgainVerify = document.getElementById('modal-verification-run-again');

  if (btnOpenVerify) {
    btnOpenVerify.addEventListener('click', () => {
      TestVerificationSuite.displayResults();
    });
  }

  const closeVerifyModal = () => {
    if (modalVerify) modalVerify.classList.add('hidden');
  };

  if (btnCloseVerify) btnCloseVerify.addEventListener('click', closeVerifyModal);
  if (btnCloseVerify2) btnCloseVerify2.addEventListener('click', closeVerifyModal);
  if (btnRunAgainVerify) {
    btnRunAgainVerify.addEventListener('click', () => {
      TestVerificationSuite.displayResults();
    });
  }
});
