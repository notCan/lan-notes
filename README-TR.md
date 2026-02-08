# LAN Notlar

LAN ağı üzerinde paylaşımlı not uygulaması. Tek bir bilgisayarda sunucu çalıştırır; telefon, tablet ve diğer bilgisayarlar tarayıcı veya PWA ile aynı notlara erişir. Değişiklikler anlık senkronize olur.

**Sürüm:** 1.0.0

---

## İlk çalıştırmadan önce eklemeniz gerekenler

| Öğe | İşlem |
|-----|--------|
| **`.env`** | Temel kullanım için zorunlu değil. Varsayılan giriş davranışını değiştirmek isterseniz `.env.example` dosyasını `.env` olarak kopyalayıp `LOGIN_USERNAME` ve `LOGIN_PASSWORD` ayarlayın. |
| **`data/`** | Notlar `data/notes.json` içinde tutulur; yoksa uygulama oluşturur. İsterseniz boş `data` klasörü oluşturabilirsiniz; zorunlu değil. |
| **`uploads/`** | Notlara eklenen dosyalar bu klasöre yüklenir. Gerektiğinde otomatik oluşturulur; isterseniz boş `uploads/` klasörü ekleyebilirsiniz. |

Başka dosya veya klasör eklemeniz gerekmez. `npm install` sonrası `npm start` veya Windows’ta `start.bat` ile çalıştırabilirsiniz.

---

## Gereksinimler

- Node.js 18+

## Kurulum

```bash
npm install
```

## Çalıştırma

Sunucu olacak bilgisayarda:

```bash
npm start
```

Windows’ta `start.bat` dosyasına çift tıklayabilirsiniz.

Sunucu **3370** portunda çalışır. Konsolda örneğin:

- `Server: http://0.0.0.0:3370`
- `LAN:    http://BILGISAYAR_IP:3370`

## Giriş ve kullanıcılar

- Uygulama açıldığında **giriş** sayfası gelir. Hesabınız yoksa **Kayıt ol** ile yeni kullanıcı oluşturun.
- **Beni hatırla** işaretliyse oturum uzun süre (ör. 30 gün) saklanır; tarayıcı kapansa da tekrar giriş gerekmez.
- Notlar **kullanıcıya özeldir**: Her kullanıcı sadece kendi notlarını görür ve düzenler.
- Üstteki **Çıkış** ile oturumu kapatabilirsiniz.

## LAN’dan erişim

1. Sunucunun çalıştığı bilgisayarın LAN IP adresini öğrenin (Windows: `ipconfig` → “IPv4 Address”; macOS/Linux: `ifconfig` veya `ip a`).
2. Diğer cihazları (telefon, tablet, başka PC) aynı Wi‑Fi/ağa bağlayın.
3. Tarayıcıda şu adresi açın: `http://BILGISAYAR_IP:3370` (ör. `http://192.168.1.100:3370`).

## PWA – Ana ekrana ekleme

Uygulamayı tek dokunuşla açmak için ana ekrana ekleyebilirsiniz:

1. Telefon veya tablette `http://BILGISAYAR_IP:3370` adresini tarayıcıda açın.
2. **Chrome/Edge (Android):** Menü (⋮) → “Ana ekrana ekle” veya “Uygulama yükle”.
3. **Safari (iOS):** Paylaş → “Ana Ekrana Ekle”.

Bundan sonra “LAN Notlar” ikonu görünür; dokununca uygulama gibi açılır.

## Özellikler

- Çoklu not: Başlık, isteğe bağlı alt başlıklar, her altında metin veya dosya linki.
- Alt başlıksız notlar da eklenebilir.
- Her not için **Düzenle** ve **Sil**.
- “Dosya ekle” ile yüklenen dosyalar not içinde indirme linki olarak görünür.
- WebSocket ile anlık senkron: Bir cihazda yapılan değişiklik diğer açık sekmelerde/cihazlarda hemen görünür.

## Veri

- Notlar: `data/notes.json`
- Yüklenen dosyalar: `uploads/`

Sunucuyu kapatıp açsanız da veriler bu dosyalardan okunur.
