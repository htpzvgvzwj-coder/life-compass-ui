(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  game.healthSystem = {
    id: "health",
    title: "Health",
    chapter: "Chapter 13",
    summary(state) {
      return `Physical ${state.health.physical}/100, sleep ${state.health.sleepQuality}/100, illness risk ${state.health.illnessRisk}/100.`;
    },
    metrics(state) {
      return [
        ["Physical", state.health.physical],
        ["Sleep", state.health.sleepQuality],
        ["Nutrition", state.health.nutrition],
        ["Illness risk", state.health.illnessRisk]
      ];
    },
    actions: [
      {
        id: "sleep-recovery",
        title: "Sleep early for recovery",
        description: "Give up late-night screen time so tomorrow's choices start with more energy.",
        durationMinutes: 480,
        effects: {
          needs: { energy: 22, sleep: 24, stress: -10, social: -3 },
          health: { sleepQuality: 12, recovery: 14, illnessRisk: -7, stamina: 6 },
          mentalWellbeing: { burnoutRisk: -8, motivation: 4, resilience: 4 },
          career: { burnoutRisk: -4 },
          education: { learningEfficiency: 3 },
          habits: { sleepRoutine: 8 },
          capability: { discipline: 2 }
        },
        consequence: "Recovery improved health, learning efficiency, and burnout risk, but reduced evening free time.",
        reflection: "What usually steals sleep from your future self?"
      },
      {
        id: "balanced-meal",
        title: "Choose a balanced meal",
        description: "Spend slightly more for food that supports energy instead of only fullness.",
        durationMinutes: 40,
        effects: {
          finance: { money: -10 },
          needs: { hunger: 18, energy: 5, stress: -2 },
          health: { nutrition: 10, physical: 3, illnessRisk: -3 },
          mentalWellbeing: { motivation: 2 },
          economy: { consumerPressure: -1 }
        },
        consequence: "Nutrition improved short-term energy and long-term health, while money decreased.",
        reflection: "When is paying for better food an investment instead of a luxury?"
      },
      {
        id: "exercise-routine",
        title: "Do a realistic workout",
        description: "Exercise enough to build stamina without pretending you have unlimited energy.",
        durationMinutes: 70,
        effects: {
          needs: { energy: -9, hunger: -5, stress: -8, hygiene: -5 },
          health: { physical: 7, activity: 10, stamina: 7, illnessRisk: -2 },
          mentalWellbeing: { happiness: 4, confidence: 3, burnoutRisk: -3 },
          habits: { exercise: 7 },
          capability: { discipline: 2 }
        },
        consequence: "Exercise improved stamina and mood, but created recovery needs.",
        reflection: "What level of exercise can you repeat, not just perform once?"
      },
      {
        id: "medical-visit",
        title: "Visit a clinic",
        description: "Address symptoms early instead of waiting for health to collapse.",
        durationMinutes: 100,
        canPerform(state) {
          return state.finance.money >= 35 || "You need at least $35 cash for this clinic visit.";
        },
        effects: {
          finance: { money: -35 },
          needs: { stress: -4, energy: -4 },
          health: { illnessRisk: -14, recovery: 12, medicalAccess: 6, physical: 3 },
          mentalWellbeing: { confidence: 2, resilience: 2 },
          transportation: { commuteStress: 2 }
        },
        consequence: "Medical care reduced illness risk and improved recovery, but cost money and time.",
        reflection: "What small symptom should not be ignored?"
      }
    ]
  };
})();
