import {temperature} from '../lib/format';
import {measureText} from '../lib/measure';
import {initAnalytics} from './analytics';
import {localizedPath} from '../lib/locale';
import {kitchenKey,presetUnit,readKitchen,saveKitchen,unifiedHome} from '../lib/kitchen';

const lang=document.documentElement.lang==='zh-CN'?'zh':'en';
const read=(key:string)=>{try{return localStorage.getItem(key);}catch{return null;}};
const temporary=new URL(location.href).searchParams.get('kitchen');
// A saved interface language applies to later visits and shared references as well.
const preferred=read('airfryer:language:v1');
const canonicalPath=new URL(document.querySelector<HTMLLinkElement>('link[rel=canonical]')!.href).pathname;
if((preferred==='zh'||preferred==='en') && preferred!==lang && !temporary) location.replace(localizedPath(canonicalPath,preferred)+location.search+location.hash);
else {
  const apply=()=>{
    const preset=readKitchen(),unit=presetUnit(preset);
    document.documentElement.dataset.temperatureUnit=unit;
    document.documentElement.dataset.kitchenPreset=preset;
    if(!document.querySelector('#variant-data'))document.documentElement.dataset.region=unit==='c'?'cn':'us';
    document.querySelectorAll<HTMLElement>('[data-temperature]').forEach(el=>{
      const c=el.dataset.temperatureC===undefined?undefined:Number(el.dataset.temperatureC);
      el.textContent=temperature(Number(el.dataset.temperature),c===undefined?'f':'c',c);
    });
    document.querySelectorAll<HTMLElement>('[data-measure]').forEach(el=>el.textContent=measureText(el.dataset.measure!,unit,lang,true));
    document.querySelectorAll<HTMLElement>('[data-food-row]').forEach(el=>el.hidden=el.dataset.recipeUnit!==unit);
    document.querySelectorAll<HTMLElement>('[data-variant-panel]').forEach(panel=>{
      const compatible=panel.dataset.recipeUnit===unit;
      panel.dataset.kitchenCompatible=String(compatible);
      panel.querySelectorAll<HTMLElement>('[data-compatible-body]').forEach(el=>el.hidden=!compatible);
      panel.querySelectorAll<HTMLElement>('[data-unsupported-note]').forEach(el=>el.hidden=compatible);
    });
    document.querySelectorAll<HTMLElement>('[data-kitchen-summary]').forEach(el=>el.textContent=preset==='metric'?'°C, g, mL, cm':'°F, oz, cups, inches');
    document.querySelectorAll<HTMLElement>('.related').forEach(section=>{let shown=0;section.querySelectorAll<HTMLElement>('[data-food-row]').forEach(row=>{row.hidden=row.dataset.recipeUnit!==unit || shown>=4;if(!row.hidden)shown++;});section.hidden=shown===0;});
    const count=[...document.querySelectorAll<HTMLElement>('[data-food-row]')].filter(el=>!el.hidden).length;
    document.querySelectorAll<HTMLElement>('[data-category-count]').forEach(el=>el.textContent=lang==='zh'?`${count} 道做法`:`${count} recipes`);
    document.querySelectorAll<HTMLElement>('[data-category-empty]').forEach(el=>el.hidden=count>0);
    document.documentElement.dataset.kitchenReady='yes';
    document.dispatchEvent(new CustomEvent('airfryer:kitchen',{detail:{unit,preset}}));
  };
  document.querySelectorAll<HTMLElement>('.js-only').forEach(el=>el.hidden=false);
  document.querySelectorAll<HTMLAnchorElement>('[data-region-home]').forEach(a=>a.href=unifiedHome(lang));
  // Temporary URL state is only used when browser storage rejected a save.
  document.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    const switchBtn=event.target.closest<HTMLButtonElement>('[data-switch-kitchen]');
    if(switchBtn){
      const nextPreset=switchBtn.dataset.switchKitchen;
      if(nextPreset==='metric'||nextPreset==='us'){
        const previous=readKitchen();
        const saved=saveKitchen(nextPreset);
        if(!saved||new URL(location.href).searchParams.get('kitchen')){
          const u=new URL(location.href);u.searchParams.set('kitchen',nextPreset);history.replaceState(null,'',u);
        }
        // Track before apply() replaces the previous page's unit context.
        if(nextPreset!==previous)window.airfryerTrack?.('unit_change',{unit:presetUnit(nextPreset),previous_unit:presetUnit(previous)});
        apply();
      }
      return;
    }
    if(!new URL(location.href).searchParams.get('kitchen'))return;
    const a=event.target.closest<HTMLAnchorElement>('a[href]');if(!a||a.origin!==location.origin||a.hash)return;
    const next=new URL(a.href);next.searchParams.set('kitchen',readKitchen());a.href=next.href;
  });
  window.addEventListener('storage',e=>{if(e.key===kitchenKey||e.key===null)apply();});
  document.addEventListener('airfryer:settings-saved',apply);
  apply();initAnalytics();
}
