import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeAnalyticsParams,analyticsEvents} from '../src/lib/analytics-contract.ts';
import {createCooking,remaining,reconcile,startCooking,pauseCooking,extendCooking,nextCookingPhase,parseCooking,sourceReminders,type CookingPlan} from '../src/lib/cooking.ts';
const copy={name:'Ciba',label:'Frozen unfilled sticks',portion:'One layer',preparation:'Prepare first',preheat:'180°C',turn:'Turn between stages',completion:'Check the center',withoutThermometer:'Check texture',steps:['Prepare the basket.','Follow the stages.']};
const plan:CookingPlan={slug:'cn-brown-sugar-ciba',condition:'default',path:'/china/foods/cn-brown-sugar-ciba',unit:'c',copy:{en:copy,zh:copy},phases:[{temperature:180,minutes:[8,8]},{temperature:200,minutes:[6,6]}],reminderSeconds:[]};
const now=1800000000000;
test('check timers use the first sourced check, survive time jumps, and never advance a temperature automatically',()=>{
  const ready=createCooking(plan,now),running=startCooking(ready,now);
  assert.equal(remaining(running,now+120000),360);
  const check=reconcile(running,now+500000);assert.equal(check.status,'check');assert.equal(check.phase,0);assert.equal(check.plan.phases[0].temperature,180);
  assert.equal(startCooking(check,now+500000).status,'check');
  const next=nextCookingPhase(check,now+500000);assert.equal(next.status,'ready');assert.equal(next.phase,1);assert.equal(next.seconds,360);assert.equal(next.plan.phases[1].temperature,200);
  assert.equal(nextCookingPhase(running,now).phase,0);
});
test('pausing retains exact remaining time and adding a minute does not reset elapsed time or change native units',()=>{
  const running=startCooking(createCooking(plan,now),now),paused=pauseCooking(running,now+90000);
  assert.equal(remaining(paused,now+900000),390);
  const extra=extendCooking(paused,now+900000);assert.equal(extra.seconds,450);assert.equal(extra.plan.unit,'c');
  const resumed=startCooking(extra,now+900000);assert.equal(remaining(resumed,now+930000),420);
  const extended=extendCooking(resumed,now+930000);assert.equal(remaining(extended,now+930000),480);assert.equal(extended.duration-remaining(extended,now+930000),120);
});
test('expired snapshots restore a check state; corrupt, foreign and unsupported native settings are rejected',()=>{
  const s=startCooking(createCooking(plan,now),now);
  assert.equal(parseCooking(JSON.stringify(s),now+600000)?.status,'check');
  for(const bad of [null,{...s,plan:{...plan,path:'https://evil.test'}},{...s,phase:8},{...s,deadline:Infinity},{...s,plan:{...plan,phases:[{temperature:205,minutes:[8,8]}]}},{...s,plan:{...plan,copy:{en:{...copy,name:'x'.repeat(3000)},zh:copy}}}])assert.equal(parseCooking(JSON.stringify(bad),now),null);
  assert.equal(parseCooking(JSON.stringify(s),now+86400001),null);
});
test('reminders retain multiple, periodic and approximate source times without inventing unknown actions',()=>{
  assert.deepEqual(sourceReminders('Shake halfway through.',1200),[600]);
  assert.deepEqual(sourceReminders('Turn at minute 8. Check from minute 15.',900),[480,900]);
  assert.deepEqual(sourceReminders('10分钟后翻面。',1200),[600]);
  assert.deepEqual(sourceReminders('Shake after 5 and 10 minutes.',900),[300,600]);
  assert.deepEqual(sourceReminders('Turn at about 10 minutes.',1200),[600]);
  assert.deepEqual(sourceReminders('第5、10分钟翻面。',900),[300,600]);
  assert.deepEqual(sourceReminders('Shake every 4 minutes.',900).slice(0,4),[240,480,720,960]);
  assert.deepEqual(sourceReminders('Turn every 5 minutes.',900).slice(0,3),[300,600,900]);
  assert.deepEqual(sourceReminders('Turn after 3–5 minutes; cook another 2–5 minutes.',600),[180]);
  assert.deepEqual(sourceReminders('Shake about 5, 10 and 15 minutes after starting.',1380),[300,600,900]);
  assert.deepEqual(sourceReminders('Check browning at 20 minutes. Do not flip.',2700),[1200]);
  assert.deepEqual(sourceReminders('Turn at 180°C.',1200),[]);
  for(const text of ['No need to flip halfway.','Turn occasionally.'])assert.deepEqual(sourceReminders(text,1200),[]);
  assert.deepEqual(sourceReminders('Shake halfway.',1200,true),[]);
});

test('cooking analytics allow interactions without carrying a saved collection or timer snapshot',()=>{
  assert.ok(analyticsEvents.includes('cooking_cancel'));assert.ok(analyticsEvents.includes('cooking_resume'));
  assert.deepEqual(sanitizeAnalyticsParams({food_slug:'cn-orleans-wings',filter:'saved',snapshot:'private-plan',note:'private@example.com',timer_name:'private-title'}),{food_slug:'cn-orleans-wings',filter:'saved'});
});
