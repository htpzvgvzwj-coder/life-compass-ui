(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  game.careerSystem = {
    id: "career",
    title: "Career",
    chapter: "Chapter 07",
    summary(state) {
      return `${state.career.status} - readiness ${state.career.readiness}/100, burnout ${state.career.burnoutRisk}/100.`;
    },
    metrics(state) {
      return [
        ["Readiness", state.career.readiness],
        ["Performance", state.career.performance],
        ["Burnout", state.career.burnoutRisk],
        ["Reputation", state.career.reputation]
      ];
    },
    actions: [
      {
        id: "prepare-portfolio",
        title: "Prepare portfolio",
        description: "Spend focused time improving proof of skill before applying.",
        durationMinutes: 120,
        effects: {
          needs: { energy: -7, stress: 4, purpose: 7 },
          career: { readiness: 6, reputation: 2, interviewPrep: 4 },
          skills: { career: 5, learning: 1 },
          habits: { studyConsistency: 2 },
          capability: { discipline: 2, decisionMaking: 1 }
        },
        consequence: "Your career readiness improved because you built evidence before chasing opportunities.",
        reflection: "What skill proof would make the next opportunity more realistic?"
      },
      {
        id: "apply-entry-role",
        title: "Apply for entry role",
        description: "Send an application and accept uncertainty instead of waiting forever.",
        durationMinutes: 90,
        effects: {
          needs: { energy: -5, stress: 6, purpose: 4 },
          career: { readiness: 2, interviewPrep: 2 },
          capability: { decisionMaking: 2, responsibility: 1 }
        },
        after(state) {
          const chance = state.career.readiness + state.career.interviewPrep + state.player.skills.career;
          const status = chance >= 85 ? "Interview offered" : "Needs more preparation";
          state.career.applications = [
            ...(state.career.applications || []),
            { role: "Entry role", status, day: state.time.day }
          ].slice(-20);
          if (status === "Interview offered") {
            state.career.status = "Interview stage";
            state.career.reputation = game.clamp(state.career.reputation + 4);
          }
        },
        consequence: "Applying created a real career possibility, but also revealed whether preparation is strong enough.",
        reflection: "Did you apply from preparation, pressure, or avoidance?"
      },
      {
        id: "work-overtime",
        title: "Accept overtime",
        description: "Earn more this week while risking recovery and wellbeing.",
        durationMinutes: 180,
        effects: {
          finance: { money: 45 },
          needs: { energy: -14, hunger: -6, stress: 12, social: -8 },
          career: { performance: 3, burnoutRisk: 9, experience: 3 },
          health: { physical: -2 },
          mentalWellbeing: { motivation: -2 },
          relationships: { friends: -2 }
        },
        consequence: "Overtime increased income and performance, but raised burnout risk and reduced personal time.",
        reflection: "Was the extra money worth the hidden cost?"
      }
    ]
  };
})();
