import {favoritesKey, readFavorites} from '../lib/favorites';
const zh = document.documentElement.lang === 'zh-CN';
const sync = () => {
  const ids = new Set(readFavorites());
  document.querySelectorAll<HTMLButtonElement>('[data-favorite]').forEach(button => {
    const saved = ids.has(button.dataset.favorite!);
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', `${saved ? (zh ? '取消收藏' : 'Unsave') : (zh ? '收藏' : 'Save')} ${button.dataset.foodName}`);
    button.title = button.getAttribute('aria-label')!;
  });
  document.querySelectorAll('[data-saved-count]').forEach(el => el.textContent = String(ids.size));
};
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLButtonElement>('[data-favorite]');
  if (!button) return;
  const ids = new Set(readFavorites()), id = button.dataset.favorite!;
  ids.has(id) ? ids.delete(id) : ids.add(id);
  try {
    localStorage.setItem(favoritesKey, JSON.stringify({version: 1, ids: [...ids]}));
    sync();
    window.airfryerTrack?.('recipe_save',{food_slug:id,save_action:ids.has(id)?'save':'unsave'});
    const status=document.querySelector<HTMLElement>('[data-favorite-status]');if(status)status.textContent='';
    document.dispatchEvent(new CustomEvent('airfryer:favorites'));
  } catch {
    const status = document.querySelector<HTMLElement>('[data-favorite-status]');
    if (status) status.textContent = zh ? '收藏未能保存，请检查浏览器存储设置后重试。' : 'Could not save. Check browser storage and try again.';
  }
});
window.addEventListener('storage', e => { if (e.key === favoritesKey || e.key === null) { sync(); document.dispatchEvent(new CustomEvent('airfryer:favorites')); } });
sync();
