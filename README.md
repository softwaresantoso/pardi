# Website Pardi

Website statis (HTML/CSS/JS) untuk Pardi — partner digitalisasi UMKM. Sudah disiapkan dengan fondasi PWA (manifest + service worker) dan form kontak terhubung ke Netlify Forms.

## Sebelum publish — ganti dulu:
- Nomor WhatsApp (`6281200000000`) di: `index.html`, `layanan.html`, `portfolio.html`, `kontak.html`, `assets/js/main.js`
- Email (`hello@pardi.id`) dan link Instagram di footer tiap halaman
- Konten Portfolio (`portfolio.html`) — masih memakai ilustrasi & data contoh, ganti dengan detail klien asli saat sudah siap

## Deploy ke Netlify via GitHub
1. Push folder ini ke repo GitHub baru
2. Di Netlify: **Add new site → Import an existing project → GitHub** → pilih repo ini
3. Build command: kosongkan. Publish directory: `.` (sudah diatur di `netlify.toml`)
4. Deploy — Netlify otomatis kasih HTTPS gratis (wajib untuk service worker/PWA)
5. Cek tab **Forms** di dashboard Netlify setelah form kontak pernah disubmit sekali — submission akan muncul di sana

## Setelah live
- Buka situs dari HP → browser akan menawarkan "Tambahkan ke layar utama" (itu instalasi PWA-nya)
- Untuk dibungkus jadi APK dan diupload ke Play Store nanti, pakai [PWABuilder](https://www.pwabuilder.com) atau Bubblewrap — cukup masukkan URL situs yang sudah live
