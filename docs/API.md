# System API Reference

Only rewritten systems are documented here. Pre-charter `lifeverse-*.js`
files are not — they're void, see `ARCHITECTURE.md`.

## `game.time` — Time System (`lifeverse-time.js`)

Single responsibility: hold the world's monotonic clock and derive real
Gregorian calendar fields from it. Knows nothing about any other system.

**Scope boundary:** this module does not schedule or notify other
systems (no subscribe/tick-callback API). Deciding which systems tick at
which cadence based on distance from the player is LOD/scheduling
concern that belongs to a future world-scheduler system, consuming
`totalMinutes` — proposed and intentionally deferred, not forgotten.

**Scope boundary:** no "period of day" label (morning/evening/etc.) and
no day/night flag. Those are calendar-adjacent but are actual game-rule
decisions (where do the boundaries fall, does it depend on season) that
haven't been confirmed yet.

### State shape

```js
{
  totalMinutes: number,  // source of truth — every other field derives from this
  timeScale: number      // game-minutes advanced per real-world second
}
```

### Constants

- `time.EPOCH_YEAR / EPOCH_MONTH / EPOCH_DAY` — world day 0 = 2026-01-01, a real date.
- `time.WEEKDAY_NAMES` — `["Monday", ..., "Sunday"]`
- `time.MONTH_NAMES` — `["January", ..., "December"]`
- `time.MINUTES_PER_DAY` — `1440`

### Functions

- `time.createState({ startMinutes?, timeScale? }) -> state`
- `time.isLeapYear(year) -> boolean` — real Gregorian rule (÷4, not ÷100 unless ÷400).
- `time.daysInMonth(year, month) -> number` — real month lengths, leap-aware Feb.
- `time.getWeekdayIndex(year, month, day) -> 0-6` — Zeller's congruence, Monday=0.
- `time.getSeason(month) -> string` — meteorological, Northern Hemisphere (`"Winter"|"Spring"|"Summer"|"Autumn"`).
- `time.getSnapshot(state) -> { totalMinutes, year, month, day, hour, minute, weekdayIndex, weekdayName, monthName, season, isLeapYear, daysInMonth, dateLabel, timeLabel, stamp }`
- `time.advanceMinutes(state, minutes, reason?) -> { minutes, daysChanged, reason, snapshot }` — mutates `state.totalMinutes`, clamped to ≥ 0.
- `time.advanceRealSeconds(state, realSeconds) -> same as advanceMinutes` — converts using `state.timeScale`.
- `time.setTimeScale(state, minutesPerRealSecond) -> number`
- `time.durationLabel(minutes) -> string` — e.g. `"1h 30m"`.

### Tests

`tests/lifeverse-time.test.js` — leap years, real month lengths, real
weekdays (cross-checked against known real-world dates), season mapping,
day/month/year rollover on `advanceMinutes`, negative-time clamping,
`timeScale` conversion, `durationLabel` formatting.
