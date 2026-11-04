// Shared nav, panel rendering, and diagram interaction for every page.
// Page order and nav labels live only here.
const PAGES = [
  { id: 'index', href: 'index.html', label: '全景' },
  { id: 'request', href: 'topic.html', label: '一則訊息怎麼走' },
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderNav() {
  const nav = $('#site-nav');
  if (!nav) return;
  const cur = nav.dataset.current;
  nav.innerHTML = '<ul>' + PAGES.map(p =>
    `<li><a href="${p.href}"${p.id === cur ? ' aria-current="page"' : ''}>${esc(p.label)}</a></li>`).join('') + '</ul>';
}

// Panel data: P[key] = {eyebrow, group, status?, title, lede, kv: [{k, v, note?, code?}], details?, src: ["path:line"]}
function loadPanelData() {
  const el = $('#panel-data');
  return el ? JSON.parse(el.textContent) : {};
}

function render(panel, d) {
  if (!d) return;
  const tags = [`<span class="tag ${esc(d.group || 'ours')}">${esc(groupLabel(d.group))}</span>`];
  if (d.status) tags.push(`<span class="tag plan">${esc(d.status)}</span>`);
  const kv = (d.kv || []).map(x =>
    `<div><dt>${esc(x.k)}</dt><dd>${esc(x.v)}${x.note ? `<small>${esc(x.note)}</small>` : ''}</dd></div>`).join('');
  const src = (d.src || []).map(s => `<li><code>${esc(s)}</code></li>`).join('');
  panel.innerHTML =
    `<div class="eyebrow">${esc(d.eyebrow || '')}${tags.join('')}</div>` +
    `<h3>${esc(d.title)}</h3>` +
    `<p class="lede">${esc(d.lede)}</p>` +
    (kv ? `<dl class="kv">${kv}</dl>` : '') +
    (d.details ? `<details><summary>細節</summary><p class="cap">${esc(d.details)}</p></details>` : '') +
    (src ? `<div><p class="note">程式碼位置</p><ul class="src">${src}</ul></div>` : '');
}

function groupLabel(g) {
  return { ours: '自家程式', ai: '模型', ext: '外部服務' }[g] || '自家程式';
}

// Bind one diagram to one panel. Nodes and edges carry data-key; edges also carry data-link="a b".
function bindDiagram(svg, panel, P) {
  const items = $$('[data-key]', svg);
  const fallback = svg.dataset.default;
  let selected = null;

  function light(key) {
    const item = items.find(i => i.dataset.key === key);
    const keep = new Set([key]);
    if (item && item.dataset.link) item.dataset.link.split(' ').forEach(k => keep.add(k));
    items.forEach(i => {
      const links = (i.dataset.link || '').split(' ');
      i.classList.toggle('on', keep.has(i.dataset.key) || links.includes(key));
    });
    svg.classList.add('dim');
  }
  function clear() {
    items.forEach(i => i.classList.remove('on'));
    svg.classList.remove('dim');
  }
  function select(key) {
    selected = key;
    items.forEach(i => i.setAttribute('aria-pressed', String(i.dataset.key === key)));
    light(key);
    render(panel, P[key]);
  }
  function reset() {
    selected = null;
    items.forEach(i => i.setAttribute('aria-pressed', 'false'));
    clear();
    render(panel, P[fallback]);
  }

  items.forEach((i, n) => {
    i.addEventListener('click', () => (selected === i.dataset.key ? reset() : select(i.dataset.key)));
    i.addEventListener('mouseenter', () => light(i.dataset.key));
    i.addEventListener('mouseleave', () => (selected ? light(selected) : clear()));
    i.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i.dataset.key); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = items[(n + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length];
        next.focus();
        select(next.dataset.key);
      } else if (e.key === 'Escape') { reset(); }
    });
  });
  reset();
}

renderNav();
const P = loadPanelData();
$$('svg[data-panel]').forEach(svg => bindDiagram(svg, document.getElementById(svg.dataset.panel), P));
