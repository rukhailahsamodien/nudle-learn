/* Nudle Learn — single-page front end (vanilla JS, hash routing). */
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app');

  // ---------- state & API ----------
  const state = { token: localStorage.getItem('nudle_token'), user: null };
  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && !path.includes('/auth/login')) { logout(); throw new Error('Session expired, please log in again'); }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }
  function logout() {
    state.token = null; state.user = null;
    localStorage.removeItem('nudle_token');
    location.hash = '#/login';
  }

  // ---------- UI helpers ----------
  let toastTimer;
  function toast(msg, isError = false) {
    const t = $('#toast');
    t.textContent = msg; t.className = `show${isError ? ' error' : ''}`;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = ''), 3000);
  }
  function modal(html, { wide = false } = {}) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-backdrop"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
    const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    $('.modal-backdrop', root).addEventListener('mousedown', (e) => { if (e.target.classList.contains('modal-backdrop')) close(); });
    $$('[data-close]', root).forEach(b => b.addEventListener('click', close));
    const first = $('input, select, textarea', root); if (first) first.focus();
    return { el: $('.modal', root), close };
  }
  function confirmDialog(message, okLabel = 'Confirm') {
    return new Promise(resolve => {
      const m = modal(`<div class="modal-head"><h2>Please confirm</h2><button class="close-x" data-close aria-label="Close">×</button></div>
        <p>${esc(message)}</p><div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="ok">${esc(okLabel)}</button></div>`);
      $('#ok', m.el).onclick = () => { m.close(); resolve(true); };
    });
  }
  const initials = (n) => esc(String(n).split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase());
  const fmtDate = (d) => d ? new Date(d.length <= 10 ? d + 'T00:00:00' : (d.includes('T') ? d : d.replace(' ', 'T') + 'Z')).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const isOverdue = (a) => a.status !== 'completed' && a.due_date && a.due_date < new Date().toISOString().slice(0, 10);
  const statusBadge = (a) => {
    if (isOverdue(a)) return '<span class="badge b-danger">Overdue</span>';
    return { completed: '<span class="badge b-success">Completed</span>', in_progress: '<span class="badge b-warning">In progress</span>', assigned: '<span class="badge b-neutral">Not started</span>' }[a.status];
  };
  const typeBadge = (t) => `<span class="badge ${{ lesson: 'b-info', quiz: 'b-primary', simulation: 'b-warning' }[t]}">${esc(t[0].toUpperCase() + t.slice(1))}</span>`;
  const progress = (pct, cls = '') => `<div class="progress ${cls}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>`;
  const loading = () => '<div class="empty">Loading…</div>';
  function donut(segments, size = 140) {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    const r = 52, c = 2 * Math.PI * r; let offset = 0;
    const arcs = segments.map(s => {
      const len = (s.value / total) * c;
      const el = `<circle r="${r}" cx="70" cy="70" fill="none" stroke="${s.color}" stroke-width="18" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 70 70)"/>`;
      offset += len; return el;
    }).join('');
    return `<svg class="donut" viewBox="0 0 140 140" width="${size}" height="${size}" aria-hidden="true"><circle r="${r}" cx="70" cy="70" fill="none" stroke="#eef1f6" stroke-width="18"/>${arcs}</svg>`;
  }

  // ---------- layout ----------
  function shell(active, content) {
    const isAdmin = state.user.role === 'admin';
    const links = isAdmin
      ? [['#/admin', 'dashboard', '📊 Dashboard'], ['#/admin/learners', 'learners', '👥 Learners'], ['#/admin/activities', 'activities', '🧩 Activities']]
      : [['#/learn', 'dashboard', '🏠 My dashboard'], ['#/learn/progress', 'progress', '📈 My progress']];
    app.innerHTML = `
      <div class="topbar"><div class="brand" style="padding:0"><span class="brand-mark">N</span>Nudle Learn</div><button id="menu" aria-label="Open menu">☰</button></div>
      <div class="shell">
        <aside class="sidebar" id="sidebar">
          <div class="brand"><span class="brand-mark">N</span>Nudle Learn</div>
          <nav class="nav">${links.map(([href, key, label]) => `<a href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`).join('')}</nav>
          <div class="spacer"></div>
          <div class="user-chip"><strong>${esc(state.user.name)}</strong>${esc(state.user.email)}<br><span class="badge b-primary" style="margin-top:6px">${isAdmin ? 'Administrator' : 'Learner'}</span>
            <div style="margin-top:10px"><button class="btn btn-sm" id="logout">Log out</button></div></div>
        </aside>
        <main class="main" id="main">${content}</main>
      </div>`;
    $('#logout').onclick = logout;
    $('#menu').onclick = () => $('#sidebar').classList.toggle('open');
    return $('#main');
  }

  // ---------- login ----------
  function renderLogin() {
    app.innerHTML = `
      <div class="login-wrap">
        <section class="login-hero">
          <div class="brand" style="padding:0"><span class="brand-mark">N</span>Nudle Learn</div>
          <div><h1>Interactive learning, managed in one place.</h1>
          <p>Assign simulations, lessons and quizzes to your learners and track their progress in real time.</p></div>
          <p class="small">© Nudle Learning Platform</p>
        </section>
        <section class="login-form"><div class="card">
          <h1>Welcome back</h1><p class="muted">Sign in to continue</p>
          <form id="login-form" novalidate>
            <div class="field"><label for="email">Email</label><input id="email" type="email" autocomplete="username" required></div>
            <div class="field"><label for="password">Password</label><input id="password" type="password" autocomplete="current-password" required></div>
            <div class="error-text" id="login-error"></div>
            <button class="btn btn-primary" style="width:100%" type="submit">Sign in</button>
          </form>
          <div class="demo"><strong>Demo accounts</strong>
            <div class="row" style="margin-top:6px"><button class="btn btn-sm" data-demo="admin@nudle.edu|admin123">Administrator</button><button class="btn btn-sm" data-demo="amara@nudle.edu|learner123">Learner</button></div>
          </div>
        </div></section>
      </div>`;
    $$('[data-demo]').forEach(b => b.onclick = () => { const [e, p] = b.dataset.demo.split('|'); $('#email').value = e; $('#password').value = p; });
    $('#login-form').onsubmit = async (e) => {
      e.preventDefault();
      const err = $('#login-error'); err.textContent = '';
      try {
        const data = await api('/api/auth/login', { method: 'POST', body: { email: $('#email').value, password: $('#password').value } });
        state.token = data.token; state.user = data.user; localStorage.setItem('nudle_token', data.token);
        location.hash = data.user.role === 'admin' ? '#/admin' : '#/learn';
      } catch (ex) { err.textContent = ex.message; }
    };
  }

  // ================= ADMIN =================
  async function adminDashboard() {
    const main = shell('dashboard', loading());
    const s = await api('/api/admin/stats');
    const acts = await api('/api/activities');
    main.innerHTML = `
      <div class="page-head"><div><h1>Dashboard</h1><p class="muted">Overview of learners and activity performance</p></div>
        <a class="btn btn-primary" href="#/admin/activities?new=1">+ New activity</a></div>
      <div class="grid grid-4">
        ${statCard('Total learners', s.totalLearners, `${s.totalLearners - s.activeLearners} deactivated`, '👥', 'var(--primary-50)')}
        ${statCard('Active learners', s.activeLearners, s.totalLearners ? `${Math.round(s.activeLearners / s.totalLearners * 100)}% of all learners` : '', '✅', 'var(--success-50)')}
        ${statCard('Assigned activities', s.assignedActivities, `${s.totalActivities} activities in library`, '🧩', 'var(--info-50)')}
        ${statCard('Completion rate', s.completionRate + '%', s.averageScore != null ? `Avg. score ${s.averageScore}%` : 'No completions yet', '🎯', 'var(--warning-50)')}
      </div>
      <div class="grid grid-2" style="margin-top:16px">
        <div class="card"><h2>Assignment status</h2>
          <div class="row" style="gap:28px;margin-top:12px">
            ${donut([{ value: s.completed, color: '#16a34a' }, { value: s.inProgress, color: '#d97706' }, { value: s.notStarted, color: '#cbd5e1' }])}
            <div class="legend">
              <span><i style="background:#16a34a"></i>Completed — <strong>${s.completed}</strong></span>
              <span><i style="background:#d97706"></i>In progress — <strong>${s.inProgress}</strong></span>
              <span><i style="background:#cbd5e1"></i>Not started — <strong>${s.notStarted}</strong></span>
              <span><i style="background:#dc2626"></i>Overdue — <strong>${s.overdue}</strong></span>
            </div></div></div>
        <div class="card"><h2>Completion by subject</h2>
          ${s.bySubject.map(r => { const pct = r.assigned ? Math.round(r.completed / r.assigned * 100) : 0;
            return `<div class="bar-row"><span>${esc(r.subject)}</span>${progress(pct, 'success')}<strong>${pct}%</strong></div>`; }).join('') || '<p class="muted">No data yet</p>'}
        </div>
      </div>
      <div class="grid grid-2" style="margin-top:16px">
        <div class="card"><h2>Activity completion statistics</h2>
          <div class="table-wrap"><table><thead><tr><th>Activity</th><th>Assigned</th><th>Completion</th><th class="hide-sm">Avg score</th></tr></thead><tbody>
          ${acts.map(a => `<tr class="clickable" data-href="#/admin/activities/${a.id}"><td><strong>${esc(a.title)}</strong><br>${typeBadge(a.type)}</td><td>${a.assigned}</td>
            <td style="min-width:120px">${progress(a.completionRate, 'success')}<span class="small muted">${a.completed}/${a.assigned} · ${a.completionRate}%</span></td>
            <td class="hide-sm">${a.avg_score != null ? a.avg_score + '%' : '—'}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No activities</td></tr>'}
          </tbody></table></div></div>
        <div class="card"><h2>Recent completions</h2>
          ${s.recent.length ? s.recent.map(r => `<div class="person" style="padding:10px 0;border-bottom:1px solid var(--border)"><span class="avatar">${initials(r.learner)}</span>
            <div style="flex:1"><strong>${esc(r.learner)}</strong><div class="small muted">${esc(r.activity)} · ${fmtDate(r.completed_at)}</div></div><span class="badge b-success">${r.score}%</span></div>`).join('') : '<p class="muted">No completions yet</p>'}
        </div>
      </div>`;
    bindRowLinks(main);
  }
  const statCard = (label, value, sub, icon, bg) => `<div class="card stat"><span class="icon" style="background:${bg}">${icon}</span><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="sub">${esc(sub)}</div></div>`;
  function bindRowLinks(root) { $$('[data-href]', root).forEach(r => r.addEventListener('click', (e) => { if (!e.target.closest('button')) location.hash = r.dataset.href; })); }

  // ----- learners -----
  const learnerFilters = { q: '', status: 'all', cohort: '' };
  async function adminLearners() {
    const main = shell('learners', loading());
    const cohorts = await api('/api/cohorts');
    main.innerHTML = `
      <div class="page-head"><div><h1>Learners</h1><p class="muted">Add, edit, search, filter and deactivate learners</p></div>
        <button class="btn btn-primary" id="add">+ Add learner</button></div>
      <div class="card">
        <div class="row" style="margin-bottom:14px">
          <div class="grow"><input id="q" type="search" placeholder="Search by name or email…" value="${esc(learnerFilters.q)}" aria-label="Search learners"></div>
          <select id="status" style="width:auto" aria-label="Filter by status">
            ${[['all', 'All statuses'], ['active', 'Active'], ['inactive', 'Deactivated']].map(([v, l]) => `<option value="${v}" ${learnerFilters.status === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          <select id="cohort" style="width:auto" aria-label="Filter by cohort"><option value="">All cohorts</option>
            ${cohorts.map(c => `<option ${learnerFilters.cohort === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        </div>
        <div class="table-wrap"><table><thead><tr><th>Learner</th><th class="hide-sm">Cohort</th><th>Progress</th><th class="hide-sm">Avg score</th><th>Status</th><th></th></tr></thead>
        <tbody id="rows"></tbody></table></div>
      </div>`;
    let timer;
    const load = async () => {
      const qs = new URLSearchParams(learnerFilters).toString();
      const rows = await api(`/api/learners?${qs}`);
      $('#rows').innerHTML = rows.length ? rows.map(l => `
        <tr class="clickable" data-href="#/admin/learners/${l.id}">
          <td><div class="person"><span class="avatar">${initials(l.name)}</span><div><strong>${esc(l.name)}</strong><div class="small muted">${esc(l.email)}</div></div></div></td>
          <td class="hide-sm">${esc(l.cohort || '—')}</td>
          <td style="min-width:120px">${progress(l.progress)}<span class="small muted">${l.completed}/${l.assigned} completed</span></td>
          <td class="hide-sm">${l.avgScore != null ? l.avgScore + '%' : '—'}</td>
          <td>${l.active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Deactivated</span>'}</td>
          <td><div class="actions"><button class="btn btn-sm" data-edit="${l.id}">Edit</button>
            <button class="btn btn-sm ${l.active ? 'btn-danger' : ''}" data-toggle="${l.id}" data-active="${l.active ? 1 : 0}">${l.active ? 'Deactivate' : 'Reactivate'}</button></div></td>
        </tr>`).join('') : '<tr><td colspan="6" class="empty">No learners match your filters</td></tr>';
      bindRowLinks($('#rows'));
      $$('[data-edit]').forEach(b => b.onclick = () => learnerForm(rows.find(r => r.id == b.dataset.edit), load));
      $$('[data-toggle]').forEach(b => b.onclick = async () => {
        const activate = b.dataset.active === '0';
        const l = rows.find(r => r.id == b.dataset.toggle);
        if (!activate && !(await confirmDialog(`Deactivate ${l.name}? They will no longer be able to log in.`, 'Deactivate'))) return;
        try { await api(`/api/learners/${l.id}/status`, { method: 'PATCH', body: { active: activate } }); toast(`${l.name} ${activate ? 'reactivated' : 'deactivated'}`); load(); }
        catch (ex) { toast(ex.message, true); }
      });
    };
    $('#q').oninput = (e) => { learnerFilters.q = e.target.value; clearTimeout(timer); timer = setTimeout(load, 250); };
    $('#status').onchange = (e) => { learnerFilters.status = e.target.value; load(); };
    $('#cohort').onchange = (e) => { learnerFilters.cohort = e.target.value; load(); };
    $('#add').onclick = () => learnerForm(null, load);
    await load();
  }

  function learnerForm(learner, onSaved) {
    const m = modal(`
      <div class="modal-head"><h2>${learner ? 'Edit learner' : 'Add learner'}</h2><button class="close-x" data-close aria-label="Close">×</button></div>
      <form id="lf" novalidate>
        <div class="field"><label for="f-name">Full name</label><input id="f-name" required value="${esc(learner?.name)}"></div>
        <div class="field"><label for="f-email">Email</label><input id="f-email" type="email" required value="${esc(learner?.email)}"></div>
        <div class="form-grid">
          <div class="field"><label for="f-cohort">Cohort / class</label><input id="f-cohort" placeholder="e.g. Grade 10A" value="${esc(learner?.cohort)}"></div>
          <div class="field"><label for="f-pass">${learner ? 'New password (optional)' : 'Password'}</label><input id="f-pass" type="password" autocomplete="new-password" placeholder="Min. 6 characters"></div>
        </div>
        <div class="error-text" id="f-err"></div>
        <div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" type="submit">${learner ? 'Save changes' : 'Add learner'}</button></div>
      </form>`);
    $('#lf', m.el).onsubmit = async (e) => {
      e.preventDefault();
      const body = { name: $('#f-name').value, email: $('#f-email').value, cohort: $('#f-cohort').value, password: $('#f-pass').value };
      try {
        await api(learner ? `/api/learners/${learner.id}` : '/api/learners', { method: learner ? 'PUT' : 'POST', body });
        m.close(); toast(learner ? 'Learner updated' : 'Learner added'); onSaved();
      } catch (ex) { $('#f-err').textContent = ex.message; }
    };
  }

  async function adminLearnerDetail(id) {
    const main = shell('learners', loading());
    const d = await api(`/api/learners/${id}`);
    const l = d.learner, s = d.summary;
    main.innerHTML = `
      <p><a href="#/admin/learners">← Back to learners</a></p>
      <div class="page-head"><div class="person"><span class="avatar" style="width:52px;height:52px;font-size:1.1rem">${initials(l.name)}</span>
        <div><h1>${esc(l.name)}</h1><p class="muted" style="margin:0">${esc(l.email)} · ${esc(l.cohort || 'No cohort')} · ${l.active ? '<span class="badge b-success">Active</span>' : '<span class="badge b-neutral">Deactivated</span>'}</p></div></div>
        <div class="row"><button class="btn" id="edit">Edit</button><button class="btn btn-primary" id="assign">Assign activity</button></div></div>
      <div class="grid grid-4">
        ${statCard('Assigned', s.total, `${s.notStarted} not started`, '🧩', 'var(--info-50)')}
        ${statCard('Completed', s.completed, `${s.inProgress} in progress`, '✅', 'var(--success-50)')}
        ${statCard('Completion rate', s.completionRate + '%', '', '🎯', 'var(--warning-50)')}
        ${statCard('Average score', s.averageScore != null ? s.averageScore + '%' : '—', `Last login: ${fmtDate(l.last_login)}`, '⭐', 'var(--primary-50)')}
      </div>
      <div class="card" style="margin-top:16px"><h2>Assigned activities</h2>
        <div class="table-wrap"><table><thead><tr><th>Activity</th><th>Status</th><th class="hide-sm">Due</th><th>Best score</th><th class="hide-sm">Attempts</th><th class="hide-sm">Completed</th><th></th></tr></thead><tbody>
        ${d.assignments.map(a => `<tr><td><strong>${esc(a.title)}</strong><br>${typeBadge(a.type)} <span class="small muted">${esc(a.subject)}</span></td>
          <td>${statusBadge(a)}</td><td class="hide-sm">${fmtDate(a.due_date)}</td><td>${a.best_score != null ? a.best_score + '%' : '—'}</td>
          <td class="hide-sm">${a.attempts}</td><td class="hide-sm">${fmtDate(a.completed_at)}</td>
          <td><div class="actions"><button class="btn btn-sm btn-danger" data-unassign="${a.id}">Remove</button></div></td></tr>`).join('') || '<tr><td colspan="7" class="empty">No activities assigned yet</td></tr>'}
        </tbody></table></div></div>
      <div class="card"><h2>Attempt history</h2>
        ${d.attempts.length ? `<div class="table-wrap"><table><thead><tr><th>Activity</th><th>Score</th><th>Result</th><th>Submitted</th></tr></thead><tbody>
          ${d.attempts.map(t => `<tr><td>${esc(t.title)}</td><td>${t.score}%</td><td>${t.passed ? '<span class="badge b-success">Passed</span>' : '<span class="badge b-danger">Not passed</span>'}</td><td>${fmtDate(t.submitted_at)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">No attempts submitted through the platform yet.</p>'}</div>`;
    $('#edit').onclick = () => learnerForm(l, () => adminLearnerDetail(id));
    $('#assign').onclick = async () => {
      const acts = await api('/api/activities');
      const m = modal(`<div class="modal-head"><h2>Assign activity to ${esc(l.name)}</h2><button class="close-x" data-close>×</button></div>
        <div class="field"><label for="a-act">Activity</label><select id="a-act">${acts.map(a => `<option value="${a.id}">${esc(a.title)} (${a.type})</option>`).join('')}</select></div>
        <div class="field"><label for="a-due">Due date (optional)</label><input id="a-due" type="date"></div>
        <div class="error-text" id="a-err"></div>
        <div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="a-go">Assign</button></div>`);
      $('#a-go', m.el).onclick = async () => {
        try {
          const r = await api(`/api/activities/${$('#a-act').value}/assign`, { method: 'POST', body: { learnerIds: [l.id], dueDate: $('#a-due').value || undefined } });
          m.close(); toast(r.created ? 'Activity assigned' : 'Already assigned to this learner'); adminLearnerDetail(id);
        } catch (ex) { $('#a-err').textContent = ex.message; }
      };
    };
    $$('[data-unassign]').forEach(b => b.onclick = async () => {
      if (!(await confirmDialog('Remove this assignment and its progress?', 'Remove'))) return;
      await api(`/api/assignments/${b.dataset.unassign}`, { method: 'DELETE' }); toast('Assignment removed'); adminLearnerDetail(id);
    });
  }

  // ----- activities -----
  async function adminActivities(query) {
    const main = shell('activities', loading());
    const acts = await api('/api/activities');
    main.innerHTML = `
      <div class="page-head"><div><h1>Activities</h1><p class="muted">Create interactive learning activities and assign them to learners</p></div>
        <button class="btn btn-primary" id="new">+ New activity</button></div>
      <div class="grid grid-3">
        ${acts.map(a => `<div class="card activity-card">
          <div class="meta">${typeBadge(a.type)}<span class="badge b-neutral">${esc(a.subject)}</span><span class="small muted">⏱ ${a.duration_min} min</span></div>
          <h3>${esc(a.title)}</h3><p>${esc(a.description || '')}</p>
          <div>${progress(a.completionRate, 'success')}<span class="small muted">${a.completed}/${a.assigned} completed · ${a.completionRate}%${a.avg_score != null ? ` · avg ${a.avg_score}%` : ''}</span></div>
          <div class="row"><a class="btn btn-sm" href="#/admin/activities/${a.id}">View stats</a><button class="btn btn-sm" data-edit="${a.id}">Edit</button><button class="btn btn-sm btn-primary" data-assign="${a.id}">Assign</button></div>
        </div>`).join('') || '<div class="card empty">No activities yet. Create your first one.</div>'}
      </div>`;
    $('#new').onclick = () => activityForm(null, () => adminActivities());
    $$('[data-edit]').forEach(b => b.onclick = () => activityForm(acts.find(a => a.id == b.dataset.edit), () => adminActivities()));
    $$('[data-assign]').forEach(b => b.onclick = () => assignForm(acts.find(a => a.id == b.dataset.assign), () => adminActivities()));
    if (query.get('new')) { history.replaceState(null, '', '#/admin/activities'); activityForm(null, () => adminActivities()); }
  }

  function activityForm(act, onSaved) {
    const c = act?.content || { sections: [{ heading: '', body: '' }], questions: [] };
    let questions = JSON.parse(JSON.stringify(c.questions || []));
    let sections = JSON.parse(JSON.stringify(c.sections || [{ heading: '', body: '' }]));
    const m = modal(`
      <div class="modal-head"><h2>${act ? 'Edit activity' : 'New activity'}</h2><button class="close-x" data-close aria-label="Close">×</button></div>
      <form id="af" novalidate>
        <div class="field"><label for="t-title">Title</label><input id="t-title" value="${esc(act?.title)}" required></div>
        <div class="field"><label for="t-desc">Description</label><textarea id="t-desc" style="min-height:60px">${esc(act?.description)}</textarea></div>
        <div class="form-grid">
          <div class="field"><label for="t-type">Type</label><select id="t-type">
            ${[['lesson', 'Lesson (content + check)'], ['quiz', 'Quiz'], ['simulation', 'Simulation (projectile lab)']].map(([v, l]) => `<option value="${v}" ${act?.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="t-subject">Subject</label><input id="t-subject" value="${esc(act?.subject)}" placeholder="e.g. Mathematics"></div>
          <div class="field"><label for="t-dur">Duration (minutes)</label><input id="t-dur" type="number" min="1" value="${act?.duration_min ?? 10}"></div>
          <div class="field"><label for="t-pass">Pass mark (%)</label><input id="t-pass" type="number" min="0" max="100" value="${act?.pass_mark ?? 50}"></div>
        </div>
        <div id="sim-fields" class="form-grid">
          <div class="field"><label for="t-target">Target distance (m)</label><input id="t-target" type="number" min="5" max="200" value="${c.targetDistance ?? 40}"></div>
          <div class="field"><label for="t-tol">Tolerance (± m)</label><input id="t-tol" type="number" min="0.5" step="0.5" value="${c.tolerance ?? 2}"></div>
          <div class="field" style="grid-column:1/-1"><label for="t-instr">Instructions</label><textarea id="t-instr" style="min-height:50px">${esc(c.instructions)}</textarea></div>
        </div>
        <div id="sec-wrap"><div class="row" style="justify-content:space-between"><h3>Lesson content</h3><button type="button" class="btn btn-sm" id="add-sec">+ Section</button></div><div id="secs"></div></div>
        <div class="row" style="justify-content:space-between;margin-top:8px"><h3>Questions</h3><button type="button" class="btn btn-sm" id="add-q">+ Question</button></div>
        <div id="qs"></div>
        <div class="error-text" id="t-err"></div>
        <div class="modal-foot">${act ? '<button type="button" class="btn btn-danger" id="del" style="margin-right:auto">Delete</button>' : ''}
          <button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary" type="submit">${act ? 'Save changes' : 'Create activity'}</button></div>
      </form>`, { wide: true });

    const syncFromDom = () => {
      sections = $$('.sec', m.el).map(el => ({ heading: $('.s-h', el).value, body: $('.s-b', el).value }));
      questions = $$('.qq', m.el).map(el => ({
        q: $('.q-t', el).value,
        options: $$('.q-o', el).map(i => i.value),
        answer: Number(($('.q-a:checked', el) || {}).value ?? 0),
      }));
    };
    const renderParts = () => {
      const type = $('#t-type').value;
      $('#sim-fields').style.display = type === 'simulation' ? '' : 'none';
      $('#sec-wrap').style.display = type === 'lesson' ? '' : 'none';
      $('#secs').innerHTML = sections.map((s, i) => `<div class="q-editor sec">
        <div class="row"><input class="s-h grow" placeholder="Section heading" value="${esc(s.heading)}" aria-label="Section heading"><button type="button" class="btn btn-sm btn-danger" data-rm-sec="${i}">Remove</button></div>
        <textarea class="s-b" placeholder="Section content" style="margin-top:8px" aria-label="Section content">${esc(s.body)}</textarea></div>`).join('');
      $('#qs').innerHTML = questions.map((q, i) => `<div class="q-editor qq">
        <div class="row"><input class="q-t grow" placeholder="Question ${i + 1}" value="${esc(q.q)}" aria-label="Question text"><button type="button" class="btn btn-sm btn-danger" data-rm-q="${i}">Remove</button></div>
        ${[0, 1, 2, 3].map(o => `<div class="row" style="margin-top:6px;flex-wrap:nowrap"><input type="radio" class="q-a" name="ans-${i}" value="${o}" ${q.answer === o ? 'checked' : ''} style="width:auto" aria-label="Mark option ${o + 1} correct">
          <input class="q-o" placeholder="Option ${o + 1}" value="${esc(q.options?.[o])}"></div>`).join('')}
        <div class="small muted" style="margin-top:4px">Select the radio button next to the correct answer.</div></div>`).join('') || '<p class="small muted">No questions yet.</p>';
      $$('[data-rm-sec]', m.el).forEach(b => b.onclick = () => { syncFromDom(); sections.splice(+b.dataset.rmSec, 1); renderParts(); });
      $$('[data-rm-q]', m.el).forEach(b => b.onclick = () => { syncFromDom(); questions.splice(+b.dataset.rmQ, 1); renderParts(); });
    };
    renderParts();
    $('#t-type').onchange = () => { syncFromDom(); renderParts(); };
    $('#add-sec').onclick = () => { syncFromDom(); sections.push({ heading: '', body: '' }); renderParts(); };
    $('#add-q').onclick = () => { syncFromDom(); questions.push({ q: '', options: ['', '', '', ''], answer: 0 }); renderParts(); };
    if (act) $('#del').onclick = async () => {
      if (!(await confirmDialog(`Delete "${act.title}"? All assignments and progress for it will be removed.`, 'Delete'))) return;
      try { await api(`/api/activities/${act.id}`, { method: 'DELETE' }); toast('Activity deleted'); onSaved(); } catch (ex) { toast(ex.message, true); }
    };
    $('#af', m.el).onsubmit = async (e) => {
      e.preventDefault(); syncFromDom();
      const type = $('#t-type').value;
      // drop empty trailing options so a 2- or 3-option question works
      const qs = questions.map(q => {
        const opts = q.options.map(o => o.trim());
        let last = opts.length; while (last > 0 && !opts[last - 1] && last - 1 !== q.answer) last--;
        return { q: q.q.trim(), options: opts.slice(0, last), answer: q.answer };
      });
      const content = { questions: qs };
      if (type === 'lesson') content.sections = sections.filter(s => s.heading.trim() || s.body.trim());
      if (type === 'simulation') Object.assign(content, { simulation: 'projectile', targetDistance: +$('#t-target').value, tolerance: +$('#t-tol').value, instructions: $('#t-instr').value });
      const body = { title: $('#t-title').value, description: $('#t-desc').value, type, subject: $('#t-subject').value, duration_min: $('#t-dur').value, pass_mark: $('#t-pass').value, content };
      try {
        await api(act ? `/api/activities/${act.id}` : '/api/activities', { method: act ? 'PUT' : 'POST', body });
        m.close(); toast(act ? 'Activity updated' : 'Activity created'); onSaved();
      } catch (ex) { $('#t-err').textContent = ex.message; }
    };
  }

  async function assignForm(act, onSaved) {
    const [learners, cohorts] = await Promise.all([api('/api/learners?status=active'), api('/api/cohorts')]);
    const m = modal(`
      <div class="modal-head"><h2>Assign “${esc(act.title)}”</h2><button class="close-x" data-close aria-label="Close">×</button></div>
      <div class="field"><label for="as-cohort">Assign to a whole cohort</label><select id="as-cohort"><option value="">— None —</option>${cohorts.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Or pick individual learners</label>
        <input id="as-filter" type="search" placeholder="Filter…" style="margin-bottom:6px">
        <div class="checklist">${learners.map(l => `<label data-name="${esc(l.name.toLowerCase())}"><input type="checkbox" value="${l.id}">${esc(l.name)} <span class="small muted">${esc(l.cohort || '')}</span></label>`).join('') || '<p class="muted small">No active learners</p>'}</div></div>
      <div class="field"><label for="as-due">Due date (optional)</label><input id="as-due" type="date"></div>
      <div class="error-text" id="as-err"></div>
      <div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn btn-primary" id="as-go">Assign</button></div>`);
    $('#as-filter').oninput = (e) => $$('.checklist label', m.el).forEach(l => l.style.display = l.dataset.name.includes(e.target.value.toLowerCase()) ? '' : 'none');
    $('#as-go').onclick = async () => {
      const learnerIds = $$('.checklist input:checked', m.el).map(i => +i.value);
      try {
        const r = await api(`/api/activities/${act.id}/assign`, { method: 'POST', body: { learnerIds, cohort: $('#as-cohort').value || undefined, dueDate: $('#as-due').value || undefined } });
        m.close(); toast(`Assigned to ${r.created} learner(s)${r.skipped ? `, ${r.skipped} already had it` : ''}`); onSaved();
      } catch (ex) { $('#as-err').textContent = ex.message; }
    };
  }

  async function adminActivityDetail(id) {
    const main = shell('activities', loading());
    const d = await api(`/api/activities/${id}`);
    const a = d.activity, s = d.summary;
    main.innerHTML = `
      <p><a href="#/admin/activities">← Back to activities</a></p>
      <div class="page-head"><div><div class="row" style="gap:8px">${typeBadge(a.type)}<span class="badge b-neutral">${esc(a.subject)}</span></div>
        <h1 style="margin-top:6px">${esc(a.title)}</h1><p class="muted" style="margin:0">${esc(a.description)}</p></div>
        <div class="row"><button class="btn" id="edit">Edit</button><button class="btn btn-primary" id="assign">Assign</button></div></div>
      <div class="grid grid-4">
        ${statCard('Assigned learners', s.total, `Pass mark ${a.pass_mark}%`, '👥', 'var(--info-50)')}
        ${statCard('Completed', s.completed, `${s.inProgress} in progress · ${s.notStarted} not started`, '✅', 'var(--success-50)')}
        ${statCard('Completion rate', s.completionRate + '%', '', '🎯', 'var(--warning-50)')}
        ${statCard('Average score', s.averageScore != null ? s.averageScore + '%' : '—', '', '⭐', 'var(--primary-50)')}
      </div>
      <div class="card" style="margin-top:16px"><h2>Learner progress</h2>
        <div class="table-wrap"><table><thead><tr><th>Learner</th><th>Status</th><th class="hide-sm">Due</th><th>Best score</th><th class="hide-sm">Attempts</th><th></th></tr></thead><tbody>
        ${d.assignees.map(r => `<tr class="clickable" data-href="#/admin/learners/${r.learner_id}"><td><div class="person"><span class="avatar">${initials(r.name)}</span><div><strong>${esc(r.name)}</strong><div class="small muted">${esc(r.cohort || '')}</div></div></div></td>
          <td>${statusBadge(r)}</td><td class="hide-sm">${fmtDate(r.due_date)}</td><td>${r.best_score != null ? r.best_score + '%' : '—'}</td><td class="hide-sm">${r.attempts}</td>
          <td><div class="actions"><button class="btn btn-sm btn-danger" data-unassign="${r.id}">Remove</button></div></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Not assigned to anyone yet</td></tr>'}
        </tbody></table></div></div>`;
    bindRowLinks(main);
    $('#edit').onclick = () => activityForm(a, () => adminActivityDetail(id));
    $('#assign').onclick = () => assignForm(a, () => adminActivityDetail(id));
    $$('[data-unassign]').forEach(b => b.onclick = async () => {
      if (!(await confirmDialog('Remove this assignment and its progress?', 'Remove'))) return;
      await api(`/api/assignments/${b.dataset.unassign}`, { method: 'DELETE' }); toast('Assignment removed'); adminActivityDetail(id);
    });
  }

  // ================= LEARNER =================
  let learnerTab = 'todo';
  async function learnerDashboard() {
    const main = shell('dashboard', loading());
    const { assignments, summary: s } = await api('/api/me/assignments');
    const first = state.user.name.split(' ')[0];
    const render = () => {
      const list = assignments.filter(a => learnerTab === 'all' ? true : learnerTab === 'done' ? a.status === 'completed' : a.status !== 'completed');
      main.innerHTML = `
        <div class="page-head"><div><h1>Hi ${esc(first)} 👋</h1><p class="muted">Here are your learning activities</p></div></div>
        <div class="grid grid-4">
          ${statCard('Assigned', s.total, '', '🧩', 'var(--info-50)')}
          ${statCard('Completed', s.completed, '', '✅', 'var(--success-50)')}
          ${statCard('In progress', s.inProgress, '', '⏳', 'var(--warning-50)')}
          ${statCard('Overall progress', s.completionRate + '%', s.averageScore != null ? `Avg. score ${s.averageScore}%` : '', '🎯', 'var(--primary-50)')}
        </div>
        <div style="margin-top:22px" class="tabs" role="tablist">
          ${[['todo', 'To do'], ['done', 'Completed'], ['all', 'All']].map(([k, l]) => `<button role="tab" data-tab="${k}" class="${learnerTab === k ? 'active' : ''}" aria-selected="${learnerTab === k}">${l}</button>`).join('')}
        </div>
        <div class="grid grid-3">
          ${list.map(a => `<div class="card activity-card">
            <div class="meta">${typeBadge(a.type)}${statusBadge(a)}<span class="small muted">⏱ ${a.duration_min} min</span></div>
            <h3>${esc(a.title)}</h3><p>${esc(a.description || '')}</p>
            <div class="small muted">${esc(a.subject)} · Due ${fmtDate(a.due_date)}${a.best_score != null ? ` · Best ${a.best_score}%` : ''}</div>
            <a class="btn ${a.status === 'completed' ? '' : 'btn-primary'}" href="#/learn/activity/${a.id}">${a.status === 'completed' ? 'Review / retry' : a.status === 'in_progress' ? 'Continue' : 'Start activity'}</a>
          </div>`).join('') || `<div class="card empty" style="grid-column:1/-1">${learnerTab === 'todo' ? '🎉 Nothing left to do — great work!' : 'No activities here yet.'}</div>`}
        </div>`;
      $$('[data-tab]').forEach(b => b.onclick = () => { learnerTab = b.dataset.tab; render(); });
    };
    render();
  }

  async function learnerPlayer(id) {
    const main = shell('dashboard', loading());
    const a = await api(`/api/me/assignments/${id}`);
    await api(`/api/me/assignments/${id}/start`, { method: 'POST' });
    const c = a.content;
    const questions = c.questions || [];
    main.innerHTML = `
      <div class="player">
        <p><a href="#/learn">← Back to my activities</a></p>
        <div class="row" style="gap:8px">${typeBadge(a.type)}<span class="badge b-neutral">${esc(a.subject)}</span><span class="small muted">⏱ ${a.duration_min} min · Pass mark ${a.pass_mark}%</span></div>
        <h1 style="margin:8px 0 4px">${esc(a.title)}</h1><p class="muted">${esc(a.description)}</p>
        <div id="result"></div>
        ${a.type === 'lesson' ? `<div class="card">${(c.sections || []).map(s => `<div class="lesson-section"><h2>${esc(s.heading)}</h2><p>${esc(s.body)}</p></div>`).join('')}</div>` : ''}
        ${a.type === 'simulation' ? `<div class="card"><h2>Projectile lab</h2><p class="muted">${esc(c.instructions || '')}</p>
          <canvas id="sim" class="sim-canvas" width="800" height="320" aria-label="Projectile simulation"></canvas>
          <div class="form-grid" style="margin-top:14px">
            <div class="field"><label for="ang">Launch angle: <span id="ang-v">45</span>°</label><input id="ang" type="range" min="5" max="85" value="45"></div>
            <div class="field"><label for="spd">Speed: <span id="spd-v">15</span> m/s</label><input id="spd" type="range" min="5" max="40" step="0.5" value="15"></div>
          </div>
          <div class="row"><button class="btn btn-primary" id="launch">🚀 Launch</button><span id="sim-msg" class="muted"></span></div></div>` : ''}
        ${questions.length ? `<div class="card"><h2>${a.type === 'quiz' ? 'Questions' : 'Check your understanding'}</h2>
          ${questions.map((q, i) => `<fieldset class="question" style="margin:0 0 12px"><legend><strong>${i + 1}. ${esc(q.q)}</strong></legend>
            ${q.options.map((o, oi) => `<label class="option" data-q="${i}" data-o="${oi}"><input type="radio" name="q${i}" value="${oi}">${esc(o)}</label>`).join('')}</fieldset>`).join('')}</div>` : ''}
        <div class="row" style="margin-top:16px"><button class="btn btn-success" id="submit">Submit activity</button><span class="small muted" id="sub-msg"></span></div>
      </div>`;

    let lastShot = null;
    if (a.type === 'simulation') lastShot = setupSimulation(c);

    $('#submit').onclick = async () => {
      const answers = questions.map((_, i) => { const el = $(`input[name="q${i}"]:checked`); return el ? Number(el.value) : null; });
      if (answers.some(x => x === null)) { $('#sub-msg').textContent = 'Please answer every question before submitting.'; return; }
      if (a.type === 'simulation' && !lastShot()) { $('#sub-msg').textContent = 'Launch the projectile at least once before submitting.'; return; }
      $('#submit').disabled = true;
      try {
        const r = await api(`/api/me/assignments/${id}/submit`, { method: 'POST', body: { answers, simulation: lastShot ? lastShot() : undefined } });
        r.feedback.forEach((f, i) => $$(`.option[data-q="${i}"]`).forEach(o => {
          o.classList.remove('correct', 'wrong');
          if (+o.dataset.o === f.correctAnswer) o.classList.add('correct');
          else if (+o.dataset.o === answers[i]) o.classList.add('wrong');
        }));
        $('#result').innerHTML = `<div class="result-banner ${r.passed ? 'pass' : 'fail'}">
          <h2>${r.passed ? '🎉 Activity completed!' : 'Not quite there yet'}</h2>
          <p style="margin:4px 0">You scored <strong>${r.score}%</strong> (pass mark ${r.passMark}%).
          ${r.total ? `${r.correct}/${r.total} questions correct.` : ''} ${r.simulation ? (r.simulation.hit ? 'Target hit in the simulation ✔' : `Simulation landed at ${r.simulation.range ?? '—'} m — target missed.`) : ''}</p>
          <div class="row" style="margin-top:8px"><a class="btn" href="#/learn">Back to dashboard</a><button class="btn" id="retry">Try again</button></div></div>`;
        $('#retry').onclick = () => learnerPlayer(id);
        $('#submit').style.display = 'none'; $('#sub-msg').textContent = '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (ex) { toast(ex.message, true); $('#submit').disabled = false; }
    };
  }

  // Projectile simulation drawn on canvas. Returns a getter for the last launch parameters.
  function setupSimulation(c) {
    const cv = $('#sim'), ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, pad = 30, maxX = Math.max(60, c.targetDistance * 1.6);
    const sx = (W - pad * 2) / maxX, ground = H - 30, sy = sx;
    let shot = null, anim;
    const draw = (path = []) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#86efac'; ctx.fillRect(0, ground, W, H - ground);
      ctx.fillStyle = '#475569'; ctx.font = '12px Inter, sans-serif';
      for (let m = 0; m <= maxX; m += 10) { const x = pad + m * sx; ctx.fillRect(x, ground, 1, 6); ctx.fillText(`${m}m`, x - 8, ground + 20); }
      const tx = pad + c.targetDistance * sx;
      ctx.fillStyle = 'rgba(22,163,74,.25)'; ctx.fillRect(tx - c.tolerance * sx, ground - 4, c.tolerance * 2 * sx, 4);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, ground); ctx.lineTo(tx, ground - 40); ctx.stroke();
      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(tx, ground - 40); ctx.lineTo(tx + 20, ground - 33); ctx.lineTo(tx, ground - 26); ctx.fill();
      const ang = +$('#ang').value * Math.PI / 180;
      ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(pad, ground); ctx.lineTo(pad + Math.cos(ang) * 28, ground - Math.sin(ang) * 28); ctx.stroke();
      if (path.length) {
        ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
        path.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, pad + x * sx, ground - y * sy)); ctx.stroke(); ctx.setLineDash([]);
        const [x, y] = path[path.length - 1];
        ctx.fillStyle = '#4f46e5'; ctx.beginPath(); ctx.arc(pad + x * sx, ground - y * sy, 6, 0, Math.PI * 2); ctx.fill();
      }
    };
    const upd = () => { $('#ang-v').textContent = $('#ang').value; $('#spd-v').textContent = $('#spd').value; if (!anim) draw(); };
    $('#ang').oninput = upd; $('#spd').oninput = upd; draw();
    $('#launch').onclick = () => {
      cancelAnimationFrame(anim);
      const angle = +$('#ang').value, speed = +$('#spd').value, g = 9.8, th = angle * Math.PI / 180;
      const vx = speed * Math.cos(th), vy = speed * Math.sin(th), T = 2 * vy / g, range = vx * T;
      const path = []; const start = performance.now(); const dur = Math.min(2500, 600 + T * 400);
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur) * T;
        path.push([vx * t, Math.max(0, vy * t - 0.5 * g * t * t)]);
        draw(path);
        if (t < T) anim = requestAnimationFrame(step);
        else {
          anim = null; shot = { angle, speed };
          const hit = Math.abs(range - c.targetDistance) <= c.tolerance;
          $('#sim-msg').innerHTML = hit ? `<span class="badge b-success">Hit!</span> Landed at ${range.toFixed(1)} m. Now submit the activity.`
            : `Landed at <strong>${range.toFixed(1)} m</strong> — ${range < c.targetDistance ? 'too short' : 'too far'}. Adjust and try again.`;
        }
      };
      anim = requestAnimationFrame(step);
    };
    return () => shot;
  }

  async function learnerProgress() {
    const main = shell('progress', loading());
    const [{ assignments, summary: s }, history] = await Promise.all([api('/api/me/assignments'), api('/api/me/history')]);
    const completed = assignments.filter(a => a.status === 'completed').sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)));
    const bySubject = {};
    assignments.forEach(a => { const k = a.subject || 'General'; bySubject[k] = bySubject[k] || { t: 0, c: 0 }; bySubject[k].t++; if (a.status === 'completed') bySubject[k].c++; });
    main.innerHTML = `
      <div class="page-head"><div><h1>My progress</h1><p class="muted">Your completion history and results</p></div></div>
      <div class="grid grid-2">
        <div class="card"><h2>Overall</h2><div class="row" style="gap:28px;margin-top:10px">
          ${donut([{ value: s.completed, color: '#16a34a' }, { value: s.inProgress, color: '#d97706' }, { value: s.notStarted, color: '#cbd5e1' }])}
          <div class="legend"><span style="font-size:1.6rem;font-weight:700">${s.completionRate}% complete</span>
            <span><i style="background:#16a34a"></i>Completed — <strong>${s.completed}</strong></span>
            <span><i style="background:#d97706"></i>In progress — <strong>${s.inProgress}</strong></span>
            <span><i style="background:#cbd5e1"></i>Not started — <strong>${s.notStarted}</strong></span>
            <span>Average score — <strong>${s.averageScore != null ? s.averageScore + '%' : '—'}</strong></span></div></div></div>
        <div class="card"><h2>By subject</h2>
          ${Object.entries(bySubject).map(([k, v]) => { const pct = Math.round(v.c / v.t * 100); return `<div class="bar-row"><span>${esc(k)}</span>${progress(pct, 'success')}<strong>${pct}%</strong></div>`; }).join('') || '<p class="muted">No activities yet</p>'}</div>
      </div>
      <div class="card" style="margin-top:16px"><h2>Completion history</h2>
        ${completed.length ? `<div class="table-wrap"><table><thead><tr><th>Activity</th><th>Best score</th><th class="hide-sm">Attempts</th><th>Completed</th></tr></thead><tbody>
          ${completed.map(a => `<tr><td><strong>${esc(a.title)}</strong><br>${typeBadge(a.type)}</td><td><span class="badge b-success">${a.best_score}%</span></td><td class="hide-sm">${a.attempts}</td><td>${fmtDate(a.completed_at)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">You have not completed any activities yet.</p>'}</div>
      <div class="card"><h2>All attempts</h2>
        ${history.length ? `<div class="table-wrap"><table><thead><tr><th>Activity</th><th>Score</th><th>Result</th><th>Submitted</th></tr></thead><tbody>
          ${history.map(h => `<tr><td>${esc(h.title)}</td><td>${h.score}%</td><td>${h.passed ? '<span class="badge b-success">Passed</span>' : '<span class="badge b-danger">Not passed</span>'}</td><td>${fmtDate(h.submitted_at)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">No attempts yet — launch an activity from your dashboard.</p>'}</div>`;
  }

  // ---------- router ----------
  async function route() {
    const [rawPath, qs] = location.hash.slice(1).split('?');
    const path = rawPath || '/';
    const query = new URLSearchParams(qs || '');
    $('#modal-root').innerHTML = '';
    if (!state.token) { if (path !== '/login') location.hash = '#/login'; else renderLogin(); return; }
    try {
      if (!state.user) state.user = (await api('/api/auth/me')).user;
      const home = state.user.role === 'admin' ? '#/admin' : '#/learn';
      if (path === '/login' || path === '/') { location.hash = home; return; }
      const isAdmin = state.user.role === 'admin';
      let m;
      if (isAdmin && path === '/admin') return await adminDashboard();
      if (isAdmin && path === '/admin/learners') return await adminLearners();
      if (isAdmin && (m = path.match(/^\/admin\/learners\/(\d+)$/))) return await adminLearnerDetail(m[1]);
      if (isAdmin && path === '/admin/activities') return await adminActivities(query);
      if (isAdmin && (m = path.match(/^\/admin\/activities\/(\d+)$/))) return await adminActivityDetail(m[1]);
      if (!isAdmin && path === '/learn') return await learnerDashboard();
      if (!isAdmin && path === '/learn/progress') return await learnerProgress();
      if (!isAdmin && (m = path.match(/^\/learn\/activity\/(\d+)$/))) return await learnerPlayer(m[1]);
      location.hash = home;
    } catch (ex) {
      toast(ex.message, true);
      const main = $('#main'); if (main) main.innerHTML = `<div class="card empty">${esc(ex.message)}</div>`;
    }
  }
  window.addEventListener('hashchange', route);
  route();
})();
