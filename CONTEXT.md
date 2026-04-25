# TestPilot POC — Proje Bağlamı

## Ürün Vizyonu
Playwright MCP & CLI tabanlı sichere KI-Testinfrastruktur.
AI agent'ların browser'ı kontrol ederek E2E testleri doğal dil promptlarıyla yürütmesi.

## Bu POC'un Amacı
Cline veya Kiro'ya demo yapmak.
Hedef kitle: Teknik ekipler, QA Lead'ler, DevOps mühendisleri.
Mesaj: "AI agent, karmaşık bir web senaryosunu sıfır Playwright kodu yazmadan test edebilir."

## Demo Senaryosu: Deutsche Bahn
URL: https://www.bahn.de
Senaryo: Köln Hbf → Berlin Hbf, yarın sabah 08:00, ICE, 1. Klasse, BahnCard 25, gidiş-dönüş

Kasıtlı karmaşıklık faktörleri:
- Autocomplete form alanları
- Dinamik tarih hesaplama
- Çoklu filtre kombinasyonu
- Sonuç doğrulama + veri çekme
- Fiyat analizi
- Güvenlik sınırı (satın alma yok)

---

## DB Senaryo Promptları (7 Adım)

### P-01: Başlangıç & Navigasyon
```
Playwright MCP kullanarak şu görevi gerçekleştir:

1. https://www.bahn.de adresine git
2. Sayfanın tam olarak yüklendiğini doğrula (DOMContentLoaded + network idle)
3. Ana arama formunun (Fahrplan & Buchung) görünür olduğunu kontrol et
4. Sayfanın başlığını (document.title) raporla
5. Mevcut dil ayarını raporla (DE/EN)
6. Sayfanın screenshot'ını al ve "p01_landing.png" olarak kaydet

Başarı kriteri: Form görünür, sayfa tamamen yüklenmiş durumda.
```

### P-02: Form Doldurma
```
Açık olan bahn.de sayfasında arama formunu şu şekilde doldur:

Von (Kalkış): "Köln Hbf" yaz, autocomplete listesi açılınca "Köln Hbf" seçeneğini tıkla
Nach (Varış): "Berlin Hbf" yaz, autocomplete listesinden "Berlin Hauptbahnhof (Tief)" veya "Berlin Hbf" seç
Datum: Yarının tarihini gir — bugün + 1 gün, format TT.MM.JJJJ (örnek: 26.04.2025)
Uhrzeit: 08:00
Richtung: "Abfahrt" seçili olduğunu doğrula (varsayılan)
Reisende: 1 Erwachsener olduğunu doğrula

Her alan doldurulduktan sonra değerin doğru girildiğini kontrol et.
Sonuç olarak tüm form değerlerini bir liste şeklinde raporla.
```

### P-03: Gelişmiş Filtreler
```
Bahn.de arama formunda gelişmiş filtreleri uygula:

Adım 1 — Ek seçenekleri aç:
"Weitere Optionen" veya benzeri bir bağlantı/butonu bul ve tıkla.
Bu buton genellikle formun alt kısmında yer alır.

Adım 2 — Ulaşım türü filtresi:
Sadece "ICE/IC/EC" seçili olsun.
Regional Express, S-Bahn, Bus gibi seçeneklerin işaretini kaldır.

Adım 3 — Sınıf seçimi:
"1. Klasse" seç (varsayılan "2. Klasse" ise değiştir).

Adım 4 — BahnCard:
"BahnCard 25" seç. Indirim yolcusu olarak kaydet.

Adım 5 — Dönüş bileti:
"Hin- und Rückfahrt" seçeneğini aktif et.
Rückdatum: Bugünden 4 gün sonra (yarın + 3 gün)
Rückzeit: 18:00

Tüm seçilen filtre değerlerini onaylayan bir liste raporla.
```

### P-04: Arama & Sonuç Doğrulama
```
Formu gönder ve sonuçları analiz et:

Adım 1: "Suchen" butonuna tıkla
Adım 2: Sonuç listesinin yüklenmesini bekle (maksimum 20 saniye)
Adım 3: Sayfanın screenshot'ını al ("p04_results.png")

Şunları kontrol et ve raporla:
- Kaç bağlantı seçeneği listelendi? (sayı)
- İlk 3 bağlantının kalkış ve varış saatleri neler?
- En düşük gösterilen fiyat kaç Euro?
- Sonuçlarda "ICE" ibaresi var mı? (Evet/Hayır)
- Herhangi bir "ausgebucht" (dolu) uyarısı var mı?
- Aktarmalı sefer var mı, direkt sefer var mı?

Eğer sonuç 0 ise: hata mesajını tam olarak kopyala ve screenshot al.
Eğer sayfa yüklenmediyse: timeout hatasını raporla.
```

### P-05: Bilet Seçimi & Detay
```
Sonuç listesinden en uygun seferi seç ve detayları incele:

Seçim kriteri (öncelik sırasına göre):
1. En erken kalkış saati
2. Tercihen aktarmasız (Direktverbindung)
3. ICE treni

Adım 1: Uygun seferin "Auswählen" veya detay butonuna tıkla
Adım 2: Detay sayfasının açıldığını doğrula

Şunları raporla:
- Toplam seyahat süresi
- Aktarma sayısı ve varsa aktarma noktaları
- Wagenreihung (tren kompozisyonu) görseli yüklendi mi?

Koltuk rezervasyonu:
"Sitzplatz reservieren" seçeneğini bul ve aktif et.
Tercihler: Fensterplatz (pencere), Ruhezone (sessiz bölge) işaretle.

Adım 3: Mevcut sayfanın screenshot'ını al ("p05_detail.png")
```

### P-06: Fiyat & Tarife Analizi
```
Fiyat seçim sayfasında tarife analizi yap:

Adım 1 — Tarife listesi:
Mevcut tüm tarifeleri bul (Super Sparpreis, Sparpreis, Flexpreis veya benzerleri).
Her tarife için şunları not al:
- Fiyat (Euro)
- İptal/değişiklik koşulları (kısaca)
- Müsaitlik durumu

Adım 2 — BahnCard indirim doğrulama:
BahnCard 25 indiriminin uygulandığını doğrula.
"25%" veya "BahnCard" ibaresi fiyat yanında görünüyor mu?

Adım 3 — Toplam hesaplama:
Gidiş Sparpreis fiyatı: [X] €
Dönüş Sparpreis fiyatı: [X] €
Koltuk rezervasyonu (varsa): [X] €
TOPLAM: [X] €

Adım 4:
"Sparpreis" tarifesini seç (sadece seç, devam etme).
Sayfanın screenshot'ını al ("p06_pricing.png").
```

### P-07: Güvenlik Sınırı & Özet Rapor
```
ÖNEMLİ GÜVENLIK SINIRI:
Bu adımda kesinlikle satın alma işlemi yapma.
"Weiter zur Buchung", "Kaufen", "Bezahlen" butonlarına TIKKLAMA.
Sadece gözlemle ve raporla.

Aşağıdaki özet raporu oluştur:

---
TEST SENARYOSU ÖZET RAPORU
Tarih: [bugünün tarihi]
Toplam Süre: [başlangıçtan bu yana]

Senaryo: Köln Hbf → Berlin Hbf
Tarih: [doldur]
Tür: Hin- und Rückfahrt, 1. Klasse, ICE, BahnCard 25
Tarife: Sparpreis

ADIM SONUÇLARI:
P-01 Landing Page    : [✓ Başarılı / ✗ Başarısız] — [not]
P-02 Form Doldurma   : [✓ Başarılı / ✗ Başarısız] — [not]
P-03 Filtreler       : [✓ Başarılı / ✗ Başarısız] — [not]
P-04 Arama Sonuçları : [✓ Başarılı / ✗ Başarısız] — [not]
P-05 Bilet Seçimi    : [✓ Başarılı / ✗ Başarısız] — [not]
P-06 Fiyat Analizi   : [✓ Başarılı / ✗ Başarısız] — [not]
P-07 Güvenlik Sınırı : ✓ Korundu

BULUNAN SORUNLAR: [varsa listele, yoksa "Yok"]
EN DÜŞÜK FİYAT: [X] € (Sparpreis, 1. Klasse, BahnCard 25)
---

Son adım: Tüm tarayıcı sekmelerini kapat.
```

---

## System Prompt (Cline / Kiro için)

```
Sen bir Playwright test otomasyon uzmanısın ve bir KI-Testinfrastruktur POC'u için çalışıyorsun.

GÖREV: Verilen test promptlarını sırayla çalıştırarak Deutsche Bahn web sitesini (bahn.de) test et.

KURALLAR:
1. Her adımı açıkça logla: "Adım X başlıyor...", "Adım X tamamlandı."
2. Önemli durumlarda screenshot al (hata, beklenmeyen UI, sonuç sayfası)
3. SATIN ALMA SINIRI: Hiçbir koşulda ödeme veya satın alma adımına geçme
4. Timeout: Her aksiyonda maksimum 10 saniye bekle
5. Retry: Başarısız aksiyonu 2 kez dene, sonra hata olarak logla
6. Raporlama: Türkçe raporla, teknik terimler (ICE, BahnCard, Sparpreis) orijinal haliyle kalsın
7. Autocomplete: Form alanlarına yazarken dropdown açılmasını bekle, sonra seç
8. Tarih: Dinamik olarak hesapla — sabit tarih yazma

BAŞARI KRİTERİ:
7 adımın tamamı hatasız çalışırsa senaryo başarılı.
Herhangi bir adım başarısız olursa, hatayı logla ve sonraki adıma geç.

DEMO NOTU:
Bu bir güvenli test ortamıdır. Kullanıcı verisi girilmez, ödeme yapılmaz.
```

---

## Prompt Şablonları (Dashboard'da "Şablondan Ekle" dropdown'u için)

### Şablon: Navigation
```
[HEDEF_URL] adresine git ve şunları doğrula:
1. Sayfa tam yüklendi (network idle)
2. Ana içerik görünür
3. Sayfa başlığı: [BEKLENEN_BAŞLIK]
Screenshot al: [DOSYA_ADI].png
```

### Şablon: Form Doldur
```
Sayfadaki formu şu şekilde doldur:
- Alan 1 ([SELECTOR]): [DEĞER]
- Alan 2 ([SELECTOR]): [DEĞER]
- Dropdown ([SELECTOR]): [SEÇİLECEK_DEĞER]
Her alan sonrası doğrulama yap.
Formu gönder ve sonucu raporla.
```

### Şablon: Assertion
```
Şu koşulları doğrula:
- [ ] [ELEMENT] görünür durumda
- [ ] [TEXT] sayfada mevcut
- [ ] URL şunu içeriyor: [URL_PARÇASI]
- [ ] [ELEMENT] tıklanabilir durumda
Başarısız koşul varsa screenshot al.
```

### Şablon: Screenshot & Rapor
```
Mevcut sayfanın screenshot'ını al: [DOSYA_ADI].png
Şu bilgileri raporla:
- Sayfa başlığı
- Mevcut URL
- Görünür hata mesajı var mı?
- [ÖZEL_KONTROL]
```

### Şablon: Login
```
[URL] adresine git ve giriş yap:
UYARI: Test kullanıcısı kullan, gerçek kimlik bilgisi girme.
- Kullanıcı adı: [TEST_USER]
- Şifre: [TEST_PASS]
Başarılı giriş sonrası: [BEKLENEN_SAYFA] sayfasına yönlendirildiğini doğrula.
```

---

## Mimari Notlar

### Neden LocalStorage?
- Backend yok, deployment yok
- Demo ortamında her zaman çalışır
- JSON export ile taşınabilir

### Neden Vanilla JS?
- Hiçbir build adımı gerekmez
- Dosyayı tarayıcıda direkt aç, çalışır
- Claude Code'un ürettiği kod daha öngörülebilir

### Güvenlik Sınırı Neden Önemli?
Demo sırasında gerçek bir satın alma işlemi yapılmamalı.
P-07 promptu bu sınırı netleştiriyor ve agent'a açıkça talimat veriyor.
Bu özellik, ürünün "kontrollü AI test" vaadini somutlaştırıyor.
