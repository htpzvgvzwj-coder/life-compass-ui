(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function clamp(value, min = 0, max = 100) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function getMinimalHud(state) {
    const time = game.getTimeSnapshot ? game.getTimeSnapshot(state) : {};
    return {
      time: time.time || "",
      day: time.dayOfWeek || "",
      date: time.date || "",
      money: state.finance ? Math.round(Number(state.finance.money) || 0) : 0,
      health: state.health ? clamp(state.health.physical) : 0,
      energy: state.needs ? clamp(state.needs.energy) : 0,
      objective: getCurrentObjective(state)
    };
  }

  function getCurrentObjective(state) {
    if (!state) return "Observe the district and choose one grounded action.";
    if (state.finance && Number(state.finance.money) < 120) return "Money is tight. Find income or reduce spending.";
    if (state.needs && Number(state.needs.energy) < 28) return "Energy is low. Rest before taking on heavy tasks.";
    if (state.health && Number(state.health.physical) < 40) return "Health needs attention. Choose recovery or care.";
    if (state.needs && Number(state.needs.stress) > 72) return "Stress is high. Slow down and lower pressure.";
    if (state.career && Number(state.career.readiness) < 35) return "Build readiness through work, study, or networking.";
    return "Live one meaningful block of today, then reflect on the consequence.";
  }

  function getCriticalNeeds(state) {
    if (!state || !state.needs) return [];
    const checks = [
      ["energy", "Energy", state.needs.energy, "low", 25],
      ["health", "Health", state.health ? state.health.physical : 100, "low", 35],
      ["stress", "Stress", state.needs.stress, "high", 75]
    ];
    return checks
      .map(([key, label, value, direction, threshold]) => ({ key, label, value: clamp(value), direction, threshold }))
      .filter((need) => need.direction === "high" ? need.value > need.threshold : need.value < need.threshold);
  }

  function getPhoneApps(state) {
    return [
      { id: "compass-ai", title: "Compass AI", text: "Ask for support without leaving the world.", icon: "AI", target: "compass" },
      { id: "future-mirror", title: "Future Mirror", text: "Reflect on a decision before acting.", icon: "FM", target: "mirror" },
      { id: "calendar", title: "Calendar", text: `${(state.schedule || []).length} life blocks recorded.`, icon: "CA", view: "journal" },
      { id: "messages", title: "Messages", text: "Check support and relationship context.", icon: "MS", view: "life", systemId: "relationships" },
      { id: "contacts", title: "Contacts", text: "See people who shape your support network.", icon: "CO", view: "journal" },
      { id: "maps", title: "Maps", text: state.world ? state.world.district : "District map", icon: "MP", view: "map" },
      { id: "banking", title: "Banking", text: `Cash ${formatMoney(state.finance ? state.finance.money : 0)}`, icon: "BK", view: "life", systemId: "finance" },
      { id: "journal", title: "Journal", text: "Read traces, reports, and reflection prompts.", icon: "JR", view: "journal" },
      { id: "tasks", title: "Tasks", text: getCurrentObjective(state), icon: "TK", view: "today" },
      { id: "settings", title: "Settings", text: "Save, reset, help, and accessibility.", icon: "ST", view: "pause" }
    ];
  }

  function getLocationInteractions(state, locationId, activities = []) {
    const locationActions = {
      home: [
        { object: "Bed", hint: "Sleep, nap, or reset your energy.", activityId: "rest" },
        { object: "Sleep Calendar", hint: "Fast forward one day from your bed.", fastForwardDays: 1 },
        { object: "Computer", hint: "Study, work online, or review budget.", activityId: "study-block" },
        { object: "Fridge", hint: "Eat or plan cheaper meals.", activityId: "budget-review" }
      ],
      work: [
        { object: "Workplace", hint: "Take a shift or prepare for a better role.", activityId: "work-shift" },
        { object: "Manager", hint: "Build performance and reputation.", systemId: "career", actionId: "prepare-portfolio" }
      ],
      food: [
        { object: "Food Court", hint: "Eat, recover energy, and spend carefully.", activityId: "eat-meal" }
      ],
      gym: [
        { object: "Gym Floor", hint: "Exercise to build health and resilience.", activityId: "exercise" }
      ],
      mall: [
        { object: "Shopping Mall", hint: "Spend for relief, but notice the money trade-off.", activityId: "shopping" },
        { object: "Bank Kiosk", hint: "Review savings pressure.", systemId: "finance", actionId: "set-week-budget" }
      ],
      park: [
        { object: "Friend", hint: "Talk and protect your support network.", activityId: "meet-friend" },
        { object: "Quiet Bench", hint: "Reflect before the next decision.", activityId: "journal-reflection" }
      ]
    };
    const available = new Set((activities || []).map((activity) => activity.id));
    return (locationActions[locationId] || []).filter((action) => {
      if (action.activityId) return available.has(action.activityId);
      return true;
    });
  }

  function getFastForwardTimeline(days = 30) {
    const count = Math.max(1, Number(days) || 30);
    if (count <= 7) {
      return [
        "Today repeats into a week of routines.",
        "Needs, work pressure, and relationships drift.",
        "A short Life Report captures the pattern."
      ];
    }
    if (count <= 30) {
      return [
        "Calendar pages move through one month.",
        "Rent, food, transport, and habits compound.",
        "World conditions nudge money, stress, and opportunity.",
        "Life Report opens with the clearest causes."
      ];
    }
    if (count <= 365) {
      return [
        "Months pass through changing routines.",
        "Skills, health, relationships, and savings compound.",
        "NPC and world pressure reshape opportunity.",
        "Life Report becomes a chapter summary."
      ];
    }
    return [
      "Years pass as repeated choices become identity.",
      "Career, education, housing, health, and relationships compound.",
      "World changes create pressure and opportunity.",
      "Life Report reflects on direction, not just numbers."
    ];
  }

  function getReportChapters(report = {}) {
    return [
      { title: "Opening Reflection", items: report.overview ? [report.overview] : [] },
      { title: "Major Moments", items: report.majorEvents || report.consequences || [] },
      { title: "Cause And Effect", items: report.causeAndEffect || [] },
      { title: "World Pressure", items: report.worldExplanations || [] },
      { title: "Lessons", items: report.behaviourPatterns || [] },
      { title: "Next Steps", items: report.recommendations || [] },
      { title: "Questions", items: report.reflectionQuestions || [] }
    ].filter((chapter) => chapter.items && chapter.items.length);
  }

  function formatMoney(value) {
    const amount = Math.round(Number(value) || 0);
    return `$${amount.toLocaleString()}`;
  }

  game.lifeVerseUx = {
    getMinimalHud,
    getCurrentObjective,
    getCriticalNeeds,
    getPhoneApps,
    getLocationInteractions,
    getFastForwardTimeline,
    getReportChapters
  };
})();
