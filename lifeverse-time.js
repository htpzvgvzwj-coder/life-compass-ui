(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function syncCalendar(state) {
    const minutes = Math.max(0, Math.round(Number(state.time.totalMinutes) || 0));
    const dayIndex = Math.floor(minutes / 1440);
    const minuteOfDay = minutes % 1440;
    state.time.day = dayIndex + 1;
    state.time.weekday = dayIndex % 7;
    state.time.month = Math.floor(dayIndex / 30) + 1;
    state.time.year = 2026 + Math.floor((state.time.month - 1) / 12);
    state.time.month = ((state.time.month - 1) % 12) + 1;
    state.time.hour = Math.floor(minuteOfDay / 60);
    state.time.minute = minuteOfDay % 60;
  }

  function getTimeSnapshot(state) {
    syncCalendar(state);
    const hour = state.time.hour;
    const period = hour < 5 ? "Late night" : hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : hour < 21 ? "Evening" : "Night";
    return {
      day: state.time.day,
      dayOfWeek: weekdays[state.time.weekday] || "Monday",
      date: `${months[state.time.month - 1] || "Jan"} ${state.time.day}, ${state.time.year}`,
      time: `${pad(hour)}:${pad(state.time.minute)}`,
      period,
      stamp: `Day ${state.time.day}, ${pad(hour)}:${pad(state.time.minute)}`
    };
  }

  function advanceMinutes(state, minutes, reason = "Time passed") {
    const beforeDay = Math.floor((state.time.totalMinutes || 0) / 1440);
    state.time.totalMinutes = Math.max(0, Math.round((state.time.totalMinutes || 0) + Number(minutes || 0)));
    syncCalendar(state);
    const afterDay = Math.floor((state.time.totalMinutes || 0) / 1440);
    const daysChanged = Math.max(0, afterDay - beforeDay);
    return {
      minutes: Number(minutes || 0),
      daysChanged,
      reason,
      snapshot: getTimeSnapshot(state)
    };
  }

  function advanceDays(state, days, reason = "Days passed") {
    return advanceMinutes(state, Number(days || 0) * 1440, reason);
  }

  function durationLabel(minutes) {
    const value = Math.max(0, Math.round(Number(minutes) || 0));
    if (value < 60) return `${value} min`;
    const hours = Math.floor(value / 60);
    const rest = value % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }

  game.getTimeSnapshot = getTimeSnapshot;
  game.advanceMinutes = advanceMinutes;
  game.advanceDays = advanceDays;
  game.durationLabel = durationLabel;
})();
