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

// (SISA FUNGSI MODUL LAINNYA SEPERTI PENERIMAAN, WO, KASIR, DLL. TETAP SAMA SEPERTI FILE ASLI KAMU)
// Saya potong agar tidak kepanjangan, karena fokus kita hanya memperbaiki login.

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
