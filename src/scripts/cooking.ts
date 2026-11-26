import {cookingKey,createCooking,remaining,reconcile,startCooking,pauseCooking,extendCooking,nextCookingPhase,parseCooking,type CookingSession,type CookingPlan} from '../lib/cooking';
import {cookingCopy} from '../lib/cooking-copy';
const lang=document.documentElement.lang==='zh-CN'?'zh':'en',c=cookingCopy(lang);
const dialog=document.querySelector<HTMLDialogElement>('#cooking-dialog')!;
const dock=document.querySelector<HTMLElement>('[data-cooking-dock]')!;
const el=<T extends HTMLElement=HTMLElement>(selector:string)=>dialog.querySelector<T>(`[data-cook-${selector}]`)!;
let session:CookingSession|null=null,storageFailed=false,audio:AudioContext|null=null,wake:WakeLockSentinel|null=null;
let showingConflict=false,renderedKey='',keepAwake=false;
let pendingPlan:CookingPlan|null=null;
try{session=parseCooking(localStorage.getItem(cookingKey));}catch{/* On-page timing still works when storage is blocked. */}
const clock=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
const text=(selector:string,value:string)=>{const node=el(selector);if(node.textContent!==value)node.textContent=value;};
const persist=()=>{
  try{session?localStorage.setItem(cookingKey,JSON.stringify(session)):localStorage.removeItem(cookingKey);storageFailed=false;}catch{storageFailed=true;}
  text('storage',storageFailed?c.savedError:c.saved);
};
const syncAudio=()=>{el('audio-note').hidden=!session?.sound||audio?.state==='running';};
const unlockAudio=()=>{
  if(!session?.sound)return;
  try{if(!audio){audio=new AudioContext();audio.addEventListener('statechange',syncAudio);}void audio.resume().then(syncAudio).catch(syncAudio);}
  catch{/* The visible note explains unavailable sound without interrupting timing. */}
  syncAudio();
};
const beep=()=>{
  if(!session?.sound||!audio||audio.state!=='running'||document.visibilityState!=='visible')return;
  const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
  oscillator.frequency.value=660;gain.gain.setValueAtTime(.12,now);gain.gain.exponentialRampToValueAtTime(.001,now+.8);
  oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(now);oscillator.stop(now+.8);
};
const releaseWake=()=>{if(wake){void wake.release().catch(()=>{});wake=null;}};
const syncWake=async()=>{
  if(!session||session.status!=='running'||!keepAwake||document.visibilityState!=='visible'){releaseWake();return;}
  if(wake)return;
  try{wake=await navigator.wakeLock.request('screen');wake.addEventListener('release',()=>{wake=null;});}
  catch{keepAwake=false;syncOptions();text('storage',c.screenUnavailable);}
};
const syncOptions=()=>{for(const [name,on]of [['sound',Boolean(session?.sound)],['awake',keepAwake]]as const){el(name).setAttribute('aria-pressed',String(on));text(`${name}-state`,on?c.on:c.off);}};
const syncStartLabels=()=>{document.querySelectorAll<HTMLElement>('[data-cook-start]').forEach(button=>{const same=session&&session.plan.condition===button.dataset.cookStart&&session.plan.slug===document.querySelector<HTMLElement>('#variant-data')?.dataset.foodSlug;const label=button.querySelector('[data-cook-start-label]');if(label)label.textContent=same?(session!.status==='paused'?c.resume:c.open):c.start;});};
const stageLabel=()=>session?`${c.stage} ${session.phase+1}/${session.plan.phases.length}`:'';
const render=()=>{
  dock.hidden=!session||dialog.open;syncStartLabels();
  document.body.classList.toggle('has-cooking-timer',Boolean(session));
  if(!session){releaseWake();if(dialog.open)dialog.close();return;}
  const p=session.plan,copy=p.copy[lang],phase=p.phases[session.phase],seconds=remaining(session);
  const state=session.status==='running'?c.cooking:session.status==='paused'?c.paused:session.status==='check'?c.check:c.notStarted;
  dock.querySelector('[data-dock-name]')!.textContent=copy.name;
  dock.querySelector('[data-dock-state]')!.textContent=session.reminderPending?c.reminder:p.phases.length>1?`${stageLabel()} / ${state}`:state;
  dock.querySelector('[data-dock-digits]')!.textContent=clock(seconds);
  const dockPause=dock.querySelector<HTMLButtonElement>('[data-cook-dock-pause]')!;
  dockPause.setAttribute('aria-label',session.status==='running'?c.pause:c.resume);
  dockPause.dataset.paused=String(session.status!=='running');dockPause.disabled=!['running','paused'].includes(session.status);
  if(showingConflict){text('current-digits',clock(seconds));return;}
  if(!dialog.open)return;
  text('digits',clock(seconds));
  el('digits').dataset.long=String(session.duration>=6000);
  const progress=el<HTMLProgressElement>('progress');progress.max=session.duration;progress.value=session.duration-seconds;
  const key=JSON.stringify([p.slug,p.condition,session.phase,session.status,session.updatedAt,session.reminderPending,session.sound,storageFailed]);
  if(key===renderedKey)return;renderedKey=key;
  dialog.querySelector('#cooking-title')!.textContent=copy.name;text('condition',copy.label);text('status',state);
  el('check').hidden=session.status!=='check';
  el('add').hidden=session.status==='ready';
  el<HTMLButtonElement>('add').disabled=session.duration>=10800;
  el('ack').hidden=!session.reminderPending;
  text('alert',session.status==='check'?c.timeUp:session.reminderPending?`${c.reminder} ${p.reminderSeconds[session.reminderIndex-1]/60} ${c.minutes}: ${copy.turn}`:'');
  const primary=el<HTMLButtonElement>('primary');primary.hidden=session.status==='check';
  primary.textContent=session.status==='running'?c.pause:session.status==='paused'?c.resume:c.start;
  primary.disabled=false;
  text('stage',p.phases.length===1?c.checkAt:stageLabel());text('temperature',`${phase.temperature}°${p.unit.toUpperCase()}`);text('digits',clock(seconds));
  text('range',`${c.range}: ${phase.minutes[0]}${phase.minutes[1]===phase.minutes[0]?'':`–${phase.minutes[1]}`} ${c.minutes}`);
  text('preparation',copy.preparation||copy.label);text('portion',copy.portion);text('preheat',copy.preheat);text('turn',copy.turn);
  text('completion',copy.completion);el('without').hidden=!copy.withoutThermometer;el('without').querySelector('p')!.textContent=copy.withoutThermometer;
  const hasNext=session.phase<p.phases.length-1;
  text('check-heading',hasNext?c.phaseDone:c.completion);
  el('completion').hidden=hasNext;el('without').hidden=hasNext||!copy.withoutThermometer;
  text('stage-action',hasNext?copy.turn:'');
  el('next-button').hidden=!hasNext;el('finish').hidden=hasNext;
  text('next',hasNext?`${c.nextHint} ${p.phases[session.phase+1].temperature}°${p.unit.toUpperCase()}`:c.noAuto);
  const phases=el('phases');phases.hidden=p.phases.length===1;
  phases.replaceChildren(...p.phases.map((phase,i)=>{const li=document.createElement('li');li.textContent=`${c.stage} ${i+1}: ${phase.temperature}°${p.unit.toUpperCase()}`;if(i===session!.phase)li.setAttribute('aria-current','step');return li;}));
  el('steps').replaceChildren(...copy.steps.map(step=>{const li=document.createElement('li');li.textContent=step;return li;}));
  syncOptions();syncAudio();
  const recipe=el<HTMLAnchorElement>('recipe');recipe.href=`${lang==='zh'?'/zh':''}${p.path}?variant=${p.condition}`;
  text('storage',storageFailed?c.savedError:c.saved);
};
const update=()=>{
  if(!session)return;
  const before=session.status,current=reconcile(session);
  session=current;
  if(before==='running'&&session.status==='check'){persist();text('alert',c.timeUp);beep();void syncWake();window.airfryerTrack?.('cooking_stage_check',{food_slug:session.plan.slug,condition:session.plan.condition});}
  if(session.status==='running'&&session.phase===0){
    const elapsed=session.duration-remaining(session);let index=session.reminderIndex;
    while(index<session.plan.reminderSeconds.length&&session.plan.reminderSeconds[index]<=elapsed)index++;
    if(index>session.reminderIndex){session={...session,reminderIndex:index,reminderPending:true,updatedAt:Date.now()};persist();beep();}
  }
  render();
};
const open=()=>{
  if(!session)return;
  showingConflict=false;pendingPlan=null;renderedKey='';el('existing').hidden=true;el('content').hidden=false;el('end-confirm').hidden=true;
  if(!dialog.open)dialog.showModal();render();dialog.scrollTop=0;el<HTMLButtonElement>('close').focus({preventScroll:true});
};
const saveAction=(action:'start'|'pause'|'extend')=>{
  if(!session)return;
  const showClock=session.status==='ready'||session.status==='check'||action==='start';
  const eventName=action==='start'&&session.status==='paused'?'cooking_resume':`cooking_${action}`;
  unlockAudio();
  if(action==='start')session=startCooking(session);else if(action==='pause')session=pauseCooking(session);else session=extendCooking(session);
  persist();render();if(showClock&&dialog.open)dialog.scrollTop=0;void syncWake();
  window.airfryerTrack?.(eventName,{food_slug:session.plan.slug,condition:session.plan.condition});
};
document.addEventListener('click',event=>{
  if(!(event.target instanceof Element))return;
  const button=event.target.closest<HTMLButtonElement>('[data-cook-start]');if(!button)return;
  const panel=button.closest<HTMLElement>('[data-variant-panel]');
  if(panel?.hidden||panel?.dataset.kitchenCompatible==='false')return;
  const plans=JSON.parse(document.querySelector('#cooking-plans')?.textContent||'[]') as CookingPlan[];
  const plan=plans.find(p=>p.condition===button.dataset.cookStart);if(!plan)return;
  if(session&&(session.plan.slug!==plan.slug||session.plan.condition!==plan.condition)){
    pendingPlan=plan;
    showingConflict=true;el('existing').hidden=false;el('content').hidden=true;
    dialog.querySelector('#cooking-title')!.textContent=plan.copy[lang].name;text('condition',plan.copy[lang].label);text('status',c.replace);text('replace-detail',c.replaceDetail);text('current-name',session.plan.copy[lang].name);text('current-digits',clock(remaining(session)));
    if(!dialog.open)dialog.showModal();render();dialog.scrollTop=0;el<HTMLButtonElement>('current').focus({preventScroll:true});return;
  }
  if(!session){session=createCooking(plan);saveAction('start');}else if(['ready','paused'].includes(session.status)){saveAction('start');}
  open();
});
el('current').addEventListener('click',open);
el('replace').addEventListener('click',()=>{if(pendingPlan){if(session)window.airfryerTrack?.('cooking_cancel',{food_slug:session.plan.slug,condition:session.plan.condition});releaseWake();const sound=session?.sound??false;session={...createCooking(pendingPlan),sound};pendingPlan=null;saveAction('start');open();}});
el('close').addEventListener('click',()=>dialog.close());
el('ack').addEventListener('click',()=>{if(session){session={...session,reminderPending:false,updatedAt:Date.now()};persist();render();}});
el('primary').addEventListener('click',()=>{
  if(!session)return;
  text('alert','');saveAction(session.status==='running'?'pause':'start');
});
el('add').addEventListener('click',()=>{text('alert','');saveAction('extend');});
el('next-button').addEventListener('click',()=>{if(!session||session.status!=='check')return;session=startCooking(nextCookingPhase(session));persist();text('alert','');render();dialog.scrollTop=0;void syncWake();});
const finish=(completed=false)=>{
  if(session)window.airfryerTrack?.(completed?'cooking_finish':'cooking_cancel',{food_slug:session.plan.slug,condition:session.plan.condition});
  session=null;pendingPlan=null;persist();releaseWake();dialog.close();render();
};
el('finish').addEventListener('click',()=>finish(true));
el('stop').addEventListener('click',()=>{el('end-confirm').hidden=false;el<HTMLButtonElement>('keep').focus();});
el('keep').addEventListener('click',()=>{el('end-confirm').hidden=true;el<HTMLButtonElement>('stop').focus();});
el('end').addEventListener('click',()=>finish());
el('sound').addEventListener('click',()=>{if(session){session={...session,sound:!session.sound};unlockAudio();persist();syncOptions();syncAudio();}});
el('awake').addEventListener('click',()=>{keepAwake=!keepAwake;syncOptions();void syncWake();});
dock.querySelector('[data-cook-open]')!.addEventListener('click',open);
dock.querySelector('[data-cook-dock-pause]')!.addEventListener('click',()=>saveAction(session?.status==='running'?'pause':'start'));
document.addEventListener('visibilitychange',()=>{update();void syncWake();if(document.visibilityState==='visible')unlockAudio();});
document.addEventListener('pointerdown',unlockAudio,{capture:true});
document.addEventListener('keydown',unlockAudio,{capture:true});
dialog.addEventListener('close',()=>{showingConflict=false;pendingPlan=null;render();});
window.addEventListener('storage',event=>{if(event.key===cookingKey||event.key===null){try{session=parseCooking(localStorage.getItem(cookingKey));}catch{session=null;}update();render();void syncWake();}});
window.addEventListener('pagehide',()=>{releaseWake();});
setInterval(update,500);
render();
unlockAudio();
