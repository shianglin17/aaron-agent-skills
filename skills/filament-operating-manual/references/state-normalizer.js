// Sidebar / focus / scroll normalizer — run before EVERY screenshot.
//
// Why every screenshot, not once per page:
//   Filament + Livewire morphdom (triggered by modal open, table action,
//   tab switch) frequently resets Alpine sidebar state. So even if you
//   normalized at page load, a subsequent pre-action can undo it.
//
// Returns:
//   { active: <string|null>, h: <number> }
//   - active = the currently-active nav group's aria-label (or null on
//     pages that aren't inside any group, e.g. Dashboard).
//   - h = document.body.scrollHeight. If h > viewport height and you need
//     the whole top of the page in one shot, raise viewport height before
//     screenshotting; never use fullPage:true (collapses sidebar).
//
// Usage:
//   evaluate_script with this function body, run BEFORE annotations.

(() => {
  let stabilityStyle = document.querySelector('#manual-capture-stability');
  if (!stabilityStyle) {
    stabilityStyle = document.createElement('style');
    stabilityStyle.id = 'manual-capture-stability';
    stabilityStyle.textContent = `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `;
    document.head.append(stabilityStyle);
  }
  const s = window.Alpine?.store?.('sidebar');
  if (s) {
    s.isOpen = true;
    s.isOpenDesktop = true;
    s.scrollTop = 0;
    const activeLabel = document
      .querySelector('.fi-sidebar-group.fi-active .fi-sidebar-group-collapse-btn')
      ?.getAttribute('aria-label');
    const allLabels = [
      ...document.querySelectorAll('.fi-sidebar-group-collapse-btn'),
    ]
      .map((b) => b.getAttribute('aria-label'))
      .filter(Boolean);
    // Declarative — never click-toggle (race condition with Alpine reactivity).
    s.collapsedGroups = activeLabel
      ? allLabels.filter((l) => l !== activeLabel)
      : []; // Dashboard / no active group: show all
  }
  window.scrollTo(0, 0);
  const nav = document.querySelector('.fi-sidebar-nav');
  if (nav) nav.scrollTop = 0;
  // Focus ring would obscure annotation outline. Blur active element.
  if (document.activeElement && document.activeElement.tagName !== 'BODY') {
    document.activeElement.blur();
  }
  return {
    active:
      document
        .querySelector('.fi-sidebar-group.fi-active .fi-sidebar-group-collapse-btn')
        ?.getAttribute('aria-label') || null,
    h: document.body.scrollHeight,
  };
})();
