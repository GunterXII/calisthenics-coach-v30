import assert from 'node:assert/strict';
import {parseBackup,BACKUP_VERSION} from '../src/storage/db.ts';
const base={app:'calisthenics-coach',version:BACKUP_VERSION,exportedAt:new Date().toISOString(),sessions:[],decisions:[],workouts:[],local:{targetOverrides:{},programWeek:'1'}};
assert.equal(parseBackup(JSON.stringify(base)).version,BACKUP_VERSION);
assert.throws(()=>parseBackup('{bad json'),/JSON valido/);
assert.throws(()=>parseBackup(JSON.stringify({...base,app:'other-app'})),/altra app/);
assert.throws(()=>parseBackup(JSON.stringify({...base,sessions:null})),/sessions/);
assert.throws(()=>parseBackup(JSON.stringify({...base,version:99})),/non supportata/);
console.log('backup tests passed');
