// Filament admin annotator (SVG overlay) — auto label placement.
//
// Why SVG overlay (not CSS outline):
//   Filament `.fi-section` and form wrappers use rounded backgrounds, nested
//   overflow:hidden, and z-index stacking that hide or clip outlines even
//   with `!important`. A fixed-position SVG layer drawn over the viewport
//   is reliable.
//
// A label is placed only where it fits. `fitsViewport()` rejects a candidate
// position when ANY of these is true, and __ann then tries the next side
// (preferred → opposite → top → bottom):
//   1. it would cross the viewport edge (with VIEWPORT_MARGIN of slack),
//   2. it would sit on top of the fixed left sidebar (x < sidebarRight),
//   3. it would overlap a label already placed in this overlay (see `placed`).
// Rule 3 is why multiple annotations on one screenshot no longer collide:
// each successful placement is remembered and avoided by the next call.
//
// Font sizing: the label is drawn at the capture resolution (~1920px wide) but
// the screenshot is later embedded in the doc at IMAGE_WIDTH_PT (default 460pt
// ≈ 613px), so on-page font ≈ FONT × (IMAGE_WIDTH_PT×96/72 / capture_width_px).
// Keep that product ≳ 8pt or the red text is unreadable without zooming.
// At FONT=32, 460pt, 1920px capture → ≈ 10pt. Don't drop FONT below ~28.
//
// API:
//   window.__ann(target, label, side='left')
//     target: CSS selector OR element
//     label:  string
//     side:   preferred side; 'left' (default) or 'right'
//   Returns: { ok, sideUsed, reason }   // reason set only when ok===false
//
//   window.__annClear()  — clear all marks AND reset the placed-label memory

(() => {
  const old = document.getElementById('__ann_overlay');
  if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = '__ann_overlay';
  Object.assign(wrap.style, {
    position: 'fixed', top: '0', left: '0',
    width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '99999',
  });
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.id = '__ann_svg';
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  wrap.appendChild(svg);
  document.body.appendChild(wrap);

  const COLOR = '#ef4444';
  const STROKE = 5;
  const FONT = 32;
  const PAD = 12;
  const GAP = 18; // distance between box edge and label
  const VIEWPORT_MARGIN = 20; // safety margin inside viewport edge — earlier 4-side fallback

  // Avoid sidebar overlap. Filament's left sidebar is fixed; labels placed at
  // x=0 will sit on top of it. Treat sidebar's right edge as the left wall.
  const sidebarRight = (() => {
    const sb = document.querySelector('.fi-sidebar') || document.querySelector('aside');
    return sb ? sb.getBoundingClientRect().right : 0;
  })();

  // Track every label rect placed in this overlay, so subsequent __ann() calls
  // can pick a side that doesn't collide. Reset on __annClear().
  const placed = [];

  function drawBox(svgEl, r) {
    const box = document.createElementNS(NS, 'rect');
    box.setAttribute('x', r.left - STROKE);
    box.setAttribute('y', r.top - STROKE);
    box.setAttribute('width', r.width + STROKE * 2);
    box.setAttribute('height', r.height + STROKE * 2);
    box.setAttribute('fill', 'none');
    box.setAttribute('stroke', COLOR);
    box.setAttribute('stroke-width', String(STROKE));
    box.setAttribute('rx', '4');
    svgEl.appendChild(box);
  }

  function makeLabel(svgEl, x, y, anchor, label) {
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('fill', '#fff');
    text.setAttribute('font-size', String(FONT));
    text.setAttribute('font-weight', '600');
    text.setAttribute('font-family', 'sans-serif');
    text.setAttribute('text-anchor', anchor);
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = label;
    svgEl.appendChild(text);
    const tb = text.getBBox();
    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('x', tb.x - PAD);
    bg.setAttribute('y', tb.y - 4);
    bg.setAttribute('width', tb.width + PAD * 2);
    bg.setAttribute('height', tb.height + 8);
    bg.setAttribute('fill', COLOR);
    bg.setAttribute('rx', '4');
    svgEl.insertBefore(bg, text);
    return { text, bg, tb };
  }

  function fitsViewport(tb) {
    const m = VIEWPORT_MARGIN;
    if (tb.x - PAD - m < sidebarRight) return false;
    if (tb.x + tb.width + PAD + m > window.innerWidth) return false;
    if (tb.y - 4 - m < 0) return false;
    if (tb.y + tb.height + 8 + m > window.innerHeight) return false;
    // Reject if this label rect overlaps any previously placed label.
    for (const p of placed) {
      const ax1 = tb.x - PAD, ax2 = tb.x + tb.width + PAD, ay1 = tb.y - 4, ay2 = tb.y + tb.height + 8;
      const bx1 = p.x - PAD, bx2 = p.x + p.width + PAD, by1 = p.y - 4, by2 = p.y + p.height + 8;
      if (!(ax2 < bx1 || ax1 > bx2 || ay2 < by1 || ay1 > by2)) return false;
    }
    return true;
  }

  window.__ann = (sel, label, side = 'left') => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return { ok: false, reason: 'target not found' };
    const r = el.getBoundingClientRect();
    const svgEl = document.getElementById('__ann_svg');

    drawBox(svgEl, r);

    // Try preferred side, then opposite, then top-center
    const candidates = side === 'left'
      ? [
          { x: r.left - GAP, y: r.top + r.height / 2, anchor: 'end', name: 'left' },
          { x: r.right + GAP, y: r.top + r.height / 2, anchor: 'start', name: 'right' },
        ]
      : [
          { x: r.right + GAP, y: r.top + r.height / 2, anchor: 'start', name: 'right' },
          { x: r.left - GAP, y: r.top + r.height / 2, anchor: 'end', name: 'left' },
        ];
    // top-center fallback
    candidates.push({
      x: r.left + r.width / 2,
      y: r.top - GAP - FONT / 2,
      anchor: 'middle',
      name: 'top',
    });
    // bottom-center fallback
    candidates.push({
      x: r.left + r.width / 2,
      y: r.bottom + GAP + FONT / 2,
      anchor: 'middle',
      name: 'bottom',
    });

    for (const c of candidates) {
      const { text, bg, tb } = makeLabel(svgEl, c.x, c.y, c.anchor, label);
      if (fitsViewport(tb)) {
        placed.push(tb);
        return { ok: true, sideUsed: c.name };
      }
      // overflow or overlaps another label → remove and try next
      bg.remove();
      text.remove();
    }
    // Nothing fits — last attempt: render at first candidate anyway and report overflow.
    const last = candidates[0];
    makeLabel(svgEl, last.x, last.y, last.anchor, label);
    return { ok: false, sideUsed: last.name, reason: 'label overflows viewport on all sides' };
  };

  window.__annClear = () => {
    const svgEl = document.getElementById('__ann_svg');
    if (svgEl) while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    placed.length = 0;
  };

  return 'installed';
})();
