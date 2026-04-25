# Playwright MCP ile Test Oluştururken Dikkat Edilmesi Gerekenler

Bu liste, bahn.de E2E otomasyon projesinde yaşanan gerçek sorunlardan damıtılmıştır.

---

## 1. Sayfa Yüklenme ve Overlay'ler

- Cookie/consent banner'ları **her zaman ilk adımda** kapat — `<div>` overlay olarak render edilirler ve tüm pointer event'leri bloklar, form alanlarına tıklanamaz
- `waitForLoadState('domcontentloaded')` sonrası ek `waitForTimeout` ekle, SPA'lar lazy render yapar
- Bir element "visible" görünse bile üzerinde başka bir element olabilir — `locator.click()` timeout alırsa `{ force: true }` veya JS click dene

```typescript
// Cookie banner dismiss — goto() içinde çağır
private async dismissCookieBanner(): Promise<void> {
    for (const sel of ['button:has-text("Nur notwendige Cookies")', 'button:has-text("Ablehnen")']) {
        try { await this.page.locator(sel).click({ timeout: 3_000 }); return; } catch { }
    }
}
```

---

## 2. Vue / React / Angular Bileşenleri

- `fill()` custom input bileşenlerinde çalışmayabilir — Vue spinbutton'lar için `nativeInputValueSetter + dispatchEvent` gerekir
- `dispatchEvent(new MouseEvent('click'))` Vue 3'te reaktiviteyi **tetiklemez** — gerçek `page.mouse.click(x, y)` koordinat bazlı tıklama zorunlu
- Toggle/switch bileşenlerinde checkbox değil **label**'a tıkla — toggle span pointer event'leri intercept eder
- Dropdown seçimi sonrası dropdown **açık kalabilir** ve arkasındaki butonları kapatabilir — önce dropdown'ı kapat, sonra confirm butonuna tıkla

```typescript
// ❌ Vue spinbutton'da çalışmaz
await page.locator('input[aria-label="Tag"]').fill('26');

// ✅ nativeInputValueSetter ile çalışır
await page.evaluate(({ label, val }) => {
    const input = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}, { label: 'Tag', val: '26' });

// ❌ Vue 3'te reaktiviteyi tetiklemez
option.dispatchEvent(new MouseEvent('click', { bubbles: true }));

// ✅ Gerçek mouse koordinatı ile çalışır
const box = await page.locator('[role="option"][aria-label*="BahnCard 25"]').boundingBox();
await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
```

---

## 3. Selector Güvenilirliği

- Aynı sayfada aynı metni taşıyan birden fazla buton olabilir (desktop + mobile) — strict mode hatası alırsın, class-based selector kullan
- `data-value` attribute'unda `&` karakteri varsa CSS selector çalışmaz — `querySelectorAll` + `getAttribute` ile filtrele
- `aria-label` partial match için `[aria-label*="..."]` kullan, tam eşleşme kırılgan olur
- Dinamik ID'lere (`multi-0-option-0-2`) güvenme — her render'da değişebilir

```typescript
// ❌ Strict mode hatası — 2 "Suchen" butonu var (desktop + mobile)
await page.locator('button', { hasText: 'Suchen' }).click();

// ✅ Class ile spesifik seç
await page.locator('button.quick-finder-basic__search-btn--desktop').click();

// ❌ & karakteri CSS selector'ı kırar
document.querySelector('[data-value="BAHNCARD25&KLASSE_1"]');

// ✅ getAttribute ile filtrele
Array.from(document.querySelectorAll('[data-value]'))
    .find(el => el.getAttribute('data-value') === 'BAHNCARD25&KLASSE_1');
```

---

## 4. Zaman ve Timeout Yönetimi

- SPA navigasyonlarında `waitForURL()` + `waitForFunction()` kombinasyonu kullan, sadece `waitForTimeout()` yeterli değil
- En-dash (`–`, U+2013) ile normal tire (`-`) regex'te farklıdır — zaman aralıklarını parse ederken `[\u2013-]` kullan
- Test timeout'u en az **120 saniye** yap, network-heavy sayfalar için 30s yetmez
- `actionTimeout` ve `navigationTimeout`'u ayrı ayrı ayarla

```typescript
// playwright.config.ts
timeout: 120_000,
use: {
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
}

// ❌ Sadece timeout beklemek güvenilmez
await page.waitForTimeout(5000);

// ✅ URL + içerik kombinasyonu
await page.waitForURL('**/suche**', { timeout: 40_000 });
await page.waitForFunction(
    () => /\d{2}:\d{2}[\u2013-]\d{2}:\d{2}/.test(document.body.textContent ?? ''),
    { timeout: 40_000 }
);
```

---

## 5. Dialog ve Modal Yönetimi

- Birden fazla dialog aynı anda DOM'da olabilir — `dialog[open]` ile sadece aktif olanı hedefle
- Dialog'un kapandığını `waitForFunction` ile doğrula
- Her dialog'un save button `data-test-id`'si farklı olabilir

```typescript
// Aktif dialog'u hedefle
const dialog = document.querySelector('dialog[open]');

// Dialog kapanmasını bekle
await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5_000 });

// Dialog'a özel save button — test-id farklı olabilir
// Hinfahrt: "quick-finder-save-button"
// Rückfahrt: "undefined-save-button"
const btn = dialog?.querySelector('[data-test-id="undefined-save-button"]')
         ?? dialog?.querySelector('[class*="primary"]');
```

---

## 6. iframe İçeriği

- Same-origin iframe'lerde `page.frameLocator()` kullan
- iframe yüklenmesini görünürlük + içerik kontrolü ile doğrula
- Cross-origin iframe'lere erişilemez, sadece varlığını kontrol edebilirsin

```typescript
// Same-origin iframe erişimi
const frame = page.frameLocator('iframe.db-web-dialog-gsd-iframe__iframe');
await expect(frame.locator('body')).toContainText('ICE', { timeout: 10_000 });
```

---

## 7. MCP Session ile Kod Yazımı Farkı

- MCP `browser_run_code` ile çalışan kod, Playwright test dosyasında **aynı şekilde çalışmayabilir** — MCP farklı bir execution context kullanır
- MCP'de çalışan JS click, test dosyasında `locator.click()` olarak yazılmalı
- MCP session'da keşfettiğin selector'ları test dosyasına geçirmeden önce doğrula
- MCP ile keşif yap, sonra Page Object'e dönüştür

```
MCP Akışı:
1. browser_run_code ile sayfayı keşfet
2. Çalışan selector/yöntemi bul
3. Page Object metoduna dönüştür
4. npx playwright test ile doğrula
```

---

## 8. OOP / Page Object Model

- Her sayfa için ayrı Page Object yaz — test dosyası DOM'a dokunmamalı
- Overlay bypass, Vue hack gibi tekrar eden işlemleri `helper` fonksiyonlara taşı
- `BasePage` abstract sınıfına `screenshot()` ve `waitForIdle()` koy
- Assertion'ları Page Object içinde tut, test dosyasında sadece iş akışı olsun

```
tests/
├── pages/
│   ├── BasePage.ts          ← screenshot(), waitForIdle()
│   ├── LandingPage.ts       ← goto(), fillOrigin(), clickSearch()
│   ├── FilterPanel.ts       ← selectKlasse1(), selectBahnCard()
│   ├── SearchResultsPage.ts ← waitForResults(), getConnections()
│   └── AngebotsPage.ts      ← selectSuperSparpreis(), assertGsdIframeLoaded()
├── helpers/
│   └── vue-input.helper.ts  ← setVueInputValue(), clickToggleById()
├── fixtures/
│   └── search.fixture.ts    ← SEARCH_DATA, FILTER_DATA
└── bahn.spec.ts             ← sadece iş akışı, DOM yok
```

---

## 9. Güvenlik — Satın Alma Akışları

- E-ticaret testlerinde `Kaufen`, `Bezahlen`, `Kostenpflichtig`, `Weiter zur Buchung` butonlarına **asla tıklama**
- Bu butonların varlığını sadece logla, interact etme
- Test sonunda tarayıcıyı kapat

```typescript
// ✅ Sadece gözlemle, tıklama
async assertNoPurchaseButtonClicked(): Promise<void> {
    const dangerous = ['Kaufen', 'Bezahlen', 'Weiter zur Buchung'];
    for (const label of dangerous) {
        const count = await this.page.locator('button', { hasText: label }).count();
        if (count > 0) console.log(`[SECURITY] "${label}" present — NOT clicked.`);
    }
}
```

---

## 10. Debug Stratejisi

- Hata aldığında önce `test-results/*/error-context.md` ve `test-failed-1.png` dosyalarını oku
- Geçici `debug-xxx.spec.ts` dosyası yaz, sadece sorunlu adımı izole et, `console.log` ekle
- Sorun çözülünce debug dosyasını sil
- `headless: false` ile çalıştır — görsel olarak ne olduğunu görmek çok zaman kazandırır

```typescript
// Geçici debug test — sorun çözülünce sil
test('debug BahnCard selection', async ({ page }) => {
    // ... sadece sorunlu adım
    const box = await page.locator('[role="option"]').boundingBox();
    console.log('BoundingBox:', JSON.stringify(box));
    await page.screenshot({ path: 'debug.png' });
});
```

---

## Hızlı Referans Tablosu

| Sorun | Neden | Çözüm |
|-------|-------|-------|
| Cookie banner tıklamayı blokluyor | `<div>` overlay | `goto()` içinde dismiss et |
| `fill()` çalışmıyor | Vue custom input | `nativeInputValueSetter` |
| `dispatchEvent` state güncellemez | Vue 3 synthetic event | `page.mouse.click(x, y)` |
| Toggle tıklanamıyor | Span intercept | Label'a tıkla |
| Dropdown Übernehmen'i kapatıyor | Z-index overlay | Önce dropdown'ı kapat |
| Strict mode hatası | Birden fazla eşleşme | Class-based selector |
| `&` CSS selector kırıyor | Özel karakter | `getAttribute` ile filtrele |
| En-dash regex eşleşmiyor | U+2013 ≠ `-` | `[\u2013-]` kullan |
| Test timeout | Yavaş SPA | `timeout: 120_000` |
| Rückfahrt aktif olmuyor | Sadece input yetmez | Takvimden gün tıkla |


Playwright MCP ile Test Oluştururken Dikkat Edilmesi Gerekenler
1. Sayfa Yüklenme ve Overlay'ler
Cookie/consent banner'ları her zaman ilk adımda kapat — <div> overlay olarak render edilirler ve tüm pointer event'leri bloklar, form alanlarına tıklanamaz
waitForLoadState('domcontentloaded') sonrası ek waitForTimeout ekle, SPA'lar lazy render yapar
Bir element "visible" görünse bile üzerinde başka bir element olabilir — locator.click() timeout alırsa { force: true } veya JS click dene
2. Vue / React / Angular Bileşenleri
fill() custom input bileşenlerinde çalışmayabilir — Vue spinbutton'lar için nativeInputValueSetter + dispatchEvent gerekir
dispatchEvent(new MouseEvent('click')) Vue 3'te reaktiviteyi tetiklemez — gerçek page.mouse.click(x, y) koordinat bazlı tıklama zorunlu
Toggle/switch bileşenlerinde checkbox değil label'a tıkla — toggle span pointer event'leri intercept eder
Dropdown seçimi sonrası dropdown açık kalabilir ve arkasındaki butonları kapatabilir — önce dropdown'ı kapat, sonra confirm butonuna tıkla
3. Selector Güvenilirliği
Aynı sayfada aynı metni taşıyan birden fazla buton olabilir (desktop + mobile) — strict mode hatası alırsın, class-based selector kullan
data-value attribute'unda & karakteri varsa CSS selector çalışmaz — querySelectorAll + getAttribute ile filtrele
aria-label partial match için [aria-label*="..."] kullan, tam eşleşme kırılgan olur
Dinamik ID'lere (multi-0-option-0-2) güvenme — her render'da değişebilir
4. Zaman ve Timeout Yönetimi
SPA navigasyonlarında waitForURL() + waitForFunction() kombinasyonu kullan, sadece waitForTimeout() yeterli değil
En-dash (–, U+2013) ile normal tire (-) regex'te farklıdır — zaman aralıklarını parse ederken [\u2013-] kullan
Test timeout'u en az 120 saniye yap, network-heavy sayfalar için 30s yetmez
actionTimeout: 20_000, navigationTimeout: 45_000 ayrı ayrı ayarla
5. Dialog ve Modal Yönetimi
Birden fazla dialog aynı anda DOM'da olabilir — dialog[open] ile sadece aktif olanı hedefle
Dialog'un kapandığını waitForFunction(() => !document.querySelector('dialog[open]')) ile doğrula
Her dialog'un save button data-test-id'si farklı olabilir — "quick-finder-save-button" vs "undefined-save-button"
6. iframe İçeriği
Same-origin iframe'lerde page.frameLocator('iframe.classname') kullan
iframe yüklenmesini expect(iframe).toBeVisible() + içerik kontrolü ile doğrula
Cross-origin iframe'lere erişilemez, sadece varlığını kontrol edebilirsin
7. MCP Session ile Kod Yazımı Farkı
MCP browser_run_code ile çalışan kod, Playwright test dosyasında aynı şekilde çalışmayabilir — MCP farklı bir execution context kullanır
MCP'de çalışan JS click, test dosyasında locator.click() olarak yazılmalı
MCP session'da keşfettiğin selector'ları test dosyasına geçirmeden önce doğrula
8. OOP / Page Object Model
Her sayfa için ayrı Page Object yaz — test dosyası DOM'a dokunmamalı
Overlay bypass, Vue hack gibi tekrar eden işlemleri helper fonksiyonlara taşı
BasePage abstract sınıfına screenshot() ve waitForIdle() koy — her PO tekrar yazmasın
Assertion'ları Page Object içinde tut, test dosyasında sadece iş akışı olsun
9. Güvenlik ve Satın Alma Akışları
E-ticaret testlerinde Kaufen, Bezahlen, Kostenpflichtig butonlarına asla tıklama
Bu butonların varlığını sadece logla, interact etme
Test sonunda tarayıcıyı kapat
10. Debug Stratejisi
Hata aldığında önce error-context.md ve test-failed-1.png dosyalarını oku
Geçici debug-xxx.spec.ts dosyası yaz, sadece sorunlu adımı izole et, console.log ekle
Sorun çözülünce debug dosyasını sil
headless: false ile çalıştır — görsel olarak ne olduğunu görmek çok zaman kazandırır
