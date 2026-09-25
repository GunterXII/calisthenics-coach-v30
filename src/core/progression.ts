import type {Action,Decision,ExerciseTarget,Performance,Strategy,Technique} from './types';

const techScore=(t:Technique)=>({POOR:0,OK:1,GOOD:2,EXCELLENT:3}[t]);
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

const base=(target:ExerciseTarget,action:Action,reason:string,confidence:Decision['confidence'],extra:Partial<Decision>={}):Decision=>({
  exercise:target.exercise,
  action,
  current:target.reps,
  next:target.reps,
  reason,
  confidence,
  date:new Date().toISOString(),
  source:'ENGINE',
  ...extra,
});

type Exposure={
  date:string;
  performances:Performance[];
  completion:number;
  repsRatio:number;
  avgRir:number;
  minTechnique:number;
  poorTechnique:boolean;
  assistanceLevel?:ExerciseTarget['assistanceLevel'];
  assistanceRank?:number;
};

/**
 * Turns set-level logs into workout-level exposures. Progression should react to
 * repeated training exposures, not to individual sets from the same workout.
 */
function targetType(target:ExerciseTarget):string{return target.type||'STRAIGHT_SET';}
const assistanceLevels=['HEAVY','MEDIUM','LIGHT','MINIMAL'] as const;
const assistanceRank=(level?:string,rank?:number)=>rank??(level?assistanceLevels.indexOf(level as any)+1:undefined);
const nextLowerAssistance=(level?:ExerciseTarget['assistanceLevel'])=>{if(!level)return undefined;const i=assistanceLevels.indexOf(level);return i>=0&&i<assistanceLevels.length-1?assistanceLevels[i+1]:undefined;};

function buildExposures(target:ExerciseTarget, performances:Performance[]):Exposure[]{
  const relevant=performances
    .filter(p=>p.exercise===target.exercise)
    .filter(p=>(p.blockType||'STRAIGHT_SET')===targetType(target))
    .filter(p=>{const key=p.progressionKey||p.targetId.replace(/^w\d+-/,'');return !target.progressionKey||key===target.progressionKey})
    .filter(p=>target.type!=='ASSISTED_ENDURANCE'||!target.assistanceLevel||p.assistanceLevel===target.assistanceLevel)
    .sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());

  const groups=new Map<string,Performance[]>();
  for(const p of relevant){
    // Session identity keeps two same-day workouts separate. progressionKey/type keep
    // different workout roles (e.g. main straight sets vs EMOM) from contaminating each other.
    const progressionKey=p.progressionKey||p.targetId.replace(/^w\d+-/,'');
    const key=`${p.sessionId||p.targetId||target.id}|${p.date.slice(0,10)}|${p.blockType||'STRAIGHT_SET'}|${progressionKey}`;
    const list=groups.get(key)||[];
    list.push(p);
    groups.set(key,list);
  }

  return [...groups.values()].map(rows=>{
    const completed=rows.filter(r=>r.completed);
    const completion=rows.length?completed.length/rows.length:0;
    const repsRatio=completed.length
      ? completed.reduce((s,r)=>s+r.actualReps/Math.max(1,r.targetReps),0)/completed.length
      : 0;
    const avgRir=completed.length
      ? completed.reduce((s,r)=>s+r.rir,0)/completed.length
      : 0;
    const minTechnique=completed.length
      ? Math.min(...completed.map(r=>techScore(r.technique)))
      : 0;
    return {
      date:rows[0].date,
      performances:rows,
      completion,
      repsRatio,
      avgRir,
      minTechnique,
      poorTechnique:minTechnique<2,
      assistanceLevel:rows[rows.length-1].assistanceLevel,
      assistanceRank:assistanceRank(rows[rows.length-1].assistanceLevel,rows[rows.length-1].assistanceRank),
    };
  }).slice(-4);
}

function confidenceFor(count:number):Decision['confidence']{
  return count>=3?'HIGH':count>=2?'MEDIUM':'LOW';
}

function badExposure(e:Exposure){
  return e.completion<0.9 || e.repsRatio<0.9 || (e.avgRir<=0 && e.poorTechnique);
}

function strongExposure(e:Exposure){
  return e.completion>=1 && e.repsRatio>=1 && e.avgRir>=2 && e.minTechnique>=2;
}

function evidenceFor(recent:Exposure[],last:Exposure,consecutiveStrong:number):Decision['evidence']{
  const techniqueScore=last.minTechnique;
  const technique:Technique|'—'=techniqueScore===3?'EXCELLENT':techniqueScore===2?'GOOD':techniqueScore===1?'OK':techniqueScore===0?'POOR':'—';
  const criteria:string[]=[];
  if(last.completion>=1)criteria.push('100% completion');
  if(last.repsRatio>=1)criteria.push('target reps met');
  if(last.avgRir>=2)criteria.push('RIR ≥ 2');
  if(last.minTechnique>=2)criteria.push('technique ≥ Good');
  if(last.assistanceLevel)criteria.push(`assistance: ${String(last.assistanceLevel).toLowerCase()}`);
  if(consecutiveStrong>=2)criteria.push(`${consecutiveStrong} consecutive strong exposures`);
  return {exposures:recent.length,strongExposures:recent.filter(strongExposure).length,badExposures:recent.filter(badExposure).length,consecutiveStrong,lastCompletion:last.completion,lastRepsRatio:last.repsRatio,avgRir:recent.reduce((s,e)=>s+e.avgRir,0)/recent.length,minTechnique:technique,recentDates:recent.map(e=>e.date),criteria};
}

export function decide(target:ExerciseTarget, performances:Performance[]):Decision {
  const exposures=buildExposures(target,performances);
  if(!exposures.length){
    return base(target,'MAINTAIN','Nessuna esposizione completata disponibile. Mantengo il target programmato.', 'LOW');
  }

  const recent=exposures.slice(-4);
  const last=recent.at(-1)!;
  const confidence=confidenceFor(recent.length);
  const strongCount=recent.filter(strongExposure).length;
  const badCount=recent.filter(badExposure).length;
  const consecutiveStrong=recent.slice(-2).length===2 && recent.slice(-2).every(strongExposure);
  const consecutiveBad=recent.slice(-3).length===3 && recent.slice(-3).filter(badExposure).length>=2;
  const avgRir=recent.reduce((s,e)=>s+e.avgRir,0)/recent.length;
  const consecutiveStrongCount=recent.slice().reverse().reduce((n,e)=>n===recent.length||strongExposure(e)?n+1:n,0);
  const evidence=evidenceFor(recent,last,consecutiveStrongCount);

  // A single bad exposure never regresses the plan. We need a repeated pattern.
  if(badExposure(last)){
    if(consecutiveBad && target.regressionVariant){
      return base(target,'REGRESS_VARIANT',
        'Il calo si è ripetuto in almeno 2 delle ultime 3 esposizioni. Propongo una regressione solo ora; una singola seduta negativa non modifica il piano.',
        confidence,
        {nextVariant:target.regressionVariant,evidence});
    }
    return base(target,'MAINTAIN',
      'L’ultima esposizione è stata sotto il livello previsto. Non faccio regressioni dopo una singola seduta: mantengo il target e raccolgo un’altra esposizione.',
      confidence,{evidence});
  }

  // Do not progress from a single good workout. Two consecutive clean exposures
  // are the minimum confirmation; three or more give high confidence.
  if(consecutiveStrong && strongCount>=2 && avgRir>=2){
    if(target.reps<target.maxReps){
      return base(target,'INCREASE_REPS',
        'Il target è stato completato in almeno 2 esposizioni consecutive con RIR medio ≥2 e tecnica almeno Good. Aumento una sola ripetizione.',
        strongCount>=3?'HIGH':'MEDIUM',
        {next:clamp(target.reps+1,target.minReps,target.maxReps),evidence});
    }

    switch(target.strategy){
      case 'ASSISTANCE_THEN_REPS': {
        const nextAssistance=nextLowerAssistance(target.assistanceLevel);
        if(nextAssistance){
          return base(target,'REDUCE_ASSISTANCE',
            `Il range alto è consolidato con margine e tecnica stabile. Riduzione dell'assistenza da ${String(target.assistanceLevel||'current').toLowerCase()} a ${String(nextAssistance).toLowerCase()}, mantenendo reps, serie e recupero.`,
            strongCount>=3?'HIGH':'MEDIUM',
            {nextAssistanceLevel:nextAssistance,currentAssistanceLevel:target.assistanceLevel,evidence});
        }
        return base(target,'MAINTAIN',
          'Il livello di assistenza minimo è già raggiunto. Mantengo il target e uso le prossime esposizioni a corpo libero come riferimento di trasferimento.',
          strongCount>=3?'HIGH':'MEDIUM',{currentAssistanceLevel:target.assistanceLevel,evidence});
      }
      case 'REPS_THEN_VOLUME': {
        const maxSets=target.maxSets??5;
        if(target.sets<maxSets){
          return base(target,'INCREASE_SETS',
            'Il limite superiore del range è consolidato. Aumento una sola serie e lascio invariati reps, recupero e variante.',
            strongCount>=3?'HIGH':'MEDIUM',
            {nextSets:Math.min(maxSets,target.sets+1),evidence});
        }
        break;
      }
      case 'REPS_THEN_DURATION': {
        const current=target.duration??0;
        const step=target.type==='EMOM'?1:5;
        const max=target.maxDuration??(target.type==='EMOM'?15:20);
        if(current<max){
          return base(target,'INCREASE_DURATION',
            'Le reps sono consolidate. Aumento una sola unità di durata senza modificare contemporaneamente reps o recupero.',
            strongCount>=3?'HIGH':'MEDIUM',
            {nextDuration:Math.min(max,current+step),evidence});
        }
        break;
      }
      case 'ROUNDS_THEN_REST': {
        const maxRounds=target.maxRounds??6;
        if((target.rounds??0)<maxRounds){
          return base(target,'INCREASE_DENSITY',
            'Round e qualità sono consolidati. Aggiungo un solo round prima di intervenire sul recupero.',
            strongCount>=3?'HIGH':'MEDIUM',
            {nextRounds:Math.min(maxRounds,(target.rounds??0)+1),evidence});
        }
        const minRest=target.minRest??45;
        if(target.rest>minRest){
          return base(target,'REDUCE_REST',
            'Il numero massimo di round è consolidato. Riduzione del recupero di 15 secondi, senza cambiare altro.',
            strongCount>=3?'HIGH':'MEDIUM',
            {nextRest:Math.max(minRest,target.rest-15),evidence});
        }
        break;
      }
      case 'PERFORMANCE_THEN_DENSITY': {
        const minRest=target.minRest??45;
        if(target.type==='BAR_SET' && target.rest>minRest){
          return base(target,'REDUCE_REST',
            'La performance è consolidata. Riduzione del recupero di 15 secondi mantenendo invariati round e sequenza.',
            strongCount>=3?'HIGH':'MEDIUM',
            {nextRest:Math.max(minRest,target.rest-15),evidence});
        }
        const current=target.duration??0;
        const max=target.maxDuration??20;
        if(current<max){
          return base(target,'INCREASE_DENSITY',
            'La performance è consolidata. Aumento della finestra di lavoro senza modificare contemporaneamente altre variabili.',
            strongCount>=3?'HIGH':'MEDIUM',
            {nextDuration:Math.min(max,current+5),evidence});
        }
        break;
      }
    }

    if(target.progressionVariant){
      return base(target,'PROGRESS_VARIANT',
        'Il target numerico è consolidato e il programma prevede una variante successiva. La propongo senza modificare contemporaneamente volume o recupero.',
        strongCount>=3?'HIGH':'MEDIUM',
        {nextVariant:target.progressionVariant,evidence});
    }
  }

  return base(target,'MAINTAIN',
    `Prestazione sufficiente, ma servono esposizioni ripetute e stabili prima di aumentare il carico. ${recent.length<2?'Manca ancora una seconda esposizione di conferma.':`Esposizioni forti confermate: ${strongCount}/${recent.length}.`}`,
    confidence,{evidence});
}

/** Exposed for deterministic unit tests and future Progress UI. */
export function inspectProgression(target:ExerciseTarget, performances:Performance[]){
  const exposures=buildExposures(target,performances);
  return {
    exposures:exposures.map(e=>({date:e.date,completion:e.completion,repsRatio:e.repsRatio,avgRir:e.avgRir,minTechnique:e.minTechnique,assistanceLevel:e.assistanceLevel,assistanceRank:e.assistanceRank,bad:badExposure(e),strong:strongExposure(e)})),
    strongCount:exposures.filter(strongExposure).length,
    badCount:exposures.filter(badExposure).length,
    lastIsBad:exposures.length?badExposure(exposures.at(-1)!):false,
  };
}
