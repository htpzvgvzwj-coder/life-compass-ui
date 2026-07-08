(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  game.housingSystem = {
    id: "housing",
    title: "Housing",
    chapter: "Chapter 10",
    summary(state) {
      return `${state.housing.type} - comfort ${state.housing.comfort}/100, affordability ${state.housing.affordability}/100.`;
    },
    metrics(state) {
      return [
        ["Stability", state.housing.stability],
        ["Comfort", state.housing.comfort],
        ["Affordability", state.housing.affordability],
        ["Commute", state.housing.commuteMinutes]
      ];
    },
    actions: [
      {
        id: "clean-maintain-home",
        title: "Clean and maintain home",
        description: "Use time to improve the place that supports every day.",
        durationMinutes: 90,
        effects: {
          needs: { energy: -6, hygiene: 8, stress: -5, purpose: 4 },
          housing: { comfort: 7, maintenance: 8, satisfaction: 5 },
          health: { physical: 1 },
          habits: { reflection: 1 },
          capability: { responsibility: 2 }
        },
        consequence: "Home maintenance improved comfort and reduced background stress.",
        reflection: "How does your environment affect your decisions?"
      },
      {
        id: "compare-rental-options",
        title: "Compare rental options",
        description: "Study cost, commute, safety, and comfort before moving.",
        durationMinutes: 120,
        effects: {
          needs: { energy: -5, stress: 4, purpose: 8 },
          housing: { affordability: 4, safety: 2 },
          transportation: { timeFlexibility: 2 },
          skills: { finance: 2, lifeManagement: 4 },
          capability: { decisionMaking: 3 }
        },
        consequence: "Comparing housing options made trade-offs clearer before committing money.",
        reflection: "Which housing trade-off matters most for your current life?"
      },
      {
        id: "move-near-work",
        title: "Move closer to work",
        description: "Pay more rent to reduce commute stress and regain time.",
        durationMinutes: 240,
        effects: {
          finance: { money: -180, dailyLivingCost: 4 },
          needs: { energy: -12, stress: -6, purpose: 5 },
          housing: { comfort: 6, commuteMinutes: -15, affordability: -10, monthlyCost: 180, satisfaction: 5 },
          transportation: { commuteStress: -8, monthlyCost: -20, timeFlexibility: 8 },
          mentalWellbeing: { motivation: 3 }
        },
        after(state) {
          state.housing.type = "Small room near work";
          state.housing.selectedOption = "near-work-room";
        },
        consequence: "Moving reduced commute pressure but increased recurring housing costs.",
        reflection: "Did buying time create enough value to justify the rent?"
      }
    ]
  };
})();
