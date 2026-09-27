// Konfigurasi aturan rekomendasi paket & harga untuk Tool Asesmen.
// Edit angka/teks di sini kalau harga berubah — tidak perlu sentuh assessment.js.

const ASSESSMENT_CONFIG = {
  packages: {
    starter: {
      name: 'Starter',
      duration: '3–5 hari kerja',
      service: 'Self-host gratis, atau dikelola mulai Rp 50rb/bulan',
    },
    customFlow: {
      name: 'Custom Flow',
      duration: 'Kurang dari 2 minggu',
      service: 'Bulan pertama dikelola gratis',
      baseCostMin: 1500000,
      perExtraFlow: 500000, // ditambahkan untuk tiap alur khusus SETELAH yang pertama
      baseCostMinCap: 3000000, // batas atas untuk costMin
      upperOffset: 1000000, // costMax = costMin + ini
      costMaxCap: 3500000,
    },
    fullCustom: {
      name: 'Full Custom',
      duration: 'Ditentukan setelah riset alur bisnis',
      service: 'Self-host atau dikelola sesuai kebutuhan',
      costMin: 3500000,
      costMax: null, // "mulai Rp 3,5jt", tanpa batas atas pasti
    },
  },

  // Urutan level: 1 = Starter, 2 = Custom Flow, 3 = Full Custom.
  // Fungsi-fungsi ini menentukan level MINIMAL yang harus dipenuhi;
  // level tertinggi yang terpenuhi yang menang.
  rules: {
    level2: (answers) => {
      const reasons = [];
      if (answers.custom.length >= 1) reasons.push(`Ada alur khusus di luar modul dasar (${answers.custom.join(', ')})`);
      if (answers.userTypes === '3+') reasons.push('Jumlah jenis pengguna 3 atau lebih');
      if (answers.clarity === 'sebagian') reasons.push('Alur bisnis klien baru sebagian jelas');
      return reasons;
    },
    level3: (answers) => {
      const reasons = [];
      if (answers.integrations.length >= 1) reasons.push(`Butuh integrasi lanjutan (${answers.integrations.join(', ')})`);
      if (answers.branches === '2+') reasons.push('Usaha punya 2 lokasi/cabang atau lebih');
      if (answers.clarity === 'belum') reasons.push('Alur bisnis klien belum jelas');
      return reasons;
    },
  },

  defaultReason: 'Kebutuhan sesuai modul yang sudah ada: satu lokasi, alur standar',

  // Opsi checkbox/radio yang ditampilkan di form
  options: {
    basic: [
      { value: 'kasir', label: 'Kasir / transaksi' },
      { value: 'stok', label: 'Manajemen stok' },
      { value: 'laporan', label: 'Laporan penjualan dasar' },
    ],
    custom: [
      { value: 'booking', label: 'Booking / antrean online' },
      { value: 'preorder', label: 'Pre-order / pesan antar' },
      { value: 'poin', label: 'Sistem poin / loyalti' },
      { value: 'bagihasil', label: 'Bagi hasil / pembayaran ke mitra' },
      { value: 'qrmenu', label: 'QR menu & manajemen meja' },
      { value: 'reservasi', label: 'Reservasi online' },
      { value: 'lainnya', label: 'Alur khusus lainnya' },
    ],
    integrations: [
      { value: 'whatsapp', label: 'WhatsApp API' },
      { value: 'payment', label: 'Payment gateway' },
      { value: 'sistemlain', label: 'Integrasi sistem / aplikasi lain' },
    ],
    branches: [
      { value: '1', label: '1 lokasi' },
      { value: '2+', label: '2 lokasi atau lebih' },
    ],
    userTypes: [
      { value: '1-2', label: '1–2 jenis (mis. pemilik & kasir)' },
      { value: '3+', label: '3 jenis atau lebih' },
    ],
    clarity: [
      { value: 'jelas', label: 'Sudah jelas' },
      { value: 'sebagian', label: 'Sebagian jelas' },
      { value: 'belum', label: 'Belum jelas' },
    ],
  },
};
