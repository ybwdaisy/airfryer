import {readFavorites} from '../lib/favorites';
import {readKitchen,presetUnit} from '../lib/kitchen';
import { createRecipeSearch,type RecipeSearchFood } from '../lib/recipe-search';
import { languageFromPath, resultLabel } from '../lib/locale';
const language = languageFromPath(location.pathname);
type Item = RecipeSearchFood & {unit:string;path:string;label:string;preparation?:string;minutesMax:number;needsHob:boolean};
const input = document.querySelector<HTMLInputElement>('#search-input');
const form = document.querySelector<HTMLFormElement>('#food-search');
const indexNode = document.querySelector('#food-index');
if (input && form && indexNode) {
  const items = JSON.parse(indexNode.textContent ?? '[]') as Item[];
  const search = createRecipeSearch(items);
  const rows = new Map([...document.querySelectorAll<HTMLElement>('[data-food-row]')].map(row => [row.dataset.slug!, row]));
  const list = document.querySelector('.food-rows')!;
  let category = 'all';
  let filter = 'all';
  let timer: ReturnType<typeof setTimeout>;
  let analyticsTimer: ReturnType<typeof setTimeout>;
  let lastSearch: string | null = null;
  let composing = false;
  const emitSearch = (trigger: 'input' | 'submit' | 'selection') => {
    const query = input.value.trim();
    if (!query || document.visibilityState !== 'visible') return;
    const signature = JSON.stringify([query.toLocaleLowerCase(),category,filter]);
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
    const result = search(query);
    const currentUnit=presetUnit(readKitchen());
    const saved=new Set(readFavorites());
    const accepts=(item:Item)=>(filter==='all'||filter==='saved'&&saved.has(item.slug)||filter==='quick'&&item.minutesMax<=15&&!item.needsHob||filter==='no-hob'&&!item.needsHob);
    const filtered=result.matches.filter(item=>(category==='all'||item.category===category)&&accepts(item));
    const matches=filtered.filter(item=>item.unit===currentUnit);
    const others=(query||filter==='saved')?filtered.filter(item=>item.unit!==currentUnit):[];
    const alternatives=result.alternatives.filter(item=>item.unit===currentUnit&&(category==='all'||item.category===category)&&accepts(item));
    const alternativeList=empty.querySelector<HTMLElement>('[data-state-alternatives]');
    if(alternativeList){
      alternativeList.hidden=matches.length>0||!alternatives.length;
      alternativeList.replaceChildren(...alternatives.map(item=>{
        const li=document.createElement('li'),a=document.createElement('a'),detail=document.createElement('small');
        li.dataset.category=item.category;a.href=item.path;a.dataset.foodLink=item.slug;
        a.dataset.entryPoint='search';a.textContent=item.name;
        detail.textContent=[item.label,item.preparation].filter(Boolean).join(' / ');
        a.append(document.createTextNode(' '),detail);li.append(a);return li;
      }));
    }
    const otherPanel=document.querySelector<HTMLElement>('[data-unavailable-results]');
    const otherList=document.querySelector<HTMLElement>('[data-unavailable-list]');
    const otherTitle=otherPanel?.querySelector('h3');if(otherTitle)otherTitle.textContent=filter==='saved'?(language==='zh'?'其他温标的收藏':'Saved in another temperature scale'):(language==='zh'?'其他匹配的食物':'More matching foods');
    if(otherPanel&&otherList){otherPanel.hidden=!others.length;otherList.replaceChildren(...others.map(item=>{const li=document.createElement('li'),a=document.createElement('a');a.href=item.path;a.textContent=item.name;li.append(a);return li;}));}
    rows.forEach(row => row.hidden = true);
    matches.forEach(item => { const row = rows.get(item.slug); if (row) { row.hidden = false; list.append(row); } });
    count.textContent = resultLabel(matches.length, Boolean(query), language);
    empty.hidden = matches.length > 0;
    const title=empty.querySelector('h3'),hint=empty.querySelector('p');
    if(title)title.textContent=result.conflict?(language==='zh'?'请选择一种起始状态':'Choose one starting condition'):alternatives.length?(language==='zh'?'当前没有这种起始状态的做法':'No method for that starting condition'):language==='zh'?(others.length?'暂缺当前厨房配置的做法':'没有找到匹配食物'):(others.length?'No verified method for your kitchen yet':'No matching food yet');
    if(hint)hint.textContent=result.conflict?(language==='zh'?'例如“冷冻鸡翅”或“解冻鸡翅”。':'Try frozen wings or thawed wings.'):alternatives.length?(language==='zh'?'以下做法使用其他起始状态，请先按标注完成准备。':'These methods use another starting condition. Follow the preparation shown.'):language==='zh'?(others.length?'下方有其他匹配食物；补齐当前温标参考后才会提供可操作参数。':'试试食材简称或其他拼写。'):(others.length?'Other matching foods are listed below. Their actionable methods need a verified reference in your temperature scale.':'Try another spelling or a broader ingredient name.');
    if(filter==='saved'&&!query&&!matches.length&&!others.length){if(title)title.textContent=language==='zh'?'还没有收藏的菜谱':'No saved recipes yet';if(hint)hint.textContent=language==='zh'?'点菜谱右上角的书签收藏。只保存在当前浏览器。':'Use the bookmark beside a recipe to save it in this browser.';}
    document.querySelectorAll<HTMLElement>('[data-library-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.libraryFilter===filter)));
    const clear = document.querySelector<HTMLButtonElement>('[data-clear-query]'); if(clear) clear.hidden=!query;
    const reset = document.querySelector<HTMLElement>('[data-category-search-hint]'); if(reset) reset.hidden=!(query && category!=='all' && matches.length===0 && [...result.matches,...result.alternatives].some(item=>item.unit===currentUnit));
    const head = document.querySelector<HTMLElement>('.list-head'); if (head) head.hidden = matches.length === 0;
    document.querySelectorAll<HTMLAnchorElement>('[data-category-filter]').forEach(link => {
      if (link.dataset.categoryFilter === category) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    if (save) {
      const url = new URL(location.href);
      query ? url.searchParams.set('q', query) : url.searchParams.delete('q');
      category === 'all' ? url.searchParams.delete('category') : url.searchParams.set('category', category);
      filter==='all'?url.searchParams.delete('filter'):url.searchParams.set('filter',filter);
      history.replaceState(null, '', url);
    }
    return matches.length;
  };
  const restore = () => {
    const params = new URL(location.href).searchParams;
    input.value = (params.get('q') ?? '').slice(0, 120);
    const requested = params.get('category');
    category = items.some(i => i.category === requested) ? requested! : 'all';
    filter=['quick','saved','no-hob'].includes(params.get('filter')||'')?params.get('filter')!:'all';
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
  document.querySelector('[data-clear-search]')?.addEventListener('click', () => {clearTimeout(timer);clearTimeout(analyticsTimer);lastSearch=null;input.value='';category='all';filter='all';update();input.focus();window.airfryerTrack?.('search_clear');});
  document.querySelector('[data-clear-query]')?.addEventListener('click',()=>{clearTimeout(timer);clearTimeout(analyticsTimer);lastSearch=null;input.value='';update();input.focus();window.airfryerTrack?.('search_clear');});
  document.querySelector('[data-reset-category]')?.addEventListener('click',()=>{clearTimeout(timer);clearTimeout(analyticsTimer);category='all';const results_count=update();window.airfryerTrack?.('category_select',{category,results_count});emitSearch('submit');});
  document.querySelectorAll<HTMLButtonElement>('[data-search-example]').forEach(button=>button.addEventListener('click',()=>{clearTimeout(timer);clearTimeout(analyticsTimer);input.value=button.dataset.searchExample!;update();emitSearch('submit');input.focus();}));
  document.querySelector('.search-workspace')?.addEventListener('click',event=>{
    if(event.target instanceof Element && event.target.closest('[data-food-link]')){clearTimeout(analyticsTimer);emitSearch('selection');}
  });
  document.addEventListener('airfryer:kitchen',()=>{clearTimeout(timer);clearTimeout(analyticsTimer);lastSearch=null;update(false);});
  document.querySelectorAll<HTMLButtonElement>('[data-library-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.libraryFilter!;lastSearch=null;update();window.airfryerTrack?.('recipe_filter',{filter});}));
  document.addEventListener('airfryer:favorites',()=>update(false));
  window.addEventListener('popstate', restore);
  restore();
  form.dataset.searchReady = 'yes';
  document.dispatchEvent(new CustomEvent('airfryer:list'));
}
