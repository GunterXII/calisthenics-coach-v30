import type {ProgramCycle} from './types';

export const PROGRAM_CYCLE_KEY='cc_program_cycle';
export const TOTAL_WEEKS=16;

export function getProgramCycle():ProgramCycle|null{
  try{
    const raw=localStorage.getItem(PROGRAM_CYCLE_KEY);
    if(!raw)return null;
    const value=JSON.parse(raw) as ProgramCycle;
    if(!value?.startedAt||value.status!=='ACTIVE')return null;
    return value;
  }catch{return null;}
}

export function startProgramCycle(startedAt=new Date().toISOString()):ProgramCycle{
  const existing=getProgramCycle();
  if(existing)return existing;
  const cycle:ProgramCycle={
    id:crypto.randomUUID(),
    programId:'calisthenics-endurance-16w',
    startedAt,
    currentWeek:1,
    currentBlock:'A',
    status:'ACTIVE',
    completedWeeks:[],
    createdAt:startedAt
  };
  localStorage.setItem(PROGRAM_CYCLE_KEY,JSON.stringify(cycle));
  return cycle;
}

export function getCurrentWeek(now=Date.now()):number{
  const cycle=getProgramCycle();
  if(!cycle)return 1;
  const started=Date.parse(cycle.startedAt);
  if(!Number.isFinite(started))return 1;
  const elapsed=Math.max(0,now-started);
  return Math.min(TOTAL_WEEKS,Math.floor(elapsed/(7*24*60*60*1000))+1);
}

export function getCurrentBlock(week=getCurrentWeek()):ProgramCycle['currentBlock']{
  if(week<=4)return 'A';
  if(week<=8)return 'B';
  if(week===9)return 'DELOAD';
  if(week<=13)return 'C';
  return 'P';
}

export function refreshProgramCycle(now=Date.now()):ProgramCycle|null{
  const cycle=getProgramCycle();
  if(!cycle)return null;
  const currentWeek=getCurrentWeek(now);
  const currentBlock=getCurrentBlock(currentWeek);
  const completedWeeks=Array.from({length:Math.max(0,currentWeek-1)},(_,i)=>i+1);
  const next={...cycle,currentWeek,currentBlock,completedWeeks};
  localStorage.setItem(PROGRAM_CYCLE_KEY,JSON.stringify(next));
  return next;
}
