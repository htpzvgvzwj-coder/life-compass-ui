// Time System
//
// Single responsibility: maintain the world's monotonic clock and derive
// real Gregorian calendar fields from it. This module knows nothing about
// any other system (economy, NPCs, weather, ...). Other systems read
// state.time.totalMinutes (or a getSnapshot() result) to decide how often
// they need to run; this module never calls into them.
//
// Source of truth: state.time.totalMinutes. Every other field returned by
// getSnapshot() is derived, read-only, and never stored, so there is only
// ever one number to serialize or get out of sync.
(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});
  const time = game.time || (game.time = {});

  // World day 0 = this real-world Gregorian date. Real calendar rules
  // (leap years, true month lengths, true weekdays) apply from here on,
  // exactly as they would to a real calendar.
  const EPOCH_YEAR = 2026;
  const EPOCH_MONTH = 1;
  const EPOCH_DAY = 1;

  const MINUTES_PER_HOUR = 60;
  const HOURS_PER_DAY = 24;
  const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;

  const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  // Meteorological seasons, Northern Hemisphere. Flip this table if/when
  // the world needs a Southern Hemisphere setting.
  const SEASON_BY_MONTH = ["Winter", "Winter", "Spring", "Spring", "Spring", "Summer", "Summer", "Summer", "Autumn", "Autumn", "Autumn", "Winter"];

  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  function daysInMonth(year, month) {
    const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return lengths[month - 1];
  }

  // Real-calendar day-of-week via Zeller's congruence, remapped from
  // Zeller's Saturday-first output to a Monday-first index (0=Monday).
  function getWeekdayIndex(year, month, day) {
    let y = year;
    let m = month;
    if (m < 3) {
      m += 12;
      y -= 1;
    }
    const K = y % 100;
    const J = Math.floor(y / 100);
    const h = (day + Math.floor((13 * (m + 1)) / 5) + K + Math.floor(K / 4) + Math.floor(J / 4) + 5 * J) % 7;
    const zellerToMondayFirst = [5, 6, 0, 1, 2, 3, 4];
    return zellerToMondayFirst[h];
  }

  function getSeason(month) {
    return SEASON_BY_MONTH[month - 1];
  }

  // dayIndex (0-based, days since the epoch) -> {year, month, day}.
  // Walks whole years then whole months so the loop bound is ~O(years
  // elapsed), never O(days elapsed).
  function getCalendarDateFromDayIndex(dayIndex) {
    let year = EPOCH_YEAR;
    let remaining = dayIndex;
    while (true) {
      const daysInYear = isLeapYear(year) ? 366 : 365;
      if (remaining < daysInYear) break;
      remaining -= daysInYear;
      year += 1;
    }
    let month = EPOCH_MONTH;
    while (true) {
      const dim = daysInMonth(year, month);
      if (remaining < dim) break;
      remaining -= dim;
      month += 1;
      if (month > 12) {
        month = 1;
      }
    }
    return { year, month, day: remaining + 1 };
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function createState(options) {
    const opts = options || {};
    return {
      totalMinutes: Math.max(0, Math.round(Number(opts.startMinutes) || 0)),
      // Game minutes advanced per real-world second, used by advanceRealSeconds.
      timeScale: Math.max(0, Number(opts.timeScale) || 1)
    };
  }

  function getSnapshot(timeState) {
    const totalMinutes = Math.max(0, Math.round(Number(timeState.totalMinutes) || 0));
    const dayIndex = Math.floor(totalMinutes / MINUTES_PER_DAY);
    const minuteOfDay = totalMinutes % MINUTES_PER_DAY;
    const hour = Math.floor(minuteOfDay / MINUTES_PER_HOUR);
    const minute = minuteOfDay % MINUTES_PER_HOUR;
    const { year, month, day } = getCalendarDateFromDayIndex(dayIndex);
    const weekdayIndex = getWeekdayIndex(year, month, day);

    return {
      totalMinutes,
      year,
      month,
      day,
      hour,
      minute,
      weekdayIndex,
      weekdayName: WEEKDAY_NAMES[weekdayIndex],
      monthName: MONTH_NAMES[month - 1],
      season: getSeason(month),
      isLeapYear: isLeapYear(year),
      daysInMonth: daysInMonth(year, month),
      dateLabel: `${MONTH_NAMES[month - 1]} ${day}, ${year}`,
      timeLabel: `${pad(hour)}:${pad(minute)}`,
      stamp: `${WEEKDAY_NAMES[weekdayIndex]}, ${MONTH_NAMES[month - 1]} ${day} ${year} ${pad(hour)}:${pad(minute)}`
    };
  }

  function advanceMinutes(timeState, minutes, reason) {
    const before = Math.max(0, Math.round(Number(timeState.totalMinutes) || 0));
    const beforeDay = Math.floor(before / MINUTES_PER_DAY);
    const after = Math.max(0, Math.round(before + (Number(minutes) || 0)));
    timeState.totalMinutes = after;
    const afterDay = Math.floor(after / MINUTES_PER_DAY);

    return {
      minutes: Number(minutes) || 0,
      daysChanged: Math.max(0, afterDay - beforeDay),
      reason: reason || "Time passed",
      snapshot: getSnapshot(timeState)
    };
  }

  function advanceRealSeconds(timeState, realSeconds) {
    const gameMinutes = (Number(realSeconds) || 0) * timeState.timeScale;
    return advanceMinutes(timeState, gameMinutes, "Real time elapsed");
  }

  function setTimeScale(timeState, minutesPerRealSecond) {
    timeState.timeScale = Math.max(0, Number(minutesPerRealSecond) || 0);
    return timeState.timeScale;
  }

  function durationLabel(minutes) {
    const value = Math.max(0, Math.round(Number(minutes) || 0));
    if (value < MINUTES_PER_HOUR) return `${value} min`;
    const hours = Math.floor(value / MINUTES_PER_HOUR);
    const rest = value % MINUTES_PER_HOUR;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }

  time.EPOCH_YEAR = EPOCH_YEAR;
  time.EPOCH_MONTH = EPOCH_MONTH;
  time.EPOCH_DAY = EPOCH_DAY;
  time.WEEKDAY_NAMES = WEEKDAY_NAMES;
  time.MONTH_NAMES = MONTH_NAMES;
  time.MINUTES_PER_DAY = MINUTES_PER_DAY;

  time.isLeapYear = isLeapYear;
  time.daysInMonth = daysInMonth;
  time.getWeekdayIndex = getWeekdayIndex;
  time.getSeason = getSeason;
  time.createState = createState;
  time.getSnapshot = getSnapshot;
  time.advanceMinutes = advanceMinutes;
  time.advanceRealSeconds = advanceRealSeconds;
  time.setTimeScale = setTimeScale;
  time.durationLabel = durationLabel;
})();
