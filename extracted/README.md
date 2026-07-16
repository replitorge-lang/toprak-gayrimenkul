# Toprak Gayrimenkul Finansal Yönetim Paneli

Bu uygulama, Sivas merkezli **Toprak Gayrimenkul** emlak ofisinin satış komisyonları, kira gelirleri, ofis giderleri, personel maaşları ve prim ödemelerini takip etmesi için özel olarak geliştirilmiş modern bir masaüstü uygulamasıdır.

## 🛠️ Teknolojiler
- **Altyapı:** Electron.js (v30.0.0)
- **Arayüz:** HTML5, Modern Vanilla CSS, Vanilla JavaScript (ES6)
- **Grafikler:** Chart.js (Yerel olarak paketlenmiş)
- **Veritabanı:** SQLite (`better-sqlite3` native modülü)
- **Paketleme:** `electron-builder` (Windows NSIS Kurulum Yardımcısı)

## 📁 Dosya Yapısı
```text
toprak-gayrimenkul/
├── main.js              # Ana Electron süreci (Pencereler, Veritabanı ve Dışa Aktarım IPC)
├── preload.js           # Güvenli contextBridge geçiş katmanı
├── package.json         # Proje bağımlılıkları ve çalıştırma scriptleri
├── electron-builder.yml # Windows .exe kurulum yapılandırma dosyası
├── README.md            # Kurulum ve çalıştırma kılavuzu
├── db/
│   └── database.js      # Veritabanı tablolarının oluşturulması ve seed veriler
├── assets/
│   ├── icon.png         # Masaüstü uygulama simgesi (Yerini değiştirebilirsiniz)
│   └── logo.png         # Arayüzdeki şirket logosu (Yerini değiştirebilirsiniz)
└── renderer/
    ├── index.html       # Ana kontrol paneli ekranı
    ├── login.html       # İsimle hızlı giriş ekranı
    ├── style.css        # Modern karanlık/aydınlık tema ve arayüz stilleri
    ├── chart.js         # Çevrimdışı çalışabilen yerel Chart.js kütüphanesi
    └── app.js           # Görünüm geçişleri, form doğrulamaları ve tablo dinamikleri
```

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
Uygulamayı çalıştırmak veya derlemek için sisteminizde **Node.js** (v18+) kurulu olmalıdır. SQLite yerel modüllerini derlemek için Windows'ta derleme araçlarının (C++ Build Tools / Python) kurulu olması gerekebilir.

1. **Bağımlılıkları Yükleyin:**
   ```bash
   npm install
   ```

2. **Geliştirme Modunda Çalıştırın (Dev Mode):**
   ```bash
   npm start
   ```

3. **Windows .exe Kurulum Dosyasını Derleyin:**
   Bu komut `/dist/` klasörü altında Windows için kurulabilir bir `.exe` dosyası oluşturur.
   ```bash
   npm run build
   ```

## 🎨 Logoyu ve Simgeleri Değiştirme
- **Uygulama İçi Logo:** `assets/logo.png` dosyasını kendi şirket logonuzla (önerilen boyut: `200x80` veya benzer oranlarda) değiştirmeniz yeterlidir. Arayüz otomatik olarak yeni logoyu yükleyecektir.
- **Masaüstü ve Kurulum Simgesi:** `assets/icon.png` dosyasını kendi uygulama simgenizle (`256x256` piksel PNG) değiştirerek derleme yapabilirsiniz.
