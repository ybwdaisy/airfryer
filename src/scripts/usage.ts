import {trackNavigation} from './track-navigation';
import type { AnalyticsParams } from '../lib/analytics-contract';
import type { Variant } from '../lib/schema';

type Track = (name: string, params?: AnalyticsParams) => boolean;
export const engagedReadMilliseconds = 10_000;

/** Observed reading, never a claim that someone cooked, understood or succeeded. */
export function initUsageAnalytics(track: Track, allowed: () => boolean) {
  const data = document.querySelector<HTMLElement>('#variant-data');
  const variants: Variant[] = data ? JSON.parse(data.textContent || '[]') : [];
  const select = document.querySelector<HTMLSelectElement>('#variant-select');
  const panels = [...document.querySelectorAll<HTMLElement>('[data-variant-panel]')];
  const viewed = new Set<string>(), sections = new Set<string>(), engaged = new Set<string>();
  const reading = new Map<string,number>();
  const visible = new Set<Element>();
  let active = false, listViewed = false, last = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let observer: IntersectionObserver | undefined;
  const variant = () => variants.find(v=>v.id===(data?.dataset.variantReady === 'yes' ? select?.value : new URL(location.href).searchParams.get('variant'))) ?? variants[0];
  const recipeParams = (): AnalyticsParams => {
    const v=variant();
    return v ? {food_slug:data!.dataset.foodSlug!,category:data!.dataset.foodCategory!,condition:v.id,requires_hob:v.needsHob?'yes':'no',requires_thermometer:v.requiresThermometer?'yes':'no',advance_preparation:v.advancePreparation?'yes':'no',recipe_units:v.temperatureC===undefined?'f':'c'} : {};
  };
  const currentPanel = () => panels.find(p=>p.dataset.variantPanel===variant()?.id);
  const sync = () => {
    if (!active || !allowed() || document.visibilityState!=='visible') return;
    const v=variant();
    if (v && currentPanel()?.dataset.kitchenCompatible!=='false' && !viewed.has(v.id) && track('airfryer_guide_view',recipeParams())) viewed.add(v.id);
    else if (!v && !listViewed && document.querySelector('[data-food-list]')) {
      const search = document.querySelector<HTMLElement>('#food-search');
      if (search && search.dataset.searchReady !== 'yes') return;
      const count=[...document.querySelectorAll<HTMLElement>('[data-food-row]')].filter(row=>!row.hidden).length;
      if(track('airfryer_list_view',{results_count:count})) listViewed=true;
    }
  };
  const tick = () => {
    const now=performance.now(), elapsed=Math.min(now-last,500);last=now;
    if(!active || !allowed() || document.visibilityState!=='visible' || document.querySelector('#cooking-dialog[open]')) return;
    const v=variant(), panel=currentPanel();
    if(!v || !panel || panel.hidden || panel.dataset.kitchenCompatible==='false') return;
    for(const section of panel.querySelectorAll<HTMLElement>('[data-recipe-section]')) {
      const key=`${v.id}:${section.dataset.recipeSection}`;
      if(visible.has(section) && !sections.has(key) && track('airfryer_section_view',{...recipeParams(),section:section.dataset.recipeSection!})) sections.add(key);
    }
    const instructions=panel.querySelector('.instructions');
    if(!instructions || !visible.has(instructions) || engaged.has(v.id)) return;
    reading.set(v.id,(reading.get(v.id) ?? 0)+elapsed);
    if(reading.get(v.id)!>=engagedReadMilliseconds && track('airfryer_guide_engaged',{...recipeParams(),section:'instructions',read_seconds:10})) engaged.add(v.id);
  };
  const start = () => {
    if(active || !allowed()) return;active=true;last=performance.now();sync();
    if(data && 'IntersectionObserver' in window) {
      observer=new IntersectionObserver(entries=>{
        for(const entry of entries) {
          if(entry.isIntersecting && entry.intersectionRect.height>=Math.min(100,entry.boundingClientRect.height)) visible.add(entry.target);else visible.delete(entry.target);
        }
        tick();
      },{threshold:[0,.05,.1,.25,.5,.75,1]});
      document.querySelectorAll('[data-recipe-section]').forEach(el=>observer!.observe(el));
      timer=setInterval(tick,250);
    }
  };
  const stop = () => {active=false;observer?.disconnect();observer=undefined;clearInterval(timer);timer=undefined;visible.clear();reading.clear();};
  document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.visibilityState==='visible') sync();});
  document.addEventListener('airfryer:list',sync);
  document.addEventListener('airfryer:kitchen',()=>{last=performance.now();sync();});
  document.addEventListener('airfryer:condition',()=>{last=performance.now();sync();});
  document.addEventListener('click',event=>{
    if(!(event.target instanceof Element) || !allowed()) return;
    const link=event.target.closest<HTMLAnchorElement>('a[href]');
    if(!link) return;
    if(link.dataset.foodLink) {
      const input=document.querySelector<HTMLInputElement>('#search-input');
      const selected=document.querySelector<HTMLElement>('[data-category-filter][aria-current=page]')?.dataset.categoryFilter;
      const entry=link.dataset.entryPoint || (data?'related':input?(input.value.trim()?'search':selected && selected!=='all'?'category':'browse'):'category');
      const rows=[...document.querySelectorAll<HTMLElement>('[data-food-row]')].filter(row=>!row.hidden);
      trackNavigation(event,link,'food_select',{food_slug:link.dataset.foodLink,category:link.closest<HTMLElement>('[data-category]')?.dataset.category ?? 'all',entry_point:entry,...(rows.some(row=>row.contains(link))?{result_position:rows.findIndex(row=>row.contains(link))+1}:{})});
    }
    if(link.origin!==location.origin && link.protocol==='https:' && link.closest('.sources,.safety-note,.without-thermometer')) {
      const role=link.closest<HTMLElement>('[data-source-role]')?.dataset.sourceRole ?? 'safety';
      track('airfryer_reference_click',{...recipeParams(),reference_role:role,reference_host:link.hostname});
    }
  });
  document.addEventListener('toggle',event=>{
    const detail=event.target;
    if(detail instanceof HTMLDetailsElement && detail.open && detail.dataset.sourceRole && allowed()) track('airfryer_source_open',{...recipeParams(),reference_role:detail.dataset.sourceRole});
  },true);
  return {start,stop};
}
