// ---------- Helpers ----------
function asRupiah(n) {
  if (n === null || n === undefined) return '';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}
function asShow(el) { if (el) el.hidden = false; }
function asHide(el) { if (el) el.hidden = true; }
function normalizePhone(raw) {
  if (!raw) return '';
  let v = raw.replace(/[\s\-()]/g, '');
  if (v.startsWith('0')) v = '62' + v.slice(1);
  if (v.startsWith('+')) v = v.slice(1);
  return v;
}
const DRAFT_KEY = 'pardi_asesmen_draft_v1';

// ---------- Recommendation engine ----------
function computeRecommendation(answers) {
  const cfg = ASSESSMENT_CONFIG;
  const r2 = cfg.rules.level2(answers);
  const r3 = cfg.rules.level3(answers);

  if (r3.length > 0) {
    const p = cfg.packages.fullCustom;
    return {
      package: 'Full Custom',
      costMin: p.costMin,
      costMax: p.costMax,
      costLabel: 'Mulai ' + asRupiah(p.costMin),
      duration: p.duration,
      service: p.service,
      reasons: r3,
    };
  }
  if (r2.length > 0) {
    const p = cfg.packages.customFlow;
    const extraFlows = Math.max(0, (answers.custom.length || 0) - 1);
    let costMin = p.baseCostMin + extraFlows * p.perExtraFlow;
    costMin = Math.min(costMin, p.baseCostMinCap);
    let costMax = Math.min(costMin + p.upperOffset, p.costMaxCap);
    return {
      package: 'Custom Flow',
      costMin,
      costMax,
      costLabel: asRupiah(costMin) + ' – ' + asRupiah(costMax),
      duration: p.duration,
      service: p.service,
      reasons: r2,
    };
  }
  const p = cfg.packages.starter;
  return {
    package: 'Starter',
    costMin: 800000,
    costMax: 1500000,
    costLabel: 'Rp 800rb – 1,5jt',
    duration: p.duration,
    service: p.service,
    reasons: [cfg.defaultReason],
  };
}

function getWarning(answers, result) {
  const totalPicked = answers.basic.length + answers.custom.length + answers.integrations.length;
  if (totalPicked === 0) {
    return 'Belum ada kebutuhan dipilih. Gali lagi alur usaha klien dari pelanggan datang sampai uang masuk.';
  }
  if (result.package === 'Custom Flow' && answers.custom.length >= 4) {
    return 'Ada 4 alur khusus atau lebih — pertimbangkan dikerjakan bertahap, atau evaluasi ulang apakah ini lebih cocok Full Custom.';
  }
  if (result.package === 'Full Custom' && answers.clarity === 'belum') {
    return 'Alur bisnis klien belum jelas — sarankan sesi riset alur bisnis dulu sebelum penawaran final.';
  }
  return null;
}

// ---------- Summary text builder ----------
function labelsFor(list, optionKey) {
  const opts = ASSESSMENT_CONFIG.options[optionKey];
  return list.map((v) => (opts.find((o) => o.value === v) || {}).label || v);
}
function buildSummary(data) {
  const basicLabels = labelsFor(data.answers.basic, 'basic');
  const customLabels = labelsFor(data.answers.custom, 'custom');
  const integLabels = labelsFor(data.answers.integrations, 'integrations');
  const allNeeds = [...basicLabels, ...customLabels, ...integLabels].join(', ') || '-';
  const branchLabel = data.answers.branches === '2+' ? '2 lokasi atau lebih' : '1 lokasi';
  const userLabel = data.answers.userTypes === '3+' ? '3 jenis atau lebih' : '1–2 jenis';
  const clarityLabel = { jelas: 'Sudah jelas', sebagian: 'Sebagian jelas', belum: 'Belum jelas' }[data.answers.clarity] || '-';

  return [
    '*Asesmen PARDI · SantoSoft*',
    `Klien: ${data.client.name}`,
    `Jenis usaha: ${data.client.business}`,
    `Kontak klien: ${data.client.phone || '-'}`,
    `Diajukan oleh: ${data.affiliateName || 'SantoSoft langsung'}`,
    '',
    `Rekomendasi: Paket ${data.result.package}`,
    `Estimasi biaya: ${data.result.costLabel}`,
    `Durasi: ${data.result.duration}`,
    `Layanan: ${data.result.service}`,
    '',
    `Kebutuhan: ${allNeeds}`,
    `Lokasi: ${branchLabel} · Pengguna: ${userLabel} · Alur: ${clarityLabel}`,
    'Alasan:',
    ...data.result.reasons.map((r) => `- ${r}`),
    '',
    `Masalah utama: ${data.client.note || '-'}`,
    '',
    '(Estimasi indikatif, bukan penawaran final)',
  ].join('\n');
}

// ---------- Screens ----------
const asScreens = {
  loading: document.getElementById('as-screen-loading'),
  denied: document.getElementById('as-screen-denied'),
  app: document.getElementById('as-screen-app'),
};
function asShowScreen(name) {
  Object.values(asScreens).forEach(asHide);
  asShow(asScreens[name]);
}

let currentUid = null;
let currentAffiliate = null;

affAuth.onAuthStateChanged(async (user) => {
  if (!user) {
    asShowScreen('denied');
    document.getElementById('as-denied-reason').textContent = 'Kamu perlu masuk sebagai afiliator dulu.';
    return;
  }
  asShowScreen('loading');
  try {
    const doc = await affDb.collection('affiliates').doc(user.uid).get();
    if (!doc.exists || doc.data().status !== 'active') {
      asShowScreen('denied');
      document.getElementById('as-denied-reason').textContent = 'Akun afiliatormu belum aktif. Hubungi SantoSoft kalau ini keliru.';
      return;
    }
    currentUid = user.uid;
    currentAffiliate = doc.data();
    document.getElementById('as-affiliate-name').value = currentAffiliate.name || '';
    document.getElementById('as-affiliate-code').value = currentAffiliate.code || '';
    asShowScreen('app');
    initForm();
    loadHistory();
  } catch (err) {
    asShowScreen('denied');
    document.getElementById('as-denied-reason').textContent = 'Gagal memuat akun, coba lagi.';
  }
});

// ---------- Tabs ----------
document.querySelectorAll('.as-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.as-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.tab;
    document.querySelectorAll('.as-tabpanel').forEach((p) => asHide(p));
    asShow(document.getElementById('as-panel-' + target));
  });
});

// ---------- Form ----------
function buildCheckboxGroup(containerId, optionKey) {
  const container = document.getElementById(containerId);
  ASSESSMENT_CONFIG.options[optionKey].forEach((opt) => {
    const label = document.createElement('label');
    label.className = 'as-check';
    label.innerHTML = `<input type="checkbox" value="${opt.value}" data-group="${optionKey}"> <span>${opt.label}</span>`;
    container.appendChild(label);
  });
}
function buildRadioGroup(containerId, optionKey, name) {
  const container = document.getElementById(containerId);
  ASSESSMENT_CONFIG.options[optionKey].forEach((opt, i) => {
    const label = document.createElement('label');
    label.className = 'as-check';
    label.innerHTML = `<input type="radio" name="${name}" value="${opt.value}" data-group="${optionKey}" ${i === 0 ? '' : ''}> <span>${opt.label}</span>`;
    container.appendChild(label);
  });
}

let formInitDone = false;
function initForm() {
  if (formInitDone) return;
  formInitDone = true;

  buildCheckboxGroup('as-group-basic', 'basic');
  buildCheckboxGroup('as-group-custom', 'custom');
  buildCheckboxGroup('as-group-integrations', 'integrations');
  buildRadioGroup('as-group-branches', 'branches', 'branches');
  buildRadioGroup('as-group-userTypes', 'userTypes', 'userTypes');
  buildRadioGroup('as-group-clarity', 'clarity', 'clarity');

  restoreDraft();

  document.getElementById('as-form').addEventListener('input', () => {
    saveDraft();
    recalculate();
  });

  document.getElementById('as-mobile-bar-btn').addEventListener('click', () => {
    document.getElementById('as-result-panel').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('as-btn-save').addEventListener('click', handleSave);
  document.getElementById('as-btn-copy').addEventListener('click', handleCopy);
  document.getElementById('as-btn-wa').addEventListener('click', handleWa);
  document.getElementById('as-btn-new').addEventListener('click', handleNewForm);

  recalculate();
}

function readAnswers() {
  const getChecked = (group) => Array.from(document.querySelectorAll(`input[data-group="${group}"]:checked`)).map((el) => el.value);
  const getRadio = (group) => {
    const el = document.querySelector(`input[data-group="${group}"]:checked`);
    return el ? el.value : null;
  };
  return {
    basic: getChecked('basic'),
    custom: getChecked('custom'),
    integrations: getChecked('integrations'),
    branches: getRadio('branches') || '1',
    userTypes: getRadio('userTypes') || '1-2',
    clarity: getRadio('clarity') || 'jelas',
  };
}

function currentClient() {
  return {
    name: document.getElementById('as-client-name').value.trim(),
    business: document.getElementById('as-client-business').value.trim(),
    phone: normalizePhone(document.getElementById('as-client-phone').value.trim()),
    note: document.getElementById('as-client-note').value.trim(),
  };
}

let lastResult = null;
function recalculate() {
  const answers = readAnswers();
  const result = computeRecommendation(answers);
  lastResult = result;

  document.getElementById('as-result-package').textContent = result.package;
  document.getElementById('as-result-package').className = 'as-badge as-badge-' + result.package.replace(/\s/g, '');
  document.getElementById('as-result-cost').textContent = result.costLabel;
  document.getElementById('as-result-duration').textContent = result.duration;
  document.getElementById('as-result-service').textContent = result.service;

  const reasonsEl = document.getElementById('as-result-reasons');
  reasonsEl.innerHTML = '';
  result.reasons.forEach((r) => {
    const li = document.createElement('li');
    li.textContent = r;
    reasonsEl.appendChild(li);
  });

  const warning = getWarning(answers, result);
  const warnEl = document.getElementById('as-result-warning');
  if (warning) {
    warnEl.textContent = warning;
    asShow(warnEl);
  } else {
    asHide(warnEl);
  }

  document.getElementById('as-mobile-bar-package').textContent = result.package;
  asShow(document.getElementById('as-mobile-bar'));
}

// ---------- Draft autosave ----------
function saveDraft() {
  try {
    const data = {
      client: currentClient(),
      answers: readAnswers(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch (e) { /* localStorage tidak tersedia, abaikan */ }
}
function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.client) {
      document.getElementById('as-client-name').value = data.client.name || '';
      document.getElementById('as-client-business').value = data.client.business || '';
      document.getElementById('as-client-phone').value = data.client.phone || '';
      document.getElementById('as-client-note').value = data.client.note || '';
    }
    if (data.answers) {
      ['basic', 'custom', 'integrations'].forEach((g) => {
        (data.answers[g] || []).forEach((v) => {
          const el = document.querySelector(`input[data-group="${g}"][value="${v}"]`);
          if (el) el.checked = true;
        });
      });
      ['branches', 'userTypes', 'clarity'].forEach((g) => {
        if (data.answers[g]) {
          const el = document.querySelector(`input[data-group="${g}"][value="${data.answers[g]}"]`);
          if (el) el.checked = true;
        }
      });
    }
  } catch (e) { /* draft rusak, abaikan */ }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
}

// ---------- Actions ----------
async function handleSave() {
  const client = currentClient();
  const errEl = document.getElementById('as-form-error');
  errEl.hidden = true;

  if (!client.name || !client.business) {
    errEl.textContent = 'Nama klien dan jenis usaha wajib diisi.';
    errEl.hidden = false;
    return;
  }

  const answers = readAnswers();
  const result = lastResult || computeRecommendation(answers);
  const summaryText = buildSummary({
    client, answers, result,
    affiliateName: currentAffiliate.name,
  });

  const btn = document.getElementById('as-btn-save');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';
  try {
    await affDb.collection('assessments').add({
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      affiliateUid: currentUid,
      affiliateName: currentAffiliate.name || '',
      affiliateCode: currentAffiliate.code || '',
      client,
      answers,
      result,
      summaryText,
      status: 'baru',
      ownerNote: '',
      statusHistory: [],
      deleted: false,
    });
    clearDraft();
    document.getElementById('as-save-success').hidden = false;
    setTimeout(() => { document.getElementById('as-save-success').hidden = true; }, 3000);
    document.querySelector('.as-tab[data-tab="riwayat"]').click();
  } catch (err) {
    errEl.textContent = 'Gagal menyimpan, coba lagi ya.';
    errEl.hidden = false;
  }
  btn.disabled = false;
  btn.textContent = 'Simpan & kirim ke Owner';
}

function handleCopy() {
  const client = currentClient();
  const answers = readAnswers();
  const result = lastResult || computeRecommendation(answers);
  const text = buildSummary({ client, answers, result, affiliateName: currentAffiliate.name });
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('as-btn-copy');
    const orig = btn.textContent;
    btn.textContent = 'Tersalin!';
    setTimeout(() => { btn.textContent = orig; }, 1800);
  });
}

function handleWa() {
  const client = currentClient();
  const answers = readAnswers();
  const result = lastResult || computeRecommendation(answers);
  const text = buildSummary({ client, answers, result, affiliateName: currentAffiliate.name });
  window.open('https://wa.me/6281212551846?text=' + encodeURIComponent(text), '_blank', 'noopener');
}

function handleNewForm() {
  if (!confirm('Kosongkan form dan mulai asesmen baru?')) return;
  document.getElementById('as-form').reset();
  clearDraft();
  recalculate();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- History ----------
function loadHistory() {
  const tbody = document.getElementById('as-history-tbody');
  const empty = document.getElementById('as-history-empty');
  const table = document.getElementById('as-history-table');

  affDb.collection('assessments')
    .where('affiliateUid', '==', currentUid)
    .orderBy('createdAt', 'desc')
    .onSnapshot((snap) => {
      if (snap.empty) {
        table.hidden = true;
        empty.hidden = false;
        return;
      }
      table.hidden = false;
      empty.hidden = true;
      tbody.innerHTML = '';
      const statusLabel = { baru: 'Baru', follow_up: 'Follow-up', deal: 'Deal', batal: 'Batal' };
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.deleted) return;
        const tr = document.createElement('tr');
        const tanggal = d.createdAt && d.createdAt.toDate
          ? d.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          : '-';
        tr.innerHTML = `
          <td>${asEscape(d.client.name)}</td>
          <td>${asEscape(d.client.business)}</td>
          <td>${asEscape(d.result.package)}</td>
          <td>${tanggal}</td>
          <td><span class="as-status as-status-${d.status}">${statusLabel[d.status] || d.status}</span></td>
        `;
        tr.addEventListener('click', () => showHistoryDetail(d));
        tbody.appendChild(tr);
      });
    }, () => {
      table.hidden = true;
      empty.hidden = false;
      empty.textContent = 'Gagal memuat riwayat.';
    });
}

function showHistoryDetail(d) {
  const modal = document.getElementById('as-detail-modal');
  document.getElementById('as-detail-content').textContent = d.summaryText;
  modal.hidden = false;
}
document.getElementById('as-detail-close').addEventListener('click', () => {
  document.getElementById('as-detail-modal').hidden = true;
});

function asEscape(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
