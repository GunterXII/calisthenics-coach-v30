# Calisthenics Coach v27 — Audit Complete

## Scope
Hardening pass based on the v26 source audit and second-opinion review.

## Confirmed fixes applied
- Added stable `progressionKey` to program targets so Monday primary, Thursday volume, Friday low-fatigue, and EMOM exposures are analytically distinct across weeks.
- Added optional `sessionId`, `blockType`, and `progressionKey` to `Performance`.
- Added equivalent context to `EmomLog`.
- Smart Engine now filters exposures by exercise + block type + progression role.
- Exposure grouping uses `sessionId` when available, avoiding same-day session merging.
- Historical target IDs can derive a progression role for backward compatibility.
- Session target snapshots now use `structuredClone` after applying overrides.
- Added transition lock against double-tap completion.
- Skip resets the transition lock.
- EMOM timer uses absolute timestamps and visibilitychange refresh; an EMOM that expires while the app is backgrounded is marked interrupted instead of inventing missed repetitions.
- Density timer uses absolute timestamps and visibilitychange refresh.
- Density save is idempotent against timer/manual double-save races.
- Workout week selector can now explicitly set the active program week.
- Service Worker cache bumped to v27.

## Intentionally NOT applied
- No pyramid sets.
- No mandatory band/face-pull exercise.
- No automatic RPE-based replacement of the deterministic progression engine.
- No invented zero-rep EMOM entries after background interruptions.
- No rewrite of the entire progression engine.
- No Block C redesign.

## Verification
- TypeScript: PASS (`tsc --noEmit -p tsconfig.json`)
- Smart Engine audit: 18/18 PASS
- Smart Engine hardening: 4/4 PASS
- ZIP integrity: verified after packaging
- Browser/iPhone runtime: NOT verified in this environment.
