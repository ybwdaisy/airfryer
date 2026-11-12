import { temperature } from '../lib/format';
import type { Unit } from '../lib/schema';
import { initAnalytics } from './analytics';

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
  if (!link || link.origin !== location.origin || !link.pathname.startsWith('/') || link.hash || unit !== 'c') return;
  const url = new URL(link.href); url.searchParams.set('unit', unit); link.href = url.href;
});
initAnalytics();
applyUnit(getUnit());
