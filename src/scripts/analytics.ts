type ConsentState = 'granted' | 'denied';
import { languageFromPath, localizedPath } from '../lib/locale';
import { analyticsEvents, pageType, sanitizeAnalyticsParams, canonicalAnalyticsPath, parsePendingNavigation, analyticsContentGroup, type NavigationSource, type AnalyticsParams, type AnalyticsEvent } from '../lib/analytics-contract';
import { initUsageAnalytics } from './usage';
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    airfryerTrack?: (name: string, params?: AnalyticsParams, completed?: () => void) => boolean;
    airfryerStageSearch?: (name: string, params: AnalyticsParams) => boolean;
    airfryerQueueNavigation?: (name: string, params: AnalyticsParams, target: string, before?: {name:'unit_change';params:AnalyticsParams}) => boolean;
    [key: `ga-disable-${string}`]: boolean;
  }
}
const key = 'airfryer:analytics:v1';
const pendingKey = 'airfryer:pending-navigation:v2';

export function initAnalytics() {
  const id = document.querySelector<HTMLMetaElement>('meta[name="ga-measurement-id"]')?.content ?? '';
  const enabled = /^G-[A-Z0-9]+$/.test(id) && location.origin === 'https://airfryer.ybwdaisy.com';
  let qa = false;
  try {
    if (new URL(location.href).searchParams.get('qa') === '1') sessionStorage.setItem('airfryer:analytics:qa','yes');
    qa = sessionStorage.getItem('airfryer:analytics:qa') === 'yes';
  } catch { qa = new URL(location.href).searchParams.get('qa') === '1'; }
  const banner = document.querySelector<HTMLElement>('#consent-banner');
  const close = document.querySelector<HTMLButtonElement>('#consent-close');
  let state: ConsentState | null = null;
  try { const stored = localStorage.getItem(key); if (stored === 'granted' || stored === 'denied') state = stored; } catch { /* Browser storage is optional. */ }
  let loaded = false;
  let sentPage = false;
  const status = document.querySelector<HTMLElement>('#analytics-status');
  const refresh = () => {
    if (status) status.textContent = !enabled ? (status.dataset.analyticsUnconfigured ?? 'Analytics is not configured in this preview. No Google Analytics tag is loaded.') : state === 'granted' ? (status.dataset.analyticsGranted ?? 'Your current choice: analytics allowed.') : state === 'denied' ? (status.dataset.analyticsDenied ?? 'Your current choice: analytics rejected.') : (status.dataset.analyticsUnset ?? 'You have not chosen whether to allow analytics.');
  };
  const publicPath = canonicalAnalyticsPath(document.querySelector<HTMLLinkElement>('link[rel=canonical]')?.href ?? null);
  const sourceContext = (): NavigationSource => {
    const category=document.querySelector<HTMLElement>('#variant-data')?.dataset.foodCategory ?? document.querySelector<HTMLElement>('[data-category-filter][aria-current=page]')?.dataset.categoryFilter ?? publicPath.match(/\/categories\/([a-z-]+)/)?.[1] ?? 'all';
    const unit=document.documentElement.dataset.temperatureUnit ?? document.documentElement.dataset.defaultUnit;
    return {path:publicPath,collection:document.documentElement.dataset.region==='cn'?'cn':'us',language:languageFromPath(publicPath),units:unit==='c'?'c':'f',qa:qa?'yes':'no',category:String(sanitizeAnalyticsParams({category}).category ?? 'all')};
  };
  let stagedSearch: {name:'food_search'|'search_no_results';params:AnalyticsParams} | null = null;
  const track = (name: string, params: AnalyticsParams = {}, completed?: () => void, previousSource?: NavigationSource): boolean => {
    if (!enabled || state !== 'granted' || !analyticsEvents.includes(name as AnalyticsEvent)) return false;
    const source=previousSource ?? sourceContext();
    if(name==='food_select' && stagedSearch) {const search=stagedSearch;stagedSearch=null;track(search.name,search.params);}
    if(!previousSource) window.gtag?.('set',{content_group:analyticsContentGroup(source)});
    window.gtag?.('event', name, {
      ...sanitizeAnalyticsParams({category:source.category}), ...sanitizeAnalyticsParams(params), send_to:id,
      content_group:analyticsContentGroup(source), tool_id:'airfryer', analytics_version:'2', food_collection:source.collection, ui_language:source.language,
      measurement_units:source.units, page_type:pageType(source.path), qa_traffic:source.qa,
      ...(source.qa==='yes' ? {debug_mode:true,traffic_type:'developer'} : {}),
      page_location:`https://airfryer.ybwdaisy.com${source.path}`,
      ...(name==='page_view' ? {page_title:document.title} : {}),
      ...(completed ? {event_callback:completed,event_timeout:300} : {}),
    });
    return true;
  };
  const clearPending = () => {try {sessionStorage.removeItem(pendingKey);} catch { /* Storage is optional. */ }};
  if(state!=='granted') clearPending();
  const queueNavigation = (name:string, params:AnalyticsParams, target:string, before?:{name:'unit_change';params:AnalyticsParams}): boolean => {
    if(!enabled || state!=='granted' || !['food_select','language_change','region_change'].includes(name)) return false;
    const pending={...(before ? {before:{name:before.name,params:sanitizeAnalyticsParams(before.params)}} : {}),...(name==='food_select' && stagedSearch ? {before:stagedSearch} : {}),name,params:sanitizeAnalyticsParams(params),target,source:sourceContext(),createdAt:Date.now()};
    if(!parsePendingNavigation(JSON.stringify(pending),Date.now(),target)) return false;
    try {sessionStorage.setItem(pendingKey,JSON.stringify(pending));stagedSearch=null;return true;} catch {return false;}
  };
  const sendPending = () => {
    let raw:string | null=null;try {raw=sessionStorage.getItem(pendingKey);} catch {return;}
    clearPending();
    const pending=parsePendingNavigation(raw,Date.now(),publicPath);
    if(pending) {
      if(pending.before) track(pending.before.name,pending.before.params,undefined,pending.source);
      track(pending.name,pending.params,undefined,pending.source);
    }
  };
  const usage = initUsageAnalytics(track, () => enabled && state === 'granted');
  const load = () => {
    if (!enabled || state !== 'granted') return;
    window[`ga-disable-${id}`] = false;
    if (!loaded) {
      loaded = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer!.push(arguments); };
      const config = {
        content_group:analyticsContentGroup(sourceContext()), tool_id: 'airfryer', analytics_version: '2', qa_traffic: qa ? 'yes' : 'no',
        ...(qa ? {debug_mode:true,traffic_type:'developer'} : {}),
        send_page_view: false, cookie_domain: location.hostname, cookie_flags: 'SameSite=Lax;Secure',
        allow_google_signals: false, allow_ad_personalization_signals: false,
        page_location: `https://airfryer.ybwdaisy.com${publicPath}`,
        page_referrer: document.referrer ? new URL(document.referrer).origin : '',
      };
      window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      // The shared Google tag can initialize a destination before its config command.
      // Apply safe defaults first so initialization cannot send the URL query string.
      window.gtag('set', config);
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
      window.gtag('js', new Date());
      window.gtag('config', id, config);
    } else window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
    if (!document.querySelector('#google-analytics-tag')) {
      const script = document.createElement('script');
      script.id = 'google-analytics-tag'; script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.append(script);
    }
    window.gtag?.('set',{content_group:analyticsContentGroup(sourceContext())});
    sendPending();
    if (!sentPage) { track('page_view'); sentPage = true; }
    usage.start();
  };
  const clearCookies = () => {
    for (const part of document.cookie.split(';')) {
      const name = part.split('=')[0].trim();
      if (name === '_ga' || name.startsWith('_ga_')) {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname}; SameSite=Lax`;
      }
    }
  };
  const choose = (choice: ConsentState | null, persist = true) => {
    state = choice;
    if(persist) try { if(choice) localStorage.setItem(key, choice);else localStorage.removeItem(key); } catch { /* Honor the choice for this visit even without persistence. */ }
    if (choice === 'granted') load();
    else {
      window[`ga-disable-${id}`] = true;
      usage.stop();
      clearPending();
      stagedSearch=null;
      clearCookies();
      document.querySelector('#google-analytics-tag')?.remove();
    }
    if (banner) banner.hidden = choice !== null || !enabled;
    if (close) close.hidden = choice === null;
    refresh();
    document.dispatchEvent(new CustomEvent('airfryer:consent', {detail: {granted: state === 'granted'}}));
  };
  window.addEventListener('storage', event => {
    if(event.key !== key && event.key !== null) return;
    try {if(event.storageArea !== localStorage) return;} catch {if(event.key !== key) return;}
    const next = event.newValue === 'granted' || event.newValue === 'denied' ? event.newValue : null;
    if(next !== state) choose(next,false);
  });
  window.airfryerTrack = track;
  window.airfryerQueueNavigation = queueNavigation;
  window.airfryerStageSearch = (name,params) => {
    if(!enabled || state!=='granted' || !['food_search','search_no_results'].includes(name)) return false;
    stagedSearch={name:name as 'food_search'|'search_no_results',params:sanitizeAnalyticsParams(params)};return true;
  };
  document.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach(button => button.addEventListener('click', () => choose(button.dataset.consent as ConsentState)));
  document.querySelectorAll<HTMLButtonElement>('[data-privacy-settings]').forEach(button => button.addEventListener('click', () => {
    if (!enabled) { location.href = localizedPath('/privacy', languageFromPath(location.pathname)) + '#analytics-status'; return; }
    if (banner) banner.hidden = false;
    if (close) close.hidden = state === null;
    document.querySelector<HTMLButtonElement>('[data-consent="denied"]')?.focus({ preventScroll: true });
  }));
  close?.addEventListener('click', () => { if (banner) banner.hidden = true; });
  if (enabled && state === null && banner) banner.hidden = false;
  if (state === 'granted') load();
  refresh();
}
