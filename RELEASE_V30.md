# Calisthenics Coach v30 — Assisted Endurance

## What changed

- Added optional **Assisted Endurance Lab** using loop-band assistance.
- Assisted work is deliberately separate from the 16-week bodyweight program.
- Available templates: Assisted Pull-up Endurance and Assisted Dips Endurance.
- Four assistance levels: Heavy, Medium, Light, Minimal.
- Assisted progression is deterministic:
  1. build reps within the target range;
  2. consolidate the upper rep limit with RIR/technique criteria;
  3. propose one-step reduction in assistance;
  4. once Minimal assistance is reached, maintain rather than invent a harder band.
- Assisted exposures are isolated from bodyweight straight sets, EMOM, Bar Set and Density data.
- Progression requires evidence from the selected assistance level; exposures from a different band level do not count toward that level's confirmation.
- Performance logs store assistance level/rank for traceability.
- Assisted data is visible in History but excluded from the main bodyweight Progress aggregate to avoid contaminating bodyweight metrics.
- Band selection persists locally and is included in backups.
- Backup format bumped to v5 while retaining import compatibility with older backups.
- Restored sessions can resolve their own workout from `workoutId`, including optional lab sessions started on rest days.

## Validation

- Core TypeScript check: PASS.
- Main TSX syntax parse: PASS.
- Core + program compilation: PASS.
- Assisted progression tests: PASS.
- Full Vite build: not run because dependency installation timed out in the build environment.
- Real iPhone/browser runtime: not yet verified.
