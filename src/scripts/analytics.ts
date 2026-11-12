type ConsentState = 'granted' | 'denied';
type AnalyticsParams = Record<string, string | number>;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    airfryerTrack?: (name: string, params?: AnalyticsParams) => void;
    [key: `ga-disable-${string}`]: boolean;
  }
}
const key = 'airfryer:analytics:v1';

export function initAnalytics() {
  const id = document.querySelector<HTMLMetaElement>('meta[name="ga-measurement-id"]')?.content ?? '';
  const enabled = /^G-[A-Z0-9]+$/.test(id);
  const banner = document.querySelector<HTMLElement>('#consent-banner');
  const close = document.querySelector<HTMLButtonElement>('#consent-close');
  let state: ConsentState | null = null;
  try { const stored = localStorage.getItem(key); if (stored === 'granted' || stored === 'denied') state = stored; } catch { /* Browser storage is optional. */ }
  let loaded = false;
  let sentPage = false;
  const status = document.querySelector<HTMLElement>('#analytics-status');
  const refresh = () => {
    if (status) status.textContent = !enabled ? 'Analytics is not configured in this preview. No Google Analytics tag is loaded.' : state === 'granted' ? 'Your current choice: analytics allowed.' : state === 'denied' ? 'Your current choice: analytics rejected.' : 'You have not chosen whether to allow analytics.';
  };
  const track = (name: string, params: AnalyticsParams = {}) => {
    if (!enabled || state !== 'granted') return;
    window.gtag?.('event', name, { ...params, page_location: `${location.origin}${location.pathname}` });
  };
  const load = () => {
    if (!enabled || state !== 'granted') return;
    window[`ga-disable-${id}`] = false;
    if (!loaded) {
      loaded = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer!.push(arguments); };
      window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
      window.gtag('js', new Date());
      window.gtag('config', id, {
        send_page_view: false, cookie_domain: location.hostname, cookie_flags: 'SameSite=Lax;Secure',
        allow_google_signals: false, allow_ad_personalization_signals: false,
        page_location: `${location.origin}${location.pathname}`,
        page_referrer: document.referrer ? new URL(document.referrer).origin : '',
      });
    } else window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
    if (!document.querySelector('#google-analytics-tag')) {
      const script = document.createElement('script');
      script.id = 'google-analytics-tag'; script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.append(script);
    }
    if (!sentPage) { track('page_view', { page_title: document.title }); sentPage = true; }
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
  const choose = (choice: ConsentState) => {
    state = choice;
    try { localStorage.setItem(key, choice); } catch { /* Honor the choice for this visit even without persistence. */ }
    if (choice === 'granted') load();
    else {
      window[`ga-disable-${id}`] = true;
      clearCookies();
      document.querySelector('#google-analytics-tag')?.remove();
    }
    if (banner) banner.hidden = true;
    refresh();
  };
  window.airfryerTrack = track;
  document.querySelectorAll<HTMLButtonElement>('[data-consent]').forEach(button => button.addEventListener('click', () => choose(button.dataset.consent as ConsentState)));
  document.querySelectorAll<HTMLButtonElement>('[data-privacy-settings]').forEach(button => button.addEventListener('click', () => {
    if (!enabled) { location.href = '/privacy#analytics-status'; return; }
    if (banner) banner.hidden = false;
    if (close) close.hidden = state === null;
    document.querySelector<HTMLButtonElement>('[data-consent="denied"]')?.focus({ preventScroll: true });
  }));
  close?.addEventListener('click', () => { if (banner) banner.hidden = true; });
  if (enabled && state === null && banner) banner.hidden = false;
  if (state === 'granted') load();
  refresh();
}
