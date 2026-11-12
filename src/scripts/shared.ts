import { temperature } from '../lib/format';
import type { Unit } from '../lib/schema';
import { initAnalytics } from './analytics';

import { localizedPath } from '../lib/locale';

const languageKey = 'airfryer:language:v1';
function restoreLanguage(): boolean {
  try {
    if (location.pathname === '/' && localStorage.getItem(languageKey) === 'zh') {
      location.replace('/zh' + location.search + location.hash);
      return true;
    }
  } catch { /* Explicit language links work without browser storage. */ }
  return false;
}
function initShared() {
  document.querySelectorAll<HTMLAnchorElement>('[data-language-switch]').forEach(link => {
    const choose = () => {
      const language = link.dataset.languageSwitch === 'zh' ? 'zh' : 'en';
      try { localStorage.setItem(languageKey, language); } catch { /* Navigation still chooses the language. */ }
      const url = new URL(location.href);
      url.pathname = localizedPath(link.dataset.languagePath ?? url.pathname, language);
      link.href = url.href;
    };
    link.addEventListener('pointerdown', choose);
    link.addEventListener('click', choose);
  });
  document.querySelectorAll<HTMLElement>('.js-only').forEach(el => el.hidden = false);
  let unit: Unit = 'f';
  const getUnit = (): Unit => {
    const param = new URL(location.href).searchParams.get('unit');
    if (param === 'f' || param === 'c') return param;
    try { return localStorage.getItem('airfryer:unit') === 'c' ? 'c' : 'f'; } catch { return 'f'; }
  };
  function applyUnit(next: Unit, persist = false) {
    unit = next;
    document.documentElement.dataset.temperatureUnit = unit;
    document.querySelectorAll<HTMLElement>('[data-temperature]').forEach(el => el.textContent = temperature(Number(el.dataset.temperature), unit));
    document.querySelectorAll<HTMLButtonElement>('button[data-unit]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.unit === unit)));
    if (persist) {
      try { localStorage.setItem('airfryer:unit', unit); } catch { /* Unit switch still works without persistence. */ }
      const url = new URL(location.href); url.searchParams.set('unit', unit); history.replaceState(null, '', url);
      window.airfryerTrack?.('unit_change', { unit });
    }
    document.dispatchEvent(new CustomEvent('airfryer:unit', { detail: { unit } }));
  }
  document.querySelectorAll<HTMLButtonElement>('button[data-unit]').forEach(el => el.addEventListener('click', () => applyUnit(el.dataset.unit as Unit, true)));
  window.addEventListener('popstate', () => applyUnit(getUnit()));
  document.addEventListener('click', e => {
    if (!(e.target instanceof Element)) return;
    const link = e.target.closest<HTMLAnchorElement>('a[href]');
    if (link?.dataset.languageSwitch) return;
    if (!link || link.origin !== location.origin || !link.pathname.startsWith('/') || link.hash || unit !== 'c') return;
    const url = new URL(link.href); url.searchParams.set('unit', unit); link.href = url.href;
  });
  initAnalytics();
  applyUnit(getUnit());

}
if (!restoreLanguage()) initShared();
