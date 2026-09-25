# Calisthenics Coach v27

Hardening release after v26 second-opinion audit.

### Main changes
- Smart Engine exposure isolation by progression role and block type.
- Same-day session separation through sessionId.
- Absolute/background-safe EMOM and Density timing.
- EMOM background interruption handling without fabricating performance data.
- Double-tap transition protection.
- Idempotent Density save.
- Deep-cloned session target snapshot.
- Active program week can be explicitly changed from Workout.
- v27 Service Worker cache.

### Tests
- TypeScript check: PASS
- 18 existing Smart Engine scenarios: PASS
- 4 additional hardening scenarios: PASS
- Runtime browser/iPhone: pending.
