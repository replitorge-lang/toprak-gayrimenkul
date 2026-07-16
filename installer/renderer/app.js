// Global Application State
const state = {
  currentView: 'dashboard',
  user: null,
  theme: 'dark',
  transactions: [],
  properties: [],
  staff: [],
  charts: {
    line: null,
    doughnut: null
  },
  // Pagination for transactions
  pagination: {
    currentPage: 1,
    pageSize: 10
  },
  // Active detail property
  activePropertyId: null,
  // Confirm modal callbacks
  confirmCallback: null,
  // New views data
  invoices: [],
  accounts: [],
    agreements: []
};

const COMPANY_LOGOS = {
  gayrimenkul: { icon: '🏠', color: '#2563eb', img: '../assets/logo.png', name: 'Toprak Gayrimenkul', sub: 'Gayrimenkul' },
  derch: { icon: '📱', color: '#7c3aed', img: '../assets/Derch media.png', name: 'Derch Media', sub: 'Dijital Medya' },
  yo: { icon: '📺', color: '#dc2626', img: '../assets/yonedia.png', name: 'Yo Media', sub: 'Medya' }
};

// Type classification helpers
const INCOME_TYPES = new Set(['Gelir', 'Personel', 'Paket', 'Platform', 'İşletme']);
const EXPENSE_TYPES = new Set(['Gider']);

function isIncome(type) { return INCOME_TYPES.has(type); }
function isExpense(type) { return EXPENSE_TYPES.has(type); }
function getBadgeClass(type) { return isIncome(type) ? 'badge-income' : isExpense(type) ? 'badge-expense' : 'badge-warning'; }
function getRowClass(type) { return isIncome(type) ? 'row-income' : 'row-gider'; }

// Turkish Formatter Helpers
function formatCurrency(val) {
  return '₺' + Number(val).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

// Map Turkish months
const turkishMonths = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

function formatMonthYear(yearMonthStr) {
  if (!yearMonthStr) return '';
  const [year, month] = yearMonthStr.split('-');
  return `${turkishMonths[parseInt(month, 10) - 1]} ${year}`;
}

// Toast System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '✓';
  if (type === 'error') icon = '🗑';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  
  // Trigger entry anim
  setTimeout(() => toast.classList.add('active'), 50);

  // Exit anim and cleanup
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Window control handlers
document.getElementById('min-btn').addEventListener('click', () => window.toprak.minimize());
const maxBtn = document.getElementById('max-btn');
if (maxBtn) {
  maxBtn.addEventListener('click', () => window.toprak.maximize());
}
document.getElementById('close-btn').addEventListener('click', () => window.toprak.close());

// Theme Toggling
const themeBtn = document.getElementById('theme-toggle');
const mainBody = document.getElementById('main-app');

const themeIcons = { dark: '☀️', light: '🌙', mavi: '🌤️', cappuccino: '☕', orman: '🌿', gece: '🌃', gunes: '🌅', okyanus: '🌊', lavanta: '🌸' };

async function initTheme() {
  const theme = await window.toprak.getTheme();
  state.theme = theme;
  applyTheme(theme);
}

function applyTheme(theme) {
  mainBody.className = `theme-${theme}`;
  themeBtn.textContent = themeIcons[theme] || '☀️';
  const sel = document.getElementById('theme-select');
  if (sel) sel.value = theme;
}

// Global setTheme for inline onclick from theme buttons
async function setTheme(theme) {
  state.theme = theme;
  applyTheme(theme);
  await window.toprak.setTheme(theme);
  if (state.currentView === 'dashboard') {
    renderLineChart();
    renderDoughnutChart();
  }
  showToast('Tema güncellendi.');
}

themeBtn.addEventListener('click', () => {
  switchView('settings');
});

// Populate dashboard company filter buttons
async function populateHeaderCompanyFilter() {
  const companies = await window.toprak.getCompanies();
  const bar = document.getElementById('dashboard-company-bar');
  if (!bar) return;
  const currentVal = await window.toprak.getViewCompanyFilter();
  bar.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.textContent = '🏢 Tümü';
  allBtn.style.cssText = 'padding:5px 12px;font-size:12px;border:none;border-radius:3px;background:' + (currentVal === 'all' ? 'var(--accent)' : 'var(--surface2)') + ';color:var(--text);cursor:pointer;text-align:left;';
  allBtn.onclick = () => applyViewCompanyFilter('all');
  bar.appendChild(allBtn);
  companies.forEach(c => {
    const btn = document.createElement('button');
    btn.textContent = c.name;
    btn.style.cssText = 'padding:5px 12px;font-size:12px;border:none;border-radius:3px;background:' + (currentVal == c.id ? 'var(--accent)' : 'var(--surface2)') + ';color:var(--text);cursor:pointer;text-align:left;';
    btn.onclick = () => applyViewCompanyFilter(c.id);
    bar.appendChild(btn);
  });
}

// Apply view company filter
async function applyViewCompanyFilter(value) {
  await window.toprak.setViewCompanyFilter(value);
  await populateHeaderCompanyFilter();
  await loadCategoriesCache();
  // Reload current view
  if (state.currentView === 'dashboard') loadDashboard();
  else if (state.currentView === 'transactions') loadTransactions();
  else if (state.currentView === 'properties') loadProperties();
  else if (state.currentView === 'staff') loadStaff();
  else if (state.currentView === 'reports') loadReports();
  else if (state.currentView === 'einvoice') loadInvoices();
  else if (state.currentView === 'edmportal') loadEdmPortal();
  else if (state.currentView === 'accounts') loadAccountsView();
  else if (state.currentView === 'agreements') loadAgreements();
  else if (state.currentView === 'subscriptions') loadAgreements();
  else if (state.currentView === 'iban') loadIban();
}

function populateReportFilters() {
  const yearSelect = document.getElementById('report-year');
  const monthSelect = document.getElementById('report-month');
  if (!yearSelect || !monthSelect) return;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');

  // Populate year options dynamically from currentYear - 4 to currentYear + 1
  yearSelect.innerHTML = '';
  for (let y = currentYear + 1; y >= currentYear - 4; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  // Set current month as default
  monthSelect.value = currentMonth;
}

// App initialization on DOM load
window.addEventListener('DOMContentLoaded', async () => {
  await initTheme();
  await loadQuickDeleteSetting();
  
  // Fetch user info
  const user = await window.toprak.getUser();
  if (user) {
    state.user = user;
    document.getElementById('user-display-name').textContent = user;
    document.getElementById('user-avatar').textContent = user.substring(0, 2).toUpperCase();
  } else {
    document.getElementById('user-display-name').textContent = 'Kullanıcı';
  }

  // Load companies and set active
  await loadCompanies();
  await populateHeaderCompanyFilter();
  populateReportFilters();

  // Load initial view
  switchView('dashboard');
  
  // Update notifications bell check
  updatePendingBell();
});

// Settings button
document.getElementById('btn-settings').addEventListener('click', () => {
  switchView('settings');
  loadSaveSlots();
});

async function loadSaveSlots() {
  const list = document.getElementById('save-slots-list');
  list.innerHTML = '<div style="text-align:center;color:var(--text3);padding:20px;">Yükleniyor...</div>';
  const saves = await window.toprak.listSaves();
  list.innerHTML = '';
  if (saves.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text3);padding:30px;">Henüz kayıt yok. Yedekleme klasörü seçip "Şimdi Yedekle"ye tıklayın.</div>';
    return;
  }
  list.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
  saves.forEach(s => {
    const isBackup = s.name.startsWith('toprak_yedek_');
    const rawDate = s.name.replace('toprak_yedek_', '').replace('kayit_', '');
    const yr = rawDate.substring(0,4), mo = rawDate.substring(4,6), dy = rawDate.substring(6,8);
    const hr = (rawDate.substring(9,11) || ''), mi = (rawDate.substring(11,13) || '');
    const label = (isBackup ? 'Yedek ' : 'Kayıt ') + `${dy}.${mo} ${hr}:${mi}`;
    const bg = isBackup ? 'var(--accent)' : 'var(--green-pos)';
    const div = document.createElement('div');
    div.style.cssText = `display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer;border:1px solid var(--border);`;
    div.title = 'Çift tıkla yükle';
    div.innerHTML = `
      <span style="color:var(--text1);white-space:nowrap;">${label}</span>
      <button style="background:${bg}15;border:none;cursor:pointer;font-size:13px;padding:2px 8px;border-radius:4px;color:var(--text1);" onclick="event.stopPropagation();loadSaveSlot('${s.file.replace(/'/g, "\\'")}')" title="Yükle">📂</button>
      <button style="background:none;border:none;cursor:pointer;font-size:11px;padding:2px 6px;border-radius:4px;color:var(--text3);" onclick="event.stopPropagation();renameSaveSlot('${s.file.replace(/'/g, "\\'")}','${label.replace(/'/g, "\\'")}')" title="Yeniden Adlandır">✏️</button>
      <button style="background:var(--red-neg)15;border:none;cursor:pointer;font-size:13px;padding:2px 8px;border-radius:4px;color:var(--text1);" onclick="event.stopPropagation();deleteSaveSlot('${s.file.replace(/'/g, "\\'")}')" title="Sil">🗑️</button>
    `;
    div.addEventListener('dblclick', () => loadSaveSlot(s.file));
    list.appendChild(div);
  });
}

async function loadSaveSlot(filePath) {
  openConfirmModal('Kayıt Yükle', 'Bu kaydı yüklemek tüm mevcut verileri değiştirir. Devam etmek istiyor musunuz?', async () => {
    showSaving();
    const result = await window.toprak.loadSlot(filePath);
    hideSaving();
    if (result.success) {
      showToast('✅ Kayıt yüklendi, uygulama yeniden başlatılıyor...');
      setTimeout(() => window.toprak.restartApp(), 1500);
    } else {
      showToast('Hata: ' + (result.message || 'Bilinmeyen hata'), 'error');
    }
  });
}

async function deleteSaveSlot(filePath) {
  const name = filePath.split('\\').pop().split('/').pop();
  openConfirmModal('Kaydı Sil', `"${name}" kaydını silmek istediğinizden emin misiniz?`, async () => {
    await window.toprak.deleteSave(filePath);
    loadSaveSlots();
  });
}

async function renameSaveSlot(filePath, currentLabel) {
  const newName = prompt('Yeni ad girin:', currentLabel);
  if (!newName || newName === currentLabel) return;
  const result = await window.toprak.renameSave(filePath, newName);
  if (result.success) {
    showToast('✅ Ad değiştirildi');
    loadSaveSlots();
  } else {
    showToast('Hata: ' + (result.message || ''), 'error');
  }
}

document.getElementById('btn-pick-backup').addEventListener('click', async () => {
  const result = await window.toprak.pickAndLoadBackup();
  if (result.canceled) return;
  if (result.success) {
    showToast('✅ Yedek yüklendi, uygulama yeniden başlatılıyor...');
    setTimeout(() => window.toprak.restartApp(), 1500);
  } else {
    showToast('Hata: ' + (result.message || ''), 'error');
  }
});

// Logout action
document.getElementById('logout-btn').addEventListener('click', () => {
  openConfirmModal(
    'Oturumu Kapat',
    'Oturumunuzu kapatmak ve giriş ekranına dönmek istediğinizden emin misiniz?',
    async () => {
      await window.toprak.logout();
    }
  );
});

// Loading overlay helpers
function showLoading() { document.getElementById('loading-overlay').classList.add('active'); }
function hideLoading() { document.getElementById('loading-overlay').classList.remove('active'); }

// Saving indicator helpers
function showSaving() { document.getElementById('saving-indicator').classList.add('active'); }
function hideSaving() { document.getElementById('saving-indicator').classList.remove('active'); }

// Modal helpers
let _modalZIndex = 2000;
function openModal(id) {
  const el = document.getElementById(id);
  el.style.setProperty('z-index', String(++_modalZIndex));
  el.classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// Escape key closes modals
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    closePropertyDetail();
  }
});

// Mass delete helpers
function getCheckedIds(type) {
  return Array.from(document.querySelectorAll(`.select-item[data-type="${type}"]:checked`)).map(cb => Number(cb.dataset.id));
}
function updateMassDeleteBtn(type) {
  const btn = document.getElementById(`btn-mass-delete-${type}`);
  const count = getCheckedIds(type).length;
  if (btn) btn.style.display = count > 0 ? 'inline-flex' : 'none';
}
function toggleAllTx() {
  const checked = document.getElementById('select-all-tx').checked;
  document.querySelectorAll('.select-item[data-type="tx"]').forEach(cb => cb.checked = checked);
  updateMassDeleteBtn('tx');
}
function toggleAllInv() {
  const checked = document.getElementById('select-all-inv').checked;
  document.querySelectorAll('.select-item[data-type="inv"]').forEach(cb => cb.checked = checked);
  updateMassDeleteBtn('inv');
}
function toggleAllActx() {
  const checked = document.getElementById('select-all-actx').checked;
  document.querySelectorAll('.select-item[data-type="actx"]').forEach(cb => cb.checked = checked);
  updateMassDeleteBtn('actx');
}
async function massDeleteTx() {
  const ids = getCheckedIds('tx');
  if (ids.length === 0) return;
  openConfirmModal('Toplu Sil', `${ids.length} işlem silinecek. Emin misiniz?`, async () => {
    for (const id of ids) await window.toprak.deleteTransaction(id);
    showToast(`${ids.length} işlem silindi`, 'error');
    document.getElementById('select-all-tx').checked = false;
    loadTransactions(); updatePendingBell();
  });
}
async function massDeleteInv() {
  const ids = getCheckedIds('inv');
  if (ids.length === 0) return;
  openConfirmModal('Toplu Sil', `${ids.length} fatura silinecek. Emin misiniz?`, async () => {
    for (const id of ids) await window.toprak.deleteInvoice(id);
    showToast(`${ids.length} fatura silindi`, 'error');
    document.getElementById('select-all-inv').checked = false;
    loadInvoices();
  });
}
async function massDeleteActx() {
  const ids = getCheckedIds('actx');
  if (ids.length === 0) return;
  openConfirmModal('Toplu Sil', `${ids.length} hareket silinecek. Emin misiniz?`, async () => {
    for (const id of ids) await window.toprak.deleteAccountTransaction(id);
    showToast(`${ids.length} hareket silindi`, 'error');
    if (activeAccountId) showAccountDetail(activeAccountId);
  });
}

function toggleAllProp() {
  const checked = document.getElementById('select-all-prop').checked;
  document.querySelectorAll('.select-item[data-type="prop"]').forEach(cb => cb.checked = checked);
  updateMassDeleteBtn('prop');
}
function toggleAllStaff() {
  const checked = document.getElementById('select-all-staff').checked;
  document.querySelectorAll('.select-item[data-type="staff"]').forEach(cb => cb.checked = checked);
  updateMassDeleteBtn('staff');
}
function toggleAllAcc() {
  const checked = document.getElementById('select-all-acc').checked;
  document.querySelectorAll('.select-item[data-type="acc"]').forEach(cb => cb.checked = checked);
  updateMassDeleteBtn('acc');
}
function toggleAllAgr() {
  const checked = document.getElementById('select-all-agr').checked;
  document.querySelectorAll('.select-item[data-type="agr"]').forEach(cb => cb.checked = checked);
  updateMassDeleteBtn('agr');
}
function toggleAllSub() {
  const checked = document.getElementById('select-all-sub').checked;
  document.querySelectorAll('.select-item[data-type="sub"]').forEach(cb => cb.checked = checked);
  updateMassDeleteBtn('sub');
}
function toggleAllIban() {
  const checked = document.getElementById('select-all-iban').checked;
  document.querySelectorAll('.select-item[data-type="iban"]').forEach(cb => cb.checked = checked);
  updateMassDeleteBtn('iban');
}
async function massDeleteProp() {
  const ids = getCheckedIds('prop');
  if (ids.length === 0) return;
  openConfirmModal('Toplu Sil', `${ids.length} mülk silinecek. Emin misiniz?`, async () => {
    for (const id of ids) await window.toprak.deleteProperty(id);
    showToast(`${ids.length} mülk silindi`, 'error');
    document.getElementById('select-all-prop').checked = false;
    loadProperties();
  });
}
async function massDeleteStaff() {
  const ids = getCheckedIds('staff');
  if (ids.length === 0) return;
  openConfirmModal('Toplu Sil', `${ids.length} personel silinecek. Emin misiniz?`, async () => {
    for (const id of ids) await window.toprak.deleteStaff(id);
    showToast(`${ids.length} personel silindi`, 'error');
    document.getElementById('select-all-staff').checked = false;
    loadStaff();
  });
}
async function massDeleteAcc() {
  const ids = getCheckedIds('acc');
  if (ids.length === 0) return;
  openConfirmModal('Toplu Sil', `${ids.length} cari hesap silinecek. Emin misiniz?`, async () => {
    for (const id of ids) await window.toprak.deleteAccount(id);
    showToast(`${ids.length} cari hesap silindi`, 'error');
    document.getElementById('select-all-acc').checked = false;
    loadAccountsView();
  });
}
async function massDeleteAgr() {
  const ids = getCheckedIds('agr');
  if (ids.length === 0) return;
  openConfirmModal('Toplu Sil', `${ids.length} sözleşme silinecek. Emin misiniz?`, async () => {
    for (const id of ids) await window.toprak.deleteAgreement(id);
    showToast(`${ids.length} sözleşme silindi`, 'error');
    document.getElementById('select-all-agr').checked = false;
    loadAgreements();
  });
}
async function massDeleteSub() {
  const ids = getCheckedIds('sub');
  if (ids.length === 0) return;
  openConfirmModal('Toplu Sil', `${ids.length} abonelik silinecek. Emin misiniz?`, async () => {
    for (const id of ids) await window.toprak.deleteAgreement(id);
    showToast(`${ids.length} abonelik silindi`, 'error');
    document.getElementById('select-all-sub').checked = false;
    loadAgreements();
  });
}
async function massDeleteIban() {
  const ids = getCheckedIds('iban');
  if (ids.length === 0) return;
  openConfirmModal('Toplu Sil', `${ids.length} IBAN silinecek. Emin misiniz?`, async () => {
    for (const id of ids) await window.toprak.deleteIban(id);
    showToast(`${ids.length} IBAN silindi`, 'error');
    loadIban();
  });
}

// Quick delete check
let quickDeleteEnabled = false;

async function loadQuickDeleteSetting() {
  const val = await window.toprak.getSetting('quick_delete');
  quickDeleteEnabled = val === '1';
}

async function openConfirmModal(title, message, callback) {
  if (quickDeleteEnabled) {
    callback();
    return;
  }
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  state.confirmCallback = callback;
  openModal('modal-confirm');
}

document.getElementById('btn-confirm-yes').addEventListener('click', () => {
  if (state.confirmCallback) {
    state.confirmCallback();
    state.confirmCallback = null;
  }
  closeModal('modal-confirm');
});

// Sidebars Details Drawer for property
function openPropertyDetail() {
  document.getElementById('property-detail-sidebar').classList.add('active');
}

function closePropertyDetail() {
  document.getElementById('property-detail-sidebar').classList.remove('active');
}

// Notification bell
async function updatePendingBell() {
  const allTxs = await window.toprak.getTransactions({ status: 'Bekliyor' });
  const bellCount = document.getElementById('notification-count');
  if (allTxs.length > 0) {
    bellCount.textContent = allTxs.length;
    bellCount.style.display = 'flex';
  } else {
    bellCount.style.display = 'none';
  }
}

document.getElementById('notification-bell').addEventListener('click', () => {
  switchView('transactions');
  document.getElementById('filter-status').value = 'Bekliyor';
  loadTransactions();
});

// Navigation router
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const view = item.getAttribute('data-view');
    switchView(view);
  });
});

document.getElementById('btn-goto-transactions').addEventListener('click', () => {
  switchView('transactions');
});

function switchView(viewName) {
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Switch display elements — animate out then in
  const previous = document.querySelector('.view-container.active');
  if (previous && previous.id !== `view-${viewName}`) {
    previous.classList.remove('active');
  }

  document.querySelectorAll('.view-container').forEach(container => {
    if (container.id !== `view-${viewName}`) container.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${viewName}`);
  // Brief delay allows the CSS keyframe to reset before re-triggering
  targetView.classList.remove('active');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      targetView.classList.add('active');
    });
  });
  
  // Set headers
  const titles = {
    dashboard: 'Ana Panel',
    transactions: 'İşlemler',
    properties: 'Portföy ve Mülkler',
    staff: 'Ekibimiz ve Performans',
    reports: 'Finansal Raporlar',
    einvoice: 'e-Fatura / e-Arşiv',
    accounts: 'Cari Hesap Yönetimi',
    agreements: 'Sözleşmeler',
    subscriptions: 'Sivas Durak Abonelikler',
    iban: 'IBAN Bilgileri',
    edmportal: 'EDM Portal',
    categories: 'Kategori Yönetimi',
    settings: 'Ayarlar'
  };
  document.getElementById('page-title').textContent = titles[viewName];

  state.currentView = viewName;
  closePropertyDetail();

  // Load view-specific data
  if (viewName === 'dashboard') {
    loadDashboard();
  } else if (viewName === 'transactions') {
    loadTransactions();
  } else if (viewName === 'properties') {
    loadProperties();
  } else if (viewName === 'staff') {
    loadStaff();
  } else if (viewName === 'reports') {
    loadReports();
  } else if (viewName === 'einvoice') {
    loadInvoices();
  } else if (viewName === 'accounts') {
    loadAccountsView();
  } else if (viewName === 'agreements') {
    loadAgreements();
  } else if (viewName === 'subscriptions') {
    loadAgreements();
  } else if (viewName === 'iban') {
    loadIban();
  } else if (viewName === 'edmportal') {
    loadEdmPortal();
  } else if (viewName === 'categories') {
    loadCategoriesPage();
  } else if (viewName === 'settings') {
    loadSettings();
  }
}

// Number animate helper
function animateCounter(elementId, targetValue, duration = 800) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const start = 0;
  const isNegative = targetValue < 0;
  const absValue = Math.abs(targetValue);
  const startTime = performance.now();

  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out quad
    const easeProgress = progress * (2 - progress);
    const currentValue = Math.floor(start + easeProgress * (absValue - start));
    
    element.textContent = (isNegative ? '-' : '') + formatCurrency(currentValue);

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      element.textContent = (isNegative ? '-' : '') + formatCurrency(absValue);
    }
  }

  requestAnimationFrame(updateCount);
}


// ==========================================
// 📊 GÖRÜNÜM 1: DASHBOARD (Ana Panel)
// ==========================================

async function loadDashboard() {
  // Fetch monthly records for current month
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
  
  const startOfMonth = `${currentYear}-${currentMonth}-01`;
  const endOfMonth = `${currentYear}-${currentMonth}-31`;

  // Get completed items
  const currentMonthTxs = await window.toprak.getTransactions({
    startDate: startOfMonth,
    endDate: endOfMonth
  });

  // Calculate cards totals
  let totalIncome = 0;
  let totalExpense = 0;
  
  currentMonthTxs.forEach(t => {
    if (t.status === 'Tamamlandı') {
      if (isIncome(t.type)) totalIncome += t.amount;
      else if (isExpense(t.type)) totalExpense += t.amount;
    }
  });

  const netBalance = totalIncome - totalExpense;

  // Calculate total pending
  const pendingTxs = await window.toprak.getTransactions({ status: 'Bekliyor' });
  let pendingAmount = 0;
  pendingTxs.forEach(t => {
    if (isIncome(t.type) || isExpense(t.type)) pendingAmount += t.amount;
  });

  // Render card counters
  document.querySelectorAll('.summary-value').forEach(v => v.classList.remove('shimmer'));
  animateCounter('card-income', totalIncome);
  animateCounter('card-expense', totalExpense);
  animateCounter('card-net', netBalance);
  animateCounter('card-pending', pendingAmount);

  // Set net bakiye styling
  const netCard = document.getElementById('card-net');
  if (netBalance >= 0) {
    netCard.style.color = 'var(--green-pos)';
  } else {
    netCard.style.color = 'var(--red-neg)';
  }

  // Load Recent Transactions Table (max 10)
  const allTxs = await window.toprak.getTransactions();
  const recentTable = document.getElementById('dashboard-recent-table');
  recentTable.innerHTML = '';
  
  if (allTxs.length === 0) {
    recentTable.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text3);">Kayıt bulunamadı.</td></tr>';
  } else {
    allTxs.slice(0, 10).forEach(t => {
      const tr = document.createElement('tr');
      tr.className = getRowClass(t.type);
      
      let statusBadge = '';
      if (t.status === 'Tamamlandı') statusBadge = '<span class="badge badge-success">Tamamlandı</span>';
      else if (t.status === 'Bekliyor') statusBadge = '<span class="badge badge-warning">Bekliyor</span>';
      else if (t.status === 'İptal') statusBadge = '<span class="badge badge-danger">İptal</span>';

      tr.innerHTML = `
        <td>${formatDate(t.date)}</td>
        <td style="font-weight: 500;">${t.description}</td>
        <td><span style="color: var(--text2);">${t.category}</span></td>
        <td><span class="badge ${getBadgeClass(t.type)}">${t.type}</span></td>
        <td style="font-weight: bold; font-family: var(--font-heading);">${formatCurrency(t.amount)}</td>
        <td>${statusBadge}</td>
      `;
      recentTable.appendChild(tr);
    });
  }

  // Animate dashboard cards in with stagger
  const cards = document.querySelectorAll('.summary-card');
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '';
      card.style.transform = '';
    }, 80 * i);
  });

  // Draw Charts
  renderLineChart();
  renderDoughnutChart();
}

async function renderLineChart() {
  const ctx = document.getElementById('line-chart').getContext('2d');
  if (state.charts.line) {
    state.charts.line.destroy();
  }

  const labels = [];
  const incomeData = [0, 0, 0, 0, 0, 0];
  const expenseData = [0, 0, 0, 0, 0, 0];

  const currentDate = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    labels.push({
      key: `${yStr}-${mStr}`,
      display: formatMonthYear(`${yStr}-${mStr}`)
    });
  }

  const allTxs = await window.toprak.getTransactions();
  
  allTxs.forEach(t => {
    if (t.status !== 'Tamamlandı') return;
    const ym = t.date.substring(0, 7);
    const idx = labels.findIndex(l => l.key === ym);
    if (idx !== -1) {
      if (isIncome(t.type)) {
        incomeData[idx] += t.amount;
      } else if (isExpense(t.type)) {
        expenseData[idx] += t.amount;
      }
    }
  });

  const textColors = { dark: '#A89880', light: '#5A4E3E', mavi: '#2C5282', cappuccino: '#6B5A48', orman: '#2A5A28' };
  const gridColors = { dark: '#3A3228', light: '#DDD5C8', mavi: '#B8D4E8', cappuccino: '#D4C4A8', orman: '#A8C49A' };
  const textStyleColor = textColors[state.theme] || textColors.dark;
  const gridStyleColor = gridColors[state.theme] || gridColors.dark;

  // Build gradient fills
  const incomeGradient = ctx.createLinearGradient(0, 0, 0, 300);
  incomeGradient.addColorStop(0, 'rgba(45, 106, 45, 0.25)');
  incomeGradient.addColorStop(1, 'rgba(45, 106, 45, 0)');

  const expenseGradient = ctx.createLinearGradient(0, 0, 0, 300);
  expenseGradient.addColorStop(0, 'rgba(192, 57, 43, 0.20)');
  expenseGradient.addColorStop(1, 'rgba(192, 57, 43, 0)');

  state.charts.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.map(l => l.display),
      datasets: [
        {
          label: 'Gelir',
          data: incomeData,
          borderColor: '#2D6A2D',
          backgroundColor: incomeGradient,
          borderWidth: 2.5,
          pointBackgroundColor: '#2D6A2D',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Gider',
          data: expenseData,
          borderColor: '#C0392B',
          backgroundColor: expenseGradient,
          borderWidth: 2.5,
          pointBackgroundColor: '#C0392B',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: textStyleColor, font: { family: 'DM Sans', size: 11 } }
        }
      },
      scales: {
        x: {
          grid: { color: gridStyleColor },
          ticks: { color: textStyleColor, font: { family: 'DM Sans' } }
        },
        y: {
          grid: { color: gridStyleColor },
          ticks: {
            color: textStyleColor,
            font: { family: 'DM Sans' },
            callback: (val) => formatCurrency(val)
          }
        }
      }
    }
  });
}

async function renderDoughnutChart() {
  const ctx = document.getElementById('doughnut-chart').getContext('2d');
  if (state.charts.doughnut) {
    state.charts.doughnut.destroy();
  }

  // Get current month expense categories breakdown
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
  
  const currentMonthTxs = await window.toprak.getTransactions({
    startDate: `${currentYear}-${currentMonth}-01`,
    endDate: `${currentYear}-${currentMonth}-31`,
    type: 'Gider'
  });

  const categories = {
    'Ofis Kirası': 0,
    'Personel Maaşı': 0,
    'Pazarlama': 0,
    'Araç Gideri': 0,
    'Vergi': 0,
    'Diğer Gider': 0
  };

  currentMonthTxs.forEach(t => {
    if (t.status === 'Tamamlandı') {
      if (categories[t.category] !== undefined) {
        categories[t.category] += t.amount;
      } else {
        categories['Diğer Gider'] += t.amount;
      }
    }
  });

  const labels = Object.keys(categories).filter(c => categories[c] > 0);
  const data = labels.map(c => categories[c]);

  const textColors = { dark: '#A89880', light: '#5A4E3E', mavi: '#2C5282', cappuccino: '#6B5A48', orman: '#2A5A28' };
  const textStyleColor = textColors[state.theme] || textColors.dark;

  // Aesthetic colors matching dark mode
  const bgColors = ['#8B1A1A', '#C0392B', '#E05C2A', '#C9922A', '#4A6B82', '#6A5E50'];

  if (labels.length === 0) {
    // Show empty data placeholder
    state.charts.doughnut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Kayıt Yok'],
        datasets: [{
          data: [1],
          backgroundColor: [getComputedStyle(document.body).getPropertyValue('--surface2').trim() || '#2A2520']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: textStyleColor }
          },
          tooltip: { enabled: false }
        }
      }
    });
  } else {
    state.charts.doughnut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: bgColors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: state.theme === 'dark' ? '#1E1A14' : '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: textStyleColor,
              font: { family: 'DM Sans', size: 10 }
            }
          }
        }
      }
    });
  }
}


// ==========================================
// 💳 GÖRÜNÜM 2: İŞLEMLER (Transactions)
// ==========================================

const txForm = document.getElementById('form-transaction');
const txType = document.getElementById('tx-type');
const txCategory = document.getElementById('tx-category');

let categoriesCache = { Gelir: [], Gider: [], Personel: [], Paket: [], Platform: [], İşletme: [] };
let categoriesMap = { Gelir: [], Gider: [], Personel: [], Paket: [], Platform: [], İşletme: [] };

async function loadCategoriesCache() {
  const cats = await window.toprak.getCategories();
  const viewFilter = await window.toprak.getViewCompanyFilter();
  const viewId = viewFilter === 'all' ? null : Number(viewFilter);
  categoriesCache = { Gelir: [], Gider: [], Personel: [], Paket: [], Platform: [], İşletme: [] };
  categoriesMap = { Gelir: [], Gider: [], Personel: [], Paket: [], Platform: [], İşletme: [] };
  cats.forEach(c => {
    if (!categoriesMap[c.tx_type]) categoriesMap[c.tx_type] = [];
    categoriesMap[c.tx_type].push(c.name);
    if (viewId && c.company_id !== viewId) return;
    if (!categoriesCache[c.tx_type]) categoriesCache[c.tx_type] = [];
    categoriesCache[c.tx_type].push(c.name);
  });
}

function populateTxCategories(type) {
  txCategory.innerHTML = '';
  (categoriesCache[type] || []).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    txCategory.appendChild(opt);
  });
}

txType.addEventListener('change', (e) => {
  populateTxCategories(e.target.value);
});

// Setup transaction lists filters options
async function initTransactionsFilterBar() {
  await loadCategoriesCache();
  const filterCat = document.getElementById('filter-category');
  filterCat.innerHTML = '<option value="">Tümü</option>';
  
  const allCats = [...(categoriesCache.Gelir || []), ...(categoriesCache.Gider || []), ...(categoriesCache.Personel || []), ...(categoriesCache.Paket || []), ...(categoriesCache.Platform || []), ...(categoriesCache.İşletme || [])];
  allCats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    filterCat.appendChild(opt);
  });
}

// Load records
async function loadTransactions() {
  await initTransactionsFilterBar();
  await populateDropdowns();

  const filters = {
    search: document.getElementById('filter-search').value.trim(),
    type: document.getElementById('filter-type').value,
    category: document.getElementById('filter-category').value,
    status: document.getElementById('filter-status').value,
    startDate: document.getElementById('filter-start-date').value,
    endDate: document.getElementById('filter-end-date').value
  };

  const data = await window.toprak.getTransactions(filters);
  state.transactions = data;

  renderTransactionsTable();
}

// Populate dropdowns in Modal
async function populateDropdowns() {
  const propSelect = document.getElementById('tx-property');
  const staffSelect = document.getElementById('tx-staff');
  
  // Keep first option
  propSelect.innerHTML = '<option value="">-- Mülk Seçin (İsteğe Bağlı) --</option>';
  staffSelect.innerHTML = '<option value="">-- Personel Seçin (İsteğe Bağlı) --</option>';

  const props = await window.toprak.getProperties();
  const staffList = await window.toprak.getStaff();

  props.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    propSelect.appendChild(opt);
  });

  staffList.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.full_name} (${s.role})`;
    staffSelect.appendChild(opt);
  });
}

function renderTransactionsTable() {
  const tbody = document.getElementById('transactions-table-body');
  tbody.innerHTML = '';

  const { currentPage, pageSize } = state.pagination;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, state.transactions.length);

  const pageData = state.transactions.slice(startIndex, endIndex);

  // Update pagination UI details
  document.getElementById('pagination-info').textContent = 
    `Gösterilen: ${state.transactions.length > 0 ? startIndex + 1 : 0} - ${endIndex} / Toplam: ${state.transactions.length}`;
  
  document.getElementById('pagination-prev').disabled = currentPage === 1;
  document.getElementById('pagination-next').disabled = endIndex >= state.transactions.length;

  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text3); padding: 30px 0;">Kayıt bulunamadı.</td></tr>';
    updateMassDeleteBtn('tx');
    return;
  }

  const frag = document.createDocumentFragment();
  pageData.forEach(t => {
    const tr = document.createElement('tr');
    tr.className = getRowClass(t.type);
    
    let statusBadge = '';
    if (t.status === 'Tamamlandı') statusBadge = '<span class="badge badge-success">Tamamlandı</span>';
    else if (t.status === 'Bekliyor') statusBadge = '<span class="badge badge-warning">Bekliyor</span>';
    else if (t.status === 'İptal') statusBadge = '<span class="badge badge-danger">İptal</span>';
    
    // Linked name
    let relationText = '-';
    if (t.property_name && t.staff_name) {
      relationText = `<span style="font-weight: 500;">🏢 ${t.property_name}</span><br><span style="font-size: 11px; color: var(--text3)">👤 ${t.staff_name}</span>`;
    } else if (t.property_name) {
      relationText = `<span style="font-weight: 500;">🏢 ${t.property_name}</span>`;
    } else if (t.staff_name) {
      relationText = `<span style="font-size: 11px; color: var(--text3)">👤 ${t.staff_name}</span>`;
    }

    tr.innerHTML = `
      <td><input type="checkbox" class="select-item" data-id="${t.id}" data-type="tx" onchange="updateMassDeleteBtn('tx')"></td>
      <td>${formatDate(t.date)}</td>
      <td style="font-weight: 500;">
        ${t.description}
        ${t.note ? `<br><span style="font-size: 11px; color: var(--text3); font-weight: normal;">Not: ${t.note}</span>` : ''}
      </td>
      <td><span class="badge ${getBadgeClass(t.type)}">${t.type}</span></td>
      <td><span style="color: var(--text2);">${t.category}</span></td>
      <td style="font-weight: bold; font-family: var(--font-heading); font-size: 14px;">${formatCurrency(t.amount)}</td>
      <td>${relationText}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="action-icons">
          <button class="action-btn edit-btn" onclick="editTransaction(${t.id})">✏️</button>
          <button class="action-btn delete-btn" onclick="deleteTransaction(${t.id})">🗑️</button>
        </div>
      </td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
  updateMassDeleteBtn('tx');
}

// Mass delete button listeners
document.getElementById('btn-mass-delete-tx')?.addEventListener('click', massDeleteTx);
document.getElementById('btn-mass-delete-inv')?.addEventListener('click', massDeleteInv);
document.getElementById('btn-mass-delete-actx')?.addEventListener('click', massDeleteActx);
document.getElementById('btn-mass-delete-prop')?.addEventListener('click', massDeleteProp);
document.getElementById('btn-mass-delete-staff')?.addEventListener('click', massDeleteStaff);
document.getElementById('btn-mass-delete-acc')?.addEventListener('click', massDeleteAcc);
document.getElementById('btn-mass-delete-agr')?.addEventListener('click', massDeleteAgr);
document.getElementById('btn-mass-delete-sub')?.addEventListener('click', massDeleteSub);

// Search and Filter Listeners
const debouncedSearch = debounce(() => { state.pagination.currentPage = 1; loadTransactions(); }, 300);
document.getElementById('filter-search').addEventListener('input', debouncedSearch);
document.getElementById('filter-type').addEventListener('change', () => { state.pagination.currentPage = 1; loadTransactions(); });
document.getElementById('filter-category').addEventListener('change', () => { state.pagination.currentPage = 1; loadTransactions(); });
document.getElementById('filter-status').addEventListener('change', () => { state.pagination.currentPage = 1; loadTransactions(); });
document.getElementById('filter-start-date').addEventListener('change', () => { state.pagination.currentPage = 1; loadTransactions(); });
document.getElementById('filter-end-date').addEventListener('change', () => { state.pagination.currentPage = 1; loadTransactions(); });

document.getElementById('btn-clear-filters').addEventListener('click', () => {
  document.getElementById('filter-search').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-start-date').value = '';
  document.getElementById('filter-end-date').value = '';
  state.pagination.currentPage = 1;
  loadTransactions();
});

// Pagination events
document.getElementById('pagination-prev').addEventListener('click', () => {
  if (state.pagination.currentPage > 1) {
    state.pagination.currentPage--;
    renderTransactionsTable();
  }
});
document.getElementById('pagination-next').addEventListener('click', () => {
  const maxPage = Math.ceil(state.transactions.length / state.pagination.pageSize);
  if (state.pagination.currentPage < maxPage) {
    state.pagination.currentPage++;
    renderTransactionsTable();
  }
});

// Create modal add trigger
document.getElementById('btn-add-transaction').addEventListener('click', () => {
  txForm.reset();
  document.getElementById('tx-id').value = '';
  document.getElementById('modal-transaction-title').textContent = 'Yeni İşlem Ekle';
  
  // Set default values
  document.getElementById('tx-date').value = new Date().toISOString().substring(0, 10);
  populateTxCategories('Gelir');
  
  openModal('modal-transaction');
});

// Save Transaction
document.getElementById('btn-save-transaction').addEventListener('click', async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('tx-id').value;
  const date = document.getElementById('tx-date').value;
  const description = document.getElementById('tx-desc').value.trim();
  const type = document.getElementById('tx-type').value;
  const category = document.getElementById('tx-category').value;
  const amount = cleanValue('tx-amount');
  const status = document.getElementById('tx-status').value;
  const property_id = document.getElementById('tx-property').value;
  const staff_id = document.getElementById('tx-staff').value;
  const note = document.getElementById('tx-note').value;

  // Validation
  let isValid = true;
  if (!description) {
    document.getElementById('tx-desc-error').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('tx-desc-error').style.display = 'none';
  }

  if (!amount || amount <= 0) {
    document.getElementById('tx-amount-error').style.display = 'block';
    isValid = false;
  } else {
    document.getElementById('tx-amount-error').style.display = 'none';
  }

  if (!date) isValid = false;

  if (!isValid) return;

  showSaving();
  const data = { date, description, type, category, amount, status, property_id, staff_id, note };

  if (id) {
    // Update
    const success = await window.toprak.updateTransaction(Number(id), data);
    if (success) {
      showToast('İşlem başarıyla güncellendi.');
    } else {
      showToast('İşlem güncellenemedi.', 'error');
    }
  } else {
    // Create
    const newId = await window.toprak.addTransaction(data);
    if (newId) {
      showToast('İşlem başarıyla kaydedildi ✓');
    } else {
      showToast('İşlem kaydedilemedi.', 'error');
    }
  }

  hideSaving();
  closeModal('modal-transaction');
  loadTransactions();
  updatePendingBell();
});

// Edit Transaction
async function editTransaction(id) {
  const t = state.transactions.find(item => item.id === id);
  if (!t) return;

  document.getElementById('tx-id').value = t.id;
  document.getElementById('tx-date').value = t.date;
  document.getElementById('tx-desc').value = t.description;
  document.getElementById('tx-type').value = t.type;
  
  populateTxCategories(t.type);
  document.getElementById('tx-category').value = t.category;
  
  document.getElementById('tx-amount').value = t.amount;
  document.getElementById('tx-status').value = t.status;
  
  await populateDropdowns();
  document.getElementById('tx-property').value = t.property_id || '';
  document.getElementById('tx-staff').value = t.staff_id || '';
  document.getElementById('tx-note').value = t.note || '';

  document.getElementById('modal-transaction-title').textContent = 'İşlemi Düzenle';
  openModal('modal-transaction');
}

// Delete Transaction
function deleteTransaction(id) {
  openConfirmModal(
    'İşlemi Sil',
    'Bu işlemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
    async () => {
      const success = await window.toprak.deleteTransaction(id);
      if (success) {
        showToast('Kayıt silindi', 'error');
        loadTransactions();
        updatePendingBell();
      } else {
        showToast('Silme işlemi başarısız.', 'error');
      }
    }
  );
}


// ==========================================
// 🏢 GÖRÜNÜM 3: MÜLKLER (Properties)
// ==========================================

const propForm = document.getElementById('form-property');

// Company type-specific property field definitions
const PROPERTY_FIELDS = {
  gayrimenkul: [
    { key: 'name', label: 'Mülk Adı *', type: 'text', required: true, placeholder: 'Örn: Kızılırmak Mah. 3+1 Dubleks' },
    { key: 'address', label: 'Adres', type: 'text', placeholder: 'Açık adres...' },
    { key: 'type', label: 'Mülk Türü', type: 'select', options: ['Daire','Villa','Arsa','İşyeri','Dükkan'] },
    { key: 'status', label: 'Durum', type: 'select', options: ['Satılık','Kiralık','Satıldı','Kiralandı'] },
    { key: 'estimated_value', label: 'Tahmini Değer (₺)', type: 'number', cls: 'auto-thousands' },
    { key: 'commission_rate', label: 'Komisyon Oranı (%)', type: 'number', attrs: 'min="0" max="100" step="0.1" value="2.0"' }
  ],
  derch: [
    { key: 'name', label: 'Marka Adı *', type: 'text', required: true, placeholder: 'Örn: ABC Giyim' },
    { key: 'platform', label: 'Platform', type: 'select', options: ['Instagram','Facebook','Google','YouTube','TikTok','Diğer'] },
    { key: 'paket', label: 'Paket', type: 'select', options: ['Temel','Pro','Premium'] },
    { key: 'aylik_ucret', label: 'Aylık Ücret (₺)', type: 'number', cls: 'auto-thousands' },
    { key: 'status', label: 'Durum', type: 'select', options: ['Aktif','Pasif'] }
  ],
  yo: [
    { key: 'name', label: 'İşletme Adı *', type: 'text', required: true, placeholder: 'Örn: Muhteşem Düğün Salonu' },
    { key: 'business_type', label: 'İşletme Türü', type: 'select', options: ['Düğün Salonu','Restoran','Kafe','AVM','Otel','Diğer'] },
    { key: 'plan', label: 'Abonelik Planı', type: 'select', options: ['Günlük','Haftalık','Aylık','Yıllık'] },
    { key: 'aylik_ucret', label: 'Aylık Ücret (₺)', type: 'number', cls: 'auto-thousands' },
    { key: 'status', label: 'Durum', type: 'select', options: ['Aktif','Pasif','Süresi Doldu'] }
  ]
};

// Get the current company type
async function getCompanyType() {
  const company = await window.toprak.getActiveCompany();
  return company ? company.type : 'gayrimenkul';
}

// Build dynamic property form fields into #prop-dynamic-fields
function buildPropertyFormHtml(companyType, data = {}) {
  const fields = PROPERTY_FIELDS[companyType] || PROPERTY_FIELDS.gayrimenkul;
  const cf = data.custom_fields ? (typeof data.custom_fields === 'string' ? JSON.parse(data.custom_fields) : data.custom_fields) : {};
  let grid = '', currentRow = [];
  
  const addRow = () => {
    if (currentRow.length === 0) return;
    const cols = currentRow.map(f => {
      const val = f.key === 'name' ? (data.name || '') : (f.key === 'status' ? (data.status || '') : (cf[f.key] !== undefined ? cf[f.key] : ''));
      const requiredAttr = f.required ? 'required' : '';
      const cls = f.cls || '';
      const attrs = f.attrs || '';
      if (f.type === 'select') {
        const opts = (f.options || []).map(o => `<option value="${o}"${val === o ? ' selected' : ''}>${o}</option>`).join('');
        return `<div class="form-group"><label>${f.label}</label><select id="prop_field_${f.key}" class="form-control" ${requiredAttr}>${opts}</select></div>`;
      } else {
        return `<div class="form-group"><label>${f.label}</label><input type="text" id="prop_field_${f.key}" class="form-control ${cls}" ${attrs} placeholder="${f.placeholder || ''}" value="${val}" ${requiredAttr}></div>`;
      }
    }).join('');
    grid += `<div style="display:grid;grid-template-columns:repeat(${Math.min(currentRow.length,2)},1fr);gap:15px;">${cols}</div>`;
    currentRow = [];
  };

  fields.forEach(f => {
    if (f.key === 'name' && companyType === 'gayrimenkul') {
      // Name field takes its own row for Toprak
      if (currentRow.length > 0) addRow();
      grid += `<div class="form-group"><label>${f.label}</label><input type="text" id="prop_field_${f.key}" class="form-control ${f.cls || ''}" placeholder="${f.placeholder || ''}" value="${data.name || ''}" ${f.required ? 'required' : ''}></div>`;
    } else {
      currentRow.push(f);
      if (currentRow.length >= 2) addRow();
    }
  });
  addRow(); // flush remaining
  document.getElementById('prop-dynamic-fields').innerHTML = grid;
}

// Collect values from dynamic property form
function collectPropertyForm(companyType) {
  const fields = PROPERTY_FIELDS[companyType] || PROPERTY_FIELDS.gayrimenkul;
  const result = { custom_fields: '{}' };
  const cf = {};
  fields.forEach(f => {
    const el = document.getElementById(`prop_field_${f.key}`);
    if (!el) return;
    const val = f.cls === 'auto-thousands' ? cleanValue(`prop_field_${f.key}`) : el.value;
    if (f.key === 'name') result.name = val;
    else if (f.key === 'status') result.status = val;
    else if (['estimated_value','commission_rate','address','type'].includes(f.key)) {
      result[f.key] = f.cls === 'auto-thousands' ? val : (f.type === 'number' ? Number(val) || 0 : val);
    } else {
      cf[f.key] = val;
    }
  });
  result.custom_fields = JSON.stringify(cf);
  const noteEl = document.getElementById('prop-note');
  result.note = noteEl ? noteEl.value : '';
  return result;
}

async function loadProperties() {
  const data = await window.toprak.getProperties();
  state.properties = data;
  const companyType = await getCompanyType();

  const grid = document.getElementById('properties-grid');
  grid.innerHTML = '';

  if (data.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text3); padding: 40px;">Kayıt bulunamadı.</div>';
    return;
  }

  const frag = document.createDocumentFragment();
  data.forEach(p => {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.addEventListener('click', () => showPropertyDetails(p.id));

    const cf = p.custom_fields ? (typeof p.custom_fields === 'string' ? JSON.parse(p.custom_fields) : p.custom_fields) : {};
    let subline, typeLabel, valueDisplay;

    if (companyType === 'gayrimenkul') {
      subline = `📍 ${p.address || 'Sivas'}`;
      typeLabel = p.type;
      valueDisplay = `<div class="property-stat-item"><span class="property-stat-label">Değer</span><span class="property-stat-value">${formatCurrency(p.estimated_value)}</span></div>`;
    } else if (companyType === 'derch') {
      subline = `📱 ${cf.platform || '-'}`;
      typeLabel = cf.paket || '-';
      valueDisplay = `<div class="property-stat-item"><span class="property-stat-label">Ücret</span><span class="property-stat-value">${formatCurrency(cf.aylik_ucret || 0)}</span></div>`;
    } else {
      subline = `🏪 ${cf.business_type || '-'}`;
      typeLabel = cf.plan || '-';
      valueDisplay = `<div class="property-stat-item"><span class="property-stat-label">Ücret</span><span class="property-stat-value">${formatCurrency(cf.aylik_ucret || 0)}</span></div>`;
    }

    let statusClass = 'badge-success';
    const status = p.status || cf.status || '';
    if (['Satılık','Pasif'].includes(status)) statusClass = 'badge-warning';
    else if (status === 'Satıldı') statusClass = 'badge-success';

    card.innerHTML = `
      <div class="card-checkbox-wrapper">
        <input type="checkbox" class="select-item" data-id="${p.id}" data-type="prop" onchange="event.stopPropagation();updateMassDeleteBtn('prop')">
      </div>
      <span class="property-name">${p.name}</span>
      <span class="property-address">${subline}</span>
      <div class="property-badges">
        <span class="badge badge-expense">${typeLabel}</span>
        <span class="badge ${statusClass}">${status}</span>
      </div>
      <div class="property-stats">${valueDisplay}</div>
    `;
    frag.appendChild(card);
  });
  grid.appendChild(frag);
  updateMassDeleteBtn('prop');
}

// Show Sidebar Detail Pane
async function showPropertyDetails(id) {
  const p = state.properties.find(item => item.id === id);
  if (!p) return;

  state.activePropertyId = id;
  const companyType = await getCompanyType();
  const cf = p.custom_fields ? (typeof p.custom_fields === 'string' ? JSON.parse(p.custom_fields) : p.custom_fields) : {};

  document.getElementById('prop-detail-name').textContent = p.name;
  document.getElementById('prop-detail-notes').textContent = p.note || 'Not bulunmuyor.';

  // Build detail view based on type
  if (companyType === 'gayrimenkul') {
    document.getElementById('prop-detail-address').textContent = p.address || '-';
    document.getElementById('prop-detail-type-badge').textContent = p.type || '-';
    document.getElementById('prop-detail-status-badge').textContent = p.status || '-';
    document.getElementById('prop-detail-status-badge').className = 'badge ' + (p.status === 'Satılık' ? 'badge-warning' : p.status === 'Kiralık' ? 'badge-income' : 'badge-success');
    document.getElementById('prop-detail-financials').innerHTML = 
      `${formatCurrency(p.estimated_value)} <span style="font-size:12px;color:var(--text3);font-weight:normal;">(Komisyon: %${p.commission_rate})</span>`;
  } else {
    document.getElementById('prop-detail-address').textContent = companyType === 'derch' ? `📱 ${cf.platform || '-'}` : `🏪 ${cf.business_type || '-'}`;
    document.getElementById('prop-detail-type-badge').textContent = cf.paket || cf.plan || '-';
    document.getElementById('prop-detail-status-badge').textContent = cf.status || p.status || '-';
    document.getElementById('prop-detail-status-badge').className = 'badge ' + ((cf.status === 'Aktif') ? 'badge-success' : 'badge-warning');
    document.getElementById('prop-detail-financials').innerHTML = 
      `Aylık: ${formatCurrency(cf.aylik_ucret || 0)}`;
  }

  // Linked transactions
  const allTxs = await window.toprak.getTransactions();
  const linkedTxs = allTxs.filter(t => t.property_id === id);
  const tbody = document.getElementById('prop-detail-tx-list');
  tbody.innerHTML = '';
  if (linkedTxs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text3);">İşlem bulunamadı.</td></tr>';
  } else {
    linkedTxs.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDate(t.date)}</td>
        <td>${t.description}</td>
        <td><span class="badge ${getBadgeClass(t.type)}">${t.type}</span></td>
        <td style="font-weight:bold;font-family:var(--font-heading);">${formatCurrency(t.amount)}</td>
      `;
      tbody.appendChild(tr);
    });
  }
  openPropertyDetail();
}

// Create property modal trigger
document.getElementById('btn-add-property').addEventListener('click', async () => {
  const companyType = await getCompanyType();
  document.getElementById('prop-id').value = '';
  document.getElementById('prop-note').value = '';
  const title = companyType === 'gayrimenkul' ? 'Yeni Mülk' : companyType === 'derch' ? 'Yeni Marka' : 'Yeni İşletme';
  document.getElementById('modal-property-title').textContent = title + ' Ekle';
  buildPropertyFormHtml(companyType);
  openModal('modal-property');
});

// Save Property
document.getElementById('btn-save-property').addEventListener('click', async (e) => {
  e.preventDefault();
  const companyType = await getCompanyType();
  const id = document.getElementById('prop-id').value;
  const data = collectPropertyForm(companyType);

  if (!data.name) { showToast('Lütfen ad girin.', 'error'); return; }

  showSaving();
  if (id) {
    await window.toprak.updateProperty(Number(id), data);
    showToast('Kayıt güncellendi.');
  } else {
    await window.toprak.addProperty(data);
    showToast('Kayıt eklendi ✓');
  }
  hideSaving();
  closeModal('modal-property');
  loadProperties();
});

// Edit from detail sidebar
document.getElementById('btn-edit-detail-prop').addEventListener('click', async () => {
  const p = state.properties.find(item => item.id === state.activePropertyId);
  if (!p) return;
  const companyType = await getCompanyType();
  const title = companyType === 'gayrimenkul' ? 'Mülkü' : companyType === 'derch' ? 'Markayı' : 'İşletmeyi';
  document.getElementById('modal-property-title').textContent = title + ' Düzenle';
  document.getElementById('prop-id').value = p.id;
  document.getElementById('prop-note').value = p.note || '';
  buildPropertyFormHtml(companyType, p);
  closePropertyDetail();
  openModal('modal-property');
});

// Delete from detail sidebar
document.getElementById('btn-delete-detail-prop').addEventListener('click', () => {
  const p = state.properties.find(item => item.id === state.activePropertyId);
  if (!p) return;
  closePropertyDetail();
  openConfirmModal('Kaydı Sil', `"${p.name}" silinsin mi?`, async () => {
    const success = await window.toprak.deleteProperty(p.id);
    if (success) { showToast('Silindi', 'error'); loadProperties(); }
    else showToast('Silme başarısız.', 'error');
  });
});


// ==========================================
// 👥 GÖRÜNÜM 4: PERSONEL (Staff)
// ==========================================

const staffForm = document.getElementById('form-staff');

async function loadStaff() {
  const data = await window.toprak.getStaff();
  state.staff = data;

  const grid = document.getElementById('staff-grid');
  grid.innerHTML = '';

  if (data.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text3); padding: 40px;">Kayıtlı personel bulunamadı.</div>';
    return;
  }

  const frag = document.createDocumentFragment();
  data.forEach(s => {
    const initials = s.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const card = document.createElement('div');
    card.className = 'staff-card';

    card.innerHTML = `
      <div class="card-checkbox-wrapper">
        <input type="checkbox" class="select-item" data-id="${s.id}" data-type="staff" onchange="updateMassDeleteBtn('staff')">
      </div>
      <div class="avatar-large">${initials}</div>
      <div class="staff-name">${s.full_name}</div>
      <span class="staff-role-badge">${s.role}</span>
      <div class="staff-contact">📞 ${s.phone || 'Telefon yok'}</div>
      <div class="staff-financials">
        <div class="staff-financial-item">
          <span class="staff-financial-label">Bu Ay Prim</span>
          <span class="staff-financial-val income">${formatCurrency(s.current_month_commissions || 0)}</span>
        </div>
        <div class="staff-financial-item">
          <span class="staff-financial-label">Toplam Prim</span>
          <span class="staff-financial-val">${formatCurrency(s.total_all_time_commissions || 0)}</span>
        </div>
      </div>
      <div class="staff-card-actions">
        <button class="action-btn edit-btn" style="font-size:16px;" onclick="editStaff(${s.id})">✏️</button>
        <button class="action-btn delete-btn" style="font-size:16px;" onclick="deleteStaff(${s.id})">🗑️</button>
      </div>
    `;
    frag.appendChild(card);
  });
  grid.appendChild(frag);
  updateMassDeleteBtn('staff');
}

function populateStaffRoles() {
  const sel = document.getElementById('staff-role');
  const currentVal = sel.value;
  sel.innerHTML = '<option value="">Rol seçin</option>';
  const defaults = ['Emlak Danışmanı', 'Ofis Müdürü', 'Muhasebe', 'Sekreter'];
  const seen = new Set();
  defaults.forEach(r => { seen.add(r); const o = document.createElement('option'); o.value = r; o.textContent = r; sel.appendChild(o); });
  (categoriesCache.Personel || []).forEach(cat => {
    if (seen.has(cat)) return;
    seen.add(cat);
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
  sel.value = currentVal;
}

// Add Staff button
document.getElementById('btn-add-staff').addEventListener('click', () => {
  staffForm.reset();
  document.getElementById('staff-id-field').value = '';
  document.getElementById('modal-staff-title').textContent = 'Yeni Personel Ekle';
  populateStaffRoles();
  openModal('modal-staff');
});

// Save Staff
document.getElementById('btn-save-staff').addEventListener('click', async (e) => {
  e.preventDefault();

  const id = document.getElementById('staff-id-field').value;
  const full_name = document.getElementById('staff-name-field').value.trim();
  const role = document.getElementById('staff-role').value;
  const phone = document.getElementById('staff-phone').value.trim();
  const commission_rate = document.getElementById('staff-rate').value;
  const monthly_salary = cleanValue('staff-salary');

  if (!full_name) {
    document.getElementById('staff-name-error').style.display = 'block';
    return;
  }
  document.getElementById('staff-name-error').style.display = 'none';

  const data = { full_name, role, phone, commission_rate, monthly_salary };

  showSaving();
  if (id) {
    await window.toprak.updateStaff(Number(id), data);
    showToast('Personel bilgileri güncellendi.');
  } else {
    await window.toprak.addStaff(data);
    showToast('Personel başarıyla kaydedildi ✓');
  }
  hideSaving();

  closeModal('modal-staff');
  loadStaff();
});

// Edit Staff
function editStaff(id) {
  const s = state.staff.find(item => item.id === id);
  if (!s) return;

  document.getElementById('staff-id-field').value = s.id;
  document.getElementById('staff-name-field').value = s.full_name;
  populateStaffRoles();
  document.getElementById('staff-role').value = s.role;
  document.getElementById('staff-phone').value = s.phone;
  document.getElementById('staff-rate').value = s.commission_rate;
  document.getElementById('staff-salary').value = s.monthly_salary;

  document.getElementById('modal-staff-title').textContent = 'Personel Bilgilerini Düzenle';
  openModal('modal-staff');
}

// Delete Staff
function deleteStaff(id) {
  const s = state.staff.find(item => item.id === id);
  if (!s) return;

  openConfirmModal(
    'Personeli Sil',
    `"${s.full_name}" isimli personeli silmek istediğinizden emin misiniz? İlişkili finansal primler silinmez.`,
    async () => {
      const success = await window.toprak.deleteStaff(id);
      if (success) {
        showToast('Kayıt silindi', 'error');
        loadStaff();
      } else {
        showToast('Silme işlemi başarısız.', 'error');
      }
    }
  );
}


// ==========================================
// 📈 GÖRÜNÜM 5: RAPORLAR (Reports)
// ==========================================

// Date pickers hooks
document.getElementById('report-year').addEventListener('change', loadReports);
document.getElementById('report-month').addEventListener('change', loadReports);

async function loadReports() {
  const year = document.getElementById('report-year').value;
  const month = document.getElementById('report-month').value;
  
  // Set label
  const periodLabel = document.getElementById('report-period-label');
  if (month) {
    periodLabel.textContent = `Dönem: ${turkishMonths[parseInt(month, 10) - 1]} ${year}`;
  } else {
    periodLabel.textContent = `Dönem: ${year} Yılı Geneli`;
  }

  // Define filters
  const filters = {};
  if (month) {
    filters.startDate = `${year}-${month}-01`;
    filters.endDate = `${year}-${month}-31`;
  } else {
    filters.startDate = `${year}-01-01`;
    filters.endDate = `${year}-12-31`;
  }

  const transactions = await window.toprak.getTransactions(filters);
  const properties = await window.toprak.getProperties();
  const staff = await window.toprak.getStaff();

  // 1. Calculate Profit & Loss Statements
  let totalIncome = 0;
  let totalExpense = 0;

  // Breakdown aggregators
  const incomeCats = {};
  ['Gelir', 'Personel', 'Paket', 'Platform', 'İşletme'].forEach(k => (categoriesMap[k] || []).forEach(c => incomeCats[c] = 0));
  const expenseCats = {};
  (categoriesMap.Gider || []).forEach(c => expenseCats[c] = 0);

  // Property & Staff performance aggregators
  const propEarnings = {};
  properties.forEach(p => propEarnings[p.id] = { name: p.name, type: p.type, status: p.status, amount: 0 });
  
  const staffEarnings = {};
  staff.forEach(s => staffEarnings[s.id] = { name: s.full_name, role: s.role, rate: s.commission_rate, amount: 0 });

  transactions.forEach(t => {
    if (t.status !== 'Tamamlandı') return;

    if (isIncome(t.type)) {
      totalIncome += t.amount;
      if (incomeCats[t.category] !== undefined) {
        incomeCats[t.category] += t.amount;
      }
      
      // Property link
      if (t.property_id && propEarnings[t.property_id]) {
        propEarnings[t.property_id].amount += t.amount;
      }

      // Staff prim calculation
      if (t.staff_id && staffEarnings[t.staff_id]) {
        const cut = t.amount * (staffEarnings[t.staff_id].rate / 100.0);
        staffEarnings[t.staff_id].amount += cut;
      }
    } else if (isExpense(t.type)) {
      totalExpense += t.amount;
      if (expenseCats[t.category] !== undefined) {
        expenseCats[t.category] += t.amount;
      }
    }
  });

  const netProfit = totalIncome - totalExpense;

  // Render counters
  document.getElementById('report-total-income').textContent = formatCurrency(totalIncome);
  document.getElementById('report-total-expense').textContent = formatCurrency(totalExpense);
  
  const netProfitEl = document.getElementById('report-net-profit');
  netProfitEl.textContent = formatCurrency(netProfit);
  if (netProfit >= 0) {
    netProfitEl.style.color = 'var(--green-pos)';
  } else {
    netProfitEl.style.color = 'var(--red-neg)';
  }

  // 2. Render Gelir Raporu Table
  const incomeTbody = document.getElementById('report-income-table');
  incomeTbody.innerHTML = '';
  Object.keys(incomeCats).forEach(cat => {
    const val = incomeCats[cat];
    const pct = totalIncome > 0 ? ((val / totalIncome) * 100).toFixed(1) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cat}</td>
      <td style="font-weight: bold; font-family: var(--font-heading);">${formatCurrency(val)}</td>
      <td><span class="badge badge-income" style="font-size:9px;">%${pct}</span></td>
    `;
    incomeTbody.appendChild(tr);
  });

  // 3. Render Gider Raporu Table
  const expenseTbody = document.getElementById('report-expense-table');
  expenseTbody.innerHTML = '';
  Object.keys(expenseCats).forEach(cat => {
    const val = expenseCats[cat];
    const pct = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(1) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cat}</td>
      <td style="font-weight: bold; font-family: var(--font-heading);">${formatCurrency(val)}</td>
      <td><span class="badge badge-expense" style="font-size:9px;">%${pct}</span></td>
    `;
    expenseTbody.appendChild(tr);
  });

  // 4. Render Top 5 Properties
  const propTbody = document.getElementById('report-properties-table');
  propTbody.innerHTML = '';
  const sortedProps = Object.values(propEarnings)
    .filter(p => p.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  if (sortedProps.length === 0) {
    propTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text3);">Döneme ait mülk satışı bulunmuyor.</td></tr>';
  } else {
    sortedProps.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 500;">🏢 ${p.name}</td>
        <td><span class="badge badge-warning">${p.type} / ${p.status}</span></td>
        <td style="font-weight: bold; font-family: var(--font-heading); color: var(--green-pos);">${formatCurrency(p.amount)}</td>
      `;
      propTbody.appendChild(tr);
    });
  }

  // 5. Render Staff Performance
  const staffTbody = document.getElementById('report-staff-table');
  staffTbody.innerHTML = '';
  const sortedStaff = Object.values(staffEarnings).sort((a, b) => b.amount - a.amount);

  if (sortedStaff.length === 0) {
    staffTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text3);">Henüz personel bulunmuyor.</td></tr>';
  } else {
    sortedStaff.forEach(s => {
      const tr = document.createElement('tr');
      const amountClass = s.amount > 0 ? 'color: var(--green-pos);' : 'color: var(--text3);';
      tr.innerHTML = `
        <td style="font-weight: 500;">👤 ${s.name}</td>
        <td><span style="font-size: 11px; color: var(--text2)">${s.role} (%${s.rate})</span></td>
        <td style="font-weight: bold; font-family: var(--font-heading); ${amountClass}">${s.amount > 0 ? formatCurrency(s.amount) : '₺0 (prim yok)'}</td>
      `;
      staffTbody.appendChild(tr);
    });
  }
}

// Exports Handlers
document.getElementById('btn-export-csv').addEventListener('click', async () => {
  const year = document.getElementById('report-year').value;
  const month = document.getElementById('report-month').value;
  
  const filters = {};
  if (month) {
    filters.startDate = `${year}-${month}-01`;
    filters.endDate = `${year}-${month}-31`;
  } else {
    filters.startDate = `${year}-01-01`;
    filters.endDate = `${year}-12-31`;
  }

  const result = await window.toprak.exportCSV(filters);
  if (result.success) {
    showToast(`Rapor başarıyla CSV formatında dışa aktarıldı: ${result.path}`);
  } else {
    showToast(result.message, 'warning');
  }
});

document.getElementById('btn-export-pdf').addEventListener('click', async () => {
  showToast('Rapor PDF oluşturuluyor...');
  try {
    const year = document.getElementById('report-year').value;
    const month = document.getElementById('report-month').value;
    const monthNames = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const periodLabel = month ? `${monthNames[parseInt(month)]} ${year}` : `Tüm ${year} Yılı`;

    const filters = {};
    if (month) { filters.startDate = `${year}-${month}-01`; filters.endDate = `${year}-${month}-31`; }
    else { filters.startDate = `${year}-01-01`; filters.endDate = `${year}-12-31`; }

    const [transactions, properties, staff] = await Promise.all([
      window.toprak.getTransactions(filters),
      window.toprak.getProperties(),
      window.toprak.getStaff()
    ]);

    let totalIncome = 0, totalExpense = 0;
    const incomeCats = {}, expenseCats = {};
    ['Gelir', 'Personel', 'Paket', 'Platform', 'İşletme'].forEach(k => (categoriesMap[k] || []).forEach(c => incomeCats[c] = 0));
    (categoriesMap.Gider || []).forEach(c => expenseCats[c] = 0);
    const propEarnings = {};
    properties.forEach(p => propEarnings[p.id] = { name: p.name, type: p.type, amount: 0 });
    const staffEarnings = {};
    staff.forEach(s => staffEarnings[s.id] = { name: s.full_name, role: s.role, rate: s.commission_rate, amount: 0 });

    transactions.forEach(t => {
      if (t.status !== 'Tamamlandı') return;
      if (isIncome(t.type)) {
        totalIncome += t.amount;
        if (incomeCats[t.category] !== undefined) incomeCats[t.category] += t.amount;
        if (t.property_id && propEarnings[t.property_id]) propEarnings[t.property_id].amount += t.amount;
        if (t.staff_id && staffEarnings[t.staff_id]) staffEarnings[t.staff_id].amount += t.amount * (staffEarnings[t.staff_id].rate / 100);
      } else if (isExpense(t.type)) {
        totalExpense += t.amount;
        if (expenseCats[t.category] !== undefined) expenseCats[t.category] += t.amount;
      }
    });

    const fCur = v => '₺' + Number(v).toLocaleString('tr-TR');
    const maxIncome = Math.max(...Object.values(incomeCats), 1);
    const maxExpense = Math.max(...Object.values(expenseCats), 1);
    const sortedProps = Object.values(propEarnings).filter(p => p.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5);
    const sortedStaff = Object.values(staffEarnings).sort((a, b) => b.amount - a.amount);
    const now = new Date().toLocaleDateString('tr-TR');
    const netProfit = totalIncome - totalExpense;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Toprak Gayrimenkul Raporu</title>
<style>
  @page { margin: 15mm; size: A4; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; font-size: 11px; line-height: 1.5; margin: 0; padding: 0; }
  .header { text-align: center; border-bottom: 3px solid #8B1A1A; padding-bottom: 8px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; color: #8B1A1A; margin: 0 0 4px; letter-spacing: 1px; }
  .header .meta { font-size: 10px; color: #666; }
  .section { page-break-inside: avoid; margin-bottom: 18px; border: 1px solid #ccc; border-radius: 6px; padding: 12px; }
  .section h2 { font-size: 13px; color: #8B1A1A; margin: 0 0 10px; padding-bottom: 5px; border-bottom: 1px solid #ddd; }
  .summary-row { display: flex; justify-content: space-around; text-align: center; margin: 6px 0; }
  .summary-box { flex: 1; }
  .summary-box .label { font-size: 9px; color: #888; text-transform: uppercase; }
  .summary-box .value { font-size: 18px; font-weight: bold; }
  .pos { color: #2D6A2D; }
  .neg { color: #C0392B; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #8B1A1A; color: #fff; padding: 5px 6px; text-align: left; font-size: 10px; }
  td { padding: 4px 6px; border-bottom: 1px solid #eee; }
  .bar-container { background: #f0f0f0; border-radius: 3px; height: 14px; overflow: hidden; }
  .bar { height: 100%; border-radius: 3px; }
  .bar-income { background: #2D6A2D; }
  .bar-expense { background: #C0392B; }
  .footer { text-align: center; font-size: 9px; color: #999; margin-top: 30px; padding-top: 8px; border-top: 1px solid #ddd; }
</style></head><body>
<div class="header">
  <h1>TOPRAK GAYRİMENKUL</h1>
  <div style="font-size:12px; color:#555;">Finansal Rapor — ${periodLabel}</div>
  <div class="meta">Oluşturulma: ${now}</div>
</div>

<div class="section">
  <h2>Kâr / Zarar Tablosu</h2>
  <div class="summary-row">
    <div class="summary-box"><div class="label">Toplam Gelir</div><div class="value pos">${fCur(totalIncome)}</div></div>
    <div class="summary-box"><div class="label">Toplam Gider</div><div class="value neg">${fCur(totalExpense)}</div></div>
    <div class="summary-box"><div class="label">Net Dönem Kârı</div><div class="value ${netProfit >= 0 ? 'pos' : 'neg'}">${fCur(netProfit)}</div></div>
  </div>
</div>

<div class="section">
  <h2>Gelir Kalemleri Dağılımı</h2>
  <table><thead><tr><th>Kategori</th><th>Tutar</th><th>Pay</th></tr></thead><tbody>
  ${Object.keys(incomeCats).filter(c => incomeCats[c] > 0).map(c => `
    <tr><td>${c}</td><td style="font-weight:bold;">${fCur(incomeCats[c])}</td>
    <td><div class="bar-container"><div class="bar bar-income" style="width:${(incomeCats[c]/maxIncome*100).toFixed(1)}%;"></div></div>
    <span style="font-size:9px;color:#888;">${totalIncome > 0 ? ((incomeCats[c]/totalIncome)*100).toFixed(1) : 0}%</span></td></tr>
  `).join('')}
  </tbody></table>
</div>

<div class="section">
  <h2>Gider Kalemleri Dağılımı</h2>
  <table><thead><tr><th>Kategori</th><th>Tutar</th><th>Pay</th></tr></thead><tbody>
  ${Object.keys(expenseCats).filter(c => expenseCats[c] > 0).map(c => `
    <tr><td>${c}</td><td style="font-weight:bold;">${fCur(expenseCats[c])}</td>
    <td><div class="bar-container"><div class="bar bar-expense" style="width:${(expenseCats[c]/maxExpense*100).toFixed(1)}%;"></div></div>
    <span style="font-size:9px;color:#888;">${totalExpense > 0 ? ((expenseCats[c]/totalExpense)*100).toFixed(1) : 0}%</span></td></tr>
  `).join('')}
  </tbody></table>
</div>

<div class="section">
  <h2>En Çok Kazandıran Mülkler</h2>
  ${sortedProps.length === 0 ? '<p style="color:#999;">Döneme ait mülk satışı bulunmuyor.</p>' : `
  <table><thead><tr><th>Mülk</th><th>Tür / Durum</th><th>Toplam Gelir</th></tr></thead><tbody>
  ${sortedProps.map(p => `<tr><td>${p.name}</td><td style="color:#888;">${p.type}</td><td style="font-weight:bold;color:#2D6A2D;">${fCur(p.amount)}</td></tr>`).join('')}
  </tbody></table>`}
</div>

<div class="section" style="page-break-before: always;">
  <h2>Danışman Prim ve Kazanç Dağılımı</h2>
  ${sortedStaff.length === 0 ? '<p style="color:#999;">Personel bulunmuyor.</p>' : `
  <table><thead><tr><th>Personel</th><th>Rol</th><th>Komisyon</th><th>Kazanç</th></tr></thead><tbody>
  ${sortedStaff.map(s => `<tr><td>${s.name}</td><td style="color:#888;">${s.role}</td><td>%${s.rate}</td><td style="font-weight:bold;${s.amount > 0 ? 'color:#2D6A2D;' : 'color:#999;'}">${s.amount > 0 ? fCur(s.amount) : '₺0'}</td></tr>`).join('')}
  </tbody></table>`}
</div>

<div class="footer">© Toprak Gayrimenkul — Finansal Rapor ${periodLabel} | Oluşturulma: ${now}</div>
</body></html>`;

    const result = await window.toprak.generatePDF(html);
    if (result.success) {
      showToast('PDF kaydedildi: ' + result.path);
    } else {
      showToast(result.message, 'warning');
    }
  } catch (err) {
    showToast('PDF hatası: ' + err.message, 'error');
  }
});

// ==========================================
// 📄 GÖRÜNÜM 6: e-FATURA / e-ARŞİV
// ==========================================

async function loadInvoices() {
  const filters = {
    search: document.getElementById('inv-filter-search').value.trim(),
    type: document.getElementById('inv-filter-type').value,
    status: document.getElementById('inv-filter-status').value
  };

  const data = await window.toprak.getInvoices(filters);
  state.invoices = data;

  const tbody = document.getElementById('invoices-table-body');
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text3); padding: 30px 0;">Fatura bulunamadı.</td></tr>';
    updateMassDeleteBtn('inv');
    return;
  }

  const frag = document.createDocumentFragment();
  data.forEach(inv => {
    const tr = document.createElement('tr');
    let statusBadge = '';
    if (inv.status === 'Taslak') statusBadge = '<span class="badge badge-warning">Taslak</span>';
    else if (inv.status === 'Gonderildi') statusBadge = '<span class="badge badge-success">Gönderildi</span>';
    else if (inv.status === 'Iptal') statusBadge = '<span class="badge badge-danger">İptal</span>';

    tr.innerHTML = `
      <td><input type="checkbox" class="select-item" data-id="${inv.id}" data-type="inv" onchange="updateMassDeleteBtn('inv')"></td>
      <td style="font-weight: 500;">${inv.number}</td>
      <td><span class="badge ${inv.type === 'e-Fatura' ? 'badge-income' : 'badge-expense'}">${inv.type}</span></td>
      <td>${inv.customer_name}</td>
      <td style="font-weight: bold; font-family: var(--font-heading);">${formatCurrency(inv.amount)}</td>
      <td>${statusBadge}</td>
      <td>${formatDate(inv.issue_date)}</td>
      <td>
        <div class="action-icons">
          <button class="action-btn edit-btn" onclick="editInvoice(${inv.id})">✏️</button>
          <button class="action-btn delete-btn" onclick="deleteInvoice(${inv.id})">🗑️</button>
        </div>
      </td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
  updateMassDeleteBtn('inv');
}

// Invoice filter listeners
const debouncedInvSearch = debounce(loadInvoices, 300);
document.getElementById('inv-filter-search').addEventListener('input', debouncedInvSearch);
document.getElementById('inv-filter-type').addEventListener('change', loadInvoices);
document.getElementById('inv-filter-status').addEventListener('change', loadInvoices);
document.getElementById('btn-clear-inv-filters').addEventListener('click', () => {
  document.getElementById('inv-filter-search').value = '';
  document.getElementById('inv-filter-type').value = '';
  document.getElementById('inv-filter-status').value = '';
  loadInvoices();
});

// Add Invoice button
document.getElementById('btn-add-invoice').addEventListener('click', () => {
  document.getElementById('form-invoice').reset();
  document.getElementById('inv-id').value = '';
  document.getElementById('modal-invoice-title').textContent = 'Yeni Fatura Ekle';
  document.getElementById('inv-issue-date').value = new Date().toISOString().substring(0, 10);
  document.getElementById('inv-number').value = 'FAT-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4);
  openModal('modal-invoice');
});

// Save Invoice
document.getElementById('btn-save-invoice').addEventListener('click', async (e) => {
  e.preventDefault();
  const id = document.getElementById('inv-id').value;
  const data = {
    number: document.getElementById('inv-number').value.trim(),
    type: document.getElementById('inv-type').value,
    customer_name: document.getElementById('inv-customer').value.trim(),
    customer_tax_id: document.getElementById('inv-tax-id').value.trim(),
    amount: cleanValue('inv-amount'),
    status: document.getElementById('inv-status').value,
    issue_date: document.getElementById('inv-issue-date').value,
    due_date: document.getElementById('inv-due-date').value,
    customer_address: document.getElementById('inv-address').value.trim(),
    description: document.getElementById('inv-desc').value.trim(),
    notes: document.getElementById('inv-notes').value.trim()
  };

  if (!data.number || !data.customer_name || !data.amount) {
    showToast('Lütfen gerekli alanları doldurun.', 'error');
    return;
  }

  showSaving();
  if (id) {
    await window.toprak.updateInvoice(Number(id), data);
    showToast('Fatura güncellendi.');
  } else {
    await window.toprak.addInvoice(data);
    showToast('Fatura başarıyla kaydedildi ✓');
  }
  hideSaving();
  closeModal('modal-invoice');
  loadInvoices();
});

// Edit Invoice
async function editInvoice(id) {
  const inv = state.invoices.find(i => i.id === id);
  if (!inv) return;

  document.getElementById('inv-id').value = inv.id;
  document.getElementById('inv-number').value = inv.number;
  document.getElementById('inv-type').value = inv.type;
  document.getElementById('inv-customer').value = inv.customer_name;
  document.getElementById('inv-tax-id').value = inv.customer_tax_id;
  document.getElementById('inv-amount').value = inv.amount;
  document.getElementById('inv-status').value = inv.status;
  document.getElementById('inv-issue-date').value = inv.issue_date;
  document.getElementById('inv-due-date').value = inv.due_date;
  document.getElementById('inv-address').value = inv.customer_address;
  document.getElementById('inv-desc').value = inv.description;
  document.getElementById('inv-notes').value = inv.notes;

  document.getElementById('modal-invoice-title').textContent = 'Faturayı Düzenle';
  openModal('modal-invoice');
}

// Delete Invoice
function deleteInvoice(id) {
  const inv = state.invoices.find(i => i.id === id);
  openConfirmModal('Faturayı Sil', `"${inv.number}" numaralı faturayı silmek istediğinizden emin misiniz?`, async () => {
    const success = await window.toprak.deleteInvoice(id);
    if (success) {
      showToast('Fatura silindi', 'error');
      loadInvoices();
    }
  });
}

// ==========================================
// 🎵 EDM PORTAL — Webview + Fatura Yönetim Merkezi
// ==========================================

let edmWebview = null;

function edmGoBack() { try { document.getElementById('edm-webview').goBack(); } catch(_) {} }
function edmGoForward() { try { document.getElementById('edm-webview').goForward(); } catch(_) {} }
function edmReload() { try { document.getElementById('edm-webview').reload(); } catch(_) {} }

async function loadEdmPortal() {
  const container = document.getElementById('edmportal-content');
  if (!container) return;
  // The webview is already in the HTML; just update URL display
  const wv = document.getElementById('edm-webview');
  if (!wv) return;
  edmWebview = wv;

  const urlInput = document.getElementById('edm-url');
  const loadingSpan = document.getElementById('edm-loading');

  wv.addEventListener('did-start-loading', () => {
    if (loadingSpan) loadingSpan.style.display = 'inline';
  });
  wv.addEventListener('did-stop-loading', () => {
    if (loadingSpan) loadingSpan.style.display = 'none';
    try {
      if (urlInput) urlInput.value = wv.getURL();
    } catch(_) {}
  });
  wv.addEventListener('did-navigate', (e) => {
    if (urlInput) urlInput.value = e.url;
  });
  wv.addEventListener('page-title-updated', (e) => {
    if (urlInput) urlInput.value = wv.getURL();
  });

  try {
    if (urlInput) urlInput.value = wv.getURL();
  } catch(_) {}

  // Listen for downloads from webview
  wv.addEventListener('will-redirect', (e) => {});

  // Auto-restore cookies on load
  const restored = await loadEdmCookies(true);
  if (restored && restored.count > 0) {
    wv.reload();
  }
}

// ==========================================
// 🍪 EDM Cookie Save/Load
// ==========================================

async function saveEdmCookies() {
  const result = await window.toprak.saveEdmCookies();
  if (result.success) {
    showToast(`🍪 ${result.count} çerez kaydedildi`, 'success');
  } else {
    showToast('Çerez kaydedilemedi: ' + result.error, 'error');
  }
}

async function loadEdmCookies(silent) {
  const result = await window.toprak.loadEdmCookies();
  if (!silent) {
    if (result.success) {
      showToast(`🍪 ${result.count} çerez yüklendi, sayfa yenileniyor...`, 'success');
      const wv = document.getElementById('edm-webview');
      if (wv) wv.reload();
    } else {
      showToast('Çerez yüklenemedi: ' + result.error, 'error');
    }
  }
  return result;
}

// ==========================================
// 🔑 Password Manager
// ==========================================

function showPasswordManager() {
  const panel = document.getElementById('edm-password-panel');
  if (panel) panel.style.display = 'block';
  refreshPasswordList();
}

function hidePasswordManager() {
  const panel = document.getElementById('edm-password-panel');
  if (panel) panel.style.display = 'none';
}

async function addPassword() {
  const key = document.getElementById('pwd-key')?.value.trim();
  const username = document.getElementById('pwd-username')?.value.trim();
  const password = document.getElementById('pwd-password')?.value.trim();
  if (!key || !username || !password) {
    showToast('Lütfen etiket, kullanıcı adı ve şifre girin', 'error');
    return;
  }
  const result = await window.toprak.savePassword({ key, username, password, site: 'edmbilisim' });
  if (result.success) {
    showToast('🔑 Şifre kaydedildi', 'success');
    document.getElementById('pwd-key').value = '';
    document.getElementById('pwd-username').value = '';
    document.getElementById('pwd-password').value = '';
    refreshPasswordList();
  } else {
    showToast('Şifre kaydedilemedi: ' + result.error, 'error');
  }
}

async function refreshPasswordList() {
  const container = document.getElementById('pwd-list');
  if (!container) return;
  const result = await window.toprak.getPasswords();
  if (!result.success) {
    container.innerHTML = '<span style="color:var(--text3);font-size:12px;">Yüklenemedi</span>';
    return;
  }
  if (result.passwords.length === 0) {
    container.innerHTML = '<span style="color:var(--text3);font-size:12px;">Kayıtlı şifre yok</span>';
    return;
  }
  container.innerHTML = result.passwords.map(p => `
    <div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:var(--bg2);border-radius:4px;border:1px solid var(--border);font-size:12px;">
      <strong style="min-width:60px;">${escHtml(p.key)}</strong>
      <span style="flex:1;color:var(--text2);">${escHtml(p.username)}</span>
      <span style="color:var(--text3);font-family:monospace;">${'•'.repeat(p.password.length > 12 ? 8 : p.password.length)}</span>
      <button class="btn btn-sm" onclick="copyPassword('${escHtml(p.key.replace(/'/g, "\\'"))}')" title="Şifreyi Kopyala" style="padding:2px 6px;font-size:11px;">📋</button>
      <button class="btn btn-sm" onclick="fillPassword('${escHtml(p.key.replace(/'/g, "\\'"))}')" title="Webview'a Doldur" style="padding:2px 6px;font-size:11px;">🔑</button>
      <button class="btn btn-sm" onclick="deletePassword('${escHtml(p.key.replace(/'/g, "\\'"))}')" title="Sil" style="padding:2px 6px;font-size:11px;color:#e74c3c;">🗑</button>
    </div>
  `).join('');
}

async function deletePassword(key) {
  if (!confirm(`"${key}" şifresini silmek istediğinize emin misiniz?`)) return;
  const result = await window.toprak.deletePassword(key);
  if (result.success) {
    showToast('Şifre silindi', 'info');
    refreshPasswordList();
  }
}

async function copyPassword(key) {
  const result = await window.toprak.getPasswords();
  const pwd = result.passwords.find(p => p.key === key);
  if (pwd) {
    try {
      await navigator.clipboard.writeText(pwd.password);
      showToast('📋 Şifre kopyalandı', 'success');
    } catch (_) {
      showToast('Kopyalama başarısız', 'error');
    }
  }
}

async function fillPassword(key) {
  const result = await window.toprak.getPasswords();
  const pwd = result.passwords.find(p => p.key === key);
  if (!pwd) return;
  const wv = document.getElementById('edm-webview');
  if (!wv) return;
  showToast('🔑 Şifre webview\'a dolduruluyor...', 'info');
  try {
    wv.executeJavaScript(`
      (function() {
        const fill = (sel, val) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          const tag = el.tagName.toLowerCase();
          if (tag === 'input' || tag === 'textarea') {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            el.textContent = val;
          }
          return true;
        };
        const u = ${JSON.stringify(pwd.username)};
        const p = ${JSON.stringify(pwd.password)};
        let filled = 0;
        if (fill('input[type="text"][name*="kullanici" i], input[type="text"][name*="user" i], input[type="text"][name*="username" i], input[type="email" i], input[type="text"]:first-of-type', u)) filled++;
        if (fill('input[type="password"]', p)) filled++;
        return filled;
      })();
    `).catch(() => {});
  } catch (_) {}
}

async function autoFillEdm() {
  const result = await window.toprak.getPasswords();
  const edmPwd = result.passwords.find(p => p.key === 'edm' || p.site === 'edmbilisim');
  if (edmPwd) {
    await fillPassword(edmPwd.key);
  } else {
    showToast('Kayıtlı EDM şifresi bulunamadı. Önce şifre ekleyin.', 'error');
  }
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ==========================================
// 📥 DOSYA İÇE AKTARMA (XML/CSV/Excel/Görsel/PDF)
// ==========================================

let importFileData = null;
let importFolderFilesData = [];

async function importSingleFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.xml,.csv,.txt,.xls,.xlsx,.xlm,.xlsm,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.html,.htm,.zip,.rar,.json,.edi';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const result = await window.toprak.parseImportFile(file.path);
    if (result.success) {
      showImportModal(result);
    } else {
      showToast(result.message, 'error');
    }
  };
  input.click();
}

async function importFolderFiles() {
  const folder = await window.toprak.selectWatchFolder();
  if (!folder) return;
  const result = await window.toprak.scanImportFolder(folder);
  if (!result.success) {
    showToast(result.message, 'error');
    return;
  }
  if (result.total === 0) {
    showToast('Klasörde desteklenen dosya bulunamadı.', 'error');
    return;
  }
  importFolderFilesData = result.files;
  const list = document.getElementById('import-folder-list');
  list.innerHTML = `<p style="color:var(--text3);margin-bottom:10px;">${result.total} dosya bulundu. Her birini ayrı ayrı içe aktarabilirsiniz.</p>
    <div style="display:flex;flex-direction:column;gap:6px;">
      ${result.files.map((f, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg2);border-radius:6px;border:1px solid var(--border);font-size:13px;">
          <span style="flex:1;">${getFileIcon(f.ext)} ${f.fileName}</span>
          <span style="font-size:11px;color:var(--text3);">${(f.size / 1024).toFixed(1)} KB</span>
          <button class="btn btn-sm" onclick="showImportModalFromFolder(${i})" style="padding:2px 8px;font-size:12px;">İçe Aktar</button>
        </div>
      `).join('')}
    </div>`;
  openModal('modal-import-folder');
}

function getFileIcon(ext) {
  const icons = { '.pdf':'📄','.xml':'📋','.csv':'📊','.txt':'📝','.xls':'📗','.xlsx':'📗','.xlm':'📗','.xlsm':'📗','.jpg':'🖼️','.jpeg':'🖼️','.png':'🖼️','.gif':'🖼️','.bmp':'🖼️','.tiff':'🖼️','.html':'🌐','.htm':'🌐','.zip':'📦','.rar':'📦','.json':'📋','.edi':'📋' };
  return icons[ext] || '📄';
}

async function showImportModalFromFolder(index) {
  closeModal('modal-import-folder');
  const f = importFolderFilesData[index];
  if (!f) return;
  const result = await window.toprak.parseImportFile(f.filePath);
  if (result.success) {
    showImportModal(result);
  } else {
    showToast(result.message, 'error');
  }
}

function showImportModal(data) {
  importFileData = data;
  document.getElementById('import-file-name').textContent = getFileIcon(data.ext) + ' ' + data.fileName;
  const metaParts = [];
  metaParts.push((data.size / 1024).toFixed(1) + ' KB');
  metaParts.push(data.ext.toUpperCase());
  if (data.preview) metaParts.push('· ' + data.preview);
  document.getElementById('import-file-meta').textContent = metaParts.join(' ');
  document.getElementById('import-type-select').value = data.detectedType === 'fatura' ? 'fatura' : data.detectedType === 'csv' ? 'gelir' : 'dosyala';
  buildImportFields(data);
  document.getElementById('modal-import-title').textContent = '📥 ' + data.fileName;
  openModal('modal-import-file');
}

function buildImportFields(data) {
  const container = document.getElementById('import-fields-container');
  const type = document.getElementById('import-type-select').value;
  if (type === 'dosyala') {
    container.innerHTML = `<p style="color:var(--text3);font-size:13px;">Dosya sadece klasöre taşınacak, veritabanına kaydedilmeyecek.</p>`;
    return;
  }
  const parsed = data.parsed;
  let html = '';
  if (type === 'fatura') {
    const p = parsed || {};
    html = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Fatura Türü</label><select id="import-f-type" class="filter-control"><option value="e-Arsiv">e-Arşiv</option><option value="e-Fatura">e-Fatura</option></select></div>
        <div class="form-group"><label>Fatura No</label><input type="text" id="import-f-no" class="form-control" value="${p.invoiceNo || ''}"></div>
        <div class="form-group"><label>Fatura Tarihi</label><input type="date" id="import-f-date" class="form-control" value="${p.date || new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Son Ödeme</label><input type="date" id="import-f-due" class="form-control" value=""></div>
        <div class="form-group"><label>Gönderen / Tedarikçi</label><input type="text" id="import-f-supplier" class="form-control" value="${p.supplier || ''}"></div>
        <div class="form-group"><label>Alıcı / Müşteri</label><input type="text" id="import-f-customer" class="form-control" value="${p.customer || ''}"></div>
        <div class="form-group"><label>Vergi No</label><input type="text" id="import-f-taxid" class="form-control" value="${p.taxId || ''}"></div>
        <div class="form-group"><label>Tutar (₺)</label><input type="number" id="import-f-amount" class="form-control" value="${p.amount || ''}" step="0.01"></div>
        <div class="form-group"><label>Durum</label><select id="import-f-status" class="filter-control"><option value="Taslak">Taslak</option><option value="Gonderildi">Gönderildi</option><option value="Iptal">İptal</option></select></div>
      </div>`;
  } else if (type === 'gelir' || type === 'gider') {
    const isCsv = data.detectedType === 'csv';
    if (isCsv && parsed && parsed.rows) {
      html = `<p style="color:var(--text3);font-size:13px;margin-bottom:10px;">CSV'den ${parsed.rows.length} satır bulundu. İlk satır önizleme:</p>
        <div style="max-height:180px;overflow-y:auto;margin-bottom:12px;border:1px solid var(--border);border-radius:6px;">
          <table class="data-table"><thead><tr>${parsed.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${parsed.rows.slice(0, 5).map(r => `<tr>${parsed.headers.map(h => `<td>${r[h] || ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label>Tarih Sütunu</label><select id="import-csv-date" class="filter-control">${parsed.headers.map(h => `<option value="${h}" ${h.includes('tarih')||h.includes('date')?'selected':''}>${h}</option>`).join('')}</select></div>
          <div class="form-group"><label>Tutar Sütunu</label><select id="import-csv-amount" class="filter-control">${parsed.headers.map(h => `<option value="${h}" ${h.includes('tutar')||h.includes('amount')||h.includes('miktar')?'selected':''}>${h}</option>`).join('')}</select></div>
          <div class="form-group"><label>Açıklama Sütunu</label><select id="import-csv-desc" class="filter-control"><option value="">— Seçilmedi —</option>${parsed.headers.map(h => `<option value="${h}" ${h.includes('aciklama')||h.includes('description')?'selected':''}>${h}</option>`).join('')}</select></div>
          <div class="form-group"><label>Kategori</label><select id="import-tx-category" class="filter-control"><option value="Diğer Gelir" ${type==='gelir'?'selected':''}>Diğer Gelir</option><option value="Diğer Gider" ${type==='gider'?'selected':''}>Diğer Gider</option></select></div>
        </div>`;
    } else {
      html = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label>Tarih</label><input type="date" id="import-tx-date" class="form-control" value="${new Date().toISOString().slice(0,10)}"></div>
          <div class="form-group"><label>Tutar (₺)</label><input type="number" id="import-tx-amount" class="form-control" value="" step="0.01"></div>
          <div class="form-group" style="grid-column:1/-1;"><label>Açıklama</label><input type="text" id="import-tx-desc" class="form-control" value="" placeholder="İşlem açıklaması"></div>
          <div class="form-group"><label>Kategori</label><select id="import-tx-category2" class="filter-control"><option value="Diğer Gelir" ${type==='gelir'?'selected':''}>Diğer Gelir</option><option value="Diğer Gider" ${type==='gider'?'selected':''}>Diğer Gider</option></select></div>
          <div class="form-group"><label>Durum</label><select id="import-tx-status" class="filter-control"><option value="Tamamlandı">Tamamlandı</option><option value="Bekliyor">Bekliyor</option></select></div>
        </div>`;
    }
  } else if (type === 'cari') {
    html = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Firma Adı</label><input type="text" id="import-c-firma" class="form-control" value="${(parsed && (parsed.supplier || parsed.customer)) || ''}"></div>
        <div class="form-group"><label>Tutar (₺)</label><input type="number" id="import-c-amount" class="form-control" value="${(parsed && parsed.amount) || ''}" step="0.01"></div>
        <div class="form-group"><label>İşlem Türü</label><select id="import-c-type" class="filter-control"><option value="Borc">Borç (Ödeme)</option><option value="Alacak">Alacak (Tahsilat)</option></select></div>
        <div class="form-group"><label>Tarih</label><input type="date" id="import-c-date" class="form-control" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group" style="grid-column:1/-1;"><label>Açıklama</label><input type="text" id="import-c-desc" class="form-control" value="" placeholder="Hareket açıklaması"></div>
      </div>`;
  }
  container.innerHTML = html;
}

function onImportTypeChange() {
  buildImportFields(importFileData);
}

async function saveImportFile() {
  if (!importFileData) return;
  const type = document.getElementById('import-type-select').value;
  showSaving();

  try {
    if (type === 'dosyala') {
      const config = await window.toprak.getAutoFileConfig();
      if (config.folder) {
        const company = await window.toprak.getActiveCompany();
        const cname = company ? company.name : 'Bilinmeyen';
        const year = new Date().getFullYear();
        const targetFolder = `${config.folder}\\${cname} ${year} Fatura`;
        const result = await window.toprak.moveImportFile({ filePath: importFileData.filePath, targetFolder });
        if (result.success) {
          showToast('Dosya klasöre taşındı.');
        } else {
          showToast('Dosya taşınamadı: ' + result.message, 'error');
          hideSaving();
          return;
        }
      } else {
        showToast('Lütfen önce bir izleme klasörü belirleyin.', 'error');
        hideSaving();
        return;
      }
    } else if (type === 'fatura') {
      const data = {
        number: document.getElementById('import-f-no').value,
        type: document.getElementById('import-f-type').value,
        customer_name: document.getElementById('import-f-supplier').value || document.getElementById('import-f-customer').value,
        customer_tax_id: document.getElementById('import-f-taxid').value,
        amount: parseFloat(document.getElementById('import-f-amount').value) || 0,
        status: document.getElementById('import-f-status').value,
        issue_date: document.getElementById('import-f-date').value,
        due_date: document.getElementById('import-f-due').value,
        description: importFileData.fileName
      };
      await window.toprak.addInvoice(data);
      showToast('✅ Fatura içe aktarıldı.');
    } else if (type === 'gelir' || type === 'gider') {
      const isCsv = importFileData.detectedType === 'csv' && document.getElementById('import-csv-date');
      if (isCsv) {
        const dateCol = document.getElementById('import-csv-date').value;
        const amtCol = document.getElementById('import-csv-amount').value;
        const descCol = document.getElementById('import-csv-desc').value;
        const category = document.getElementById('import-tx-category').value;
        const parsed = importFileData.parsed;
        if (parsed && parsed.rows) {
          const company = await window.toprak.getActiveCompany();
          let ok = 0, err = 0;
          for (const row of parsed.rows) {
            let d = row[dateCol] || new Date().toISOString().slice(0,10);
            if (/^\d{2}\.\d{2}\.\d{4}$/.test(d)) { const [dd,mm,yy] = d.split('.'); d = `${yy}-${mm}-${dd}`; }
            const amt = parseFloat(String(row[amtCol] || '0').replace(/[^0-9,\-\.]/g, '').replace(',', '.')) || 0;
            const desc = descCol ? (row[descCol] || 'CSV İçe Aktarma') : 'CSV İçe Aktarma';
            if (amt === 0) { err++; continue; }
            await window.toprak.addTransaction({
              company_id: company.id, date: d, description: desc,
              type: amt > 0 ? 'Gelir' : 'Gider', category, amount: Math.abs(amt),
              status: 'Tamamlandı', note: 'CSV içe aktarma'
            });
            ok++;
          }
          showToast(`✅ ${ok} işlem içe aktarıldı${err > 0 ? `, ${err} atlandı.` : '.'}`);
        }
      } else {
        const data = {
          company_id: (await window.toprak.getActiveCompany()).id,
          date: document.getElementById('import-tx-date').value,
          description: document.getElementById('import-tx-desc').value || 'İçe Aktarma',
          type: type === 'gelir' ? 'Gelir' : 'Gider',
          category: document.getElementById('import-tx-category2').value,
          amount: parseFloat(document.getElementById('import-tx-amount').value) || 0,
          status: document.getElementById('import-tx-status').value,
          note: importFileData.fileName
        };
        await window.toprak.addTransaction(data);
        showToast('✅ İşlem içe aktarıldı.');
      }
    } else if (type === 'cari') {
      const data = {
        company_id: (await window.toprak.getActiveCompany()).id,
        date: document.getElementById('import-c-date').value,
        type: document.getElementById('import-c-type').value === 'Borc' ? 'Borc' : 'Alacak',
        amount: parseFloat(document.getElementById('import-c-amount').value) || 0,
        description: document.getElementById('import-c-desc').value || importFileData.fileName
      };
      // We need to create or find an account first
      const firma = document.getElementById('import-c-firma').value;
      const accounts = await window.toprak.getAccounts();
      let acc = accounts.find(a => a.company_name.toLowerCase() === firma.toLowerCase());
      if (!acc) {
        const newId = await window.toprak.addAccount({
          company_id: data.company_id, type: 'Musteri',
          company_name: firma || 'İçe Aktarılan',
          opening_balance: 0
        });
        acc = { id: newId, company_name: firma || 'İçe Aktarılan' };
      }
      data.account_id = acc.id;
      await window.toprak.addAccountTransaction(data);
      showToast('✅ Cari hesap hareketi içe aktarıldı.');
    }

    closeModal('modal-import-file');
    importFileData = null;
    // Reload current view if relevant
    if (state.currentView === 'einvoice') loadInvoices();
    else if (state.currentView === 'transactions') loadTransactions();
    else if (state.currentView === 'accounts') loadAccountsView();
  } catch (err) {
    showToast('Hata: ' + err.message, 'error');
  }
  hideSaving();
}

// ==========================================
// 📋 GÖRÜNÜM 7: CARİ HESAP YÖNETİMİ
// ==========================================

async function loadAccountsView() {
  const data = await window.toprak.getAccounts();
  state.accounts = data;

  const grid = document.getElementById('accounts-grid');
  grid.innerHTML = '';

  if (data.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text3); padding: 40px;">Kayıtlı cari hesap bulunamadı.</div>';
    return;
  }

  data.forEach(acc => {
    const card = document.createElement('div');
    card.className = 'staff-card';
    const balance = Number(acc.balance) || 0;
    const balanceStr = balance >= 0 ? formatCurrency(balance) : '-' + formatCurrency(Math.abs(balance));
    const balanceClass = balance >= 0 ? 'income' : '';

    card.innerHTML = `
      <div class="card-checkbox-wrapper">
        <input type="checkbox" class="select-item" data-id="${acc.id}" data-type="acc" onchange="updateMassDeleteBtn('acc')">
      </div>
      <div class="avatar-large" style="background: var(--accent);">${acc.company_name.substring(0, 2).toUpperCase()}</div>
      <div class="staff-name">${acc.company_name}</div>
      <span class="staff-role-badge">${acc.type === 'Musteri' ? 'Müşteri' : 'Tedarikçi'}</span>
      <div class="staff-contact">📞 ${acc.phone || 'Telefon yok'}</div>
      <div class="staff-financials">
        <div class="staff-financial-item">
          <span class="staff-financial-label">Bakiye</span>
          <span class="staff-financial-val ${balanceClass}" style="font-size: 16px;">${balanceStr}</span>
        </div>
      </div>
      <div class="staff-card-actions" style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
        <button class="action-btn" style="font-size:12px; padding: 4px 8px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="showAccountDetail(${acc.id})">Hareketler</button>
        <button class="action-btn edit-btn" style="font-size:16px;" onclick="editAccount(${acc.id})">✏️</button>
        <button class="action-btn delete-btn" style="font-size:16px;" onclick="deleteAccount(${acc.id})">🗑️</button>
      </div>
    `;
    grid.appendChild(card);
  });
  updateMassDeleteBtn('acc');
}

// Add Account
document.getElementById('btn-add-account').addEventListener('click', () => {
  document.getElementById('form-account').reset();
  document.getElementById('acc-id').value = '';
  document.getElementById('modal-account-title').textContent = 'Yeni Cari Hesap Ekle';
  openModal('modal-account');
});

// Save Account
document.getElementById('btn-save-account').addEventListener('click', async (e) => {
  e.preventDefault();
  const id = document.getElementById('acc-id').value;
  const data = {
    company_name: document.getElementById('acc-company').value.trim(),
    type: document.getElementById('acc-type').value,
    contact_person: document.getElementById('acc-contact').value.trim(),
    phone: document.getElementById('acc-phone').value.trim(),
    email: document.getElementById('acc-email').value.trim(),
    tax_id: document.getElementById('acc-tax-id').value.trim(),
    tax_office: document.getElementById('acc-tax-office').value.trim(),
    address: document.getElementById('acc-address').value.trim(),
    notes: document.getElementById('acc-notes').value.trim(),
    opening_balance: cleanValue('acc-balance')
  };

  if (!data.company_name) {
    showToast('Firma adı gerekli.', 'error');
    return;
  }

  showSaving();
  if (id) {
    await window.toprak.updateAccount(Number(id), data);
    showToast('Cari hesap güncellendi.');
  } else {
    await window.toprak.addAccount(data);
    showToast('Cari hesap başarıyla kaydedildi ✓');
  }
  hideSaving();
  closeModal('modal-account');
  loadAccountsView();
});

// Edit Account
async function editAccount(id) {
  const acc = state.accounts.find(a => a.id === id);
  if (!acc) return;

  document.getElementById('acc-id').value = acc.id;
  document.getElementById('acc-company').value = acc.company_name;
  document.getElementById('acc-type').value = acc.type;
  document.getElementById('acc-contact').value = acc.contact_person;
  document.getElementById('acc-phone').value = acc.phone;
  document.getElementById('acc-email').value = acc.email;
  document.getElementById('acc-tax-id').value = acc.tax_id;
  document.getElementById('acc-tax-office').value = acc.tax_office;
  document.getElementById('acc-address').value = acc.address;
  document.getElementById('acc-notes').value = acc.notes;
  document.getElementById('acc-balance').value = acc.opening_balance;

  document.getElementById('modal-account-title').textContent = 'Cari Hesabı Düzenle';
  openModal('modal-account');
}

// Delete Account
function deleteAccount(id) {
  const acc = state.accounts.find(a => a.id === id);
  openConfirmModal('Cari Hesabı Sil', `"${acc.company_name}" isimli cari hesabı silmek istediğinizden emin misiniz?`, async () => {
    const success = await window.toprak.deleteAccount(id);
    if (success) {
      showToast('Cari hesap silindi', 'error');
      loadAccountsView();
    }
  });
}

// Show Account Detail (Transactions)
let activeAccountId = null;

async function showAccountDetail(id) {
  activeAccountId = id;
  const acc = state.accounts.find(a => a.id === id);
  if (!acc) return;

  try {
    const txs = await window.toprak.getAccountTransactions(id);
    const balance = Number(acc.balance) || 0;
    const balanceStr = balance >= 0 ? formatCurrency(balance) : '-' + formatCurrency(Math.abs(balance));

    let totalBorc = 0;
    let totalAlacak = 0;
    txs.forEach(t => {
      if (t.type === 'Borc') totalBorc += t.amount;
      else if (t.type === 'Alacak') totalAlacak += t.amount;
    });

    document.getElementById('acc-detail-title').textContent = acc.company_name;
    document.getElementById('acc-detail-header').innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <div>
          <span class="badge ${acc.type === 'Musteri' ? 'badge-income' : 'badge-expense'}">${acc.type === 'Musteri' ? 'Müşteri' : 'Tedarikçi'}</span>
          <span style="margin-left: 10px; font-size: 11px; color: var(--text3);">${acc.phone || ''} ${acc.email ? '| ' + acc.email : ''}</span>
        </div>
        <button class="btn" style="width: auto; padding: 8px 16px;" onclick="showAddAccountTxForm()">+ Hareket Ekle</button>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px;">
        <div style="padding: 10px; border-radius: 8px; background: var(--bg2); border: 1px solid var(--border); text-align: center;">
          <div style="font-size: 9px; color: var(--text3); text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Toplam Borç</div>
          <div style="font-size: 15px; font-weight: bold; color: var(--red-neg); margin-top: 4px;">${formatCurrency(totalBorc)}</div>
        </div>
        <div style="padding: 10px; border-radius: 8px; background: var(--bg2); border: 1px solid var(--border); text-align: center;">
          <div style="font-size: 9px; color: var(--text3); text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Toplam Alacak</div>
          <div style="font-size: 15px; font-weight: bold; color: var(--green-pos); margin-top: 4px;">${formatCurrency(totalAlacak)}</div>
        </div>
        <div style="padding: 10px; border-radius: 8px; background: var(--bg2); border: 1px solid var(--border); text-align: center;">
          <div style="font-size: 9px; color: var(--text3); text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Net Bakiye</div>
          <div style="font-size: 15px; font-weight: bold; color: ${balance >= 0 ? 'var(--green-pos)' : 'var(--red-neg)'}; margin-top: 4px;">${balanceStr}</div>
        </div>
      </div>
    `;

    let tableHtml = `<table>
      <thead><tr><th><input type="checkbox" id="select-all-actx" onchange="toggleAllActx()"></th><th>Tarih</th><th>Tür</th><th>Tutar</th><th>Açıklama</th><th>İşlem</th></tr></thead>
      <tbody>`;
    if (txs.length === 0) {
      tableHtml += '<tr><td colspan="6" style="text-align: center; color: var(--text3); padding: 20px;">Hareket bulunamadı.</td></tr>';
    } else {
      txs.forEach(tx => {
        tableHtml += `<tr>
          <td><input type="checkbox" class="select-item" data-id="${tx.id}" data-type="actx" onchange="updateMassDeleteBtn('actx')"></td>
          <td>${formatDate(tx.date)}</td>
          <td><span class="badge ${tx.type === 'Borc' ? 'badge-expense' : 'badge-income'}">${tx.type === 'Borc' ? 'Borç' : 'Alacak'}</span></td>
          <td style="font-weight: bold; font-family: var(--font-heading); ${tx.type === 'Borc' ? 'color: var(--red-neg);' : 'color: var(--green-pos);'}">${formatCurrency(tx.amount)}</td>
          <td>${tx.description || '-'}</td>
          <td><button class="action-btn delete-btn" onclick="deleteAccountTx(${tx.id})">🗑️</button></td>
        </tr>`;
      });
    }
    tableHtml += '</tbody></table>';
    document.getElementById('acc-detail-table').innerHTML = tableHtml;
    updateMassDeleteBtn('actx');

    openModal('modal-account-detail');
  } catch (err) {
    showToast('Hesap detayı yüklenirken hata oluştu.', 'error');
  }
}

function closeAccountDetail() {
  closeModal('modal-account-detail');
}

function showAddAccountTxForm() {
  document.getElementById('actx-account-id').value = activeAccountId || '';
  document.getElementById('actx-date').value = new Date().toISOString().substring(0, 10);
  document.getElementById('actx-type').value = 'Borc';
  document.getElementById('actx-amount').value = '';
  document.getElementById('actx-desc').value = '';
  openModal('modal-account-tx');
}

document.getElementById('btn-save-account-tx').addEventListener('click', async (e) => {
  e.preventDefault();
  const account_id = document.getElementById('actx-account-id').value;
  if (!account_id) { showToast('Hesap seçilmedi.', 'error'); return; }
  const data = {
    account_id: Number(account_id),
    date: document.getElementById('actx-date').value,
    type: document.getElementById('actx-type').value,
    amount: cleanValue('actx-amount'),
    description: document.getElementById('actx-desc').value.trim()
  };
  if (!data.date || !data.amount) { showToast('Tarih ve tutar gerekli.', 'error'); return; }
  showSaving();
  await window.toprak.addAccountTransaction(data);
  hideSaving();
  showToast('Hareket kaydedildi ✓');
  closeModal('modal-account-tx');
  if (activeAccountId) showAccountDetail(activeAccountId);
});

async function deleteAccountTx(id) {
  openConfirmModal('Hareketi Sil', 'Bu hareketi silmek istediğinizden emin misiniz?', async () => {
    await window.toprak.deleteAccountTransaction(id);
    showToast('Hareket silindi', 'error');
    if (activeAccountId) showAccountDetail(activeAccountId);
  });
}

// ==========================================
// 📝 GÖRÜNÜM 8: SÖZLEŞMELER
// ==========================================

async function loadAgreements() {
  const data = await window.toprak.getAgreements();
  state.agreements = data;
  ['agreements-table-body', 'subscriptions-table-body'].forEach(id => {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    const isSub = id === 'subscriptions-table-body';
    const dataType = isSub ? 'sub' : 'agr';
    tbody.innerHTML = '';
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text3); padding: 30px 0;">Sözleşme bulunamadı.</td></tr>';
      return;
    }
    data.forEach(a => {
      const tr = document.createElement('tr');
      const statusClass = a.status === 'Aktif' ? 'badge-success' : a.status === 'Süresi Doldu' ? 'badge-warning' : 'badge-danger';
      tr.innerHTML = `
        <td><input type="checkbox" class="select-item" data-id="${a.id}" data-type="${dataType}" onchange="updateMassDeleteBtn('${dataType}')"></td>
        <td>${formatDate(a.date)}</td>
        <td style="font-weight: 500;">${a.company_name}</td>
        <td><span class="badge badge-income">${a.plan}</span></td>
        <td style="font-weight: bold; font-family: var(--font-heading);">${formatCurrency(a.amount)}</td>
        <td>${a.start_date ? formatDate(a.start_date) : '-'}</td>
        <td>${a.end_date ? formatDate(a.end_date) : '-'}</td>
        <td><span class="badge ${statusClass}">${a.status}</span></td>
        <td>
          <div class="action-icons">
            <button class="action-btn edit-btn" onclick="editAgreement(${a.id})">✏️</button>
            <button class="action-btn delete-btn" onclick="deleteAgreement(${a.id})">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
  updateMassDeleteBtn('agr');
  updateMassDeleteBtn('sub');
}

// Add Agreement button
function openAddAgreement() {
  document.getElementById('form-agreement').reset();
  document.getElementById('agr-id').value = '';
  document.getElementById('agr-date').value = new Date().toISOString().substring(0, 10);
  document.getElementById('modal-agreement-title').textContent = 'Yeni Sözleşme';
  openModal('modal-agreement');
}
document.getElementById('btn-add-agreement').addEventListener('click', openAddAgreement);
const btnAddSub = document.getElementById('btn-add-subscription');
if (btnAddSub) btnAddSub.addEventListener('click', openAddAgreement);

// Save Agreement
document.getElementById('btn-save-agreement').addEventListener('click', async (e) => {
  e.preventDefault();
  const id = document.getElementById('agr-id').value;
  const data = {
    date: document.getElementById('agr-date').value,
    company_name: document.getElementById('agr-company').value.trim(),
    plan: document.getElementById('agr-plan').value,
    amount: cleanValue('agr-amount'),
    start_date: document.getElementById('agr-start').value,
    end_date: document.getElementById('agr-end').value,
    description: document.getElementById('agr-desc').value.trim(),
    status: document.getElementById('agr-status').value
  };
  if (!data.date || !data.company_name || !data.amount) {
    showToast('Tarih, firma adı ve tutar gerekli.', 'error'); return;
  }
  showSaving();
  if (id) {
    await window.toprak.updateAgreement(Number(id), data);
    showToast('Sözleşme güncellendi.');
  } else {
    await window.toprak.addAgreement(data);
    showToast('Sözleşme kaydedildi ✓');
  }
  hideSaving();
  closeModal('modal-agreement');
  loadAgreements();
});

// Edit Agreement
async function editAgreement(id) {
  const a = state.agreements.find(x => x.id === id);
  if (!a) return;
  document.getElementById('agr-id').value = a.id;
  document.getElementById('agr-date').value = a.date;
  document.getElementById('agr-company').value = a.company_name;
  document.getElementById('agr-plan').value = a.plan;
  document.getElementById('agr-amount').value = a.amount;
  document.getElementById('agr-start').value = a.start_date;
  document.getElementById('agr-end').value = a.end_date;
  document.getElementById('agr-desc').value = a.description;
  document.getElementById('agr-status').value = a.status;
  document.getElementById('modal-agreement-title').textContent = 'Sözleşmeyi Düzenle';
  openModal('modal-agreement');
}

// Delete Agreement
function deleteAgreement(id) {
  const a = state.agreements.find(x => x.id === id);
  openConfirmModal('Sözleşmeyi Sil', `"${a.company_name}" sözleşmesini silmek istediğinizden emin misiniz?`, async () => {
    await window.toprak.deleteAgreement(id);
    showToast('Sözleşme silindi', 'error');
    loadAgreements();
  });
}


// ==========================================
// 🏷️ CATEGORY MANAGEMENT
// ==========================================

async function loadCategoriesPage() {
  const companies = await window.toprak.getCompanies();
  const active = await window.toprak.getActiveCompany();
  const sel = document.getElementById('cat-company');
  if (sel) {
    sel.innerHTML = '';
    companies.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
    if (active) sel.value = active.id;
  }
  await renderCategoryList('category-list-page');
}

// Load category list into modal
async function loadCategoriesModal() {
  await renderCategoryList('category-list');
}

// Render category groups into a container element
async function renderCategoryList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const cats = await window.toprak.getCategories();
  const companies = await window.toprak.getCompanies();
  const viewFilter = await window.toprak.getViewCompanyFilter();
  const viewId = viewFilter === 'all' ? null : Number(viewFilter);

  const grouped = {};
  cats.forEach(c => {
    if (viewId && c.company_id !== viewId) return;
    if (!grouped[c.company_id]) grouped[c.company_id] = [];
    grouped[c.company_id].push(c);
  });

  container.innerHTML = '';

  companies.forEach(comp => {
    if (viewId && comp.id !== viewId) return;
    const items = grouped[comp.id];
    if (!items || items.length === 0) return;

    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:10px;border:1px solid var(--border);border-radius:10px;overflow:hidden;';

    // Collapsible header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--bg2);font-weight:600;font-size:13px;border-bottom:1px solid var(--border);cursor:pointer;user-select:none;';
    const compIcon = comp.type === 'gayrimenkul' ? '🏠' : comp.type === 'derch' ? '📱' : '📺';
    const totalCats = items.length;
    header.innerHTML = `<span style="flex:1;"><span>${compIcon}</span> <span>${comp.name}</span> <span style="font-weight:400;font-size:11px;color:var(--text3);">(${totalCats} kategori)</span></span><span class="collapse-arrow" style="transition:transform 0.2s;font-size:12px;">▾</span>`;
    section.appendChild(header);

    // Content body (collapsible)
    const body = document.createElement('div');
    body.style.cssText = 'padding:10px 14px;display:flex;flex-direction:column;gap:8px;';

    const typeConfig = [
      { key: 'Gelir', icon: '💰', bg: 'var(--green-pos)15', bd: 'var(--green-pos)30' },
      { key: 'Gider', icon: '💸', bg: 'var(--red-neg)15', bd: 'var(--red-neg)30' },
      { key: 'Personel', icon: '👤', bg: 'var(--accent)20', bd: 'var(--accent)40' },
      { key: 'Paket', icon: '📦', bg: 'var(--accent)15', bd: 'var(--accent)30' },
      { key: 'Platform', icon: '📡', bg: 'var(--accent)15', bd: 'var(--accent)30' },
      { key: 'İşletme', icon: '🏢', bg: 'var(--accent)15', bd: 'var(--accent)30' }
    ];

    typeConfig.forEach(({ key, icon, bg, bd }) => {
      const filtered = items.filter(c => c.tx_type === key);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
      const label = document.createElement('span');
      label.style.cssText = 'font-size:11px;color:var(--text3);font-weight:600;min-width:80px;';
      label.textContent = `${icon} ${key}`;
      row.appendChild(label);
      if (filtered.length === 0) {
        const empty = document.createElement('span');
        empty.style.cssText = 'font-size:11px;color:var(--text3);font-style:italic;';
        empty.textContent = '—';
        row.appendChild(empty);
      } else {
        filtered.forEach(c => {
          const tag = document.createElement('span');
          tag.style.cssText = `display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:14px;font-size:11px;background:${bg};border:1px solid ${bd};color:var(--text);`;
          tag.innerHTML = `${c.name} <span style="cursor:pointer;opacity:0.5;font-size:13px;line-height:1;" onclick="deleteCategoryItem(${c.id})" title="Sil">&times;</span>`;
          row.appendChild(tag);
        });
      }
      body.appendChild(row);
    });

    section.appendChild(body);

    // Toggle collapse on header click
    header.addEventListener('click', () => {
      const isHidden = body.style.display === 'none';
      body.style.display = isHidden ? 'grid' : 'none';
      header.querySelector('.collapse-arrow').style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
    });

    container.appendChild(section);
  });

  if (container.children.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3);">Henüz kategori eklenmemiş. Yukarıdan ekleyin.</div>';
  }
}

// Delete a category
async function deleteCategoryItem(id) {
  await window.toprak.deleteCategory(id);
  await loadCategoriesPage();
  await loadCategoriesCache();
  showToast('Kategori silindi');
}

// Open categories page
document.getElementById('btn-categories').addEventListener('click', () => {
  switchView('categories');
});

// Enter key on cat-name triggers add
const catNameEl = document.getElementById('cat-name');
if (catNameEl) catNameEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-add-cat')?.click();
});

// Add category
const btnAddCat = document.getElementById('btn-add-cat');
if (btnAddCat) btnAddCat.addEventListener('click', async () => {
  try {
    const name = document.getElementById('cat-name').value.trim();
    const txType = document.getElementById('cat-type').value;
    const companySelect = document.getElementById('cat-company');
    if (!companySelect || companySelect.options.length === 0) {
      showToast('Önce şirketlerin yüklenmesini bekleyin.', 'error');
      return;
    }
    const companyId = parseInt(companySelect.value);
    if (!name) { showToast('Kategori adı girin.', 'error'); return; }
    if (isNaN(companyId)) { showToast('Geçersiz şirket seçimi.', 'error'); return; }
    showSaving();
    await window.toprak.addCategory({ name, tx_type: txType, company_id: companyId });
    hideSaving();
    document.getElementById('cat-name').value = '';
    document.getElementById('cat-name').focus();
    await loadCategoriesPage();
    await loadCategoriesCache();
    showToast('✓ Kategori eklendi');
  } catch (err) {
    showToast('Kategori eklenirken hata: ' + (err.message || err), 'error');
  }
});


// ==========================================
// 🏢 COMPANY MANAGEMENT
// ==========================================

async function loadCompanies() {
  const companies = await window.toprak.getCompanies();
  const sel = document.getElementById('company-selector');
  sel.innerHTML = '';
  companies.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
  const active = await window.toprak.getActiveCompany();
  sel.value = active.id;
  applyCompanyUI(active);
}

async function switchCompany(companyId) {
  showSaving();
  await window.toprak.setActiveCompany(companyId);
  await window.toprak.setViewCompanyFilter(companyId);
  const company = await window.toprak.getCompany(parseInt(companyId));
  if (company) applyCompanyUI(company);
  await loadCategoriesCache();
  await populateHeaderCompanyFilter();

  // Reload current view
  if (state.currentView === 'dashboard') loadDashboard();
  else if (state.currentView === 'transactions') loadTransactions();
  else if (state.currentView === 'properties') loadProperties();
  else if (state.currentView === 'staff') loadStaff();
  else if (state.currentView === 'reports') loadReports();
  else if (state.currentView === 'einvoice') loadInvoices();
  else if (state.currentView === 'accounts') loadAccountsView();
  else if (state.currentView === 'agreements') loadAgreements();
  else if (state.currentView === 'subscriptions') loadAgreements();
  else if (state.currentView === 'iban') loadIban();

  hideSaving();
  showToast(`Şirket değiştirildi: ${company ? company.name : ''}`);
}

function applyCompanyUI(company) {
  if (!company) return;
  const logoInfo = COMPANY_LOGOS[company.type] || COMPANY_LOGOS.gayrimenkul;
  const logoEl = document.getElementById('sidebar-logo');
  if (logoEl) {
    logoEl.style.display = 'block';
    logoEl.src = logoInfo.img.replace(/ /g, '%20');
    logoEl.alt = company.name;
    logoEl.onerror = function() {
      this.style.display = 'none';
      let fallback = document.getElementById('sidebar-logo-fallback');
      if (!fallback) {
        fallback = document.createElement('div');
        fallback.id = 'sidebar-logo-fallback';
        fallback.style.cssText = 'display:flex;align-items:center;gap:8px;justify-content:center;padding:5px 0;';
        this.parentNode.insertBefore(fallback, this);
      }
      fallback.innerHTML = `<span style="font-size:28px;">${logoInfo.icon}</span>
        <div style="text-align:left;">
          <div style="font-weight:700;font-size:14px;color:var(--text);line-height:1.2;">${company.name}</div>
          <div style="font-size:10px;color:var(--text3);">${logoInfo.sub}</div>
        </div>`;
    };
    // If the image loads successfully, remove any existing fallback
    logoEl.onload = function() {
      const fb = document.getElementById('sidebar-logo-fallback');
      if (fb) fb.remove();
    };
  }

  // Relabel nav based on company type
  const label = company.type === 'derch' ? 'Markalar' : company.type === 'yo' ? 'İşletmeler' : 'Mülkler';
  const propNav = document.querySelector('.nav-item[data-view="properties"]');
  if (propNav) {
    const span = propNav.querySelector('span');
    span.textContent = label;
  }
  const propTitle = document.getElementById('properties-section-title');
  if (propTitle) propTitle.textContent = label;
  const btnLabel = document.getElementById('btn-add-prop-label');
  const singular = company.type === 'derch' ? 'Marka' : company.type === 'yo' ? 'İşletme' : 'Mülk';
  if (btnLabel) btnLabel.textContent = 'Yeni ' + singular;
  // Show/hide Yo Media specific nav items
  document.querySelectorAll('.company-yo').forEach(el => {
    el.style.display = company.type === 'yo' ? '' : 'none';
  });
  // If current view is hidden, switch to dashboard
  if (company.type !== 'yo' && (state.currentView === 'subscriptions' || state.currentView === 'iban')) {
    switchView('dashboard');
  }
}

// IBAN Library
async function loadIban() {
  const container = document.getElementById('view-iban');
  if (!container) return;
  const ibans = await window.toprak.getIbans();
  container.innerHTML = `
    <div class="section-header">
      <span class="section-title">IBAN Kütüphanesi</span>
      <div style="display:flex;gap:8px;align-items:center;">
        <label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer;"><input type="checkbox" id="select-all-iban" class="select-all-checkbox" onchange="toggleAllIban()"> Tümünü Seç</label>
        <button class="btn btn-danger" id="btn-mass-delete-iban" style="width:auto;padding:8px 12px;display:none;">🗑️ Toplu Sil</button>
        <button class="btn" id="btn-add-iban" style="width:auto;">+ Yeni IBAN Ekle</button>
      </div>
    </div>
    <div class="iban-grid" id="iban-grid">
      ${ibans.length === 0 ? '<div style="grid-column:1/-1;text-align:center;color:var(--text3);padding:40px;">Henüz IBAN eklenmemiş.</div>' : ''}
      ${ibans.map(ib => `
        <div class="iban-card" data-id="${ib.id}">
          <div class="card-checkbox-wrapper">
            <input type="checkbox" class="select-item" data-id="${ib.id}" data-type="iban" onchange="updateMassDeleteBtn('iban')">
          </div>
          <div class="iban-card-header">
            <span class="iban-card-name">${ib.name}</span>
            <div class="action-icons">
              <button class="action-btn edit-btn" onclick="editIban(${ib.id})">✏️</button>
              <button class="action-btn delete-btn" onclick="deleteIban(${ib.id})">🗑️</button>
            </div>
          </div>
          <div class="iban-card-number">${ib.iban}</div>
          ${ib.description ? `<div class="iban-card-desc">${ib.description}</div>` : ''}
          <button class="btn btn-sm" style="margin-top:8px;padding:4px 10px;font-size:11px;width:auto;" onclick="copyIban('${ib.iban}')">📋 Kopyala</button>
        </div>
      `).join('')}
    </div>`;
  document.getElementById('btn-add-iban')?.addEventListener('click', () => openIbanModal());
  document.getElementById('btn-mass-delete-iban')?.addEventListener('click', massDeleteIban);
  updateMassDeleteBtn('iban');
}

function openIbanModal(data) {
  document.getElementById('iban-form').reset();
  document.getElementById('iban-id').value = data ? data.id : '';
  document.getElementById('iban-name').value = data ? data.name : '';
  document.getElementById('iban-number').value = data ? data.iban : '';
  document.getElementById('iban-desc').value = data ? (data.description || '') : '';
  document.getElementById('modal-iban-title').textContent = data ? 'IBAN Düzenle' : 'Yeni IBAN Ekle';
  openModal('modal-iban');
}

async function editIban(id) {
  const ibans = await window.toprak.getIbans();
  const data = ibans.find(i => i.id === id);
  if (data) openIbanModal(data);
}

async function deleteIban(id) {
  openConfirmModal('IBAN Sil', 'Bu IBAN kaydını silmek istediğinizden emin misiniz?', async () => {
    await window.toprak.deleteIban(id);
    showToast('IBAN silindi', 'error');
    loadIban();
  });
}

document.getElementById('btn-save-iban')?.addEventListener('click', async () => {
  const id = document.getElementById('iban-id').value;
  const data = {
    name: document.getElementById('iban-name').value.trim(),
    iban: document.getElementById('iban-number').value.trim(),
    description: document.getElementById('iban-desc').value.trim()
  };
  if (!data.name || !data.iban) { showToast('Ad ve IBAN gerekli.', 'error'); return; }
  showSaving();
  if (id) { await window.toprak.updateIban(Number(id), data); showToast('IBAN güncellendi.'); }
  else { await window.toprak.addIban(data); showToast('IBAN eklendi ✓'); }
  hideSaving();
  closeModal('modal-iban');
  loadIban();
});

function copyIban(iban) {
  navigator.clipboard.writeText(iban).then(() => showToast('IBAN kopyalandı ✓')).catch(() => showToast('Kopyalanamadı', 'error'));
}

// ==========================================
// 🔍 ÇOKLU SEÇİM
// ==========================================

let multiSelectData = { accounts: [], properties: [], agreements: [] };
let multiSelectTab = 'accounts';



document.querySelectorAll('.multiselect-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.multiselect-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderMultiSelectTab(tab.dataset.tab);
  });
});

function renderMultiSelectTab(tab) {
  multiSelectTab = tab;
  const container = document.getElementById('multiselect-list');
  const items = multiSelectData[tab] || [];
  if (items.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);">Kayıt bulunamadı.</div>';
    return;
  }
  let html = '<div style="display:flex;flex-direction:column;gap:6px;">';
  items.forEach(item => {
    const name = item.company_name || item.name || item.company_name || '';
    const sub = tab === 'accounts' ? (item.type === 'Musteri' ? 'Müşteri' : 'Tedarikçi') :
               tab === 'properties' ? (item.status || '') :
               tab === 'agreements' ? (item.plan || '') : '';
    html += `
      <label class="multiselect-item">
        <input type="checkbox" class="multiselect-checkbox" data-tab="${tab}" data-id="${item.id}">
        <span class="multiselect-label">
          <span class="multiselect-name">${name}</span>
          ${sub ? `<span class="multiselect-sub">${sub}</span>` : ''}
        </span>
      </label>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function getSelectedMultiIds(tab) {
  return Array.from(document.querySelectorAll(`.multiselect-checkbox[data-tab="${tab}"]:checked`)).map(cb => Number(cb.dataset.id));
}

function applyMultiSelect() {
  const selected = {
    accounts: getSelectedMultiIds('accounts'),
    properties: getSelectedMultiIds('properties'),
    agreements: getSelectedMultiIds('agreements')
  };
  const total = selected.accounts.length + selected.properties.length + selected.agreements.length;
  showToast(`${total} öğe seçildi`);
  closeModal('modal-multiselect');
}

// Clean numeric value from auto-thousands formatted input
function cleanValue(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return parseFloat(el.value.replace(/\./g, '').replace(/,/g, '.')) || 0;
}

// Auto thousand separator on text inputs (Cursor position aware)
document.addEventListener('input', function(e) {
  if (e.target && e.target.classList.contains('auto-thousands')) {
    const input = e.target;
    let selectionStart = input.selectionStart;
    let originalLen = input.value.length;
    
    let raw = input.value.replace(/\./g, '').replace(/,/g, '');
    let multiplier = 1;
    const suffix = raw.slice(-1).toLowerCase();
    if (suffix === 'k' && /^\d+(\.\d+)?$/.test(raw.slice(0, -1))) { multiplier = 1000; raw = raw.slice(0, -1); }
    else if (suffix === 'm' && /^\d+(\.\d+)?$/.test(raw.slice(0, -1))) { multiplier = 1000000; raw = raw.slice(0, -1); }
    
    let formatted = '';
    if (multiplier > 1) {
      const num = parseFloat(raw) * multiplier;
      formatted = Math.round(num).toLocaleString('tr-TR');
    } else {
      if (/^\d*\.?\d*$/.test(raw)) {
        const parts = raw.split('.');
        const intPart = parts[0];
        const decPart = parts.length > 1 ? ',' + parts[1] : '';
        if (intPart.length > 0) {
          formatted = parseInt(intPart).toLocaleString('tr-TR') + decPart;
        } else {
          formatted = decPart;
        }
      } else {
        formatted = input.value;
      }
    }
    
    input.value = formatted;
    
    // Adjust cursor position
    let newLen = formatted.length;
    let lenDiff = newLen - originalLen;
    let newCursor = selectionStart + lenDiff;
    if (newCursor >= 0 && newCursor <= newLen) {
      input.setSelectionRange(newCursor, newCursor);
    }
  }
});


// ==========================================
// ⚙️ GÖRÜNÜM 9: AYARLAR
// ==========================================

async function loadSettings() {
  const theme = await window.toprak.getTheme();
  applyTheme(theme);

  const cloudEnabled = await window.toprak.getSetting('cloud_enabled');
  document.getElementById('settings-cloud-enabled').value = cloudEnabled || '0';
  const backupFolder = await window.toprak.getSetting('backup_folder');
  document.getElementById('settings-backup-folder').value = backupFolder || '';
  const cloudInterval = await window.toprak.getSetting('backup_interval');
  document.getElementById('settings-cloud-interval').value = cloudInterval || 'manual';

  const qd = await window.toprak.getSetting('quick_delete');
  document.getElementById('settings-quick-delete').checked = qd === '1';

  // Auto-filing settings
  const afConfig = await window.toprak.getAutoFileConfig();
  document.getElementById('settings-auto-file-enabled').value = afConfig.enabled || '0';
  document.getElementById('settings-auto-file-folder').value = afConfig.folder || '';
}

// Cloud settings save
document.getElementById('settings-cloud-enabled').addEventListener('change', async (e) => {
  await window.toprak.setSetting('cloud_enabled', e.target.value);
  showToast('Otomatik yedekleme ayarı kaydedildi.');
});

document.getElementById('settings-cloud-interval').addEventListener('change', async (e) => {
  await window.toprak.setSetting('backup_interval', e.target.value);
  showToast('Yedekleme sıklığı kaydedildi.');
});

// Select backup folder
async function selectBackupFolder() {
  const folder = await window.toprak.selectBackupFolder();
  if (folder) {
    document.getElementById('settings-backup-folder').value = folder;
    await window.toprak.setSetting('backup_folder', folder);
    showToast('Yedekleme klasörü kaydedildi.');
  }
}

// Backup now button
document.getElementById('btn-backup-now').addEventListener('click', async () => {
  const statusEl = document.getElementById('backup-status');
  const folder = document.getElementById('settings-backup-folder').value.trim();
  if (!folder) {
    statusEl.textContent = 'Lütfen önce bir yedekleme klasörü seçin.';
    statusEl.style.color = 'var(--red-neg)';
    return;
  }
  const btn = document.getElementById('btn-backup-now');
  btn.classList.add('btn-loading');
  statusEl.textContent = 'Yedekleniyor...';
  statusEl.style.color = 'var(--text3)';
  const result = await window.toprak.doBackup();
  btn.classList.remove('btn-loading');
  if (result.success) {
    statusEl.textContent = '✓ ' + result.message;
    statusEl.style.color = 'var(--green-pos)';
    showToast('Yedekleme tamamlandı ✓');
  } else {
    statusEl.textContent = '✗ ' + result.message;
    statusEl.style.color = 'var(--red-neg)';
    showToast(result.message, 'error');
  }
});

// Auto-backup notification (from main process timer)
window.toprak.onBackupCompleted((path) => {
  showToast('🔄 Otomatik yedekleme tamamlandı');
});

// Quick delete setting
document.getElementById('settings-quick-delete').addEventListener('change', async (e) => {
  quickDeleteEnabled = e.target.checked;
  await window.toprak.setSetting('quick_delete', quickDeleteEnabled ? '1' : '0');
  showToast(quickDeleteEnabled ? 'Hızlı silme aktif.' : 'Hızlı silme devre dışı.');
});

// CSV Import from Transactions view
document.getElementById('btn-import-csv-tx').addEventListener('click', async () => {
  const result = await window.toprak.importCSV();
  if (result.success) {
    showToast(result.message);
    loadTransactions();
  } else {
    showToast(result.message, 'error');
  }
});

// CSV Import from Settings
document.getElementById('btn-import-csv').addEventListener('click', async () => {
  const statusEl = document.getElementById('csv-import-status');
  statusEl.textContent = 'Dosya seçiliyor...';
  statusEl.style.color = 'var(--text3)';

  const result = await window.toprak.importCSV();
  if (result.success) {
    statusEl.textContent = result.message;
    statusEl.style.color = 'var(--green-pos)';
    showToast(result.message);
  } else {
    statusEl.textContent = result.message;
    statusEl.style.color = 'var(--red-neg)';
    showToast(result.message, 'error');
  }
});

// --- Auto-Filing Settings ---
document.getElementById('settings-auto-file-enabled').addEventListener('change', async (e) => {
  const config = {
    enabled: e.target.value,
    folder: document.getElementById('settings-auto-file-folder').value
  };
  await window.toprak.setAutoFileConfig(config);
  const statusEl = document.getElementById('auto-file-status');
  if (e.target.value === '1' && config.folder) {
    statusEl.textContent = '✅ Otomatik dosyalama aktif — klasör izleniyor.';
    statusEl.style.color = 'var(--green-pos)';
    showToast('Otomatik dosyalama açıldı.');
  } else {
    statusEl.textContent = '⏸️ Otomatik dosyalama kapalı.';
    statusEl.style.color = 'var(--text3)';
    showToast('Otomatik dosyalama kapatıldı.');
  }
});

async function selectWatchFolder() {
  const folder = await window.toprak.selectWatchFolder();
  if (folder) {
    document.getElementById('settings-auto-file-folder').value = folder;
    const enabled = document.getElementById('settings-auto-file-enabled').value;
    await window.toprak.setAutoFileConfig({ enabled, folder });
    showToast('İzlenen klasör kaydedildi.');
    if (enabled === '1') {
      document.getElementById('auto-file-status').textContent = '✅ Otomatik dosyalama aktif — klasör izleniyor.';
      document.getElementById('auto-file-status').style.color = 'var(--green-pos)';
    }
  }
}

// Listen for auto-file events
window.toprak.onAutoFileEvent((data) => {
  showToast(`📁 ${data.file} → ${data.dest}/`);
});

// ==========================================
// 🔄 AUTO-UPDATE HANDLERS
// ==========================================
const updateBar = document.getElementById('update-bar');
const updateBarText = document.getElementById('update-bar-text');
const updateBarBtn = document.getElementById('update-bar-btn');

function showUpdateBar(text, showBtn) {
  updateBar.style.display = 'block';
  updateBarText.textContent = text;
  updateBarBtn.style.display = showBtn ? 'inline-block' : 'none';
}

window.toprak.onUpdateStatus((status) => {
  if (status === 'checking') showUpdateBar('Güncelleme kontrol ediliyor...', false);
});

window.toprak.onUpdateAvailable((info) => {
  showUpdateBar(`Yeni sürüm (${info.version}) indiriliyor...`, false);
});

window.toprak.onUpdateNotAvailable(() => {
  updateBar.style.display = 'none';
});

window.toprak.onUpdateDownloadProgress((progress) => {
  const pct = Math.round(progress.percent);
  showUpdateBar(`Güncelleme indiriliyor... %${pct}`, false);
});

window.toprak.onUpdateDownloaded((info) => {
  showUpdateBar(`Yeni sürüm (${info.version}) hazır.`, true);
});

window.toprak.onUpdateError((msg) => {
  updateBar.style.display = 'none';
});

updateBarBtn.addEventListener('click', () => {
  window.toprak.installUpdate();
});

// Show intro button
document.getElementById('btn-show-intro').addEventListener('click', () => {
  openModal('modal-welcome');
});

// Show welcome on first launch
window.addEventListener('DOMContentLoaded', async () => {
  const introSeen = await window.toprak.getSetting('intro_seen');
  if (!introSeen) {
    setTimeout(() => {
      openModal('modal-welcome');
      window.toprak.setSetting('intro_seen', '1');
    }, 1000);
  }
});
