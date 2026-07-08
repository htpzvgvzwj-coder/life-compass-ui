(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  game.financeSystem = {
    id: "finance",
    title: "Finance",
    chapter: "Chapter 09",
    summary(state) {
      return `$${state.finance.money} cash, $${state.finance.savings} savings, $${state.finance.debt} debt.`;
    },
    metrics(state) {
      return [
        ["Confidence", state.finance.confidence],
        ["Savings", state.finance.savings],
        ["Debt", state.finance.debt],
        ["Daily cost", state.finance.dailyLivingCost]
      ];
    },
    actions: [
      {
        id: "set-week-budget",
        title: "Set weekly budget",
        description: "Plan spending before the week spends for you.",
        durationMinutes: 45,
        effects: {
          needs: { stress: -5, purpose: 6 },
          finance: { confidence: 8, dailyLivingCost: -1 },
          skills: { finance: 5 },
          habits: { budgeting: 6 },
          capability: { responsibility: 2, decisionMaking: 2 }
        },
        consequence: "Budgeting reduced uncertainty and made future spending easier to understand.",
        reflection: "Which expense needs a boundary this week?"
      },
      {
        id: "save-emergency-money",
        title: "Move money to emergency savings",
        description: "Trade short-term spending freedom for future stability.",
        durationMinutes: 20,
        effects: {
          finance: { money: -50, savings: 50, confidence: 5 },
          needs: { stress: -3, purpose: 5 },
          habits: { budgeting: 4 },
          capability: { responsibility: 2 }
        },
        consequence: "Savings increased future flexibility, but reduced money available today.",
        reflection: "What emergency would this protect you from?"
      },
      {
        id: "use-credit",
        title: "Buy now using credit",
        description: "Solve a want today by creating a future payment.",
        durationMinutes: 20,
        effects: {
          finance: { debt: 70, confidence: -5 },
          needs: { stress: 7, purpose: -3 },
          mentalWellbeing: { motivation: 1 }
        },
        consequence: "Credit gave immediate access, but increased future pressure.",
        reflection: "Was this debt creating opportunity or only delaying discomfort?"
      }
    ]
  };
})();
