# Website Pardi

Website statis (HTML/CSS/JS) untuk Pardi — partner digitalisasi UMKM di bawah SantoSoft. Sudah disiapkan dengan fondasi PWA (manifest + service worker), form kontak terhubung ke Netlify Forms, dan **halaman Afiliator** dengan dashboard referral & komisi (Firebase).

## Sebelum publish — ganti dulu:
- Nomor WhatsApp (`6281200000000`) di: `index.html`, `layanan.html`, `portfolio.html`, `kontak.html`, `afiliator.html`, `assets/js/main.js`, `assets/js/affiliate.js`
- Email (`Softwaresantoso@gmail.com`) dan link LinkedIn di footer tiap halaman
- Konten Portfolio (`portfolio.html`) — sudah pakai detail asli Laris Snack & Santoso Pizza Delivery, sesuaikan lagi kalau ada perubahan

## Deploy ke Netlify via GitHub
1. Push folder ini ke repo GitHub baru
2. Di Netlify: **Add new site → Import an existing project → GitHub** → pilih repo ini
3. Build command: kosongkan. Publish directory: `.` (sudah diatur di `netlify.toml`)
4. Deploy — Netlify otomatis kasih HTTPS gratis (wajib untuk service worker/PWA)
5. Cek tab **Forms** di dashboard Netlify setelah form kontak pernah disubmit sekali — submission akan muncul di sana

## Setup halaman Afiliator (Firebase)

Halaman `afiliator.html` dan form `kontak.html` (untuk tracking referral) butuh **Firebase project sendiri**, terpisah dari project Pardi Finance:

1. Buat project baru di [Firebase Console](https://console.firebase.google.com) — beri nama misalnya "pardi-website"
2. Aktifkan **Authentication** → sign-in method **Email/Password**
3. Aktifkan **Firestore Database** (mode production)
4. Di **Project Settings → General → Your apps**, tambahkan Web App, salin `firebaseConfig` ke `assets/js/firebase-config.js` (ganti semua nilai `GANTI_...`)
5. Deploy rules: `firebase use --add` (pilih project ini), lalu `firebase deploy --only firestore:rules`

**Alur pakai afiliator:**
1. Calon afiliator buka `afiliator.html` → Daftar (nama, email, password) → otomatis dapat kode referral (contoh: `AFF-BUDI47`)
2. Dari dashboard, afiliator salin link referralnya (`kontak.html?ref=AFF-BUDI47`) dan bagikan
3. Kalau ada calon klien isi form kontak lewat link itu, otomatis tercatat di koleksi Firestore `referrals` dengan kode afiliator tsb
4. Status referral bisa diupdate langsung dari **Panel Admin** (`admin.html`) — lihat cara setup di bawah
5. Afiliator lihat status & komisi closing-nya langsung di dashboard, dan bisa tekan "Minta Pencairan" (mengirim WA ke kamu + mencatat permintaan di koleksi `payoutRequests`)

## Setup Panel Admin (`admin.html`)

Halaman ini **tidak muncul di menu navigasi publik** — sengaja disembunyikan supaya tidak mengundang pengunjung biasa. Simpan/bookmark URL-nya sendiri (misalnya `https://situspardi.com/admin.html`).

**Cara mengaktifkan akun admin pertama kali:**
1. Buat akun lewat `afiliator.html` (Daftar) pakai email kamu sendiri — atau lewat **Firebase Console → Authentication → Add user**
2. Salin **UID** user tersebut dari Firebase Console (tab Authentication)
3. Di **Firestore Database**, buat koleksi baru bernama `admins`, lalu buat dokumen dengan **ID = UID tadi** (isi field-nya bebas, misalnya `{ role: "owner" }`)
4. Buka `admin.html`, login pakai email/password yang sama — sekarang seharusnya masuk ke dashboard admin

**Kenapa harus manual:** supaya tidak ada jalan bagi siapa pun untuk memberi diri sendiri akses admin lewat website — akses admin sengaja hanya bisa diberikan lewat Firebase Console.

**Yang bisa dilakukan dari Panel Admin:**
- Lihat semua referral dari semua afiliator, ubah status (baru/proses/closing/batal) dan isi nominal komisi langsung dari tabel
- Lihat semua afiliator terdaftar
- Tandai permintaan pencairan komisi sebagai selesai

**Yang masih manual (belum ada di MVP ini):**
- Validasi anti-spam/anti-duplikat kode referral saat daftar
- Notifikasi otomatis ke kamu saat ada referral baru masuk (sekarang harus buka Panel Admin manual)
- Multi-admin dengan level akses berbeda (sekarang semua yang ada di koleksi `admins` punya akses penuh yang sama)

## Setelah live
- Buka situs dari HP → browser akan menawarkan "Tambahkan ke layar utama" (itu instalasi PWA-nya)
- Untuk dibungkus jadi APK dan diupload ke Play Store nanti, pakai [PWABuilder](https://www.pwabuilder.com) atau Bubblewrap — cukup masukkan URL situs yang sudah live
