/* Iconos Mi Día: colección original, dibujada en SVG y sin librerías externas. */
(() => {
  const paths = {
    spark: '<path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z"/><path d="M4 8h15v7H14a2 2 0 1 1 0-4h5"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M8 14h.01M12 14h.01M16 14h.01"/>',
    folder: '<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z"/><path d="M3.5 10h17"/>',
    clipboard: '<rect x="5" y="5" width="14" height="16" rx="3"/><path d="M9 5V4a3 3 0 0 1 6 0v1M9 12h6M9 16h4"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M9 7l1-3h4l1 3M6 7l1 14h10l1-14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'
  };
  const svg = (name, label = '') => `<svg class="mi-icon mi-${name}" viewBox="0 0 24 24" aria-hidden="${label ? 'false' : 'true'}" ${label ? `aria-label="${label}" role="img"` : ''} fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.spark}</svg>`;
  const set = (node, name, label) => { if (node && !node.querySelector(':scope > .mi-icon')) { node.dataset.miIcon = name; node.innerHTML = svg(name, label); } };
  const replace = () => {
    set(document.querySelector('#aiCmdBtn'), 'spark', 'Asistente');
    set(document.querySelector('#summaryBtn'), 'clipboard', 'Resumen');
    set(document.querySelector('#voiceFab'), 'spark', 'Asistente de voz');
    document.querySelectorAll('#addBtn:has(img)').forEach(n => set(n, 'spark', 'Añadir con asistente'));
    document.querySelectorAll('.nav-btn').forEach(b => set(b.querySelector('.nav-ico'), ({tareas:'list',gastos:'wallet',calendario:'calendar'})[b.dataset.tab] || 'list'));
    document.querySelectorAll('.cat-tab .em,.cat-pick-opt .em').forEach(n => set(n, 'folder'));
    document.querySelectorAll('.add-cat-btn .em,.sub-add-btn').forEach(n => set(n, 'plus'));
    document.querySelectorAll('.rec-btn').forEach(n => set(n, 'repeat'));
    document.querySelectorAll('.del-btn,.sub-del,.cal-event-delete').forEach(n => set(n, 'trash'));
    document.querySelectorAll('.cal-arrow').forEach(n => set(n, n.id === 'calPrev' ? 'chevronLeft' : 'chevronRight'));
    document.querySelectorAll('.gasto-total-card > span,.gasto-specific-ico,.gasto-cat-badge').forEach(n => set(n, n.classList.contains('gasto-specific-ico') ? 'calendar' : 'wallet'));
    document.querySelectorAll('.empty .ico,.all-done .big').forEach(n => set(n, 'sun'));
    document.querySelectorAll('.chk.done-chk,.sub-chk.done,.sum-chk').forEach(n => { if (n.textContent.trim() === '✓') set(n, 'check'); });
  };
  const style = document.createElement('style');
  style.textContent = `.mi-icon{width:1.18em;height:1.18em;display:inline-block;vertical-align:middle;pointer-events:none}.hdr-btn .mi-icon{width:18px;height:18px}.nav-btn .nav-ico{display:grid;place-items:center;height:22px}.nav-btn .mi-icon{width:21px;height:21px}.voice-fab .mi-icon{width:25px;height:25px;color:#fff;filter:drop-shadow(0 1px 2px #075a98)}.voice-fab{background:linear-gradient(145deg,#22d3ee,#0a84ff)!important;box-shadow:0 6px 18px rgba(10,132,255,.34)!important}.add-btn .mi-icon,.sub-add-btn .mi-icon{width:19px;height:19px}.rec-btn .mi-icon,.del-btn .mi-icon,.sub-del .mi-icon{width:16px;height:16px}.cal-arrow .mi-icon{width:18px;height:18px}.gasto-total-card>.mi-icon{width:35px;height:35px;color:rgba(255,255,255,.94)}.gasto-specific-ico .mi-icon{width:15px;height:15px}.gasto-cat-badge .mi-icon{width:19px;height:19px}.cat-tab .em,.cat-pick-opt .em{display:grid;place-items:center;height:20px}.cat-tab .mi-icon,.cat-pick-opt .mi-icon{width:18px;height:18px}.empty .mi-icon,.all-done .mi-icon{width:36px;height:36px;color:var(--accent)}.chk .mi-icon,.sub-chk .mi-icon,.sum-chk .mi-icon{width:13px;height:13px}`;
  document.head.appendChild(style);
  document.addEventListener('DOMContentLoaded', () => { replace(); new MutationObserver(replace).observe(document.body, {childList:true, subtree:true}); });
})();
