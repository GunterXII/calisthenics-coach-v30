# Calisthenics Coach v29 — Smart Engine Explainability

## What changed
- Smart Engine decisions now carry structured evidence instead of exposing only a generic reason string.
- Coach cards show recent exposure count, completion, average RIR, technique, strong exposures and consecutive strong exposures.
- "Why this suggestion?" now reveals the exact criteria used by the deterministic engine.
- Decision actions remain user-controlled: Accept / Keep / Edit.
- No progression rule was changed in v29; this release improves explainability and traceability only.
- Service Worker cache bumped to v29.

## Verification
- ZIP integrity: PASS.
- Full TypeScript/Vite build was not run because the project package dependencies are not installed in this runtime.
- Browser/iPhone runtime verification is still pending.
