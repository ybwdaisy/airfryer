import type {Variant, Unit} from './schema.ts';
export const cookingKey = 'airfryer:cooking:v1';
export type Phase = {temperature: number; minutes: [number,number]};
export type CookingText = {
  name: string;
  label: string; portion: string; preparation: string; preheat: string; turn: string;
  completion: string; withoutThermometer: string; steps: string[];
};
export type CookingPlan = {
  slug: string; condition: string; path: string; unit: Unit;
  copy: Record<'en'|'zh', CookingText>;
  phases: Phase[]; reminderSeconds: number[];
};
export type CookingSession = {
  version: 1; plan: CookingPlan; phase: number; status: 'ready'|'running'|'paused'|'check';
  seconds: number; duration: number; deadline: number | null; reminderIndex: number;
  sound: boolean; reminderPending: boolean; updatedAt: number;
};
/** Only explicit source timing is scheduled. Unknown instructions remain readable, without an invented reminder. */
export function sourceReminders(turn: string, durationSeconds: number, multiPhase = false): number[] {
  if (multiPhase) return [];
  const negative=/(?:do not|no need(?: to)?|don't)\s+(?:turn|flip|shake)|(?:无需|不必|不用|不需)(?:再|要)?(?:翻|摇|搖)/i;
  const source=turn.split(/[;。；]|\.(?:\s|$)/).filter(clause=>!negative.test(clause)).join('; ');
  const times=new Set<number>();
  const add=(minutes:number)=>{const seconds=Math.round(minutes*60);if(seconds>0&&seconds<=10800)times.add(seconds);};
  const listTimes=(list:string)=>{for(const m of list.matchAll(/(\d+(?:\.\d+)?)(?:\s*[–-]\s*\d+(?:\.\d+)?)?/g))add(Number(m[1]));};
  if(/halfway|half-way|中途|一半/i.test(source))times.add(Math.floor(durationSeconds/2));
  for(const match of source.matchAll(/(?:every\s+(?:about\s+)?|每\s*)(\d+)(?:\s*[–-]\s*\d+)?\s*(?:minutes?|mins?|分钟)/gi)){
    const interval=Number(match[1])*60;
    if(interval>=60)for(let seconds=interval;seconds<=10800;seconds+=interval)times.add(seconds);
  }
  for(const match of source.matchAll(/(?:at|from)\s+minutes?\s+(\d+(?:\.\d+)?)/gi))add(Number(match[1]));
  const number='\\d+(?:\\.\\d+)?(?:\\s*[–-]\\s*\\d+(?:\\.\\d+)?)?';
  const list=`${number}(?:\\s*(?:,|and|&|\\/)\\s*${number})*`;
  const explicit=new RegExp(`(?:after|from|at(?:\\s+(?:about|around))?(?:\\s+minutes?)?|turn(?:\\s+(?:after|at))?(?:\\s+(?:about|around))?|shake(?:\\s+(?:after|at))?(?:\\s+(?:about|around))?)\\s+(${list})\\s*(?:minutes?|mins?)\\b`,'gi');
  for(const match of source.matchAll(explicit))listTimes(match[1]);
  const chinese=new RegExp(`第?(${number}(?:\\s*[、，,和及]\\s*${number})*)\\s*分钟`,'g');
  for(const match of source.matchAll(chinese))listTimes(match[1]);
  return [...times].filter(n=>n>0).sort((a,b)=>a-b);
}
export function variantPhases(variant: Variant): Phase[] {
  return variant.cookingPhases?.map(p=>({temperature:p.temperatureC,minutes:[...p.minutes]})) ?? [{temperature:variant.temperatureC ?? variant.temperatureF,minutes:[...variant.minutes]}];
}
export function createCooking(plan: CookingPlan, now = Date.now()): CookingSession {
  const duration = plan.phases[0].minutes[0] * 60;
  return {version:1,plan,phase:0,status:'ready',seconds:duration,duration,deadline:null,reminderIndex:0,reminderPending:false,sound:false,updatedAt:now};
}
export function remaining(session: CookingSession, now = Date.now()): number {
  return session.status === 'running' && session.deadline !== null ? Math.max(0, Math.ceil((session.deadline-now)/1000)) : session.seconds;
}
export function reconcile(session: CookingSession, now = Date.now()): CookingSession {
  return session.status==='running' && remaining(session,now)===0 ? {...session,status:'check',seconds:0,deadline:null,reminderIndex:session.plan.reminderSeconds.filter(n=>n<=session.duration).length,reminderPending:false,updatedAt:now} : session;
}
export function startCooking(session: CookingSession, now = Date.now()): CookingSession {
  if (!['ready','paused'].includes(session.status)) return session;
  return {...session,status:'running',deadline:now+session.seconds*1000,updatedAt:now};
}
export function pauseCooking(session: CookingSession, now = Date.now()): CookingSession {
  const current = reconcile(session,now);
  return current.status==='running' ? {...current,status:'paused',seconds:remaining(current,now),deadline:null,updatedAt:now} : current;
}
export function extendCooking(session: CookingSession, now = Date.now()): CookingSession {
  const current=reconcile(session,now);
  if (current.duration >= 10800) return current;
  return {...current,status:current.status==='check'?'paused':current.status,seconds:remaining(current,now)+60,duration:current.duration+60,deadline:current.status==='running' ? current.deadline!+60000 : null,updatedAt:now};
}
export function nextCookingPhase(session: CookingSession, now = Date.now()): CookingSession {
  if (session.status!=='check' || session.phase >= session.plan.phases.length-1) return session;
  const phase=session.phase+1,duration=session.plan.phases[phase].minutes[0]*60;
  return {...session,phase,status:'ready',duration,seconds:duration,deadline:null,reminderIndex:0,reminderPending:false,updatedAt:now};
}
export function parseCooking(raw: string | null, now = Date.now()): CookingSession | null {
  try {
    const s=JSON.parse(raw||'null'),p=s?.plan;
    if(s?.version!==1 || !p || !['c','f'].includes(p.unit) || !/^[a-z0-9-]{1,64}$/.test(p.slug) || !/^[a-z0-9-]{1,64}$/.test(p.condition))return null;
    if(typeof p.path!=='string'||!/^\/(?:zh\/)?(?:china\/)?foods\/[a-z0-9-]{1,64}$/.test(p.path.split('?')[0])||p.path.length>180)return null;
    for(const lang of ['en','zh']) {
      const text=p.copy?.[lang];if(!text)return null;
      for(const key of ['name','label','portion','preparation','preheat','turn','completion','withoutThermometer'])if(typeof text[key]!=='string'||text[key].length>2500)return null;
      if(!Array.isArray(text.steps)||text.steps.length>12||text.steps.some((v:unknown)=>typeof v!=='string'||v.length>2500))return null;
    }
    if(!Array.isArray(p.phases)||p.phases.length<1||p.phases.length>4||p.phases.some((phase:Phase)=>!Number.isFinite(phase.temperature)||phase.temperature<(p.unit==='c'?80:200)||phase.temperature>(p.unit==='c'?200:400)||!Array.isArray(phase.minutes)||phase.minutes.length!==2||phase.minutes.some(n=>!Number.isFinite(n)||n<=0||n>180)||phase.minutes[0]>phase.minutes[1]))return null;
    if(!Number.isInteger(s.phase)||s.phase<0||s.phase>=p.phases.length||!['ready','running','paused','check'].includes(s.status))return null;
    if(!Number.isInteger(s.duration)||s.duration<=0||s.duration>10800||!Number.isFinite(s.seconds)||s.seconds<0||s.seconds>s.duration)return null;
    if(typeof s.updatedAt!=='number'||s.updatedAt>now+5000||now-s.updatedAt>86400000||typeof s.sound!=='boolean'||!Number.isInteger(s.reminderIndex)||s.reminderIndex<0||s.reminderIndex>p.reminderSeconds?.length||typeof s.reminderPending!=='boolean')return null;
    if(!Array.isArray(p.reminderSeconds)||p.reminderSeconds.length>360||p.reminderSeconds.some((n:number,i:number)=>!Number.isInteger(n)||n<=0||n>10800||(i>0&&n<=p.reminderSeconds[i-1])))return null;
    if(s.status==='running'&&(!Number.isFinite(s.deadline)||s.deadline>now+10800000))return null;
    return reconcile(s,now) as CookingSession;
  }catch{return null;}
}
