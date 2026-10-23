/**
 * ============================================================
 * APP.JS — Frontend Logic M-TOP (FULL FIXED)
 * ============================================================
 */

// ==========================================
// 0. GLOBAL STATE & HELPER
// ==========================================
window.currentWoId = null;
window.dataJasaGlobal = [];
window.dataBarangGlobal = [];
window.dataPelangganGlobal = [];
window.dataKendaraanGlobal = [];
window.dataSalesGlobal = [];
window.dataJasaUntukItem = [];
window.dataBarangUntukItem = [];
window.dataBarangPembelian = [];
window.dataSalesPembelian = [];
window.dataMekanikGlobal = [];
window.dataMekanikForm = [];
window.dataPengerjaanGlobal = null;
window.dataPelaksanaPengerjaan = [];
window.dataLaporanGlobal = null;
window.barisItemCounter = 0;

function formatRupiah(angka) {
  const n = parseInt(String(angka).replace(/[^0-9-]/g, ''), 10) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(n);
}

function parseRupiah(str) {
  return parseInt(String(str).replace(/[^0-9-]/g, ''), 10) || 0;
}

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatWhatsApp(wa) {
  if (!wa) return '-';
  const digits = String(wa).replace(/\D/g, '');
  if (digits.length < 9) return esc(wa);
  if (digits.startsWith('62')) {
    return '0' + digits.substring(2, 6) + '-' + digits.substring(6, 10) + '-' + digits.substring(10);
  }
  if (digits.length === 11 || digits.length === 12) {
    return digits.substring(0, 4) + '-' + digits.substring(4, 8) + '-' + digits.substring(8);
  }
  return digits;
}

// ==========================================
// 1. TOAST & MODAL
// ==========================================
function showToast(message, type) {
  type = type || 'success';
  const container = document.getElementById('toast-container');
  if (!container) { alert(message); return; }

  const colors = {
    success: 'var(--primary-green)', error: 'var(--primary-red)',
    info: 'var(--primary-blue)', warning: '#f39c12'
  };
  const icons = {
    success: 'fa-check-circle', error: 'fa-times-circle',
    info: 'fa-info-circle', warning: 'fa-exclamation-triangle'
  };

  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderLeftColor = colors[type] || colors.info;
  el.innerHTML =
    '<i class="fas ' + (icons[type] || icons.info) + '" style="color:' + (colors[type] || colors.info) + '; font-size:1.2rem;"></i>' +
    '<span>' + esc(message) + '</span>' +
    '<button onclick="this.parentElement.remove()" class="toast-close">&times;</button>';
  container.appendChild(el);
  setTimeout(function() { if (el.parentElement) el.remove(); }, 4500);
}

function showConfirm(message, onConfirm) {
  const overlay = document.getElementById('modal-confirm');
  if (!overlay) { if (confirm(message)) onConfirm(); return; }
  document.getElementById('modal-confirm-msg').innerText = message;
  overlay.style.display = 'flex';

  const btnYes = document.getElementById('modal-confirm-yes');
  const btnNo = document.getElementById('modal-confirm-no');
  const cleanup = function() {
    overlay.style.display = 'none';
    btnYes.onclick = null; btnNo.onclick = null;
  };
  btnYes.onclick = function() { cleanup(); onConfirm(); };
  btnNo.onclick = cleanup;
}

function showModalCustom(title, contentHtml) {
  let modal = document.getElementById('modal-custom');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-custom';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:10000; display:none; align-items:center; justify-content:center; padding:20px;';
    modal.innerHTML =
      '<div style="background:#fff; border-radius:8px; max-width:720px; width:100%; max-height:90vh; overflow-y:auto; padding:24px; box-shadow:0 10px 40px rgba(0,0,0,0.2);">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">' +
          '<h3 id="modal-custom-title" style="color:var(--primary-blue); margin:0;">Detail</h3>' +
          '<button onclick="document.getElementById(\'modal-custom\').style.display=\'none\'" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#999;">&times;</button>' +
        '</div>' +
        '<div id="modal-custom-body"></div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.style.display = 'none';
    });
  }
  document.getElementById('modal-custom-title').innerText = title;
  document.getElementById('modal-custom-body').innerHTML = contentHtml;
  modal.style.display = 'flex';
}

// ==========================================
// 2. ROUTING
// ==========================================
const VALID_VIEWS = [
  'Dashboard', 'Penerimaan', 'DaftarWO', 'DetailWO',
  'Kasir', 'KatalogJasa', 'Inventori', 'Keuangan',
  'Pelanggan', 'Kendaraan',
  'Sales', 'Pembelian', 'UtangSales',
  'Mekanik', 'Pengerjaan', 'Laporan'
];

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

function loadView(viewName, element) {
  if (VALID_VIEWS.indexOf(viewName) === -1) {
    showToast('View "' + viewName + '" tidak dikenal.', 'error');
    return;
  }

  document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });
  if (element) element.classList.add('active');
  else {
    const el = document.querySelector('.nav-item[data-view="' + viewName + '"]');
    if (el) el.classList.add('active');
  }

  const appView = document.getElementById('app-view');
  if (!appView) return;

  appView.innerHTML = '<div style="text-align:center; padding:40px; color:#1769AA;">' +
    '<i class="fas fa-spinner fa-spin fa-2x"></i><p>Memuat modul...</p></div>';

  fetch('js/views/' + viewName + '.html')
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' — file js/views/' + viewName + '.html tidak ditemukan');
      return r.text();
    })
    .then(function(html) {
      appView.innerHTML = html;
      try {
        if (viewName === 'DaftarWO') initWorkOrderList();
        else if (viewName === 'KatalogJasa') initKatalogJasa();
        else if (viewName === 'DetailWO') fetchDetailWO(window.currentWoId);
        else if (viewName === 'Kasir') initKasir();
        else if (viewName === 'Dashboard') initDashboard();
        else if (viewName === 'Inventori') initInventori();
        else if (viewName === 'Keuangan') initKeuangan();
        else if (viewName === 'Pelanggan') initPelanggan();
        else if (viewName === 'Kendaraan') initKendaraan();
        else if (viewName === 'Sales') initSales();
        else if (viewName === 'Pembelian') initPembelian();
        else if (viewName === 'UtangSales') initUtangSales();
        else if (viewName === 'Mekanik') initMekanik();
        else if (viewName === 'Pengerjaan') initPengerjaan();
        else if (viewName === 'Laporan') initLaporan();
      } catch (e) {
        console.error('Init view error:', e);
        showToast('Error saat inisialisasi: ' + e.message, 'error');
      }
    })
    .catch(function(error) {
      appView.innerHTML = '<div style="color:#E31E2B; padding:20px;">Gagal memuat: ' + esc(error.message) + '</div>';
    });

  if (window.innerWidth <= 768) {
    document.querySelector('.sidebar').classList.remove('open');
  }
}

// ==========================================
// 3. MODUL PENERIMAAN
// ==========================================
function submitPenerimaan(event) {
  event.preventDefault();
  const form = document.getElementById('formPenerimaan');
  const btn = document.getElementById('btnSubmit');

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

  const formData = {
    nama: form.nama.value.trim(),
    whatsapp: form.whatsapp.value.trim(),
    alamat: form.alamat ? form.alamat.value.trim() : '',
    nopol: form.nopol.value.toUpperCase().trim(),
    kilometer: form.kilometer.value,
    merek: form.merek.value.trim(),
    tipe: form.tipe.value.trim(),
    keluhan: form.keluhan.value.trim(),
    catatan: form.catatan ? form.catatan.value.trim() : ''
  };

  const waDigits = formData.whatsapp.replace(/\D/g, '');
  if (waDigits.length < 9 || waDigits.length > 15) {
    showToast('Nomor WhatsApp harus 9-15 digit angka.', 'warning');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Buat Work Order';
    return;
  }

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success) {
        showToast(res.message, 'success');
        form.reset();
        setTimeout(function() { loadView('DaftarWO'); }, 700);
      } else showToast('Gagal: ' + res.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Buat Work Order';
    })
    .withFailureHandler(function(error) {
      showToast('Error: ' + error.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Buat Work Order';
    })
    .prosesPenerimaanMotor(formData);
}

// ==========================================
// 4. DAFTAR WORK ORDER
// ==========================================
function initWorkOrderList() {
  const tbody = document.getElementById('tabelWO');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">' +
    '<i class="fas fa-spinner fa-spin"></i> Memuat data...</td></tr>';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);

      if (!res.success) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--primary-red);">' +
          'Gagal memuat: ' + esc(res.message) + '</td></tr>';
        return;
      }

      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">' +
          'Belum ada data Work Order. Klik "Tambah Servis" untuk membuat WO baru.</td></tr>';
        return;
      }

      let html = '';
      res.data.forEach(function(wo) {
        let badgeColor = '#6c757d';
        if (wo.status === 'Menunggu Pemeriksaan') badgeColor = '#f39c12';
        else if (wo.status === 'Dalam Pemeriksaan') badgeColor = '#f39c12';
        else if (wo.status === 'Menunggu Persetujuan') badgeColor = '#e67e22';
        else if (wo.status === 'Menunggu Suku Cadang') badgeColor = '#e67e22';
        else if (wo.status === 'Dalam Pengerjaan') badgeColor = 'var(--primary-blue)';
        else if (wo.status === 'Pemeriksaan Akhir') badgeColor = 'var(--primary-blue)';
        else if (wo.status === 'Siap Diambil') badgeColor = 'var(--primary-green)';
        else if (wo.status === 'Selesai') badgeColor = 'var(--primary-green)';
        else if (wo.status === 'Dibatalkan') badgeColor = 'var(--primary-red)';

        const bisaDikerjakan = (wo.status !== 'Selesai' && wo.status !== 'Dibatalkan');

        html += '<tr style="border-bottom:1px solid var(--border-color);">' +
          '<td style="padding:12px; font-weight:600; color:var(--primary-blue); white-space:nowrap;">' + esc(wo.nomor_wo) + '</td>' +
          '<td style="padding:12px; white-space:nowrap;">' + esc(String(wo.tanggal).substring(0, 10)) + '</td>' +
          '<td style="padding:12px;">' + esc(wo.pelanggan) + '</td>' +
          '<td style="padding:12px;">' +
            '<span style="background:' + badgeColor + '; color:white; padding:4px 10px; border-radius:12px; font-size:0.8rem; font-weight:600; white-space:nowrap;">' +
              esc(wo.status) +
            '</span>' +
          '</td>' +
          '<td style="padding:12px; white-space:nowrap;">' +
            '<button onclick="bukaDetailWO(\'' + wo.wo_id + '\')" ' +
              'style="background:white; border:1px solid var(--primary-blue); color:var(--primary-blue); padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:600; margin-right:5px;">' +
              '<i class="fas fa-eye"></i> Detail' +
            '</button>' +
            (bisaDikerjakan ?
              '<button onclick="bukaPengerjaan(\'' + wo.wo_id + '\')" ' +
                'style="background:var(--primary-blue); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:600;">' +
                '<i class="fas fa-wrench"></i> Kerjakan' +
              '</button>'
              : '') +
          '</td>' +
        '</tr>';
      });
      tbody.innerHTML = html;
    })
    .withFailureHandler(function(error) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--primary-red);">' +
        'Error: ' + esc(error.message) + '</td></tr>';
    })
    .getDaftarWO();
}

function bukaDetailWO(woId) {
  window.currentWoId = woId;
  loadView('DetailWO');
}

function bukaPengerjaan(woId) {
  window.currentWoId = woId;
  loadView('Pengerjaan');
}

// ==========================================
// 5. DETAIL WO
// ==========================================
function fetchDetailWO(woId) {
  if (!woId) return;
  document.getElementById('d-nowo').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  document.getElementById('item_woid').value = woId;

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (!res.success) { showToast(res.message, 'error'); return; }
      const w = res.data;

      document.getElementById('d-woid').value = w.wo_id;
      document.getElementById('d-nowo').innerText = w.nomor_wo;
      document.getElementById('d-tanggal').innerText = String(w.tanggal).substring(0,16);
      document.getElementById('d-nama').innerText = w.nama_pelanggan || '-';
      document.getElementById('d-wa').innerText = w.whatsapp || '-';
      document.getElementById('d-nopol').innerText = w.nopol || '-';
      document.getElementById('d-motor').innerText = w.motor || '-';
      document.getElementById('d-km').innerText = w.km || '0';
      document.getElementById('d-keluhan').innerText = w.keluhan || '-';

      const badge = document.getElementById('d-status');
      badge.innerText = w.status;
      badge.style.backgroundColor =
        (w.status === 'Selesai' || w.status === 'Siap Diambil') ? 'var(--primary-green)' :
        (w.status === 'Dalam Pengerjaan') ? 'var(--primary-blue)' : '#f39c12';

      const waGroup = document.getElementById('wa_button_group');
      if (waGroup) {
        waGroup.style.display = (w.status === 'Selesai' || w.status === 'Siap Diambil') ? 'block' : 'none';
      }

      const panel = document.getElementById('wa_riwayat_panel');
      if (panel) panel.style.display = 'none';

      muatDaftarItemWO(w.wo_id);
    })
    .withFailureHandler(function(error) {
      showToast('Error: ' + error.message, 'error');
    })
    .getDetailWO(woId);
}

function ubahStatusWO(statusBaru) {
  const el = document.getElementById('d-woid');
  const woId = (el && el.value) ? el.value : window.currentWoId;

  if (!woId) {
    showToast('WO tidak valid. Silakan buka ulang dari Daftar WO.', 'error');
    return;
  }

  showConfirm('Ubah status menjadi: ' + statusBaru + '?', function() {
    google.script.run
      .withSuccessHandler(function(responseStr) {
        const res = JSON.parse(responseStr);
        if (res.success) {
          showToast(res.message, 'success');
          if (el && el.value) {
            fetchDetailWO(woId);
          } else if (typeof initPengerjaan === 'function') {
            initPengerjaan();
          }
        } else {
          showToast('Gagal: ' + res.message, 'error');
        }
      })
      .withFailureHandler(function(error) {
        showToast('Error: ' + error.message, 'error');
      })
      .updateStatusWO(woId, statusBaru);
  });
}

function muatDaftarItemWO(woId) {
  const tbody = document.getElementById('tabelItemWO');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px;"><i class="fas fa-spinner fa-spin"></i> Memuat...</td></tr>';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (!res.success) return;
      if (res.data.items.length > 0) {
        let html = '';
        res.data.items.forEach(function(item) {
          const badgeType = item.jenis === 'Jasa' ? 'var(--primary-blue)' : '#f39c12';
          html += '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:10px;"><span style="background:' + badgeType + '; color:white; padding:3px 6px; border-radius:4px; font-size:0.75rem;">' + esc(item.jenis) + '</span></td>' +
            '<td style="padding:10px; font-weight:bold;">' + esc(item.deskripsi) + '</td>' +
            '<td style="padding:10px; text-align:center;">' + item.qty + '</td>' +
            '<td style="padding:10px; text-align:right;">' + formatRupiah(item.harga) + '</td>' +
            '<td style="padding:10px; text-align:right; font-weight:bold;">' + formatRupiah(item.subtotal) + '</td>' +
            '<td style="padding:10px; text-align:center;"><button type="button" onclick="hapusItemWO(\'' + item.detail_id + '\')" style="background:none; border:none; color:var(--primary-red); cursor:pointer;"><i class="fas fa-trash"></i></button></td>' +
            '</tr>';
        });
        tbody.innerHTML = html;
      } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px; color:#999;">Belum ada rincian.</td></tr>';
      }
      document.getElementById('totalEstimasi').innerText = formatRupiah(res.data.total);

      loadJasaDanBarangUntukItem();
    })
    .getWODetailItems(woId);
}

function loadJasaDanBarangUntukItem() {
  google.script.run
    .withSuccessHandler(function(resJasaStr) {
      const res = JSON.parse(resJasaStr);
      if (res.success) window.dataJasaUntukItem = res.data;
      google.script.run
        .withSuccessHandler(function(resBarangStr) {
          const res2 = JSON.parse(resBarangStr);
          if (res2.success) window.dataBarangUntukItem = res2.data;
          onJenisItemChange();
        })
        .getDaftarBarang();
    })
    .getDaftarJasa();
}

function onJenisItemChange() {
  const jenis = document.getElementById('item_jenis').value;
  const select = document.getElementById('item_pilihan');
  if (!select) return;
  document.getElementById('item_barang_id').value = '';
  document.getElementById('item_jasa_id').value = '';
  document.getElementById('item_harga').value = '';

  let html = '<option value="">-- Pilih --</option>';

  if (jenis === 'Jasa') {
    window.dataJasaUntukItem.forEach(function(j) {
      if (j.status === 'Aktif') {
        html += '<option value="' + j.jasa_id + '" data-harga="' + parseRupiah(j.tarif) + '">' +
                esc(j.kode) + ' - ' + esc(j.nama) + ' (' + formatRupiah(j.tarif) + ')</option>';
      }
    });
  } else {
    window.dataBarangUntukItem.forEach(function(b) {
      if (b.status === 'Aktif') {
        const stok = parseInt(b.stok) || 0;
        html += '<option value="' + b.barang_id + '" data-harga="' + parseRupiah(b.harga_jual) + '">' +
                esc(b.kode) + ' - ' + esc(b.nama) + ' (Stok: ' + stok + ') - ' + formatRupiah(b.harga_jual) + '</option>';
      }
    });
  }
  select.innerHTML = html;
}

function onItemPilihanChange() {
  const select = document.getElementById('item_pilihan');
  const opt = select.options[select.selectedIndex];
  const harga = opt ? (opt.getAttribute('data-harga') || 0) : 0;
  document.getElementById('item_harga').value = harga;

  const jenis = document.getElementById('item_jenis').value;
  if (jenis === 'Jasa') {
    document.getElementById('item_jasa_id').value = select.value;
    document.getElementById('item_barang_id').value = '';
  } else {
    document.getElementById('item_barang_id').value = select.value;
    document.getElementById('item_jasa_id').value = '';
  }
}

function tambahItemWO(event) {
  event.preventDefault();
  const btn = document.getElementById('btnTambahItem');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  const jenis = document.getElementById('item_jenis').value;
  const select = document.getElementById('item_pilihan');
  const pilihan = select.value;
  const opt = select.options[select.selectedIndex];
  const deskripsiRaw = opt ? opt.text : '';
  let deskripsi = deskripsiRaw;
  const idxDash = deskripsiRaw.indexOf(' - ');
  if (idxDash >= 0) {
    deskripsi = deskripsiRaw.substring(idxDash + 3);
  }
  const idxParen = deskripsi.indexOf(' (');
  if (idxParen >= 0) deskripsi = deskripsi.substring(0, idxParen);

  if (!pilihan) {
    showToast('Pilih item dulu.', 'warning');
    btn.disabled = false;
    btn.innerHTML = '+ Tambah';
    return;
  }

  const formData = {
    wo_id: document.getElementById('item_woid').value,
    jenis: jenis,
    deskripsi: deskripsi,
    qty: document.getElementById('item_qty').value,
    harga: document.getElementById('item_harga').value,
    barang_id: document.getElementById('item_barang_id').value,
    jasa_id: document.getElementById('item_jasa_id').value
  };

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success) {
        document.getElementById('item_qty').value = '1';
        document.getElementById('item_harga').value = '';
        document.getElementById('item_pilihan').value = '';
        showToast(res.message, 'success');
        muatDaftarItemWO(formData.wo_id);
      } else showToast('Gagal: ' + res.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '+ Tambah';
    })
    .withFailureHandler(function(error) {
      showToast('Error: ' + error.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '+ Tambah';
    })
    .addWOItem(formData);
}

function hapusItemWO(detailId) {
  showConfirm('Hapus item ini dari rincian?', function() {
    const woId = document.getElementById('item_woid').value;
    google.script.run
      .withSuccessHandler(function(responseStr) {
        const res = JSON.parse(responseStr);
        if (res.success) muatDaftarItemWO(woId);
        else showToast('Gagal: ' + res.message, 'error');
      })
      .hapusWOItem(detailId);
  });
}

// ==========================================
// 6. KATALOG JASA
// ==========================================
function initKatalogJasa() {
  const tbody = document.getElementById('tabelJasa');
  if (!tbody) return;

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success && res.data.length > 0) {
        window.dataJasaGlobal = res.data;
        let html = '';
        res.data.forEach(function(js) {
          const numTarif = parseRupiah(js.tarif);
          html += '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:10px; font-weight:bold;">' + esc(js.kode) + '</td>' +
            '<td style="padding:10px;">' + esc(js.nama) + '</td>' +
            '<td style="padding:10px;">' + esc(js.kategori) + '</td>' +
            '<td style="padding:10px; color:var(--primary-red); font-weight:bold;">' + formatRupiah(numTarif) + '</td>' +
            '<td style="padding:10px;">' + esc(js.estimasi) + ' Menit</td>' +
            '<td style="padding:10px; white-space:nowrap;">' +
              '<span style="background:var(--primary-green); color:white; padding:3px 8px; border-radius:4px; font-size:0.75rem; margin-right:10px;">' + esc(js.status) + '</span>' +
              '<button type="button" onclick="editJasa(\'' + js.jasa_id + '\')" style="background:none; border:none; color:var(--primary-blue); cursor:pointer; margin-right:5px;"><i class="fas fa-edit"></i></button>' +
              '<button type="button" onclick="hapusJasa(\'' + js.jasa_id + '\')" style="background:none; border:none; color:var(--primary-red); cursor:pointer;"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
        });
        tbody.innerHTML = html;
      } else {
        window.dataJasaGlobal = [];
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">Katalog masih kosong.</td></tr>';
      }
    })
    .getDaftarJasa();
}

function editJasa(jasaId) {
  const jasa = window.dataJasaGlobal.find(function(j) { return j.jasa_id === jasaId; });
  if (!jasa) return;
  const form = document.getElementById('formJasa');
  const btn = document.getElementById('btnSubmitJasa');
  form.jasa_id.value = jasa.jasa_id;
  form.kode.value = jasa.kode;
  form.nama.value = jasa.nama;
  form.kategori.value = jasa.kategori;
  form.tarif.value = parseRupiah(jasa.tarif);
  form.estimasi.value = parseInt(jasa.estimasi) || 0;
  btn.innerHTML = '<i class="fas fa-save"></i> Update';
  btn.style.background = 'var(--primary-blue)';
  document.querySelector('.view-container').scrollTo(0, 0);
}

function submitJasa(event) {
  event.preventDefault();
  const form = document.getElementById('formJasa');
  const btn = document.getElementById('btnSubmitJasa');
  const isUpdate = form.jasa_id.value !== '';

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  const formData = {
    jasa_id: form.jasa_id.value,
    kode: form.kode.value.trim(),
    nama: form.nama.value.trim(),
    kategori: form.kategori.value,
    tarif: form.tarif.value,
    estimasi: form.estimasi.value
  };

  const onSuccess = function(responseStr) {
    const res = JSON.parse(responseStr);
    if (res.success) {
      form.reset();
      form.jasa_id.value = '';
      btn.innerHTML = '<i class="fas fa-plus"></i> Simpan';
      btn.style.background = 'var(--primary-green)';
      showToast(res.message, 'success');
      initKatalogJasa();
    } else {
      showToast('Gagal: ' + res.message, 'error');
      btn.innerHTML = isUpdate ? '<i class="fas fa-save"></i> Update' : '<i class="fas fa-plus"></i> Simpan';
    }
    btn.disabled = false;
  };

  if (isUpdate) google.script.run.withSuccessHandler(onSuccess).updateDataJasa(formData);
  else google.script.run.withSuccessHandler(onSuccess).simpanJasaBaru(formData);
}

function hapusJasa(jasaId) {
  showConfirm('Yakin ingin menghapus jasa ini?', function() {
    google.script.run
      .withSuccessHandler(function(responseStr) {
        const res = JSON.parse(responseStr);
        if (res.success) { showToast(res.message, 'success'); initKatalogJasa(); }
        else showToast('Gagal: ' + res.message, 'error');
      })
      .hapusDataJasa(jasaId);
  });
}

// ==========================================
// 7. KASIR
// ==========================================
function initKasir() {
  const select = document.getElementById('k_select_wo');
  if (!select) return;
  document.getElementById('k_panel_detail').style.display = 'none';
  const areaCetak = document.getElementById('k_area_cetak');
  if (areaCetak) areaCetak.style.display = 'none';
  document.getElementById('k_sisa_tagihan').innerText = 'Rp 0';
  const btn = document.getElementById('btnBayar');
  btn.disabled = true;
  btn.style.cursor = 'not-allowed';
  btn.style.opacity = '0.6';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success) {
        let html = '<option value="">-- Pilih Antrean Servis --</option>';
        res.data.forEach(function(wo) {
          html += '<option value="' + wo.wo_id + '">' + esc(wo.nomor_wo) + ' - ' + esc(wo.pelanggan) + ' (' + esc(wo.status) + ')</option>';
        });
        select.innerHTML = html;
      }
    })
    .getDaftarWOKasir();
}

function loadDetailKasir(woId) {
  if (!woId) {
    document.getElementById('k_panel_detail').style.display = 'none';
    const areaCetak = document.getElementById('k_area_cetak');
    if (areaCetak) areaCetak.style.display = 'none';
    document.getElementById('k_sisa_tagihan').innerText = 'Rp 0';
    document.getElementById('k_woid').value = '';
    document.getElementById('k_sisa_num').value = '';
    document.getElementById('k_jumlah').value = '';
    const btn = document.getElementById('btnBayar');
    btn.disabled = true; btn.style.cursor = 'not-allowed'; btn.style.opacity = '0.6';
    return;
  }

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (!res.success) { showToast(res.message, 'error'); return; }
      const w = res.data;

      document.getElementById('k_panel_detail').style.display = 'block';
      document.getElementById('k_woid').value = w.wo_id;
      document.getElementById('k_nama').innerText = w.nama_pelanggan || '-';
      document.getElementById('k_nowo').innerText = w.nomor_wo;
      document.getElementById('k_status').innerText = w.status;

      let tbody = '';
      w.items.forEach(function(item) {
        tbody += '<tr><td style="padding:5px 0;">' + item.qty + 'x ' + esc(item.deskripsi) + '</td><td style="text-align:right; padding:5px 0;">' + formatRupiah(item.subtotal) + '</td></tr>';
      });
      tbody += '<tr style="border-top:2px solid #ccc; font-weight:bold;"><td style="padding:5px 0;">Total Tagihan</td><td style="text-align:right; padding:5px 0;">' + formatRupiah(w.total_tagihan) + '</td></tr>';
      if (w.total_terbayar > 0) {
        tbody += '<tr style="color:var(--primary-green);"><td style="padding:5px 0;">Sudah Dibayar</td><td style="text-align:right; padding:5px 0;">- ' + formatRupiah(w.total_terbayar) + '</td></tr>';
      }
      document.getElementById('k_tabel_item').innerHTML = tbody;
      document.getElementById('k_sisa_tagihan').innerText = formatRupiah(w.sisa_tagihan);
      document.getElementById('k_sisa_num').value = w.sisa_tagihan;
      document.getElementById('k_jumlah').value = w.sisa_tagihan;

      const btnBayar = document.getElementById('btnBayar');
      const areaCetak = document.getElementById('k_area_cetak');
      if (w.sisa_tagihan > 0) {
        if (areaCetak) areaCetak.style.display = 'none';
        btnBayar.disabled = false; btnBayar.style.cursor = 'pointer'; btnBayar.style.opacity = '1';
      } else {
        if (areaCetak) areaCetak.style.display = 'block';
        btnBayar.disabled = true; btnBayar.style.cursor = 'not-allowed'; btnBayar.style.opacity = '0.6';
        document.getElementById('k_sisa_tagihan').innerText = 'LUNAS';
      }
    })
    .getDetailTagihan(woId);
}

function submitKasir(event) {
  event.preventDefault();
  const woId = document.getElementById('k_woid').value;
  if (!woId) { showToast('Pilih Work Order dulu.', 'warning'); return; }

  const sisaTagihan = parseInt(document.getElementById('k_sisa_num').value) || 0;
  const jumlahBayar = parseInt(document.getElementById('k_jumlah').value) || 0;

  if (jumlahBayar <= 0) { showToast('Jumlah bayar harus > 0.', 'warning'); return; }
  if (jumlahBayar > sisaTagihan) {
    showToast('Jumlah bayar melebihi sisa tagihan (' + formatRupiah(sisaTagihan) + ').', 'warning');
    return;
  }

  const btn = document.getElementById('btnBayar');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

  const formData = {
    wo_id: woId,
    metode: document.getElementById('k_metode').value,
    jumlah: jumlahBayar
  };

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success) {
        showToast(res.message, 'success');
        document.getElementById('formKasir').reset();
        loadDetailKasir(formData.wo_id);
      } else showToast('Gagal: ' + res.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check-circle"></i> Proses Pembayaran';
    })
    .withFailureHandler(function(error) {
      showToast('Error: ' + error.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check-circle"></i> Proses Pembayaran';
    })
    .prosesPembayaran(formData);
}

function cetakNota() {
  const woId = document.getElementById('k_woid').value;
  const btn = document.getElementById('btnCetakNota');
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyiapkan...';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success) {
        const w = window.open('', '_blank', 'width=600,height=800');
        w.document.write(res.data);
        w.document.close();
        w.focus();
        setTimeout(function() { w.print(); }, 800);
      } else showToast('Gagal mencetak: ' + res.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-print"></i> Cetak Nota';
    })
    .getNotaHTML(woId);
}

// ==========================================
// 8. DASHBOARD
// ==========================================
function initDashboard() {
  const filterEl = document.getElementById('filterDashboard');
  const filter = filterEl ? filterEl.value : 'hari_ini';
  const filterText = filterEl ? filterEl.options[filterEl.selectedIndex].text : 'Hari Ini';

  document.querySelectorAll('.lbl-filter').forEach(function(el) { el.innerText = filterText; });

  const loadIds = ['stat-masuk', 'stat-proses', 'stat-selesai', 'stat-pendapatan',
                   'stat-hpp', 'stat-laba-kotor', 'stat-pengeluaran', 'stat-laba', 'stat-utang-sales'];
  const rupiahIds = ['stat-pendapatan', 'stat-hpp', 'stat-laba-kotor', 'stat-pengeluaran', 'stat-laba', 'stat-utang-sales'];

  loadIds.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  });
  const tblAkt = document.getElementById('table-aktivitas');
  if (tblAkt) tblAkt.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;"><i class="fas fa-spinner fa-spin"></i> Memuat...</td></tr>';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      if (!document.getElementById('filterDashboard')) return;

      try {
        const res = JSON.parse(responseStr);
        if (!res.success) {
          showToast('Gagal memuat Dashboard: ' + res.message, 'error');
          loadIds.forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.innerText = rupiahIds.indexOf(id) >= 0 ? 'Rp 0' : '0';
          });
          return;
        }
        const d = res.data;
        const s = d.stats;

        const setTxt = function(id, val) {
          const el = document.getElementById(id);
          if (el) el.innerText = val;
        };

        setTxt('stat-masuk', s.masuk);
        setTxt('stat-proses', s.proses);
        setTxt('stat-selesai', s.selesai);
        setTxt('stat-pendapatan', formatRupiah(s.pendapatan));
        setTxt('stat-hpp', formatRupiah(s.hpp || 0));
        setTxt('stat-pengeluaran', formatRupiah(s.pengeluaran));
        setTxt('stat-utang-sales', formatRupiah(s.utang_sales || 0));

        const lkEl = document.getElementById('stat-laba-kotor');
        if (lkEl) {
          lkEl.innerText = formatRupiah(s.laba_kotor || 0);
          lkEl.style.color = (s.laba_kotor || 0) < 0 ? 'var(--primary-red)' : 'var(--primary-blue)';
        }

        const labaEl = document.getElementById('stat-laba');
        if (labaEl) {
          labaEl.innerText = formatRupiah(s.laba);
          labaEl.style.color = s.laba < 0 ? 'var(--primary-red)' : 'var(--primary-blue)';
        }

        const tbody = document.getElementById('table-aktivitas');
        if (tbody) {
          if (d.aktivitas.length > 0) {
            let html = '';
            d.aktivitas.forEach(function(act) {
              let badgeColor = '#6c757d';
              if (act.status === 'Menunggu Pemeriksaan') badgeColor = '#f39c12';
              if (act.status === 'Dalam Pengerjaan') badgeColor = 'var(--primary-blue)';
              if (act.status === 'Selesai' || act.status === 'Siap Diambil') badgeColor = 'var(--primary-green)';
              if (act.status === 'Dibatalkan') badgeColor = 'var(--primary-red)';
              html += '<tr style="border-bottom:1px solid #eee;">' +
                '<td style="padding:10px; font-weight:bold; color:var(--primary-blue);">' + esc(act.nomor_wo) + '</td>' +
                '<td style="padding:10px;"><span style="background:#eee; padding:3px 6px; border-radius:4px;">' + esc(act.nopol) + '</span></td>' +
                '<td style="padding:10px;"><span style="background:' + badgeColor + '; color:white; padding:3px 8px; border-radius:12px; font-size:0.75rem;">' + esc(act.status) + '</span></td>' +
                '<td style="padding:10px;">' + esc(act.mekanik) + '</td>' +
                '</tr>';
            });
            tbody.innerHTML = html;
          } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">Belum ada aktivitas.</td></tr>';
          }
        }
      } catch (e) {
        showToast('Parse error: ' + e.message, 'error');
      }
    })
    .withFailureHandler(function(error) {
      if (!document.getElementById('filterDashboard')) return;
      showToast('Koneksi error: ' + error.message, 'error');
    })
    .getDashboardData(filter);
}

// ==========================================
// 9. INVENTORI
// ==========================================
function initInventori() {
  const tbody = document.getElementById('tabelBarang');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Memuat...</td></tr>';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success && res.data.length > 0) {
        window.dataBarangGlobal = res.data;
        let html = '';
        res.data.forEach(function(brg) {
          const hargaBeli = parseRupiah(brg.harga_beli);
          const hargaJual = parseRupiah(brg.harga_jual);
          const stokInt = parseInt(brg.stok) || 0;
          const stokMin = parseInt(brg.stok_minimum) || 0;
          const warn = stokInt <= stokMin ? 'color:var(--primary-red); font-weight:bold;' : 'color:var(--primary-blue); font-weight:bold;';

          const kepemilikan = brg.jenis_kepemilikan || 'Milik Sendiri';
          const badgeKep = kepemilikan === 'Titipan'
            ? '<span class="badge badge-warning">Titipan</span>'
            : '<span class="badge badge-info">Milik Sendiri</span>';

          html += '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:10px; font-size:0.85rem;">' + esc(brg.kode) + '</td>' +
            '<td style="padding:10px; font-weight:bold;">' + esc(brg.nama) + '</td>' +
            '<td style="padding:10px;">' + esc(brg.kategori) + '</td>' +
            '<td style="padding:10px;">' + badgeKep + '</td>' +
            '<td style="padding:10px; text-align:center; ' + warn + '">' + stokInt + ' ' + esc(brg.satuan) + '</td>' +
            '<td style="padding:10px; text-align:right;">' + (hargaBeli > 0 ? formatRupiah(hargaBeli) : '<span style="color:#999;">-</span>') + '</td>' +
            '<td style="padding:10px; text-align:right; color:var(--primary-red); font-weight:bold;">' + formatRupiah(hargaJual) + '</td>' +
            '<td style="padding:10px; text-align:center;">' +
              '<button type="button" onclick="editDataBarang(\'' + brg.barang_id + '\')" style="background:none; border:none; color:var(--primary-blue); cursor:pointer; margin-right:5px;" title="Edit"><i class="fas fa-edit"></i></button>' +
              '<button type="button" onclick="hapusDataBarang(\'' + brg.barang_id + '\')" style="background:none; border:none; color:var(--primary-red); cursor:pointer;" title="Nonaktifkan"><i class="fas fa-trash"></i></button>' +
            '</td></tr>';
        });
        tbody.innerHTML = html;
      } else {
        window.dataBarangGlobal = [];
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#999;">Inventori kosong. Tambahkan barang baru di form atas.</td></tr>';
      }
    })
    .getDaftarBarang();
}

function hitungMarginBarang() {
  const beli = parseInt(document.getElementById('inv_harga_beli').value) || 0;
  const jual = parseInt(document.getElementById('inv_harga_jual').value) || 0;
  const el = document.getElementById('inv_margin');
  if (!el) return;
  if (beli === 0 || jual === 0) { el.innerText = '-'; el.style.color = '#39A935'; return; }
  const margin = jual - beli;
  const persen = ((margin / beli) * 100).toFixed(1);
  el.innerText = formatRupiah(margin) + ' (' + persen + '%)';
  el.style.color = margin < 0 ? 'var(--primary-red)' : 'var(--primary-green)';
}

function resetFormBarang() {
  const form = document.getElementById('formBarang');
  if (!form) return;
  form.reset();
  form.barang_id.value = '';
  if (form.stok_minimum) form.stok_minimum.value = 5;
  const el = document.getElementById('inv_margin');
  if (el) { el.innerText = '-'; el.style.color = '#39A935'; }
  const btn = document.getElementById('btnSubmitBarang');
  if (btn) { btn.innerHTML = '<i class="fas fa-plus"></i> Simpan Barang'; btn.className = 'btn-success'; }
}

function submitBarang(event) {
  event.preventDefault();
  const form = document.getElementById('formBarang');
  const btn = document.getElementById('btnSubmitBarang');
  const isUpdate = form.barang_id.value !== '';

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

  const formData = {
    barang_id: form.barang_id.value,
    kode: form.kode.value.trim(),
    nama: form.nama.value.trim(),
    kategori: form.kategori.value,
    satuan: form.satuan.value.trim(),
    stok: form.stok.value,
    stok_minimum: form.stok_minimum.value,
    harga_beli: form.harga_beli.value,
    harga_jual: form.harga_jual.value
  };

  if (parseInt(formData.harga_jual) < parseInt(formData.harga_beli)) {
    showToast('Harga jual tidak boleh lebih kecil dari harga beli.', 'warning');
    btn.disabled = false;
    btn.innerHTML = isUpdate ? '<i class="fas fa-save"></i> Update Barang' : '<i class="fas fa-plus"></i> Simpan Barang';
    return;
  }

  const onSuccess = function(responseStr) {
    const res = JSON.parse(responseStr);
    if (res.success) {
      showToast(res.message, 'success');
      resetFormBarang();
      initInventori();
    } else showToast('Gagal: ' + res.message, 'error');
    btn.disabled = false;
    btn.innerHTML = isUpdate ? '<i class="fas fa-save"></i> Update Barang' : '<i class="fas fa-plus"></i> Simpan Barang';
  };

  if (isUpdate) google.script.run.withSuccessHandler(onSuccess).updateBarang(formData);
  else google.script.run.withSuccessHandler(onSuccess).simpanBarangBaru(formData);
}

function editDataBarang(barangId) {
  const brg = window.dataBarangGlobal.find(function(b) { return b.barang_id === barangId; });
  if (!brg) return;
  const form = document.getElementById('formBarang');
  const btn = document.getElementById('btnSubmitBarang');

  form.barang_id.value = brg.barang_id;
  form.kode.value = brg.kode;
  form.nama.value = brg.nama;
  form.kategori.value = brg.kategori;
  form.satuan.value = brg.satuan;
  form.harga_beli.value = parseRupiah(brg.harga_beli);
  form.harga_jual.value = parseRupiah(brg.harga_jual);
  form.stok.value = parseInt(brg.stok) || 0;
  form.stok_minimum.value = parseInt(brg.stok_minimum) || 0;

  hitungMarginBarang();

  btn.innerHTML = '<i class="fas fa-save"></i> Update Barang';
  btn.className = 'btn-primary';
  document.querySelector('.view-container').scrollTo(0, 0);
}

function hapusDataBarang(barangId) {
  showConfirm('Nonaktifkan barang ini? Riwayat transaksi tetap tersimpan.', function() {
    google.script.run
      .withSuccessHandler(function(responseStr) {
        const res = JSON.parse(responseStr);
        if (res.success) { showToast(res.message, 'success'); initInventori(); }
        else showToast('Gagal: ' + res.message, 'error');
      })
      .hapusBarang(barangId);
  });
}

// ==========================================
// 10. KEUANGAN
// ==========================================
function initKeuangan() {
  const tbody = document.getElementById('tabelPengeluaran');
  if (!tbody) return;

  ['keu-pendapatan', 'keu-hpp', 'keu-laba-kotor', 'keu-pengeluaran', 'keu-laba', 'keu-utang'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  });
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Memuat...</td></tr>';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      try {
        const res = JSON.parse(responseStr);
        if (!res.success) {
          showToast('Gagal memuat keuangan: ' + res.message, 'error');
          return;
        }
        const d = res.data;

        document.getElementById('keu-pendapatan').innerText = formatRupiah(d.total_pendapatan);
        document.getElementById('keu-hpp').innerText = formatRupiah(d.total_hpp || 0);
        document.getElementById('keu-laba-kotor').innerText = formatRupiah(d.laba_kotor || 0);
        document.getElementById('keu-pengeluaran').innerText = formatRupiah(d.total_pengeluaran);
        document.getElementById('keu-utang').innerText = formatRupiah(d.total_utang_sales || 0);

        const labaEl = document.getElementById('keu-laba');
        labaEl.innerText = formatRupiah(d.laba_operasional || d.laba_bersih || 0);
        labaEl.style.color = (d.laba_operasional || d.laba_bersih || 0) < 0 ? 'var(--primary-red)' : 'var(--primary-blue)';

        if (d.pengeluaran.length > 0) {
          let html = '';
          d.pengeluaran.forEach(function(exp) {
            html += '<tr style="border-bottom:1px solid #eee;">' +
              '<td style="padding:10px;">' + esc(exp.tanggal) + '</td>' +
              '<td style="padding:10px;"><span style="background:#eee; padding:3px 8px; border-radius:4px; font-size:0.8rem;">' + esc(exp.kategori) + '</span></td>' +
              '<td style="padding:10px;">' + esc(exp.deskripsi) + '</td>' +
              '<td style="padding:10px; text-align:right; color:var(--primary-red); font-weight:bold;">' + formatRupiah(exp.jumlah) + '</td>' +
              '<td style="padding:10px; text-align:center;"><button type="button" onclick="hapusDataPengeluaran(\'' + exp.id + '\')" style="background:none; border:none; color:var(--primary-red); cursor:pointer;"><i class="fas fa-trash"></i></button></td>' +
              '</tr>';
          });
          tbody.innerHTML = html;
        } else {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Belum ada pengeluaran operasional.</td></tr>';
        }
      } catch (e) {
        showToast('Parse error: ' + e.message, 'error');
      }
    })
    .withFailureHandler(function(error) {
      showToast('Error: ' + error.message, 'error');
    })
    .getDataKeuangan();
}

function submitPengeluaran(event) {
  event.preventDefault();
  const form = document.getElementById('formPengeluaran');
  const btn = document.getElementById('btnSubmitPengeluaran');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  const formData = {
    kategori: form.kategori.value,
    deskripsi: form.deskripsi.value.trim(),
    jumlah: form.jumlah.value
  };

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success) {
        form.reset();
        showToast(res.message, 'success');
        initKeuangan();
      } else showToast('Gagal: ' + res.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-minus-circle"></i> Catat Biaya';
    })
    .simpanPengeluaran(formData);
}

function hapusDataPengeluaran(id) {
  showConfirm('Hapus catatan pengeluaran ini?', function() {
    google.script.run
      .withSuccessHandler(function(responseStr) {
        const res = JSON.parse(responseStr);
        if (res.success) { showToast(res.message, 'success'); initKeuangan(); }
        else showToast('Gagal: ' + res.message, 'error');
      })
      .hapusPengeluaran(id);
  });
}

// ==========================================
// 11. PELANGGAN
// ==========================================
function initPelanggan() {
  const tbody = document.getElementById('tabelPelanggan');
  if (!tbody) return;

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success && res.data.length > 0) {
        window.dataPelangganGlobal = res.data;
        let html = '';
        res.data.forEach(function(p) {
          html += '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:10px; font-size:0.8rem;">' + esc(p.pelanggan_id) + '</td>' +
            '<td style="padding:10px; font-weight:bold;">' + esc(p.nama) + '</td>' +
            '<td style="padding:10px;">' + esc(p.whatsapp) + '</td>' +
            '<td style="padding:10px;">' + esc(p.alamat || '-') + '</td>' +
            '<td style="padding:10px; font-size:0.85rem;">' + esc(p.tanggal_daftar) + '</td>' +
            '<td style="padding:10px; text-align:center;">' +
              '<button onclick="editPelanggan(\'' + p.pelanggan_id + '\')" style="background:none; border:none; color:var(--primary-blue); cursor:pointer; margin-right:5px;"><i class="fas fa-edit"></i></button>' +
              '<button onclick="nonaktifkanDataPelanggan(\'' + p.pelanggan_id + '\')" style="background:none; border:none; color:var(--primary-red); cursor:pointer;"><i class="fas fa-user-slash"></i></button>' +
            '</td></tr>';
        });
        tbody.innerHTML = html;
      } else {
        window.dataPelangganGlobal = [];
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">Belum ada pelanggan.</td></tr>';
      }
    })
    .getDaftarPelanggan(false);
}

function submitPelanggan(event) {
  event.preventDefault();
  const form = document.getElementById('formPelanggan');
  const btn = document.getElementById('btnSubmitPelanggan');
  const isUpdate = form.pelanggan_id.value !== '';

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  const formData = {
    pelanggan_id: form.pelanggan_id.value,
    nama: form.nama.value.trim(),
    whatsapp: form.whatsapp.value.trim(),
    alamat: form.alamat.value.trim(),
    catatan: form.catatan.value.trim()
  };

  const onSuccess = function(responseStr) {
    const res = JSON.parse(responseStr);
    if (res.success) {
      form.reset();
      form.pelanggan_id.value = '';
      btn.innerHTML = '<i class="fas fa-plus"></i> Simpan';
      btn.style.background = 'var(--primary-green)';
      showToast(res.message, 'success');
      initPelanggan();
    } else {
      showToast('Gagal: ' + res.message, 'error');
      btn.innerHTML = isUpdate ? '<i class="fas fa-save"></i> Update' : '<i class="fas fa-plus"></i> Simpan';
    }
    btn.disabled = false;
  };

  if (isUpdate) google.script.run.withSuccessHandler(onSuccess).updatePelanggan(formData);
  else google.script.run.withSuccessHandler(onSuccess).simpanPelangganBaru(formData);
}

function editPelanggan(pelangganId) {
  const p = window.dataPelangganGlobal.find(function(x) { return x.pelanggan_id === pelangganId; });
  if (!p) return;
  const form = document.getElementById('formPelanggan');
  const btn = document.getElementById('btnSubmitPelanggan');
  form.pelanggan_id.value = p.pelanggan_id;
  form.nama.value = p.nama;
  form.whatsapp.value = p.whatsapp;
  form.alamat.value = p.alamat || '';
  form.catatan.value = p.catatan || '';
  btn.innerHTML = '<i class="fas fa-save"></i> Update';
  btn.style.background = 'var(--primary-blue)';
  document.querySelector('.view-container').scrollTo(0, 0);
}

function nonaktifkanDataPelanggan(pelangganId) {
  showConfirm('Nonaktifkan pelanggan ini? Riwayat transaksi tetap tersimpan.', function() {
    google.script.run
      .withSuccessHandler(function(responseStr) {
        const res = JSON.parse(responseStr);
        if (res.success) { showToast(res.message, 'success'); initPelanggan(); }
        else showToast('Gagal: ' + res.message, 'error');
      })
      .nonaktifkanPelanggan(pelangganId);
  });
}

// ==========================================
// 12. KENDARAAN
// ==========================================
function initKendaraan() {
  const tbody = document.getElementById('tabelKendaraan');
  if (!tbody) return;

  const selectPlg = document.getElementById('k_pelanggan_id');
  if (selectPlg) {
    google.script.run
      .withSuccessHandler(function(responseStr) {
        const res = JSON.parse(responseStr);
        if (res.success) {
          let html = '<option value="">-- Pilih --</option>';
          res.data.forEach(function(p) {
            html += '<option value="' + p.pelanggan_id + '">' + esc(p.nama) + ' (' + esc(p.whatsapp) + ')</option>';
          });
          selectPlg.innerHTML = html;
        }
      })
      .getDaftarPelanggan(false);
  }

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success && res.data.length > 0) {
        window.dataKendaraanGlobal = res.data;
        let html = '';
        res.data.forEach(function(k) {
          html += '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:10px;"><span style="background:#eee; padding:4px 8px; border-radius:4px; font-weight:bold;">' + esc(k.nomor_polisi) + '</span></td>' +
            '<td style="padding:10px;">' + esc((k.merek || '') + ' ' + (k.tipe || '')) + '</td>' +
            '<td style="padding:10px;">' + esc(k.nama_pelanggan) + '</td>' +
            '<td style="padding:10px; text-align:right;">' + (parseInt(k.kilometer_terakhir) || 0) + ' KM</td>' +
            '<td style="padding:10px; text-align:center;">' +
              '<button onclick="editKendaraan(\'' + k.kendaraan_id + '\')" style="background:none; border:none; color:var(--primary-blue); cursor:pointer;"><i class="fas fa-edit"></i></button>' +
            '</td></tr>';
        });
        tbody.innerHTML = html;
      } else {
        window.dataKendaraanGlobal = [];
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Belum ada kendaraan.</td></tr>';
      }
    })
    .getDaftarKendaraan();
}

function submitKendaraan(event) {
  event.preventDefault();
  const form = document.getElementById('formKendaraan');
  const btn = document.getElementById('btnSubmitKendaraan');
  const isUpdate = form.kendaraan_id.value !== '';

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  const formData = {
    kendaraan_id: form.kendaraan_id.value,
    pelanggan_id: form.pelanggan_id.value,
    nomor_polisi: form.nomor_polisi.value.trim(),
    merek: form.merek.value.trim(),
    tipe: form.tipe.value.trim(),
    tahun: form.tahun.value.trim(),
    kilometer_terakhir: form.kilometer_terakhir.value,
    catatan: form.catatan.value.trim()
  };

  const onSuccess = function(responseStr) {
    const res = JSON.parse(responseStr);
    if (res.success) {
      form.reset();
      form.kendaraan_id.value = '';
      btn.innerHTML = '<i class="fas fa-plus"></i> Simpan';
      btn.style.background = 'var(--primary-green)';
      showToast(res.message, 'success');
      initKendaraan();
    } else {
      showToast('Gagal: ' + res.message, 'error');
      btn.innerHTML = isUpdate ? '<i class="fas fa-save"></i> Update' : '<i class="fas fa-plus"></i> Simpan';
    }
    btn.disabled = false;
  };

  if (isUpdate) google.script.run.withSuccessHandler(onSuccess).updateKendaraan(formData);
  else google.script.run.withSuccessHandler(onSuccess).simpanKendaraanBaru(formData);
}

function editKendaraan(kendaraanId) {
  const k = window.dataKendaraanGlobal.find(function(x) { return x.kendaraan_id === kendaraanId; });
  if (!k) return;
  const form = document.getElementById('formKendaraan');
  const btn = document.getElementById('btnSubmitKendaraan');
  form.kendaraan_id.value = k.kendaraan_id;
  form.pelanggan_id.value = k.pelanggan_id;
  form.nomor_polisi.value = k.nomor_polisi;
  form.merek.value = k.merek || '';
  form.tipe.value = k.tipe || '';
  form.tahun.value = k.tahun || '';
  form.kilometer_terakhir.value = k.kilometer_terakhir || 0;
  form.catatan.value = k.catatan || '';
  btn.innerHTML = '<i class="fas fa-save"></i> Update';
  btn.style.background = 'var(--primary-blue)';
  document.querySelector('.view-container').scrollTo(0, 0);
}

// ==========================================
// 13. SALES
// ==========================================
function initSales() {
  const tbody = document.getElementById('tabelSales');
  if (!tbody) return;

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success && res.data.length > 0) {
        window.dataSalesGlobal = res.data;
        let html = '';
        res.data.forEach(function(s) {
          html += '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:10px; font-size:0.8rem;">' + esc(s.sales_id) + '</td>' +
            '<td style="padding:10px; font-weight:bold;">' + esc(s.nama) + '</td>' +
            '<td style="padding:10px;">' + esc(s.kontak || '-') + '</td>' +
            '<td style="padding:10px;">' + esc(s.alamat || '-') + '</td>' +
            '<td style="padding:10px;"><span class="badge badge-success">' + esc(s.status) + '</span></td>' +
            '<td style="padding:10px; text-align:center;">' +
              '<button onclick="editSales(\'' + s.sales_id + '\')" style="background:none; border:none; color:var(--primary-blue); cursor:pointer; margin-right:5px;"><i class="fas fa-edit"></i></button>' +
              '<button onclick="nonaktifkanDataSales(\'' + s.sales_id + '\')" style="background:none; border:none; color:var(--primary-red); cursor:pointer;"><i class="fas fa-user-slash"></i></button>' +
            '</td></tr>';
        });
        tbody.innerHTML = html;
      } else {
        window.dataSalesGlobal = [];
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">Belum ada sales.</td></tr>';
      }
    })
    .getDaftarSales(false);
}

function submitSales(event) {
  event.preventDefault();
  const form = document.getElementById('formSales');
  const btn = document.getElementById('btnSubmitSales');
  const isUpdate = form.sales_id.value !== '';

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  const formData = {
    sales_id: form.sales_id.value,
    nama: form.nama.value.trim(),
    kontak: form.kontak.value.trim(),
    alamat: form.alamat.value.trim(),
    catatan: form.catatan.value.trim()
  };

  const onSuccess = function(responseStr) {
    const res = JSON.parse(responseStr);
    if (res.success) {
      form.reset();
      form.sales_id.value = '';
      btn.innerHTML = '<i class="fas fa-plus"></i> Simpan';
      showToast(res.message, 'success');
      initSales();
    } else {
      showToast('Gagal: ' + res.message, 'error');
      btn.innerHTML = isUpdate ? '<i class="fas fa-save"></i> Update' : '<i class="fas fa-plus"></i> Simpan';
    }
    btn.disabled = false;
  };

  if (isUpdate) google.script.run.withSuccessHandler(onSuccess).updateSales(formData);
  else google.script.run.withSuccessHandler(onSuccess).simpanSales(formData);
}

function editSales(salesId) {
  const s = window.dataSalesGlobal.find(function(x) { return x.sales_id === salesId; });
  if (!s) return;
  const form = document.getElementById('formSales');
  const btn = document.getElementById('btnSubmitSales');
  form.sales_id.value = s.sales_id;
  form.nama.value = s.nama;
  form.kontak.value = s.kontak || '';
  form.alamat.value = s.alamat || '';
  form.catatan.value = s.catatan || '';
  btn.innerHTML = '<i class="fas fa-save"></i> Update';
  document.querySelector('.view-container').scrollTo(0, 0);
}

function nonaktifkanDataSales(salesId) {
  showConfirm('Nonaktifkan sales ini?', function() {
    google.script.run
      .withSuccessHandler(function(responseStr) {
        const res = JSON.parse(responseStr);
        if (res.success) { showToast(res.message, 'success'); initSales(); }
        else showToast('Gagal: ' + res.message, 'error');
      })
      .nonaktifkanSales(salesId);
  });
}

// ==========================================
// 14. PEMBELIAN
// ==========================================
function initPembelian() {
  loadRiwayatPembelian();
  loadBarangDanSalesUntukPembelian();
}

function loadRiwayatPembelian() {
  const tbody = document.getElementById('tabelPembelian');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Memuat...</td></tr>';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success && res.data.length > 0) {
        let html = '';
        res.data.forEach(function(p) {
          const badgeClass = p.tipe === 'Titipan' ? 'badge-warning' : 'badge-info';
          html += '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:10px; font-weight:bold; color:var(--primary-blue);">' + esc(p.nomor) + '</td>' +
            '<td style="padding:10px;">' + esc(p.tanggal) + '</td>' +
            '<td style="padding:10px;"><span class="badge ' + badgeClass + '">' + esc(p.tipe) + '</span></td>' +
            '<td style="padding:10px;">' + esc(p.sales_nama) + '</td>' +
            '<td style="padding:10px; text-align:right; font-weight:bold;">' + formatRupiah(p.total) + '</td>' +
            '<td style="padding:10px; text-align:center;">' +
              '<button onclick="lihatDetailPembelian(\'' + p.pembelian_id + '\')" style="background:none; border:none; color:var(--primary-blue); cursor:pointer;"><i class="fas fa-eye"></i></button>' +
            '</td></tr>';
        });
        tbody.innerHTML = html;
      } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">Belum ada pembelian.</td></tr>';
      }
    })
    .getDaftarPembelian();
}

function loadBarangDanSalesUntukPembelian() {
  google.script.run
    .withSuccessHandler(function(resBarangStr) {
      const r1 = JSON.parse(resBarangStr);
      if (r1.success) window.dataBarangPembelian = r1.data;
      google.script.run
        .withSuccessHandler(function(resSalesStr) {
          const r2 = JSON.parse(resSalesStr);
          if (r2.success) {
            window.dataSalesPembelian = r2.data;
            const sel = document.getElementById('p_sales_id');
            if (sel) {
              let html = '<option value="">-- Pilih Sales --</option>';
              r2.data.forEach(function(s) {
                html += '<option value="' + s.sales_id + '">' + esc(s.nama) + '</option>';
              });
              sel.innerHTML = html;
            }
          }
        })
        .getDaftarSales(false);
    })
    .getDaftarBarang();
}

function bukaFormPembelian() {
  document.getElementById('panelFormPembelian').style.display = 'block';
  document.getElementById('p_item_list').innerHTML = '';
  barisItemCounter = 0;
  tambahBarisItem();
  document.querySelector('.view-container').scrollTo(0, 0);
}

function tutupFormPembelian() {
  document.getElementById('panelFormPembelian').style.display = 'none';
  document.getElementById('formPembelian').reset();
  document.getElementById('p_item_list').innerHTML = '';
}

function onTipePembelianChange() {
  const tipe = document.getElementById('p_tipe').value;
  document.getElementById('p_sales_wrap').style.display = tipe === 'Titipan' ? 'block' : 'none';
  document.getElementById('p_pemasok_wrap').style.display = tipe === 'Modal Sendiri' ? 'block' : 'none';
}

function tambahBarisItem() {
  const container = document.getElementById('p_item_list');
  const idx = barisItemCounter++;

  let optionsBarang = '<option value="">-- Pilih Barang --</option>';
  window.dataBarangPembelian.forEach(function(b) {
    optionsBarang += '<option value="' + b.barang_id + '">' + esc(b.kode) + ' - ' + esc(b.nama) + '</option>';
  });

  const rowId = 'prow_' + idx;
  const html = '<div id="' + rowId + '" style="display:grid; grid-template-columns:2fr 80px 140px 40px; gap:8px; margin-bottom:8px; align-items:end;">' +
    '<div><label style="font-size:0.75rem;">Barang</label>' +
      '<select class="p_item_barang" required onchange="hitungTotalPembelian()" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">' + optionsBarang + '</select></div>' +
    '<div><label style="font-size:0.75rem;">Qty</label>' +
      '<input type="number" class="p_item_qty" required min="1" value="1" onchange="hitungTotalPembelian()" oninput="hitungTotalPembelian()" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>' +
    '<div><label style="font-size:0.75rem;">Harga Beli</label>' +
      '<input type="number" class="p_item_harga" required min="0" placeholder="0" onchange="hitungTotalPembelian()" oninput="hitungTotalPembelian()" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;"></div>' +
    '<div><button type="button" onclick="hapusBarisItem(\'' + rowId + '\')" style="background:var(--primary-red); color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;"><i class="fas fa-trash"></i></button></div>' +
  '</div>';

  container.insertAdjacentHTML('beforeend', html);
  hitungTotalPembelian();
}

function hapusBarisItem(rowId) {
  const el = document.getElementById(rowId);
  if (el) el.remove();
  hitungTotalPembelian();
}

function hitungTotalPembelian() {
  let total = 0;
  document.querySelectorAll('#p_item_list > div').forEach(function(row) {
    const qty = parseInt(row.querySelector('.p_item_qty').value) || 0;
    const harga = parseInt(row.querySelector('.p_item_harga').value) || 0;
    total += qty * harga;
  });
  const el = document.getElementById('p_total');
  if (el) el.innerText = formatRupiah(total);
}

function submitPembelian(event) {
  event.preventDefault();
  const tipe = document.getElementById('p_tipe').value;
  if (!tipe) { showToast('Pilih tipe pembelian.', 'warning'); return; }

  const items = [];
  let valid = true;
  document.querySelectorAll('#p_item_list > div').forEach(function(row) {
    const barangId = row.querySelector('.p_item_barang').value;
    const qty = parseInt(row.querySelector('.p_item_qty').value) || 0;
    const harga = parseInt(row.querySelector('.p_item_harga').value) || 0;
    if (!barangId || qty <= 0) { valid = false; return; }
    items.push({ barang_id: barangId, qty: qty, harga_beli: harga });
  });

  if (!valid || items.length === 0) {
    showToast('Isi minimal 1 item dengan benar.', 'warning');
    return;
  }

  const formData = {
    tipe: tipe,
    sales_id: document.getElementById('p_sales_id') ? document.getElementById('p_sales_id').value : '',
    pemasok: document.getElementById('p_pemasok') ? document.getElementById('p_pemasok').value.trim() : '',
    catatan: document.querySelector('#formPembelian input[name="catatan"]').value.trim(),
    items: items
  };

  const btn = document.getElementById('btnSubmitPembelian');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success) {
        showToast(res.message, 'success');
        tutupFormPembelian();
        loadRiwayatPembelian();
        loadBarangDanSalesUntukPembelian();
      } else showToast('Gagal: ' + res.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan Pembelian';
    })
    .withFailureHandler(function(error) {
      showToast('Error: ' + error.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan Pembelian';
    })
    .simpanPembelian(formData);
}

function lihatDetailPembelian(pembelianId) {
  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (!res.success) { showToast(res.message, 'error'); return; }
      const p = res.data;
      let itemHtml = '';
      p.items.forEach(function(it) {
        itemHtml += '<tr><td>' + esc(it.kode) + ' - ' + esc(it.nama) + '</td>' +
          '<td style="text-align:center;">' + it.qty + '</td>' +
          '<td style="text-align:right;">' + formatRupiah(it.harga_beli) + '</td>' +
          '<td style="text-align:right;">' + formatRupiah(it.subtotal) + '</td></tr>';
      });
      const html = '<div style="padding:10px;">' +
        '<p><strong>No. PO:</strong> ' + esc(p.nomor) + '</p>' +
        '<p><strong>Tanggal:</strong> ' + esc(p.tanggal) + '</p>' +
        '<p><strong>Tipe:</strong> ' + esc(p.tipe) + '</p>' +
        '<p><strong>Pemasok/Sales:</strong> ' + esc(p.pemasok || '-') + '</p>' +
        '<table style="width:100%; margin-top:15px; border-collapse:collapse;">' +
          '<thead><tr style="background:#f3f5f7;"><th style="padding:8px; text-align:left;">Barang</th><th style="padding:8px; text-align:center;">Qty</th><th style="padding:8px; text-align:right;">Harga</th><th style="padding:8px; text-align:right;">Subtotal</th></tr></thead>' +
          '<tbody>' + itemHtml + '</tbody>' +
          '<tfoot><tr><th colspan="3" style="padding:8px; text-align:right;">Total</th><th style="padding:8px; text-align:right;">' + formatRupiah(p.total) + '</th></tr></tfoot>' +
        '</table></div>';
      showModalCustom('Detail Pembelian ' + p.nomor, html);
    })
    .getDetailPembelian(pembelianId);
}

// ==========================================
// 15. UTANG SALES
// ==========================================
function initUtangSales() {
  const tbody = document.getElementById('tabelUtangSales');
  if (!tbody) return;
  document.getElementById('panelDetailUtang').style.display = 'none';
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Memuat...</td></tr>';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success && res.data.length > 0) {
        let html = '';
        res.data.forEach(function(u) {
          const saldoColor = u.saldo_utang > 0 ? 'var(--primary-red)' : 'var(--primary-green)';
          const saldoText = u.saldo_utang > 0 ? formatRupiah(u.saldo_utang) : 'Lunas';
          html += '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:10px; font-weight:bold;">' + esc(u.nama) + '</td>' +
            '<td style="padding:10px;">' + esc(u.kontak || '-') + '</td>' +
            '<td style="padding:10px; text-align:right; color:' + saldoColor + '; font-weight:bold;">' + saldoText + '</td>' +
            '<td style="padding:10px; text-align:center;">' +
              '<button onclick="bukaDetailUtang(\'' + u.sales_id + '\', \'' + esc(u.nama).replace(/'/g, "\\'") + '\', ' + u.saldo_utang + ')" class="btn-primary" style="padding:5px 12px; font-size:0.8rem;">' +
                '<i class="fas fa-eye"></i> Detail' +
              '</button>' +
            '</td></tr>';
        });
        tbody.innerHTML = html;
      } else {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">Belum ada data sales.</td></tr>';
      }
    })
    .getDaftarUtangSales();
}

function bukaDetailUtang(salesId, nama, saldo) {
  document.getElementById('panelDetailUtang').style.display = 'block';
  document.getElementById('u_nama_sales').innerText = nama;
  document.getElementById('u_sales_id').value = salesId;
  document.getElementById('u_saldo').value = saldo;
  document.getElementById('u_jumlah').value = saldo > 0 ? saldo : '';
  document.getElementById('u_jumlah').max = saldo;

  const tbody = document.getElementById('tabelRiwayatUtang');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px;"><i class="fas fa-spinner fa-spin"></i> Memuat...</td></tr>';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success && res.data.length > 0) {
        let html = '';
        res.data.forEach(function(r) {
          const badge = r.jenis === 'TITIPAN_MASUK' ? 'badge-warning' : 'badge-success';
          const label = r.jenis === 'TITIPAN_MASUK' ? 'Titipan Masuk' : 'Pembayaran';
          html += '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:8px;">' + esc(r.tanggal) + '</td>' +
            '<td style="padding:8px;"><span class="badge ' + badge + '">' + label + '</span></td>' +
            '<td style="padding:8px;">' + esc(r.keterangan || '-') + '</td>' +
            '<td style="padding:8px; text-align:right;">' + formatRupiah(r.jumlah) + '</td>' +
            '<td style="padding:8px; text-align:right; font-weight:bold;">' + formatRupiah(r.saldo) + '</td>' +
            '</tr>';
        });
        tbody.innerHTML = html;
      } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#999;">Belum ada riwayat.</td></tr>';
      }
    })
    .getRiwayatUtangSales(salesId);

  document.querySelector('.view-container').scrollTo({ top: 300, behavior: 'smooth' });
}

function tutupDetailUtang() {
  document.getElementById('panelDetailUtang').style.display = 'none';
}

function submitBayarUtang(event) {
  event.preventDefault();
  const salesId = document.getElementById('u_sales_id').value;
  const saldo = parseInt(document.getElementById('u_saldo').value) || 0;
  const jumlah = parseInt(document.getElementById('u_jumlah').value) || 0;

  if (jumlah <= 0) { showToast('Jumlah harus > 0.', 'warning'); return; }
  if (jumlah > saldo) {
    showToast('Jumlah melebihi saldo utang (' + formatRupiah(saldo) + ').', 'warning');
    return;
  }

  const btn = document.getElementById('btnBayarUtang');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  const form = document.getElementById('formBayarUtang');
  const formData = {
    sales_id: salesId,
    jumlah: jumlah,
    metode: form.metode.value,
    referensi: form.referensi.value.trim()
  };

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success) {
        showToast(res.message, 'success');
        form.reset();
        document.getElementById('u_sales_id').value = salesId;
        initUtangSales();
      } else showToast('Gagal: ' + res.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Bayar';
    })
    .withFailureHandler(function(error) {
      showToast('Error: ' + error.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Bayar';
    })
    .bayarUtangSales(formData);
}

// ==========================================
// 17. MODUL MEKANIK / PELAKSANA
// ==========================================
function onTipePelaksanaChange() {
  const tipe = document.getElementById('m_tipe').value;
  const row = document.getElementById('m_kelas_nis_row');
  const kelasInput = document.getElementById('m_kelas');
  const nisInput = document.getElementById('m_nis');

  if (tipe === 'siswa') {
    row.style.display = 'grid';
    kelasInput.required = true;
    nisInput.required = true;
  } else {
    row.style.display = 'grid';
    kelasInput.required = false;
    nisInput.required = false;
  }
}

function initMekanik() {
  const tbody = document.getElementById('tabelMekanik');
  const tbodyRekap = document.getElementById('tabelRekapKinerja');
  if (!tbody) return;

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success && res.data.length > 0) {
        const dataTanpaUtama = res.data.filter(function(m) {
          return m.tipe_personel !== 'mekanik_utama';
        });
        window.dataMekanikGlobal = dataTanpaUtama;

        if (dataTanpaUtama.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#999;">Belum ada siswa/pelaksana terdaftar.</td></tr>';
          return;
        }

        let html = '';
        dataTanpaUtama.forEach(function(m) {
          let badge = 'badge-success';
          let labelTipe = '<i class="fas fa-user-graduate"></i> Siswa';
          if (m.tipe_personel === 'servis_kunjung') {
            badge = 'badge-warning';
            labelTipe = '<i class="fas fa-users"></i> Servis Kunjung';
          }

          html += '<tr style="border-bottom:1px solid #eee;">' +
            '<td style="padding:10px; font-weight:bold;">' + esc(m.nama) + '</td>' +
            '<td style="padding:10px;"><span class="badge ' + badge + '">' + labelTipe + '</span></td>' +
            '<td style="padding:10px;">' + esc(m.kelas || '-') + '</td>' +
            '<td style="padding:10px;">' + esc(m.nis || '-') + '</td>' +
            '<td style="padding:10px;">' + esc(m.kompetensi || '-') + '</td>' +
            '<td style="padding:10px;">' + formatWhatsApp(m.whatsapp) + '</td>' +
            '<td style="padding:10px; text-align:center;">' +
              '<span class="badge ' + (m.status === 'Aktif' ? 'badge-success' : 'badge-muted') + '">' + esc(m.status) + '</span>' +
            '</td>' +
            '<td style="padding:10px; text-align:center; white-space:nowrap;">' +
              '<button onclick="editMekanik(\'' + m.mekanik_id + '\')" style="background:none; border:none; color:var(--primary-blue); cursor:pointer; margin-right:5px;" title="Edit"><i class="fas fa-edit"></i></button>' +
              '<button onclick="nonaktifkanDataMekanik(\'' + m.mekanik_id + '\')" style="background:none; border:none; color:var(--primary-red); cursor:pointer;" title="Nonaktifkan"><i class="fas fa-user-slash"></i></button>' +
            '</td></tr>';
        });
        tbody.innerHTML = html;
      } else {
        window.dataMekanikGlobal = [];
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:#999;">Belum ada siswa/pelaksana terdaftar.</td></tr>';
      }
    })
    .getDaftarPelaksana(true);

  if (tbodyRekap) {
    google.script.run
      .withSuccessHandler(function(responseStr) {
        const res = JSON.parse(responseStr);
        if (res.success && res.data.length > 0) {
          let html = '';
          res.data.forEach(function(r) {
            let labelTipe = r.tipe_personel === 'mekanik_utama' ? '<i class="fas fa-user-tie"></i> Utama' :
                            r.tipe_personel === 'siswa' ? '<i class="fas fa-user-graduate"></i> Siswa' :
                            '<i class="fas fa-users"></i> Kunjung';
            html += '<tr style="border-bottom:1px solid #eee;">' +
              '<td style="padding:10px; font-weight:bold;">' + esc(r.nama) + '</td>' +
              '<td style="padding:10px;">' + labelTipe + '</td>' +
              '<td style="padding:10px;">' + esc(r.kelas || '-') + '</td>' +
              '<td style="padding:10px; text-align:center;">' + r.jumlah_wo + '</td>' +
              '<td style="padding:10px; text-align:center;">' + r.total_jam + ' jam</td>' +
              '<td style="padding:10px; text-align:center; color:var(--primary-green); font-weight:bold;">' + r.tervalidasi + '</td>' +
              '<td style="padding:10px; text-align:center; color:' + (r.perlu_perbaikan > 0 ? 'var(--primary-red)' : '#999') + '; font-weight:bold;">' + r.perlu_perbaikan + '</td>' +
              '</tr>';
          });
          tbodyRekap.innerHTML = html;
        } else {
          tbodyRekap.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#999;">Belum ada data kinerja.</td></tr>';
        }
      })
      .getRekapKinerjaPelaksana();
  }
}

function submitMekanik(event) {
  event.preventDefault();
  const form = document.getElementById('formMekanik');
  const btn = document.getElementById('btnSubmitMekanik');
  const isUpdate = form.mekanik_id.value !== '';

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  const formData = {
    mekanik_id: form.mekanik_id.value,
    nama: form.nama.value.trim(),
    tipe_personel: form.tipe_personel.value,
    kompetensi: form.kompetensi.value.trim(),
    whatsapp: form.whatsapp.value.trim(),
    kelas: form.kelas.value.trim(),
    nis: form.nis.value.trim()
  };

  const onSuccess = function(responseStr) {
    const res = JSON.parse(responseStr);
    if (res.success) {
      form.reset();
      form.mekanik_id.value = '';
      btn.innerHTML = '<i class="fas fa-plus"></i> Simpan';
      showToast(res.message, 'success');
      initMekanik();
    } else {
      showToast('Gagal: ' + res.message, 'error');
      btn.innerHTML = isUpdate ? '<i class="fas fa-save"></i> Update' : '<i class="fas fa-plus"></i> Simpan';
    }
    btn.disabled = false;
  };

  if (isUpdate) google.script.run.withSuccessHandler(onSuccess).updatePelaksana(formData);
  else google.script.run.withSuccessHandler(onSuccess).simpanPelaksana(formData);
}

function editMekanik(mekanikId) {
  const m = window.dataMekanikGlobal.find(function(x) { return x.mekanik_id === mekanikId; });
  if (!m) return;
  const form = document.getElementById('formMekanik');
  const btn = document.getElementById('btnSubmitMekanik');
  form.mekanik_id.value = m.mekanik_id;
  form.nama.value = m.nama;
  form.tipe_personel.value = m.tipe_personel;
  form.kompetensi.value = m.kompetensi || '';
  form.whatsapp.value = m.whatsapp || '';
  form.kelas.value = m.kelas === '-' ? '' : (m.kelas || '');
  form.nis.value = m.nis === '-' ? '' : (m.nis || '');

  onTipePelaksanaChange();

  btn.innerHTML = '<i class="fas fa-save"></i> Update';
  document.querySelector('.view-container').scrollTo(0, 0);
}

function nonaktifkanDataMekanik(mekanikId) {
  showConfirm('Nonaktifkan pelaksana ini?', function() {
    google.script.run
      .withSuccessHandler(function(responseStr) {
        const res = JSON.parse(responseStr);
        if (res.success) { showToast(res.message, 'success'); initMekanik(); }
        else showToast('Gagal: ' + res.message, 'error');
      })
      .nonaktifkanPelaksana(mekanikId);
  });
}

// ==========================================
// 18. MODUL PENGERJAAN
// ==========================================
function initPengerjaan() {
  const woId = window.currentWoId;
  if (!woId) {
    showToast('Pilih WO dulu dari Daftar Work Order.', 'warning');
    loadView('DaftarWO');
    return;
  }

  const nowoEl = document.getElementById('pg_nowo');
  if (nowoEl) nowoEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (!res.success) { showToast(res.message, 'error'); return; }
      window.dataPengerjaanGlobal = res.data;
      renderPengerjaan(res.data);
    })
    .withFailureHandler(function(error) {
      showToast('Error: ' + error.message, 'error');
    })
    .getDataPengerjaan(woId);
}

function renderPengerjaan(data) {
  const w = data.wo;
  document.getElementById('pg_nowo').innerText = w.nomor_wo;
  document.getElementById('pg_pelanggan').innerText = w.nama_pelanggan || '-';
  document.getElementById('pg_nopol').innerText = w.nopol || '-';
  document.getElementById('pg_km').innerText = (w.km || 0) + ' KM';
  document.getElementById('pg_estimasi').innerText = formatRupiah(data.estimasi);
  document.getElementById('pg_keluhan').innerText = w.keluhan || '-';
  document.getElementById('pg_diagnosis').value = data.diagnosis || '';
  document.getElementById('pg_estimasi_input').value = data.estimasi || '';

  const statusEl = document.getElementById('pg_status');
  statusEl.innerText = w.status;
  statusEl.style.background =
    (w.status === 'Selesai' || w.status === 'Siap Diambil') ? 'var(--primary-green)' :
    (w.status === 'Dalam Pengerjaan' || w.status === 'Pemeriksaan Akhir') ? 'var(--primary-blue)' :
    (w.status === 'Dibatalkan') ? 'var(--primary-red)' : '#f39c12';

  const setujuEl = document.getElementById('pg_status_setuju');
  setujuEl.innerText = data.persetujuan || 'Belum';
  setujuEl.className = 'badge ' +
    (data.persetujuan === 'Disetujui' ? 'badge-success' :
     data.persetujuan === 'Ditolak' ? 'badge-danger' : 'badge-muted');

  renderPenugasan(data.penugasan);
  renderChecklist(data.checklist);
  isiDropdownPelaksana();
}

function isiDropdownPelaksana() {
  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (!res.success) return;

      const pelaksana = res.data.filter(function(m) {
        return m.status === 'Aktif' && m.tipe_personel !== 'mekanik_utama';
      });
      window.dataPelaksanaPengerjaan = pelaksana;

      const selPelaksana = document.getElementById('pg_pelaksana_id');
      if (!selPelaksana) return;

      let html = '<option value="">-- Pilih Pelaksana --</option>';
      if (pelaksana.length === 0) {
        html += '<option value="" disabled>Belum ada siswa/servis kunjung terdaftar</option>';
      } else {
        pelaksana.forEach(function(m) {
          let label = m.nama;
          if (m.tipe_personel === 'siswa') {
            label += ' (Siswa' + (m.kelas && m.kelas !== '-' ? ' - ' + m.kelas : '') + ')';
          } else if (m.tipe_personel === 'servis_kunjung') {
            label += ' (Servis Kunjung)';
          }
          html += '<option value="' + m.mekanik_id + '">' + esc(label) + '</option>';
        });
      }
      selPelaksana.innerHTML = html;
    })
    .getDaftarPelaksana(false);
}

function renderPenugasan(list) {
  const tbody = document.getElementById('pg_tabel_penugasan');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:15px; color:#999;">Belum ada pelaksana.</td></tr>';
    return;
  }

  let html = '';
  list.forEach(function(p) {
    let labelTipe = '<i class="fas fa-user-tie"></i> Mekanik Utama';
    if (p.mekanik_tipe === 'siswa') labelTipe = '<i class="fas fa-user-graduate"></i> Siswa';
    else if (p.mekanik_tipe === 'servis_kunjung') labelTipe = '<i class="fas fa-users"></i> Servis Kunjung';

    let badgeValidasi = 'badge-muted';
    if (p.validasi === 'Tervalidasi') badgeValidasi = 'badge-success';
    else if (p.validasi === 'Perlu Perbaikan') badgeValidasi = 'badge-danger';
    else if (p.validasi === 'Menunggu Validasi') badgeValidasi = 'badge-warning';

    html += '<tr style="border-bottom:1px solid #eee;">' +
      '<td style="padding:10px; font-weight:bold;">' + esc(p.mekanik_nama) + '</td>' +
      '<td style="padding:10px;">' + labelTipe + '</td>' +
      '<td style="padding:10px;">' + esc(p.mekanik_kelas || '-') + '</td>' +
      '<td style="padding:10px;">' + esc(p.peran) + '</td>' +
      '<td style="padding:10px;">' + esc(p.pembimbing_nama || 'Sulistyo Utomo') + '</td>' +
      '<td style="padding:10px; text-align:center;"><span class="badge ' + badgeValidasi + '">' + esc(p.validasi) + '</span></td>' +
      '<td style="padding:10px; text-align:center; white-space:nowrap;">' +
        (p.validasi === 'Menunggu Validasi' || p.validasi === 'Perlu Perbaikan' ?
          '<button onclick="validasiPenugasanUI(\'' + p.penugasan_id + '\', \'Tervalidasi\')" style="background:none; border:none; color:var(--primary-green); cursor:pointer; margin-right:3px;" title="Validasi"><i class="fas fa-check-circle"></i></button>' +
          '<button onclick="validasiPenugasanUI(\'' + p.penugasan_id + '\', \'Perlu Perbaikan\')" style="background:none; border:none; color:#f39c12; cursor:pointer; margin-right:3px;" title="Perlu Perbaikan"><i class="fas fa-redo"></i></button>'
          : '') +
        '<button onclick="hapusPenugasanUI(\'' + p.penugasan_id + '\')" style="background:none; border:none; color:var(--primary-red); cursor:pointer;" title="Hapus"><i class="fas fa-trash"></i></button>' +
      '</td></tr>';
  });
  tbody.innerHTML = html;
}

function bukaFormPenugasan() {
  const form = document.getElementById('pg_form_penugasan');
  if (form) form.style.display = 'block';
  const sel = document.getElementById('pg_pelaksana_id');
  if (sel) sel.focus();
}

function simpanPenugasan() {
  const pelaksanaId = document.getElementById('pg_pelaksana_id').value;
  const peran = document.getElementById('pg_peran').value;

  if (!pelaksanaId) {
    showToast('Pilih pelaksana dulu.', 'warning');
    return;
  }

  const formData = {
    wo_id: window.currentWoId,
    mekanik_id: pelaksanaId,
    peran: peran,
    pembimbing_id: 'MKN-UTAMA-SULISTYO'
  };

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success) {
        showToast(res.message, 'success');
        document.getElementById('pg_form_penugasan').style.display = 'none';
        document.getElementById('pg_pelaksana_id').value = '';
        initPengerjaan();
      } else {
        showToast('Gagal: ' + res.message, 'error');
      }
    })
    .withFailureHandler(function(error) {
      showToast('Error: ' + error.message, 'error');
    })
    .tambahPenugasan(formData);
}

function hapusPenugasanUI(penugasanId) {
  showConfirm('Hapus penugasan ini?', function() {
    google.script.run
      .withSuccessHandler(function(responseStr) {
        const res = JSON.parse(responseStr);
        if (res.success) { showToast(res.message, 'success'); initPengerjaan(); }
        else showToast('Gagal: ' + res.message, 'error');
      })
      .hapusPenugasan(penugasanId);
  });
}

function validasiPenugasanUI(penugasanId, nilai) {
  let catatan = '';
  if (nilai === 'Perlu Perbaikan') {
    catatan = prompt('Catatan perbaikan (opsional):') || '';
  }
  const formData = { penugasan_id: penugasanId, validasi: nilai, catatan: catatan };

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success) { showToast(res.message, 'success'); initPengerjaan(); }
      else showToast('Gagal: ' + res.message, 'error');
    })
    .validasiPenugasan(formData);
}

function simpanDiagnosis() {
  const formData = {
    wo_id: window.currentWoId,
    diagnosis: document.getElementById('pg_diagnosis').value.trim(),
    estimasi_biaya: document.getElementById('pg_estimasi_input').value
  };
  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (res.success) { showToast(res.message, 'success'); initPengerjaan(); }
      else showToast('Gagal: ' + res.message, 'error');
    })
    .updateDiagnosisWO(formData);
}

function catatPersetujuan(nilai) {
  showConfirm('Catat persetujuan: ' + nilai + '?', function() {
    google.script.run
      .withSuccessHandler(function(responseStr) {
        const res = JSON.parse(responseStr);
        if (res.success) { showToast(res.message, 'success'); initPengerjaan(); }
        else showToast('Gagal: ' + res.message, 'error');
      })
      .catatPersetujuanPelanggan({ wo_id: window.currentWoId, persetujuan: nilai });
  });
}

function renderChecklist(list) {
  const container = document.getElementById('pg_checklist');
  if (!container) return;
  let html = '';
  list.forEach(function(item) {
    html += '<label style="display:flex; align-items:center; gap:8px; padding:8px; background:#f9f9f9; border-radius:4px; cursor:pointer;">' +
      '<input type="checkbox" data-key="' + item.key + '" class="pg_check"> ' +
      '<span style="font-size:0.85rem;">' + esc(item.label) + '</span>' +
      '</label>';
  });
  container.innerHTML = html;
}

function simpanChecklist() {
  const checks = document.querySelectorAll('.pg_check');
  let tercentang = 0;
  checks.forEach(function(c) { if (c.checked) tercentang++; });
  showToast('Checklist tersimpan (' + tercentang + '/' + checks.length + ' item).', 'info');
}

// ==========================================
// 19. MODUL LAPORAN
// ==========================================
function initLaporan() {
  setPeriodeLaporan('bulan_ini');
}

function setPeriodeLaporan(mode) {
  const now = new Date();
  let dari, sampai;

  if (mode === 'hari_ini') {
    dari = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    sampai = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (mode === 'minggu_ini') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    dari = new Date(now.getFullYear(), now.getMonth(), diff);
    sampai = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (mode === 'bulan_ini') {
    dari = new Date(now.getFullYear(), now.getMonth(), 1);
    sampai = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (mode === 'bulan_lalu') {
    dari = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    sampai = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (mode === 'tahun_ini') {
    dari = new Date(now.getFullYear(), 0, 1);
    sampai = new Date(now.getFullYear(), 11, 31);
  }

  const fmt = function(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  };

  const elDari = document.getElementById('lap_dari');
  const elSampai = document.getElementById('lap_sampai');
  if (elDari) elDari.value = fmt(dari);
  if (elSampai) elSampai.value = fmt(sampai);
}

function tampilkanLaporan() {
  const jenis = document.getElementById('lap_jenis').value;
  const dari = document.getElementById('lap_dari').value;
  const sampai = document.getElementById('lap_sampai').value;

  if (!jenis) { showToast('Pilih jenis laporan dulu.', 'warning'); return; }
  if (!dari || !sampai) { showToast('Isi periode dulu.', 'warning'); return; }
  if (new Date(dari) > new Date(sampai)) {
    showToast('Tanggal "Dari" tidak boleh lebih besar dari "Sampai".', 'warning');
    return;
  }

  const elHasil = document.getElementById('lap_hasil');
  elHasil.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">' +
    '<i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:15px;">Memuat laporan...</p></div>';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      try {
        const res = JSON.parse(responseStr);
        if (!res.success) {
          elHasil.innerHTML = '<div style="text-align:center; padding:40px; color:var(--primary-red);">' +
            '<i class="fas fa-exclamation-triangle fa-2x"></i>' +
            '<p style="margin-top:10px;">' + esc(res.message) + '</p></div>';
          return;
        }
        window.dataLaporanGlobal = res.data;
        renderLaporan(jenis, res.data, dari, sampai);
        const ab = document.getElementById('lap_action_bar');
        if (ab) ab.style.display = 'flex';
        const gc = document.getElementById('lap_grafik_container');
        if (gc) gc.style.display = 'none';
        const gt = document.getElementById('lap_toggle_text');
        if (gt) gt.innerText = 'Tampilkan Grafik';
      } catch (e) {
        elHasil.innerHTML = '<div style="text-align:center; padding:40px; color:var(--primary-red);">' +
          'Error parse: ' + esc(e.message) + '</div>';
      }
    })
    .withFailureHandler(function(error) {
      elHasil.innerHTML = '<div style="text-align:center; padding:40px; color:var(--primary-red);">' +
        'Error koneksi: ' + esc(error.message) + '</div>';
    })
    .getLaporan(jenis, { dari: dari, sampai: sampai });
}

function renderLaporan(jenis, data, dari, sampai) {
  const el = document.getElementById('lap_hasil');
  const periodeText = '<p style="font-size:0.85rem; color:#666; margin-bottom:15px;">' +
    '<i class="fas fa-calendar"></i> Periode: <strong>' + esc(dari) + '</strong> s/d <strong>' + esc(sampai) + '</strong></p>';

  let html = '<div class="card" style="margin-top:15px; border-top:3px solid var(--primary-blue);">' +
    '<div class="flex-between mb-20">' +
      '<h3 style="color:var(--primary-blue);"><i class="fas fa-file-alt"></i> ' + esc(data.judul || 'Laporan') + '</h3>' +
      '<button onclick="cetakLaporan()" class="btn-ghost">' +
        '<i class="fas fa-print"></i> Cetak' +
      '</button>' +
    '</div>' + periodeText;

  if (jenis === 'servis') {
    html += renderTable(
      ['No. WO', 'Tanggal', 'Pelanggan', 'Nopol', 'Keluhan', 'Status'],
      data.data.map(function(r) {
        return [r.nomor_wo, r.tanggal, r.pelanggan, r.nopol, r.keluhan, r.status];
      })
    );
    html += '<p style="margin-top:10px; text-align:right; font-weight:bold;">Total: ' + data.total + ' WO</p>';
  }
  else if (jenis === 'wo_status') {
    html += '<table style="width:100%; border-collapse:collapse; margin-bottom:15px;">' +
      '<thead><tr style="background:var(--bg-light);"><th style="padding:10px; text-align:left;">Status</th><th style="padding:10px; text-align:right;">Jumlah</th></tr></thead>' +
      '<tbody>';
    data.summary.forEach(function(s) {
      html += '<tr><td style="padding:8px; border-bottom:1px solid #eee;">' + esc(s.status) + '</td>' +
        '<td style="padding:8px; text-align:right; border-bottom:1px solid #eee; font-weight:bold;">' + s.jumlah + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  else if (jenis === 'pendapatan') {
    html += renderTable(
      ['No. Transaksi', 'Tanggal', 'No. WO', 'Pelanggan', 'Metode', 'Jumlah'],
      data.data.map(function(r) {
        return [r.nomor_transaksi, r.tanggal, r.nomor_wo, r.pelanggan, r.metode, formatRupiah(r.jumlah)];
      })
    );
    html += '<div style="margin-top:15px; padding:15px; background:#E8F5E9; border-radius:6px; text-align:right;">' +
      '<p style="margin:0; font-size:0.85rem;">Jumlah Transaksi: <strong>' + data.jumlah_transaksi + '</strong></p>' +
      '<p style="margin:5px 0 0 0; font-size:1.2rem;">Total Pendapatan: <strong style="color:var(--primary-green);">' + formatRupiah(data.total) + '</strong></p>' +
      '</div>';
  }
  else if (jenis === 'pembayaran') {
    html += renderTable(
      ['Tanggal', 'No. WO', 'Jumlah Bayar', 'Status', 'Total Tagihan', 'Terbayar', 'Sisa'],
      data.data.map(function(r) {
        return [r.tanggal, r.nomor_wo, formatRupiah(r.jumlah), r.status,
                formatRupiah(r.total_tagihan), formatRupiah(r.total_terbayar), formatRupiah(r.sisa)];
      })
    );
  }
  else if (jenis === 'piutang') {
    html += renderTable(
      ['No. WO', 'Tanggal', 'Pelanggan', 'WhatsApp', 'Nopol', 'Total Tagihan', 'Terbayar', 'Sisa'],
      data.data.map(function(r) {
        return [r.nomor_wo, r.tanggal, r.pelanggan, r.whatsapp, r.nopol,
                formatRupiah(r.total_tagihan), formatRupiah(r.terbayar),
                '<span style="color:var(--primary-red); font-weight:bold;">' + formatRupiah(r.sisa) + '</span>'];
      }),
      true
    );
    html += '<div style="margin-top:15px; padding:15px; background:#FFEBEE; border-radius:6px; text-align:right;">' +
      '<p style="margin:0; font-size:0.85rem;">Jumlah WO Belum Lunas: <strong>' + data.jumlah + '</strong></p>' +
      '<p style="margin:5px 0 0 0; font-size:1.2rem;">Total Piutang: <strong style="color:var(--primary-red);">' + formatRupiah(data.total_piutang) + '</strong></p>' +
      '</div>';
  }
  else if (jenis === 'stok') {
    html += renderTable(
      ['Kode', 'Nama', 'Kategori', 'Stok', 'Min', 'Harga Beli', 'Harga Jual', 'Nilai Beli', 'Status'],
      data.data.map(function(r) {
        const statusHtml = r.status_stok === 'MENIPIS'
          ? '<span class="badge badge-danger">Menipis</span>'
          : '<span class="badge badge-success">Normal</span>';
        return [r.kode, r.nama, r.kategori, r.stok + ' ' + r.satuan, r.stok_minimum,
                formatRupiah(r.harga_beli), formatRupiah(r.harga_jual),
                formatRupiah(r.nilai_beli), statusHtml];
      }),
      true
    );
    html += '<div style="margin-top:15px; padding:15px; background:#F3F5F7; border-radius:6px;">' +
      '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:15px;">' +
        '<div><p style="margin:0; font-size:0.75rem; color:#999;">TOTAL ITEM</p><p style="margin:5px 0 0 0; font-size:1.1rem; font-weight:bold;">' + data.total_item + '</p></div>' +
        '<div><p style="margin:0; font-size:0.75rem; color:#999;">ITEM MENIPIS</p><p style="margin:5px 0 0 0; font-size:1.1rem; font-weight:bold; color:var(--primary-red);">' + data.item_menipis + '</p></div>' +
        '<div><p style="margin:0; font-size:0.75rem; color:#999;">NILAI STOK (BELI)</p><p style="margin:5px 0 0 0; font-size:1.1rem; font-weight:bold; color:var(--primary-blue);">' + formatRupiah(data.total_nilai_beli) + '</p></div>' +
        '<div><p style="margin:0; font-size:0.75rem; color:#999;">NILAI STOK (JUAL)</p><p style="margin:5px 0 0 0; font-size:1.1rem; font-weight:bold; color:var(--primary-green);">' + formatRupiah(data.total_nilai_jual) + '</p></div>' +
      '</div></div>';
  }
  else if (jenis === 'mutasi') {
    html += renderTable(
      ['Tanggal', 'Kode', 'Nama', 'Jenis Mutasi', 'Masuk', 'Keluar', 'Saldo', 'Keterangan'],
      data.data.map(function(r) {
        return [r.tanggal, r.kode, r.nama, r.jenis,
                r.masuk > 0 ? '<span style="color:var(--primary-green); font-weight:bold;">+' + r.masuk + '</span>' : '-',
                r.keluar > 0 ? '<span style="color:var(--primary-red); font-weight:bold;">-' + r.keluar + '</span>' : '-',
                r.saldo, r.keterangan];
      }),
      true
    );
    html += '<p style="margin-top:10px; text-align:right; font-weight:bold;">Total: ' + data.total + ' mutasi</p>';
  }
  else if (jenis === 'pembelian') {
    html += renderTable(
      ['No. PO', 'Tanggal', 'Tipe', 'Sumber', 'Total'],
      data.data.map(function(r) {
        const badge = r.tipe === 'Titipan' ? 'badge-warning' : 'badge-info';
        return [r.nomor, r.tanggal,
                '<span class="badge ' + badge + '">' + r.tipe + '</span>',
                r.sumber, formatRupiah(r.total)];
      }),
      true
    );
    html += '<div style="margin-top:15px; padding:15px; background:#F3F5F7; border-radius:6px; display:grid; grid-template-columns:1fr 1fr; gap:15px;">' +
      '<div><p style="margin:0; font-size:0.8rem; color:#999;">TOTAL PEMBELIAN MODAL</p>' +
      '<p style="margin:5px 0 0 0; font-size:1.2rem; font-weight:bold; color:var(--primary-blue);">' + formatRupiah(data.total_modal) + '</p></div>' +
      '<div><p style="margin:0; font-size:0.8rem; color:#999;">TOTAL TITIPAN MASUK</p>' +
      '<p style="margin:5px 0 0 0; font-size:1.2rem; font-weight:bold; color:#f39c12;">' + formatRupiah(data.total_titipan) + '</p></div>' +
      '</div>';
  }
  else if (jenis === 'pengeluaran') {
    html += renderTable(
      ['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah'],
      data.data.map(function(r) {
        return [r.tanggal, r.kategori, r.deskripsi, formatRupiah(r.jumlah)];
      })
    );
    if (data.summary.length > 0) {
      html += '<div style="margin-top:20px;"><h4 style="margin-bottom:10px;">Rekap per Kategori</h4>' +
        '<table style="width:100%; border-collapse:collapse;">' +
        '<thead><tr style="background:var(--bg-light);"><th style="padding:8px; text-align:left;">Kategori</th><th style="padding:8px; text-align:right;">Total</th></tr></thead><tbody>';
      data.summary.forEach(function(s) {
        html += '<tr><td style="padding:8px; border-bottom:1px solid #eee;">' + esc(s.kategori) + '</td>' +
          '<td style="padding:8px; text-align:right; border-bottom:1px solid #eee;">' + formatRupiah(s.total) + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '<p style="margin-top:15px; text-align:right; font-size:1.1rem; font-weight:bold;">Total Pengeluaran: ' +
      '<span style="color:var(--primary-red);">' + formatRupiah(data.total) + '</span></p>';
  }
  else if (jenis === 'kinerja_mekanik') {
    html += renderTable(
      ['Nama', 'Tipe', 'Status', 'Jumlah WO', 'Total Jam', 'Tervalidasi', 'Perlu Perbaikan'],
      data.data.map(function(r) {
        let tipe = r.tipe === 'mekanik_utama' ? 'Mekanik Utama' :
                   r.tipe === 'siswa' ? 'Siswa' : 'Servis Kunjung';
        return [r.nama, tipe, r.status, r.jumlah_wo, r.total_jam + ' jam', r.tervalidasi, r.perlu_perbaikan];
      })
    );
  }
  else if (jenis === 'aktivitas_siswa') {
    html += renderTable(
      ['Tanggal', 'Nama Siswa', 'Kelas', 'NIS', 'No. WO', 'Peran', 'Validasi'],
      data.data.map(function(r) {
        const badgeV = r.validasi === 'Tervalidasi' ? 'badge-success' :
                       r.validasi === 'Perlu Perbaikan' ? 'badge-danger' : 'badge-warning';
        return [r.tanggal, r.nama, r.kelas, r.nis, r.nomor_wo, r.peran,
                '<span class="badge ' + badgeV + '">' + r.validasi + '</span>'];
      }),
      true
    );
    html += '<p style="margin-top:10px; text-align:right; font-weight:bold;">Total: ' + data.total + ' aktivitas</p>';
  }
  else if (jenis === 'kepuasan') {
    if (data.rata_rata.total_responden === 0) {
      html += '<p style="text-align:center; padding:20px; color:#999;">Belum ada data penilaian.</p>';
    } else {
      html += '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:20px;">' +
        '<div style="background:#E8F5E9; padding:12px; border-radius:6px; text-align:center;"><p style="font-size:0.75rem; color:#666; margin:0;">KERAMAHAN</p><p style="font-size:1.5rem; font-weight:bold; color:var(--primary-green); margin:5px 0 0 0;">' + data.rata_rata.keramahan + '</p></div>' +
        '<div style="background:#E8F5E9; padding:12px; border-radius:6px; text-align:center;"><p style="font-size:0.75rem; color:#666; margin:0;">KECEPATAN</p><p style="font-size:1.5rem; font-weight:bold; color:var(--primary-green); margin:5px 0 0 0;">' + data.rata_rata.kecepatan + '</p></div>' +
        '<div style="background:#E8F5E9; padding:12px; border-radius:6px; text-align:center;"><p style="font-size:0.75rem; color:#666; margin:0;">KUALITAS</p><p style="font-size:1.5rem; font-weight:bold; color:var(--primary-green); margin:5px 0 0 0;">' + data.rata_rata.kualitas + '</p></div>' +
        '<div style="background:#E8F5E9; padding:12px; border-radius:6px; text-align:center;"><p style="font-size:0.75rem; color:#666; margin:0;">TRANSPARANSI</p><p style="font-size:1.5rem; font-weight:bold; color:var(--primary-green); margin:5px 0 0 0;">' + data.rata_rata.transparansi + '</p></div>' +
        '<div style="background:#E3F2FD; padding:12px; border-radius:6px; text-align:center;"><p style="font-size:0.75rem; color:#666; margin:0;">KEPUASAN</p><p style="font-size:1.5rem; font-weight:bold; color:var(--primary-blue); margin:5px 0 0 0;">' + data.rata_rata.kepuasan + '</p></div>' +
        '<div style="background:#FFF3E0; padding:12px; border-radius:6px; text-align:center;"><p style="font-size:0.75rem; color:#666; margin:0;">RESPONDEN</p><p style="font-size:1.5rem; font-weight:bold; color:#f39c12; margin:5px 0 0 0;">' + data.rata_rata.total_responden + '</p></div>' +
        '</div>';
      html += renderTable(
        ['Tanggal', 'Keramahan', 'Kecepatan', 'Kualitas', 'Transparansi', 'Kepuasan', 'Saran'],
        data.data.map(function(r) {
          return [r.tanggal, r.keramahan, r.kecepatan, r.kualitas, r.transparansi, r.kepuasan, r.saran || '-'];
        })
      );
    }
  }
  else if (jenis === 'laba_rugi') {
    html += '<table style="width:100%; border-collapse:collapse; font-size:1rem;">' +
      '<tbody>' +
      '<tr><td style="padding:12px;">Pendapatan</td><td style="padding:12px; text-align:right; font-weight:bold; color:var(--primary-green);">' + formatRupiah(data.pendapatan) + '</td></tr>' +
      '<tr><td style="padding:12px;">HPP (Harga Pokok Penjualan)</td><td style="padding:12px; text-align:right; color:var(--primary-red);">(' + formatRupiah(data.hpp) + ')</td></tr>' +
      '<tr style="background:#F3F5F7;"><td style="padding:12px; font-weight:bold;">Laba Kotor</td><td style="padding:12px; text-align:right; font-weight:bold; color:var(--primary-blue);">' + formatRupiah(data.laba_kotor) + '</td></tr>' +
      '<tr><td style="padding:12px;">Biaya Operasional</td><td style="padding:12px; text-align:right; color:var(--primary-red);">(' + formatRupiah(data.biaya_operasional) + ')</td></tr>' +
      '<tr style="background:' + (data.laba_operasional >= 0 ? '#E8F5E9' : '#FFEBEE') + ';">' +
        '<td style="padding:15px; font-weight:bold; font-size:1.1rem;">LABA OPERASIONAL</td>' +
        '<td style="padding:15px; text-align:right; font-weight:bold; font-size:1.3rem; color:' + (data.laba_operasional >= 0 ? 'var(--primary-green)' : 'var(--primary-red)') + ';">' + formatRupiah(data.laba_operasional) + '</td></tr>' +
      '</tbody></table>';
  }
  else if (jenis === 'follow_up') {
    html += '<p style="margin-bottom:15px; padding:10px; background:#FFF3CD; border-radius:6px; font-size:0.85rem;">' +
      '<i class="fas fa-info-circle"></i> Kriteria: <strong>' + esc(data.kriteria) + '</strong></p>';
    html += renderTable(
      ['Nama', 'WhatsApp', 'Nopol', 'Motor', 'Terakhir Servis', 'Hari Lalu'],
      data.data.map(function(r) {
        return [r.nama, r.whatsapp, r.nopol, r.motor, r.terakhir_servis,
                '<span style="color:var(--primary-red); font-weight:bold;">' + r.hari_terakhir + ' hari</span>'];
      }),
      true
    );
    html += '<p style="margin-top:10px; text-align:right; font-weight:bold;">Total: ' + data.total + ' pelanggan</p>';
  }

  html += '</div>';
  el.innerHTML = html;
}

function renderTable(headers, rows, allowHtml) {
  let html = '<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:0.85rem;">' +
    '<thead><tr style="background:var(--bg-light); border-bottom:2px solid var(--border-color);">';
  headers.forEach(function(h) {
    html += '<th style="padding:10px; text-align:left; white-space:nowrap;">' + esc(h) + '</th>';
  });
  html += '</tr></thead><tbody>';

  if (rows.length === 0) {
    html += '<tr><td colspan="' + headers.length + '" style="text-align:center; padding:20px; color:#999;">Tidak ada data pada periode ini.</td></tr>';
  } else {
    rows.forEach(function(row) {
      html += '<tr style="border-bottom:1px solid #eee;">';
      row.forEach(function(cell) {
        const content = allowHtml ? (cell || '-') : esc(cell || '-');
        html += '<td style="padding:10px; white-space:nowrap;">' + content + '</td>';
      });
      html += '</tr>';
    });
  }
  html += '</tbody></table></div>';
  return html;
}

function cetakLaporan() {
  const el = document.getElementById('lap_hasil');
  if (!el || !el.innerHTML) { showToast('Tampilkan laporan dulu.', 'warning'); return; }

  const w = window.open('', '_blank', 'width=900,height=700');
  w.document.write('<!DOCTYPE html><html><head><title>Cetak Laporan</title>' +
    '<style>' +
    'body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }' +
    'h2, h3 { color: #1769AA; }' +
    'table { width: 100%; border-collapse: collapse; margin-top: 10px; }' +
    'th { background: #F3F5F7; padding: 8px; text-align: left; border-bottom: 2px solid #ccc; font-size: 10px; }' +
    'td { padding: 6px; border-bottom: 1px solid #eee; font-size: 10px; }' +
    '.badge { padding: 2px 6px; border-radius: 4px; color: white; font-size: 9px; }' +
    '.badge-success { background: #39A935; } .badge-danger { background: #E31E2B; }' +
    '.badge-warning { background: #f39c12; } .badge-info { background: #1769AA; }' +
    '.badge-muted { background: #6c757d; }' +
    'button { display: none !important; }' +
    '</style></head><body>' +
    '<div style="text-align:center; margin-bottom:20px; border-bottom:2px solid #1769AA; padding-bottom:10px;">' +
    '<h2 style="margin:0;">M-TOP Enduro Motor Service</h2>' +
    '<p style="margin:3px 0; font-size:10px;">Bengkel Teaching Factory | SMK Muhammadiyah 1 Surakarta</p>' +
    '</div>' +
    el.innerHTML +
    '</body></html>');
  w.document.close();
  w.focus();
  setTimeout(function() { w.print(); }, 500);
}

// ==========================================
// 19b. LAPORAN — EXPORT CSV / PDF / GRAFIK
// ==========================================
function _getFilterLaporan() {
  return {
    dari: (document.getElementById('lap_dari') || {}).value || '',
    sampai: (document.getElementById('lap_sampai') || {}).value || ''
  };
}

function _getJenisLaporan() {
  const el = document.getElementById('lap_jenis');
  return el ? el.value : '';
}

function exportCSV() {
  const jenis = _getJenisLaporan();
  const filter = _getFilterLaporan();
  if (!jenis) { showToast('Pilih jenis laporan dulu.', 'error'); return; }
  if (!filter.dari || !filter.sampai) { showToast('Isi periode dulu.', 'warning'); return; }

  showToast('Menyiapkan CSV...', 'info');

  google.script.run
    .withSuccessHandler(function(resStr) {
      try {
        const res = JSON.parse(resStr);
        if (!res.success) { showToast(res.message, 'error'); return; }

        const bin = atob(res.data.content);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);

        showToast('CSV berhasil diunduh.', 'success');
      } catch (e) {
        showToast('Parse error: ' + e.message, 'error');
      }
    })
    .withFailureHandler(function(err) {
      showToast('Error: ' + err.message, 'error');
    })
    .exportLaporanCSV(jenis, filter);
}

function exportPDF() {
  const jenis = _getJenisLaporan();
  const filter = _getFilterLaporan();
  if (!jenis) { showToast('Pilih jenis laporan dulu.', 'error'); return; }
  if (!filter.dari || !filter.sampai) { showToast('Isi periode dulu.', 'warning'); return; }

  showToast('Menyiapkan PDF...', 'info');

  google.script.run
    .withSuccessHandler(function(resStr) {
      try {
        const res = JSON.parse(resStr);
        if (!res.success) { showToast(res.message, 'error'); return; }

        const iframe = document.getElementById('lap_print_iframe');
        if (!iframe) { showToast('Iframe print tidak ditemukan.', 'error'); return; }

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(res.data.html);
        doc.close();

        setTimeout(function() {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          showToast('Pilih "Save as PDF" di dialog print.', 'info');
        }, 700);
      } catch (e) {
        showToast('Parse error: ' + e.message, 'error');
      }
    })
    .withFailureHandler(function(err) {
      showToast('Error: ' + err.message, 'error');
    })
    .getLaporanPrintHTML(jenis, filter);
}

function toggleGrafik() {
  const container = document.getElementById('lap_grafik_container');
  const txt = document.getElementById('lap_toggle_text');
  if (!container) return;

  const isHidden = (container.style.display === 'none' || container.style.display === '');
  if (isHidden) {
    const filter = _getFilterLaporan();
    showToast('Memuat grafik...', 'info');

    google.script.run
      .withSuccessHandler(function(resStr) {
        try {
          const res = JSON.parse(resStr);
          if (!res.success) { showToast(res.message, 'error'); return; }
          container.style.display = 'block';
          if (txt) txt.innerText = 'Sembunyikan Grafik';
          _renderGrafikSVG(res.data);
        } catch (e) {
          showToast('Parse error: ' + e.message, 'error');
        }
      })
      .withFailureHandler(function(err) {
        showToast('Error: ' + err.message, 'error');
      })
      .getDataGrafik(filter);
  } else {
    container.style.display = 'none';
    if (txt) txt.innerText = 'Tampilkan Grafik';
  }
}

function _renderGrafikSVG(data) {
  const target = document.getElementById('lap_grafik_content');
  if (!target) return;

  const colors = {
    red: '#E31E2B', blue: '#1769AA', green: '#39A935',
    orange: '#f39c12', gray: '#6B7280', purple: '#8E44AD',
    palette: ['#1769AA', '#39A935', '#f39c12', '#E31E2B', '#6B7280', '#8E44AD', '#17A2B8', '#E67E22']
  };

  let html = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">';

  html += '<div style="background:#fff; padding:12px; border-radius:6px; border:1px solid #eee;">';
  html += '<h4 style="margin:0 0 10px 0; color:#263238; font-size:0.9rem;">Pendapatan Harian</h4>';
  html += _svgBarChart(data.pendapatan_harian.labels, data.pendapatan_harian.values, colors.blue, function(v) { return formatRupiah(v); });
  html += '</div>';

  html += '<div style="background:#fff; padding:12px; border-radius:6px; border:1px solid #eee;">';
  html += '<h4 style="margin:0 0 10px 0; color:#263238; font-size:0.9rem;">WO per Status</h4>';
  html += _svgPieChart(data.wo_status.labels, data.wo_status.values, colors.palette);
  html += '</div>';

  html += '<div style="background:#fff; padding:12px; border-radius:6px; border:1px solid #eee;">';
  html += '<h4 style="margin:0 0 10px 0; color:#263238; font-size:0.9rem;">Pengeluaran per Kategori</h4>';
  html += _svgBarChart(data.pengeluaran.labels, data.pengeluaran.values, colors.red, function(v) { return formatRupiah(v); });
  html += '</div>';

  html += '<div style="background:#fff; padding:12px; border-radius:6px; border:1px solid #eee;">';
  html += '<h4 style="margin:0 0 10px 0; color:#263238; font-size:0.9rem;">Komposisi Laba Rugi</h4>';
  html += _svgBarChart(data.laba_rugi.labels, data.laba_rugi.values, colors.green, function(v) { return formatRupiah(v); });
  html += '</div>';

  html += '</div>';
  target.innerHTML = html;
}

function _svgBarChart(labels, values, barColor, formatter) {
  if (!labels || labels.length === 0) {
    return '<p style="text-align:center; padding:20px; color:#999; font-size:0.85rem;">Tidak ada data.</p>';
  }
  formatter = formatter || function(v) { return String(v); };

  const width = 500;
  const height = 220;
  const paddingTop = 20;
  const paddingBottom = 50;
  const paddingLeft = 60;
  const paddingRight = 20;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const maxVal = Math.max.apply(null, values) || 1;
  const barCount = values.length;
  const gap = 6;
  const barW = Math.max(2, (chartW - gap * (barCount + 1)) / barCount);

  let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '" style="width:100%; height:auto; display:block;">';

  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = paddingTop + (chartH / gridLines) * i;
    svg += '<line x1="' + paddingLeft + '" y1="' + y + '" x2="' + (width - paddingRight) + '" y2="' + y + '" stroke="#E0E0E0" stroke-width="1"/>';
    const val = maxVal - (maxVal / gridLines) * i;
    svg += '<text x="' + (paddingLeft - 6) + '" y="' + (y + 4) + '" font-size="9" fill="#999" text-anchor="end">' + formatter(Math.round(val)) + '</text>';
  }

  for (let i = 0; i < barCount; i++) {
    const val = values[i];
    const barH = (val / maxVal) * chartH;
    const x = paddingLeft + gap + i * (barW + gap);
    const y = paddingTop + chartH - barH;
    svg += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + barH + '" fill="' + barColor + '" rx="2"/>';

    const label = String(labels[i]);
    const shortLabel = label.length > 12 ? label.substring(0, 10) + '…' : label;
    const labelX = x + barW / 2;
    const labelY = height - paddingBottom + 14;
    svg += '<text x="' + labelX + '" y="' + labelY + '" font-size="8" fill="#666" text-anchor="end" transform="rotate(-35 ' + labelX + ' ' + labelY + ')">' + _escapeXml(shortLabel) + '</text>';
  }

  svg += '</svg>';
  return svg;
}

function _svgPieChart(labels, values, palette) {
  if (!labels || labels.length === 0) {
    return '<p style="text-align:center; padding:20px; color:#999; font-size:0.85rem;">Tidak ada data.</p>';
  }
  const total = values.reduce(function(a, b) { return a + b; }, 0) || 1;
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const innerR = 45;

  let svg = '<div style="display:flex; gap:16px; align-items:center;">';
  svg += '<svg viewBox="0 0 ' + size + ' ' + size + '" style="width:200px; height:200px; flex-shrink:0;">';

  let startAngle = -Math.PI / 2;
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (val <= 0) continue;
    const angle = (val / total) * Math.PI * 2;
    const endAngle = startAngle + angle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const xi1 = cx + innerR * Math.cos(endAngle);
    const yi1 = cy + innerR * Math.sin(endAngle);
    const xi2 = cx + innerR * Math.cos(startAngle);
    const yi2 = cy + innerR * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;
    const path = [
      'M', x1, y1,
      'A', r, r, 0, largeArc, 1, x2, y2,
      'L', xi1, yi1,
      'A', innerR, innerR, 0, largeArc, 0, xi2, yi2,
      'Z'
    ].join(' ');

    const color = palette[i % palette.length];
    svg += '<path d="' + path + '" fill="' + color + '"/>';

    startAngle = endAngle;
  }

  svg += '</svg>';

  svg += '<div style="flex:1; min-width:0;">';
  for (let i = 0; i < labels.length; i++) {
    const val = values[i];
    const color = palette[i % palette.length];
    const pct = ((val / total) * 100).toFixed(1);
    svg += '<div style="display:flex; align-items:center; gap:6px; margin-bottom:6px; font-size:0.8rem;">' +
      '<span style="display:inline-block; width:12px; height:12px; background:' + color + '; border-radius:2px; flex-shrink:0;"></span>' +
      '<span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + _escapeXml(labels[i]) + '</span>' +
      '<span style="color:#666; white-space:nowrap;">' + val + ' (' + pct + '%)</span>' +
    '</div>';
  }
  svg += '</div></div>';
  return svg;
}

function _escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ==========================================
// 20. MODUL WHATSAPP
// ==========================================
function kirimNotifSelesai() {
  const woId = window.currentWoId || (document.getElementById('d-woid') || {}).value;
  if (!woId) { showToast('WO tidak valid.', 'error'); return; }

  const nama = (document.getElementById('d-nama') || {}).innerText || '';
  const wa = (document.getElementById('d-wa') || {}).innerText || '';
  const noWo = (document.getElementById('d-nowo') || {}).innerText || '';
  const nopol = (document.getElementById('d-nopol') || {}).innerText || '';
  const tagihan = (document.getElementById('totalEstimasi') || {}).innerText || 'Rp 0';

  if (!wa || wa === '-' || wa === '...') {
    showToast('Nomor WA pelanggan tidak tersedia.', 'warning');
    return;
  }

  google.script.run
    .withSuccessHandler(function(resStr) {
      const res = JSON.parse(resStr);
      if (!res.success) { showToast(res.message, 'error'); return; }
      window.open(res.data.link, '_blank');
      showToast('WhatsApp dibuka di tab baru.', 'success');

      const panel = document.getElementById('wa_riwayat_panel');
      if (panel && panel.style.display !== 'none') bukaRiwayatWA();
    })
    .withFailureHandler(function(err) {
      showToast('Error: ' + err.message, 'error');
    })
    .kirimWA({
      wo_id: woId, jenis: 'NOTIF_SELESAI', whatsapp: wa,
      nama: nama, nopol: nopol, nomor_wo: noWo, tagihan: tagihan
    });
}

function kirimReminderServis() {
  const woId = window.currentWoId || (document.getElementById('d-woid') || {}).value;
  if (!woId) { showToast('WO tidak valid.', 'error'); return; }

  const nama = (document.getElementById('d-nama') || {}).innerText || '';
  const wa = (document.getElementById('d-wa') || {}).innerText || '';
  const nopol = (document.getElementById('d-nopol') || {}).innerText || '';

  if (!wa || wa === '-' || wa === '...') {
    showToast('Nomor WA pelanggan tidak tersedia.', 'warning');
    return;
  }

  google.script.run
    .withSuccessHandler(function(resStr) {
      const res = JSON.parse(resStr);
      if (!res.success) { showToast(res.message, 'error'); return; }
      window.open(res.data.link, '_blank');
      showToast('WhatsApp dibuka di tab baru.', 'success');

      const panel = document.getElementById('wa_riwayat_panel');
      if (panel && panel.style.display !== 'none') bukaRiwayatWA();
    })
    .withFailureHandler(function(err) {
      showToast('Error: ' + err.message, 'error');
    })
    .kirimWA({ wo_id: woId, jenis: 'REMINDER_SERVIS', whatsapp: wa, nama: nama, nopol: nopol });
}

function bukaRiwayatWA() {
  const woId = window.currentWoId || (document.getElementById('d-woid') || {}).value;
  if (!woId) { showToast('WO tidak valid.', 'error'); return; }

  const panel = document.getElementById('wa_riwayat_panel');
  const content = document.getElementById('wa_riwayat_content');
  if (!panel || !content) return;

  panel.style.display = 'block';
  content.innerHTML = '<p style="color:#999; font-size:0.85rem; text-align:center; padding:10px;">' +
    '<i class="fas fa-spinner fa-spin"></i> Memuat riwayat...</p>';

  google.script.run
    .withSuccessHandler(function(resStr) {
      const res = JSON.parse(resStr);
      if (!res.success) {
        content.innerHTML = '<p style="color:var(--primary-red); font-size:0.85rem; text-align:center; padding:10px;">' + esc(res.message) + '</p>';
        return;
      }
      if (res.data.length === 0) {
        content.innerHTML = '<p style="color:#999; font-size:0.85rem; text-align:center; padding:10px;">Belum ada riwayat pengiriman WA untuk WO ini.</p>';
        return;
      }

      let html = '<div style="overflow-x:auto;"><table style="width:100%; border-collapse:collapse; font-size:0.8rem;">' +
        '<thead><tr style="background:white;">' +
          '<th style="padding:6px; text-align:left; border-bottom:1px solid #ddd;">Waktu</th>' +
          '<th style="padding:6px; text-align:left; border-bottom:1px solid #ddd;">Jenis</th>' +
          '<th style="padding:6px; text-align:left; border-bottom:1px solid #ddd;">Keterangan</th>' +
        '</tr></thead><tbody>';

      res.data.forEach(function(r) {
        const badge = r.jenis === 'NOTIF_SELESAI'
          ? '<span class="badge badge-success" style="font-size:0.7rem;">Notif Selesai</span>'
          : '<span class="badge badge-warning" style="font-size:0.7rem;">Reminder</span>';
        html += '<tr style="border-bottom:1px solid #eee;">' +
          '<td style="padding:6px; white-space:nowrap;">' + esc(r.waktu) + '</td>' +
          '<td style="padding:6px;">' + badge + '</td>' +
          '<td style="padding:6px;">' + esc(r.keterangan) + '</td>' +
        '</tr>';
      });

      html += '</tbody></table></div>';
      content.innerHTML = html;
    })
    .withFailureHandler(function(err) {
      content.innerHTML = '<p style="color:var(--primary-red); font-size:0.85rem; text-align:center; padding:10px;">Error: ' + esc(err.message) + '</p>';
    })
    .getRiwayatWA({ wo_id: woId, limit: 20 });
}

function tampilkanReminderServis(hariMinimal) {
  hariMinimal = hariMinimal || 90;
  showToast('Memuat daftar reminder...', 'info');

  google.script.run
    .withSuccessHandler(function(resStr) {
      const res = JSON.parse(resStr);
      if (!res.success) { showToast(res.message, 'error'); return; }
      if (res.data.length === 0) {
        showToast('Tidak ada pelanggan yang perlu di-reminder.', 'info');
        return;
      }

      let html = '<p style="font-size:0.85rem; color:#666; margin-bottom:12px;">Pelanggan dengan servis terakhir > ' + hariMinimal + ' hari:</p>' +
        '<div style="max-height:400px; overflow-y:auto;"><table style="width:100%; border-collapse:collapse; font-size:0.85rem;">' +
        '<thead><tr style="background:#F3F5F7;">' +
          '<th style="padding:8px; text-align:left;">Nama</th>' +
          '<th style="padding:8px; text-align:left;">Nopol</th>' +
          '<th style="padding:8px; text-align:center;">Hari</th>' +
          '<th style="padding:8px; text-align:center;">Aksi</th>' +
        '</tr></thead><tbody>';
      res.data.forEach(function(r) {
        html += '<tr style="border-bottom:1px solid #eee;">' +
          '<td style="padding:8px;">' + esc(r.nama) + '</td>' +
          '<td style="padding:8px;">' + esc(r.nopol) + '</td>' +
          '<td style="padding:8px; text-align:center; color:var(--primary-red); font-weight:bold;">' + r.hari_terakhir + '</td>' +
          '<td style="padding:8px; text-align:center;">' +
            '<button onclick="kirimReminderDariDaftar(\'' + r.whatsapp + '\', \'' + esc(r.nama).replace(/'/g, "\\'") + '\', \'' + esc(r.nopol) + '\', ' + r.hari_terakhir + ')" ' +
              'style="background:var(--primary-green); color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem;">' +
              '<i class="fab fa-whatsapp"></i> Kirim' +
            '</button>' +
          '</td>' +
        '</tr>';
      });
      html += '</tbody></table></div>';
      showModalCustom('Reminder Servis Berkala', html);
    })
    .withFailureHandler(function(err) {
      showToast('Error: ' + err.message, 'error');
    })
    .getDataReminderServis(hariMinimal);
}

function kirimReminderDariDaftar(whatsapp, nama, nopol, hariTerakhir) {
  google.script.run
    .withSuccessHandler(function(resStr) {
      const res = JSON.parse(resStr);
      if (!res.success) { showToast(res.message, 'error'); return; }
      window.open(res.data.link, '_blank');
      showToast('WhatsApp dibuka.', 'success');
    })
    .withFailureHandler(function(err) {
      showToast('Error: ' + err.message, 'error');
    })
    .kirimWA({ wo_id: '-', jenis: 'REMINDER_SERVIS', whatsapp: whatsapp, nama: nama, nopol: nopol, hari_terakhir: hariTerakhir });
}

// ==========================================
// 21. BOOTSTRAP LOGIN & ROLE MANAGEMENT
// ==========================================
function switchLoginRole(role, btn) {
  document.getElementById('login_role').value = role;
  
  // Reset style tombol
  document.querySelectorAll('.role-btn').forEach(el => {
    el.style.background = 'white';
    el.style.color = '#333';
    el.style.borderColor = '#ddd';
    el.classList.remove('active');
  });
  
  // Highlight tombol aktif
  btn.style.background = '#1769AA';
  btn.style.color = 'white';
  btn.style.borderColor = '#1769AA';

  // Toggle field
  if (role === 'pelanggan') {
    document.getElementById('login_field_username').style.display = 'none';
    document.getElementById('login_field_password').style.display = 'none';
    document.getElementById('login_field_wa').style.display = 'block';
    document.getElementById('login_username').required = false;
    document.getElementById('login_password').required = false;
  } else {
    document.getElementById('login_field_username').style.display = 'block';
    document.getElementById('login_field_password').style.display = 'block';
    document.getElementById('login_field_wa').style.display = 'none';
    document.getElementById('login_username').required = true;
    document.getElementById('login_password').required = true;
  }
  document.getElementById('login_error').style.display = 'none';
}

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'block';
  document.getElementById('main-app').style.display = 'none';
}

const ROLE_MENUS = {
  admin: ['Dashboard', 'Penerimaan', 'DaftarWO', 'Kasir', 'Pelanggan', 'Kendaraan', 'KatalogJasa', 'Inventori', 'Mekanik', 'Sales', 'Pembelian', 'UtangSales', 'Laporan', 'Keuangan'],
  mekanik: ['Dashboard', 'Penerimaan', 'DaftarWO', 'Pelanggan', 'Kendaraan'],
  pelanggan: ['PortalPelanggan'] // View khusus pelanggan
};

function showMainApp(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-app').style.display = 'flex';
  
  const label = (user && user.nama) ? user.nama : 'User';
  document.getElementById('user-info').innerText = label + ' (' + user.role + ')';
  document.getElementById('topbar-user').innerText = label;

  // Filter Sidebar berdasarkan Role
  const allowedMenus = ROLE_MENUS[user.role] || ['Dashboard'];
  
  document.querySelectorAll('.nav-item').forEach(el => {
    const view = el.getAttribute('data-view');
    if (allowedMenus.includes(view)) {
      el.style.display = 'flex';
    } else {
      el.style.display = 'none';
    }
  });

  // Sembunyikan section title jika semua isinya hidden (optional)
  if (user.role === 'pelanggan') {
    document.querySelectorAll('.nav-section').forEach(el => el.style.display = 'none');
    loadView('PortalPelanggan');
  } else {
    document.querySelectorAll('.nav-section').forEach(el => el.style.display = 'block');
    loadView('Dashboard');
  }
}

async function submitLogin(event) {
  event.preventDefault();
  const role = document.getElementById('login_role').value;
  const btn = document.getElementById('btnLogin');
  const errBox = document.getElementById('login_error');
  errBox.style.display = 'none';

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

  try {
    let res;
    if (role === 'pelanggan') {
      const wa = document.getElementById('login_whatsapp').value.trim();
      if (!wa) throw new Error('Nomor WA wajib diisi.');
      res = await apiCall('loginPelanggan', { whatsapp: wa });
    } else {
      // Paksa ambil value langsung dari DOM (kebal autofill)
      const elUser = document.getElementById('login_username');
      const elPass = document.getElementById('login_password');
      
      const username = elUser ? elUser.value.trim() : '';
      const password = elPass ? elPass.value : ''; 

      if (!username || !password) {
        errBox.innerText = 'Username dan password wajib diisi.';
        errBox.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
        return;
      }
      
      // Kirim sebagai objek
      res = await apiCall('loginUser', { username: username, password: password });
    }

    if (!res.success) {
      errBox.innerText = res.message;
      errBox.style.display = 'block';
      return;
    }
    
    setToken(res.data.token);
    setUser(res.data.user);
    showMainApp(res.data.user);
    
  } catch (err) {
    errBox.innerText = 'Error: ' + err.message;
    errBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
  }
}

// ==========================================
// 22. MODUL PORTAL PELANGGAN
// ==========================================
function initPortalPelanggan() {
  const tbody = document.getElementById('tabelPortalPelanggan');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Memuat data...</td></tr>';

  google.script.run
    .withSuccessHandler(function(responseStr) {
      const res = JSON.parse(responseStr);
      if (!res.success) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:red;">' + esc(res.message) + '</td></tr>';
        return;
      }
      
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">Belum ada riwayat servis.</td></tr>';
        return;
      }

      let html = '';
      res.data.forEach(function(wo) {
        let badgeColor = wo.status === 'Selesai' ? 'var(--primary-green)' : (wo.status === 'Menunggu Persetujuan' ? '#f39c12' : 'var(--primary-blue)');
        
        // Tombol aksi
        let btnAksi = '<span style="color:#999; font-size:0.8rem;">-</span>';
        if (wo.status === 'Menunggu Persetujuan') {
          btnAksi = '<button onclick="bukaPersetujuan(\'' + wo.wo_id + '\')" style="background:var(--primary-green); color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">Review Biaya</button>';
        } else {
          btnAksi = '<button onclick="lihatDetailPelanggan(\'' + wo.wo_id + '\')" style="background:white; border:1px solid var(--primary-blue); color:var(--primary-blue); padding:6px 12px; border-radius:4px; cursor:pointer;">Detail</button>';
        }

        html += '<tr style="border-bottom:1px solid #eee;">' +
          '<td style="padding:10px; font-weight:bold; color:var(--primary-blue);">' + esc(wo.nomor_wo) + '</td>' +
          '<td style="padding:10px;">' + esc(String(wo.tanggal).substring(0,10)) + '</td>' +
          '<td style="padding:10px;">' + esc(wo.nopol) + '</td>' +
          '<td style="padding:10px;">' + esc(wo.keluhan) + '</td>' +
          '<td style="padding:10px;"><span style="background:' + badgeColor + '; color:white; padding:3px 8px; border-radius:12px; font-size:0.75rem;">' + esc(wo.status) + '</span></td>' +
          '<td style="padding:10px; text-align:center;">' + btnAksi + '</td>' +
        '</tr>';
      });
      tbody.innerHTML = html;
    })
    .getPortalPelanggan();
}

function bukaPersetujuan(woId) {
  google.script.run
    .withSuccessHandler(function(resStr) {
      const res = JSON.parse(resStr);
      if (!res.success) { showToast(res.message, 'error'); return; }
      const w = res.data;

      let itemsHtml = '';
      w.items.forEach(it => {
        itemsHtml += '<tr><td style="padding:5px;">' + esc(it.deskripsi) + '</td><td style="text-align:center;">' + it.qty + '</td><td style="text-align:right;">' + formatRupiah(it.subtotal) + '</td></tr>';
      });

      const html = `
        <p><strong>No. WO:</strong> ${w.nomor_wo}</p>
        <p><strong>Keluhan:</strong> ${w.keluhan || '-'}</p>
        <table style="width:100%; border-collapse:collapse; margin:15px 0;">
          <thead><tr style="background:#f3f5f7;"><th style="padding:8px; text-align:left;">Kerusakan / Perbaikan</th><th style="padding:8px; text-align:center;">Qty</th><th style="padding:8px; text-align:right;">Biaya</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot><tr><th colspan="2" style="padding:8px; text-align:right;">Estimasi Total:</th><th style="padding:8px; text-align:right; color:var(--primary-red);">${formatRupiah(w.total_tagihan)}</th></tr></tfoot>
        </table>
        <div style="background:#FFF3CD; padding:10px; border-radius:6px; font-size:0.85rem; margin-bottom:15px;">
          <i class="fas fa-info-circle"></i> Silakan periksa rincian perbaikan dan biaya di atas.
        </div>
        <div style="display:flex; gap:10px;">
          <button onclick="aksiPersetujuan('${woId}', 'Disetujui')" style="flex:1; background:var(--primary-green); color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-weight:bold;">Setujui Perbaikan</button>
          <button onclick="aksiPersetujuan('${woId}', 'Ditolak')" style="flex:1; background:var(--primary-red); color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-weight:bold;">Tolak / Tunda</button>
        </div>
      `;
      showModalCustom('Persetujuan Perbaikan', html);
    })
    .getDetailTagihan(woId);
}

function aksiPersetujuan(woId, status) {
  showConfirm('Anda yakin ingin ' + (status === 'Disetujui' ? 'Menyetujui' : 'Menolak') + ' perbaikan ini?', function() {
    google.script.run
      .withSuccessHandler(function(resStr) {
        const res = JSON.parse(resStr);
        if (res.success) {
          showToast(res.message, 'success');
          document.getElementById('modal-custom').style.display = 'none';
          initPortalPelanggan();
        } else {
          showToast('Gagal: ' + res.message, 'error');
        }
      })
      .catatPersetujuanPelanggan({ wo_id: woId, persetujuan: status });
  });
}

function lihatDetailPelanggan(woId) {
  showToast('Fitur detail sedang disiapkan. Cek status berkala.', 'info');
}

// ==========================================
// 23. INIT (ANTI GAGAL)
// ==========================================
window.addEventListener('DOMContentLoaded', async function() {
  showLoginScreen();

  const token = getToken();
  if (!token) return; 

  try {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Koneksi ke server timeout')), 10000)
    );
    
    const res = await Promise.race([
      apiCall('cekSession', {}),
      timeout
    ]);

    if (res.success) {
      setUser(res.data);
      showMainApp(res.data); 
    } else {
      clearSession(); 
    }
  } catch (e) {
    console.error('Cek session gagal:', e.message);
    clearSession(); 
  }
});
// ==========================================
// 24. FUNGSI LOGOUT
// ==========================================
async function doLogout() {
  showConfirm('Apakah Anda yakin ingin keluar dari aplikasi?', async function() {
    try {
      // 1. Coba hapus session di backend (GAS)
      await apiCall('logoutUser', {});
    } catch (e) {
      console.log('Gagal menghapus session di server, lanjut logout lokal.');
    } finally {
      // 2. Hapus token di browser & sembunyikan aplikasi
      clearSession(); // Fungsi ini ada di api.js
      showLoginScreen(); // Fungsi ini ada di app.js
      
      // 3. Bersihkan form login biar ga nyangkut
      const formLogin = document.getElementById('formLogin');
      if (formLogin) formLogin.reset();
      
      showToast('Anda telah berhasil logout.', 'success');
    }
  });
}
