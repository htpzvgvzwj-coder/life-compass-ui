(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function getViewModel(state) {
    const time = game.getTimeSnapshot ? game.getTimeSnapshot(state) : {};
    const player = game.playerSummary ? game.playerSummary(state) : {};
    const report = game.latestReport ? game.latestReport(state) : null;
    return {
      time,
      player,
      needsSummary: game.needsSummary ? game.needsSummary(state) : "",
      latestEvent: (state.events || [])[state.events.length - 1] || null,
      latestReport: report,
      traces: game.selectReportTraces ? game.selectReportTraces(state, {}) : (state.traces || []).slice(-10),
      diagnostics: state.simulation && state.simulation.diagnostics ? state.simulation.diagnostics : {},
      todaySchedule: (state.schedule || []).slice(-8).reverse(),
      activities: game.getAvailableActivities ? game.getAvailableActivities(state) : [],
      systems: game.systems ? game.systems().map((system) => ({
        id: system.id,
        title: system.title,
        chapter: system.chapter,
        summary: typeof system.summary === "function" ? system.summary(state) : "",
        metrics: typeof system.metrics === "function" ? system.metrics(state) : [],
        actions: Array.isArray(system.actions) ? system.actions : []
      })) : []
    };
  }

  function reset(options = {}) {
    const state = game.createInitialState ? game.createInitialState(options) : null;
    if (state && game.installLifeVerseArchitecture) game.installLifeVerseArchitecture(state);
    return state;
  }

  function performActivityCommand(state, activityId, options = {}) {
    if (!game.dispatchLifeVerseCommand) return game.performActivity ? game.performActivity(state, activityId, options) : null;
    return game.dispatchLifeVerseCommand(state, {
      type: "StartActivityCommand",
      actor: "player-main",
      payload: {
        activityId,
        options
      }
    });
  }

  function performSystemActionCommand(state, systemId, actionId) {
    if (!game.dispatchLifeVerseCommand) return game.performSystemAction ? game.performSystemAction(state, systemId, actionId) : null;
    return game.dispatchLifeVerseCommand(state, {
      type: "SystemActionCommand",
      actor: "player-main",
      payload: {
        systemId,
        actionId
      }
    });
  }

  function fastForwardCommand(state, days = 7) {
    if (!game.dispatchLifeVerseCommand) return game.fastForward ? game.fastForward(state, days) : null;
    return game.dispatchLifeVerseCommand(state, {
      type: "FastForwardCommand",
      actor: "player-main",
      payload: { days }
    });
  }

  function resolveFastForwardInterventionCommand(state, choiceId) {
    if (!game.dispatchLifeVerseCommand) return game.resolveFastForwardIntervention ? game.resolveFastForwardIntervention(state, choiceId) : null;
    return game.dispatchLifeVerseCommand(state, {
      type: "ResolveFastForwardInterventionCommand",
      actor: "player-main",
      payload: { choiceId }
    });
  }

  function generateLifeReportCommand(state, context = {}) {
    if (!game.dispatchLifeVerseCommand) return game.generateLifeReport ? game.generateLifeReport(state, context) : null;
    const result = game.dispatchLifeVerseCommand(state, {
      type: "GenerateLifeReportCommand",
      actor: "player-main",
      payload: { context }
    });
    return result && result.report ? result.report : result;
  }

  function saveLifeVerseState(state, options = {}) {
    return game.getSaveService ? game.getSaveService().save(state, options) : { ok: false, error: "Save service unavailable." };
  }

  function loadLifeVerseState(options = {}) {
    return game.getSaveService ? game.getSaveService().load(options) : { ok: false, error: "Save service unavailable." };
  }

  if (game.installLifeVerseArchitecture) game.installLifeVerseArchitecture();

  game.getViewModel = getViewModel;
  game.reset = reset;
  game.performActivityCommand = performActivityCommand;
  game.performSystemActionCommand = performSystemActionCommand;
  game.fastForwardCommand = fastForwardCommand;
  game.resolveFastForwardInterventionCommand = resolveFastForwardInterventionCommand;
  game.generateLifeReportCommand = generateLifeReportCommand;
  game.saveLifeVerseState = saveLifeVerseState;
  game.loadLifeVerseState = loadLifeVerseState;
})();
