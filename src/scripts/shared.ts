import { temperature } from '../lib/format';
import { measureText } from '../lib/measure';
import type { Unit } from '../lib/schema';
import { initAnalytics } from './analytics';
import { languageFromPath } from '../lib/locale';
import { defaultUnit, regionHome, switchLanguagePath, type Region } from '../lib/region';

const languageKey = 'airfryer:language:v1';
const regionKey = 'airfryer:region:v1';
const unitKey = 'airfryer:unit';
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* Explicit controls work with storage disabled. */ } };
const lang = languageFromPath(location.pathname);
const sourceRegion = document.documentElement.dataset.region === 'cn' ? 'cn' : 'us';
const storedRegion = read(regionKey);
const region: Region = storedRegion === 'cn' || storedRegion === 'us' ? storedRegion : sourceRegion;

function restoreHome(): boolean {
  if (!['/', '/zh'].includes(location.pathname)) return false;
  const preferredLang = location.pathname === '/' && read(languageKey) === 'zh' ? 'zh' : lang;
  const preferredRegion = storedRegion === 'cn' || storedRegion === 'us' ? storedRegion : (preferredLang === 'zh' ? 'cn' : 'us');
  const target = regionHome(preferredRegion, preferredLang);
  if (target === location.pathname) return false;
  location.replace(target + location.search + location.hash);
  return true;
}

function initShared() {
  const activeRegion: Region = /^\/(?:zh\/)?(?:china|foods|categories|us)(?:\/|$)/.test(location.pathname) || ['/', '/zh'].includes(location.pathname) ? sourceRegion : region;
  document.documentElement.dataset.region = activeRegion;
  const urlUnit = new URL(location.href).searchParams.get('unit');
  const storedUnit = read(unitKey);
  const explicitUnit = () => ['c', 'f'].includes(new URL(location.href).searchParams.get('unit') || '') || ['c', 'f'].includes(read(unitKey) || '');
  const getUnit = (): Unit => {
    const requested = new URL(location.href).searchParams.get('unit');
    const stored = read(unitKey);
    return requested === 'c' || requested === 'f' ? requested : stored === 'c' || stored === 'f' ? stored : defaultUnit(activeRegion);
  };
  let unit: Unit = urlUnit === 'c' || urlUnit === 'f' ? urlUnit : storedUnit === 'c' || storedUnit === 'f' ? storedUnit : defaultUnit(activeRegion);
  document.querySelectorAll<HTMLAnchorElement>('[data-region-home]').forEach(link => { link.href = regionHome(activeRegion, lang); link.addEventListener('click', () => save(regionKey, activeRegion)); });
  document.querySelectorAll<HTMLAnchorElement>('[data-region-select]').forEach(link => {
    const chosen = link.dataset.regionSelect as Region;
    if (chosen === activeRegion) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    link.addEventListener('click', () => {
      save(regionKey, chosen);
      const next = new URL(regionHome(chosen, lang), location.origin);
      if (explicitUnit()) next.searchParams.set('unit', unit);
      const current = new URL(location.href);
      for (const key of ['q', 'category']) if (current.searchParams.has(key)) next.searchParams.set(key, current.searchParams.get(key)!);
      link.href = next.href;
      window.airfryerTrack?.('region_change', { region: chosen });
    });
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-language-switch]').forEach(link => {
    const choose = () => {
      const target = link.dataset.languageSwitch === 'zh' ? 'zh' : 'en';
      save(languageKey, target); save(regionKey, activeRegion);
      const next = new URL(location.href);
      next.pathname = switchLanguagePath(link.dataset.languagePath ?? next.pathname, activeRegion, target);
      if (explicitUnit()) next.searchParams.set('unit', unit);
      link.href = next.href;
      window.airfryerTrack?.('language_change', { language: target });
    };
    link.addEventListener('pointerdown', choose); link.addEventListener('click', choose);
  });
  document.querySelectorAll<HTMLElement>('.js-only').forEach(el => el.hidden = false);
  function applyUnit(next: Unit, persist = false) {
    unit = next;
    document.documentElement.dataset.temperatureUnit = unit;
    document.querySelectorAll<HTMLElement>('[data-temperature]').forEach(el => {
      const c = el.dataset.temperatureC === undefined ? undefined : Number(el.dataset.temperatureC);
      el.textContent = temperature(Number(el.dataset.temperature), unit, c);
    });
    document.querySelectorAll<HTMLElement>('[data-measure]').forEach(el => el.textContent = measureText(el.dataset.measure!, unit, lang));
    document.querySelectorAll<HTMLElement>('[data-unit-caption]').forEach(el => el.hidden = el.dataset.unitCaption !== unit);
    document.querySelectorAll<HTMLElement>('[data-native-unit]').forEach(el => el.hidden = el.dataset.nativeUnit === unit);
    document.querySelectorAll<HTMLElement>('[data-native-label]').forEach(el => el.hidden = el.dataset.nativeLabel !== unit);
    document.querySelectorAll<HTMLElement>('[data-converted-label]').forEach(el => el.hidden = el.dataset.convertedLabel === unit);
    document.querySelectorAll<HTMLButtonElement>('button[data-unit]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.unit === unit)));
    if (persist) {
      save(unitKey, unit);
      const url = new URL(location.href); url.searchParams.set('unit', unit); history.replaceState(null, '', url);
      window.airfryerTrack?.('unit_change', { unit });
    }
    document.dispatchEvent(new CustomEvent('airfryer:unit', { detail: { unit } }));
  }
  document.querySelectorAll<HTMLButtonElement>('button[data-unit]').forEach(el => el.addEventListener('click', () => applyUnit(el.dataset.unit as Unit, true)));
  document.querySelectorAll<HTMLButtonElement>('[data-show-native-unit]').forEach(el => el.addEventListener('click', () => applyUnit(el.dataset.showNativeUnit as Unit, true)));
  window.addEventListener('popstate', () => applyUnit(getUnit()));
  document.addEventListener('click', e => {
    if (!(e.target instanceof Element)) return;
    const link = e.target.closest<HTMLAnchorElement>('a[href]');
    if (!link || link.dataset.languageSwitch || link.dataset.regionSelect || link.origin !== location.origin || link.hash || !explicitUnit()) return;
    const next = new URL(link.href); next.searchParams.set('unit', unit); link.href = next.href;
  });
  applyUnit(unit); initAnalytics();
}
if (!restoreHome()) initShared();
