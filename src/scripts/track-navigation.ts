import type { AnalyticsParams } from '../lib/analytics-contract';

/** Authorized same-tab navigation is delivered once by the destination page, without delaying navigation. */
export function trackNavigation(event: MouseEvent, link: HTMLAnchorElement, name: string, params: AnalyticsParams) {
  if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (link.target && link.target!=='_self') || link.origin!==location.origin) {
    window.airfryerTrack?.(name,params);return;
  }
  if(window.airfryerQueueNavigation?.(name,params,link.pathname)) return;
  // Storage-blocked browsers retain a bounded SDK-callback fallback.
  let done=false;
  const navigate=()=>{if(!done){done=true;location.assign(link.href);}};
  const sent=window.airfryerTrack?.(name,params,navigate);
  if(!sent) return;
  event.preventDefault();
  window.setTimeout(navigate,300);
}
