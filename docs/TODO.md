# Rewrite TODO

One system per iteration, per the charter. Nothing here gets started
without a proposal + confirmation first.

## Done

- [x] Time (`lifeverse-time.js`) — 2026-07-23. Real Gregorian calendar,
      leap years, real weekdays/seasons. No scheduling/tick-notification
      API (deferred, see `API.md`). No day-period/day-night labeling
      (deferred, needs a design decision first).

## Known fallout from the Time rewrite (not fixed yet, by design)

`npm test` currently fails partway through, on `tests/lifeverse-phase1.test.js`,
because it and 17 other pre-charter files still call the old flat API
(`game.getTimeSnapshot`, `game.advanceMinutes`, `game.advanceDays`,
`game.durationLabel`) that no longer exists now that Time lives under
`game.time.*`. Affected files: `lifeverse-activities.js`,
`lifeverse-state.js`, `lifeverse-system-registry.js`,
`lifeverse-fast-forward.js`, `lifeverse-ux.js`, `trace-engine.js`,
`state-store.js`, `service-registry.js`, `save-service.js`,
`lifeverse-progression.js`, `lifeverse-player.js`,
`lifeverse-life-report.js`, `lifeverse-core.js`, `entity-models.js`,
`event-bus.js`, `command-bus.js`, plus `tests/lifeverse-phase1.test.js`
and the docs/volume review notes.

This is expected: those files are void pre-charter code and will be
replaced, not patched, as their own systems come up for rewrite. Open
question for the next session: keep `npm test` red as a visible backlog
signal, or pull the pre-charter test files out of the default `test`
script until their systems are rewritten? Not decided — asking, not
guessing.

## Not started

Candidates surfaced by the old (void) file list — order not decided,
needs a proposal + confirmation per system before work starts:

- World/space system (LOD region definition — full/simplified/dormant
  by distance from player)
- Scheduler — consumes `game.time` to decide which systems tick at
  which cadence per their own LOD state
- Weather
- Population
- Economy
- Education
- Healthcare
- Legal
- Social relationships
- NPC perception → memory → thought → decision → action pipeline
