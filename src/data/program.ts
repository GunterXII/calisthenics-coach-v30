import type {Workout,ExerciseTarget,Strategy,BlockType} from '../core/types';
import {getCurrentWeek as getCycleWeek} from '../core/cycle';

const t=(id:string,exercise:string,variant:string,sets:number,reps:number,minReps:number,maxReps:number,rir:number,rest:number,extra:Partial<ExerciseTarget>={}) : ExerciseTarget => ({id,exercise,variant,sets,reps,minReps,maxReps,rir,rest,strategy:'REPS_THEN_VOLUME',source:'PROGRAM',progressionKey:id.replace(/^w\d+-/,''),...extra});
const straight=(id:string,e:string,v:string,sets:number,reps:number,min:number,max:number,rir:number,rest:number,strategy:Strategy='REPS_THEN_VOLUME')=>t(id,e,v,sets,reps,min,max,rir,rest,{strategy});
const emom=(id:string,e:string,v:string,minutes:number,reps:number,rir:number,strategy:Strategy='REPS_THEN_DURATION')=>t(id,e,v,minutes,reps,reps,reps,rir,60,{type:'EMOM',duration:minutes,strategy});
const bar=(id:string,name:string,rounds:number,rest:number,sequence:string[],strategy:Strategy='ROUNDS_THEN_REST')=>t(id,'Bar Set',name,rounds,1,1,1,2,rest,{type:'BAR_SET',rounds,sequence,strategy});
const circuit=(id:string,name:string,rounds:number,rest:number,sequence:string[],strategy:Strategy='PERFORMANCE_THEN_DENSITY')=>t(id,'Endurance Circuit',name,rounds,1,1,1,2,rest,{type:'CIRCUIT',rounds,sequence,strategy});
const density=(id:string,name:string,duration:number,sequence:string[],strategy:Strategy='REPS_THEN_DURATION')=>t(id,'Upper Density',name,1,1,1,1,2,0,{type:'DENSITY',duration,sequence,strategy});
const test=(id:string,name:string,sequence:string[])=>t(id,'Week 9 Testing',name,1,1,1,1,0,0,{type:'TEST',sequence,strategy:'PERFORMANCE_THEN_DENSITY'});

/**
 * Weekly structure: 5 training days + 2 complete rest days.
 * Monday Pull · Tuesday Push · Wednesday REST · Thursday Upper · Friday Endurance Volume · Saturday Bar/Circuit · Sunday REST.
 */
function week(w:number,block:string,duration:number,pull:ExerciseTarget[],push:ExerciseTarget[],upper:ExerciseTarget[],friday:ExerciseTarget[],saturday:ExerciseTarget[]):Workout[]{
  return [
    {id:`w${w}-mon`,name:'Pull Endurance',day:'Monday',block,week:w,duration,targets:pull},
    {id:`w${w}-tue`,name:'Push Endurance',day:'Tuesday',block,week:w,duration,targets:push},
    {id:`w${w}-thu`,name:upper[0]?.type==='DENSITY'?'Upper Density':'Upper Volume / Density',day:'Thursday',block,week:w,duration,targets:upper},
    {id:`w${w}-fri`,name:'Endurance Circuit',day:'Friday',block,week:w,duration:30,targets:friday},
    {id:`w${w}-sat`,name:saturday[0]?.type==='BAR_SET'?'Bar Set':'Circuit',day:'Saturday',block,week:w,duration,targets:saturday,type:saturday[0]?.type},
  ];
}

// Friday is deliberately submaximal: it adds weekly endurance volume without stealing performance from Saturday's Bar Set/Circuit.
const blocks={
 A:'Base + Hypertrophy Endurance',
 B:'Endurance',
 D:'Deload + Testing',
 C:'Bar Set / Circuit Specialization',
 P:'Performance + Consolidation'
};

export const workouts:Workout[]=[];

// BLOCK A — WEEKS 1–4
for(let w=1;w<=4;w++){
  const pull=[
    straight(`w${w}-pu`,'Pull-up','Strict Pull-up',4,8,8,12,w>=3?1:2,165),
    straight(`w${w}-ch`,'Chin-up','Strict Chin-up',3,8,8,12,2,120),
    straight(`w${w}-au`,'Australian Pull-up','Australian',3,12,12,20,2,90),
    emom(`w${w}-pem`,'Pull-up EMOM','Strict Pull-up',8,5,2)
  ];
  const push=[
    straight(`w${w}-di`,'Dips','Parallel Bar Dip',4,10,10,16,w>=3?1:2,165),
    straight(`w${w}-ps`,'Push-up','Standard Push-up',4,15,15,22,2,120),
    straight(`w${w}-dp`,'Diamond Push-up','Diamond',3,10,10,15,2,90),
    emom(`w${w}-dem`,'Dips EMOM','Parallel Bar Dip',8,8,2)
  ];
  const upper=[
    straight(`w${w}-p4`,'Pull-up','Strict Pull-up',3,8,8,12,2,120),
    straight(`w${w}-d4`,'Dips','Parallel Bar Dip',3,12,12,16,2,120),
    straight(`w${w}-p5`,'Push-up','Standard Push-up',3,15,15,20,2,120),
    straight(`w${w}-a4`,'Australian Pull-up','Australian',3,15,15,20,2,90),
    straight(`w${w}-pk`,'Pike Push-up','Pike',3,8,8,12,2,90)
  ];
  // Friday is the longer endurance circuit; Saturday is the shorter, more competition-specific Bar Set.
  const fridayRounds=w<3?3:4; const fridayRest=w===1?150:w===2?135:w===3?135:120;
  const friday=[bar(`w${w}-fri-circuit`,'3 MU + 8 PU + 15 Dips + 20 Push-ups + 10 Knee Raises',fridayRounds,fridayRest,['3 Muscle-up','8 Pull-up','15 Dips','20 Push-up','10 Knee Raises'],'PERFORMANCE_THEN_DENSITY')];
  const saturdayRounds=w<3?3:4; const saturdayRest=w===1?150:w===2?135:w===3?135:120;
  const saturday=[bar(`w${w}-bar`,'2 MU + 6 PU + 10 Dips + 15 Push-ups',saturdayRounds,saturdayRest,['2 Muscle-up','6 Pull-up','10 Dips','15 Push-up'])];
  workouts.push(...week(w,blocks.A,45,pull,push,upper,friday,saturday));
}

// BLOCK B — WEEKS 5–8
for(let w=5;w<=8;w++){
  const emDuration=w===5?10:w===6?11:w===7?12:12; const emReps=w<=7?6:7;
  const dipDuration=w===5?10:w===6?11:w===7?12:12; const dipReps=10;
  const pull=[
    emom(`w${w}-pem`,'Pull-up EMOM','Strict Pull-up',emDuration,emReps,2),
    straight(`w${w}-ch`,'Chin-up','Strict Chin-up',3,9,8,12,2,120),
    straight(`w${w}-au`,'Australian Pull-up','Australian',3,15,15,20,2,90)
  ];
  const push=[
    emom(`w${w}-dem`,'Dips EMOM','Parallel Bar Dip',dipDuration,dipReps,2),
    straight(`w${w}-ps`,'Push-up','Standard Push-up',3,18,15,25,2,120),
    straight(`w${w}-dp`,'Diamond Push-up','Diamond',3,12,10,15,2,90)
  ];
  const upper=[density(`w${w}-dens`,'5 Pull-ups + 10 Push-ups + 8 Dips',15,['5 Pull-ups','10 Push-ups','8 Dips'])];
  // Friday is a real circuit from Block B onward: one continuous sequence, tracked by rounds and recovery.
  const fridayRounds=w===5?3:4;
  const fridayRest=w===5?120:w===6?105:w===7?90:75;
  const friday=[circuit(`w${w}-fri-circuit`,'8 Pull-up + 12 Dips + 20 Push-up + 15 Australian',fridayRounds,fridayRest,['8 Pull-up','12 Dips','20 Push-up','15 Australian Pull-up'])];
  const saturday=[bar(`w${w}-bar`,'2 MU + 6 PU + 10 Dips + 15 Push-ups',4,120,['2 Muscle-up','6 Pull-up','10 Dips','15 Push-up'])];
  workouts.push(...week(w,blocks.B,40,pull,push,upper,friday,saturday));
}

// BLOCK D — WEEK 9 DELOAD + TESTING
// Deload early in the week; Thursday is a true recovery day; max tests and EMOM benchmarks are separated.
{
  const pull=[
    straight('w9-pu','Pull-up','Strict Pull-up',2,8,8,12,4,180),
    straight('w9-ch','Chin-up','Strict Chin-up',2,8,8,12,4,150),
    straight('w9-au','Australian Pull-up','Australian',2,12,12,20,4,120)
  ];
  const push=[
    straight('w9-di','Dips','Parallel Bar Dip',2,10,10,16,4,180),
    straight('w9-ps','Push-up','Standard Push-up',2,15,15,22,4,150),
    straight('w9-dp','Diamond Push-up','Diamond',2,10,10,15,4,120)
  ];
  const recovery=[t('w9-recovery','Recovery','Complete rest / mobility',1,1,1,1,0,0,{type:'RECOVERY'})];
  const maxTests=[test('w9-max-tests','Max Tests',['MAX Pull-up','MAX Dips','MAX Push-up','MAX Muscle-up'])];
  const emomTests=[test('w9-emom-tests','10-min EMOM Benchmarks',['10-min Pull-up EMOM · total reps','10-min Dips EMOM · total reps','10-min Push-up EMOM · total reps'])];
  workouts.push(...week(9,blocks.D,30,pull,push,recovery,maxTests,emomTests));
}

// BLOCK C — WEEKS 10–13
for(let w=10;w<=13;w++){
  const pull=[
    straight(`w${w}-pu`,'Pull-up','Strict Pull-up',4,9,8,12,2,165),
    straight(`w${w}-ch`,'Chin-up','Strict Chin-up',3,9,8,12,2,120),
    straight(`w${w}-au`,'Australian Pull-up','Australian',3,15,15,20,2,90),
    emom(`w${w}-pem`,'Pull-up EMOM','Strict Pull-up',w===10?10:12,w>=12?7:6,2)
  ];
  const push=[
    straight(`w${w}-di`,'Dips','Parallel Bar Dip',4,12,10,16,2,165),
    straight(`w${w}-ps`,'Push-up','Standard Push-up',4,18,15,25,2,120),
    straight(`w${w}-dp`,'Diamond Push-up','Diamond',3,12,10,15,2,90)
  ];
  const barRest=w===10?120:w===11?120:w===12?105:90;
  const upper=[bar(`w${w}-bar`,`Bar Set C · 2 MU + 6 PU + 10 Dips + 15 Push-ups`,w===10?4:5,barRest,['2 Muscle-up','6 Pull-up','10 Dips','15 Push-up'])];
  // Friday becomes the longer endurance circuit; Saturday remains the shorter Bar Set competition format.
  const fridayRounds=w===10?4:w===11?4:5;
  const fridayRest=w===10?120:w===11?105:w===12?90:75;
  const friday=[circuit(`w${w}-fri-circuit`,'10 Pull-up + 15 Dips + 20 Push-up + 15 Australian',fridayRounds,fridayRest,['10 Pull-up','15 Dips','20 Push-up','15 Australian Pull-up'])];
  const circuit=bar(`w${w}-circuit`,'Circuit 01 · 10 PU + 15 Dips + 20 Push-ups + 15 Australian',4,120,['10 Pull-up','15 Dips','20 Push-up','15 Australian Pull-up'],'PERFORMANCE_THEN_DENSITY');
  workouts.push(...week(w,blocks.C,45,pull,push,upper,friday,[circuit]));
}

// BLOCK P — WEEKS 14–16
for(let w=14;w<=16;w++){
  if(w<16){
    const pull=[
      straight(`w${w}-pu`,'Pull-up','Strict Pull-up',4,10,8,12,1,150),
      straight(`w${w}-ch`,'Chin-up','Strict Chin-up',3,10,8,12,1,120),
      straight(`w${w}-au`,'Australian Pull-up','Australian',3,18,15,20,1,90),
      emom(`w${w}-pem`,'Pull-up EMOM','Strict Pull-up',12,7,1,'PERFORMANCE_THEN_DENSITY')
    ];
    const push=[
      straight(`w${w}-di`,'Dips','Parallel Bar Dip',4,14,10,16,1,150),
      straight(`w${w}-ps`,'Push-up','Standard Push-up',4,20,15,25,1,120),
      straight(`w${w}-dp`,'Diamond Push-up','Diamond',3,14,10,15,1,90),
      emom(`w${w}-psem`,'Push-up EMOM','Standard Push-up',10,12,1,'PERFORMANCE_THEN_DENSITY')
    ];
    const densityBlock=density(`w${w}-density`,'20-min Density · Pull-up → Dips → Push-up',20,['Pull-up','Dips','Push-up'],'PERFORMANCE_THEN_DENSITY');
    const fridayRounds=w===14?4:3;
    const fridayRest=w===14?90:105;
    const friday=[circuit(`w${w}-fri-circuit`,'8 Pull-up + 12 Dips + 20 Push-up + 15 Australian',fridayRounds,fridayRest,['8 Pull-up','12 Dips','20 Push-up','15 Australian Pull-up'])];
    const finalRest=w===14?120:105;
    const finalBar=bar(`w${w}-final`,'Final Bar Set · 2 MU + 6 PU + 10 Dips + 15 Push-ups',5,finalRest,['2 Muscle-up','6 Pull-up','10 Dips','15 Push-up'],'PERFORMANCE_THEN_DENSITY');
    workouts.push(...week(w,blocks.P,50,pull,push,[densityBlock],friday,[finalBar]));
  }else{
    // W16 is a taper: reduce fatigue, keep movement quality, and finish with a controlled rehearsal.
    const pull=[
      straight('w16-pu','Pull-up','Strict Pull-up',2,8,8,12,3,180),
      straight('w16-ch','Chin-up','Strict Chin-up',2,8,8,12,3,150),
      straight('w16-au','Australian Pull-up','Australian',2,12,12,20,3,120)
    ];
    const push=[
      straight('w16-di','Dips','Parallel Bar Dip',2,10,10,16,3,180),
      straight('w16-ps','Push-up','Standard Push-up',2,15,15,25,3,150),
      straight('w16-dp','Diamond Push-up','Diamond',2,10,10,15,3,120)
    ];
    const recovery=[t('w16-recovery','Recovery','Complete rest / mobility',1,1,1,1,0,0,{type:'RECOVERY'})];
    const primer=[circuit('w16-primer','6 Pull-up + 8 Dips + 12 Push-up + 10 Australian',2,150,['6 Pull-up','8 Dips','12 Push-up','10 Australian Pull-up'],'PERFORMANCE_THEN_DENSITY')];
    const rehearsal=[bar('w16-rehearsal','Competition Rehearsal · 2 MU + 6 PU + 10 Dips + 15 Push-ups',2,180,['2 Muscle-up','6 Pull-up','10 Dips','15 Push-up'],'PERFORMANCE_THEN_DENSITY')];
    workouts.push(...week(16,blocks.P,35,pull,push,recovery,primer,[rehearsal]));
  }
}

export const TOTAL_WEEKS=16;
export function getCurrentWeek(){const raw=Number(localStorage.getItem('cc_program_week')||'1');return Math.min(TOTAL_WEEKS,Math.max(1,Number.isFinite(raw)?raw:1));}
export function getWorkoutForToday(currentWeekOverride?:number):Workout|null{
  const day=new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(new Date());
  const current=currentWeekOverride??getCurrentWeek();
  return workouts.find(w=>w.week===current&&w.day===day)||null;
}

// OPTIONAL ASSISTED ENDURANCE LAB — not part of the 16-week schedule.
// Loop bands are used to extend high-rep specific endurance while bodyweight work
// remains the primary performance reference.
const assisted=(id:string,exercise:string,variant:string,reps:number,minReps:number,maxReps:number,progressionKey:string):ExerciseTarget=>t(id,exercise,variant,3,reps,minReps,maxReps,3,120,{type:'ASSISTED_ENDURANCE',strategy:'ASSISTANCE_THEN_REPS',progressionKey,assistanceLevel:'MEDIUM',assistanceRank:3,maxSets:4});
export const assistedEnduranceTemplates:Workout[]=[
  {id:'lab-assisted-pull',name:'Assisted Pull-up Endurance',day:'Lab',block:'Assisted Endurance',week:0,duration:25,targets:[assisted('lab-assisted-pull-target','Pull-up','Loop Band · Medium',20,15,30,'ASSISTED_PULL')]},
  {id:'lab-assisted-dips',name:'Assisted Dips Endurance',day:'Lab',block:'Assisted Endurance',week:0,duration:25,targets:[assisted('lab-assisted-dips-target','Dips','Loop Band · Medium',30,20,45,'ASSISTED_DIPS')]}
];

export const ASSISTANCE_LEVELS=['HEAVY','MEDIUM','LIGHT','MINIMAL'] as const;
export type AssistanceLevel=typeof ASSISTANCE_LEVELS[number];
export function assistanceLabel(level:AssistanceLevel){return ({HEAVY:'Heavy',MEDIUM:'Medium',LIGHT:'Light',MINIMAL:'Minimal'})[level];}
export function withAssistance(workout:Workout,level:AssistanceLevel):Workout{
  return structuredClone({...workout,targets:workout.targets.map(t=>({...t,assistanceLevel:level,assistanceRank:ASSISTANCE_LEVELS.indexOf(level)+1,variant:`Loop Band · ${assistanceLabel(level)}`}))});
}
