import {openDB,type DBSchema} from 'idb';
import type {Session,Decision,Workout} from '../core/types';

export const BACKUP_VERSION=5;
export interface BackupData{version:number;app:'calisthenics-coach';exportedAt:string;sessions:Session[];decisions:Decision[];workouts:Workout[];local:{targetOverrides:Record<string,unknown>;programWeek:string|null;assistedLevels?:Record<string,string>;assistedOverrides?:Record<string,unknown>};}
interface DB extends DBSchema{sessions:{key:string;value:Session};decisions:{key:string;value:Decision};workouts:{key:string;value:Workout}}
const db=openDB<DB>('calisthenics-coach',3,{upgrade(d){if(!d.objectStoreNames.contains('sessions'))d.createObjectStore('sessions');if(!d.objectStoreNames.contains('decisions'))d.createObjectStore('decisions');if(!d.objectStoreNames.contains('workouts'))d.createObjectStore('workouts');}});
export async function saveSession(s:Session){await (await db).put('sessions',s,s.id)}
export async function listSessions(){return (await db).getAll('sessions')}
export async function saveDecision(d:Decision){await (await db).put('decisions',d,`${d.date}-${d.exercise}`)}
export async function listDecisions(){return (await db).getAll('decisions')}
export async function seedWorkouts(ws:Workout[]){const x=await db;const tx=x.transaction('workouts','readwrite');for(const w of ws)tx.store.put(w,w.id);await tx.done}

export async function buildBackup():Promise<BackupData>{
 const [sessions,decisions,workouts]=await Promise.all([listSessions(),listDecisions(),(await db).getAll('workouts')]);
 let targetOverrides:Record<string,unknown>={};try{const raw=localStorage.getItem('cc_target_overrides');targetOverrides=raw?JSON.parse(raw):{}}catch{}
 let assistedLevels:Record<string,string>={};try{const raw=localStorage.getItem('cc_assisted_levels');assistedLevels=raw?JSON.parse(raw):{}}catch{}
 let assistedOverrides:Record<string,unknown>={};try{const raw=localStorage.getItem('cc_assisted_overrides');assistedOverrides=raw?JSON.parse(raw):{}}catch{}
 return {version:BACKUP_VERSION,app:'calisthenics-coach',exportedAt:new Date().toISOString(),sessions,decisions,workouts,local:{targetOverrides,programWeek:localStorage.getItem('cc_program_week'),assistedLevels,assistedOverrides}};
}
export async function exportData(){return JSON.stringify(await buildBackup(),null,2)}

function isObject(v:unknown):v is Record<string,unknown>{return !!v&&typeof v==='object'&&!Array.isArray(v)}
export function parseBackup(json:string):BackupData{
 let raw:unknown;try{raw=JSON.parse(json)}catch{throw new Error('Il file non contiene JSON valido.')}
 if(!isObject(raw))throw new Error('Backup non valido: struttura mancante.');
 if(raw.app!=='calisthenics-coach')throw new Error('Backup non valido: file di un\'altra app.');
 const version=Number(raw.version);if(!Number.isFinite(version)||version<2||version>BACKUP_VERSION)throw new Error(`Versione backup non supportata: ${raw.version??'sconosciuta'}.`);
 for(const key of ['sessions','decisions','workouts'])if(!Array.isArray(raw[key]))throw new Error(`Backup non valido: campo ${key} mancante.`);
 return raw as unknown as BackupData;
}
export async function importData(json:string,{replace=false}={}){
 const data=parseBackup(json);const x=await db;
 const stores=['sessions','decisions','workouts'] as const;
 const tx=x.transaction(stores,'readwrite');
 if(replace){for(const store of stores)await tx.objectStore(store).clear()}
 for(const s of data.sessions)tx.objectStore('sessions').put(s,s.id);
 for(const d of data.decisions)tx.objectStore('decisions').put(d,`${d.date}-${d.exercise}`);
 for(const w of data.workouts)tx.objectStore('workouts').put(w,w.id);
 await tx.done;
 if(data.local?.targetOverrides&&isObject(data.local.targetOverrides))localStorage.setItem('cc_target_overrides',JSON.stringify(data.local.targetOverrides));
 if(typeof data.local?.programWeek==='string')localStorage.setItem('cc_program_week',data.local.programWeek);if(data.local?.assistedLevels&&isObject(data.local.assistedLevels))localStorage.setItem('cc_assisted_levels',JSON.stringify(data.local.assistedLevels));if(data.local?.assistedOverrides&&isObject(data.local.assistedOverrides))localStorage.setItem('cc_assisted_overrides',JSON.stringify(data.local.assistedOverrides));
}
export async function clearAllData(){const x=await db;const tx=x.transaction(['sessions','decisions','workouts'],'readwrite');for(const store of ['sessions','decisions','workouts'] as const)await tx.objectStore(store).clear();await tx.done;localStorage.removeItem('cc_target_overrides');localStorage.removeItem('cc_program_week');localStorage.removeItem('cc_active_session');localStorage.removeItem('cc_assisted_levels');localStorage.removeItem('cc_assisted_overrides');}
