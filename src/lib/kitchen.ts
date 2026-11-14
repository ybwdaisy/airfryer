import type {Unit,Variant} from './schema.ts';

export type KitchenPreset = 'metric' | 'us';
export const kitchenKey = 'airfryer:kitchen:v1';
export const presetUnit = (preset:KitchenPreset):Unit => preset === 'metric' ? 'c' : 'f';
export const nativeUnit = (variant:Pick<Variant,'temperatureC'>):Unit => variant.temperatureC === undefined ? 'f' : 'c';
export function parseKitchen(raw:string|null):KitchenPreset|null {
  try {const p=JSON.parse(raw||'null');return p?.version===1 && ['metric','us'].includes(p.preset) ? p.preset : null;}catch{return null;}
}
export function defaultKitchen(locales:readonly string[]):KitchenPreset {
  for(const locale of locales) {
    try {const region=new Intl.Locale(locale).region;if(region)return region==='US'?'us':'metric';}catch{/* Ignore invalid browser locale entries. */}
  }
  return 'metric';
}
export function readKitchen():KitchenPreset {
  try {const temporary=parseKitchen(sessionStorage.getItem(kitchenKey+':temporary'));if(temporary)return temporary;}catch{}
  try {const saved=parseKitchen(localStorage.getItem(kitchenKey));if(saved)return saved;}catch{/* Storage may be unavailable. */}
  const params=new URL(location.href).searchParams;
  if(['metric','us'].includes(params.get('kitchen')||''))return params.get('kitchen') as KitchenPreset;
  // Migrate an old explicit preference once. A shared URL never overrides saved settings.
  let old:string|null=null;try {old=localStorage.getItem('airfryer:unit');}catch{}
  old ??= params.get('unit');
  if(!old){try{const region=localStorage.getItem('airfryer:region:v1');old=region==='cn'?'c':region==='us'?'f':null;}catch{}}
  const preset=old==='c'?'metric':old==='f'?'us':defaultKitchen(navigator.languages);
  saveKitchen(preset);return preset;
}
export function saveKitchen(preset:KitchenPreset):boolean {
  const value=JSON.stringify({version:1,preset});
  try {localStorage.setItem(kitchenKey,value);try{sessionStorage.removeItem(kitchenKey+':temporary');}catch{}return true;}catch{try{sessionStorage.setItem(kitchenKey+':temporary',value);}catch{}return false;}
}
export const unifiedHome = (lang:'en'|'zh') => lang==='zh'?'/zh':'/';
