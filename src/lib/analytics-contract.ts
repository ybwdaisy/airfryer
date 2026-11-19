/** Low-cardinality telemetry only. Never send input values, query strings or source URLs. */
export const analyticsEvents = [
  'recipe_save','recipe_filter','cooking_start','cooking_resume','cooking_pause','cooking_extend','cooking_stage_check','cooking_finish','cooking_cancel',
  'page_view', 'food_search', 'search_no_results', 'search_clear', 'food_select',
  'category_select', 'condition_change', 'unit_change', 'language_change', 'region_change',
  'airfryer_list_view', 'airfryer_guide_view', 'airfryer_section_view',
  'airfryer_guide_engaged', 'airfryer_source_open', 'airfryer_reference_click',
] as const;
export type AnalyticsEvent = typeof analyticsEvents[number];
export type AnalyticsParams = Record<string, string | number>;
const categories = ['all','meat','seafood','vegetables','frozen','bakery','reheat'];
const options: Record<string, readonly string[]> = {
  filter: ['all','quick','saved','no-hob'], save_action: ['save','unsave'],
  category: categories, section: ['preparation','timing','ingredients','instructions','completion','without_thermometer'],
  unit: ['c','f'], previous_unit: ['c','f'], target_language: ['en','zh'], target_collection: ['cn','us'],
  entry_point: ['search','browse','category','related','featured'], search_trigger: ['input','submit','selection'],
  reference_role: ['reference','cross-check','safety','methodology'], requires_hob: ['yes','no'],
  requires_thermometer: ['yes','no'], advance_preparation: ['yes','no'], recipe_units: ['c','f'],
};
export function sanitizeAnalyticsParams(input: AnalyticsParams): AnalyticsParams {
  const result: AnalyticsParams = {};
  for (const [key,value] of Object.entries(input)) {
    const choices = Object.hasOwn(options,key) ? options[key] : undefined;
    if (choices && typeof value === 'string' && choices.includes(value)) result[key]=value;
    else if (['food_slug','condition'].includes(key) && typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length<=64) result[key]=value;
    else if (key==='reference_host' && typeof value==='string' && /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(value) && value.length<=100) result[key]=value;
    else if (['results_count','result_position','read_seconds'].includes(key) && typeof value==='number' && Number.isFinite(value) && value>=0 && value<=10000) result[key]=Math.floor(value);
  }
  return result;
}
export function pageType(path: string): string {
  const p=path.replace(/\/$/,'') || '/';
  if (/\/(?:foods)\//.test(p)) return 'recipe';
  if (/\/categories\//.test(p)) return 'category';
  if (['/','/zh','/china','/zh/us'].includes(p)) return 'home';
  if (/\/settings$/.test(p)) return 'settings';
  if (/\/privacy$/.test(p)) return 'privacy';
  if (/\/methodology$/.test(p)) return 'reference';
  return 'not_found';
}

export type NavigationSource = {path:string; collection:'cn'|'us'; language:'en'|'zh'; units:'c'|'f'; qa:'yes'|'no'; category:string};
export type PendingNavigation = {before?: {name:'food_search'|'search_no_results'|'unit_change';params:AnalyticsParams}; name:string; params:AnalyticsParams; target:string; source:NavigationSource; createdAt:number};
const isPath = (value: unknown): value is string => typeof value==='string' && (value==='/zh' || /^\/(?:zh\/)?(?:(?:china\/)?(?:foods\/[a-z0-9-]{1,64}|categories\/(?:meat|seafood|vegetables|frozen|bakery|reheat))|methodology|privacy|settings|404|china|us)?$/.test(value));
export function canonicalAnalyticsPath(href:string | null): string {
  try {const u=new URL(href || '');return u.origin==='https://airfryer.ybwdaisy.com' && isPath(u.pathname) ? u.pathname : '/404';}catch{return '/404';}
}
export function parsePendingNavigation(raw:string | null, now:number, target:string): PendingNavigation | null {
  try {
    const p=JSON.parse(raw || 'null');
    if(!p || !['food_select','language_change','region_change','unit_change'].includes(p.name) || !isPath(p.target) || p.target!==target || typeof p.createdAt!=='number' || now-p.createdAt<0 || now-p.createdAt>30_000) return null;
    const s=p.source;
    if(!s || !isPath(s.path) || !['cn','us'].includes(s.collection) || !['en','zh'].includes(s.language) || !['c','f'].includes(s.units) || !['yes','no'].includes(s.qa) || !categories.includes(s.category)) return null;
    return {...(p.before && ['food_search','search_no_results','unit_change'].includes(p.before.name) ? {before:{name:p.before.name as 'food_search'|'search_no_results'|'unit_change',params:sanitizeAnalyticsParams(p.before.params || {})}} : {}),name:p.name,params:sanitizeAnalyticsParams(p.params || {}),target:p.target,createdAt:p.createdAt,source:{path:s.path,collection:s.collection,language:s.language,units:s.units,qa:s.qa,category:s.category}};
  } catch {return null;}
}

/** Built-in Content group is available before newly registered custom dimensions propagate. */
export function analyticsContentGroup(source: Pick<NavigationSource,'collection'|'language'|'units'|'qa'>): string {
  return source.qa==='yes' ? 'airfryer_qa' : `airfryer_${source.collection}_${source.language}_${source.units}`;
}
