/* Panel principal Mi Día. Conserva las vistas y operaciones existentes; solo añade una portada visual. */
(() => {
  const ICONS = {
    logo: '<path d="m4 19 6.7-14a1.4 1.4 0 0 1 2.6 0L20 19"/><path d="m7.3 12.2h9.4M9.3 8h5.4"/>',
    spark: '<path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/>',
    check: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8 12 2.5 2.5L16 9"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z"/><path d="M4 8h15v7H14a2 2 0 1 1 0-4h5"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M8 14h.01M12 14h.01M16 14h.01"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    home: '<path d="m3 11 9-8 9 8v9H3v-9Z"/><path d="M9 20v-6h6v6"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };
  const icon = (name, cls = '') => `<svg class="dash-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  const esc = value => String(value || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const state = () => { try { return JSON.parse(localStorage.getItem('midia_v3')) || {}; } catch { return {}; } };
  const money = number => new Intl.NumberFormat('es-ES', {style:'currency',currency:'EUR'}).format(Number(number || 0));
  const friendlyDate = () => new Date().toLocaleDateString('es-ES', {weekday:'long', day:'numeric', month:'long'});
  let isOpen = true;
  let tasksExpanded = true;

  function getSummary() {
    const s = state();
    const groups = s.taskCats || [];
    const tasks = groups.flatMap(cat => (s.tasks?.[cat.id] || []).map(task => ({...task, category:cat})));
    const pending = tasks.filter(task => !task.done);
    const expenseTotal = (s.expenses || []).reduce((total, expense) => total + Number(expense.amount || 0), 0);
    const reminders = pending.filter(task => task.dueDate || task.dueTime || task.countdown);
    return {s, tasks, pending, expenseTotal, reminders};
  }
  function showNative(tab) {
    isOpen = false;
    document.body.classList.remove('dashboard-home');
    document.querySelector('#miDiaDashboard')?.setAttribute('hidden', '');
    if (typeof window.setTab === 'function') window.setTab(tab);
  }
  function home() {
    isOpen = true;
    document.body.classList.add('dashboard-home');
    document.querySelector('#miDiaDashboard')?.removeAttribute('hidden');
    document.querySelectorAll('.overlay:not([hidden])').forEach(node => node.setAttribute('hidden', ''));
    render();
  }
  function taskRow(task, index) {
    const priority = task.priority ? `<span class="dash-priority ${task.priority === 'alta' || task.priority === 'high' ? 'high' : ''}">${esc(task.priority)}</span>` : '';
    const time = task.dueTime || task.time || ['09:00','11:30','16:00','18:30'][index] || '';
    return `<button class="dash-task-row" data-go="tareas"><span class="dash-radio"></span><span class="dash-task-copy"><strong>${esc(task.text || task.title || 'Tarea sin título')}</strong><small>${esc(task.category?.name || 'Tareas')}</small></span>${priority}<time>${esc(time)}</time>${icon('chevron')}</button>`;
  }
  function render() {
    const root = document.querySelector('#miDiaDashboard');
    if (!root || !isOpen) return;
    const {s, tasks, pending, expenseTotal, reminders} = getSummary();
    const total = tasks.length;
    const openTasks = pending.slice(0, 4);
    const eventCount = (s.events || []).filter(event => !event.done).length;
    const reminderCount = reminders.length;
    root.innerHTML = `
      <header class="dash-header">
        <div class="dash-brand">${icon('logo','dash-logo')}<div><h1>Mi Día</h1><p>${friendlyDate()}</p></div></div>
        <div class="dash-header-actions"><button class="dash-round" data-go="asistente" aria-label="Abrir asistente">${icon('spark')}</button><button class="dash-round" data-go="calendario" aria-label="Abrir calendario">${icon('calendar')}</button></div>
      </header>
      <section class="dash-metrics" aria-label="Resumen de tu día">
        <button class="dash-metric metric-tasks" data-go="tareas">${icon('check')}<strong>${pending.length}<span>/${total || 0}</span></strong><small>Tareas</small></button>
        <button class="dash-metric metric-expenses" data-go="gastos">${icon('wallet')}<strong>${money(expenseTotal)}</strong><small>Gastos</small></button>
        <button class="dash-metric metric-events" data-go="calendario">${icon('calendar')}<strong>${eventCount}</strong><small>Eventos</small></button>
        <button class="dash-metric metric-reminders" data-go="tareas">${icon('bell')}<strong>${reminderCount}</strong><small>Recordatorios</small></button>
      </section>
      <section class="dash-section dash-task-section ${tasksExpanded ? '' : 'collapsed'}">
        <button class="dash-section-head" data-toggle="tasks"><span class="dash-section-icon tasks">${icon('check')}</span><strong>Tareas</strong><span class="dash-count">${pending.length} / ${total || 0}</span><span class="dash-badge">${pending.filter(task => task.priority).length}</span><span class="dash-caret">⌄</span></button>
        <div class="dash-section-body">${openTasks.length ? openTasks.map(taskRow).join('') : '<div class="dash-empty">No tienes tareas pendientes. Disfruta tu día.</div>'}<button class="dash-see-all" data-go="tareas">Ver todas (${total || 0}) ${icon('chevron')}</button></div>
      </section>
      <section class="dash-shortcuts">
        <button class="dash-shortcut expenses" data-go="gastos"><span class="dash-section-icon">${icon('wallet')}</span><strong>Gastos</strong><span>${money(expenseTotal)} · ${(s.expenses || []).length}</span>${icon('chevron')}</button>
        <button class="dash-shortcut events" data-go="calendario"><span class="dash-section-icon">${icon('calendar')}</span><strong>Eventos</strong><span>${eventCount} · Próximos</span>${icon('chevron')}</button>
        <button class="dash-shortcut reminders" data-go="tareas"><span class="dash-section-icon">${icon('bell')}</span><strong>Recordatorios</strong><span>${reminderCount} · Hoy</span>${icon('chevron')}</button>
      </section>
      <nav class="dash-bottom-nav" aria-label="Navegación principal"><button class="active" data-home>${icon('check')}<span>Tareas</span></button><button data-go="gastos">${icon('wallet')}<span>Gastos</span></button><button data-go="calendario">${icon('calendar')}<span>Calendario</span></button></nav>`;
    root.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => {
      const destination = button.dataset.go;
      if (destination === 'asistente') document.querySelector('#aiCmdBtn')?.click(); else showNative(destination);
    }));
    root.querySelector('[data-toggle="tasks"]')?.addEventListener('click', () => { tasksExpanded = !tasksExpanded; root.querySelector('.dash-task-section')?.classList.toggle('collapsed', !tasksExpanded); });
  }
  function installStyle() {
    const style = document.createElement('style');
    style.textContent = `
      :root{--dash-bg:#020914;--dash-panel:#071427;--dash-line:rgba(96,165,250,.24);--dash-text:#edf5ff;--dash-muted:#91a4c7;--dash-blue:#078cff;--dash-cyan:#20e4e8;--dash-pink:#ff345e;--dash-violet:#8350ff;--dash-teal:#0bd7be} body.dashboard-home{background:radial-gradient(120% 45% at 50% -5%,#12366c 0%,var(--dash-bg) 53%);color:var(--dash-text);max-width:480px;padding-bottom:85px}body.dashboard-home .hdr,body.dashboard-home #viewTareas,body.dashboard-home .bottom-nav,body.dashboard-home .voice-fab,body.dashboard-home .voice-cancel-btn,body.dashboard-home .add-bar{display:none!important}#miDiaDashboard{min-height:100vh;padding:22px 16px 95px;background:linear-gradient(180deg,rgba(2,10,24,.72),#020914 38%);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--dash-text)}#miDiaDashboard[hidden]{display:none}.dash-icon{display:block;width:22px;height:22px;flex:none}.dash-header{display:flex;justify-content:space-between;align-items:center;margin:2px 0 18px}.dash-brand{display:flex;align-items:center;gap:9px}.dash-logo{width:34px;height:34px;padding:5px;border-radius:10px;color:#fff;background:linear-gradient(140deg,var(--dash-cyan),var(--dash-blue) 62%,#3c58ff);box-shadow:0 5px 16px #067eff72}.dash-brand h1{margin:0;font-size:28px;line-height:.95;letter-spacing:-1.2px;background:linear-gradient(90deg,#b5f7ff,var(--dash-blue));background-clip:text;-webkit-background-clip:text;color:transparent;font-weight:850}.dash-brand p{margin:5px 0 0;color:var(--dash-muted);font-size:12px;text-transform:capitalize}.dash-header-actions{display:flex;gap:7px}.dash-round{width:38px;height:38px;display:grid;place-items:center;color:#f6fbff;background:#0b172c;border:1px solid var(--dash-line);border-radius:9px;box-shadow:inset 0 1px #ffffff0c}.dash-round:first-child{color:#ffe66d}.dash-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}.dash-metric{min-width:0;min-height:91px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:7px 3px;border-radius:11px;color:#fff;border:1px solid currentColor;background:linear-gradient(145deg,#121b33,#0a1328);box-shadow:inset 0 1px #ffffff16,0 4px 14px #00000045}.dash-metric .dash-icon{width:21px;height:21px;margin-bottom:1px}.dash-metric strong{font-size:19px;line-height:1;font-weight:800;letter-spacing:-.7px;white-space:nowrap}.dash-metric strong span{font-size:11px;font-weight:600;color:#d6defb}.dash-metric small{font-size:10px;color:#c5d0ed}.metric-tasks{color:var(--dash-pink);background:radial-gradient(circle at 80% 10%,#ff4c696b,transparent 43%),linear-gradient(145deg,#4b0d1f,#160c1b)}.metric-expenses{color:#19aaff;background:radial-gradient(circle at 80% 10%,#19aaff57,transparent 45%),linear-gradient(145deg,#072b62,#07162e)}.metric-expenses strong{font-size:13px}.metric-events{color:#a66cff;background:radial-gradient(circle at 80% 10%,#9d58ff59,transparent 45%),linear-gradient(145deg,#26104d,#110d2d)}.metric-reminders{color:var(--dash-teal);background:radial-gradient(circle at 80% 10%,#0bd7be4b,transparent 45%),linear-gradient(145deg,#064038,#081c2a)}.dash-section{border:1px solid #ff4a78a8;border-radius:13px;overflow:hidden;background:linear-gradient(135deg,#210d20dc,#090f22);box-shadow:0 8px 24px #000a}.dash-section-head{width:100%;display:flex;align-items:center;gap:9px;padding:10px 11px;color:#fff;background:linear-gradient(90deg,#4c122b,#1e1029);border:0;border-bottom:1px solid #ff4a7845;text-align:left}.dash-section-icon{display:grid;place-items:center;width:31px;height:31px;border-radius:8px;background:#0b315e;color:#3eb8ff}.dash-section-icon .dash-icon{width:19px;height:19px}.dash-section-icon.tasks{color:#ff637f;background:linear-gradient(145deg,#ff6a7f,#ad173b)}.dash-section-head strong,.dash-shortcut strong{font-size:15px}.dash-count{margin-left:auto;color:#cbd5ee;font-size:13px}.dash-badge{width:21px;height:21px;display:grid;place-items:center;border-radius:50%;background:#fd385f;color:#fff;font-size:12px;font-weight:800}.dash-caret{margin-left:2px;color:#c0c9de;font-size:19px}.dash-section-body{padding:0 12px}.dash-task-row{width:100%;min-height:47px;display:flex;align-items:center;gap:9px;color:#f2f6ff;text-align:left;background:transparent;border:0;border-bottom:1px solid #ffffff16;padding:7px 1px}.dash-radio{width:17px;height:17px;border:2px solid #b85dff;border-radius:50%;flex:none}.dash-task-copy{min-width:0;display:grid;gap:2px;flex:1}.dash-task-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:600}.dash-task-copy small{font-size:10px;color:var(--dash-muted)}.dash-task-row time{width:38px;font-size:11px;color:#b5c5e7}.dash-task-row>.dash-icon,.dash-see-all .dash-icon,.dash-shortcut>.dash-icon{width:16px;height:16px;color:#a8badb}.dash-priority{font-size:9px;color:#ffb0bc;background:#92213c;border-radius:5px;padding:3px 5px}.dash-priority:not(.high){color:#ffe1a4;background:#76501a}.dash-see-all{width:100%;display:flex;align-items:center;justify-content:center;gap:5px;padding:10px 0;color:#b7c7eb;background:transparent;border:0;font-size:12px}.dash-section.collapsed .dash-section-body{display:none}.dash-section.collapsed .dash-caret{transform:rotate(-90deg)}.dash-shortcuts{display:grid;gap:9px;margin-top:11px}.dash-shortcut{display:flex;align-items:center;gap:10px;width:100%;padding:9px 11px;color:#f5f8ff;text-align:left;border-radius:12px;border:1px solid var(--dash-line);background:linear-gradient(105deg,#0c2242,#071425);box-shadow:0 4px 14px #0008}.dash-shortcut strong{min-width:90px}.dash-shortcut>span:not(.dash-section-icon){flex:1;text-align:right;color:#aebedf;font-size:12px}.dash-shortcut.events{border-color:#8f52ef9c;background:linear-gradient(105deg,#211047,#0c1230)}.dash-shortcut.events .dash-section-icon{color:#c69bff;background:#3d1d87}.dash-shortcut.reminders{border-color:#09d5bd90;background:linear-gradient(105deg,#063b3b,#06192b)}.dash-shortcut.reminders .dash-section-icon{color:#62f6e1;background:#08776f}.dash-empty{padding:22px 5px;color:var(--dash-muted);font-size:13px;text-align:center}.dash-bottom-nav{position:fixed;z-index:60;bottom:0;left:50%;width:min(100%,480px);transform:translateX(-50%);display:grid;grid-template-columns:repeat(3,1fr);padding:8px 14px max(10px,env(safe-area-inset-bottom));background:linear-gradient(180deg,#061326f0,#020914);border-top:1px solid #1d5ca28c;box-shadow:0 -6px 20px #0008}.dash-bottom-nav button{display:grid;justify-items:center;gap:3px;color:#95a7c9;background:transparent;border:0;font-size:10px}.dash-bottom-nav .dash-icon{width:22px;height:22px}.dash-bottom-nav button.active{color:#20b5ff}@media(max-width:360px){#miDiaDashboard{padding-inline:10px}.dash-metrics{gap:5px}.dash-metric strong{font-size:17px}.dash-metric small{font-size:9px}.dash-shortcut strong{min-width:68px}}
    `;
    document.head.appendChild(style);
  }
  function bindNativeHome() {
    document.addEventListener('click', event => {
      const nav = event.target.closest('.bottom-nav .nav-btn[data-tab="tareas"]');
      if (nav && !isOpen) { event.preventDefault(); event.stopImmediatePropagation(); home(); }
    }, true);
    const header = document.querySelector('.hdr-actions');
    if (header && !header.querySelector('[data-dashboard-home]')) {
      const button = document.createElement('button');
      button.className = 'hdr-btn'; button.dataset.dashboardHome = 'true'; button.title = 'Inicio'; button.innerHTML = icon('home');
      button.addEventListener('click', home); header.prepend(button);
    }
  }
  document.addEventListener('DOMContentLoaded', () => { installStyle(); const root = document.createElement('main'); root.id = 'miDiaDashboard'; document.body.appendChild(root); bindNativeHome(); home(); });
})();
