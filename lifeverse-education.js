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
      return [
        ["Consistency", state.education.studyConsistency],
        ["Efficiency", state.education.learningEfficiency],
        ["Credits", state.education.credits],
        ["Portfolio", state.education.portfolio]
      ];
    },
    actions: [
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
})();
