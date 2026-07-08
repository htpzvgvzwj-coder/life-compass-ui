(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function refreshWorldEconomyLabel(state) {
    const pressure = state.economy.costOfLivingIndex + state.economy.inflation + state.economy.consumerPressure * 0.2;
    state.world.economy = pressure > 78 ? "Expensive and tight" : pressure > 60 ? "Rising costs" : "Stable";
    state.world.costOfLiving = game.clamp(state.economy.costOfLivingIndex);
  }

  game.economySystem = {
    id: "economy",
    title: "Economy",
    chapter: "Chapter 15",
    summary(state) {
      return `${state.economy.cycle} economy - inflation ${state.economy.inflation}/100, job market ${state.economy.jobMarket}/100.`;
    },
    metrics(state) {
      return [
        ["Inflation", state.economy.inflation],
        ["Job market", state.economy.jobMarket],
        ["Living cost", state.economy.costOfLivingIndex],
        ["Opportunities", state.economy.opportunityIndex]
      ];
    },
    actions: [
      {
        id: "review-cost-of-living",
        title: "Review cost of living",
        description: "Check prices before assuming last month's budget still works.",
        durationMinutes: 35,
        effects: {
          needs: { stress: 2, purpose: 5 },
          economy: { consumerPressure: -3 },
          finance: { confidence: 5, dailyLivingCost: -1 },
          skills: { finance: 3, lifeManagement: 2 },
          capability: { responsibility: 2, decisionMaking: 1 }
        },
        after(state) {
          refreshWorldEconomyLabel(state);
        },
        consequence: "Understanding living costs improved budgeting and reduced blind spending pressure.",
        reflection: "Which everyday cost changed without you noticing?"
      },
      {
        id: "adjust-budget-for-inflation",
        title: "Adjust budget for inflation",
        description: "Move money away from low-value spending before rising prices trap you.",
        durationMinutes: 45,
        effects: {
          needs: { stress: -3, purpose: 6 },
          finance: { confidence: 7, dailyLivingCost: -2 },
          economy: { consumerPressure: -4 },
          habits: { budgeting: 5 },
          capability: { responsibility: 2 }
        },
        after(state) {
          refreshWorldEconomyLabel(state);
        },
        consequence: "Budget changes made inflation easier to handle, but required saying no to some wants.",
        reflection: "What spending can shrink without shrinking your life?"
      },
      {
        id: "track-job-market",
        title: "Track job market signals",
        description: "Study hiring demand before choosing what skill to improve next.",
        durationMinutes: 50,
        effects: {
          needs: { energy: -3, stress: 3, purpose: 7 },
          career: { readiness: 3, interviewPrep: 2 },
          education: { learningEfficiency: 3, portfolio: 1 },
          economy: { opportunityIndex: 3 },
          skills: { career: 3, learning: 2 },
          capability: { decisionMaking: 2 }
        },
        consequence: "Job-market awareness connected education choices to realistic opportunities.",
        reflection: "Which skill is useful because the world actually needs it?"
      },
      {
        id: "negotiate-pay",
        title: "Prepare a pay conversation",
        description: "Use performance evidence and market data instead of hoping salary rises by itself.",
        durationMinutes: 90,
        canPerform(state) {
          return state.career.performance >= 45 || "Build work performance before preparing a pay conversation.";
        },
        effects: {
          needs: { energy: -5, stress: 6, purpose: 7 },
          career: { reputation: 4, readiness: 4, interviewPrep: 3 },
          finance: { confidence: 4 },
          economy: { wageGrowth: 2 },
          skills: { career: 3, finance: 2 },
          capability: { communication: 3, decisionMaking: 2 }
        },
        consequence: "Pay preparation linked career performance, market awareness, and financial planning.",
        reflection: "What evidence makes your request fair instead of emotional?"
      }
    ]
  };

  game.refreshWorldEconomyLabel = refreshWorldEconomyLabel;
})();
