import assert from 'node:assert/strict';
import {decide,inspectProgression} from '../src/core/progression';
import type {ExerciseTarget,Performance} from '../src/core/types';

const target=(overrides:Partial<ExerciseTarget>={}):ExerciseTarget=>({
  id:'pull',exercise:'Pull-up',variant:'Pull-up',sets:3,reps:10,minReps:8,maxReps:12,rir:2,rest:180,
  strategy:'REPS_THEN_VOLUME',source:'PROGRAM',...overrides,
});
const p=(date:string,actual:number,opts:Partial<Performance>={}):Performance=>({
  date,targetReps:10,actualReps:actual,rir:2,technique:'GOOD',completed:true,exercise:'Pull-up',setNumber:1,targetId:'pull',rest:180,...opts,
});

// 1. No data -> hold.
assert.equal(decide(target(),[]).action,'MAINTAIN');

// 2. One great session is not enough to progress.
assert.equal(decide(target(),[p('2026-09-01',10)]).action,'MAINTAIN');

// 3. Two consecutive strong exposures -> +1 rep.
const two=[p('2026-09-01',10),p('2026-09-04',10)];
assert.equal(decide(target(),two).action,'INCREASE_REPS');
assert.equal(decide(target(),two).next,11);

// 4. A single bad session does not regress.
const oneBad=[p('2026-09-01',10),p('2026-09-04',7,{rir:0,technique:'POOR'})];
assert.equal(decide(target({regressionVariant:'Assisted Pull-up'}),oneBad).action,'MAINTAIN');

// 5. Repeated bad trend can regress.
const repeatedBad=[p('2026-09-01',7,{rir:0,technique:'POOR'}),p('2026-09-04',10),p('2026-09-07',7,{rir:0,technique:'POOR'})];
assert.equal(decide(target({regressionVariant:'Assisted Pull-up'}),repeatedBad).action,'REGRESS_VARIANT');

// 6. Never increase two levers in one decision.
const maxed=target({reps:12,maxReps:12,sets:3,maxSets:5});
const d=decide(maxed,two);
assert.equal(d.action,'INCREASE_SETS');
assert.equal(d.nextSets,4);
assert.equal(d.nextRest,undefined);
assert.equal(d.nextDuration,undefined);

// 7. Performance is grouped by workout exposure, not individual sets.
const grouped=[
  p('2026-09-01T10:00:00',10,{setNumber:1}),
  p('2026-09-01T10:03:00',10,{setNumber:2}),
  p('2026-09-01T10:06:00',10,{setNumber:3}),
];
const info=inspectProgression(target(),grouped);
assert.equal(info.exposures.length,1);
