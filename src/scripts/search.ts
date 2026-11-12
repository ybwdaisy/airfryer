import Fuse from 'fuse.js';
type Item = { slug: string; name: string; aliases: string[]; category: string };
const input = document.querySelector<HTMLInputElement>('#search-input');
const form = document.querySelector<HTMLFormElement>('#food-search');
const indexNode = document.querySelector('#food-index');
if (input && form && indexNode) {
  const items = JSON.parse(indexNode.textContent ?? '[]') as Item[];
  const fuse = new Fuse(items, { keys: [{ name: 'name', weight: 0.65 }, { name: 'aliases', weight: 0.35 }], threshold: 0.32, ignoreLocation: true, minMatchCharLength: 2 });
  const rows = new Map([...document.querySelectorAll<HTMLElement>('[data-food-row]')].map(row => [row.dataset.slug!, row]));
  const list = document.querySelector('.food-rows')!;
  let category = 'all';
  let timer: ReturnType<typeof setTimeout>;
  const empty = document.querySelector<HTMLElement>('#search-empty')!;
  const count = document.querySelector('#result-count')!;
  const update = (save = true) => {
    const query = input.value.trim();
    const result = query ? fuse.search(query).map(r => r.item) : items;
    const matches = result.filter(item => category === 'all' || item.category === category);
    rows.forEach(row => row.hidden = true);
    matches.forEach(item => { const row = rows.get(item.slug); if (row) { row.hidden = false; list.append(row); } });
    count.textContent = `${matches.length} ${matches.length === 1 ? 'food' : 'foods'}${query ? ' found' : ''}`;
    empty.hidden = matches.length > 0;
    const head = document.querySelector<HTMLElement>('.list-head'); if (head) head.hidden = matches.length === 0;
    document.querySelectorAll<HTMLAnchorElement>('[data-category-filter]').forEach(link => {
      if (link.dataset.categoryFilter === category) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    if (save) {
      const url = new URL(location.href);
      query ? url.searchParams.set('q', query) : url.searchParams.delete('q');
      category === 'all' ? url.searchParams.delete('category') : url.searchParams.set('category', category);
      history.replaceState(null, '', url);
    }
    return matches.length;
  };
  const restore = () => {
    const params = new URL(location.href).searchParams;
    input.value = (params.get('q') ?? '').slice(0, 120);
    const requested = params.get('category');
    category = items.some(i => i.category === requested) ? requested! : 'all';
    update(false);
  };
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => update(), 150); });
  form.addEventListener('submit', e => {
    e.preventDefault(); clearTimeout(timer);
    const resultCount = update();
    window.airfryerTrack?.(resultCount ? 'food_search' : 'search_no_results', { results_count: resultCount, category });
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-category-filter]').forEach(link => link.addEventListener('click', e => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); category = link.dataset.categoryFilter!; update();
    window.airfryerTrack?.('category_select', { category });
  }));
  document.querySelector('[data-clear-search]')?.addEventListener('click', () => { input.value = ''; category = 'all'; update(); input.focus(); });
  document.querySelectorAll<HTMLAnchorElement>('[data-food-link]').forEach(link => link.addEventListener('click', () => window.airfryerTrack?.('food_select', { food_slug: link.dataset.foodLink! })));
  window.addEventListener('popstate', restore);
  restore();
}
