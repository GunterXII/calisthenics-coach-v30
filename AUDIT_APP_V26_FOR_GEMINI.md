# Calisthenics Coach — Functional/App Audit v26

## Scope
Audit the actual app architecture and runtime behavior, not the visual design only.
Focus on workout lifecycle, timers, persistence, history, progression engine, backups, week navigation, and edge cases.

## Important current status
- v26 source includes the updated Friday low-fatigue structure and Week 9 separated tests.
- Smart Engine/data audit: 18/18 deterministic scenarios pass in isolated Node 22 execution.
- Browser/iPhone runtime has NOT been verified in this environment because dependencies/node_modules are unavailable.
- Therefore do not assume the UI works merely because TypeScript/source logic looks correct.

## App architecture
- React + TypeScript + Vite PWA
- IndexedDB for sessions/decisions/workouts
- localStorage for active session, overrides, current program week
- service worker offline shell
- no backend/account/cloud

## Main functional flows to audit

### 1. App boot
Check:
- IndexedDB opens correctly
- workouts are seeded
- sessions are loaded
- active session is restored
- current target/set are restored
- timers resume correctly after reload/backgrounding
- corrupted localStorage cannot crash the app

### 2. Start workout
Verify:
- selected weekly workout is used, not today's workout accidentally
- targetSnapshot is created and remains immutable for the session
- overrides are applied only to the selected workout
- initial state is reset correctly
- no stale EMOM/Bar Set/Density/Test state leaks from a previous session

### 3. Straight-set lifecycle
Test:
- set 1 → set 2 → set 3 etc.
- reps below target
- reps exactly at target
- reps above target
- RIR 0–4
- technique values
- rest timer
- manual Continue during rest
- final set → next exercise
- final set of final exercise → session completion
- save after every meaningful state transition

### 4. Skip exercise
Verify:
- skipped target is recorded
- exercise data is not incorrectly counted as a completed exposure
- EMOM data is not accidentally retained when skipped
- skip on first/middle/final target works
- skipping final target completes the session correctly

### 5. EMOM
Test:
- start
- minute countdown
- manual logging
- automatic minute transition
- final minute
- reload during a minute
- existing logged minute after reload
- missing/sparse minute data
- actual reps = 0
- final minute does not get duplicated
- completion advances to next target exactly once

### 6. Bar Set
Test:
- round start
- elapsed timer
- failed reps
- technique
- round completion
- automatic rest
- Continue/bypass rest
- next round
- final round
- reload during a round
- reload during rest
- total time
- failed reps aggregation
- completion exactly once

### 7. Density
Test:
- start
- countdown ring
- manual completion
- automatic completion
- reload while running
- rounds/reps persistence
- final save
- no duplicate density log
- no double advance

### 8. Week 9 tests
v26 now separates:
- Friday: MAX Pull-up / Dips / Push-up / Muscle-up
- Saturday: 10-min Pull-up / Dips / Push-up EMOM benchmarks
Thursday is a recovery day.

Verify:
- both test sessions save correctly
- test values appear in History
- test values survive backup/export/import
- tests do NOT accidentally feed normal progression
- test completion cannot be duplicated

### 9. Session lifecycle
Verify every route:
- IN_PROGRESS
- COMPLETED
- PARTIAL
- ABANDONED

Especially:
- app close/background
- reload
- browser tab kill/reopen
- partial save
- abandon without save
- resume dialog
- completed session cannot resume
- abandoned session cannot reappear

### 10. Progression engine
Audit the actual behavior against these rules:
- no data → MAINTAIN
- one good exposure → MAINTAIN
- two consecutive strong exposures → progression
- one bad session never causes regression
- repeated bad trend can regress
- only one progression lever changes at a time
- partial sessions excluded
- skipped targets excluded
- EMOM uses its own modality and should not be mixed blindly with straight-set history
- Bar Set/Density progression should use the correct variable

### 11. Critical Smart Engine question
Inspect whether history from different target modalities is being mixed.
For example:
- Monday Pull-up straight sets
- Friday Pull-up straight sets
- Pull-up EMOM

These are all named "Pull-up" but should not automatically be treated as identical exposures.
Check whether targetId, target type, strategy, variant, or another progression identity prevents inappropriate mixing.

### 12. Manual progression decisions
Test:
- ACCEPT
- KEEP
- EDIT

Verify that EDIT modifies the correct property:
- reps → reps
- sets → sets
- rest → rest
- duration → duration
- rounds → rounds
- variant → variant

Pay special attention to `INCREASE_DENSITY` when the action means adding rounds rather than duration.

### 13. Overrides
Verify:
- Today only / week / from-now behavior if supported
- override persistence
- override application to the correct week/target
- old sessions remain unchanged
- targetSnapshot protects historical sessions from later program edits

### 14. Current program week
Audit whether the user can actually move from Week 1 → Week 2 → ... → Week 16 through the UI.
The source contains `cc_program_week`, but verify whether there is a real user-facing mechanism to change it.
If not, classify this as a functional gap.

Also verify that changing the selected week in the Workout tab does not accidentally change the active program week.

### 15. History
Verify:
- completed sessions appear
- partial sessions appear
- abandoned sessions do not appear
- tests are visible
- EMOM values are visible
- Bar Set values are visible
- Density values are visible
- skipped exercises are visible
- filtering/range filtering works
- charts use correct data

### 16. Progress page
Check whether aggregate exercise statistics accidentally mix:
- straight sets
- EMOM
- Bar Set
- tests
- different variants

Determine whether the displayed metrics represent useful progression information or merely aggregate all reps by exercise name.

### 17. Backup / restore
Test:
- export
- import/merge
- replace restore
- invalid JSON
- wrong app file
- unsupported version
- missing fields
- sessions
- decisions
- overrides
- program week
- workouts
- active in-progress session

Important: determine whether the active session is included in backup. If not, explain the consequence.

### 18. Offline/PWA
Verify:
- app shell works offline after first load
- service worker cache version changes correctly
- old caches are removed
- app still starts without network
- IndexedDB works offline
- no hidden network dependency exists during a workout

### 19. Race conditions / stale React state
Look specifically for:
- `setState` followed immediately by code that reads the old state
- timers firing after a target has already advanced
- duplicate `finish()` calls
- duplicate `saveSession()` calls
- stale target/index/set values
- double advancement after automatic timer completion

### 20. Data integrity
Verify that:
- every completed session is saved exactly once
- historical snapshots are immutable
- partial sessions do not feed progression
- abandoned sessions do not feed progression
- test sessions do not feed progression
- skipped exercises do not feed progression
- imported data does not create accidental duplicate decisions

## Output required
Do NOT just say the app is good.
Return:

### A. CRITICAL BUGS
Actual bugs that can cause wrong training data, lost sessions, broken workout progression, or incorrect Smart Engine decisions.

### B. MODERATE BUGS
Issues that do not immediately corrupt data but should be fixed.

### C. FUNCTIONAL GAPS
Features implied by the app concept but not actually implemented.

### D. SMART ENGINE RISKS
Anything that could make the coach recommend the wrong progression.

### E. DATA INTEGRITY RISKS
Anything that can duplicate, lose, overwrite, or incorrectly classify data.

### F. RUNTIME TEST PLAN
Give a concrete iPhone/browser test sequence with expected results.

### G. FIX PRIORITY
Use only:
1. Must fix
2. Should fix
3. Nice to have

Do not assign numeric scores.
Do not redesign the app unless a UX issue directly causes a functional problem.
Be skeptical and try to break the app.
