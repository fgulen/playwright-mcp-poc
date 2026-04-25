# TestPilot POC — Playwright MCP Dashboard

Playwright MCP & CLI tabanlı KI-Testinfrastruktur için POC demo dashboard.  
Tek HTML dosyası, sıfır bağımlılık, tarayıcıda direkt çalışır.

## Hızlı Başlangıç

```bash
# Dosyayı tarayıcıda aç (herhangi bir web sunucusu gerekmez)
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

## Özellikler

| Tab | İçerik |
|-----|--------|
| 🔧 Kurulum | MCP kurulum komutları, Cline/Kiro config, kurulum checklist |
| 📋 Test Planı | Plan oluştur/düzenle/sil, durum takibi (Draft → Tamamlandı) |
| 💬 Prompt Yönetimi | 7 hazır DB senaryosu, drag-drop sıralama, JSON export/import |
| 🚀 Çalıştırma | Cline/Kiro için prompt kopyala, süre sayacı, adım durumları |
| 📊 Rapor | Özet istatistikler, not alanları, HTML rapor indirme |

## Playwright MCP Kurulumu

```bash
npx @playwright/mcp@latest
```

### Cline (`cline_mcp_settings.json`)

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

### Kiro (`.kiro/settings/mcp.json`)

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

## Demo Senaryosu

**Deutsche Bahn E2E Testi** — 7 adım:

| Prompt | Görev |
|--------|-------|
| P-01 | bahn.de'ye git, sayfayı doğrula |
| P-02 | Köln Hbf → Berlin Hbf formu doldur |
| P-03 | ICE, 1. Klasse, BahnCard 25, gidiş-dönüş filtreleri |
| P-04 | Arama yap, sonuçları analiz et |
| P-05 | En uygun seferi seç, detayları incele |
| P-06 | Tarife analizi, BahnCard indirim doğrulama |
| P-07 | Güvenlik sınırı: satın alma YOK, özet rapor |

## Kullanım Akışı

1. `index.html` dosyasını tarayıcıda aç
2. **Kurulum** tabında checklist'i tamamla
3. **Test Planı** tabında yeni plan oluştur
4. **Prompt Yönetimi** tabında promptları gözden geçir / özelleştir
5. **Çalıştırma** tabında:
   - İstenen promptları seç
   - "Cline için Kopyala" veya "Kiro için Kopyala" butonuna tıkla
   - Kopyalanan metni IDE'ye yapıştır
   - Süre sayacını başlat
   - Her adım tamamlandıkça ✅/❌ durumunu güncelle
6. **Rapor** tabında sonuçları gör, HTML olarak indir

## Teknik Detaylar

- **Depolama**: LocalStorage (`testpilot_` prefix), otomatik kayıt (500ms debounce)
- **Bağımlılık**: Sıfır — CDN, npm, build adımı yok
- **Tarayıcı uyumu**: Modern Chromium/Firefox/Safari
- **Tema**: `prefers-color-scheme` ile otomatik dark/light mode
- **Minimum genişlik**: 900px (demo ekranı için optimize)

## Dosya Yapısı

```
playwright-mcp-poc/
├── index.html     ← Dashboard (tek dosya, tüm CSS+JS inline)
├── CLAUDE.md      ← Claude Code talimatları
├── CONTEXT.md     ← Proje bağlamı ve DB senaryo promptları
└── README.md      ← Bu dosya
```
