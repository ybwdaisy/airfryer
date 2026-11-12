import type { Variant, Unit } from '../lib/schema';
import { temperature } from '../lib/format';
const node = document.querySelector('#variant-data');
const select = document.querySelector<HTMLSelectElement>('#variant-select');
if (node && select) {
  const variants = JSON.parse(node.textContent ?? '[]') as Variant[];
  const panels = [...document.querySelectorAll<HTMLElement>('[data-variant-panel]')];
  const apply = (persist = false) => {
    const param = new URL(location.href).searchParams.get('variant');
    const variant = variants.find(v => v.id === (persist ? select.value : param)) ?? variants[0];
    select.value = variant.id;
    panels.forEach(panel => panel.hidden = panel.dataset.variantPanel !== variant.id);
    if (persist) {
      const url = new URL(location.href); url.searchParams.set('variant', variant.id); history.replaceState(null, '', url);
      window.airfryerTrack?.('condition_change', { food_slug: select.dataset.foodSlug!, condition: variant.id });
    }
    const unit = (document.documentElement.dataset.temperatureUnit === 'c' ? 'c' : 'f') as Unit;
    document.querySelectorAll<HTMLElement>('[data-temperature]').forEach(el => el.textContent = temperature(Number(el.dataset.temperature), unit));
  };
  select.addEventListener('change', () => apply(true));
  window.addEventListener('popstate', () => apply());
  apply();
}
