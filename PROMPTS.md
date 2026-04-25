# Bahn.de Playwright Test Otomasyon Promptları

Bu döküman, bahn.de E2E test otomasyonu için kullanılan promptları ve öğrenilen dersleri içerir.
Her prompt, önceki denemelerden elde edilen gerçek çözümlerle güncellenmiştir.

---

## P-01 — Landing Page Doğrulama

```
Playwright MCP kullanarak şu görevi gerçekleştir:
1. https://www.bahn.de adresine git
2. Sayfa yüklenince cookie banner'ı kapat:
   - "Nur notwendige Cookies" veya "Only allow necessary cookies" butonunu tıkla
   - Banner yoksa devam et (try/catch ile)
3. Ana arama formunun görünür olduğunu kontrol et:
   - input[name="quickFinderBasic-von"] görünür mü?
   - input[name="quickFinderBasic-nach"] görünür mü?
4. Sayfanın başlığını (document.title) raporla
5. Mevcut dil ayarını raporla (document.documentElement.lang)
6. Screenshot al: "p01_landing.png"

Başarı kriteri: Form görünür, dil "de", screenshot alındı.

NOT: Cookie banner bir <div> overlay olarak render edilir ve
tüm pointer event'leri intercept eder. Banner kapatılmadan
form alanlarına tıklanamaz.
```

---

## P-02 — Arama Formu Doldurma

```
Açık olan bahn.de sayfasında arama formunu doldur:

Von (Kalkış): "Köln Hbf"
- input[name="quickFinderBasic-von"] alanına click({ force: true }) ile tıkla
- "Köln Hbf" yaz, [role="option"] listesi açılınca ilk seçeneği tıkla
- Değerin "Köln Hbf" olduğunu doğrula

Nach (Varış): "Berlin Hbf"
- input[name="quickFinderBasic-nach"] alanına click({ force: true }) ile tıkla
- "Berlin Hbf" yaz, listeden ilk seçeneği tıkla

Datum/Uhrzeit (Hinfahrt):
- .quick-finder-options__hinfahrt butonuna JS click ile tıkla (overlay-safe)
- Dialog açılınca tarih/saat alanlarını Vue-safe yöntemle doldur:
  * nativeInputValueSetter + dispatchEvent('input') + dispatchEvent('change')
  * Tag: yarının günü, Monat: ay, Jahr: yıl, Stunden: 08, Minuten: 00
- [data-test-id="quick-finder-save-button"] butonuna JS click ile onayla

Doğrulama: Hinfahrt butonu "ab 08:00" içermeli
Screenshot: "p02_form_filled.png"

ÖNEMLI NOTLAR:
- Von/Nach inputları üzerinde overlay olabilir → click({ force: true }) kullan
- Tarih inputları Vue spinbutton'dır, fill() çalışmaz
  → HTMLInputElement.prototype.value setter + dispatchEvent gerekir
- Hinfahrt dialog butonu: .quick-finder-options__hinfahrt (JS click)
- Suchen butonu: button.quick-finder-basic__search-btn--desktop
  (2 "Suchen" butonu var, desktop olanı seç)
```

---

## P-03 — Gelişmiş Filtreler

```
Bahn.de arama formunda gelişmiş filtreleri uygula:

Adım 1 — 1. Klasse seç:
- button._segment-option-KLASSE_1 tıkla
- aria-selected="true" olduğunu doğrula

Adım 2 — Verkehrsmittel (sadece ICE + IC/EC):
- button.SearchVerkehrsmittel__dialogBtn tıkla
- switch-2 ile switch-9 arası toggle'ları kapat:
  * Her toggle için label[for="switch-N--db-web-switch"] tıkla
  * (toggle span pointer event'leri intercept eder, label'a tıkla)
- Übernehmen'e JS click ile tıkla
- Buton "Benutzerdefiniert" içermeli

Adım 3 — BahnCard 25, 1. Klasse:
- "Person" içeren butona JS click ile Reisende dialog'unu aç
- .DBWebSelectButton[hasText="Ermäßigung"] butonuna gerçek click ile dropdown aç
- [role="option"][aria-label*="BahnCard 25, 1. Klasse"] elementinin
  boundingBox'ını al, page.mouse.click(cx, cy) ile tıkla
  (Vue 3 synthetic event'leri dinlemez, gerçek mouse koordinatı gerekir)
- KRITIK: BahnCard seçildikten sonra dropdown açık kalır ve
  Übernehmen butonunu kapatır!
  → .DBWebSelectButton[hasText="Reisende"] butonuna tıklayarak dropdown'ı kapat
- [data-test-id="quick-finder-save-button"] boundingBox'ını al,
  page.mouse.click(cx, cy) ile onayla
- "BahnCard 25" içeren buton görünür olmalı

Adım 4 — Rückfahrt (bugün + 4 gün):
- .quick-finder-options__rueckfahrt butonuna JS click ile aç
- Takvimden hedef günü tıkla:
  * .db-web-date-picker-calendar-day elementleri listesinde
    index = (gün + 1) olan elementi JS click ile tıkla
- Stunden/Minuten'ı Vue-safe yöntemle set et (18:00)
- dialog[open] içindeki [data-test-id="undefined-save-button"] ile onayla
- Rückfahrt butonu "ab 18:00" içermeli

Screenshot: "p03_filters_applied.png"

ÖNEMLI NOTLAR:
- BahnCard seçimi için dispatchEvent ÇALIŞMAZ → page.mouse.click() zorunlu
- BahnCard seçimi sonrası dropdown Übernehmen'i kapatır
  → Önce "Reisende" header'ına tıkla, sonra Übernehmen'e tıkla
- Rückfahrt takvim index'i: days[day + 1] (Nisan için: 29 → index 30)
- Rückfahrt save button test-id: "undefined-save-button" (Hinfahrt'tan farklı)
```

---

## P-04 — Arama Sonuçları Analizi

```
Formu gönder ve sonuçları analiz et:

Adım 1: button.quick-finder-basic__search-btn--desktop tıkla

Adım 2: Sonuçların yüklenmesini bekle:
- URL **/suche** pattern'ini bekle
- Ardından /\d{2}:\d{2}[\u2013-]\d{2}:\d{2}/ regex'i ile bağlantı kartlarını bekle
  (en-dash U+2013 kullan, normal tire değil)
- Timeout: 40 saniye

Adım 3: Şunları raporla:
- Kaç bağlantı listelendi? (unique time-range pattern sayısı)
- İlk 3 bağlantının kalkış-varış saatleri ve süreleri
- En düşük fiyat (ab X,XX € pattern)
- ICE ibaresi var mı? (ICE \d+ pattern)
- "ausgebucht" uyarısı var mı?
- Aktarmalı/direkt sefer dağılımı ("Umstieg" içeren kartlar)

Adım 4: Screenshot: "p04_results.png"

ÖNEMLI NOTLAR:
- Zaman aralığı ayırıcısı en-dash (–, U+2013), normal tire (-) değil
- Test timeout en az 120 saniye olmalı (sayfa yüklenme süresi)
- waitForResults timeout: 40 saniye
- Suchen butonu strict mode hatası verir (2 element eşleşir):
  → button.quick-finder-basic__search-btn--desktop kullan
```

---

## P-05 — Bilet Seçimi ve Sitzplatzreservierung

```
Sonuç listesinden en uygun seferi seç (en erken, aktarmasız, ICE):

Adım 1 — Hinfahrt seç:
- "Weiter" butonuna JS click ile tıkla (ilk görünür olan)
- 5 saniye bekle (navigasyon için)

Adım 2 — Rückfahrt seç:
- URL **/rueckfahrt** bekle
- Sonuçlar yüklenince ilk "Weiter" butonuna JS click

Adım 3 — Angebote sayfası (/buchung/fahrplan/angebotsauswahl):
- "Super Sparpreis" + "Auswählen" içeren butona JS click
- "Sitzplatzreservierung" içeren label'a JS click ile aktif et
- "Sitzplatz auswählen" butonuna JS click
- GSD iframe yüklendi mi doğrula:
  iframe.db-web-dialog-gsd-iframe__iframe görünür olmalı
  iframe içinde "ICE" metni olmalı

Adım 4 — GÜVENLİK SINIRI:
- "Kaufen", "Bezahlen", "Weiter zur Buchung" butonlarına TIKKLAMA
- Sadece varlıklarını logla

Screenshot: "p05_detail.png"

ÖNEMLI NOTLAR:
- Rückfahrt bekleme: waitForURL('**/rueckfahrt**') + waitForResults()
- Sitzplatzreservierung checkbox'ı label tıklamasıyla aktif olur
- GSD iframe same-origin olduğu için frameLocator ile erişilebilir
- Toplam fiyat: 236,98 € (Super Sparpreis Hin+Rück) + 13,80 € (Sitzplatz)
```

---

## Playwright Konfigürasyonu

```typescript
// playwright.config.ts — bahn.de için önerilen ayarlar
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,  // Sıralı çalıştır (bağımlı adımlar)
  workers: 1,
  timeout: 120_000,      // Sayfa yüklenme süreleri uzun
  use: {
    baseURL: 'https://www.bahn.de',
    headless: false,     // Vue overlay sorunları için headed mod
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
});
```

---

## Vue 3 Bileşen Etkileşim Rehberi

Bahn.de Vue 3 ile yazılmıştır. Standart Playwright yöntemleri bazı bileşenlerde çalışmaz:

### Tarih/Saat Spinbutton'ları
```typescript
// ❌ Çalışmaz
await page.locator('input[aria-label="Tag"]').fill('26');

// ✅ Çalışır — nativeInputValueSetter
await page.evaluate(({ label, val }) => {
  const input = document.querySelector(`input[aria-label="${label}"]`);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, val);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}, { label: 'Tag', val: '26' });
```

### Toggle/Switch Bileşenleri
```typescript
// ❌ Çalışmaz — toggle span intercept eder
await page.locator('#switch-2--db-web-switch').click();

// ✅ Çalışır — label'a tıkla
await page.evaluate((id) => {
  document.querySelector(`label[for="${id}--db-web-switch"]`)?.click();
}, 'switch-2');
```

### BahnCard Dropdown Seçimi
```typescript
// ❌ Çalışmaz — dispatchEvent Vue 3'te reaktiviteyi tetiklemez
option.dispatchEvent(new MouseEvent('click', { bubbles: true }));

// ✅ Çalışır — gerçek mouse koordinatı
const box = await page.locator('[role="option"][aria-label*="BahnCard 25, 1. Klasse"]').boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

// ✅ Sonra dropdown'ı kapat (Übernehmen'i kapatıyor)
await page.locator('.DBWebSelectButton').filter({ hasText: 'Reisende' }).click();

// ✅ Sonra Übernehmen'e mouse.click()
const saveBtnBox = await page.locator('[data-test-id="quick-finder-save-button"]').boundingBox();
await page.mouse.click(saveBtnBox.x + saveBtnBox.width / 2, saveBtnBox.y + saveBtnBox.height / 2);
```

### Rückfahrt Takvim Seçimi
```typescript
// ❌ Çalışmaz — sadece input değeri set etmek yetmez
await setVueInputValue(page, 'Tag', '29');

// ✅ Çalışır — önce takvimden gün tıkla, sonra saat set et
await page.evaluate((idx) => {
  const dialog = document.querySelector('dialog[open]');
  dialog?.querySelectorAll('.db-web-date-picker-calendar-day')[idx]?.click();
}, dayIndex); // dayIndex = parseInt(day) + 1
```

---

## Bilinen Sorunlar ve Çözümleri

| Sorun | Neden | Çözüm |
|-------|-------|-------|
| Cookie banner pointer event'leri blokluyor | `<div>` overlay tüm sayfayı kapatıyor | `goto()` içinde banner'ı kapat |
| `vonInput.click()` timeout | Overlay intercept | `click({ force: true })` |
| `fill()` tarih alanında çalışmıyor | Vue spinbutton | `nativeInputValueSetter` |
| BahnCard seçimi state'e kaydedilmiyor | Vue 3 synthetic event dinlemiyor | `page.mouse.click()` koordinat |
| Übernehmen tıklanamıyor | BahnCard dropdown üstünü kapatıyor | Önce "Reisende" header'ına tıkla |
| Rückfahrt aktif olmuyor | Sadece input değeri yetmez | Takvimden gün tıkla |
| "Suchen" strict mode hatası | 2 buton eşleşiyor (desktop+mobile) | `.quick-finder-basic__search-btn--desktop` |
| `–` regex eşleşmiyor | En-dash U+2013, normal tire değil | `[\u2013-]` veya `–` literal |
| Test timeout | Sayfa yüklenme süresi | `timeout: 120_000` config'de |
