(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  game.mentalWellbeingSystem = {
    id: "mentalWellbeing",
    title: "Mental Wellbeing",
    chapter: "Chapter 14",
    summary(state) {
      return `Index ${state.mentalWellbeing.index}/100, confidence ${state.mentalWellbeing.confidence}/100, burnout ${state.mentalWellbeing.burnoutRisk}/100.`;
    },
    metrics(state) {
      return [
        ["Motivation", state.mentalWellbeing.motivation],
        ["Confidence", state.mentalWellbeing.confidence],
        ["Purpose", state.mentalWellbeing.purposeClarity],
        ["Burnout", state.mentalWellbeing.burnoutRisk]
      ];
    },
    actions: [
      {
        id: "stress-reset",
        title: "Take a stress reset",
        description: "Pause before pressure turns into avoidance or impulsive choices.",
        durationMinutes: 25,
        effects: {
          needs: { stress: -10, energy: 2, purpose: 2 },
          mentalWellbeing: { resilience: 5, burnoutRisk: -5, index: 4 },
          health: { recovery: 3 },
          career: { burnoutRisk: -2 },
          education: { learningEfficiency: 1 },
          habits: { reflection: 2 },
          capability: { decisionMaking: 1 }
        },
        consequence: "Stress lowered enough to protect the next decision from panic or avoidance.",
        reflection: "What signal tells you that pressure is becoming too much?"
      },
      {
        id: "confidence-action",
        title: "Do one confidence-building task",
        description: "Choose one small hard thing and finish it to build believable confidence.",
        durationMinutes: 60,
        effects: {
          needs: { energy: -5, stress: 3, purpose: 8 },
          mentalWellbeing: { confidence: 8, motivation: 5, happiness: 3, purposeClarity: 3 },
          career: { readiness: 2 },
          education: { studyConsistency: 2 },
          player: {},
          capability: { discipline: 2, decisionMaking: 2 }
        },
        consequence: "Confidence increased because it came from completed action, not empty motivation.",
        reflection: "What small evidence did you create for yourself?"
      },
      {
        id: "talk-to-support",
        title: "Talk to a trusted person",
        description: "Use support instead of carrying every problem alone.",
        durationMinutes: 50,
        effects: {
          needs: { social: 8, stress: -7, energy: -2 },
          relationships: { support: 6, trust: 4, neglectRisk: -3 },
          mentalWellbeing: { loneliness: -8, resilience: 5, confidence: 2 },
          capability: { communication: 2 }
        },
        consequence: "Support reduced loneliness and stress while strengthening trust.",
        reflection: "Who is safe enough to contact before things become urgent?"
      },
      {
        id: "purpose-reflection",
        title: "Reflect on purpose and direction",
        description: "Connect today's pressure to the future you are trying to build.",
        durationMinutes: 40,
        effects: {
          needs: { purpose: 10, stress: -3 },
          mentalWellbeing: { purposeClarity: 9, motivation: 5, index: 3 },
          education: { learningEfficiency: 2 },
          career: { readiness: 1 },
          habits: { reflection: 5 },
          capability: { decisionMaking: 2 }
        },
        consequence: "Purpose became clearer, making career and education choices easier to judge.",
        reflection: "Which future version of yourself are you practicing for?"
      }
    ]
  };
})();
