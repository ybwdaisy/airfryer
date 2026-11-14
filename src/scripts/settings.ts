import {readKitchen,saveKitchen,presetUnit,type KitchenPreset} from '../lib/kitchen';
import {languageFromPath} from '../lib/locale';
const form=document.querySelector<HTMLFormElement>('#kitchen-settings');
if(form){
 const fallback=document.querySelector<HTMLElement>('[data-settings-fallback]');if(fallback)fallback.hidden=true;
 const preset=form.querySelector<HTMLSelectElement>('[name=preset]')!;
 const language=form.querySelector<HTMLSelectElement>('[name=language]')!;
 const status=document.querySelector<HTMLElement>('[data-settings-status]')!;
 const lang=languageFromPath(location.pathname);
 preset.value=readKitchen();language.value=lang;
 if(new URL(location.href).searchParams.get('save')==='temporary'){status.textContent=status.dataset.temporary!;status.hidden=false;}
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const chosen=preset.value as KitchenPreset,target=language.value==='zh'?'zh':'en';
  if(!['metric','us'].includes(chosen))return;
  const previous=readKitchen();
  const before=chosen!==previous?{name:'unit_change' as const,params:{unit:presetUnit(chosen),previous_unit:presetUnit(previous)}}:undefined;
  const saved=saveKitchen(chosen);let languageSaved=false;
  try{localStorage.setItem('airfryer:language:v1',target);languageSaved=true;}catch{}
  const persistent=saved&&languageSaved;
  const destination=target==='zh'?'/zh/settings':'/settings';
  const path=destination+(!persistent?`?kitchen=${chosen}&save=temporary`:'');
  // Capture the previous page context before applying the new preset.
  const queued=target!==lang && window.airfryerQueueNavigation?.('language_change',{target_language:target},destination,before);
  if(before&&!queued)window.airfryerTrack?.(before.name,before.params);
  const url=new URL(location.href);url.searchParams.delete('unit');url.searchParams.delete('save');
  if(persistent)url.searchParams.delete('kitchen');else url.searchParams.set('kitchen',chosen);
  history.replaceState(null,'',url);
  document.dispatchEvent(new CustomEvent('airfryer:settings-saved'));
  status.textContent=persistent?status.dataset.saved!:status.dataset.temporary!;status.hidden=false;
  document.querySelectorAll<HTMLAnchorElement>('[data-back-to-foods]').forEach(a=>{a.href=(target==='zh'?'/zh':'/')+(!persistent?`?kitchen=${chosen}`:'');});
  if(target!==lang){
   if(queued){location.assign(path);return;}
   let moved=false;const move=()=>{if(!moved){moved=true;location.assign(path);}};
   if(!window.airfryerTrack?.('language_change',{target_language:target},move))move();else setTimeout(move,350);
  }
 });
 window.addEventListener('storage',e=>{if(e.key==='airfryer:kitchen:v1'||e.key===null)preset.value=readKitchen();});
}
