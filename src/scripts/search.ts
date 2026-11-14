import {readKitchen,presetUnit} from '../lib/kitchen';
import { createFoodSearch } from '../lib/food-search';
import { languageFromPath, resultLabel } from '../lib/locale';
const language = languageFromPath(location.pathname);
type Item = { slug: string; name: string; aliases: string[]; category: string; unit: string; path: string };
const input = document.querySelector<HTMLInputElement>('#search-input');
const form = document.querySelector<HTMLFormElement>('#food-search');
const indexNode = document.querySelector('#food-index');
if (input && form && indexNode) {
  const items = JSON.parse(indexNode.textContent ?? '[]') as Item[];
  const search = createFoodSearch(items);
  const rows = new Map([...document.querySelectorAll<HTMLElement>('[data-food-row]')].map(row => [row.dataset.slug!, row]));
  const list = document.querySelector('.food-rows')!;
  let category = 'all';
  let timer: ReturnType<typeof setTimeout>;
  let analyticsTimer: ReturnType<typeof setTimeout>;
  let lastSearch: string | null = null;
  let composing = false;
  const emitSearch = (trigger: 'input' | 'submit' | 'selection') => {
    const query = input.value.trim();
    if (!query || document.visibilityState !== 'visible') return;
    const signature = JSON.stringify([query.toLocaleLowerCase(),category]);
    if (lastSearch === signature) return;
    const resultCount = update();
    const name=resultCount ? 'food_search' : 'search_no_results';
    const params={results_count:resultCount,category,search_trigger:trigger};
    const sent=trigger==='selection' ? window.airfryerStageSearch?.(name,params) : window.airfryerTrack?.(name,params);
    if(sent) lastSearch=signature;
  };
  const empty = document.querySelector<HTMLElement>('#search-empty')!;
  const count = document.querySelector('#result-count')!;
  const update = (save = true) => {
    const query = input.value.trim();
    const result = query ? search(query) : items;
    const currentUnit=presetUnit(readKitchen());
    const filtered=result.filter(item=>category==='all'||item.category===category);
    const matches=filtered.filter(item=>item.unit===currentUnit);
    const others=query?filtered.filter(item=>item.unit!==currentUnit):[];
    const otherPanel=document.querySelector<HTMLElement>('[data-unavailable-results]');
    const otherList=document.querySelector<HTMLElement>('[data-unavailable-list]');
    if(otherPanel&&otherList){otherPanel.hidden=!others.length;otherList.replaceChildren(...others.map(item=>{const li=document.createElement('li'),a=document.createElement('a');a.href=item.path;a.textContent=item.name;li.append(a);return li;}));}
    rows.forEach(row => row.hidden = true);
    matches.forEach(item => { const row = rows.get(item.slug); if (row) { row.hidden = false; list.append(row); } });
    count.textContent = resultLabel(matches.length, Boolean(query), language);
    empty.hidden = matches.length > 0;
    const title=empty.querySelector('h3'),hint=empty.querySelector('p');
    if(title)title.textContent=language==='zh'?(others.length?'暂缺当前厨房配置的做法':'没有找到匹配食物'):(others.length?'No verified method for your kitchen yet':'No matching food yet');
    if(hint)hint.textContent=language==='zh'?(others.length?'下方有其他匹配食物；补齐当前温标参考后才会提供可操作参数。':'试试食材简称或其他拼写。'):(others.length?'Other matching foods are listed below. Their actionable methods need a verified reference in your temperature scale.':'Try another spelling or a broader ingredient name.');
    const clear = document.querySelector<HTMLButtonElement>('[data-clear-query]'); if(clear) clear.hidden=!query;
    const reset = document.querySelector<HTMLElement>('[data-category-search-hint]'); if(reset) reset.hidden=!(query && category!=='all' && matches.length===0 && result.some(item=>item.unit===currentUnit));
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
  const schedule = () => {
    clearTimeout(timer); clearTimeout(analyticsTimer);
    if(composing) return;
    timer = setTimeout(() => update(),150);
    if (!input.value.trim()) lastSearch = null;
    analyticsTimer = setTimeout(() => emitSearch('input'),800);
  };
  input.addEventListener('input', schedule);
  input.addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer);clearTimeout(analyticsTimer);});
  input.addEventListener('compositionend',()=>{composing=false;schedule();});
  document.addEventListener('airfryer:consent',()=>{clearTimeout(analyticsTimer);lastSearch=null;});
  form.addEventListener('submit', e => {
    e.preventDefault(); clearTimeout(timer); clearTimeout(analyticsTimer);
    if(composing) return;
    update(); emitSearch('submit');
  });
  document.querySelectorAll<HTMLAnchorElement>('[data-category-filter]').forEach(link => link.addEventListener('click', e => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); clearTimeout(timer); clearTimeout(analyticsTimer);
    const previous = category; category = link.dataset.categoryFilter!; const resultCount = update();
    if(previous !== category) window.airfryerTrack?.('category_select', {category, results_count:resultCount});
  }));
  document.querySelector('[data-clear-search]')?.addEventListener('click', () => {clearTimeout(timer);clearTimeout(analyticsTimer);lastSearch=null;input.value='';category='all';update();input.focus();window.airfryerTrack?.('search_clear');});
  document.querySelector('[data-clear-query]')?.addEventListener('click',()=>{clearTimeout(timer);clearTimeout(analyticsTimer);lastSearch=null;input.value='';update();input.focus();window.airfryerTrack?.('search_clear');});
  document.querySelector('[data-reset-category]')?.addEventListener('click',()=>{clearTimeout(timer);clearTimeout(analyticsTimer);category='all';const results_count=update();window.airfryerTrack?.('category_select',{category,results_count});emitSearch('submit');});
  document.querySelectorAll<HTMLButtonElement>('[data-search-example]').forEach(button=>button.addEventListener('click',()=>{clearTimeout(timer);clearTimeout(analyticsTimer);input.value=button.dataset.searchExample!;update();emitSearch('submit');input.focus();}));
  document.querySelectorAll<HTMLAnchorElement>('[data-food-link]').forEach(link => link.addEventListener('click', () => {clearTimeout(analyticsTimer);emitSearch('selection');}));
  document.addEventListener('airfryer:kitchen',()=>{clearTimeout(timer);clearTimeout(analyticsTimer);lastSearch=null;update(false);});
  window.addEventListener('popstate', restore);
  restore();
  form.dataset.searchReady = 'yes';
  document.dispatchEvent(new CustomEvent('airfryer:list'));
}
