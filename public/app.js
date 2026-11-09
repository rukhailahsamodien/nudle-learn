/* Nudle Learn — single-page front end (vanilla JS, hash routing).
 * UI/UX building blocks live at the top (icons, states, forms, tables, modal, toast);
 * pages follow (login, admin, learner); the simulation engine and router are at the end. */
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app');
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // =====================================================================
  // Icons — one consistent inline SVG set (stroke icons, 24px grid).
  // Decorative by default (aria-hidden); meaning is always also given in text.
  // =====================================================================
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    userOff: '<circle cx="9" cy="7" r="4"/><path d="M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M17 8l5 5M22 8l-5 5"/>',
    userOn: '<circle cx="9" cy="7" r="4"/><path d="M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M16 11l2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    play: '<path d="m6 4 14 8-14 8z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    flask: '<path d="M9 3h6M10 3v6L4 19a2 2 0 0 0 1.7 3h12.6A2 2 0 0 0 20 19l-6-10V3"/><path d="M7 15h10"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.9 17.9A10 10 0 0 1 12 19c-6.5 0-10-7-10-7a18 18 0 0 1 5.1-5.9M9.9 4.2A9 9 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"/>',
    sort: '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    wifiOff: '<path d="M1 1l22 22M16.7 11.1A11 11 0 0 1 19 12.6M5 12.6a11 11 0 0 1 5.2-2.5M10.7 5.1A16 16 0 0 1 22.6 9M1.4 9a16 16 0 0 1 4.4-2.8M8.5 16.1a5 5 0 0 1 7 0M12 20h.01"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.5M7.8 16.2a6 6 0 0 1 0-8.5M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  };
  const icon = (name, { size = 18, label, cls = '' } = {}) =>
    `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"'}>${ICONS[name] || ''}</svg>`;
  const logo = (size = 32) => `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" fill="#6d28d9"/>
      <path d="M8 23c3-8 6-12 8-12s4 3 4 6" fill="none" stroke="#ebfff8" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="22.5" cy="20" r="2.6" fill="#ebfff8"/></svg>`;

  // =====================================================================
  // API client
  // =====================================================================
  const state = { token: localStorage.getItem('nudle_token'), user: null };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const newKey = () => (window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`).replace(/[^A-Za-z0-9_-]/g, '');
  // Robust fetch wrapper:
  //  - aborts after `timeoutMs` so the UI never hangs on a stalled connection
  //  - retries safe requests (GET/PUT, or POSTs carrying an Idempotency-Key) on network errors and 502/503/504,
  //    with exponential backoff — the key guarantees a retried POST is never applied twice on the server
  async function api(path, { method = 'GET', body, idempotencyKey, retries, timeoutMs = 15000, raw = false } = {}) {
    const safe = method === 'GET' || method === 'PUT' || method === 'DELETE' || !!idempotencyKey;
    const maxRetries = retries ?? (safe ? 2 : 0);
    for (let attempt = 0; ; attempt++) {
      const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      let res;
      try {
        res = await fetch(path, {
          method, signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch (err) {
        clearTimeout(timer);
        if (attempt < maxRetries) { await sleep(400 * 2 ** attempt); continue; }
        const e = new Error(err.name === 'AbortError' ? 'The server took too long to respond. Please try again.'
          : navigator.onLine === false ? 'You appear to be offline. Check your connection and try again.'
          : 'Could not reach the server. Check your connection and try again.');
        e.network = true; throw e;
      }
      clearTimeout(timer);
      if ([502, 503, 504].includes(res.status) && attempt < maxRetries) { await sleep(400 * 2 ** attempt); continue; }
      if (res.status === 401 && !path.includes('/auth/login')) { logout(true); const e = new Error('Your session has expired. Please log in again.'); e.status = 401; throw e; }
      if (raw && res.ok) return res;
      if (res.status === 204) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { const e = new Error(data.error || `Request failed (${res.status})`); e.code = data.code; e.status = res.status; throw e; }
      return data;
    }
  }
  // Downloads a file from an authenticated endpoint (e.g. CSV reports).
  async function download(path) {
    const res = await api(path, { raw: true });
    const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'download.csv';
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    return name;
  }
  const exportButton = (id, label = 'Export CSV') => `<button class="btn" id="${id}">${icon('download')}${label}</button>`;
  function bindExport(btn, path) {
    if (!btn) return;
    btn.onclick = () => busy(btn, 'Preparing…', async () => {
      try { toast(`Downloaded ${await download(path)}`); } catch (ex) { toast(ex.message, 'error'); }
    });
  }

  // Live updates: a streaming fetch to the Server-Sent Events endpoint (keeps the token out of the URL),
  // reconnecting with backoff if the connection drops.
  let liveCtrl = null, liveStatus = 'connecting';
  function stopLive() { if (liveCtrl) { liveCtrl.abort(); liveCtrl = null; } }
  function startLive(onEvent) {
    stopLive();
    const ctrl = new AbortController(); liveCtrl = ctrl;
    const setStatus = (st) => {
      liveStatus = st;
      $$('.live-chip').forEach(chip => { chip.className = `live-chip ${st}`; $('.live-text', chip).textContent = st === 'live' ? 'Live' : st === 'connecting' ? 'Connecting…' : 'Reconnecting…'; });
    };
    (async () => {
      let delay = 1000;
      while (!ctrl.signal.aborted) {
        try {
          const res = await fetch('/api/admin/events', { headers: { Authorization: `Bearer ${state.token}` }, signal: ctrl.signal });
          if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
          setStatus('live'); delay = 1000;
          const reader = res.body.getReader(), dec = new TextDecoder(); let buf = '';
          for (;;) {
            const { value, done } = await reader.read(); if (done) break;
            buf += dec.decode(value, { stream: true });
            let i;
            while ((i = buf.indexOf('\n\n')) >= 0) {
              const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
              const ev = /^event: (.*)$/m.exec(chunk)?.[1], data = /^data: (.*)$/m.exec(chunk)?.[1];
              if (ev === 'change' && data) { try { onEvent(JSON.parse(data)); } catch { /* ignore a bad message */ } }
            }
          }
        } catch { if (ctrl.signal.aborted) return; }
        if (ctrl.signal.aborted) return;
        setStatus('reconnecting'); await sleep(delay); delay = Math.min(delay * 2, 15000);
      }
    })();
  }
  const liveChip = () => `<span class="live-chip ${liveStatus}" role="status"><i aria-hidden="true"></i><span class="live-text">${liveStatus === 'live' ? 'Live' : 'Connecting…'}</span></span>`;
  const fmtTime = (d) => { const dt = new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z'); return dt.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
  const timeAgo = (iso) => { const s = Math.round((Date.now() - new Date(iso)) / 1000); return s < 10 ? 'just now' : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : fmtTime(iso); };

  function logout(expired = false) {
    state.token = null; state.user = null;
    localStorage.removeItem('nudle_token');
    if (expired) sessionStorage.setItem('nudle_notice', 'Your session has expired. Please log in again.');
    location.hash = '#/login';
  }

  // =====================================================================
  // Feedback: toast, loading skeletons, empty & error states
  // =====================================================================
  let toastTimer;
  function toast(msg, type = 'success') {
    const t = $('#toast');
    const kind = type === true ? 'error' : type; // backwards compatible toast(msg, true)
    t.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    t.innerHTML = `${icon(kind === 'error' ? 'alert' : 'checkCircle')}<span>${esc(msg)}</span>`;
    t.className = `show ${kind}`;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = ''), 3800);
  }

  const skeleton = ({ stats = 4, cards = 2, table = true } = {}) => `
    <div class="skeleton-page" aria-busy="true" aria-live="polite"><span class="sr-only">Loading…</span>
      <div class="sk sk-title"></div><div class="sk sk-sub"></div>
      ${stats ? `<div class="grid grid-4">${'<div class="card"><div class="sk sk-line w40"></div><div class="sk sk-big"></div><div class="sk sk-line w60"></div></div>'.repeat(stats)}</div>` : ''}
      ${cards ? `<div class="grid grid-2 mt">${'<div class="card"><div class="sk sk-line w40"></div><div class="sk sk-block"></div></div>'.repeat(cards)}</div>` : ''}
      ${table ? `<div class="card mt"><div class="sk sk-line w30"></div>${'<div class="sk sk-row"></div>'.repeat(5)}</div>` : ''}
    </div>`;

  const emptyState = ({ ico = 'inbox', title, text = '', action = '' }) => `
    <div class="empty-state"><div class="empty-icon">${icon(ico, { size: 28 })}</div>
      <h3>${esc(title)}</h3>${text ? `<p class="muted">${esc(text)}</p>` : ''}${action}</div>`;

  function errorState(main, err, retry) {
    main.innerHTML = `<div class="card error-state" role="alert">
      <div class="empty-icon danger">${icon('alert', { size: 28 })}</div>
      <h2>Something went wrong</h2><p class="muted">${esc(err.message)}</p>
      <div class="row center"><button class="btn btn-primary" id="retry-btn">${icon('refresh')}Try again</button>
      <a class="btn" href="${state.user?.role === 'admin' ? '#/admin' : '#/learn'}">${icon('home')}Go to dashboard</a></div></div>`;
    $('#retry-btn').onclick = retry;
    $('#retry-btn').focus();
  }

  // Disables a button and shows a spinner while an async action runs (prevents double submits).
  async function busy(btn, label, fn) {
    if (!btn || btn.disabled) return;
    const html = btn.innerHTML;
    btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(label)}`;
    try { return await fn(); }
    finally { if (btn.isConnected) { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = html; } }
  }

  // =====================================================================
  // Forms — labelled fields, required markers, per-field errors
  // =====================================================================
  function field({ id, label, type = 'text', value = '', required = false, hint = '', attrs = '', textarea = false, options = null }) {
    const describedBy = [hint ? `${id}-hint` : '', `${id}-err`].filter(Boolean).join(' ');
    const common = `id="${id}" name="${id}" ${required ? 'required aria-required="true"' : ''} aria-describedby="${describedBy}" ${attrs}`;
    let control;
    if (options) control = `<select ${common}>${options.map(([v, l, sel]) => `<option value="${esc(v)}" ${sel ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    else if (textarea) control = `<textarea ${common}>${esc(value)}</textarea>`;
    else control = `<input type="${type}" value="${esc(value)}" ${common}>`;
    return `<div class="field" data-field="${id}">
      <label for="${id}">${esc(label)}${required ? ' <span class="req" aria-hidden="true">*</span>' : ' <span class="opt">(optional)</span>'}</label>
      ${control}${hint ? `<p class="hint" id="${id}-hint">${esc(hint)}</p>` : ''}<p class="field-error" id="${id}-err" aria-live="polite"></p></div>`;
  }
  // errors: { fieldId: message }. Marks fields invalid, focuses the first one, returns true if any.
  function showErrors(form, errors, summaryEl) {
    $$('.field', form).forEach(f => { f.classList.remove('invalid'); const c = $('input,select,textarea', f); if (c) c.removeAttribute('aria-invalid'); const e = $('.field-error', f); if (e) e.textContent = ''; });
    const entries = Object.entries(errors);
    entries.forEach(([id, msg]) => {
      const f = $(`[data-field="${id}"]`, form); if (!f) return;
      f.classList.add('invalid'); $('input,select,textarea', f)?.setAttribute('aria-invalid', 'true'); $('.field-error', f).textContent = msg;
    });
    if (summaryEl) summaryEl.innerHTML = entries.length ? `${icon('alert')}<span>Please fix ${entries.length} highlighted field${entries.length > 1 ? 's' : ''}.</span>` : '';
    if (entries.length) $(`#${entries[0][0]}`, form)?.focus();
    return entries.length > 0;
  }
  // Maps a server validation message onto the most likely field, so errors still appear inline.
  function serverErrorToField(message, map) {
    const m = message.toLowerCase();
    for (const [needle, id] of map) if (m.includes(needle)) return { [id]: message };
    return null;
  }
  const formAlert = (id) => `<div class="form-alert" id="${id}" role="alert"></div>`;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // =====================================================================
  // Modal — focus trap, Escape to close, focus returns to the trigger
  // =====================================================================
  function modal(html, { wide = false, title = 'Dialog' } = {}) {
    const root = $('#modal-root');
    const opener = document.activeElement;
    root.innerHTML = `<div class="modal-backdrop"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${html}</div></div>`;
    const el = $('.modal', root);
    const t = $('h2', el); if (t) t.id = 'modal-title'; else el.setAttribute('aria-label', title);
    document.body.classList.add('modal-open');
    const focusables = () => $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', el).filter(x => x.offsetParent !== null);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const handle = { el, close, onClose: null };
    function close() {
      if (!root.contains(el)) return;
      root.innerHTML = ''; document.body.classList.remove('modal-open');
      if (handle.onClose) handle.onClose();
      document.removeEventListener('keydown', onKey, true);
      if (opener && opener.isConnected) opener.focus();
    }
    document.addEventListener('keydown', onKey, true);
    $('.modal-backdrop', root).addEventListener('mousedown', (e) => { if (e.target.classList.contains('modal-backdrop')) close(); });
    $$('[data-close]', root).forEach(b => b.addEventListener('click', close));
    (focusables().find(x => !x.classList.contains('close-x')) || el).focus();
    return handle;
  }
  const modalHead = (title, sub = '') => `<div class="modal-head"><div><h2>${esc(title)}</h2>${sub ? `<p class="muted small">${esc(sub)}</p>` : ''}</div>
    <button type="button" class="close-x" data-close aria-label="Close dialog">${icon('x', { size: 20 })}</button></div>`;

  function confirmDialog(message, okLabel = 'Confirm', danger = true) {
    return new Promise(resolve => {
      const m = modal(`${modalHead('Please confirm')}<p>${esc(message)}</p>
        <div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}" id="ok">${esc(okLabel)}</button></div>`);
      let done = false; const finish = (v) => { if (!done) { done = true; resolve(v); } };
      m.onClose = () => finish(false);
      $('#ok', m.el).onclick = () => { finish(true); m.close(); };
      $('#ok', m.el).focus();
    });
  }

  // =====================================================================
  // Tables — sortable headers, keyboard-operable rows, mobile card layout
  // =====================================================================
  function enhanceTables(root) {
    $$('table', root).forEach(table => {
      const heads = $$('thead th', table).map(th => th.textContent.trim());
      $$('tbody tr', table).forEach(tr => $$('td', tr).forEach((td, i) => { if (heads[i] && !td.hasAttribute('data-label')) td.setAttribute('data-label', heads[i]); }));
      // Row links: reachable and operable by keyboard, announced as links.
      $$('tr[data-href]', table).forEach(tr => {
        tr.tabIndex = 0; tr.setAttribute('role', 'link');
        tr.setAttribute('aria-label', tr.dataset.label || `Open ${$('strong', tr)?.textContent || 'details'}`);
        tr.addEventListener('click', (e) => { if (!e.target.closest('button,a')) location.hash = tr.dataset.href; });
        tr.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === tr) { e.preventDefault(); location.hash = tr.dataset.href; } });
      });
      // Sorting: <th data-sort="text|num"> becomes a button; cells may provide data-v for the sort value.
      $$('thead th[data-sort]', table).forEach((th, _, all) => {
        const col = [...th.parentNode.children].indexOf(th);
        th.innerHTML = `<button type="button" class="sort-btn">${esc(th.textContent)}${icon('sort', { size: 14 })}</button>`;
        th.setAttribute('aria-sort', 'none');
        $('button', th).onclick = () => {
          const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
          all.forEach(o => o.setAttribute('aria-sort', 'none')); th.setAttribute('aria-sort', dir);
          const tbody = $('tbody', table);
          const val = (tr) => { const td = tr.children[col]; const v = td?.dataset.v ?? td?.textContent.trim() ?? ''; return th.dataset.sort === 'num' ? (v === '' || v === '—' ? -Infinity : parseFloat(v)) : v.toLowerCase(); };
          const rows = $$('tr', tbody).filter(r => !r.querySelector('.empty-state'));
          rows.sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * (dir === 'ascending' ? 1 : -1); });
          rows.forEach(r => tbody.appendChild(r));
          announce(`Sorted by ${th.textContent.trim()}, ${dir}`);
        };
      });
    });
  }
  const announce = (msg) => { const a = $('#sr-announcer'); if (a) { a.textContent = ''; setTimeout(() => (a.textContent = msg), 30); } };

  // =====================================================================
  // Shared display helpers
  // =====================================================================
  const initials = (n) => esc(String(n).split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase());
  const fmtDate = (d) => d ? new Date(d.length <= 10 ? d + 'T00:00:00' : (d.includes('T') ? d : d.replace(' ', 'T') + 'Z')).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const isOverdue = (a) => a.status !== 'completed' && a.due_date && a.due_date < new Date().toISOString().slice(0, 10);
  // Status always pairs colour with an icon + text, so it never relies on colour alone.
  const statusBadge = (a) => {
    if (isOverdue(a)) return `<span class="badge b-danger">${icon('alert', { size: 12 })}Overdue</span>`;
    return {
      completed: `<span class="badge b-success">${icon('check', { size: 12 })}Completed</span>`,
      in_progress: `<span class="badge b-warning">${icon('clock', { size: 12 })}In progress</span>`,
      assigned: '<span class="badge b-neutral">Not started</span>',
    }[a.status];
  };
  const TYPE_META = { lesson: ['b-navy', 'book', 'Lesson'], quiz: ['b-primary', 'help', 'Quiz'], simulation: ['b-purple-solid', 'flask', 'Simulation'] };
  const typeBadge = (t) => { const [cls, ico, label] = TYPE_META[t]; return `<span class="badge ${cls}">${icon(ico, { size: 12 })}${label}</span>`; };
  const activeBadge = (on) => on ? `<span class="badge b-success">${icon('check', { size: 12 })}Active</span>` : '<span class="badge b-neutral">Deactivated</span>';
  const progress = (pct, cls = '', label = 'Progress') => `<div class="progress ${cls}" role="progressbar" aria-label="${esc(label)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>`;
  const statCard = (label, value, sub, ico) => `<div class="card stat"><span class="stat-icon">${icon(ico, { size: 20 })}</span>
    <div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="sub">${esc(sub)}</div></div>`;
  const crumbs = (items) => `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${items.map(([label, href], i) =>
    `<li>${href ? `<a href="${href}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`}${i < items.length - 1 ? icon('chevron', { size: 14 }) : ''}</li>`).join('')}</ol></nav>`;
  function donut(segments, label) {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const r = 52, c = 2 * Math.PI * r; let offset = 0;
    const arcs = segments.map(s => {
      const len = (s.value / total) * c;
      const el = `<circle r="${r}" cx="70" cy="70" fill="none" stroke="${s.color}" stroke-width="18" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 70 70)"/>`;
      offset += len; return el;
    }).join('');
    return `<svg class="donut" viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="${esc(label)}"><circle r="${r}" cx="70" cy="70" fill="none" stroke="#eceef3" stroke-width="18"/>${arcs}</svg>`;
  }
  const PLANETS = {
    earth: { label: 'Earth', g: 9.8, sky: ['#1b2550', '#4c2a8f', '#b9a3f0'], hills: ['rgba(109,40,217,.35)', 'rgba(20,33,61,.45)'], ground: ['#14213d', '#0c1630'] },
    moon: { label: 'Moon', g: 1.62, sky: ['#05070f', '#141a2e', '#2b3352'], hills: ['rgba(148,163,184,.25)', 'rgba(203,213,225,.35)'], ground: ['#475569', '#1e293b'] },
    mars: { label: 'Mars', g: 3.71, sky: ['#2a1325', '#7c2d3a', '#e8916b'], hills: ['rgba(180,83,9,.35)', 'rgba(124,45,18,.5)'], ground: ['#7c2d12', '#431407'] },
    jupiter: { label: 'Jupiter', g: 24.79, sky: ['#1e1b2e', '#7a4b2a', '#e6b980'], hills: ['rgba(234,179,8,.25)', 'rgba(146,64,14,.45)'], ground: ['#78350f', '#451a03'] },
    custom: { label: 'Custom world', g: null, sky: ['#0f172a', '#334155', '#94a3b8'], hills: ['rgba(109,40,217,.3)', 'rgba(20,33,61,.45)'], ground: ['#1f2937', '#111827'] },
  };
  const ACTION_LABELS = {
    'auth.login': 'Logged in', 'auth.login_failed': 'Failed login', 'learner.create': 'Learner added', 'learner.update': 'Learner updated',
    'learner.deactivate': 'Learner deactivated', 'learner.reactivate': 'Learner reactivated', 'activity.create': 'Activity created',
    'activity.update': 'Activity updated', 'activity.delete': 'Activity deleted', 'assignment.create': 'Assigned', 'assignment.delete': 'Unassigned',
    'attempt.pass': 'Completed', 'attempt.fail': 'Attempt (not passed)', 'simulation.launch': 'Simulation launch', 'report.export': 'Report exported',
  };
  const actionLabel = (a) => ACTION_LABELS[a] || a;
  const actionTone = (a) => a === 'auth.login_failed' || a === 'activity.delete' || a === 'learner.deactivate' ? 'danger' : a === 'attempt.pass' ? 'success' : a === 'attempt.fail' ? 'warning' : 'brand';
  const STATUS_COLORS = { completed: '#16a34a', in_progress: '#d97706', not_started: '#c5cad6', overdue: '#dc2626' };

  // =====================================================================
  // Layout shell — sidebar, mobile drawer, skip link, page title
  // =====================================================================
  function shell(active, content, title) {
    document.title = `${title ? title + ' · ' : ''}Nudle Learn`;
    const isAdmin = state.user.role === 'admin';
    const links = isAdmin
      ? [['#/admin', 'dashboard', 'dashboard', 'Dashboard'], ['#/admin/learners', 'learners', 'users', 'Learners'], ['#/admin/activities', 'activities', 'layers', 'Activities'],
         ['#/admin/analytics', 'analytics', 'chart', 'Analytics'], ['#/admin/audit', 'audit', 'history', 'Audit log']]
      : [['#/learn', 'dashboard', 'home', 'My activities'], ['#/learn/progress', 'progress', 'chart', 'My progress']];
    app.innerHTML = `
      <button class="skip-link" id="skip">Skip to main content</button>
      <header class="topbar"><a class="brand" href="${links[0][0]}">${logo(28)}<span>Nudle Learn</span></a>
        <button class="icon-btn" id="menu" aria-label="Open navigation menu" aria-expanded="false" aria-controls="sidebar">${icon('menu', { size: 22 })}</button></header>
      <div class="drawer-backdrop" id="drawer-backdrop" hidden></div>
      <div class="shell">
        <aside class="sidebar" id="sidebar" aria-label="Main navigation">
          <a class="brand" href="${links[0][0]}">${logo()}<span>Nudle Learn</span></a>
          <nav class="nav"><ul>${links.map(([href, key, ico, label]) => `<li><a href="${href}" class="${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''}>${icon(ico, { size: 20 })}<span>${label}</span></a></li>`).join('')}</ul></nav>
          <div class="spacer"></div>
          <div class="user-chip"><span class="avatar">${initials(state.user.name)}</span>
            <div class="who"><strong>${esc(state.user.name)}</strong><span>${isAdmin ? 'Administrator' : 'Learner'}</span></div>
            <button class="icon-btn" id="logout" aria-label="Log out" title="Log out">${icon('logout', { size: 20 })}</button></div>
        </aside>
        <main class="main" id="main" tabindex="-1">${content}</main>
      </div>
      <div id="sr-announcer" class="sr-only" aria-live="polite"></div>`;
    const sidebar = $('#sidebar'), menu = $('#menu'), backdrop = $('#drawer-backdrop');
    const setDrawer = (open) => {
      sidebar.classList.toggle('open', open); backdrop.hidden = !open;
      menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      if (open) $('.nav a', sidebar).focus();
    };
    menu.onclick = () => setDrawer(!sidebar.classList.contains('open'));
    backdrop.onclick = () => { setDrawer(false); menu.focus(); };
    sidebar.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sidebar.classList.contains('open')) { setDrawer(false); menu.focus(); } });
    $$('.nav a', sidebar).forEach(a => a.addEventListener('click', () => setDrawer(false)));
    $('#logout').onclick = async () => { if (await confirmDialog('Log out of Nudle Learn?', 'Log out', false)) { logout(); toast('You have been logged out'); } };
    $('#skip').onclick = () => $('#main').focus();
    return $('#main');
  }

  // Runs a page loader with skeleton → content, or a retryable error state.
  async function page(active, title, skel, render) {
    const main = shell(active, skeleton(skel), title);
    try { await render(main); enhanceTables(main); }
    catch (err) { if (err.status !== 401) errorState(main, err, () => page(active, title, skel, render)); }
  }

  // =====================================================================
  // Login
  // =====================================================================
  function renderLogin() {
    document.title = 'Sign in · Nudle Learn';
    const notice = sessionStorage.getItem('nudle_notice'); sessionStorage.removeItem('nudle_notice');
    app.innerHTML = `
      <div class="login-wrap">
        <aside class="login-hero" aria-label="About Nudle Learn">
          <div class="brand">${logo(36)}<span>Nudle Learn</span></div>
          <div><h1>Interactive learning, managed in one place.</h1>
            <p>Assign simulations, lessons and quizzes to your learners and track their progress in real time.</p>
            <ul class="hero-points"><li>${icon('flask')}Hands-on simulations</li><li>${icon('chart')}Live progress tracking</li><li>${icon('users')}Built for classrooms</li></ul></div>
          <p class="small">© Nudle Learning Platform</p>
        </aside>
        <main class="login-form" id="main"><div class="card">
          <h2 class="login-title">Welcome back</h2><p class="muted">Sign in to continue</p>
          ${notice ? `<div class="form-alert show-info" role="status">${icon('alert')}<span>${esc(notice)}</span></div>` : ''}
          <form id="login-form" novalidate>
            ${formAlert('login-alert')}
            ${field({ id: 'email', label: 'Email', type: 'email', required: true, attrs: 'autocomplete="username" inputmode="email"' })}
            <div class="field" data-field="password"><label for="password">Password <span class="req" aria-hidden="true">*</span></label>
              <div class="input-group"><input id="password" type="password" autocomplete="current-password" required aria-required="true" aria-describedby="password-err">
              <button type="button" class="icon-btn" id="toggle-pw" aria-label="Show password" aria-pressed="false">${icon('eye')}</button></div>
              <p class="field-error" id="password-err" aria-live="polite"></p></div>
            <button class="btn btn-primary btn-block" type="submit" id="login-btn">Sign in</button>
          </form>
          <div class="demo"><strong>Try a demo account</strong><p class="small muted">Fills in the form for you.</p>
            <div class="row"><button type="button" class="btn btn-sm" data-demo="admin@nudle.edu|admin123">${icon('dashboard', { size: 16 })}Administrator</button>
            <button type="button" class="btn btn-sm" data-demo="amara@nudle.edu|learner123">${icon('book', { size: 16 })}Learner</button></div>
          </div>
        </div></main>
      </div>`;
    const form = $('#login-form');
    $('#toggle-pw').onclick = (e) => {
      const pw = $('#password'), show = pw.type === 'password'; pw.type = show ? 'text' : 'password';
      e.currentTarget.setAttribute('aria-pressed', String(show)); e.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      e.currentTarget.innerHTML = icon(show ? 'eyeOff' : 'eye');
    };
    $$('[data-demo]').forEach(b => b.onclick = () => { const [e, p] = b.dataset.demo.split('|'); $('#email').value = e; $('#password').value = p; showErrors(form, {}, $('#login-alert')); $('#login-btn').focus(); });
    form.onsubmit = (e) => {
      e.preventDefault();
      const email = $('#email').value.trim(), password = $('#password').value;
      const errors = {};
      if (!email) errors.email = 'Enter your email address';
      else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email, like name@school.edu';
      if (!password) errors.password = 'Enter your password';
      if (showErrors(form, errors, $('#login-alert'))) return;
      busy($('#login-btn'), 'Signing in…', async () => {
        try {
          const data = await api('/api/auth/login', { method: 'POST', body: { email, password } });
          state.token = data.token; state.user = data.user; localStorage.setItem('nudle_token', data.token);
          toast(`Welcome back, ${data.user.name.split(' ')[0]}!`);
          location.hash = data.user.role === 'admin' ? '#/admin' : '#/learn';
        } catch (ex) {
          $('#login-alert').innerHTML = `${icon('alert')}<span>${esc(ex.message)}</span>`;
          $('#password').value = ''; $('#password').focus();
        }
      });
    };
  }

  // =====================================================================
  // ADMIN — Dashboard
  // =====================================================================
  const liveFeed = []; let lastStats = null;
  const adminDashboard = () => page('dashboard', 'Dashboard', {}, async (main) => {
    const render = async (fresh = false) => {
      const [s, acts] = await Promise.all([api('/api/admin/stats'), api('/api/activities')]);
      main.innerHTML = `
      <div class="page-head"><div><h1>Dashboard ${liveChip()}</h1><p class="muted">Overview of learners and activity performance · updates automatically</p></div>
        <div class="row"><a class="btn" href="#/admin/analytics">${icon('chart')}Analytics</a><a class="btn btn-primary" href="#/admin/activities?new=1">${icon('plus')}New activity</a></div></div>
      <div class="grid grid-4">
        ${statCard('Total learners', s.totalLearners, `${s.inactiveLearners} deactivated`, 'users')}
        ${statCard('Active learners', s.activeLearners, s.totalLearners ? `${Math.round(s.activeLearners / s.totalLearners * 100)}% of all learners` : 'No learners yet', 'userOn')}
        ${statCard('Assigned activities', s.assignedActivities, `${s.totalActivities} activities in library`, 'layers')}
        ${statCard('Completion rate', s.completionRate + '%', s.averageScore != null ? `Average score ${s.averageScore}%` : 'No completions yet', 'target')}
      </div>
      <div class="grid grid-2 mt">
        <section class="card" aria-labelledby="h-status"><h2 id="h-status">Assignment status</h2>
          <div class="donut-row">
            ${donut([{ value: s.completed, color: STATUS_COLORS.completed }, { value: s.inProgress, color: STATUS_COLORS.in_progress }, { value: s.notStarted, color: STATUS_COLORS.not_started }],
              `${s.completed} completed, ${s.inProgress} in progress, ${s.notStarted} not started`)}
            <ul class="legend">
              <li><i style="background:${STATUS_COLORS.completed}"></i>Completed <strong>${s.completed}</strong></li>
              <li><i style="background:${STATUS_COLORS.in_progress}"></i>In progress <strong>${s.inProgress}</strong></li>
              <li><i style="background:${STATUS_COLORS.not_started}"></i>Not started <strong>${s.notStarted}</strong></li>
              <li><i style="background:${STATUS_COLORS.overdue}"></i>Overdue <strong>${s.overdue}</strong></li>
            </ul></div></section>
        <section class="card" aria-labelledby="h-subj"><h2 id="h-subj">Completion by subject</h2>
          ${s.bySubject.map(r => `<div class="bar-row"><span>${esc(r.subject)}</span>${progress(r.completionRate, 'success', `${r.subject} completion`)}<strong>${r.completionRate}%</strong></div>`).join('')
            || emptyState({ ico: 'chart', title: 'No data yet', text: 'Assign activities to see completion by subject.' })}
        </section>
      </div>
      <div class="grid grid-2 mt">
        <section class="card" aria-labelledby="h-acts"><h2 id="h-acts">Activity completion statistics</h2>
          ${acts.length ? `<div class="table-wrap"><table class="responsive"><thead><tr><th data-sort="text">Activity</th><th data-sort="num">Assigned</th><th data-sort="num">Completion</th><th data-sort="num">Avg score</th></tr></thead><tbody>
          ${acts.map(a => `<tr data-href="#/admin/activities/${a.id}"><td data-v="${esc(a.title)}"><strong>${esc(a.title)}</strong><div>${typeBadge(a.type)}</div></td><td>${a.assigned}</td>
            <td data-v="${a.completionRate}"><div class="cell-progress">${progress(a.completionRate, 'success', `${a.title} completion`)}<span class="small muted">${a.completed}/${a.assigned} · ${a.completionRate}%</span></div></td>
            <td data-v="${a.avg_score ?? ''}">${a.avg_score != null ? a.avg_score + '%' : '—'}</td></tr>`).join('')}
          </tbody></table></div>` : emptyState({ ico: 'layers', title: 'No activities yet', action: '<a class="btn btn-primary" href="#/admin/activities?new=1">Create activity</a>' })}</section>
        <section class="card" aria-labelledby="h-live"><h2 id="h-live" class="with-icon">${icon('radio')}Live activity</h2>
          ${liveFeed.length ? `<ul class="feed live-feed">${liveFeed.map((e, k) => `<li class="person ${k === 0 && fresh ? 'flash' : ''}"><span class="avatar">${initials(e.actor?.name || '?')}</span>
            <div class="grow"><span>${esc(e.summary)}</span><div class="small muted">${timeAgo(e.at)}</div></div></li>`).join('')}</ul>`
            : `<p class="muted small">Waiting for activity… Launches, submissions and admin changes appear here instantly.</p>`}
          <h2 id="h-recent" class="mt">Recent completions</h2>
          ${s.recent.length ? `<ul class="feed">${s.recent.map(r => `<li class="person"><span class="avatar">${initials(r.learner)}</span>
            <div class="grow"><strong>${esc(r.learner)}</strong><div class="small muted">${esc(r.activity)} · ${fmtDate(r.completed_at)}</div></div><span class="badge b-success">${r.score}%</span></li>`).join('')}</ul>`
            : emptyState({ ico: 'trophy', title: 'No completions yet', text: 'Completed activities will appear here.' })}
        </section>
      </div>`;
      // Briefly highlight any number that changed since the last render.
      const vals = [s.totalLearners, s.activeLearners, s.assignedActivities, s.completionRate];
      if (lastStats) $$('.stat', main).slice(0, 4).forEach((el, k) => { if (vals[k] !== lastStats[k]) el.classList.add('bump'); });
      lastStats = vals;
      enhanceTables(main);
    };
    lastStats = null;
    await render();
    let t;
    startLive((e) => {
      liveFeed.unshift(e); liveFeed.length = Math.min(liveFeed.length, 6);
      announce(e.summary);
      clearTimeout(t); t = setTimeout(() => { if ($('#h-live')) render(true).catch(() => {}); }, 250);
    });
  });

  // =====================================================================
  // ADMIN — Learners
  // =====================================================================
  const learnerFilters = { q: '', status: 'all', cohort: '' };
  const adminLearners = () => page('learners', 'Learners', { stats: 0, cards: 0 }, async (main) => {
    const cohorts = await api('/api/cohorts');
    main.innerHTML = `
      <div class="page-head"><div><h1>Learners</h1><p class="muted">Add, edit, search, filter and deactivate learners</p></div>
        <div class="row">${exportButton('export-all')}<button class="btn btn-primary" id="add">${icon('plus')}Add learner</button></div></div>
      <div class="card">
        <div class="toolbar" role="search">
          <div class="search grow"><label for="q" class="sr-only">Search learners</label>${icon('search')}
            <input id="q" type="search" placeholder="Search by name or email…" value="${esc(learnerFilters.q)}" autocomplete="off"></div>
          <div class="filter"><label for="status" class="small">Status</label><select id="status">
            ${[['all', 'All'], ['active', 'Active'], ['inactive', 'Deactivated']].map(([v, l]) => `<option value="${v}" ${learnerFilters.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="filter"><label for="cohort" class="small">Cohort</label><select id="cohort"><option value="">All</option>
            ${cohorts.map(c => `<option ${learnerFilters.cohort === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        </div>
        <p class="small muted" id="result-count" aria-live="polite"></p>
        <div id="learner-table"></div>
      </div>`;
    let timer, reqId = 0;
    const load = async () => {
      const my = ++reqId;
      $('#learner-table').setAttribute('aria-busy', 'true'); $('#learner-table').classList.add('dim');
      try {
        const rows = await api(`/api/learners?${new URLSearchParams(learnerFilters)}`);
        if (my !== reqId) return; // ignore stale responses while typing
        const filtered = learnerFilters.q || learnerFilters.status !== 'all' || learnerFilters.cohort;
        $('#result-count').textContent = `${rows.length} learner${rows.length === 1 ? '' : 's'}${filtered ? ' match your filters' : ''}`;
        $('#learner-table').innerHTML = rows.length ? `<div class="table-wrap"><table class="responsive">
          <thead><tr><th data-sort="text">Learner</th><th data-sort="text">Cohort</th><th data-sort="num">Progress</th><th data-sort="num">Avg score</th><th data-sort="text">Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
          ${rows.map(l => `<tr data-href="#/admin/learners/${l.id}" data-label="View ${esc(l.name)}">
            <td data-v="${esc(l.name)}"><div class="person"><span class="avatar">${initials(l.name)}</span><div><strong>${esc(l.name)}</strong><div class="small muted">${esc(l.email)}</div></div></div></td>
            <td>${esc(l.cohort || '—')}</td>
            <td data-v="${l.progress}"><div class="cell-progress">${progress(l.progress, '', `${l.name} progress`)}<span class="small muted">${l.completed}/${l.assigned} completed</span></div></td>
            <td data-v="${l.avgScore ?? ''}">${l.avgScore != null ? l.avgScore + '%' : '—'}</td>
            <td data-v="${l.active ? 'active' : 'deactivated'}">${activeBadge(l.active)}</td>
            <td><div class="actions"><button class="btn btn-sm" data-edit="${l.id}" aria-label="Edit ${esc(l.name)}">${icon('edit', { size: 15 })}Edit</button>
              <button class="btn btn-sm ${l.active ? 'btn-danger' : ''}" data-toggle="${l.id}" aria-label="${l.active ? 'Deactivate' : 'Reactivate'} ${esc(l.name)}">${icon(l.active ? 'userOff' : 'userOn', { size: 15 })}${l.active ? 'Deactivate' : 'Reactivate'}</button></div></td>
          </tr>`).join('')}</tbody></table></div>`
          : filtered ? emptyState({ ico: 'search', title: 'No learners match your filters', text: 'Try a different search term or clear the filters.', action: '<button class="btn" id="clear-filters">Clear filters</button>' })
            : emptyState({ ico: 'users', title: 'No learners yet', text: 'Add your first learner to get started.', action: '<button class="btn btn-primary" id="empty-add">Add learner</button>' });
        enhanceTables($('#learner-table'));
        $('#clear-filters')?.addEventListener('click', () => { Object.assign(learnerFilters, { q: '', status: 'all', cohort: '' }); adminLearners(); });
        $('#empty-add')?.addEventListener('click', () => learnerForm(null, load));
        $$('[data-edit]').forEach(b => b.onclick = () => learnerForm(rows.find(r => r.id == b.dataset.edit), load));
        $$('[data-toggle]').forEach(b => b.onclick = async () => {
          const l = rows.find(r => r.id == b.dataset.toggle); const activate = !l.active;
          if (!activate && !(await confirmDialog(`Deactivate ${l.name}? They will be signed out and can no longer log in. Their progress is kept.`, 'Deactivate'))) return;
          await busy(b, activate ? 'Reactivating…' : 'Deactivating…', async () => {
            try { await api(`/api/learners/${l.id}/status`, { method: 'PATCH', body: { active: activate } }); toast(`${l.name} ${activate ? 'reactivated' : 'deactivated'}`); }
            catch (ex) { toast(ex.message, 'error'); }
          });
          load();
        });
      } catch (ex) {
        if (my === reqId) $('#learner-table').innerHTML = `<div class="inline-error" role="alert">${icon('alert')}<span>${esc(ex.message)}</span><button class="btn btn-sm" id="reload">Try again</button></div>`;
        $('#reload')?.addEventListener('click', load);
      } finally { if (my === reqId) { $('#learner-table').removeAttribute('aria-busy'); $('#learner-table').classList.remove('dim'); } }
    };
    $('#q').oninput = (e) => { learnerFilters.q = e.target.value; clearTimeout(timer); timer = setTimeout(load, 250); };
    $('#status').onchange = (e) => { learnerFilters.status = e.target.value; load(); };
    $('#cohort').onchange = (e) => { learnerFilters.cohort = e.target.value; load(); };
    $('#add').onclick = () => learnerForm(null, load);
    bindExport($('#export-all'), '/api/reports/learners.csv');
    await load();
  });

  function learnerForm(learner, onSaved) {
    const m = modal(`${modalHead(learner ? 'Edit learner' : 'Add learner', learner ? learner.email : 'They can log in straight away with the password you set.')}
      <form id="lf" novalidate>
        ${formAlert('lf-alert')}
        ${field({ id: 'f-name', label: 'Full name', required: true, value: learner?.name, attrs: 'autocomplete="off" maxlength="100"' })}
        ${field({ id: 'f-email', label: 'Email', type: 'email', required: true, value: learner?.email, attrs: 'autocomplete="off" maxlength="254"' })}
        <div class="form-grid">
          ${field({ id: 'f-cohort', label: 'Cohort / class', value: learner?.cohort, hint: 'e.g. Grade 10A', attrs: 'maxlength="50"' })}
          ${field({ id: 'f-pass', label: learner ? 'New password' : 'Password', type: 'password', required: !learner, hint: learner ? 'Leave blank to keep the current password' : 'At least 6 characters', attrs: 'autocomplete="new-password"' })}
        </div>
        <div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button>
          <button class="btn btn-primary" type="submit" id="lf-save">${learner ? 'Save changes' : 'Add learner'}</button></div>
      </form>`);
    const form = $('#lf', m.el);
    form.onsubmit = (e) => {
      e.preventDefault();
      const body = { name: $('#f-name').value.trim(), email: $('#f-email').value.trim(), cohort: $('#f-cohort').value.trim(), password: $('#f-pass').value };
      const errors = {};
      if (body.name.length < 2) errors['f-name'] = 'Name must be at least 2 characters';
      if (!EMAIL_RE.test(body.email)) errors['f-email'] = 'Enter a valid email, like name@school.edu';
      if ((!learner || body.password) && body.password.length < 6) errors['f-pass'] = 'Password must be at least 6 characters';
      if (showErrors(form, errors, $('#lf-alert'))) return;
      busy($('#lf-save'), 'Saving…', async () => {
        try {
          await api(learner ? `/api/learners/${learner.id}` : '/api/learners', { method: learner ? 'PUT' : 'POST', body });
          m.close(); toast(learner ? `${body.name} updated` : `${body.name} added`); onSaved();
        } catch (ex) {
          const mapped = serverErrorToField(ex.message, [['email', 'f-email'], ['name', 'f-name'], ['password', 'f-pass'], ['cohort', 'f-cohort']]);
          if (mapped) showErrors(form, mapped, $('#lf-alert')); else $('#lf-alert').innerHTML = `${icon('alert')}<span>${esc(ex.message)}</span>`;
        }
      });
    };
  }

  const adminLearnerDetail = (id) => page('learners', 'Learner', { cards: 0 }, async (main) => {
    const d = await api(`/api/learners/${id}`);
    const l = d.learner, s = d.summary;
    document.title = `${l.name} · Nudle Learn`;
    main.innerHTML = `
      ${crumbs([['Learners', '#/admin/learners'], [l.name]])}
      <div class="page-head"><div class="person"><span class="avatar avatar-lg">${initials(l.name)}</span>
        <div><h1>${esc(l.name)}</h1><p class="muted meta-line">${esc(l.email)} · ${esc(l.cohort || 'No cohort')} · ${activeBadge(l.active)}</p></div></div>
        <div class="row no-print">${exportButton('export-one')}<button class="btn" id="print">${icon('printer')}Print / PDF</button><button class="btn" id="edit">${icon('edit')}Edit</button><button class="btn btn-primary" id="assign">${icon('plus')}Assign activity</button></div></div>
      <p class="print-only small muted">Learner performance report · generated ${new Date().toLocaleString()}</p>
      <div class="grid grid-4">
        ${statCard('Assigned', s.total, `${s.notStarted} not started`, 'layers')}
        ${statCard('Completed', s.completed, `${s.inProgress} in progress`, 'checkCircle')}
        ${statCard('Completion rate', s.completionRate + '%', '', 'target')}
        ${statCard('Average score', s.averageScore != null ? s.averageScore + '%' : '—', `Last login: ${fmtDate(l.lastLogin)}`, 'star')}
      </div>
      <section class="card mt" aria-labelledby="h-asg"><h2 id="h-asg">Assigned activities</h2>
        ${d.assignments.length ? `<div class="table-wrap"><table class="responsive"><thead><tr><th data-sort="text">Activity</th><th data-sort="text">Status</th><th data-sort="text">Due</th><th data-sort="num">Best score</th><th data-sort="num">Attempts</th><th data-sort="text">Completed</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
        ${d.assignments.map(a => `<tr><td data-v="${esc(a.title)}"><strong>${esc(a.title)}</strong><div>${typeBadge(a.type)} <span class="small muted">${esc(a.subject)}</span></div></td>
          <td data-v="${a.status}">${statusBadge(a)}</td><td data-v="${a.due_date || ''}">${fmtDate(a.due_date)}</td><td data-v="${a.best_score ?? ''}">${a.best_score != null ? a.best_score + '%' : '—'}</td>
          <td>${a.attempts}</td><td data-v="${a.completed_at || ''}">${fmtDate(a.completed_at)}</td>
          <td><div class="actions"><button class="btn btn-sm btn-danger" data-unassign="${a.id}" aria-label="Remove ${esc(a.title)} from ${esc(l.name)}">${icon('trash', { size: 15 })}Remove</button></div></td></tr>`).join('')}
        </tbody></table></div>` : emptyState({ ico: 'layers', title: 'No activities assigned yet', action: '<button class="btn btn-primary" id="assign-empty">Assign an activity</button>' })}</section>
      <div class="grid grid-2 mt">
      <section class="card" aria-labelledby="h-att"><h2 id="h-att">Attempt history</h2>
        ${d.attempts.length ? `<div class="table-wrap"><table class="responsive"><thead><tr><th data-sort="text">Activity</th><th data-sort="num">Score</th><th>Result</th><th data-sort="text">Submitted</th></tr></thead><tbody>
          ${d.attempts.map(t => `<tr><td>${esc(t.title)}</td><td>${t.score}%</td><td>${t.passed ? `<span class="badge b-success">${icon('check', { size: 12 })}Passed</span>` : `<span class="badge b-danger">${icon('x', { size: 12 })}Not passed</span>`}</td><td data-v="${t.submitted_at}">${fmtDate(t.submitted_at)}</td></tr>`).join('')}
        </tbody></table></div>` : emptyState({ ico: 'clock', title: 'No attempts yet', text: 'Submissions will appear here.' })}</section>
      <section class="card" aria-labelledby="h-sim"><h2 id="h-sim">Simulation results</h2>
        ${d.simulationRuns.length ? `<div class="table-wrap"><table class="responsive"><thead><tr><th data-sort="text">Activity</th><th data-sort="num">Angle</th><th data-sort="num">Speed</th><th data-sort="num">Landed</th><th>Result</th><th data-sort="text">When</th></tr></thead><tbody>
          ${d.simulationRuns.map(r => `<tr><td>${esc(r.title)}</td><td data-v="${r.angle}">${r.angle}°</td><td data-v="${r.speed}">${r.speed} m/s</td><td data-v="${r.range_m}">${r.range_m} m <span class="small muted">/ ${r.target_m} m</span></td>
            <td>${r.hit ? `<span class="badge b-success">${icon('target', { size: 12 })}Hit</span>` : `<span class="badge b-danger">${icon('x', { size: 12 })}Miss</span>`}</td><td data-v="${r.created_at}">${fmtDate(r.created_at)}</td></tr>`).join('')}
        </tbody></table></div>` : emptyState({ ico: 'flask', title: 'No simulation launches yet', text: 'Each launch the learner makes is recorded here.' })}</section>
      </div>
      <section class="card mt" aria-labelledby="h-log"><h2 id="h-log" class="with-icon">${icon('history')}Activity history</h2>
        ${d.activityLog.length ? `<ol class="timeline">${d.activityLog.slice(0, 15).map(e => `<li><span class="tl-dot ${actionTone(e.action)}" aria-hidden="true"></span>
          <div><span>${esc(e.summary)}</span><div class="small muted">${fmtTime(e.created_at)} · ${esc(actionLabel(e.action))}${e.actor_name && e.actor_id !== l.id ? ` · by ${esc(e.actor_name)}` : ''}</div></div></li>`).join('')}</ol>
          <a class="small" href="#/admin/audit?entityId=${l.id}">See full audit log</a>`
          : emptyState({ ico: 'history', title: 'No recorded activity yet' })}</section>`;
    bindExport($('#export-one'), `/api/reports/learners/${l.id}.csv`);
    $('#print').onclick = () => window.print();
    $('#edit').onclick = () => learnerForm(l, () => adminLearnerDetail(id));
    const openAssign = async (e) => {
      const btn = e.currentTarget;
      const acts = await busy(btn, 'Loading…', () => api('/api/activities'));
      if (!acts) return;
      const taken = new Set(d.assignments.map(a => a.activity_id));
      const m = modal(`${modalHead(`Assign activity`, `to ${l.name}`)}
        <form id="af1" novalidate>${formAlert('af1-alert')}
          ${field({ id: 'a-act', label: 'Activity', required: true, options: [['', 'Choose an activity…']].concat(acts.map(a => [a.id, `${a.title} (${a.type})${taken.has(a.id) ? ' — already assigned' : ''}`])) })}
          ${field({ id: 'a-due', label: 'Due date', type: 'date', attrs: `min="${new Date().toISOString().slice(0, 10)}"` })}
          <div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" type="submit" id="a-go">Assign</button></div></form>`);
      const form = $('#af1', m.el);
      form.onsubmit = (ev) => {
        ev.preventDefault();
        const errors = {};
        if (!$('#a-act').value) errors['a-act'] = 'Choose an activity';
        else if (taken.has(+$('#a-act').value)) errors['a-act'] = 'This activity is already assigned to this learner';
        if (showErrors(form, errors, $('#af1-alert'))) return;
        busy($('#a-go'), 'Assigning…', async () => {
          try {
            await api(`/api/activities/${$('#a-act').value}/assign`, { method: 'POST', body: { learnerIds: [l.id], dueDate: $('#a-due').value || undefined } });
            m.close(); toast('Activity assigned'); adminLearnerDetail(id);
          } catch (ex) { $('#af1-alert').innerHTML = `${icon('alert')}<span>${esc(ex.message)}</span>`; }
        });
      };
    };
    $('#assign').onclick = openAssign;
    $('#assign-empty')?.addEventListener('click', openAssign);
    $$('[data-unassign]').forEach(b => b.onclick = async () => {
      if (!(await confirmDialog('Remove this assignment? The learner\'s progress on it will be deleted.', 'Remove'))) return;
      await busy(b, 'Removing…', async () => {
        try { await api(`/api/assignments/${b.dataset.unassign}`, { method: 'DELETE' }); toast('Assignment removed'); adminLearnerDetail(id); }
        catch (ex) { toast(ex.message, 'error'); }
      });
    });
  });

  // =====================================================================
  // ADMIN — Activities
  // =====================================================================
  const adminActivities = (query) => page('activities', 'Activities', { stats: 0, cards: 3, table: false }, async (main) => {
    const acts = await api('/api/activities');
    const reload = () => adminActivities(new URLSearchParams());
    main.innerHTML = `
      <div class="page-head"><div><h1>Activities</h1><p class="muted">Create interactive learning activities and assign them to learners</p></div>
        <button class="btn btn-primary" id="new">${icon('plus')}New activity</button></div>
      ${acts.length ? `<ul class="grid grid-3 card-list">${acts.map(a => `<li class="card activity-card">
          <div class="meta">${typeBadge(a.type)}<span class="badge b-neutral">${esc(a.subject)}</span><span class="small muted with-icon">${icon('clock', { size: 14 })}${a.duration_min} min</span></div>
          <h2 class="card-title">${esc(a.title)}</h2><p>${esc(a.description || '')}</p>
          <div>${progress(a.completionRate, 'success', `${a.title} completion`)}<span class="small muted">${a.completed}/${a.assigned} completed · ${a.completionRate}%${a.avg_score != null ? ` · avg ${a.avg_score}%` : ''}</span></div>
          <div class="row"><a class="btn btn-sm" href="#/admin/activities/${a.id}" aria-label="View statistics for ${esc(a.title)}">${icon('chart', { size: 15 })}Stats</a>
            <button class="btn btn-sm" data-edit="${a.id}" aria-label="Edit ${esc(a.title)}">${icon('edit', { size: 15 })}Edit</button>
            <button class="btn btn-sm btn-primary" data-assign="${a.id}" aria-label="Assign ${esc(a.title)}">${icon('users', { size: 15 })}Assign</button></div>
        </li>`).join('')}</ul>`
        : `<div class="card">${emptyState({ ico: 'layers', title: 'No activities yet', text: 'Create a lesson, quiz or simulation to assign to learners.', action: '<button class="btn btn-primary" id="empty-new">Create your first activity</button>' })}</div>`}`;
    $('#new').onclick = () => activityForm(null, reload);
    $('#empty-new')?.addEventListener('click', () => activityForm(null, reload));
    $$('[data-edit]').forEach(b => b.onclick = () => activityForm(acts.find(a => a.id == b.dataset.edit), reload));
    $$('[data-assign]').forEach(b => b.onclick = (e) => assignForm(acts.find(a => a.id == b.dataset.assign), reload, e.currentTarget));
    if (query?.get('new')) { history.replaceState(null, '', '#/admin/activities'); activityForm(null, reload); }
  });

  function activityForm(act, onSaved) {
    const c = act?.content || { sections: [{ heading: '', body: '' }], questions: [] };
    let questions = JSON.parse(JSON.stringify(c.questions || []));
    let sections = JSON.parse(JSON.stringify(c.sections?.length ? c.sections : [{ heading: '', body: '' }]));
    const m = modal(`${modalHead(act ? 'Edit activity' : 'New activity', 'Fields marked * are required')}
      <form id="af" novalidate>
        ${formAlert('af-alert')}
        ${field({ id: 't-title', label: 'Title', required: true, value: act?.title, attrs: 'maxlength="120"' })}
        ${field({ id: 't-desc', label: 'Description', textarea: true, value: act?.description, hint: 'Shown to learners on their activity card', attrs: 'maxlength="1000" rows="2"' })}
        <div class="form-grid">
          ${field({ id: 't-type', label: 'Type', required: true, options: [['lesson', 'Lesson (content + check)', act?.type === 'lesson'], ['quiz', 'Quiz', act?.type === 'quiz'], ['simulation', 'Simulation (projectile lab)', act?.type === 'simulation']] })}
          ${field({ id: 't-subject', label: 'Subject', value: act?.subject, hint: 'e.g. Mathematics', attrs: 'maxlength="60"' })}
          ${field({ id: 't-dur', label: 'Duration (minutes)', type: 'number', required: true, value: act?.duration_min ?? 10, attrs: 'min="1" max="600" inputmode="numeric"' })}
          ${field({ id: 't-pass', label: 'Pass mark (%)', type: 'number', required: true, value: act?.pass_mark ?? 50, hint: '0–100', attrs: 'min="0" max="100" inputmode="numeric"' })}
        </div>
        <fieldset id="sim-fields" class="fieldset"><legend>Simulation settings</legend><div class="form-grid">
          ${field({ id: 't-target', label: 'Target distance (m)', type: 'number', required: true, value: c.targetDistance ?? 40, hint: '5–160 m', attrs: 'min="5" max="160"' })}
          ${field({ id: 't-tol', label: 'Tolerance (± m)', type: 'number', required: true, value: c.tolerance ?? 2, hint: 'How close counts as a hit', attrs: 'min="0.5" max="20" step="0.5"' })}
          ${field({ id: 't-planet', label: 'World (gravity)', required: true, options: Object.entries(PLANETS).map(([k, p]) => [k, `${p.label}${p.g ? ` — ${p.g} m/s²` : ''}`, (c.planet || 'earth') === k]) })}
          ${field({ id: 't-gravity', label: 'Custom gravity (m/s²)', type: 'number', required: true, value: c.planet === 'custom' ? c.gravity : '', hint: '0.5–30', attrs: 'min="0.5" max="30" step="0.01"' })}
          ${field({ id: 't-amin', label: 'Minimum angle (°)', type: 'number', required: true, value: c.angleMin ?? 5, attrs: 'min="1" max="88"' })}
          ${field({ id: 't-amax', label: 'Maximum angle (°)', type: 'number', required: true, value: c.angleMax ?? 85, attrs: 'min="2" max="89"' })}
          ${field({ id: 't-smin', label: 'Minimum speed (m/s)', type: 'number', required: true, value: c.speedMin ?? 5, attrs: 'min="1" max="99" step="0.5"' })}
          ${field({ id: 't-smax', label: 'Maximum speed (m/s)', type: 'number', required: true, value: c.speedMax ?? 40, attrs: 'min="2" max="100" step="0.5"' })}
          ${field({ id: 't-maxl', label: 'Launch limit', type: 'number', required: true, value: c.maxLaunches ?? 0, hint: '0 = unlimited', attrs: 'min="0" max="100"' })}
          <div class="field check-field"><label class="check"><input type="checkbox" id="t-guide" ${c.showGuide === false ? '' : 'checked'}> Show aiming guide</label><p class="hint">Turn off for a harder challenge</p></div>
          </div>
          <p class="scenario-preview small" id="scenario-preview" aria-live="polite"></p>
          ${field({ id: 't-instr', label: 'Instructions', textarea: true, value: c.instructions, attrs: 'rows="2" maxlength="1000"' })}</fieldset>
        <fieldset id="sec-wrap" class="fieldset"><legend>Lesson content</legend><div id="secs"></div>
          <button type="button" class="btn btn-sm" id="add-sec">${icon('plus', { size: 15 })}Add section</button></fieldset>
        <fieldset class="fieldset"><legend>Questions <span class="opt" id="q-opt"></span></legend><div id="qs"></div>
          <button type="button" class="btn btn-sm" id="add-q">${icon('plus', { size: 15 })}Add question</button></fieldset>
        <div class="modal-foot">${act ? `<button type="button" class="btn btn-danger" id="del">${icon('trash', { size: 15 })}Delete</button><span class="grow"></span>` : ''}
          <button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" type="submit" id="af-save">${act ? 'Save changes' : 'Create activity'}</button></div>
      </form>`, { wide: true });
    const form = $('#af', m.el);

    const syncFromDom = () => {
      sections = $$('.sec', m.el).map(el => ({ heading: $('.s-h', el).value, body: $('.s-b', el).value }));
      questions = $$('.qq', m.el).map(el => ({ q: $('.q-t', el).value, options: $$('.q-o', el).map(i => i.value), answer: Number(($('.q-a:checked', el) || {}).value ?? 0) }));
    };
    const renderParts = () => {
      const type = $('#t-type').value;
      $('#sim-fields').hidden = type !== 'simulation';
      $('#sec-wrap').hidden = type !== 'lesson';
      $('#q-opt').textContent = type === 'quiz' ? '(at least one required)' : '(optional)';
      $('#secs').innerHTML = sections.map((s, i) => `<div class="q-editor sec" data-field="sec-${i}">
        <div class="row"><span class="step-num" aria-hidden="true">${i + 1}</span>
          <label class="sr-only" for="sh-${i}">Section ${i + 1} heading</label><input id="sh-${i}" class="s-h grow" placeholder="Section ${i + 1} heading" value="${esc(s.heading)}">
          <button type="button" class="icon-btn danger" data-rm-sec="${i}" aria-label="Remove section ${i + 1}">${icon('trash')}</button></div>
        <label class="sr-only" for="sb-${i}">Section ${i + 1} content</label><textarea id="sb-${i}" class="s-b" rows="3" placeholder="Section content">${esc(s.body)}</textarea>
        <p class="field-error" aria-live="polite"></p></div>`).join('');
      $('#qs').innerHTML = questions.map((q, i) => `<div class="q-editor qq" data-field="q-${i}">
        <div class="row"><span class="step-num" aria-hidden="true">Q${i + 1}</span>
          <label class="sr-only" for="qt-${i}">Question ${i + 1}</label><input id="qt-${i}" class="q-t grow" placeholder="Question ${i + 1}" value="${esc(q.q)}">
          <button type="button" class="icon-btn danger" data-rm-q="${i}" aria-label="Remove question ${i + 1}">${icon('trash')}</button></div>
        <div class="options-editor" role="radiogroup" aria-label="Correct answer for question ${i + 1}">
        ${[0, 1, 2, 3].map(o => `<div class="opt-row"><input type="radio" class="q-a" id="qa-${i}-${o}" name="ans-${i}" value="${o}" ${q.answer === o ? 'checked' : ''}>
          <label class="sr-only" for="qa-${i}-${o}">Option ${o + 1} is correct</label>
          <label class="sr-only" for="qo-${i}-${o}">Option ${o + 1}</label><input class="q-o" id="qo-${i}-${o}" placeholder="Option ${o + 1}${o > 1 ? ' (optional)' : ''}" value="${esc(q.options?.[o])}"></div>`).join('')}</div>
        <p class="hint">Select the circle next to the correct answer.</p><p class="field-error" aria-live="polite"></p></div>`).join('')
        || `<p class="small muted">No questions yet.</p>`;
      $$('[data-rm-sec]', m.el).forEach(b => b.onclick = () => { syncFromDom(); sections.splice(+b.dataset.rmSec, 1); renderParts(); });
      $$('[data-rm-q]', m.el).forEach(b => b.onclick = () => { syncFromDom(); questions.splice(+b.dataset.rmQ, 1); renderParts(); });
    };
    renderParts();
    // Scenario preview: shows the furthest possible shot so admins don't create an impossible task.
    const scenario = () => {
      const planet = $('#t-planet').value, g = planet === 'custom' ? +$('#t-gravity').value : PLANETS[planet].g;
      const aMin = +$('#t-amin').value, aMax = +$('#t-amax').value, sMax = +$('#t-smax').value;
      const best = Math.min(Math.max(45, aMin), aMax);
      return { planet, g, maxRange: g > 0 ? (sMax * sMax * Math.sin(2 * best * Math.PI / 180)) / g : 0 };
    };
    const updateScenario = () => {
      $('[data-field="t-gravity"]').hidden = $('#t-planet').value !== 'custom';
      const { g, maxRange } = scenario(), tgt = +$('#t-target').value;
      $('#scenario-preview').innerHTML = g > 0 ? `${icon('globe', { size: 14 })} Gravity ${g} m/s² · furthest possible shot ≈ <strong>${Math.round(maxRange)} m</strong> ${maxRange + (+$('#t-tol').value || 0) < tgt ? '<span class="text-danger">— target is out of reach</span>' : '— target reachable'}` : '';
    };
    ['#t-planet', '#t-gravity', '#t-amin', '#t-amax', '#t-smax', '#t-target', '#t-tol'].forEach(sel => $(sel).addEventListener('input', updateScenario));
    updateScenario();
    $('#t-type').onchange = () => { syncFromDom(); renderParts(); };
    $('#add-sec').onclick = () => { syncFromDom(); sections.push({ heading: '', body: '' }); renderParts(); $(`#sh-${sections.length - 1}`).focus(); };
    $('#add-q').onclick = () => { syncFromDom(); questions.push({ q: '', options: ['', '', '', ''], answer: 0 }); renderParts(); $(`#qt-${questions.length - 1}`).focus(); };
    if (act) $('#del').onclick = async () => {
      m.close();
      if (!(await confirmDialog(`Delete "${act.title}"? All assignments and progress for it will be permanently removed.`, 'Delete activity'))) return;
      try { await api(`/api/activities/${act.id}`, { method: 'DELETE' }); toast('Activity deleted'); location.hash = '#/admin/activities'; onSaved(); } catch (ex) { toast(ex.message, 'error'); }
    };
    form.onsubmit = (e) => {
      e.preventDefault(); syncFromDom();
      const type = $('#t-type').value;
      const qs = questions.map(q => {
        const opts = q.options.map(o => o.trim());
        let last = opts.length; while (last > 0 && !opts[last - 1] && last - 1 !== q.answer) last--;
        return { q: q.q.trim(), options: opts.slice(0, last), answer: q.answer };
      });
      // Client-side validation mirrors the server rules so problems show next to the right field.
      const errors = {};
      const title = $('#t-title').value.trim(), dur = +$('#t-dur').value, pass = $('#t-pass').value;
      if (title.length < 3) errors['t-title'] = 'Title must be at least 3 characters';
      if (!Number.isInteger(dur) || dur < 1 || dur > 600) errors['t-dur'] = 'Enter a whole number of minutes (1–600)';
      if (pass === '' || !Number.isInteger(+pass) || +pass < 0 || +pass > 100) errors['t-pass'] = 'Enter a whole number from 0 to 100';
      if (type === 'simulation') {
        const tgt = +$('#t-target').value, tol = +$('#t-tol').value;
        if (!(tgt >= 5 && tgt <= 160)) errors['t-target'] = 'Target must be between 5 and 160 m';
        if (!(tol >= 0.5 && tol <= 20)) errors['t-tol'] = 'Tolerance must be between 0.5 and 20 m';
        const sc = scenario();
        if (sc.planet === 'custom' && !(sc.g >= 0.5 && sc.g <= 30)) errors['t-gravity'] = 'Enter a gravity between 0.5 and 30 m/s²';
        if (!(+$('#t-amin').value < +$('#t-amax').value)) errors['t-amax'] = 'Must be greater than the minimum angle';
        if (!(+$('#t-smin').value < +$('#t-smax').value)) errors['t-smax'] = 'Must be greater than the minimum speed';
        const ml = $('#t-maxl').value;
        if (ml === '' || !Number.isInteger(+ml) || +ml < 0 || +ml > 100) errors['t-maxl'] = 'Enter a whole number from 0 to 100';
        if (!errors['t-gravity'] && !errors['t-target'] && sc.maxRange + tol < tgt) errors['t-smax'] = `The target can't be reached — the furthest shot is about ${Math.round(sc.maxRange)} m`;
      }
      if (type === 'lesson') {
        const filled = sections.filter(s => s.heading.trim() || s.body.trim());
        if (!filled.length) errors['sec-0'] = 'Add at least one section with content';
        sections.forEach((s, i) => { if (s.heading.trim() && !s.body.trim()) errors[`sec-${i}`] = 'This section needs some content'; });
      }
      if (type === 'quiz' && !qs.length) errors['t-type'] = 'A quiz needs at least one question — use "Add question" below';
      qs.forEach((q, i) => {
        if (!q.q) errors[`q-${i}`] = 'Enter the question text';
        else if (q.options.length < 2 || q.options.some(o => !o)) errors[`q-${i}`] = 'Fill in at least options 1 and 2 (no gaps)';
      });
      $$('.q-editor', m.el).forEach(el => { el.classList.remove('invalid'); $('.field-error', el).textContent = ''; });
      Object.entries(errors).filter(([k]) => /^(q|sec)-/.test(k)).forEach(([k, msg]) => { const el = $(`[data-field="${k}"]`, m.el); if (el) { el.classList.add('invalid'); $('.field-error', el).textContent = msg; } });
      if (showErrors(form, errors, $('#af-alert'))) { $('.invalid input, .invalid textarea', m.el)?.focus(); return; }

      const content = { questions: qs };
      if (type === 'lesson') content.sections = sections.filter(s => s.heading.trim() || s.body.trim());
      if (type === 'simulation') Object.assign(content, {
        simulation: 'projectile', targetDistance: +$('#t-target').value, tolerance: +$('#t-tol').value, instructions: $('#t-instr').value,
        planet: $('#t-planet').value, ...($('#t-planet').value === 'custom' ? { gravity: +$('#t-gravity').value } : {}),
        angleMin: +$('#t-amin').value, angleMax: +$('#t-amax').value, speedMin: +$('#t-smin').value, speedMax: +$('#t-smax').value,
        maxLaunches: +$('#t-maxl').value, showGuide: $('#t-guide').checked,
      });
      const body = { title, description: $('#t-desc').value, type, subject: $('#t-subject').value, duration_min: dur, pass_mark: +pass, content };
      busy($('#af-save'), 'Saving…', async () => {
        try {
          await api(act ? `/api/activities/${act.id}` : '/api/activities', { method: act ? 'PUT' : 'POST', body });
          m.close(); toast(act ? `"${title}" updated` : `"${title}" created`); onSaved();
        } catch (ex) {
          const mapped = serverErrorToField(ex.message, [['title', 't-title'], ['pass mark', 't-pass'], ['duration', 't-dur'], ['target', 't-target'], ['tolerance', 't-tol'], ['subject', 't-subject'], ['gravity', 't-gravity'], ['angle', 't-amax'], ['speed', 't-smax'], ['launch limit', 't-maxl']]);
          if (mapped) showErrors(form, mapped, $('#af-alert')); else $('#af-alert').innerHTML = `${icon('alert')}<span>${esc(ex.message)}</span>`;
        }
      });
    };
  }

  async function assignForm(act, onSaved, trigger) {
    const load = () => Promise.all([api('/api/learners?status=active'), api('/api/cohorts')]).catch(ex => { toast(ex.message, 'error'); return null; });
    const data = trigger ? await busy(trigger, 'Loading…', load) : await load();
    if (!data) return;
    const [learners, cohorts] = data;
    const m = modal(`${modalHead(`Assign “${act.title}”`, 'Choose a cohort, individual learners, or both')}
      <form id="asf" novalidate>${formAlert('as-alert')}
        ${field({ id: 'as-cohort', label: 'Whole cohort', options: [['', '— None —']].concat(cohorts.map(c => [c, c])) })}
        <div class="field" data-field="as-list"><fieldset class="plain"><legend class="label-like">Individual learners <span class="opt">(<span id="as-count">0</span> selected)</span></legend>
          <div class="search"><label for="as-filter" class="sr-only">Filter learners</label>${icon('search')}<input id="as-filter" type="search" placeholder="Filter by name…" autocomplete="off"></div>
          <div class="checklist">${learners.map(l => `<label data-name="${esc(l.name.toLowerCase())}"><input type="checkbox" value="${l.id}"><span class="avatar avatar-sm">${initials(l.name)}</span>${esc(l.name)} <span class="small muted">${esc(l.cohort || '')}</span></label>`).join('')
            || '<p class="muted small">No active learners</p>'}</div></fieldset><p class="field-error" id="as-list-err" aria-live="polite"></p></div>
        ${field({ id: 'as-due', label: 'Due date', type: 'date', attrs: `min="${new Date().toISOString().slice(0, 10)}"` })}
        <div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" type="submit" id="as-go">Assign</button></div></form>`);
    const form = $('#asf', m.el);
    const count = () => ($('#as-count').textContent = $$('.checklist input:checked', m.el).length);
    $$('.checklist input', m.el).forEach(i => i.addEventListener('change', count));
    $('#as-filter').oninput = (e) => $$('.checklist label', m.el).forEach(l => l.hidden = !l.dataset.name.includes(e.target.value.toLowerCase()));
    form.onsubmit = (e) => {
      e.preventDefault();
      const learnerIds = $$('.checklist input:checked', m.el).map(i => +i.value), cohort = $('#as-cohort').value;
      if (showErrors(form, !learnerIds.length && !cohort ? { 'as-list': 'Select a cohort or at least one learner' } : {}, $('#as-alert'))) return;
      busy($('#as-go'), 'Assigning…', async () => {
        try {
          const r = await api(`/api/activities/${act.id}/assign`, { method: 'POST', body: { learnerIds, cohort: cohort || undefined, dueDate: $('#as-due').value || undefined } });
          m.close(); toast(`Assigned to ${r.created} learner${r.created === 1 ? '' : 's'}${r.skipped ? ` (${r.skipped} already had it)` : ''}`); onSaved();
        } catch (ex) { $('#as-alert').innerHTML = `${icon('alert')}<span>${esc(ex.message)}</span>`; }
      });
    };
  }

  const adminActivityDetail = (id) => page('activities', 'Activity', { cards: 0 }, async (main) => {
    const d = await api(`/api/activities/${id}`);
    const a = d.activity, s = d.summary;
    document.title = `${a.title} · Nudle Learn`;
    main.innerHTML = `
      ${crumbs([['Activities', '#/admin/activities'], [a.title]])}
      <div class="page-head"><div><div class="row tight">${typeBadge(a.type)}<span class="badge b-neutral">${esc(a.subject)}</span><span class="small muted with-icon">${icon('clock', { size: 14 })}${a.duration_min} min</span></div>
        <h1>${esc(a.title)}</h1><p class="muted">${esc(a.description)}</p></div>
        <div class="row"><button class="btn" id="edit">${icon('edit')}Edit</button><button class="btn btn-primary" id="assign">${icon('users')}Assign</button></div></div>
      <div class="grid grid-4">
        ${statCard('Assigned learners', s.total, `Pass mark ${a.pass_mark}%`, 'users')}
        ${statCard('Completed', s.completed, `${s.inProgress} in progress · ${s.notStarted} not started`, 'checkCircle')}
        ${statCard('Completion rate', s.completionRate + '%', '', 'target')}
        ${statCard('Average score', s.averageScore != null ? s.averageScore + '%' : '—', '', 'star')}
      </div>
      <section class="card mt" aria-labelledby="h-lp"><h2 id="h-lp">Learner progress</h2>
        ${d.assignees.length ? `<div class="table-wrap"><table class="responsive"><thead><tr><th data-sort="text">Learner</th><th data-sort="text">Status</th><th data-sort="text">Due</th><th data-sort="num">Best score</th><th data-sort="num">Attempts</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
        ${d.assignees.map(r => `<tr data-href="#/admin/learners/${r.learner_id}" data-label="View ${esc(r.name)}"><td data-v="${esc(r.name)}"><div class="person"><span class="avatar">${initials(r.name)}</span><div><strong>${esc(r.name)}</strong><div class="small muted">${esc(r.cohort || '')}</div></div></div></td>
          <td data-v="${r.status}">${statusBadge(r)}</td><td data-v="${r.due_date || ''}">${fmtDate(r.due_date)}</td><td data-v="${r.best_score ?? ''}">${r.best_score != null ? r.best_score + '%' : '—'}</td><td>${r.attempts}</td>
          <td><div class="actions"><button class="btn btn-sm btn-danger" data-unassign="${r.id}" aria-label="Remove ${esc(r.name)} from this activity">${icon('trash', { size: 15 })}Remove</button></div></td></tr>`).join('')}
        </tbody></table></div>` : emptyState({ ico: 'users', title: 'Not assigned to anyone yet', action: '<button class="btn btn-primary" id="assign-empty">Assign learners</button>' })}</section>`;
    $('#edit').onclick = () => activityForm(a, () => adminActivityDetail(id));
    $('#assign').onclick = (e) => assignForm(a, () => adminActivityDetail(id), e.currentTarget);
    $('#assign-empty')?.addEventListener('click', (e) => assignForm(a, () => adminActivityDetail(id), e.currentTarget));
    $$('[data-unassign]').forEach(b => b.onclick = async () => {
      if (!(await confirmDialog('Remove this learner from the activity? Their progress on it will be deleted.', 'Remove'))) return;
      await busy(b, 'Removing…', async () => {
        try { await api(`/api/assignments/${b.dataset.unassign}`, { method: 'DELETE' }); toast('Assignment removed'); adminActivityDetail(id); }
        catch (ex) { toast(ex.message, 'error'); }
      });
    });
  });

  // =====================================================================
  // ADMIN — Analytics (hand-built, accessible SVG charts)
  // =====================================================================
  const shortDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  function lineChart(series, { height = 220, label }) {
    const W = 640, H = height, pl = 34, pr = 12, pt = 14, pb = 28;
    const n = series[0].points.length, max = Math.max(1, ...series.flatMap(s => s.points.map(p => p.value)));
    const nice = Math.ceil(max / 4) * 4 || 4;
    const X = (i) => pl + (i * (W - pl - pr)) / Math.max(1, n - 1), Y = (v) => pt + (H - pt - pb) * (1 - v / nice);
    const grid = [0, .25, .5, .75, 1].map(f => `<line x1="${pl}" x2="${W - pr}" y1="${Y(nice * f)}" y2="${Y(nice * f)}" class="grid"/><text x="${pl - 6}" y="${Y(nice * f) + 4}" class="axis" text-anchor="end">${Math.round(nice * f)}</text>`).join('');
    const step = Math.ceil(n / 7);
    const xs = series[0].points.map((p, i) => i % step === 0 || i === n - 1 ? `<text x="${X(i)}" y="${H - 8}" class="axis" text-anchor="middle">${shortDay(p.day)}</text>` : '').join('');
    const lines = series.map((s, k) => {
      const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`).join('');
      const area = k === 0 ? `<path d="${d}L${X(n - 1)},${Y(0)}L${X(0)},${Y(0)}Z" fill="${s.color}" opacity=".12"/>` : '';
      const dots = s.points.map((p, i) => p.value ? `<circle cx="${X(i)}" cy="${Y(p.value)}" r="3.5" fill="${s.color}"><title>${shortDay(p.day)}: ${p.value} ${s.label.toLowerCase()}</title></circle>` : '').join('');
      return `${area}<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" ${k ? 'stroke-dasharray="6 4"' : ''}/>${dots}`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${grid}${xs}${lines}</svg>
      <div class="chart-legend">${series.map((s, k) => `<span><i style="background:${s.color}" class="${k ? 'dashed' : ''}"></i>${esc(s.label)}</span>`).join('')}</div>`;
  }
  function barChart(items, { height = 200, label, suffix = '', color = '#6d28d9' }) {
    const W = 640, H = height, pb = 30, pt = 18, gap = 14;
    const max = Math.max(1, ...items.map(i => i.value));
    const bw = (W - gap * (items.length + 1)) / items.length;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
      <line x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}" class="grid"/>
      ${items.map((it, k) => { const h = (H - pb - pt) * (it.value / max), x = gap + k * (bw + gap), y = H - pb - h;
        return `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h, it.value ? 2 : 0)}" rx="6" fill="${it.color || color}"><title>${esc(it.label)}: ${it.value}${suffix}</title></rect>
          <text x="${x + bw / 2}" y="${y - 5}" text-anchor="middle" class="bar-val">${it.value}${suffix}</text>
          <text x="${x + bw / 2}" y="${H - 10}" text-anchor="middle" class="axis">${esc(it.label)}</text>`; }).join('')}
    </svg>`;
  }
  const dataTable = (caption, head, rows) => `<details class="data-table"><summary>View as table</summary><div class="table-wrap"><table><caption class="sr-only">${esc(caption)}</caption>
    <thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  const pairBar = (label, a, b, sub) => `<div class="pair-row"><div class="pair-label"><strong>${esc(label)}</strong><span class="small muted">${esc(sub)}</span></div>
    <div class="pair-bars"><div class="pb"><span style="width:${a}%" class="pb-a"></span></div><span class="pb-v">${a}%</span>
    <div class="pb"><span style="width:${b ?? 0}%" class="pb-b"></span></div><span class="pb-v">${b == null ? '—' : b + '%'}</span></div></div>`;

  let analyticsDays = 30;
  const adminAnalytics = () => page('analytics', 'Analytics', { stats: 4, cards: 4 }, async (main) => {
    const d = await api(`/api/admin/analytics?days=${analyticsDays}`);
    const runs = d.simulationPerformance.reduce((n, x) => n + x.runs, 0), hits = d.simulationPerformance.reduce((n, x) => n + x.hits, 0);
    const completions = d.completionsByDay.reduce((n, x) => n + x.value, 0);
    main.innerHTML = `
      <div class="page-head"><div><h1>Analytics</h1><p class="muted">Learner performance over time and across activities</p></div>
        <div class="row"><div class="filter inline"><label for="range" class="small">Period</label><select id="range">${[7, 30, 90].map(n => `<option value="${n}" ${analyticsDays === n ? 'selected' : ''}>Last ${n} days</option>`).join('')}</select></div>
          ${exportButton('export-report', 'Export report (CSV)')}</div></div>
      <div class="grid grid-4">
        ${statCard('Completions', completions, `in the last ${d.days} days`, 'checkCircle')}
        ${statCard('Attempts', d.totals.attemptsInPeriod, `in the last ${d.days} days`, 'refresh')}
        ${statCard('Median score', d.totals.medianScore != null ? d.totals.medianScore + '%' : '—', `${d.totals.scoredCompletions} scored completions`, 'star')}
        ${statCard('Simulation hit rate', runs ? Math.round(hits / runs * 100) + '%' : '—', `${hits} hits from ${runs} launches`, 'target')}
      </div>
      <div class="grid grid-2 mt">
        <section class="card" aria-labelledby="h-trend"><h2 id="h-trend">Activity over time</h2>
          ${lineChart([{ label: 'Completions', color: '#6d28d9', points: d.completionsByDay }, { label: 'Attempts', color: '#14213d', points: d.attemptsByDay }], { label: `Completions and attempts per day over the last ${d.days} days` })}
          ${dataTable('Completions and attempts per day', ['Day', 'Completions', 'Attempts'], d.completionsByDay.map((p, i) => [p.day, p.value, d.attemptsByDay[i].value]))}</section>
        <section class="card" aria-labelledby="h-dist"><h2 id="h-dist">Score distribution</h2><p class="small muted">Best score of each completed assignment</p>
          ${barChart(d.scoreDistribution.map(b => ({ label: b.label, value: b.count })), { label: 'Number of completions in each score band' })}
          ${dataTable('Score distribution', ['Score band', 'Completions'], d.scoreDistribution.map(b => [b.label, b.count]))}</section>
      </div>
      <div class="grid grid-2 mt">
        <section class="card" aria-labelledby="h-perf"><h2 id="h-perf">Activity performance</h2>
          <div class="pair-legend small"><span><i class="pb-a"></i>Completion rate</span><span><i class="pb-b"></i>Average score</span></div>
          ${d.activityPerformance.map(a => pairBar(a.title, a.completionRate, a.avg_score, `${a.completed}/${a.assigned} completed · ${a.avg_attempts ?? 0} attempts avg`)).join('') || emptyState({ ico: 'layers', title: 'No activities yet' })}</section>
        <section class="card" aria-labelledby="h-coh"><h2 id="h-coh">Cohort comparison</h2>
          <div class="pair-legend small"><span><i class="pb-a"></i>Completion rate</span><span><i class="pb-b"></i>Average score</span></div>
          ${d.cohortPerformance.map(c => pairBar(c.cohort, c.completionRate, c.avg_score, `${c.learners} learner${c.learners === 1 ? '' : 's'} · ${c.completed}/${c.assigned} completed`)).join('') || emptyState({ ico: 'users', title: 'No cohorts yet' })}</section>
      </div>
      <div class="grid grid-2 mt">
        <section class="card" aria-labelledby="h-simp"><h2 id="h-simp">Simulation hit rates</h2>
          ${d.simulationPerformance.length ? barChart(d.simulationPerformance.map(x => ({ label: x.title.length > 18 ? x.title.slice(0, 17) + '…' : x.title, value: x.hitRate })), { label: 'Hit rate per simulation', suffix: '%' })
            + dataTable('Simulation hit rates', ['Simulation', 'Launches', 'Hits', 'Hit rate', 'Learners'], d.simulationPerformance.map(x => [x.title, x.runs, x.hits, x.hitRate + '%', x.learners]))
            : emptyState({ ico: 'flask', title: 'No simulations yet' })}</section>
        <section class="card" aria-labelledby="h-top"><h2 id="h-top">Top learners</h2>
          ${d.topLearners.length ? `<ol class="leaderboard">${d.topLearners.map((l, k) => `<li><span class="rank">${k + 1}</span><span class="avatar">${initials(l.name)}</span>
            <a class="grow" href="#/admin/learners/${l.id}"><strong>${esc(l.name)}</strong><span class="small muted">${esc(l.cohort || '')}</span></a>
            <span class="small">${l.completionRate}% done</span><span class="badge b-primary">${l.avg_score ?? '—'}${l.avg_score != null ? '%' : ''}</span></li>`).join('')}</ol>`
            : emptyState({ ico: 'trophy', title: 'No learner data yet' })}</section>
      </div>`;
    $('#range').onchange = (e) => { analyticsDays = +e.target.value; adminAnalytics(); };
    bindExport($('#export-report'), '/api/reports/learners.csv');
    startLive(() => { clearTimeout(adminAnalytics.t); adminAnalytics.t = setTimeout(() => { if ($('#h-trend')) adminAnalytics(); }, 1500); });
  });

  // =====================================================================
  // ADMIN — Audit log
  // =====================================================================
  const auditFilters = { q: '', action: '', from: '', to: '', page: 1, entityId: '' };
  const adminAudit = (query) => page('audit', 'Audit log', { stats: 0, cards: 0 }, async (main) => {
    if (query?.get('entityId')) { Object.assign(auditFilters, { entityId: query.get('entityId'), page: 1 }); history.replaceState(null, '', '#/admin/audit'); }
    main.innerHTML = `
      <div class="page-head"><div><h1>Audit log ${liveChip()}</h1><p class="muted">Every sign-in, change, submission, launch and export — who did it and when</p></div></div>
      <div class="card">
        <form class="toolbar" id="audit-filters" role="search">
          <div class="search grow"><label for="aq" class="sr-only">Search the audit log</label>${icon('search')}<input id="aq" type="search" placeholder="Search by name or description…" value="${esc(auditFilters.q)}"></div>
          <div class="filter"><label for="aaction" class="small">Action</label><select id="aaction"><option value="">All actions</option></select></div>
          <div class="filter"><label for="afrom" class="small">From</label><input type="date" id="afrom" value="${esc(auditFilters.from)}"></div>
          <div class="filter"><label for="ato" class="small">To</label><input type="date" id="ato" value="${esc(auditFilters.to)}"></div>
          ${auditFilters.entityId ? `<button type="button" class="btn btn-sm" id="clear-entity">${icon('x', { size: 14 })}Learner #${esc(auditFilters.entityId)}</button>` : ''}
        </form>
        <p class="small muted" id="audit-count" aria-live="polite"></p>
        <div id="audit-table"></div>
        <nav class="pager" aria-label="Audit log pages" id="pager"></nav>
      </div>`;
    let timer, reqId = 0;
    const load = async () => {
      const my = ++reqId; $('#audit-table').classList.add('dim'); $('#audit-table').setAttribute('aria-busy', 'true');
      try {
        const qs = new URLSearchParams(Object.fromEntries(Object.entries({ ...auditFilters, limit: 20 }).filter(([, v]) => v !== '' && v != null)));
        const d = await api(`/api/admin/audit?${qs}`);
        if (my !== reqId) return;
        const sel = $('#aaction');
        if (sel.options.length === 1) {
          const groups = [...new Set(d.actions.map(a => a.split('.')[0]))];
          sel.innerHTML = '<option value="">All actions</option>' + groups.map(g => `<optgroup label="${esc(g[0].toUpperCase() + g.slice(1))}">${d.actions.filter(a => a.startsWith(g + '.')).map(a => `<option value="${a}" ${auditFilters.action === a ? 'selected' : ''}>${esc(actionLabel(a))}</option>`).join('')}</optgroup>`).join('');
        }
        $('#audit-count').textContent = `${d.total} event${d.total === 1 ? '' : 's'}`;
        $('#audit-table').innerHTML = d.rows.length ? `<div class="table-wrap"><table class="responsive"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead><tbody>
          ${d.rows.map(e => `<tr><td class="nowrap">${fmtTime(e.created_at)}</td>
            <td>${e.actor_name ? `<div class="person"><span class="avatar avatar-sm">${initials(e.actor_name)}</span><div><strong>${esc(e.actor_name)}</strong><div class="small muted">${esc(e.actor_role || '')}</div></div></div>` : '<span class="muted">Anonymous</span>'}</td>
            <td><span class="badge tone-${actionTone(e.action)}">${esc(actionLabel(e.action))}</span></td>
            <td>${esc(e.summary)}${e.ip ? `<div class="small muted">IP ${esc(e.ip)}</div>` : ''}</td></tr>`).join('')}</tbody></table></div>`
          : emptyState({ ico: 'history', title: 'No events match these filters', action: '<button class="btn" id="audit-clear">Clear filters</button>' });
        $('#audit-clear')?.addEventListener('click', () => { Object.assign(auditFilters, { q: '', action: '', from: '', to: '', page: 1, entityId: '' }); adminAudit(); });
        $('#pager').innerHTML = d.pages > 1 ? `<button class="btn btn-sm" id="prev" ${d.page <= 1 ? 'disabled' : ''}>${icon('arrowLeft', { size: 14 })}Newer</button>
          <span class="small">Page ${d.page} of ${d.pages}</span><button class="btn btn-sm" id="next" ${d.page >= d.pages ? 'disabled' : ''}>Older${icon('arrowRight', { size: 14 })}</button>` : '';
        $('#prev')?.addEventListener('click', () => { auditFilters.page--; load(); });
        $('#next')?.addEventListener('click', () => { auditFilters.page++; load(); });
        enhanceTables($('#audit-table'));
      } catch (ex) {
        if (my === reqId) $('#audit-table').innerHTML = `<div class="inline-error" role="alert">${icon('alert')}<span>${esc(ex.message)}</span><button class="btn btn-sm" id="reload">Try again</button></div>`;
        $('#reload')?.addEventListener('click', load);
      } finally { if (my === reqId) { $('#audit-table').classList.remove('dim'); $('#audit-table').removeAttribute('aria-busy'); } }
    };
    $('#aq').oninput = (e) => { auditFilters.q = e.target.value; auditFilters.page = 1; clearTimeout(timer); timer = setTimeout(load, 250); };
    $('#aaction').onchange = (e) => { auditFilters.action = e.target.value; auditFilters.page = 1; load(); };
    $('#afrom').onchange = (e) => { auditFilters.from = e.target.value; auditFilters.page = 1; load(); };
    $('#ato').onchange = (e) => { auditFilters.to = e.target.value; auditFilters.page = 1; load(); };
    $('#audit-filters').onsubmit = (e) => e.preventDefault();
    $('#clear-entity')?.addEventListener('click', () => { auditFilters.entityId = ''; adminAudit(); });
    await load();
    startLive(() => { if (auditFilters.page === 1) { clearTimeout(timer); timer = setTimeout(load, 300); } });
  });

  // =====================================================================
  // LEARNER — Dashboard
  // =====================================================================
  let learnerTab = 'todo';
  const learnerDashboard = () => page('dashboard', 'My activities', { cards: 0, table: false }, async (main) => {
    const { assignments, summary: s } = await api('/api/me/assignments');
    const first = state.user.name.split(' ')[0];
    const next = assignments.find(a => a.status !== 'completed');
    const TABS = [['todo', 'To do', assignments.filter(a => a.status !== 'completed').length], ['done', 'Completed', s.completed], ['all', 'All', s.total]];
    const render = () => {
      const list = assignments.filter(a => learnerTab === 'all' ? true : learnerTab === 'done' ? a.status === 'completed' : a.status !== 'completed');
      main.innerHTML = `
        <div class="page-head"><div><h1>Hi ${esc(first)}</h1><p class="muted">${next ? 'Pick up where you left off, or start something new.' : 'You\'re all caught up.'}</p></div>
          ${next ? `<a class="btn btn-primary" href="#/learn/activity/${next.id}">${icon('play')}${next.status === 'in_progress' ? 'Continue' : 'Start'}: ${esc(next.title)}</a>` : ''}</div>
        <div class="grid grid-4">
          ${statCard('Assigned', s.total, 'activities', 'layers')}
          ${statCard('Completed', s.completed, s.total ? `${s.total - s.completed} to go` : '', 'checkCircle')}
          ${statCard('In progress', s.inProgress, 'started but not passed', 'clock')}
          ${statCard('Overall progress', s.completionRate + '%', s.averageScore != null ? `Average score ${s.averageScore}%` : 'No scores yet', 'target')}
        </div>
        <div class="tabs mt" role="tablist" aria-label="Filter activities">
          ${TABS.map(([k, l, n]) => `<button role="tab" id="tab-${k}" data-tab="${k}" aria-controls="tab-panel" aria-selected="${learnerTab === k}" tabindex="${learnerTab === k ? 0 : -1}" class="${learnerTab === k ? 'active' : ''}">${l}<span class="count">${n}</span></button>`).join('')}
        </div>
        <div id="tab-panel" role="tabpanel" aria-labelledby="tab-${learnerTab}">
        ${list.length ? `<ul class="grid grid-3 card-list">${list.map(a => `<li class="card activity-card ${isOverdue(a) ? 'is-overdue' : ''}">
            <div class="meta">${typeBadge(a.type)}${statusBadge(a)}</div>
            <h2 class="card-title">${esc(a.title)}</h2><p>${esc(a.description || '')}</p>
            <div class="small muted card-facts"><span class="with-icon">${icon('book', { size: 14 })}${esc(a.subject)}</span><span class="with-icon">${icon('clock', { size: 14 })}${a.duration_min} min</span><span class="with-icon">${icon('calendar', { size: 14 })}Due ${fmtDate(a.due_date)}</span>${a.best_score != null ? `<span class="with-icon">${icon('star', { size: 14 })}Best ${a.best_score}%</span>` : ''}</div>
            <a class="btn ${a.status === 'completed' ? '' : 'btn-primary'}" href="#/learn/activity/${a.id}" aria-label="${a.status === 'completed' ? 'Review' : a.status === 'in_progress' ? 'Continue' : 'Start'} ${esc(a.title)}">${icon(a.status === 'completed' ? 'refresh' : 'play', { size: 16 })}${a.status === 'completed' ? 'Review / retry' : a.status === 'in_progress' ? 'Continue' : 'Start activity'}</a>
          </li>`).join('')}</ul>`
          : `<div class="card">${learnerTab === 'todo' && s.total
            ? emptyState({ ico: 'trophy', title: 'Nothing left to do — great work!', text: 'You have completed every assigned activity.', action: '<a class="btn" href="#/learn/progress">See your progress</a>' })
            : emptyState({ ico: 'inbox', title: 'No activities here yet', text: 'When your teacher assigns activities they will appear here.' })}</div>`}
        </div>`;
      const tabs = $$('[role="tab"]', main);
      tabs.forEach((b, i) => {
        b.onclick = () => { learnerTab = b.dataset.tab; render(); $(`#tab-${learnerTab}`).focus(); };
        b.onkeydown = (e) => {
          const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (d) { e.preventDefault(); learnerTab = tabs[(i + d + tabs.length) % tabs.length].dataset.tab; render(); $(`#tab-${learnerTab}`).focus(); }
        };
      });
    };
    render();
  });

  // =====================================================================
  // LEARNER — Activity player
  // =====================================================================
  const learnerPlayer = (id) => page('dashboard', 'Activity', { stats: 0, cards: 0 }, async (main) => {
    const a = await api(`/api/me/assignments/${id}`);
    api(`/api/me/assignments/${id}/start`, { method: 'POST' }).catch(() => {});
    document.title = `${a.title} · Nudle Learn`;
    const c = a.content;
    const questions = c.questions || [];
    const steps = [a.type === 'lesson' && 'Read', a.type === 'simulation' && 'Experiment', questions.length && 'Answer', 'Submit'].filter(Boolean);
    // Resume: prefer whichever copy is newer — the server's, or an unsynced backup saved on this device.
    const localKey = `nudle_progress_${state.user.id}_${id}`;
    let local = null; try { local = JSON.parse(localStorage.getItem(localKey) || 'null'); } catch { /* ignore */ }
    const serverAt = a.progress?.savedAt ? Date.parse(a.progress.savedAt.replace(' ', 'T') + 'Z') : 0;
    const saved = local && local.at > serverAt ? local.state : a.progress;
    const resumed = !!saved && a.status !== 'completed';
    main.innerHTML = `
      <div class="player">
        ${crumbs([['My activities', '#/learn'], [a.title]])}
        <div class="row tight">${typeBadge(a.type)}<span class="badge b-neutral">${esc(a.subject)}</span><span class="small muted with-icon">${icon('clock', { size: 14 })}${a.duration_min} min</span><span class="small muted with-icon">${icon('target', { size: 14 })}Pass mark ${a.pass_mark}%</span>${a.status === 'completed' ? statusBadge(a) : ''}</div>
        <h1>${esc(a.title)}</h1><p class="muted">${esc(a.description)}</p>
        <ol class="stepper" aria-label="Steps">${steps.map((s, i) => `<li><span>${i + 1}</span>${s}</li>`).join('')}</ol>
        ${resumed ? `<div class="resume-banner" role="status">${icon('save')}<div class="grow"><strong>Welcome back — we restored your progress.</strong>
          <span class="small">${saved.angle != null ? `Angle ${saved.angle}°, speed ${saved.speed} m/s. ` : ''}${saved.answers?.filter(x => x != null).length ? `${saved.answers.filter(x => x != null).length} answer(s) restored.` : ''}</span></div>
          <button class="btn btn-sm" id="start-over">${icon('refresh', { size: 14 })}Start over</button></div>` : ''}
        <div id="result" tabindex="-1"></div>
        ${a.type === 'lesson' ? `<section class="card lesson" aria-label="Lesson content">${(c.sections || []).map(s => `<div class="lesson-section">${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}<p>${esc(s.body)}</p></div>`).join('')}</section>` : ''}
        ${a.type === 'simulation' ? simulationMarkup(c, saved) : ''}
        ${questions.length ? `<section class="card" aria-labelledby="h-q"><h2 id="h-q">${a.type === 'quiz' ? 'Questions' : 'Check your understanding'}</h2>
          <p class="small muted" id="q-progress" aria-live="polite">0 of ${questions.length} answered</p>
          ${questions.map((q, i) => `<fieldset class="question" id="qf-${i}" aria-describedby="qe-${i}"><legend><span class="q-num">${i + 1}</span>${esc(q.q)}</legend>
            <div class="options">${q.options.map((o, oi) => `<label class="option" data-q="${i}" data-o="${oi}"><input type="radio" name="q${i}" value="${oi}"><span class="radio-mark" aria-hidden="true"></span><span class="opt-text">${esc(o)}</span><span class="opt-fb"></span></label>`).join('')}</div>
            <p class="field-error" id="qe-${i}" aria-live="polite"></p></fieldset>`).join('')}</section>` : ''}
        <div class="submit-bar"><button class="btn btn-primary btn-lg" id="submit">${icon('check')}Submit activity</button><p class="small muted" id="sub-msg" aria-live="polite"></p>
          <span class="save-status small" id="save-status" role="status" aria-live="polite"></span></div>
      </div>`;

    const updateCount = () => { const n = questions.filter((_, i) => $(`input[name="q${i}"]:checked`)).length; if ($('#q-progress')) $('#q-progress').textContent = `${n} of ${questions.length} answered`; };
    $$('.option input', main).forEach(inp => inp.addEventListener('change', () => { const fs = inp.closest('fieldset'); fs.classList.remove('invalid'); $('.field-error', fs).textContent = ''; updateCount(); }));

    // Restore answers, then autosave every change (debounced). If the network fails the state is kept
    // on this device and synced automatically when the connection returns.
    (saved?.answers || []).forEach((v, i) => { if (v != null) { const el = $(`input[name="q${i}"][value="${v}"]`); if (el) el.checked = true; } });
    updateCount();
    const statusEl = $('#save-status');
    const setSave = (st) => {
      statusEl.className = `save-status small ${st}`;
      statusEl.innerHTML = st === 'saving' ? `<span class="spinner" aria-hidden="true"></span>Saving…` : st === 'saved' ? `${icon('check', { size: 14 })}Progress saved`
        : st === 'offline' ? `${icon('wifiOff', { size: 14 })}Saved on this device — will sync when you're back online` : '';
    };
    let saveTimer, pending = null;
    const collect = () => {
      const st = { answers: questions.map((_, i) => { const el = $(`input[name="q${i}"]:checked`); return el ? +el.value : null; }) };
      if (sim) Object.assign(st, sim.position());
      return st;
    };
    const flush = async () => {
      if (!pending || !$('#save-status')) return;
      const st = pending; pending = null;
      setSave('saving');
      try { await api(`/api/me/assignments/${id}/progress`, { method: 'PUT', body: st, retries: 1 }); localStorage.removeItem(localKey); setSave('saved'); }
      catch (ex) {
        if (ex.network || ex.status >= 500) { try { localStorage.setItem(localKey, JSON.stringify({ at: Date.now(), state: st })); } catch { /* storage full */ } pending = pending || st; setSave('offline'); }
        else setSave('');
      }
    };
    const autosave = () => { if (a.status === 'completed' && !resumed) return; pending = collect(); setSave('saving'); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 700); };
    onReconnect = () => { if (pending) flush(); };
    $$('.option input', main).forEach(inp => inp.addEventListener('change', autosave));
    if (local && local.at > serverAt) { pending = local.state; flush(); } // sync an unsynced backup straight away
    $('#start-over')?.addEventListener('click', async (e) => {
      if (!(await confirmDialog('Start this activity over? Your saved answers and slider positions will be cleared (your launch history is kept).', 'Start over', false))) return;
      await busy(e.currentTarget, 'Clearing…', async () => { await api(`/api/me/assignments/${id}/progress`, { method: 'DELETE' }).catch(() => {}); localStorage.removeItem(localKey); });
      learnerPlayer(id);
    });

    const sim = a.type === 'simulation' ? setupSimulation(c, id, a.simulationRuns || [], { start: saved, launchesUsed: a.launchesUsed || 0, onChange: autosave }) : null;

    $('#submit').onclick = async () => {
      const answers = questions.map((_, i) => { const el = $(`input[name="q${i}"]:checked`); return el ? Number(el.value) : null; });
      const missing = answers.map((x, i) => x === null ? i : -1).filter(i => i >= 0);
      $$('.question', main).forEach(f => { f.classList.remove('invalid'); $('.field-error', f).textContent = ''; });
      if (sim && !sim.lastRun()) {
        $('#sub-msg').innerHTML = `<span class="text-danger with-icon">${icon('alert', { size: 14 })}Launch the projectile at least once before submitting.</span>`;
        $('#sim-canvas').focus(); return;
      }
      if (missing.length) {
        missing.forEach(i => { $(`#qf-${i}`).classList.add('invalid'); $(`#qe-${i}`).textContent = 'Choose an answer for this question'; });
        $('#sub-msg').innerHTML = `<span class="text-danger with-icon">${icon('alert', { size: 14 })}${missing.length} question${missing.length > 1 ? 's' : ''} still need${missing.length > 1 ? '' : 's'} an answer.</span>`;
        $(`#qf-${missing[0]} input`).focus(); return;
      }
      $('#sub-msg').textContent = '';
      const key = newKey(); // same key for every retry of this click → never counted twice
      await busy($('#submit'), 'Submitting…', async () => {
        try {
          const r = await api(`/api/me/assignments/${id}/submit`, { method: 'POST', idempotencyKey: key, body: { answers, simulationRunId: sim ? sim.lastRun().id : undefined } });
          clearTimeout(saveTimer); pending = null; if (r.passed) { localStorage.removeItem(localKey); setSave(''); }
          r.feedback.forEach((f, i) => $$(`.option[data-q="${i}"]`).forEach(o => {
            o.classList.remove('correct', 'wrong'); $('input', o).disabled = true; const fb = $('.opt-fb', o); fb.innerHTML = '';
            if (+o.dataset.o === f.correctAnswer) { o.classList.add('correct'); fb.innerHTML = `${icon('check', { size: 16 })}<span class="sr-only">Correct answer</span>`; }
            else if (+o.dataset.o === answers[i]) { o.classList.add('wrong'); fb.innerHTML = `${icon('x', { size: 16 })}<span class="sr-only">Your answer, incorrect</span>`; }
          }));
          const all = (await api('/api/me/assignments').catch(() => ({ assignments: [] }))).assignments;
          const nextUp = all.find(x => x.status !== 'completed' && x.id !== +id);
          $('#result').innerHTML = `<div class="result-banner ${r.passed ? 'pass' : 'fail'}" role="status">
            <div class="result-icon">${icon(r.passed ? 'trophy' : 'refresh', { size: 28 })}</div>
            <div class="grow"><h2>${r.passed ? 'Activity completed!' : 'Not quite there yet'}</h2>
            <p>You scored <strong>${r.score}%</strong> — pass mark ${r.passMark}%.
            ${r.total ? `${r.correct} of ${r.total} questions correct.` : ''} ${r.simulation ? (r.simulation.hit ? 'You hit the target in the simulation.' : `Your launch landed at ${r.simulation.range} m — the target was ${r.simulation.target} m.`) : ''}</p>
            <div class="row">${r.passed && nextUp ? `<a class="btn btn-primary" href="#/learn/activity/${nextUp.id}">${icon('arrowRight', { size: 16 })}Next: ${esc(nextUp.title)}</a>` : ''}
              ${!r.passed ? `<button class="btn btn-primary" id="retry">${icon('refresh', { size: 16 })}Try again</button>` : `<button class="btn" id="retry">${icon('refresh', { size: 16 })}Try again</button>`}
              <a class="btn" href="#/learn">${icon('home', { size: 16 })}My activities</a></div></div></div>`;
          $('#retry').onclick = () => learnerPlayer(id);
          $('#submit').hidden = true;
          if (r.passed) celebrate($('#result'));
          $('#result').focus({ preventScroll: true });
          $('#result').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        } catch (ex) { $('#sub-msg').innerHTML = `<span class="text-danger with-icon">${icon('alert', { size: 14 })}${esc(ex.message)}</span>`; }
      });
    };
  });

  // Confetti burst over an element (skipped when the user prefers reduced motion).
  function celebrate(el) {
    if (reducedMotion()) return;
    const wrap = document.createElement('div'); wrap.className = 'confetti'; wrap.setAttribute('aria-hidden', 'true');
    const colors = ['#6d28d9', '#a78bfa', '#16a34a', '#ebfff8', '#14213d', '#f59e0b'];
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('i');
      p.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-delay:${Math.random() * .3}s;--dx:${(Math.random() - .5) * 160}px;--r:${Math.random() * 720}deg`;
      wrap.appendChild(p);
    }
    el.appendChild(wrap); setTimeout(() => wrap.remove(), 1800);
  }

  // =====================================================================
  // SIMULATION — projectile lab
  // =====================================================================
  const simLimits = (c) => ({ aMin: c.angleMin ?? 5, aMax: c.angleMax ?? 85, sMin: c.speedMin ?? 5, sMax: c.speedMax ?? 40, g: c.gravity ?? 9.8, world: PLANETS[c.planet] || PLANETS.earth });
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function simulationMarkup(c, start) {
    const L = simLimits(c);
    const a0 = clamp(Math.round(start?.angle ?? 45), L.aMin, L.aMax), s0 = clamp(start?.speed ?? Math.round((L.sMin + L.sMax) / 2 * 2) / 2, L.sMin, L.sMax);
    return `<section class="card sim" aria-labelledby="h-sim">
      <div class="sim-head"><div><h2 id="h-sim">${icon('flask')}Projectile lab</h2><p class="muted">${esc(c.instructions || `Land within ${c.tolerance} m of the flag at ${c.targetDistance} m.`)}</p></div>
        <div class="sim-goals"><div class="sim-goal world"><span class="small muted">World</span><strong>${esc(L.world.label)}</strong><span class="small muted">g = ${L.g} m/s²</span></div>
          <div class="sim-goal"><span class="small muted">Target</span><strong>${c.targetDistance} m</strong><span class="small muted">± ${c.tolerance} m</span></div></div></div>
      <div class="sim-stage">
        <canvas id="sim-canvas" tabindex="0" role="img" aria-roledescription="interactive simulation"
          aria-label="Projectile simulation. Target at ${c.targetDistance} metres. Use left and right arrows to change angle, up and down arrows to change speed, Enter to launch."
          aria-describedby="sim-keys"></canvas>
        <div class="sim-hud" aria-hidden="true">
          <div><span>Distance</span><strong id="hud-x">0.0 m</strong></div>
          <div><span>Height</span><strong id="hud-y">0.0 m</strong></div>
          <div><span>Time</span><strong id="hud-t">0.00 s</strong></div>
        </div>
        <div class="sim-banner" id="sim-banner" aria-hidden="true"></div>
      </div>
      <p class="sr-only" id="sim-keys">Keyboard: arrow keys adjust angle and speed, Enter or Space launches.</p>
      <div class="sim-controls">
        <div class="slider-field">
          <div class="slider-top"><label for="ang">Launch angle</label><output id="ang-v" for="ang">45°</output></div>
          <input id="ang" type="range" min="${L.aMin}" max="${L.aMax}" step="1" value="${a0}" aria-valuetext="${a0} degrees">
          <div class="slider-scale" aria-hidden="true"><span>${L.aMin}°</span><span>${Math.round((L.aMin + L.aMax) / 2)}°</span><span>${L.aMax}°</span></div>
        </div>
        <div class="slider-field">
          <div class="slider-top"><label for="spd">Launch speed</label><output id="spd-v" for="spd">15.0 m/s</output></div>
          <input id="spd" type="range" min="${L.sMin}" max="${L.sMax}" step="0.5" value="${s0}" aria-valuetext="${s0} metres per second">
          <div class="slider-scale" aria-hidden="true"><span>${L.sMin}</span><span>${(L.sMin + L.sMax) / 2}</span><span>${L.sMax} m/s</span></div>
        </div>
        <div class="sim-actions">
          <button class="btn btn-primary btn-lg" id="launch">${icon('rocket')}Launch</button>
          ${c.maxLaunches ? `<p class="launches-left small" id="launches-left" aria-live="polite"></p>` : ''}
          <p class="sim-predict small muted" id="sim-predict"></p>
        </div>
      </div>
      <div class="sim-result" id="sim-msg" role="status" aria-live="polite"></div>
      <details class="sim-help"><summary>${icon('help', { size: 16 })}How does it work?</summary>
        <p>The projectile follows the path of an object thrown with no air resistance. Its range is
        <strong>R = v² · sin(2θ) ÷ g</strong>, where v is speed, θ is angle and g is gravity — here <strong>${L.g} m/s²</strong> (${esc(L.world.label)}). Every launch is checked and saved by the server.${c.showGuide === false ? ' The aiming guide is switched off for this challenge.' : ''}</p></details>
      <div class="sim-history"><h3>Your launches <span class="small muted" id="hist-count"></span></h3><ol id="sim-history" class="launch-list"></ol></div>
    </section>`;
  }

  function setupSimulation(c, assignmentId, previousRuns, { launchesUsed = 0, onChange = () => {} } = {}) {
    const L = simLimits(c), G = L.g, W0 = L.world;
    let used = launchesUsed;
    const canvas = $('#sim-canvas'), ctx = canvas.getContext('2d');
    const ang = $('#ang'), spd = $('#spd');
    const runs = previousRuns.map(r => ({ id: r.id, angle: r.angle, speed: r.speed, range: r.range_m, target: r.target_m, hit: !!r.hit }));
    let lastRun = runs.find(r => r.hit) || null; // a previous hit can still be submitted
    let flight = null, particles = [], animId = null, W = 0, H = 0, dpr = 1;
    const maxX = Math.max(60, c.targetDistance * 1.6);

    const physics = (angle, speed) => {
      const th = angle * Math.PI / 180, vx = speed * Math.cos(th), vy = speed * Math.sin(th);
      const T = 2 * vy / G;
      return { vx, vy, T, range: vx * T, peak: (vy * vy) / (2 * G), at: (t) => [vx * t, Math.max(0, vy * t - 0.5 * G * t * t)] };
    };
    // World → screen mapping. Vertical scale grows if a shot would go off the top.
    const geom = () => {
      const pad = Math.max(28, W * 0.05), groundY = H - Math.max(34, H * 0.13);
      const sx = (W - pad * 2) / maxX;
      const maxPeak = Math.max(...runs.map(r => physics(r.angle, r.speed).peak), physics(+ang.value, +spd.value).peak, 10);
      const sy = Math.min(sx, (groundY - 24) / (maxPeak * 1.05));
      return { pad, groundY, sx, sy, X: (x) => pad + x * sx, Y: (y) => groundY - y * sy };
    };

    function resize() {
      const w = canvas.parentElement.clientWidth;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = w; H = Math.round(Math.max(240, Math.min(420, w * 0.46)));
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function drawScene(g) {
      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, g.groundY);
      sky.addColorStop(0, W0.sky[0]); sky.addColorStop(.55, W0.sky[1]); sky.addColorStop(1, W0.sky[2]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, g.groundY);
      // Stars
      ctx.fillStyle = 'rgba(235,255,248,.7)';
      for (let i = 0; i < 40; i++) { const x = (i * 97.3) % W, y = (i * 53.7) % (g.groundY * .45); ctx.fillRect(x, y, 1.5, 1.5); }
      // Hills (parallax layers)
      const hill = (color, base, amp, freq, phase) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, g.groundY);
        for (let x = 0; x <= W; x += 8) ctx.lineTo(x, g.groundY - base - Math.sin(x * freq + phase) * amp);
        ctx.lineTo(W, g.groundY); ctx.fill();
      };
      hill(W0.hills[0], H * .16, H * .05, .006, 1);
      hill(W0.hills[1], H * .08, H * .04, .011, 3);
      // Ground
      const grd = ctx.createLinearGradient(0, g.groundY, 0, H);
      grd.addColorStop(0, W0.ground[0]); grd.addColorStop(1, W0.ground[1]);
      ctx.fillStyle = grd; ctx.fillRect(0, g.groundY, W, H - g.groundY);
      // Distance markers
      ctx.font = '600 11px Poppins, system-ui, sans-serif'; ctx.textAlign = 'center';
      const step = maxX > 120 ? 20 : 10;
      for (let m = 0; m <= maxX; m += step) {
        const x = g.X(m); ctx.fillStyle = 'rgba(235,255,248,.35)'; ctx.fillRect(x, g.groundY, 1, 6);
        ctx.fillStyle = 'rgba(235,255,248,.75)'; ctx.fillText(`${m}m`, x, g.groundY + 20);
      }
      // Target zone + flag
      const tx = g.X(c.targetDistance), tw = c.tolerance * g.sx;
      ctx.fillStyle = 'rgba(235,255,248,.18)'; ctx.fillRect(tx - tw, g.groundY - 3, tw * 2, 6);
      ctx.fillStyle = '#ebfff8'; ctx.fillRect(tx - tw, g.groundY - 3, 2, 6); ctx.fillRect(tx + tw - 2, g.groundY - 3, 2, 6);
      ctx.strokeStyle = '#ebfff8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, g.groundY); ctx.lineTo(tx, g.groundY - 46); ctx.stroke();
      const wave = Math.sin(performance.now() / 300) * 3;
      ctx.fillStyle = '#a78bfa'; ctx.beginPath(); ctx.moveTo(tx, g.groundY - 46); ctx.quadraticCurveTo(tx + 12, g.groundY - 44 + wave, tx + 24, g.groundY - 38); ctx.lineTo(tx, g.groundY - 30); ctx.fill();
    }

    function drawPath(g, p, upto, style) {
      ctx.save(); Object.assign(ctx, style);
      if (style.dash) ctx.setLineDash(style.dash);
      ctx.beginPath();
      const steps = 60;
      for (let i = 0; i <= steps; i++) { const t = (upto * i) / steps, [x, y] = p.at(t); i ? ctx.lineTo(g.X(x), g.Y(y)) : ctx.moveTo(g.X(x), g.Y(y)); }
      ctx.stroke(); ctx.restore();
    }

    function drawCannon(g) {
      const a = +ang.value * Math.PI / 180, bx = g.X(0), by = g.groundY;
      ctx.save(); ctx.translate(bx, by - 8); ctx.rotate(-a);
      ctx.fillStyle = '#ebfff8'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, -6, 36, 12, 6) : ctx.rect(0, -6, 36, 12); ctx.fill();
      ctx.fillStyle = '#6d28d9'; ctx.fillRect(28, -6, 4, 12);
      ctx.restore();
      ctx.fillStyle = '#6d28d9'; ctx.beginPath(); ctx.arc(bx, by - 8, 11, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#14213d'; ctx.fillRect(bx - 16, by - 8, 32, 8);
    }

    function draw() {
      if (!W) return;
      const g = geom();
      ctx.clearRect(0, 0, W, H);
      drawScene(g);
      // Ghost paths of earlier launches
      runs.slice(0, 5).forEach((r, i) => {
        const p = physics(r.angle, r.speed);
        drawPath(g, p, p.T, { strokeStyle: r.hit ? 'rgba(134,239,172,.55)' : `rgba(235,255,248,${0.28 - i * 0.04})`, lineWidth: 1.5, dash: [3, 5] });
        ctx.fillStyle = r.hit ? '#86efac' : 'rgba(235,255,248,.5)'; ctx.beginPath(); ctx.arc(g.X(r.range), g.groundY, 3, 0, Math.PI * 2); ctx.fill();
      });
      // Aiming guide: the first part of the predicted path (not the whole thing — that would give the answer away)
      if (!flight && c.showGuide !== false) {
        const p = physics(+ang.value, +spd.value);
        drawPath(g, p, p.T * 0.32, { strokeStyle: 'rgba(235,255,248,.9)', lineWidth: 2, dash: [6, 6], lineCap: 'round' });
      }
      drawCannon(g);
      // Projectile in flight with glowing trail
      if (flight) {
        const { p, t } = flight;
        ctx.save(); ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 14;
        drawPath(g, p, t, { strokeStyle: '#c4b5fd', lineWidth: 3, lineCap: 'round' });
        const [x, y] = p.at(t);
        ctx.fillStyle = '#ebfff8'; ctx.beginPath(); ctx.arc(g.X(x), g.Y(y), 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      // Particles (hit celebration / dust on miss)
      particles.forEach(pt => { ctx.globalAlpha = Math.max(0, pt.life); ctx.fillStyle = pt.color; ctx.fillRect(pt.x, pt.y, pt.s, pt.s); });
      ctx.globalAlpha = 1;
    }

    const loop = () => {
      particles = particles.filter(p => (p.life -= 0.02) > 0);
      particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; });
      draw();
      animId = (flight || particles.length) ? requestAnimationFrame(loop) : null;
    };
    const kick = () => { if (!animId) animId = requestAnimationFrame(loop); };
    const burst = (x, y, hit) => {
      if (reducedMotion()) return;
      const colors = hit ? ['#86efac', '#ebfff8', '#a78bfa', '#facc15'] : ['rgba(235,255,248,.7)', '#94a3b8'];
      for (let i = 0; i < (hit ? 70 : 18); i++) particles.push({ x, y, vx: (Math.random() - .5) * (hit ? 7 : 3), vy: -Math.random() * (hit ? 7 : 3), s: hit ? 3 + Math.random() * 3 : 2, life: 1, color: colors[i % colors.length] });
    };

    const setHud = (x, y, t) => { $('#hud-x').textContent = `${x.toFixed(1)} m`; $('#hud-y').textContent = `${y.toFixed(1)} m`; $('#hud-t').textContent = `${t.toFixed(2)} s`; };
    const showBanner = (text, cls) => { const b = $('#sim-banner'); b.textContent = text; b.className = `sim-banner show ${cls}`; setTimeout(() => (b.className = 'sim-banner'), 1800); };

    function updateControls() {
      $('#ang-v').textContent = `${ang.value}°`; ang.setAttribute('aria-valuetext', `${ang.value} degrees`);
      $('#spd-v').textContent = `${(+spd.value).toFixed(1)} m/s`; spd.setAttribute('aria-valuetext', `${spd.value} metres per second`);
      const p = physics(+ang.value, +spd.value);
      $('#sim-predict').textContent = `Flight time ≈ ${p.T.toFixed(2)} s · peak ≈ ${p.peak.toFixed(1)} m`;
      ang.style.setProperty('--fill', `${((ang.value - L.aMin) / (L.aMax - L.aMin)) * 100}%`);
      spd.style.setProperty('--fill', `${((spd.value - L.sMin) / (L.sMax - L.sMin)) * 100}%`);
      updateLaunchesLeft();
      if (!flight) draw();
    }

    function renderHistory() {
      $('#hist-count').textContent = runs.length ? `(${runs.length})` : '';
      $('#sim-history').innerHTML = runs.length ? runs.slice(0, 8).map((r, i) => {
        const diff = +(r.range - r.target).toFixed(1);
        return `<li class="${r.hit ? 'hit' : ''}"><span class="launch-n">#${runs.length - i}</span><span>${r.angle}° · ${(+r.speed).toFixed(1)} m/s</span>
          <span class="launch-range">${r.range} m</span>${r.hit ? `<span class="badge b-success">${icon('target', { size: 12 })}Hit</span>` : `<span class="badge b-danger">${icon('x', { size: 12 })}${Math.abs(diff)} m ${diff < 0 ? 'short' : 'long'}</span>`}
          <button class="btn btn-sm btn-ghost" data-reuse="${i}" aria-label="Use ${r.angle} degrees and ${r.speed} metres per second again">${icon('refresh', { size: 14 })}Reuse</button></li>`;
      }).join('') : '<li class="empty-launch">No launches yet — set your angle and speed, then press Launch.</li>';
      $$('[data-reuse]').forEach(b => b.onclick = () => { const r = runs[+b.dataset.reuse]; ang.value = r.angle; spd.value = r.speed; updateControls(); onChange(); ang.focus(); });
    }

    function updateLaunchesLeft() {
      if (!c.maxLaunches) return;
      const left = Math.max(0, c.maxLaunches - used);
      $('#launches-left').innerHTML = left ? `${left} of ${c.maxLaunches} launches left` : `<span class="text-danger">No launches left</span>`;
      if (!flight) $('#launch').disabled = left === 0;
    }
    async function launch() {
      if (flight) return;
      if (c.maxLaunches && used >= c.maxLaunches) return;
      const angle = +ang.value, speed = +spd.value;
      const btn = $('#launch');
      let run;
      await busy(btn, 'Launching…', async () => {
        try { run = await api(`/api/me/assignments/${assignmentId}/simulation-runs`, { method: 'POST', idempotencyKey: newKey(), body: { angle, speed } }); used++; }
        catch (ex) { $('#sim-msg').innerHTML = `<div class="sim-feedback miss">${icon('alert')}<span>${esc(ex.message)}</span></div>`; }
      });
      if (!run) return;
      const p = physics(angle, speed);
      const finish = () => {
        flight = null;
        const g = geom(); burst(g.X(run.range), g.groundY - 4, run.hit);
        setHud(run.range, 0, p.T);
        runs.unshift({ ...run });
        // Submit the most recent hit if there is one, otherwise the latest launch.
        lastRun = run.hit ? run : (lastRun?.hit ? lastRun : run);
        const diff = +(run.range - run.target).toFixed(1);
        $('#sim-msg').innerHTML = run.hit
          ? `<div class="sim-feedback hit">${icon('target')}<div><strong>Bullseye! Landed at ${run.range} m.</strong><span>You're within ${c.tolerance} m of the target. Answer the question below and submit.</span></div></div>`
          : `<div class="sim-feedback miss">${icon('x')}<div><strong>${Math.abs(diff)} m ${diff < 0 ? 'short' : 'too far'} — landed at ${run.range} m.</strong><span>${diff < 0 ? 'Try more speed, or an angle closer to 45°.' : 'Try less speed, or move the angle away from 45°.'}</span></div></div>`;
        showBanner(run.hit ? 'BULLSEYE!' : `${Math.abs(diff)} m ${diff < 0 ? 'short' : 'long'}`, run.hit ? 'hit' : 'miss');
        renderHistory(); updateLaunchesLeft(); kick();
      };
      if (reducedMotion()) { flight = null; draw(); finish(); return; }
      const dur = Math.min(2600, 700 + p.T * 420), start = performance.now();
      flight = { p, t: 0 };
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur) * p.T;
        flight.t = t; const [x, y] = p.at(t); setHud(x, y, t);
        if (t >= p.T) { finish(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step); kick();
    }

    // Keyboard control on the canvas: arrows adjust, Enter/Space launches.
    canvas.addEventListener('keydown', (e) => {
      const map = { ArrowLeft: [ang, -1], ArrowRight: [ang, 1], ArrowDown: [spd, -0.5], ArrowUp: [spd, 0.5] };
      if (map[e.key]) { e.preventDefault(); const [el, d] = map[e.key]; el.value = Math.min(+el.max, Math.max(+el.min, +el.value + d * (e.shiftKey ? 5 : 1))); updateControls(); announce(`Angle ${ang.value} degrees, speed ${spd.value} metres per second`); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(); }
    });
    ang.addEventListener('input', updateControls); spd.addEventListener('input', updateControls);
    ang.addEventListener('change', onChange); spd.addEventListener('change', onChange);
    canvas.addEventListener('keyup', (e) => { if (e.key.startsWith('Arrow')) onChange(); });
    $('#launch').onclick = launch;
    const ro = new ResizeObserver(() => resize()); ro.observe(canvas.parentElement);
    // Keep the flag waving gently (cheap redraw, paused when reduced motion is requested).
    if (!reducedMotion()) { const idle = () => { if (!canvas.isConnected) { ro.disconnect(); return; } if (!flight && !particles.length) draw(); setTimeout(() => requestAnimationFrame(idle), 120); }; idle(); }
    updateControls(); renderHistory(); resize();
    if (lastRun?.hit) $('#sim-msg').innerHTML = `<div class="sim-feedback hit">${icon('target')}<div><strong>You've already hit the target (${lastRun.range} m).</strong><span>You can submit, or keep experimenting.</span></div></div>`;
    return { lastRun: () => lastRun, position: () => ({ angle: +ang.value, speed: +spd.value }) };
  }

  // =====================================================================
  // LEARNER — Progress
  // =====================================================================
  const learnerProgress = () => page('progress', 'My progress', {}, async (main) => {
    const [{ assignments, summary: s }, history] = await Promise.all([api('/api/me/assignments'), api('/api/me/history')]);
    const completed = assignments.filter(a => a.status === 'completed').sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));
    const bySubject = {};
    assignments.forEach(a => { const k = a.subject || 'General'; bySubject[k] = bySubject[k] || { t: 0, c: 0 }; bySubject[k].t++; if (a.status === 'completed') bySubject[k].c++; });
    main.innerHTML = `
      <div class="page-head"><div><h1>My progress</h1><p class="muted">Your completion history and results</p></div></div>
      <div class="grid grid-2">
        <section class="card" aria-labelledby="h-ov"><h2 id="h-ov">Overall</h2><div class="donut-row">
          ${donut([{ value: s.completed, color: STATUS_COLORS.completed }, { value: s.inProgress, color: STATUS_COLORS.in_progress }, { value: s.notStarted, color: STATUS_COLORS.not_started }], `${s.completionRate}% complete`)}
          <ul class="legend"><li class="legend-big">${s.completionRate}% complete</li>
            <li><i style="background:${STATUS_COLORS.completed}"></i>Completed <strong>${s.completed}</strong></li>
            <li><i style="background:${STATUS_COLORS.in_progress}"></i>In progress <strong>${s.inProgress}</strong></li>
            <li><i style="background:${STATUS_COLORS.not_started}"></i>Not started <strong>${s.notStarted}</strong></li>
            <li>Average score <strong>${s.averageScore != null ? s.averageScore + '%' : '—'}</strong></li></ul></div></section>
        <section class="card" aria-labelledby="h-bs"><h2 id="h-bs">By subject</h2>
          ${Object.entries(bySubject).map(([k, v]) => { const pct = Math.round(v.c / v.t * 100); return `<div class="bar-row"><span>${esc(k)}</span>${progress(pct, 'success', `${k} completion`)}<strong>${pct}%</strong></div>`; }).join('')
            || emptyState({ ico: 'chart', title: 'No activities yet' })}</section>
      </div>
      <section class="card mt" aria-labelledby="h-ch"><h2 id="h-ch">Completion history</h2>
        ${completed.length ? `<div class="table-wrap"><table class="responsive"><thead><tr><th data-sort="text">Activity</th><th data-sort="num">Best score</th><th data-sort="num">Attempts</th><th data-sort="text">Completed</th></tr></thead><tbody>
          ${completed.map(a => `<tr><td data-v="${esc(a.title)}"><strong>${esc(a.title)}</strong><div>${typeBadge(a.type)}</div></td><td data-v="${a.best_score}"><span class="badge b-success">${a.best_score}%</span></td><td>${a.attempts}</td><td data-v="${a.completed_at}">${fmtDate(a.completed_at)}</td></tr>`).join('')}
        </tbody></table></div>` : emptyState({ ico: 'trophy', title: 'No completed activities yet', action: '<a class="btn btn-primary" href="#/learn">Go to my activities</a>' })}</section>
      <section class="card mt" aria-labelledby="h-aa"><h2 id="h-aa">All attempts</h2>
        ${history.length ? `<div class="table-wrap"><table class="responsive"><thead><tr><th data-sort="text">Activity</th><th data-sort="num">Score</th><th>Result</th><th data-sort="text">Submitted</th></tr></thead><tbody>
          ${history.map(h => `<tr><td>${esc(h.title)}</td><td>${h.score}%</td><td>${h.passed ? `<span class="badge b-success">${icon('check', { size: 12 })}Passed</span>` : `<span class="badge b-danger">${icon('x', { size: 12 })}Not passed</span>`}</td><td data-v="${h.submitted_at}">${fmtDate(h.submitted_at)}</td></tr>`).join('')}
        </tbody></table></div>` : emptyState({ ico: 'clock', title: 'No attempts yet', text: 'Launch an activity from your dashboard to get started.' })}</section>`;
  });

  // =====================================================================
  // Router
  // =====================================================================
  async function route() {
    const [rawPath, qs] = location.hash.slice(1).split('?');
    const path = rawPath || '/';
    const query = new URLSearchParams(qs || '');
    $('#modal-root').innerHTML = ''; document.body.classList.remove('modal-open');
    stopLive(); onReconnect = null;
    if (!state.token) { if (path !== '/login') location.hash = '#/login'; else renderLogin(); return; }
    try {
      if (!state.user) state.user = (await api('/api/auth/me')).user;
    } catch { return; }
    const home = state.user.role === 'admin' ? '#/admin' : '#/learn';
    if (path === '/login' || path === '/') { location.hash = home; return; }
    const isAdmin = state.user.role === 'admin';
    let m;
    if (isAdmin && path === '/admin') return adminDashboard();
    if (isAdmin && path === '/admin/learners') return adminLearners();
    if (isAdmin && (m = path.match(/^\/admin\/learners\/(\d+)$/))) return adminLearnerDetail(m[1]);
    if (isAdmin && path === '/admin/activities') return adminActivities(query);
    if (isAdmin && (m = path.match(/^\/admin\/activities\/(\d+)$/))) return adminActivityDetail(m[1]);
    if (isAdmin && path === '/admin/analytics') return adminAnalytics();
    if (isAdmin && path === '/admin/audit') return adminAudit(query);
    if (!isAdmin && path === '/learn') return learnerDashboard();
    if (!isAdmin && path === '/learn/progress') return learnerProgress();
    if (!isAdmin && (m = path.match(/^\/learn\/activity\/(\d+)$/))) return learnerPlayer(m[1]);
    location.hash = home;
  }
  // Network status: show a banner while offline and resume pending work when the connection returns.
  let onReconnect = null;
  const netBanner = document.createElement('div');
  netBanner.id = 'net-banner'; netBanner.setAttribute('role', 'status'); netBanner.hidden = navigator.onLine !== false;
  netBanner.innerHTML = `${icon('wifiOff')}<span>You're offline. Your progress is being kept on this device and will sync when you reconnect.</span>`;
  document.body.prepend(netBanner);
  window.addEventListener('offline', () => { netBanner.hidden = false; });
  window.addEventListener('online', () => { netBanner.hidden = true; toast('Back online'); if (onReconnect) onReconnect(); });
  window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
  route();
})();
