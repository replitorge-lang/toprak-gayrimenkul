const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('toprak', {
  // Companies
  getCompanies: () => ipcRenderer.invoke('get-companies'),
  getCompany: (id) => ipcRenderer.invoke('get-company', id),
  addCompany: (data) => ipcRenderer.invoke('add-company', data),
  updateCompany: (id, data) => ipcRenderer.invoke('update-company', id, data),
  deleteCompany: (id) => ipcRenderer.invoke('delete-company', id),
  getActiveCompany: () => ipcRenderer.invoke('get-active-company'),
  setActiveCompany: (id) => ipcRenderer.invoke('set-active-company', id),

  // Auth
  getUser: () => ipcRenderer.invoke('get-user'),
  setUser: (name) => ipcRenderer.invoke('set-user', name),
  logout: () => ipcRenderer.invoke('logout'),

  // Theme
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (t) => ipcRenderer.invoke('set-theme', t),

  // Transactions
  getTransactions: (filters) => ipcRenderer.invoke('get-transactions', filters),
  addTransaction: (data) => ipcRenderer.invoke('add-transaction', data),
  updateTransaction: (id, data) => ipcRenderer.invoke('update-transaction', id, data),
  deleteTransaction: (id) => ipcRenderer.invoke('delete-transaction', id),

  // Properties
  getProperties: () => ipcRenderer.invoke('get-properties'),
  addProperty: (d) => ipcRenderer.invoke('add-property', d),
  updateProperty: (id, d) => ipcRenderer.invoke('update-property', id, d),
  deleteProperty: (id) => ipcRenderer.invoke('delete-property', id),

  // Staff
  getStaff: () => ipcRenderer.invoke('get-staff'),
  addStaff: (d) => ipcRenderer.invoke('add-staff', d),
  updateStaff: (id, d) => ipcRenderer.invoke('update-staff', id, d),
  deleteStaff: (id) => ipcRenderer.invoke('delete-staff', id),

  // Invoices (e-Fatura / e-Arsiv)
  getInvoices: (filters) => ipcRenderer.invoke('get-invoices', filters),
  addInvoice: (data) => ipcRenderer.invoke('add-invoice', data),
  updateInvoice: (id, data) => ipcRenderer.invoke('update-invoice', id, data),
  deleteInvoice: (id) => ipcRenderer.invoke('delete-invoice', id),

  // Accounts (Cari Hesap)
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (data) => ipcRenderer.invoke('add-account', data),
  updateAccount: (id, data) => ipcRenderer.invoke('update-account', id, data),
  deleteAccount: (id) => ipcRenderer.invoke('delete-account', id),
  getAccountTransactions: (accountId) => ipcRenderer.invoke('get-account-transactions', accountId),
  addAccountTransaction: (data) => ipcRenderer.invoke('add-account-transaction', data),
  deleteAccountTransaction: (id) => ipcRenderer.invoke('delete-account-transaction', id),

  // Agreements
  getAgreements: () => ipcRenderer.invoke('get-agreements'),
  addAgreement: (data) => ipcRenderer.invoke('add-agreement', data),
  updateAgreement: (id, data) => ipcRenderer.invoke('update-agreement', id, data),
  deleteAgreement: (id) => ipcRenderer.invoke('delete-agreement', id),

  // IBANs
  getIbans: () => ipcRenderer.invoke('get-ibans'),
  addIban: (data) => ipcRenderer.invoke('add-iban', data),
  updateIban: (id, data) => ipcRenderer.invoke('update-iban', id, data),
  deleteIban: (id) => ipcRenderer.invoke('delete-iban', id),

  // CSV Import
  importCSV: () => ipcRenderer.invoke('import-csv'),

  // Categories
  getCategories: (txType) => ipcRenderer.invoke('get-categories', txType),
  addCategory: (data) => ipcRenderer.invoke('add-category', data),
  updateCategory: (id, data) => ipcRenderer.invoke('update-category', id, data),
  deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  getViewCompanyFilter: () => ipcRenderer.invoke('get-view-company-filter'),
  setViewCompanyFilter: (value) => ipcRenderer.invoke('set-view-company-filter', value),

  // Backup (local/network drive)
  selectBackupFolder: () => ipcRenderer.invoke('select-backup-folder'),
  doBackup: () => ipcRenderer.invoke('do-backup'),
  onBackupCompleted: (callback) => ipcRenderer.on('backup-completed', (event, path) => callback(path)),

  // Export
  exportCSV: (filters) => ipcRenderer.invoke('export-csv', filters),
  generatePDF: (html) => ipcRenderer.invoke('generate-pdf', html),

  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Window bounds listener for load
  onWindowResize: (callback) => ipcRenderer.on('window-resize', callback),

  // Auto-Filing (Fatura Dosya Düzenleyici)
  getAutoFileConfig: () => ipcRenderer.invoke('get-auto-file-config'),
  setAutoFileConfig: (config) => ipcRenderer.invoke('set-auto-file-config', config),
  selectWatchFolder: () => ipcRenderer.invoke('select-watch-folder'),
  onAutoFileEvent: (callback) => ipcRenderer.on('auto-file-event', (event, data) => callback(data)),

  // File Import (Parse & Auto-Fill)
  parseImportFile: (filePath) => ipcRenderer.invoke('parse-import-file', filePath),
  scanImportFolder: (folderPath) => ipcRenderer.invoke('scan-import-folder', folderPath),
  moveImportFile: (data) => ipcRenderer.invoke('move-import-file', data),

  // Auto-Updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, status) => callback(status)),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (event, info) => callback(info)),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (event, progress) => callback(progress)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, msg) => callback(msg)),

  // Save/Load
  listSaves: () => ipcRenderer.invoke('list-saves'),
  saveSlot: () => ipcRenderer.invoke('save-slot'),
  loadSlot: (filePath) => ipcRenderer.invoke('load-slot', filePath),
  deleteSave: (filePath) => ipcRenderer.invoke('delete-save', filePath),
  renameSave: (filePath, newName) => ipcRenderer.invoke('rename-save', filePath, newName),
  pickAndLoadBackup: () => ipcRenderer.invoke('pick-and-load-backup'),
  restartApp: () => ipcRenderer.invoke('restart-app'),

  // EDM Cookies + Password Manager
  saveEdmCookies: () => ipcRenderer.invoke('save-edm-cookies'),
  loadEdmCookies: () => ipcRenderer.invoke('load-edm-cookies'),
  savePassword: (data) => ipcRenderer.invoke('save-password', data),
  getPasswords: () => ipcRenderer.invoke('get-passwords'),
  deletePassword: (key) => ipcRenderer.invoke('delete-password', key)
});
