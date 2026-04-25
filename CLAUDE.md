# TestPilot POC — Claude Code Talimatları

## Proje Özeti
Playwright MCP & CLI tabanlı KI-Testinfrastruktur için POC Demo Dashboard.
Hedef: Cline/Kiro demo'su için tek HTML dosyası — Deutsche Bahn üzerinde karmaşık E2E test senaryosu.

## Teknoloji Kısıtlamaları
- **Tek dosya**: Her şey `index.html` içinde (CSS + JS inline)
- **Sıfır dependency**: CDN yok, npm yok — sadece vanilla HTML/CSS/JS
- **LocalStorage**: Tüm veriler tarayıcıda kalıcı olarak saklanır
- **Türkçe UI**: Tüm arayüz metinleri Türkçe
- **Dark mode**: CSS variables ile otomatik tema desteği

## Dosya Yapısı
```
testpilot-poc/
├── CLAUDE.md          ← Bu dosya (dashboard talimatları)
├── CONTEXT.md         ← Proje bağlamı, DB promptları, system prompt
├── FRAMEWORK.md       ← Playwright framework scaffold kuralları
├── START_HERE.md      ← Claude Code başlangıç promptu
├── index.html         ← TEK çıktı dosyası (dashboard)
└── README.md          ← Kurulum talimatları (Claude Code yazar)
```

> **FRAMEWORK.md ne zaman okunur?**
> Kullanıcı dashboard'da "generate framework" / "framework oluştur" yazınca
> Claude Code FRAMEWORK.md'yi okur ve `playwright-framework/` klasörünü oluşturur.

## Dashboard Bölümleri — Kesin Sıra

### TAB 1: 🔧 Kurulum
MCP ve CLI kurulum adımları. Her komut kopyalanabilir kod bloğu.
Cline config + Kiro config — düzenlenebilir textarea, kopyala butonu.
Checklist: kullanıcı her adımı işaretleyebilir. LocalStorage'a kaydedilir.

**MCP Kurulum komutları:**
```
npx @playwright/mcp@latest
```

**Cline MCP Config (`cline_mcp_settings.json`):**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": { "PLAYWRIGHT_HEADLESS": "false" }
    }
  }
}
```

**Kiro MCP Config (`.kiro/settings/mcp.json`):**
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--browser", "chromium"],
      "timeout": 30000
    }
  }
}
```

### TAB 2: 📋 Test Planı
- Test Plan No: Otomatik (TP-001, TP-002...) — manuel override mümkün
- Test Adı: Düzenlenebilir input
- Hedef URL: Düzenlenebilir (varsayılan: https://www.bahn.de)
- Açıklama: Serbest textarea
- Durum dropdown: Draft / Hazır / Çalışıyor / Tamamlandı / Başarısız
- Oluşturma tarihi: Otomatik
- "Yeni Plan" butonu: Mevcut planı kaydet, yeni başlat
- Kayıtlı planlar listesi: tıklayınca yükle

### TAB 3: 💬 Prompt Yönetimi (Ana Bölüm)
Her prompt bir kart. Varsayılan olarak DB senaryosunun 7 promptu yüklü gelir.

**Kart yapısı:**
- Numara: P-01, P-02... (otomatik, sürükle-bırak ile değişir)
- Başlık: Düzenlenebilir input
- Prompt içeriği: Büyük textarea (min 120px yükseklik, otomatik büyür)
- Tag'ler: navigation / form / validation / assertion / reporting (çoklu seçim)
- Token tahmini: Karakter sayısına göre (her 4 karakter ≈ 1 token)
- Butonlar: 📋 Kopyala | 🗑️ Sil | ⬆️⬇️ Sırala | 🔽 Daralt

**Toolbar:**
- "+ Prompt Ekle" — yeni boş kart, en alta eklenir
- "Şablondan Ekle" dropdown: Login, Form Doldur, Navigation, Assertion, Screenshot
- "Tümünü Kopyala" — tüm promptları sırayla tek metne birleştirir
- "JSON Dışa Aktar" / "JSON İçe Aktar"

**Varsayılan 7 Prompt (DB Senaryosu):**
Tüm promptlar CONTEXT.md dosyasındaki "DB Senaryo Promptları" bölümünden alınır.

### TAB 4: 🚀 Çalıştırma
- Prompt listesi: hangi promptu çalıştıracağın (checkbox ile seç)
- "Cline için Kopyala" / "Kiro için Kopyala" butonu — seçili promptları + system prompt'u birleştirir
- System prompt alanı: düzenlenebilir, varsayılan CONTEXT.md'den
- Manuel log textarea: notlar, gözlemler
- Süre sayacı: başlat/durdur
- Adım durumu: her prompt için ✅ ❌ ⏳ butonu

### TAB 5: 📊 Rapor
- Her prompt satırı: durum (✅/❌/⏳) + not alanı
- Özet: Toplam / Başarılı / Başarısız / Atlandı sayıları
- Çalışma süresi
- "HTML Olarak İndir" butonu
- Tablo formatında görünüm

## UX Kuralları
- Tüm değişiklikler **otomatik kaydedilir** (LocalStorage, debounce 500ms)
- Kayıt göstergesi: sağ üstte küçük "✓ Kaydedildi" flash mesajı
- Tab geçişi smooth scroll değil, anlık
- Responsive: minimum 900px genişlik için tasarlanmış (demo ekranı)
- Font: system-ui stack (özel font yok)
- Renk paleti: Aşağıda tanımlı

## Renk Paleti
```css
--brand-primary: #6366f1;    /* indigo — ana aksiyon */
--brand-hover: #4f46e5;
--success: #10b981;
--warning: #f59e0b;
--danger: #ef4444;
--info: #3b82f6;
--bg-primary: #ffffff;       /* light mode */
--bg-secondary: #f8fafc;
--bg-tertiary: #f1f5f9;
--border: #e2e8f0;
--text-primary: #1e293b;
--text-secondary: #64748b;
--text-muted: #94a3b8;
```
Dark mode: prefers-color-scheme media query ile otomatik tersine çevrilir.

## Kod Standartları
- Her fonksiyon max 30 satır
- LocalStorage key prefix: `testpilot_`
- Event delegation kullan — her kart için ayrı listener ekleme
- Prompt ID'leri: UUID benzeri timestamp tabanlı (`tp_${Date.now()}`)
- Sürükle-bırak: Native HTML5 Drag & Drop API (library yok)

## Yapılış Sırası (Claude Code bunu takip eder)
1. `index.html` iskelet + CSS değişkenleri + dark mode
2. Tab navigasyonu + LocalStorage wrapper fonksiyonları
3. TAB 1: Kurulum (statik içerik + checklist)
4. TAB 2: Test Planı CRUD
5. TAB 3: Prompt Yönetimi (en karmaşık kısım)
   a. Prompt listesi render
   b. Add/Delete/Edit
   c. Drag & Drop sıralama
   d. Export/Import JSON
6. TAB 4: Çalıştırma paneli
7. TAB 5: Rapor + HTML indirme
8. README.md oluştur
9. Son test: tüm tablar, LocalStorage kalıcılığı, dark mode

## Yasaklar
- `alert()` / `confirm()` kullanma — custom modal veya inline feedback
- `innerHTML` yerine DOM API tercih et (XSS önlemi)
- Framework bağımlılığı (React, Vue vb.) — vanilla JS
- Inline event handler (`onclick="..."`) yerine addEventListener
- `!important` CSS — spesifite ile çöz
