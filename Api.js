/**
 * ============================================================
 * API.JS — Client JSON untuk GAS Web App
 * ============================================================
 * Ganti semua `google.script.run.fn(x, y)` menjadi:
 *   apiCall('fn', [x, y])
 * atau (kalau 1 parameter object):
 *   apiCall('fn', { ... })
 * ============================================================
 */

// ⚠️ GANTI dengan URL deployment GAS kamu
const GAS_API_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';

const TOKEN_KEY = 'mtop_token';
const USER_KEY  = 'mtop_user';

// ============================================
// SESSION HELPERS
// ============================================
function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
}
function setToken(t) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
}
function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {}
}
function getUser() {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
}
function setUser(u) {
  try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch (e) {}
}

// ============================================
// CORE CALLER
// ============================================
async function apiCall(action, params) {
  const body = {
    action: action,
    params: (params === undefined || params === null) ? {} : params,
    token: getToken()
  };

  let resp;
  try {
    resp = await fetch(GAS_API_URL, {
      method: 'POST',
      // text/plain → no CORS preflight (GAS tidak handle OPTIONS)
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow'
    });
  } catch (err) {
    throw new Error('Koneksi ke server gagal: ' + err.message);
  }

  if (!resp.ok) {
    throw new Error('HTTP ' + resp.status + ': ' + resp.statusText);
  }

  let json;
  try {
    json = await resp.json();
  } catch (err) {
    throw new Error('Response bukan JSON. Cek deployment GAS.');
  }

  // Auto-logout kalau token expired
  if (json && json.code === 'AUTH_REQUIRED') {
    clearSession();
    if (typeof window.__onSessionExpired === 'function') {
      window.__onSessionExpired();
    }
    throw new Error(json.message || 'Sesi habis.');
  }

  return json;
}

// ============================================
// WRAPPER — bentuknya menyerupai google.script.run
// (supaya kode lama frontend bisa migrasi bertahap)
// ============================================
function gsRun(action, ...args) {
  // params: kalau argumen = 0/1 objek → object, kalau banyak → array
  let params;
  if (args.length === 0) params = {};
  else if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) params = args[0];
  else params = args;

  return {
    withSuccessHandler(cb) {
      this.__success = cb;
      return this;
    },
    withFailureHandler(cb) {
      this.__fail = cb;
      return this;
    },
    then(resolve, reject) {
      return apiCall(action, params).then(resolve, reject);
    },
    // Setter untuk chaining
    __success: null,
    __fail: null,
    // Kick off setelah semua handler ter-set
    __exec() {
      const p = apiCall(action, params);
      p.then(
        (res) => {
          if (this.__success) {
            // google.script.run mengirim STRING JSON → kita konversi
            this.__success(typeof res === 'string' ? res : JSON.stringify(res));
          }
        },
        (err) => {
          if (this.__fail) this.__fail(err);
          else console.error(err);
        }
      );
    }
  };
}

// Override pemanggilan: kita butuh "proxy" agar `gsRun('fn', a, b)` bekerja
// dengan chaining .withSuccessHandler().withFailureHandler().
// Karena chaining harus dipanggil SEBELUM eksekusi, kita bikin lazy.
function gs(action, ...args) {
  let successCb = null;
  let failCb = null;

  let params;
  if (args.length === 0) params = {};
  else if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) params = args[0];
  else params = args;

  const runner = {
    withSuccessHandler(cb) { successCb = cb; return runner; },
    withFailureHandler(cb) { failCb = cb; return runner; },
    then(resolve, reject) {
      return apiCall(action, params).then(
        (res) => {
          const str = (typeof res === 'string') ? res : JSON.stringify(res);
          if (successCb) successCb(str);
          if (resolve) resolve(res);
        },
        (err) => {
          if (failCb) failCb(err);
          if (reject) reject(err);
        }
      );
    }
  };

  // Eksekusi otomatis pada tick berikutnya (meniru chaining google.script.run)
  Promise.resolve().then(() => runner.then());

  return runner;
}
