# Playwright MCP POC — Claude Code Başlangıç Promptu

Bu dosyayı Claude Code'a kopyalayıp yapıştır. Tek seferde tüm projeyi oluşturur.

---

## BAŞLANGIÇ PROMPTU (Kopyala & Yapıştır)

```
Bu klasördeki CLAUDE.md ve CONTEXT.md dosyalarını oku.
Sonra aşağıdaki görevi gerçekleştir:

GÖREV: Playwright MCP POC Dashboard'u oluştur.

1. CLAUDE.md'deki tüm talimatları uygula
2. CONTEXT.md'deki DB senaryo promptlarını (P-01'den P-07'ye) 
   varsayılan veri olarak dashboard'a göm
3. Tek bir `index.html` dosyası oluştur

Yapılış sırası CLAUDE.md'de belirtilmiş — o sırayı takip et.
Her bölümü tamamladıkça kısa bir özet ver, sonra devam et.
Bitince README.md'yi de yaz.
```

---

## DEVAM PROMPTLARI (Gerekirse)

### Sorun çıkarsa:
```
index.html'i aç, [SORUNLU BÖLÜM]'ü düzelt.
CLAUDE.md'deki kurallara uymaya devam et.
```

### Özellik eklemek için:
```
index.html'e şu özelliği ekle: [ÖZELLİK]
Mevcut kodu bozmadan, LocalStorage entegrasyonunu koru.
```

### Test etmek için:
```
index.html'i tarayıcıda açtım.
[SORUN AÇIKLAMASI]
Düzelt ve neyi değiştirdiğini açıkla.
```

### JSON export test:
```
Dashboard'da prompt ekle, JSON dışa aktar, 
sayfayı yenile, JSON içe aktar — bu akışı test et.
Sorun varsa düzelt.
```

---

## CLAUDE CODE AYARLARI (İlk Kullanım)

### Gerekli izinler:
- ✅ Dosya okuma (CLAUDE.md, CONTEXT.md)
- ✅ Dosya yazma (index.html, README.md)
- ❌ Terminal komutları gerekmez
- ❌ Internet erişimi gerekmez

### Klasör yapısı:
```
testpilot-poc/     ← Bu klasörde Claude Code'u başlat
├── CLAUDE.md
├── CONTEXT.md
├── START_HERE.md  ← Bu dosya
├── index.html     ← Claude Code bunu oluşturacak
└── README.md      ← Claude Code bunu oluşturacak
```

### VS Code ile açmak için:
```bash
cd testpilot-poc
code .
```
Sonra Claude Code extension'ı aç, START_HERE.md'deki promptu yapıştır.

---

## BEKLENTİLER

Dashboard hazır olduğunda şunları yapabileceksin:

1. **index.html'i tarayıcıda aç** — hiçbir kurulum gerekmez
2. **Kurulum sekmesinde** MCP config'leri kopyala
3. **Prompt sekmesinde** 7 DB promptunu gör, düzenle, ekle
4. **Çalıştırma sekmesinde** seçili promptları Cline/Kiro için hazırla
5. **Rapor sekmesinde** sonuçları işaretle ve HTML olarak indir
6. **Sayfayı kapat, yeniden aç** — her şey LocalStorage'da korunmuş

Demo süresince tüm veriler kaybolmaz.
JSON export ile planı başka bilgisayara taşıyabilirsin.
