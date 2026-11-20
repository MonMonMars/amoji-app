/**
 * GitHub Pages hash → tab routing for docs/owner-resources.html.
 * Keep in sync with owner-picker-html.test.ts and verify-pages-live.mjs.
 */

export const OWNER_PICKER_TAB_IDS = [
  "music",
  "stories",
  "demo",
  "news",
  "voice",
  "poke",
  "idle",
];

export const OWNER_PICKER_HASH_TAB_ALIASES = {
  performance: "music",
  mixkit: "music",
  mv: "music",
  sing: "music",
  dance: "demo",
  vfx: "poke",
  sfx: "poke",
  cma: "poke",
  tts: "voice",
  clips: "voice",
  audition: "voice",
  vrma: "idle",
  rail: "idle",
  rails: "idle",
};

export const OWNER_PICKER_NAV_INLINE_JS = `
    const HASH_TAB_ALIASES = ${JSON.stringify(OWNER_PICKER_HASH_TAB_ALIASES)};
    function panelForHash(fragment) {
      const key = String(fragment || '').toLowerCase();
      if (!key) return { tab: 'music', anchor: 'music' };
      if (TAB_IDS.includes(key)) return { tab: key, anchor: key };
      if (HASH_TAB_ALIASES[key]) return { tab: HASH_TAB_ALIASES[key], anchor: key };
      const byId = document.getElementById(key);
      if (byId) {
        const panel = byId.closest('.tab-panel');
        const tab = panel?.dataset?.section;
        if (tab && TAB_IDS.includes(tab)) return { tab, anchor: key };
      }
      const row = document.querySelector('tr[data-id="' + CSS.escape(key) + '"]');
      if (row) {
        const panel = row.closest('.tab-panel');
        const tab = panel?.dataset?.section;
        if (tab && TAB_IDS.includes(tab)) return { tab, anchor: key, scrollEl: row };
      }
      return { tab: 'music', anchor: 'music' };
    }
    function revealTab(tabId) {
      if (!TAB_IDS.includes(tabId)) tabId = 'music';
      for (const t of TAB_IDS) {
        const panel = document.getElementById('panel-' + t);
        const btn = document.querySelector('[data-tab="' + t + '"]');
        if (panel) panel.hidden = t !== tabId;
        if (btn) btn.setAttribute('aria-selected', t === tabId ? 'true' : 'false');
      }
      return tabId;
    }
    function scrollOwnerAnchor(route) {
      const el = route.scrollEl
        || (route.anchor ? document.getElementById(route.anchor) : null)
        || (route.anchor ? document.querySelector('tr[data-id="' + CSS.escape(route.anchor) + '"]') : null)
        || document.getElementById(route.tab);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    function navigateOwnerRoute(route, opts) {
      opts = opts || {};
      const tab = revealTab(route.tab);
      if (!opts.silentHash && route.anchor) {
        const next = '#' + route.anchor;
        if (location.hash !== next) history.replaceState(null, '', next);
      }
      requestAnimationFrame(() => scrollOwnerAnchor(route));
      return tab;
    }
    function applyHashRoute() {
      const fragment = (location.hash || '#music').slice(1);
      navigateOwnerRoute(panelForHash(fragment), { silentHash: true });
    }`;