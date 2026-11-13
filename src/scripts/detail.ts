import type { Variant } from '../lib/schema';
const node = document.querySelector('#variant-data');
const select = document.querySelector<HTMLSelectElement>('#variant-select');
if (node && select) {
  const variants = JSON.parse(node.textContent ?? '[]') as Variant[];
  const panels = [...document.querySelectorAll<HTMLElement>('[data-variant-panel]')];
  const apply = (persist = false) => {
    const param = new URL(location.href).searchParams.get('variant');
    const variant = variants.find(v => v.id === (persist ? select.value : param)) ?? variants[0];
    select.value = variant.id;
    (node as HTMLElement).dataset.variantReady = 'yes';
    panels.forEach(panel => panel.hidden = panel.dataset.variantPanel !== variant.id);
    // Historical links use #sources for the formerly first condition. Keep that
    // anchor attached to the selected recipe even when a new option is added.
    const sourceAlias = document.getElementById('sources');
    const selectedSources = panels.find(panel => panel.dataset.variantPanel === variant.id)?.querySelector('[data-source-panel]');
    if (sourceAlias && selectedSources) {
      selectedSources.prepend(sourceAlias);
      if (location.hash === '#sources') requestAnimationFrame(() => sourceAlias.scrollIntoView());
    }
    if (persist) {
      const url = new URL(location.href); url.searchParams.set('variant', variant.id); history.replaceState(null, '', url);
      window.airfryerTrack?.('condition_change', { food_slug: select.dataset.foodSlug!, condition: variant.id });
    }
    document.dispatchEvent(new CustomEvent('airfryer:condition'));
  };
  select.addEventListener('change', () => apply(true));
  window.addEventListener('popstate', () => apply());
  apply();
}
