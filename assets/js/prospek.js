// ---------- Helpers ----------
function prShow(el) { if (el) el.hidden = false; }
function prHide(el) { if (el) el.hidden = true; }
function prEscape(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function prDate(ts) {
  return ts && ts.toDate
    ? ts.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';
}
const PR_STATUS_LABEL = { baru: 'Baru', follow_up: 'Follow-up', deal: 'Deal', batal: 'Batal' };

// ---------- Screens ----------
const prScreens = {
  loading: document.getElementById('pr-screen-loading'),
  auth: document.getElementById('pr-screen-auth'),
  denied: document.getElementById('pr-screen-denied'),
  dashboard: document.getElementById('pr-screen-dashboard'),
};
function prShowScreen(name) {
  Object.values(prScreens).forEach(prHide);
  prShow(prScreens[name]);
}

document.getElementById('pr-back-btn').addEventListener('click', () => {
  affAuth.signOut().then(() => prShowScreen('auth'));
});

const prAuthError = document.getElementById('pr-auth-error');
document.getElementById('pr-auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  prAuthError.classList.remove('show');
  const email = document.getElementById('pr-email').value.trim();
  const password = document.getElementById('pr-password').value;
  if (!email || !password) {
    prAuthError.textContent = 'Isi email dan password dulu ya.';
    prAuthError.classList.add('show');
    return;
  }
  try {
    await affAuth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    const map = {
      'auth/invalid-email': 'Format email belum benar.',
      'auth/user-not-found': 'Akun tidak ditemukan.',
      'auth/wrong-password': 'Password salah.',
    };
    prAuthError.textContent = map[err.code] || 'Ada masalah, coba lagi ya.';
    prAuthError.classList.add('show');
  }
});
document.getElementById('pr-logout-btn').addEventListener('click', () => affAuth.signOut());

// ---------- Auth state + admin check ----------
let prUnsub = null;
affAuth.onAuthStateChanged(async (user) => {
  if (prUnsub) { prUnsub(); prUnsub = null; }
  if (!user) {
    prShowScreen('auth');
    return;
  }
  prShowScreen('loading');
  try {
    const adminDoc = await affDb.collection('admins').doc(user.uid).get();
    if (!adminDoc.exists) {
      prShowScreen('denied');
      return;
    }
  } catch (err) {
    prShowScreen('denied');
    return;
  }
  currentAdminUid = user.uid;
  prShowScreen('dashboard');
  attachProspekData();
});

let currentAdminUid = null;
let allAssessments = [];
let affiliateNameByCode = {};

function attachProspekData() {
  // Ambil daftar afiliator untuk filter dropdown & mapping nama
  affDb.collection('affiliates').onSnapshot((snap) => {
    const select = document.getElementById('pr-filter-affiliate');
    const currentVal = select.value;
    select.innerHTML = '<option value="">Semua afiliator</option>';
    affiliateNameByCode = {};
    snap.forEach((doc) => {
      const d = doc.data();
      affiliateNameByCode[d.code] = d.name;
      const opt = document.createElement('option');
      opt.value = d.code;
      opt.textContent = d.name + ' (' + d.code + ')';
      select.appendChild(opt);
    });
    select.value = currentVal;
  });

  prUnsub = affDb.collection('assessments')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snap) => {
      allAssessments = [];
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.deleted) return;
        allAssessments.push({ id: doc.id, ...d });
      });
      renderStats();
      renderTable();
    }, () => {
      document.getElementById('pr-empty').textContent = 'Gagal memuat data.';
      prShow(document.getElementById('pr-empty'));
    });
}

function renderStats() {
  const counts = { baru: 0, follow_up: 0, deal: 0, batal: 0 };
  allAssessments.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
  document.getElementById('pr-stat-baru').textContent = counts.baru;
  document.getElementById('pr-stat-followup').textContent = counts.follow_up;
  document.getElementById('pr-stat-deal').textContent = counts.deal;
  document.getElementById('pr-stat-batal').textContent = counts.batal;
  document.getElementById('pr-stat-total').textContent = allAssessments.length;
}

function getFiltered() {
  const status = document.getElementById('pr-filter-status').value;
  const paket = document.getElementById('pr-filter-paket').value;
  const affiliate = document.getElementById('pr-filter-affiliate').value;
  const dateFrom = document.getElementById('pr-filter-date-from').value;
  const dateTo = document.getElementById('pr-filter-date-to').value;
  const search = document.getElementById('pr-search').value.trim().toLowerCase();

  return allAssessments.filter((a) => {
    if (status && a.status !== status) return false;
    if (paket && a.result.package !== paket) return false;
    if (affiliate && a.affiliateCode !== affiliate) return false;
    if (dateFrom || dateTo) {
      const created = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : null;
      if (!created) return false;
      if (dateFrom && created < new Date(dateFrom)) return false;
      if (dateTo && created > new Date(dateTo + 'T23:59:59')) return false;
    }
    if (search) {
      const hay = (a.client.name + ' ' + a.client.business).toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

['pr-filter-status', 'pr-filter-paket', 'pr-filter-affiliate', 'pr-filter-date-from', 'pr-filter-date-to', 'pr-search'].forEach((id) => {
  document.getElementById(id).addEventListener('input', renderTable);
});

function renderTable() {
  const filtered = getFiltered();
  const tbody = document.getElementById('pr-tbody');
  const empty = document.getElementById('pr-empty');
  const table = document.getElementById('pr-table');

  if (filtered.length === 0) {
    table.hidden = true;
    empty.hidden = false;
    empty.textContent = 'Tidak ada prospek yang cocok dengan filter ini.';
    return;
  }
  table.hidden = false;
  empty.hidden = true;
  tbody.innerHTML = '';

  filtered.forEach((a) => {
    const tr = document.createElement('tr');
    tr.className = 'pr-row';
    tr.innerHTML = `
      <td data-label="Klien">${prEscape(a.client.name)}</td>
      <td data-label="Usaha">${prEscape(a.client.business)}</td>
      <td data-label="Paket">${prEscape(a.result.package)}</td>
      <td data-label="Estimasi">${prEscape(a.result.costLabel)}</td>
      <td data-label="Afiliator">${prEscape(affiliateNameByCode[a.affiliateCode] || a.affiliateName || '-')}</td>
      <td data-label="Masuk">${prDate(a.createdAt)}</td>
      <td data-label="Status"><span class="aff-status ${a.status === 'follow_up' ? 'proses' : a.status === 'deal' ? 'closing' : a.status === 'batal' ? 'batal' : 'baru'}">${PR_STATUS_LABEL[a.status]}</span></td>
    `;
    tr.addEventListener('click', () => openDetail(a.id));
    tbody.appendChild(tr);
  });
}

// ---------- Detail panel ----------
function openDetail(id) {
  const a = allAssessments.find((x) => x.id === id);
  if (!a) return;

  const backdrop = document.getElementById('pr-detail-backdrop');
  document.getElementById('pr-detail-title').textContent = a.client.name;
  document.getElementById('pr-detail-sub').textContent = a.client.business + ' · ' + a.result.package;
  document.getElementById('pr-detail-summary').textContent = a.summaryText;
  document.getElementById('pr-detail-status').value = a.status;
  document.getElementById('pr-detail-note').value = a.ownerNote || '';

  const waBtn = document.getElementById('pr-detail-wa');
  if (a.client.phone) {
    waBtn.hidden = false;
    waBtn.href = 'https://wa.me/' + a.client.phone + '?text=' + encodeURIComponent('Halo ' + a.client.name + ', perkenalkan saya dari SantoSoft...');
  } else {
    waBtn.hidden = true;
  }

  const historyEl = document.getElementById('pr-detail-history');
  const history = a.statusHistory || [];
  historyEl.innerHTML = history.length
    ? history.map((h) => `<div>${PR_STATUS_LABEL[h.status] || h.status} — ${h.at && h.at.toDate ? h.at.toDate().toLocaleString('id-ID') : ''}</div>`).join('')
    : '<div>Belum ada perubahan status.</div>';

  document.getElementById('pr-detail-save').onclick = () => saveDetail(id);
  document.getElementById('pr-detail-copy').onclick = () => {
    navigator.clipboard.writeText(a.summaryText);
    const btn = document.getElementById('pr-detail-copy');
    const orig = btn.textContent;
    btn.textContent = 'Tersalin!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  };
  document.getElementById('pr-detail-delete').onclick = () => deleteAssessment(id);

  backdrop.hidden = false;
}
document.getElementById('pr-detail-close').addEventListener('click', () => {
  document.getElementById('pr-detail-backdrop').hidden = true;
});

async function saveDetail(id) {
  const status = document.getElementById('pr-detail-status').value;
  const ownerNote = document.getElementById('pr-detail-note').value.trim();
  const btn = document.getElementById('pr-detail-save');
  btn.textContent = 'Menyimpan...';
  try {
    const a = allAssessments.find((x) => x.id === id);
    const historyEntry = { status, byUid: currentAdminUid, at: firebase.firestore.Timestamp.now() };
    const newHistory = (a.statusHistory || []).concat([historyEntry]);
    await affDb.collection('assessments').doc(id).update({
      status,
      ownerNote,
      statusHistory: newHistory,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    btn.textContent = 'Tersimpan!';
    setTimeout(() => { btn.textContent = 'Simpan perubahan'; }, 1500);
  } catch (err) {
    btn.textContent = 'Gagal, coba lagi';
  }
}

async function deleteAssessment(id) {
  if (!confirm('Hapus prospek ini? Data akan disembunyikan dari daftar (bisa dipulihkan lewat Firebase Console kalau perlu).')) return;
  await affDb.collection('assessments').doc(id).update({ deleted: true });
  document.getElementById('pr-detail-backdrop').hidden = true;
}

// ---------- CSV export ----------
document.getElementById('pr-export-btn').addEventListener('click', () => {
  const filtered = getFiltered();
  const header = ['Klien', 'Jenis Usaha', 'Kontak', 'Paket', 'Estimasi Biaya', 'Afiliator', 'Kode Afiliator', 'Tanggal Masuk', 'Status', 'Catatan Owner'];
  const rows = filtered.map((a) => [
    a.client.name, a.client.business, a.client.phone,
    a.result.package, a.result.costLabel,
    affiliateNameByCode[a.affiliateCode] || a.affiliateName || '', a.affiliateCode,
    prDate(a.createdAt), PR_STATUS_LABEL[a.status], a.ownerNote || '',
  ]);
  const csvEscape = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prospek-pardi-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
});
