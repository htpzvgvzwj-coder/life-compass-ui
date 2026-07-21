(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  game.educationSystem = {
    id: "education",
    title: "Education",
    chapter: "Chapter 08",
    summary(state) {
      return `${state.education.path} - qualification progress ${state.education.qualificationProgress}/100.`;
    },
    metrics(state) {
      const base = [
        ["Consistency", state.education.studyConsistency],
        ["Efficiency", state.education.learningEfficiency],
        ["Credits", state.education.credits],
        ["Portfolio", state.education.portfolio]
      ];
      if (state.education.program && state.education.program.active) {
        base.push(
          ["Program days left", Math.max(0, state.education.program.endsDay - state.time.day)],
          ["Dropout risk", state.education.program.dropoutRisk]
        );
      }
      return base;
    },
    actions: [
      {
        id: "enroll-in-program",
        title: "Enroll in a real qualification program",
        description: "Commit to a formal program with real tuition and a real term - not a one-off short course.",
        durationMinutes: 180,
        canPerform(state) {
          if (state.education.program.active) return "You are already enrolled in a program.";
          return state.finance.money >= 250 || "You need at least $250 to cover tuition.";
        },
        effects: {
          needs: { energy: -10, stress: 8, purpose: 12 },
          capability: { decisionMaking: 2, responsibility: 1 }
        },
        after(state) {
          state.finance.money = Math.max(0, Math.round(state.finance.money - 250));
          state.education.path = "Enrolled in a formal program";
          state.education.enrolledProgram = "Certificate program";
          state.education.program = {
            active: true,
            termDays: 270,
            startedDay: state.time.day,
            endsDay: state.time.day + 270,
            tuitionPaid: 250,
            dropoutRisk: 0,
            completedCount: state.education.program.completedCount || 0
          };
          if (game.addAchievement) game.addAchievement(state, "enrolled-in-program", "Enrolled in a Real Program", "Paid real tuition and committed to a real term - not just a short course.");
        },
        consequence: "$250 in tuition paid in full, a 270-day term ahead - falling behind on coursework now risks dropping out.",
        reflection: "What would it take to actually finish this one?"
      },
      {
        id: "enroll-short-course",
        title: "Enroll in short course",
        description: "Invest money and time into a practical learning path.",
        durationMinutes: 60,
        effects: {
          finance: { money: -60 },
          needs: { stress: 5, purpose: 9 },
          education: { qualificationProgress: 8, learningEfficiency: 3, tuitionPressure: 4 },
          skills: { learning: 5, career: 2 },
          capability: { decisionMaking: 2 }
        },
        after(state) {
          state.education.enrolledProgram = "Practical skills short course";
          state.education.path = "Structured skill-building";
        },
        consequence: "Education became a deliberate investment, creating pressure now and options later.",
        reflection: "What future opportunity does this learning support?"
      },
      {
        id: "deep-study-session",
        title: "Deep study session",
        description: "Protect a serious learning block without multitasking.",
        durationMinutes: 150,
        effects: {
          needs: { energy: -10, stress: 4, purpose: 10, social: -4 },
          education: { studyConsistency: 7, learningEfficiency: 5, credits: 4, portfolio: 3 },
          skills: { learning: 6, career: 2 },
          habits: { studyConsistency: 6 },
          capability: { discipline: 3 }
        },
        consequence: "Deep study improved capability, but it required energy and social trade-offs.",
        reflection: "What helped you stay with the hard part?"
      },
      {
        id: "build-project",
        title: "Build a project",
        description: "Turn learning into visible evidence for career and confidence.",
        durationMinutes: 180,
        effects: {
          needs: { energy: -12, stress: 5, purpose: 12 },
          education: { portfolio: 9, qualificationProgress: 4 },
          career: { readiness: 5, reputation: 3 },
          skills: { learning: 4, career: 5 },
          capability: { discipline: 2, decisionMaking: 2 }
        },
        consequence: "A project converted study into proof, improving education and career readiness together.",
        reflection: "What did this project prove that a certificate alone could not?"
      }
    ]
  };

  // Same optional-helper shape as game.legalRecordPenalty (lifeverse-legal.js)
  // - a completed program should visibly make job applications easier, the
  // same way a criminal record visibly makes them harder.
  function qualificationBonus(state) {
    if (state.education.program && state.education.program.completedCount >= 1) return 15;
    if (state.education.qualificationProgress >= 70) return 8;
    return 0;
  }

  game.qualificationBonus = qualificationBonus;
})();
