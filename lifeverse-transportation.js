(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  game.transportationSystem = {
    id: "transportation",
    title: "Transportation",
    chapter: "Chapter 11",
    summary(state) {
      return `${state.transportation.mode} - ${state.housing.commuteMinutes} min commute, reliability ${state.transportation.reliability}/100.`;
    },
    metrics(state) {
      return [
        ["Reliability", state.transportation.reliability],
        ["Commute stress", state.transportation.commuteStress],
        ["Flexibility", state.transportation.timeFlexibility],
        ["Monthly cost", state.transportation.monthlyCost]
      ];
    },
    actions: [
      {
        id: "plan-commute",
        title: "Plan tomorrow's commute",
        description: "Check travel time before the morning becomes rushed.",
        durationMinutes: 25,
        effects: {
          needs: { stress: -4, purpose: 3 },
          transportation: { reliability: 5, commuteStress: -5, timeFlexibility: 3 },
          habits: { reflection: 1 },
          capability: { responsibility: 1 }
        },
        consequence: "Commute planning lowered tomorrow's uncertainty and protected time.",
        reflection: "What morning risk did planning remove?"
      },
      {
        id: "choose-public-transport",
        title: "Use MRT and bus",
        description: "Spend less money but accept crowding and fixed routes.",
        durationMinutes: 45,
        effects: {
          finance: { money: -4 },
          needs: { energy: -3, stress: 3 },
          transportation: { reliability: 2, commuteStress: 2, environmentalImpact: -2 },
          health: { activity: 1 }
        },
        after(state) {
          state.transportation.mode = "MRT and bus";
          state.transportation.selectedMode = "public-transport";
        },
        consequence: "Public transport kept costs low, but required patience and time awareness.",
        reflection: "How did travel cost affect the rest of your day?"
      },
      {
        id: "take-ride-hailing",
        title: "Take ride-hailing",
        description: "Save energy and time by spending more money.",
        durationMinutes: 25,
        effects: {
          finance: { money: -22 },
          needs: { energy: 3, stress: -4 },
          transportation: { commuteStress: -6, timeFlexibility: 5, environmentalImpact: 3 },
          habits: { budgeting: -1 }
        },
        after(state) {
          state.transportation.mode = "Ride-hailing";
          state.transportation.selectedMode = "ride-hailing";
        },
        consequence: "Ride-hailing reduced immediate stress, but increased daily spending.",
        reflection: "Was convenience solving a real need or becoming a habit?"
      }
    ]
  };
})();
