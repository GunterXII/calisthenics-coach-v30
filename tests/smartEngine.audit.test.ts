import assert from 'node:assert/strict';
import {decide,inspectProgression} from '../src/core/progression';
import {workouts} from '../src/data/program';
import type {ExerciseTarget,Performance} from '../src/core/types';

const target=(overrides:Partial<ExerciseTarget>={}):ExerciseTarget=>({
  id:'t',exercise:'Pull-up',variant:'Strict Pull-up',sets:3,reps:10,minReps:8,maxReps:12,rir:2,rest:180,
  strategy:'REPS_THEN_VOLUME',source:'PROGRAM',...overrides,
});
const p=(date:string,actual:number,opts:Partial<Performance>={}):Performance=>{
  const targetReps=opts.targetReps??10;
  return {date,targetReps,actualReps:actual,rir:2,technique:'GOOD',completed:actual>=Math.ceil(targetReps*.9),exercise:'Pull-up',setNumber:1,targetId:'t',rest:180,...opts};
};

// 1. Empty history is safe.
assert.equal(decide(target(),[]).action,'MAINTAIN');
// 2. One strong exposure is never enough.
assert.equal(decide(target(),[p('2026-09-01',10)]).action,'MAINTAIN');
// 3. Two consecutive strong exposures increase reps only.
assert.equal(decide(target(),[p('2026-09-01',10),p('2026-09-04',10)]).action,'INCREASE_REPS');
// 4. RIR 1 consolidates rather than progresses.
assert.equal(decide(target(),[p('2026-09-01',10,{rir:1}),p('2026-09-04',10,{rir:1})]).action,'MAINTAIN');
// 5. Poor technique blocks progression.
assert.equal(decide(target(),[p('2026-09-01',10,{technique:'POOR'}),p('2026-09-04',10,{technique:'POOR'})]).action,'MAINTAIN');
// 6. One bad session never regresses.
assert.equal(decide(target({regressionVariant:'Assisted Pull-up'}),[p('2026-09-01',10),p('2026-09-04',7,{rir:0,technique:'POOR'})]).action,'MAINTAIN');
// 7. Two bad of the last three, with the last bad, may regress.
assert.equal(decide(target({regressionVariant:'Assisted Pull-up'}),[
  p('2026-09-01',7,{rir:0,technique:'POOR'}),p('2026-09-04',10),p('2026-09-07',7,{rir:0,technique:'POOR'})
]).action,'REGRESS_VARIANT');
// 8. At max reps, REPS_THEN_VOLUME changes sets only.
const maxed=target({reps:12,maxReps:12,sets:3,maxSets:5});
const d8=decide(maxed,[p('2026-09-01',12),p('2026-09-04',12)]);
assert.equal(d8.action,'INCREASE_SETS'); assert.equal(d8.nextSets,4); assert.equal(d8.nextRest,undefined); assert.equal(d8.nextDuration,undefined);
// 9. EMOM changes duration before anything else.
const em=target({type:'EMOM',duration:10,reps:6,minReps:6,maxReps:6,strategy:'REPS_THEN_DURATION'});
const d9=decide(em,[p('2026-09-01',6,{targetReps:6,blockType:'EMOM'}),p('2026-09-04',6,{targetReps:6,blockType:'EMOM'})]);
assert.equal(d9.action,'INCREASE_DURATION'); assert.equal(d9.nextDuration,11);
// 10. Bar set increases rounds before reducing rest.
const bar=target({type:'BAR_SET',rounds:4,maxRounds:6,rest:120,minRest:60,reps:1,minReps:1,maxReps:1,strategy:'ROUNDS_THEN_REST'});
const d10=decide(bar,[p('2026-09-01',1,{targetReps:1,blockType:'BAR_SET'}),p('2026-09-04',1,{targetReps:1,blockType:'BAR_SET'})]);
assert.equal(d10.action,'INCREASE_DENSITY'); assert.equal(d10.nextRounds,5); assert.equal(d10.nextRest,undefined);
// 11. Once max rounds are consolidated, bar set reduces rest.
const barMax={...bar,rounds:6};
const d11=decide(barMax,[p('2026-09-01',1,{targetReps:1,blockType:'BAR_SET'}),p('2026-09-04',1,{targetReps:1,blockType:'BAR_SET'})]);
assert.equal(d11.action,'REDUCE_REST'); assert.equal(d11.nextRest,105);
// 12. Variant progression is only proposed after numeric target is consolidated.
const variant=target({reps:12,maxReps:12,sets:5,maxSets:5,progressionVariant:'Archer Pull-up'});
assert.equal(decide(variant,[p('2026-09-01',12),p('2026-09-04',12)]).action,'PROGRESS_VARIANT');
// 13. Four exposures are the history window.
const xs=[1,2,3,4,5].map((n)=>p(`2026-09-${String(n).padStart(2,'0')}`,10));
assert.equal(inspectProgression(target(),xs).exposures.length,4);
// 14. Partial set completion below 90% is not a strong exposure.
const incomplete=[p('2026-09-01',10,{setNumber:1}),p('2026-09-01T10:03:00',10,{setNumber:2}),p('2026-09-01T10:06:00',7,{setNumber:3,completed:false})];
assert.equal(inspectProgression(target(),incomplete).exposures[0].strong,false);
// 15. Program Block B obeys one-variable-at-a-time EMOM progression.
const pullEmom=workouts.filter(w=>w.week>=5&&w.week<=8).map(w=>({week:w.week,t:w.targets.find(t=>t.id.endsWith('-pem'))})).filter(x=>x.t).map(x=>({week:x.week,duration:x.t.duration,reps:x.t.reps}));
for(let i=1;i<pullEmom.length;i++){
  const prev=pullEmom[i-1],cur=pullEmom[i];
  assert.ok((cur.duration===prev.duration)||(cur.reps===prev.reps),`Block B week ${cur.week} changes both EMOM levers`);
}
// 16. Dips Block B follows the same rule.
const dipEmom=workouts.filter(w=>w.week>=5&&w.week<=8).map(w=>({week:w.week,t:w.targets.find(t=>t.id.endsWith('-dem'))})).filter(x=>x.t);
for(let i=1;i<dipEmom.length;i++) assert.ok(dipEmom[i].t.duration===dipEmom[i-1].t.duration || dipEmom[i].t.reps===dipEmom[i-1].t.reps);
// 17. Friday is genuinely moderate across all training blocks.
for(const w of workouts.filter(w=>w.day==='Friday' && w.week!==9)){
  assert.ok(w.targets.every(t=>t.rir>=3),`Friday week ${w.week} must stay at RIR >= 3`);
  assert.ok(w.targets.every(t=>t.rest>=90),`Friday week ${w.week} must keep >=90s rest`);
  assert.deepEqual(w.targets.map(t=>t.reps),[8,10,15,12],`Friday week ${w.week} volume profile changed unexpectedly`);
}
// 18. Week 9 separates max tests from EMOM benchmarks and keeps Thursday as recovery.
const w9=workouts.filter(w=>w.week===9);
assert.deepEqual(w9.map(w=>w.day),['Monday','Tuesday','Thursday','Friday','Saturday']);
assert.equal(w9.find(w=>w.day==='Thursday')?.targets[0]?.type,'RECOVERY');
assert.equal(w9.find(w=>w.day==='Friday')?.targets[0]?.type,'TEST');
assert.equal(w9.find(w=>w.day==='Saturday')?.targets[0]?.type,'TEST');
assert.equal(w9.find(w=>w.day==='Friday')?.targets[0]?.sequence?.length,4);
assert.equal(w9.find(w=>w.day==='Saturday')?.targets[0]?.sequence?.length,3);

console.log('SMART ENGINE AUDIT: 18/18 scenarios passed');

// 19. Straight-set progression ignores EMOM exposures for the same exercise.
const isolatedTarget=target({progressionKey:'pu'});
const mixed=[
  p('2026-09-01',10,{progressionKey:'pu',blockType:'STRAIGHT_SET',sessionId:'s1'}),
  p('2026-09-02',12,{progressionKey:'pem',blockType:'EMOM',sessionId:'s2'}),
  p('2026-09-04',10,{progressionKey:'pu',blockType:'STRAIGHT_SET',sessionId:'s3'})
];
assert.equal(decide(isolatedTarget,mixed).action,'INCREASE_REPS');
// 20. Same exercise + same block type but a different progression role is isolated.
const roleMixed=[
  p('2026-09-01',10,{progressionKey:'fr-pu',blockType:'STRAIGHT_SET',sessionId:'s1'}),
  p('2026-09-02',10,{progressionKey:'pu',blockType:'STRAIGHT_SET',sessionId:'s2'}),
  p('2026-09-04',10,{progressionKey:'pu',blockType:'STRAIGHT_SET',sessionId:'s3'})
];
assert.equal(inspectProgression({...isolatedTarget,progressionKey:'pu'},roleMixed).exposures.length,2);
// 21. Two same-day sessions remain separate exposures when sessionId is available.
const sameDay=[
  p('2026-09-10T09:00:00',10,{sessionId:'morning',progressionKey:'pu'}),
  p('2026-09-10T18:00:00',10,{sessionId:'evening',progressionKey:'pu'})
];
assert.equal(inspectProgression({...isolatedTarget,progressionKey:'pu'},sameDay).exposures.length,2);
// 22. Every generated target carries a stable progression role across weeks.
const week1Pu=workouts.find(w=>w.id==='w1-mon')?.targets.find(t=>t.id==='w1-pu');
const week4Pu=workouts.find(w=>w.id==='w4-mon')?.targets.find(t=>t.id==='w4-pu');
assert.equal(week1Pu?.progressionKey,week4Pu?.progressionKey);

console.log('SMART ENGINE HARDENING: 4/4 additional scenarios passed');

// 23. Assisted endurance increases reps before reducing assistance.
const assisted:ExerciseTarget={
  id:'lab-assisted-pull-target',exercise:'Pull-up',variant:'Loop Band · Medium',sets:3,reps:20,minReps:15,maxReps:25,rir:3,rest:120,
  strategy:'ASSISTANCE_THEN_REPS',source:'PROGRAM',type:'ASSISTED_ENDURANCE',progressionKey:'ASSISTED_PULL',assistanceLevel:'MEDIUM',assistanceRank:3,maxSets:4
};
const assistedReps=decide(assisted,[
  p('2026-09-01',20,{targetId:assisted.id,targetReps:20,blockType:'ASSISTED_ENDURANCE',progressionKey:'ASSISTED_PULL',sessionId:'a1',rir:3}),
  p('2026-09-04',20,{targetId:assisted.id,targetReps:20,blockType:'ASSISTED_ENDURANCE',progressionKey:'ASSISTED_PULL',sessionId:'a2',rir:3})
]);
assert.equal(assistedReps.action,'INCREASE_REPS');
assert.equal(assistedReps.next,21);

// 24. At max reps, assisted endurance reduces assistance by one level.
const assistedMax={...assisted,reps:25,maxReps:25};
const assistedLevel=decide(assistedMax,[
  p('2026-09-01',25,{targetId:assistedMax.id,targetReps:25,blockType:'ASSISTED_ENDURANCE',progressionKey:'ASSISTED_PULL',sessionId:'a3',rir:3,assistanceLevel:'MEDIUM',assistanceRank:3}),
  p('2026-09-04',25,{targetId:assistedMax.id,targetReps:25,blockType:'ASSISTED_ENDURANCE',progressionKey:'ASSISTED_PULL',sessionId:'a4',rir:3,assistanceLevel:'MEDIUM',assistanceRank:3})
]);
assert.equal(assistedLevel.action,'REDUCE_ASSISTANCE');
assert.equal(assistedLevel.nextAssistanceLevel,'LIGHT');

// 25. Minimal assistance never produces a fake lower level.
const assistedMin={...assistedMax,assistanceLevel:'MINIMAL' as const,assistanceRank:4};
assert.equal(decide(assistedMin,[
  p('2026-09-01',25,{targetId:assistedMin.id,targetReps:25,blockType:'ASSISTED_ENDURANCE',progressionKey:'ASSISTED_PULL',sessionId:'a5',rir:3,assistanceLevel:'MINIMAL',assistanceRank:4}),
  p('2026-09-04',25,{targetId:assistedMin.id,targetReps:25,blockType:'ASSISTED_ENDURANCE',progressionKey:'ASSISTED_PULL',sessionId:'a6',rir:3,assistanceLevel:'MINIMAL',assistanceRank:4})
]).action,'MAINTAIN');

console.log('ASSISTED ENDURANCE AUDIT: 3/3 scenarios passed');
