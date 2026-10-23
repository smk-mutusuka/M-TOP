/**
 * ============================================================
 * API.JS — Client GAS (pengganti google.script.run)
 * ============================================================
 */

// ⚠️ WAJIB GANTI dengan URL deployment GAS kamu
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbynlrTK1-hqtmJlhA4oYbz2Ns4V6wOvZOPhTh-646YpijBJ4oEvtc0btuUaMU0zbVbBWQ/exec';

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
// CORE API CALL
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
      // text/plain → tidak trigger CORS preflight
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

  if (json && json.code === 'AUTH_REQUIRED') {
    clearSession();
    if (typeof window.__onSessionExpired === 'function') window.__onSessionExpired();
    throw new Error(json.message || 'Sesi habis.');
  }

  return json;
}

// ============================================
// SHIM: google.script.run PALSU
// (agar kode lama tetap jalan tanpa diubah)
// ============================================
window.google = window.google || {};
window.google.script = window.google.script || {};

window.google.script.run = (function() {
  let successCb = null;
  let failCb = null;

  const base = {
    withSuccessHandler: function(cb) { successCb = cb; return proxy; },
    withFailureHandler: function(cb) { failCb = cb; return proxy; }
  };

  const proxy = new Proxy(base, {
    get: function(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop !== 'string') return undefined;

      // prop = nama action
      return function() {
        const args = Array.prototype.slice.call(arguments);
        let params;
        if (args.length === 0) params = {};
        else if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) params = args[0];
        else params = args;

        // Snapshot lalu reset (biar tidak bocor ke call berikutnya)
        const ls = successCb;
        const lf = failCb;
        successCb = null;
        failCb = null;

        apiCall(prop, params).then(
          function(res) {
            if (ls) ls(typeof res === 'string' ? res : JSON.stringify(res));
          },
          function(err) {
            if (lf) lf(err);
            else console.error('API error [' + prop + ']:', err);
          }
        );
      };
    }
  });

  return proxy;
})();
