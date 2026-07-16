const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const { autoUpdater } = require('electron-updater');
const db = require('./db/database');

let loginWindow = null;
let mainWindow = null;

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 400,
    height: 520,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  loginWindow.loadFile(path.join(__dirname, 'renderer', 'login.html'));
  
  loginWindow.once('ready-to-show', () => {
    loginWindow.show();
  });

  loginWindow.on('closed', () => {
    loginWindow = null;
  });
}

function createMainWindow() {
  const savedBounds = db.getWindowBounds() || { width: 1200, height: 800 };
  
  mainWindow = new BrowserWindow({
    width: savedBounds.width,
    height: savedBounds.height,
    x: savedBounds.x,
    y: savedBounds.y,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Save bounds on move or resize
  const saveBounds = () => {
    if (!mainWindow.isDestroyed()) {
      db.setWindowBounds(mainWindow.getBounds());
    }
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Check auth state and open appropriate window
function initApp() {
  const user = db.getUser();
  if (user) {
    createMainWindow();
  } else {
    createLoginWindow();
  }
}

app.whenReady().then(() => {
  initApp();

  // Auto-updater setup after window is ready
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'replitorge-lang',
    repo: 'toprak-gayrimenkul'
  });
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-status', 'checking');
  });

  autoUpdater.on('update-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-not-available', info);
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-download-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-error', err.message || err.toString());
  });

  // Device telemetry - generate unique ID on first run
  let deviceId = db.getSetting('device_id');
  if (!deviceId) {
    deviceId = 'tg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    db.setSetting('device_id', deviceId);
  }

  // Phone home & command listener
  function phoneHome() {
    const payload = JSON.stringify({
      deviceId,
      version: app.getVersion(),
      os: `${os.type()} ${os.release()} ${os.arch()}`,
      deviceName: os.hostname()
    });
    const req = https.request({
      hostname: 'sivastoprakpiyasa.netlify.app',
      path: '/.netlify/functions/track',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    });
    req.on('response', (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const resp = JSON.parse(body);
          if (resp.commands && resp.commands.length > 0) {
            if (resp.commands.includes('check_update')) {
              autoUpdater.checkForUpdates().catch(() => {});
            }
          }
        } catch (_) {}
      });
    });
    req.write(payload);
    req.end();
  }
  phoneHome();
  setInterval(phoneHome, 3600000); // repeat every hour

  // Check for updates 5 seconds after startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      initApp();
    }
  });
});

// Update IPC handlers
ipcMain.handle('check-for-updates', async () => {
  try { await autoUpdater.checkForUpdates(); } catch (_) {}
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- Window Controls IPC ---
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// --- Auth & Theme IPC ---
ipcMain.handle('get-user', () => db.getUser());

ipcMain.handle('set-user', (event, name) => {
  const success = db.setUser(name);
  if (success && loginWindow) {
    createMainWindow();
    loginWindow.close();
  }
  return success;
});

ipcMain.handle('logout', () => {
  db.logout();
  if (mainWindow) {
    createLoginWindow();
    mainWindow.close();
  }
  return true;
});

ipcMain.handle('get-theme', () => db.getTheme());
ipcMain.handle('set-theme', (event, theme) => db.setTheme(theme));

// --- Transactions IPC ---
ipcMain.handle('get-transactions', (event, filters) => db.getTransactions(filters));
ipcMain.handle('add-transaction', (event, data) => db.addTransaction(data));
ipcMain.handle('update-transaction', (event, id, data) => db.updateTransaction(id, data));
ipcMain.handle('delete-transaction', (event, id) => db.deleteTransaction(id));

// --- Properties IPC ---
ipcMain.handle('get-properties', () => db.getProperties());
ipcMain.handle('add-property', (event, data) => db.addProperty(data));
ipcMain.handle('update-property', (event, id, data) => db.updateProperty(id, data));
ipcMain.handle('delete-property', (event, id) => db.deleteProperty(id));

// --- Staff IPC ---
ipcMain.handle('get-staff', () => db.getStaff());
ipcMain.handle('add-staff', (event, data) => db.addStaff(data));
ipcMain.handle('update-staff', (event, id, data) => db.updateStaff(id, data));
ipcMain.handle('delete-staff', (event, id) => db.deleteStaff(id));

// --- Invoices IPC (e-Fatura / e-Arsiv) ---
ipcMain.handle('get-invoices', (event, filters) => db.getInvoices(filters));
ipcMain.handle('add-invoice', (event, data) => db.addInvoice(data));
ipcMain.handle('update-invoice', (event, id, data) => db.updateInvoice(id, data));
ipcMain.handle('delete-invoice', (event, id) => db.deleteInvoice(id));

// --- Accounts IPC (Cari Hesap) ---
ipcMain.handle('get-accounts', () => db.getAccounts());
ipcMain.handle('add-account', (event, data) => db.addAccount(data));
ipcMain.handle('update-account', (event, id, data) => db.updateAccount(id, data));
ipcMain.handle('delete-account', (event, id) => db.deleteAccount(id));
ipcMain.handle('get-account-transactions', (event, accountId) => db.getAccountTransactions(accountId));
ipcMain.handle('add-account-transaction', (event, data) => db.addAccountTransaction(data));
ipcMain.handle('delete-account-transaction', (event, id) => db.deleteAccountTransaction(id));

// --- Company IPC ---
ipcMain.handle('get-companies', () => db.getCompanies());
ipcMain.handle('get-company', (event, id) => db.getCompany(id));
ipcMain.handle('add-company', (event, data) => db.addCompany(data));
ipcMain.handle('update-company', (event, id, data) => db.updateCompany(id, data));
ipcMain.handle('delete-company', (event, id) => db.deleteCompany(id));
ipcMain.handle('get-active-company', () => db.getActiveCompany());
ipcMain.handle('set-active-company', (event, id) => db.setActiveCompany(id));

// --- Categories IPC ---
ipcMain.handle('get-categories', (event, txType) => db.getCategories(txType));
ipcMain.handle('add-category', (event, data) => db.addCategory(data));
ipcMain.handle('update-category', (event, id, data) => db.updateCategory(id, data));
ipcMain.handle('delete-category', (event, id) => db.deleteCategory(id));

// --- Settings IPC ---
ipcMain.handle('get-setting', (event, key) => db.getSetting(key));
ipcMain.handle('set-setting', (event, key, value) => db.setSetting(key, value));
ipcMain.handle('get-view-company-filter', () => db.getViewCompanyFilter());
ipcMain.handle('set-view-company-filter', (event, value) => db.setViewCompanyFilter(value));

// --- Exports IPC ---
ipcMain.handle('export-csv', async (event, filters) => {
  const transactions = db.getTransactions(filters);
  if (!transactions.length) return { success: false, message: 'İçerik bulunamadı.' };

  // Generate CSV content
  const headers = ['Tarih', 'Açıklama', 'Tür', 'Kategori', 'Tutar', 'Durum', 'İlgili Mülk', 'İlgili Personel', 'Not'];
  const rows = transactions.map(t => [
    t.date,
    `"${t.description.replace(/"/g, '""')}"`,
    t.type,
    t.category,
    t.amount,
    t.status,
    t.property_name ? `"${t.property_name.replace(/"/g, '""')}"` : '',
    t.staff_name ? `"${t.staff_name.replace(/"/g, '""')}"` : '',
    t.note ? `"${t.note.replace(/"/g, '""')}"` : ''
  ]);
  
  // Add UTF-8 BOM for Turkish characters in Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'CSV Olarak Dışa Aktar',
    defaultPath: path.join(app.getPath('downloads'), 'toprak-islemler.csv'),
    filters: [{ name: 'CSV Dosyaları', extensions: ['csv'] }]
  });

  if (filePath) {
    try {
      fs.writeFileSync(filePath, csvContent, 'utf-8');
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
  return { success: false, message: 'İşlem iptal edildi.' };
});

// --- PDF Export (hidden window approach) ---
ipcMain.handle('generate-pdf', async (event, htmlContent) => {
  if (!mainWindow) return { success: false, message: 'Pencere bulunamadı.' };

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Raporu PDF Olarak Kaydet',
    defaultPath: path.join(app.getPath('downloads'), 'toprak-finans-raporu.pdf'),
    filters: [{ name: 'PDF Dosyaları', extensions: ['pdf'] }]
  });

  if (!filePath) return { success: false, message: 'İşlem iptal edildi.' };

  let pdfWin = null;
  try {
    pdfWin = new BrowserWindow({
      width: 800, height: 600, show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    await pdfWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    await new Promise(resolve => setTimeout(resolve, 1000));
    const data = await pdfWin.webContents.printToPDF({
      marginsType: 0, pageSize: 'A4', printBackground: true, preferCSSPageSize: true
    });
    fs.writeFileSync(filePath, data);
    pdfWin.close();
    return { success: true, path: filePath };
  } catch (err) {
    if (pdfWin) pdfWin.close();
    return { success: false, message: err.message };
  }
});

// --- CSV Import IPC ---
ipcMain.handle('import-csv', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'CSV Dosyasi Sec',
    filters: [{ name: 'CSV Dosyalari', extensions: ['csv'] }],
    properties: ['openFile']
  });
  if (canceled || filePaths.length === 0) return { success: false, message: 'Islem iptal edildi.' };

  try {
    const csvContent = fs.readFileSync(filePaths[0], 'utf-8');
    const lines = csvContent.replace(/\r/g, '').split('\n').filter(l => l.trim());
    if (lines.length < 2) return { success: false, message: 'CSV en az 2 satir icermelidir.' };

    const h = lines[0].split(',').map(x => x.trim().toLowerCase());
    const dateIdx = h.findIndex(x => x.includes('tarih') || x.includes('date'));
    const descIdx = h.findIndex(x => x.includes('aciklama') || x.includes('description'));
    const amountIdx = h.findIndex(x => x.includes('tutar') || x.includes('amount') || x.includes('miktar'));
    if (dateIdx === -1 || amountIdx === -1) return { success: false, message: 'CSV basliklari: Tarih, Aciklama, Tutar olmalidir.' };

    const insert = db.db.prepare("INSERT INTO transactions (date, description, type, category, amount, status, note) VALUES (?, ?, ?, ?, ?, 'Tamamlandi', ?)");
    const batch = db.db.transaction(rows => { for (const r of rows) insert.run(r.date, r.desc, r.type, r.category, r.amount, r.note); });

    let ok = 0, err = 0;
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split(',');
      if (c.length <= Math.max(dateIdx, amountIdx)) { err++; continue; }
      let d = c[dateIdx].trim();
      let m = d.match(/^(\d{2})[\.\/\-](\d{2})[\.\/\-](\d{4})$/);
      if (m) {
        d = `${m[3]}-${m[2]}-${m[1]}`;
      } else {
        let m2 = d.match(/^(\d{4})[\.\/\-](\d{2})[\.\/\-](\d{2})$/);
        if (m2) {
          d = `${m2[1]}-${m2[2]}-${m2[3]}`;
        }
      }
      const amt = parseFloat(c[amountIdx].trim().replace(/[^0-9,\-\.]/g, '').replace(',', '.'));
      if (isNaN(amt) || amt === 0) { err++; continue; }
      const desc = descIdx >= 0 ? c[descIdx].trim() : 'CSV Ice Aktarma';
      rows.push({ date: d, desc: desc || 'CSV', type: amt > 0 ? 'Gelir' : 'Gider', category: amt > 0 ? 'Diger Gelir' : 'Diger Gider', amount: Math.abs(amt), note: 'CSVden aktarildi' });
      ok++;
    }
    if (rows.length > 0) batch(rows);
    return { success: true, message: ok + ' islem aktarildi' + (err > 0 ? ', ' + err + ' satir atlandi.' : '.') };
  } catch (ex) {
    return { success: false, message: 'CSV hatasi: ' + ex.message };
  }
});

// --- Backup IPC (Local / Network Drive) ---
ipcMain.handle('select-backup-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Yedekleme Klasörünü Seçin'
  });
  return result.canceled ? null : result.filePaths[0];
});

function performBackup() {
  try {
    const backupPath = db.getSetting('backup_folder');
    if (!backupPath) return { success: false, message: 'Klasör yok.' };
    const src = path.join(app.getPath('userData'), 'toprak_gayrimenkul.db');
    const now = new Date();
    const ts = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');
    const dest = path.join(backupPath, `toprak_yedek_${ts}.db`);
    fs.copyFileSync(src, dest);
    return { success: true, message: dest };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

ipcMain.handle('do-backup', async () => {
  if (!mainWindow) return { success: false, message: 'Pencere bulunamadı.' };
  const result = performBackup();
  return result;
});

// Save/Load system
ipcMain.handle('list-saves', async () => {
  try {
    const saves = [];
    const backupPath = db.getSetting('backup_folder');
    if (backupPath && fs.existsSync(backupPath)) {
      const files = fs.readdirSync(backupPath).filter(f => f.endsWith('.kay') || (f.endsWith('.db') && f.startsWith('toprak_yedek_'))).sort().reverse();
      files.forEach(f => {
        const fullPath = path.join(backupPath, f);
        const stat = fs.statSync(fullPath);
        saves.push({ name: f.replace('.kay', '').replace('.db', ''), file: fullPath, size: stat.size, time: stat.mtimeMs });
      });
    }
    saves.sort((a, b) => b.time - a.time);
    return saves;
  } catch (e) { return []; }
});

ipcMain.handle('save-slot', async () => {
  try {
    const folder = db.getSetting('backup_folder');
    if (!folder || !fs.existsSync(folder)) return { success: false, message: 'Yedekleme klasörü seçilmedi.' };
    const src = path.join(app.getPath('userData'), 'toprak_gayrimenkul.db');
    const now = new Date();
    const ts = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    const dest = path.join(folder, `kayit_${ts}.kay`);
    fs.copyFileSync(src, dest);
    return { success: true, file: dest };
  } catch (e) { return { success: false, message: e.message }; }
});

ipcMain.handle('load-slot', async (_, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return { success: false, message: 'Dosya bulunamadı.' };
    const dest = path.join(app.getPath('userData'), 'toprak_gayrimenkul.db');
    fs.copyFileSync(filePath, dest);
    return { success: true, restart: true };
  } catch (e) { return { success: false, message: e.message }; }
});

ipcMain.handle('pick-and-load-backup', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Yedek / Kayıt Dosyası Seç',
      filters: [{ name: 'Kayıt Dosyası', extensions: ['kay', 'db'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };
    const src = result.filePaths[0];
    const dest = path.join(app.getPath('userData'), 'toprak_gayrimenkul.db');
    fs.copyFileSync(src, dest);
    return { success: true, restart: true };
  } catch (e) { return { success: false, message: e.message }; }
});

ipcMain.handle('delete-save', async (_, filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { success: true };
  } catch (e) { return { success: false, message: e.message }; }
});

ipcMain.handle('rename-save', async (_, filePath, newName) => {
  try {
    const ext = path.extname(filePath);
    const dir = path.dirname(filePath);
    const newPath = path.join(dir, `${newName}${ext}`);
    if (fs.existsSync(newPath)) return { success: false, message: 'Bu isimde bir dosya zaten var.' };
    fs.renameSync(filePath, newPath);
    return { success: true };
  } catch (e) { return { success: false, message: e.message }; }
});

ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit();
});

// Auto-backup scheduler: checks every 60 minutes
setInterval(() => {
  try {
    const enabled = db.getSetting('cloud_enabled');
    const interval = db.getSetting('backup_interval');
    if (enabled === '1' && interval === 'hourly') {
      const result = performBackup();
      if (mainWindow && result.success) {
        mainWindow.webContents.send('backup-completed', result.message);
      }
    }
  } catch (_) {}
}, 60 * 60 * 1000); // 60 minutes

// --- Agreements IPC ---
ipcMain.handle('get-agreements', () => db.getAgreements());
ipcMain.handle('add-agreement', (event, data) => db.addAgreement(data));
ipcMain.handle('update-agreement', (event, id, data) => db.updateAgreement(id, data));
ipcMain.handle('delete-agreement', (event, id) => db.deleteAgreement(id));

// --- IBAN IPC ---
ipcMain.handle('get-ibans', () => db.getIbans());
ipcMain.handle('add-iban', (event, data) => db.addIban(data));
ipcMain.handle('update-iban', (event, id, data) => db.updateIban(id, data));
ipcMain.handle('delete-iban', (event, id) => db.deleteIban(id));

// --- Auto-Filing (Fatura Dosya Düzenleyici) ---
let autoFileWatcher = null;

function stopAutoFileWatcher() {
  if (autoFileWatcher) {
    clearInterval(autoFileWatcher);
    autoFileWatcher = null;
  }
}

function startAutoFileWatcher(folder) {
  stopAutoFileWatcher();
  if (!folder || !fs.existsSync(folder)) return;
  
  const processed = new Set();
  try {
    fs.readdirSync(folder).forEach(f => processed.add(f));
  } catch (_) {}

  autoFileWatcher = setInterval(() => {
    try {
      const enabled = db.getSetting('auto_file_enabled');
      if (enabled !== '1') return;

      const company = db.getActiveCompany();
      const companyName = company ? company.name : 'Bilinmeyen';
      const year = new Date().getFullYear();
      const targetFolderName = `${companyName} ${year} Fatura`;
      const targetPath = path.join(folder, targetFolderName);

      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      const now = Date.now();
      const files = fs.readdirSync(folder);
      files.forEach(file => {
        if (processed.has(file)) return;
        processed.add(file);

        const filePath = path.join(folder, file);
        let stat;
        try { stat = fs.statSync(filePath); } catch (_) { return; }
        if (!stat.isFile()) return;
        const fext = path.extname(file).toLowerCase();
        if (!['.pdf','.xml','.jpg','.jpeg','.png','.gif','.bmp','.tiff','.txt','.csv','.xls','.xlsx','.xlm','.xlsm','.html','.htm','.zip','.rar','.json','.edi'].includes(fext)) return;
        if (now - stat.mtimeMs < 15000) return;

        const ext = path.extname(file);
        const base = path.basename(file, ext);
        let destPath = path.join(targetPath, file);
        let counter = 1;
        while (fs.existsSync(destPath)) {
          destPath = path.join(targetPath, `${base} (${counter})${ext}`);
          counter++;
        }
        try {
          fs.renameSync(filePath, destPath);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('auto-file-event', { file, dest: targetFolderName });
          }
        } catch (_) {}
      });
    } catch (_) {}
  }, 5000);
}

ipcMain.handle('get-auto-file-config', () => ({
  enabled: db.getSetting('auto_file_enabled') || '0',
  folder: db.getSetting('auto_file_folder') || ''
}));

ipcMain.handle('set-auto-file-config', (event, config) => {
  db.setSetting('auto_file_enabled', config.enabled);
  db.setSetting('auto_file_folder', config.folder);
  if (config.enabled === '1') {
    startAutoFileWatcher(config.folder);
  } else {
    stopAutoFileWatcher();
  }
  return true;
});

ipcMain.handle('select-watch-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'İzlenecek Klasörü Seçin (Faturalar buraya indirilir)'
  });
  return result.canceled ? null : result.filePaths[0];
});

// Start watcher on app ready (if previously enabled)
try {
  const enabled = db.getSetting('auto_file_enabled');
  if (enabled === '1') {
    const folder = db.getSetting('auto_file_folder');
    if (folder) {
      setTimeout(() => startAutoFileWatcher(folder), 2000);
    }
  }
} catch (_) {}

// --- File Import Parsing (XML/CSV/TXT) ---
const SUPPORTED_EXTENSIONS = ['.pdf','.xml','.jpg','.jpeg','.png','.gif','.bmp','.tiff','.txt','.csv','.xls','.xlsx','.xlm','.xlsm','.html','.htm','.zip','.rar','.json','.edi'];

function parseXmlContent(content) {
  const data = {};
  const get = (tag) => { const m = content.match(new RegExp(`<[^:]*:${tag}[^>]*>([^<]+)`, 'i')); return m ? m[1].trim() : ''; };
  const getNs = (tag) => { const m = content.match(new RegExp(`<[^>]*${tag}[^>]*>([^<]+)`, 'i')); return m ? m[1].trim() : ''; };
  data.date = get('IssueDate') || get('Date') || '';
  data.invoiceNo = get('ID') || get('InvoiceNumber') || '';
  data.type = get('InvoiceTypeCode') || '';
  data.supplier = getNs('AccountingSupplierParty[\\s\\S]*?<[^:]*:Name>([^<]+)') || get('SupplierName') || '';
  data.customer = getNs('AccountingCustomerParty[\\s\\S]*?<[^:]*:Name>([^<]+)') || get('CustomerName') || '';
  data.taxId = get('VATRegistrationID') || get('TaxID') || get('TaxRegistrationID') || '';
  const amtMatch = content.match(/<[^:]*:PayableAmount[^>]*>([^<]+)/i);
  data.amount = amtMatch ? parseFloat(amtMatch[1].trim()) || 0 : 0;
  data.taxAmount = 0;
  const taxMatch = content.match(/<[^:]*:TaxAmount[^>]*>([^<]+)/i);
  if (taxMatch) data.taxAmount = parseFloat(taxMatch[1].trim()) || 0;
  return data;
}

function parseCsvContent(content) {
  const lines = content.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const row = {};
    headers.forEach((h, idx) => { if (idx < cols.length) row[h] = cols[idx]; });
    rows.push(row);
  }
  return { headers, rows };
}

ipcMain.handle('parse-import-file', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return { success: false, message: 'Dosya bulunamadı.' };
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) return { success: false, message: `Desteklenmeyen dosya türü: ${ext}` };

    const stat = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const fileSize = stat.size;

    let parsed = null;
    let detectedType = 'diger';
    let preview = '';

    if (ext === '.xml') {
      const content = fs.readFileSync(filePath, 'utf-8');
      parsed = parseXmlContent(content);
      if (parsed.amount || parsed.invoiceNo) {
        detectedType = 'fatura';
        preview = `Fatura #${parsed.invoiceNo || '-'} | ${parsed.date || '-'} | ${parsed.supplier || parsed.customer || '-'} | ${parsed.amount} ₺`;
      }
    } else if (ext === '.csv' || ext === '.txt') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const csvResult = parseCsvContent(content);
      if (csvResult && csvResult.rows.length > 0) {
        parsed = csvResult;
        detectedType = 'csv';
        preview = `${csvResult.rows.length} satır · ${csvResult.headers.join(', ')}`;
      }
    } else if (['.jpg','.jpeg','.png','.gif','.bmp','.tiff'].includes(ext)) {
      detectedType = 'gorsel';
      preview = `${(fileSize / 1024).toFixed(1)} KB · Görsel dosya`;
    } else if (['.pdf'].includes(ext)) {
      detectedType = 'pdf';
      preview = `${(fileSize / 1024).toFixed(1)} KB · PDF dosya`;
    } else if (['.xls','.xlsx','.xlm','.xlsm'].includes(ext)) {
      detectedType = 'excel';
      preview = `${(fileSize / 1024).toFixed(1)} KB · Excel dosyası`;
    } else {
      detectedType = 'diger';
      preview = `${(fileSize / 1024).toFixed(1)} KB · ${ext.toUpperCase()} dosya`;
    }

    return { success: true, fileName, filePath, ext, detectedType, preview, parsed, size: fileSize };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('move-import-file', async (event, { filePath, targetFolder }) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return { success: false, message: 'Dosya bulunamadı.' };
    if (!targetFolder) return { success: false, message: 'Hedef klasör belirtilmedi.' };
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });
    const fileName = path.basename(filePath);
    const dest = path.join(targetFolder, fileName);
    fs.copyFileSync(filePath, dest);
    fs.unlinkSync(filePath);
    return { success: true, dest };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('scan-import-folder', async (event, folderPath) => {
  try {
    if (!folderPath || !fs.existsSync(folderPath)) return { success: false, message: 'Klasör bulunamadı.' };
    const files = fs.readdirSync(folderPath);
    const results = [];
    files.forEach(f => {
      const ext = path.extname(f).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        const fp = path.join(folderPath, f);
        try {
          const stat = fs.statSync(fp);
          if (stat.isFile()) results.push({ fileName: f, filePath: fp, ext, size: stat.size });
        } catch (_) {}
      }
    });
    return { success: true, files: results, total: results.length };
  } catch (err) {
    return { success: false, message: err.message };
  }
});
