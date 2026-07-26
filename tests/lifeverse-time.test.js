const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "lifeverse-time.js"), "utf8"), sandbox, { filename: "lifeverse-time.js" });

const time = sandbox.window.LifeVerseGame.time;
assert.ok(time, "game.time namespace exists");

// Leap years follow the real Gregorian rule (div by 4, not by 100 unless by 400).
assert.strictEqual(time.isLeapYear(2024), true, "2024 is a leap year");
assert.strictEqual(time.isLeapYear(2026), false, "2026 is not a leap year");
assert.strictEqual(time.isLeapYear(1900), false, "1900 is not a leap year (div by 100, not 400)");
assert.strictEqual(time.isLeapYear(2000), true, "2000 is a leap year (div by 400)");

assert.strictEqual(time.daysInMonth(2024, 2), 29, "Feb has 29 days in a leap year");
assert.strictEqual(time.daysInMonth(2025, 2), 28, "Feb has 28 days in a non-leap year");
assert.strictEqual(time.daysInMonth(2026, 1), 31, "Jan has 31 days");

// Cross-checked against real known weekdays.
assert.strictEqual(time.getWeekdayIndex(2026, 1, 1), 3, "Jan 1 2026 is a real-calendar Thursday");
assert.strictEqual(time.getWeekdayIndex(2000, 1, 1), 5, "Jan 1 2000 is a real-calendar Saturday");

assert.strictEqual(time.getSeason(1), "Winter");
assert.strictEqual(time.getSeason(4), "Spring");
assert.strictEqual(time.getSeason(7), "Summer");
assert.strictEqual(time.getSeason(10), "Autumn");
assert.strictEqual(time.getSeason(12), "Winter");

// totalMinutes is the only stored field; everything else must derive from it correctly.
const state = time.createState({ startMinutes: 0 });
let snap = time.getSnapshot(state);
assert.strictEqual(snap.year, 2026);
assert.strictEqual(snap.month, 1);
assert.strictEqual(snap.day, 1);
assert.strictEqual(snap.hour, 0);
assert.strictEqual(snap.minute, 0);
assert.strictEqual(snap.weekdayName, "Thursday");

// Day boundary: Jan 1 2026 23:50 + 20 minutes -> Jan 2 2026 00:10.
state.totalMinutes = 23 * 60 + 50;
let result = time.advanceMinutes(state, 20, "test");
assert.strictEqual(result.daysChanged, 1, "crossing midnight counts as one day changed");
snap = result.snapshot;
assert.strictEqual(snap.day, 2);
assert.strictEqual(snap.hour, 0);
assert.strictEqual(snap.minute, 10);

// Year boundary: Dec 31 2026 23:50 + 20 minutes -> Jan 1 2027 00:10.
state.totalMinutes = 364 * time.MINUTES_PER_DAY + 23 * 60 + 50;
result = time.advanceMinutes(state, 20, "test");
snap = result.snapshot;
assert.strictEqual(snap.year, 2027, "year rolls over correctly using real 365-day 2026");
assert.strictEqual(snap.month, 1);
assert.strictEqual(snap.day, 1);

// Time never goes negative.
state.totalMinutes = 50;
result = time.advanceMinutes(state, -1000, "test");
assert.strictEqual(state.totalMinutes, 0);

// Real-time to game-time conversion via timeScale.
const scaledState = time.createState({ timeScale: 2 });
time.advanceRealSeconds(scaledState, 30);
assert.strictEqual(scaledState.totalMinutes, 60, "30 real seconds at scale 2 = 60 game minutes");
time.setTimeScale(scaledState, 5);
time.advanceRealSeconds(scaledState, 10);
assert.strictEqual(scaledState.totalMinutes, 110, "setTimeScale changes the conversion rate");

assert.strictEqual(time.durationLabel(45), "45 min");
assert.strictEqual(time.durationLabel(60), "1h");
assert.strictEqual(time.durationLabel(90), "1h 30m");

console.log("lifeverse-time.test.js: all assertions passed");
