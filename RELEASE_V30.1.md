# Calisthenics Coach — v30.1

## v30.1 hardening

- Assisted Endurance overrides now persist separately from bodyweight overrides and are applied to future Assisted sessions. Assistance level remains controlled by the Assisted Endurance selector / progression state.
- Assisted overrides are included in JSON backup/restore and removed by the local-data wipe.
- EMOM background interruption now records the interrupted minute as unverified instead of letting the next start silently advance past it.
- Unverified EMOM minutes are excluded from progression evaluation.
- Rest auto-advance has a dedicated transition lock to prevent duplicate transitions around timer completion.
- Service Worker cache bumped to `calisthenics-coach-v30.1`.

## Validation

- Core TypeScript (`types.ts` + `progression.ts`): PASS with strict compiler settings.
- Full application build/runtime: not completed in this environment because `npm install` timed out and dependencies are not locally installed.
- Real iPhone/PWA validation: intentionally pending after v30.1.
