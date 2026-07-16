const { app } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(app.getPath('userData'), 'toprak_gayrimenkul.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'gayrimenkul',  -- 'gayrimenkul' | 'derch' | 'yo'
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tx_type TEXT NOT NULL DEFAULT 'Gelir',    -- 'Gelir' | 'Gider'
    company_id INTEGER DEFAULT 1
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_cat_unique ON categories(name, tx_type, company_id);

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER DEFAULT 1,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,          -- 'Gelir' | 'Gider'
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,        -- 'Tamamlandı' | 'Bekliyor' | 'İptal'
    property_id INTEGER,
    staff_id INTEGER,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER DEFAULT 1,
    name TEXT NOT NULL,
    address TEXT,
    type TEXT,                   -- Toprak: 'Daire' | 'Villa' | 'Arsa' | 'İşyeri' | 'Dükkan'
    status TEXT,                 -- Toprak: 'Satılık' | 'Kiralık' | 'Satıldı' | 'Kiralandı'
    estimated_value REAL,
    commission_rate REAL DEFAULT 2.0,
    note TEXT,
    custom_fields TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER DEFAULT 1,
    full_name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    commission_rate REAL DEFAULT 1.5,
    monthly_salary REAL
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER DEFAULT 1,
    type TEXT NOT NULL,             -- 'e-Fatura' | 'e-Arsiv'
    number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_tax_id TEXT,
    customer_address TEXT,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'Taslak', -- 'Taslak' | 'Gonderildi' | 'Iptal'
    issue_date TEXT NOT NULL,
    due_date TEXT,
    description TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER DEFAULT 1,
    type TEXT NOT NULL,              -- 'Musteri' | 'Tedarikci'
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    tax_id TEXT,
    tax_office TEXT,
    address TEXT,
    notes TEXT,
    opening_balance REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS account_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    company_id INTEGER DEFAULT 1,
    date TEXT NOT NULL,
    type TEXT NOT NULL,              -- 'Borc' | 'Alacak'
    amount REAL NOT NULL,
    description TEXT,
    transaction_id INTEGER,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS agreements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER DEFAULT 1,
    date TEXT NOT NULL,
    company_name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'Aylık',    -- 'Günlük' | 'Haftalık' | 'Aylık' | 'Yıllık'
    amount REAL NOT NULL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Aktif',  -- 'Aktif' | 'Süresi Doldu' | 'İptal'
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ibans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER DEFAULT 1,
    name TEXT NOT NULL,
    iban TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Performance indexes
  CREATE INDEX IF NOT EXISTS idx_tx_company ON transactions(company_id);
  CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(status);
  CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category);
  CREATE INDEX IF NOT EXISTS idx_tx_company_date ON transactions(company_id, date);
  CREATE INDEX IF NOT EXISTS idx_prop_company ON properties(company_id);
  CREATE INDEX IF NOT EXISTS idx_staff_company ON staff(company_id);
  CREATE INDEX IF NOT EXISTS idx_inv_company ON invoices(company_id);
  CREATE INDEX IF NOT EXISTS idx_acc_company ON accounts(company_id);
  CREATE INDEX IF NOT EXISTS idx_actx_company ON account_transactions(company_id);
  CREATE INDEX IF NOT EXISTS idx_agr_company ON agreements(company_id);
  CREATE INDEX IF NOT EXISTS idx_iban_company ON ibans(company_id);
`);

// Migration: add company_id column to existing tables if missing
function migrateColumn(table, column, def) {
  try {
    const info = prep(`PRAGMA table_info(${table})`).all();
    if (!info.find(c => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} INTEGER DEFAULT ${def}`);
    }
  } catch (e) {}
}
migrateColumn('transactions', 'company_id', 1);
migrateColumn('properties', 'company_id', 1);
migrateColumn('properties', 'custom_fields', "'{}'");

migrateColumn('staff', 'company_id', 1);
migrateColumn('invoices', 'company_id', 1);
migrateColumn('accounts', 'company_id', 1);
migrateColumn('account_transactions', 'company_id', 1);
migrateColumn('agreements', 'company_id', 1);
migrateColumn('ibans', 'company_id', 1);

// Helper: get active company_id from settings (used for ADDING data)
function getActiveCompanyId() {
  const row = prep('SELECT value FROM settings WHERE key = ?').get('active_company');
  return row ? parseInt(row.value) || 1 : 1;
}

// Helper: get view-level company filter (used for VIEWING data). null = no filter (show all)
function getViewCompanyFilter() {
  const row = prep('SELECT value FROM settings WHERE key = ?').get('view_company_filter');
  if (!row || row.value === 'all') return null;
  const n = parseInt(row.value);
  return isNaN(n) ? null : n;
}

function relativeDate(monthOffset, day) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  d.setDate(day);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// Seed data function
function seedDatabase() {
  const checkSeeded = prep('SELECT value FROM settings WHERE key = ?').get('db_seeded');

  if (checkSeeded && checkSeeded.value === 'true') {
    seedCompanies();
    seedCompanyData();
    return;
  }

  // Seed default settings
  prep('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('theme', 'dark');
  
  // Seed companies
  seedCompanies();

  // Seed minimal properties for Toprak Gayrimenkul (company_id=1)
  const insertProperty = prep(`
    INSERT INTO properties (company_id, name, address, type, status, estimated_value, commission_rate, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertProperty.run(1, 'Kızılırmak Mah. 3+1 Daire', 'Kızılırmak Mahallesi, Sivas', 'Daire', 'Satılık', 2800000, 2.0, 'Merkezi konum');
  insertProperty.run(1, 'Mimar Sinan Dükkan', 'Mimar Sinan Mahallesi, Sivas', 'Dükkan', 'Kiralık', 1500000, 3.0, 'AVM yakını');
  insertProperty.run(1, 'Bağlarbaşı Villa', 'Bağlarbaşı Caddesi, Sivas', 'Villa', 'Satıldı', 3500000, 2.0, 'Bahçeli');

  // Seed staff for Toprak Gayrimenkul
  const insertStaff = prep(`
    INSERT INTO staff (company_id, full_name, role, phone, commission_rate, monthly_salary)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertStaff.run(1, 'Ahmet Yılmaz', 'Emlak Danışmanı', '0532 111 2233', 1.5, 17002);
  insertStaff.run(1, 'Elif Demir', 'Ofis Müdürü', '0544 222 3344', 2.0, 25000);

  // Seed minimal transactions for Toprak Gayrimenkul
  const insertTransaction = prep(`
    INSERT INTO transactions (company_id, date, description, type, category, amount, status, property_id, staff_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTransaction.run(1, relativeDate(0, 15), '3+1 Daire Satış Komisyonu', 'Gelir', 'Satış Komisyonu', 56000, 'Tamamlandı', 1, 1, 'Alıcı: Can Tekin');
  insertTransaction.run(1, relativeDate(0, 10), 'Ofis Kirası', 'Gider', 'Ofis Kirası', 8000, 'Tamamlandı', null, null, 'Mayıs');
  insertTransaction.run(1, relativeDate(0, 2), 'Ahmet Yılmaz Maaş', 'Gider', 'Personel Maaşı', 17002, 'Tamamlandı', null, 1, 'Mayıs');
  insertTransaction.run(1, relativeDate(-1, 18), 'Arsa Satış Komisyonu', 'Gelir', 'Satış Komisyonu', 36000, 'Tamamlandı', null, 1, 'Selçuklu Arsa');
  insertTransaction.run(1, relativeDate(0, 18), 'Bekleyen Tahsilat', 'Gelir', 'Satış Komisyonu', 24000, 'Bekliyor', 1, 1, 'Haziran');

  seedCompanyData();

  // Mark database as seeded
  prep('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('db_seeded', 'true');
}

function seedCompanies() {
  const existing = prep('SELECT COUNT(*) as cnt FROM companies').get();
  if (existing.cnt > 0) return;
  const ins = prep('INSERT INTO companies (name, type) VALUES (?, ?)');
  ins.run('Toprak Gayrimenkul', 'gayrimenkul');
  ins.run('Derch Media', 'derch');
  ins.run('Yo Media', 'yo');
  const first = prep('SELECT id FROM companies ORDER BY id ASC LIMIT 1').get();
  if (first) {
    prep('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('active_company', String(first.id));
  }
}

function seedCompanyData() {
  // Seed default categories
  const insCat = prep('INSERT OR IGNORE INTO categories (name, tx_type, company_id) VALUES (?, ?, ?)');
  // Toprak Gayrimenkul (company_id=1)
  const tgGelir = ['Satış Komisyonu','Kira Geliri','Danışmanlık','Kapora','Diğer Gelir'];
  const tgGider = ['Ofis Kirası','Personel Maaşı','Reklam','Araç Gideri','Vergi','Diğer Gider'];
  tgGelir.forEach(n => insCat.run(n, 'Gelir', 1));
  tgGider.forEach(n => insCat.run(n, 'Gider', 1));
  // Derch Media (company_id=2)
  const dcGelir = ['Sosyal Medya','Reklam Geliri','Web Tasarım','Danışmanlık','Diğer Gelir'];
  const dcGider = ['Ofis Kirası','Personel Maaşı','Reklam Bütçesi','Yazılım','Diğer Gider'];
  dcGelir.forEach(n => insCat.run(n, 'Gelir', 2));
  dcGider.forEach(n => insCat.run(n, 'Gider', 2));
  // Yo Media (company_id=3)
  const yoGelir = ['Abonelik','Sponsorluk','Reklam','Diğer Gelir'];
  const yoGider = ['Ofis Kirası','Personel Maaşı','Prodüksiyon','Yazılım','Diğer Gider'];
  yoGelir.forEach(n => insCat.run(n, 'Gelir', 3));
  yoGider.forEach(n => insCat.run(n, 'Gider', 3));
  // Only seed if no data exists for these companies
  const hasDerch = prep('SELECT COUNT(*) as cnt FROM properties WHERE company_id = 2').get().cnt > 0;
  const hasYo = prep('SELECT COUNT(*) as cnt FROM properties WHERE company_id = 3').get().cnt > 0;

  if (!hasDerch) {
    // Derch Media (company_id=2) - Markalar
    const insertProperty = prep(`
      INSERT INTO properties (company_id, name, address, type, status, estimated_value, commission_rate, note, custom_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertProperty.run(2, 'ABC Giyim', 'Instagram', '', 'Aktif', 15000, 0, 'Aylık yönetim', JSON.stringify({platform:'Instagram',paket:'Pro',aylik_ucret:15000}));
    insertProperty.run(2, 'DEF Restoran', 'Facebook', '', 'Aktif', 8000, 0, 'Sosyal medya', JSON.stringify({platform:'Facebook',paket:'Temel',aylik_ucret:8000}));

    const insertStaff = prep(`
      INSERT INTO staff (company_id, full_name, role, phone, commission_rate, monthly_salary)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertStaff.run(2, 'Merve Yıldız', 'Sosyal Medya Uzmanı', '0533 444 5566', 0, 22000);

    const insertTx = prep(`
      INSERT INTO transactions (company_id, date, description, type, category, amount, status, property_id, staff_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTx.run(2, relativeDate(0, 1), 'ABC Sosyal Medya Paketi', 'Gelir', 'Sosyal Medya', 15000, 'Tamamlandı', 1, 1, 'Haziran');
    insertTx.run(2, relativeDate(0, 5), 'Ofis Kirası', 'Gider', 'Ofis Kirası', 6000, 'Tamamlandı', null, null, 'Haziran');
    insertTx.run(2, relativeDate(0, 3), 'Merve Yıldız Maaş', 'Gider', 'Personel Maaşı', 22000, 'Tamamlandı', null, 1, 'Haziran');

    const insertAccount = prep(`
      INSERT INTO accounts (company_id, type, company_name, contact_person, phone, tax_id, opening_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertAccount.run(2, 'Musteri', 'ABC Mağazası', 'Ali Korkmaz', '0543 111 2233', '1234567890', 0);
  }

  if (!hasYo) {
    // Yo Media (company_id=3) - Sivas Durak
    const insertStaff = prep(`
      INSERT INTO staff (company_id, full_name, role, phone, commission_rate, monthly_salary)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertStaff.run(3, 'Zeynep Aksoy', 'İçerik Yöneticisi', '0505 111 2222', 0, 19000);

    const insertTx = prep(`
      INSERT INTO transactions (company_id, date, description, type, category, amount, status, property_id, staff_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTx.run(3, relativeDate(0, 2), 'Sivas Durak Abonelik - Düğün Salonu', 'Gelir', 'Abonelik', 5000, 'Tamamlandı', null, null, 'Haziran');
    insertTx.run(3, relativeDate(0, 2), 'Sivas Durak Abonelik - Restoran', 'Gelir', 'Abonelik', 3000, 'Tamamlandı', null, null, 'Haziran');
    insertTx.run(3, relativeDate(0, 7), 'Ofis Kirası', 'Gider', 'Ofis Kirası', 4000, 'Tamamlandı', null, null, 'Haziran');
    insertTx.run(3, relativeDate(0, 5), 'Zeynep Aksoy Maaş', 'Gider', 'Personel Maaşı', 19000, 'Tamamlandı', null, 1, 'Haziran');

    const insertAgreement = prep(`
      INSERT INTO agreements (company_id, date, company_name, plan, amount, start_date, end_date, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertAgreement.run(3, relativeDate(0, 1), 'Muhteşem Düğün Salonu', 'Aylık', 5000, relativeDate(0, 1), relativeDate(1, 1), 'Sivas Durak tanıtım', 'Aktif');
    insertAgreement.run(3, relativeDate(0, 1), 'SivasPark AVM', 'Yıllık', 36000, relativeDate(0, 1), relativeDate(12, 1), 'Yıllık üyelik', 'Aktif');

    const insertAccount = prep(`
      INSERT INTO accounts (company_id, type, company_name, contact_person, phone, tax_id, opening_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertAccount.run(3, 'Musteri', 'Muhteşem Düğün Salonu', 'Ayşe Demir', '0532 111 2233', '1112223330', 0);
  }

}

seedDatabase();

// DB functions to expose
const stmtCache = {};
function prep(sql) {
  if (!stmtCache[sql]) stmtCache[sql] = prep(sql);
  return stmtCache[sql];
}
module.exports = {
  db,
  
  // Companies
  getCompanies() {
    return prep('SELECT * FROM companies ORDER BY id ASC').all();
  },
  getCompany(id) {
    const row = prep('SELECT * FROM companies WHERE id = ?').get(id);
    return row || null;
  },
  addCompany(data) {
    const info = prep('INSERT INTO companies (name, type) VALUES (?, ?)').run(data.name, data.type || 'gayrimenkul');
    return info.lastInsertRowid;
  },
  updateCompany(id, data) {
    const info = prep('UPDATE companies SET name = ?, type = ? WHERE id = ?').run(data.name, data.type, id);
    return info.changes > 0;
  },
  deleteCompany(id) {
    const info = prep('DELETE FROM companies WHERE id = ?').run(id);
    return info.changes > 0;
  },
  getActiveCompany() {
    const row = prep('SELECT value FROM settings WHERE key = ?').get('active_company');
    const id = row ? parseInt(row.value) || 1 : 1;
    return prep('SELECT * FROM companies WHERE id = ?').get(id) || { id: 1, name: 'Toprak Gayrimenkul', type: 'gayrimenkul' };
  },
  setActiveCompany(id) {
    prep('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('active_company', String(id));
    return true;
  },

  // Auth Settings
  getUser() {
    const row = prep('SELECT value FROM settings WHERE key = ?').get('user_name');
    return row ? row.value : null;
  },
  setUser(name) {
    prep('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('user_name', name);
    return true;
  },
  logout() {
    prep('DELETE FROM settings WHERE key = ?').run('user_name');
    return true;
  },
  
  // Theme Settings
  getTheme() {
    const row = prep('SELECT value FROM settings WHERE key = ?').get('theme');
    return row ? row.value : 'dark';
  },
  setTheme(theme) {
    prep('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('theme', theme);
    return true;
  },

  // Window bounds
  getWindowBounds() {
    const row = prep('SELECT value FROM settings WHERE key = ?').get('window_bounds');
    return row ? JSON.parse(row.value) : null;
  },
  setWindowBounds(bounds) {
    prep('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('window_bounds', JSON.stringify(bounds));
    return true;
  },

  // Transactions
  getTransactions(filters = {}) {
    const cid = getViewCompanyFilter();
    let sql = `
      SELECT t.*, p.name as property_name, s.full_name as staff_name 
      FROM transactions t
      LEFT JOIN properties p ON t.property_id = p.id
      LEFT JOIN staff s ON t.staff_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (cid) { sql += ' AND t.company_id = ?'; params.push(cid); }

    if (filters.type) {
      sql += ' AND t.type = ?';
      params.push(filters.type);
    }
    if (filters.category) {
      sql += ' AND t.category = ?';
      params.push(filters.category);
    }
    if (filters.status) {
      sql += ' AND t.status = ?';
      params.push(filters.status);
    }
    if (filters.startDate) {
      sql += ' AND t.date >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      sql += ' AND t.date <= ?';
      params.push(filters.endDate);
    }
    if (filters.search) {
      sql += ' AND (t.description LIKE ? OR t.note LIKE ? OR p.name LIKE ? OR s.full_name LIKE ?)';
      const pattern = `%${filters.search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    sql += ' ORDER BY t.date DESC, t.id DESC';
    return prep(sql).all(...params);
  },

  addTransaction(data) {
    const cid = getActiveCompanyId();
    const stmt = prep(`
      INSERT INTO transactions (company_id, date, description, type, category, amount, status, property_id, staff_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      cid,
      data.date,
      data.description,
      data.type,
      data.category,
      Number(data.amount),
      data.status,
      data.property_id || null,
      data.staff_id || null,
      data.note || ''
    );
    return info.lastInsertRowid;
  },

  updateTransaction(id, data) {
    const stmt = prep(`
      UPDATE transactions 
      SET date = ?, description = ?, type = ?, category = ?, amount = ?, status = ?, property_id = ?, staff_id = ?, note = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      data.date,
      data.description,
      data.type,
      data.category,
      Number(data.amount),
      data.status,
      data.property_id || null,
      data.staff_id || null,
      data.note || '',
      id
    );
    return info.changes > 0;
  },

  deleteTransaction(id) {
    const stmt = prep('DELETE FROM transactions WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  },

  // Properties
  getProperties() {
    const cid = getViewCompanyFilter();
    let joinCond = 'ON p.id = t.property_id';
    const params = [];
    if (cid) {
      joinCond += ' AND t.company_id = ?';
      params.push(cid);
    }
    let sql = `
      SELECT p.*, 
        SUM(CASE WHEN t.type = 'Gelir' AND t.status = 'Tamamlandı' THEN t.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN t.type = 'Gider' AND t.status = 'Tamamlandı' THEN t.amount ELSE 0 END) as total_expense
      FROM properties p
      LEFT JOIN transactions t ${joinCond}
      WHERE 1=1
    `;
    if (cid) { sql += ' AND p.company_id = ?'; params.push(cid); }
    sql += ' GROUP BY p.id ORDER BY p.id DESC';
    const rows = prep(sql).all(...params);
    return rows;
  },

  addProperty(data) {
    const cid = getActiveCompanyId();
    const stmt = prep(`
      INSERT INTO properties (company_id, name, address, type, status, estimated_value, commission_rate, note, custom_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      cid,
      data.name,
      data.address || '',
      data.type || '',
      data.status || '',
      Number(data.estimated_value) || 0,
      Number(data.commission_rate) || 0,
      data.note || '',
      data.custom_fields || '{}'
    );
    return info.lastInsertRowid;
  },

  updateProperty(id, data) {
    const stmt = prep(`
      UPDATE properties 
      SET name = ?, address = ?, type = ?, status = ?, estimated_value = ?, commission_rate = ?, note = ?, custom_fields = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      data.name,
      data.address || '',
      data.type || '',
      data.status || '',
      Number(data.estimated_value) || 0,
      Number(data.commission_rate) || 0,
      data.note || '',
      data.custom_fields || '{}',
      id
    );
    return info.changes > 0;
  },

  deleteProperty(id) {
    // Unlink from transactions
    prep('UPDATE transactions SET property_id = NULL WHERE property_id = ?').run(id);
    const stmt = prep('DELETE FROM properties WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  },

  // Staff
  getStaff() {
    const cid = getViewCompanyFilter();
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    
    let joinCond = 'ON s.id = t.staff_id';
    const params = [];
    if (cid) {
      joinCond += ' AND t.company_id = ?';
      params.push(cid);
    }
    
    let sql = `
      SELECT s.*,
        SUM(CASE WHEN t.type = 'Gelir' AND t.status = 'Tamamlandı' THEN t.amount * (s.commission_rate / 100.0) ELSE 0 END) as total_all_time_commissions,
        SUM(CASE WHEN t.type = 'Gelir' AND t.status = 'Tamamlandı' AND t.date LIKE '${currentMonthPrefix}%' THEN t.amount * (s.commission_rate / 100.0) ELSE 0 END) as current_month_commissions
      FROM staff s
      LEFT JOIN transactions t ${joinCond}
      WHERE 1=1
    `;
    if (cid) { sql += ' AND s.company_id = ?'; params.push(cid); }
    sql += ' GROUP BY s.id ORDER BY s.id DESC';
    const rows = prep(sql).all(...params);
    return rows;
  },

  addStaff(data) {
    const cid = getActiveCompanyId();
    const stmt = prep(`
      INSERT INTO staff (company_id, full_name, role, phone, commission_rate, monthly_salary)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      cid,
      data.full_name,
      data.role,
      data.phone || '',
      Number(data.commission_rate) || 1.5,
      Number(data.monthly_salary) || 0
    );
    return info.lastInsertRowid;
  },

  updateStaff(id, data) {
    const stmt = prep(`
      UPDATE staff 
      SET full_name = ?, role = ?, phone = ?, commission_rate = ?, monthly_salary = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      data.full_name,
      data.role,
      data.phone || '',
      Number(data.commission_rate) || 1.5,
      Number(data.monthly_salary) || 0,
      id
    );
    return info.changes > 0;
  },

  deleteStaff(id) {
    // Unlink from transactions
    prep('UPDATE transactions SET staff_id = NULL WHERE staff_id = ?').run(id);
    const stmt = prep('DELETE FROM staff WHERE id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  },

  // Invoices (e-Fatura / e-Arsiv)
  getInvoices(filters = {}) {
    const cid = getViewCompanyFilter();
    let sql = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];
    if (cid) { sql += ' AND company_id = ?'; params.push(cid); }
    if (filters.type) { sql += ' AND type = ?'; params.push(filters.type); }
    if (filters.status) { sql += ' AND status = ?'; params.push(filters.status); }
    if (filters.search) {
      sql += ' AND (customer_name LIKE ? OR number LIKE ? OR description LIKE ?)';
      const p = `%${filters.search}%`;
      params.push(p, p, p);
    }
    sql += ' ORDER BY issue_date DESC, id DESC';
    return prep(sql).all(...params);
  },

  addInvoice(data) {
    const cid = getActiveCompanyId();
    const stmt = prep(`INSERT INTO invoices (company_id, type, number, customer_name, customer_tax_id, customer_address, amount, status, issue_date, due_date, description, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const info = stmt.run(cid, data.type, data.number, data.customer_name, data.customer_tax_id || '', data.customer_address || '', Number(data.amount), data.status || 'Taslak', data.issue_date, data.due_date || '', data.description || '', data.notes || '');
    return info.lastInsertRowid;
  },

  updateInvoice(id, data) {
    const stmt = prep(`UPDATE invoices SET type=?, number=?, customer_name=?, customer_tax_id=?, customer_address=?, amount=?, status=?, issue_date=?, due_date=?, description=?, notes=? WHERE id=?`);
    const info = stmt.run(data.type, data.number, data.customer_name, data.customer_tax_id || '', data.customer_address || '', Number(data.amount), data.status || 'Taslak', data.issue_date, data.due_date || '', data.description || '', data.notes || '', id);
    return info.changes > 0;
  },

  deleteInvoice(id) {
    const info = prep('DELETE FROM invoices WHERE id = ?').run(id);
    return info.changes > 0;
  },

  // Accounts (Cari Hesap)
  getAccounts() {
    const cid = getViewCompanyFilter();
    let sql = `
      SELECT a.*,
        COALESCE((SELECT SUM(CASE WHEN at.type='Borc' THEN at.amount ELSE 0 END) - SUM(CASE WHEN at.type='Alacak' THEN at.amount ELSE 0 END) FROM account_transactions at WHERE at.account_id = a.id), 0) + a.opening_balance as balance
      FROM accounts a WHERE 1=1
    `;
    const params = [];
    if (cid) { sql += ' AND a.company_id = ?'; params.push(cid); }
    sql += ' ORDER BY a.company_name ASC';
    const rows = prep(sql).all(...params);
    return rows;
  },

  addAccount(data) {
    const cid = getActiveCompanyId();
    const stmt = prep(`INSERT INTO accounts (company_id, type, company_name, contact_person, phone, email, tax_id, tax_office, address, notes, opening_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const info = stmt.run(cid, data.type, data.company_name, data.contact_person || '', data.phone || '', data.email || '', data.tax_id || '', data.tax_office || '', data.address || '', data.notes || '', Number(data.opening_balance) || 0);
    return info.lastInsertRowid;
  },

  updateAccount(id, data) {
    const stmt = prep(`UPDATE accounts SET type=?, company_name=?, contact_person=?, phone=?, email=?, tax_id=?, tax_office=?, address=?, notes=?, opening_balance=? WHERE id=?`);
    const info = stmt.run(data.type, data.company_name, data.contact_person || '', data.phone || '', data.email || '', data.tax_id || '', data.tax_office || '', data.address || '', data.notes || '', Number(data.opening_balance) || 0, id);
    return info.changes > 0;
  },

  deleteAccount(id) {
    prep('DELETE FROM account_transactions WHERE account_id = ?').run(id);
    const info = prep('DELETE FROM accounts WHERE id = ?').run(id);
    return info.changes > 0;
  },

  getAccountTransactions(accountId) {
    return prep(`SELECT * FROM account_transactions WHERE account_id = ? ORDER BY date DESC, id DESC`).all(accountId);
  },

  addAccountTransaction(data) {
    const cid = getActiveCompanyId();
    const stmt = prep(`INSERT INTO account_transactions (company_id, account_id, date, type, amount, description, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const info = stmt.run(cid, data.account_id, data.date, data.type, Number(data.amount), data.description || '', data.transaction_id || null);
    return info.lastInsertRowid;
  },

  deleteAccountTransaction(id) {
    const info = prep('DELETE FROM account_transactions WHERE id = ?').run(id);
    return info.changes > 0;
  },

  // Agreements (Sözleşmeler)
  getAgreements() {
    const cid = getViewCompanyFilter();
    let sql = 'SELECT * FROM agreements WHERE 1=1';
    const params = [];
    if (cid) { sql += ' AND company_id = ?'; params.push(cid); }
    sql += ' ORDER BY date DESC, id DESC';
    return prep(sql).all(...params);
  },
  addAgreement(data) {
    const cid = getActiveCompanyId();
    const stmt = prep(`INSERT INTO agreements (company_id, date, company_name, plan, amount, start_date, end_date, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const info = stmt.run(cid, data.date, data.company_name, data.plan, Number(data.amount), data.start_date || '', data.end_date || '', data.description || '', data.status || 'Aktif');
    return info.lastInsertRowid;
  },
  updateAgreement(id, data) {
    const stmt = prep(`UPDATE agreements SET date=?, company_name=?, plan=?, amount=?, start_date=?, end_date=?, description=?, status=? WHERE id=?`);
    const info = stmt.run(data.date, data.company_name, data.plan, Number(data.amount), data.start_date || '', data.end_date || '', data.description || '', data.status || 'Aktif', id);
    return info.changes > 0;
  },
  deleteAgreement(id) {
    const info = prep('DELETE FROM agreements WHERE id = ?').run(id);
    return info.changes > 0;
  },

  // Categories
  getCategories(txType) {
    let sql = 'SELECT * FROM categories WHERE 1=1';
    const params = [];
    if (txType) { sql += ' AND tx_type = ?'; params.push(txType); }
    sql += ' ORDER BY name ASC';
    return prep(sql).all(...params);
  },
  addCategory(data) {
    const info = prep('INSERT INTO categories (name, tx_type, company_id) VALUES (?, ?, ?)').run(data.name, data.tx_type || 'Gelir', data.company_id || 1);
    return info.lastInsertRowid;
  },
  updateCategory(id, data) {
    const info = prep('UPDATE categories SET name = ?, tx_type = ? WHERE id = ?').run(data.name, data.tx_type, id);
    return info.changes > 0;
  },
  deleteCategory(id) {
    const info = prep('DELETE FROM categories WHERE id = ?').run(id);
    return info.changes > 0;
  },

  // Settings
  getSetting(key) {
    const row = prep('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  },

  setSetting(key, value) {
    prep('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    return true;
  },

  // IBANs
  getIbans() {
    const cid = getViewCompanyFilter();
    let sql = 'SELECT * FROM ibans WHERE 1=1';
    const params = [];
    if (cid) { sql += ' AND company_id = ?'; params.push(cid); }
    sql += ' ORDER BY name ASC';
    return prep(sql).all(...params);
  },

  addIban(data) {
    const cid = getActiveCompanyId();
    const stmt = prep(`INSERT INTO ibans (company_id, name, iban, description) VALUES (?, ?, ?, ?)`);
    const info = stmt.run(cid, data.name, data.iban, data.description || '');
    return info.lastInsertRowid;
  },

  updateIban(id, data) {
    const stmt = prep(`UPDATE ibans SET name=?, iban=?, description=? WHERE id=?`);
    const info = stmt.run(data.name, data.iban, data.description || '', id);
    return info.changes > 0;
  },

  deleteIban(id) {
    const info = prep('DELETE FROM ibans WHERE id = ?').run(id);
    return info.changes > 0;
  },

  // View Company Filter (for viewing across companies)
  getViewCompanyFilter() {
    const row = prep('SELECT value FROM settings WHERE key = ?').get('view_company_filter');
    return row ? row.value : 'all';
  },

  setViewCompanyFilter(value) {
    prep('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('view_company_filter', value);
    return true;
  }
};
