(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  const CATEGORY_LABELS = {
    technical: "Technical / Engineering",
    service: "Service / Retail",
    creative: "Creative / Design",
    community: "Community / Care"
  };

  function chooseCategory(state, category, incomeShift, skillEffects) {
    const switching = Boolean(state.career.category) && state.career.category !== category;
    state.career.category = category;
    state.career.status = switching ? `Switching to ${CATEGORY_LABELS[category]}` : `Pursuing ${CATEGORY_LABELS[category]}`;
    if (switching) {
      state.career.readiness = game.clamp(state.career.readiness - 10);
      state.career.experience = Math.max(0, Math.round(state.career.experience * 0.6));
    }
    state.career.incomePerShift = Math.max(40, Math.round(state.career.incomePerShift + incomeShift));
    Object.entries(skillEffects || {}).forEach(([key, value]) => {
      if (typeof state.player.skills[key] === "number") state.player.skills[key] = game.clamp(state.player.skills[key] + value);
    });
  }

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
        ["Reputation", state.career.reputation],
        ["Category", state.career.category ? CATEGORY_LABELS[state.career.category] : "Undeclared"],
        ["Employment", state.career.employed ? "Employed" : "Unemployed"]
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
          const chance = state.career.readiness + state.career.interviewPrep + state.player.skills.career
            + (game.legalRecordPenalty ? game.legalRecordPenalty(state) : 0)
            + (game.qualificationBonus ? game.qualificationBonus(state) : 0);
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
      },
      {
        id: "pursue-technical-track",
        title: "Pursue a technical career track",
        description: "Commit to engineering-style work - steep learning curve, strong long-term pay ceiling.",
        durationMinutes: 90,
        effects: {
          needs: { energy: -5, stress: 3, purpose: 6 },
          career: { readiness: 3, interviewPrep: 2 },
          capability: { discipline: 1 }
        },
        after(state) {
          chooseCategory(state, "technical", 12, { career: 4, learning: 3 });
        },
        consequence: "A technical track rewards deep skill-building with a higher income ceiling over time.",
        reflection: "Are you drawn to this because of the work itself, or the pay ceiling?"
      },
      {
        id: "pursue-service-track",
        title: "Pursue a service career track",
        description: "Commit to retail/service-style work - accessible now, steady rather than spectacular.",
        durationMinutes: 90,
        effects: {
          needs: { energy: -4, stress: 2, purpose: 5 },
          career: { readiness: 3, interviewPrep: 3 },
          capability: { communication: 1 }
        },
        after(state) {
          chooseCategory(state, "service", 4, { social: 4, career: 2 });
        },
        consequence: "Service work is easier to get hired into, with dependable but modest pay growth.",
        reflection: "What does 'steady' actually give you that 'high ceiling' does not?"
      },
      {
        id: "pursue-creative-track",
        title: "Pursue a creative career track",
        description: "Commit to design-style work - reputation and portfolio quality matter more than tenure.",
        durationMinutes: 90,
        effects: {
          needs: { energy: -5, stress: 4, purpose: 7 },
          career: { readiness: 2, reputation: 3 },
          capability: { decisionMaking: 1 }
        },
        after(state) {
          chooseCategory(state, "creative", 6, { learning: 4, career: 2 });
        },
        consequence: "Creative work rewards a visible portfolio and reputation more than time served.",
        reflection: "Is your current portfolio strong enough to back this choice up?"
      },
      {
        id: "pursue-community-track",
        title: "Pursue a community/care career track",
        description: "Commit to care-and-community-style work - lower pay ceiling, strong relational reward.",
        durationMinutes: 90,
        effects: {
          needs: { energy: -4, stress: -2, social: 6, purpose: 8 },
          career: { readiness: 2 },
          relationships: { support: 3 },
          capability: { communication: 1 }
        },
        after(state) {
          chooseCategory(state, "community", 2, { social: 5 });
        },
        consequence: "Community work pays less on average, but tends to protect relationships and wellbeing better.",
        reflection: "How much income would you trade for work that felt meaningful every day?"
      },
      {
        id: "request-promotion",
        title: "Ask for a promotion",
        description: "Proactively make the case for more responsibility and pay, instead of waiting to be offered one.",
        durationMinutes: 60,
        canPerform(state) {
          if (!state.career.employed) return "You need a job before you can ask for a promotion.";
          return (state.career.readiness >= 60 && state.career.performance >= 55 && state.career.reputation >= 50)
            || "Build more readiness, performance, and reputation before this conversation will land well.";
        },
        effects: {
          needs: { stress: 6, purpose: 6 },
          capability: { decisionMaking: 1, responsibility: 1 }
        },
        after(state) {
          state.career.incomePerShift = Math.round(state.career.incomePerShift * 1.2);
          state.career.performance = game.clamp(state.career.performance - 5);
          state.career.burnoutRisk = game.clamp(state.career.burnoutRisk + 8);
          state.career.readiness = game.clamp(state.career.readiness - 12);
          state.career.reputation = game.clamp(state.career.reputation + 8);
        },
        consequence: "Asking directly worked because the readiness, performance, and reputation were already there to back it up.",
        reflection: "What would have happened if you had asked before you were ready?"
      },
      {
        id: "search-for-work",
        title: "Search for work",
        description: "Actively look for a new role after losing your last one.",
        durationMinutes: 120,
        canPerform(state) {
          return !state.career.employed || "You already have work - this is for when you are between jobs.";
        },
        effects: {
          needs: { energy: -6, stress: 5, purpose: 5 },
          career: { readiness: 3, interviewPrep: 3 },
          capability: { decisionMaking: 1 }
        },
        after(state) {
          const readiness = state.career.readiness + state.career.interviewPrep + state.player.skills.career;
          if (readiness >= 70) {
            state.career.employed = true;
            state.career.status = state.career.category ? `Pursuing ${CATEGORY_LABELS[state.career.category]}` : "Entry preparation";
            state.career.reputation = game.clamp(state.career.reputation + 2);
            state.career.burnoutRisk = game.clamp(state.career.burnoutRisk - 5);
          }
        },
        consequence: "Every search either lands the next role or builds the readiness that gets the one after.",
        reflection: "What is different about your search this time versus last time?"
      },
      {
        id: "file-unemployment-support",
        title: "File for unemployment support",
        description: "Claim short-term financial support while you are between jobs.",
        durationMinutes: 60,
        canPerform(state) {
          if (state.career.employed) return "Unemployment support is only for when you are between jobs.";
          if (!state.career.lastUnemploymentClaimDay) return true;
          return (state.time.day - state.career.lastUnemploymentClaimDay) >= 21 || "Support was already claimed recently - this is meant to bridge gaps, not replace income.";
        },
        effects: {
          needs: { stress: -6, purpose: 3 },
          capability: { responsibility: 1 }
        },
        after(state) {
          state.finance.money = Math.round(state.finance.money + 180);
          state.career.lastUnemploymentClaimDay = state.time.day;
        },
        consequence: "Support covered some of the gap, but it is meant to be temporary, not a replacement for work.",
        reflection: "Does this cushion buy you time to search well, or time to avoid searching?"
      }
    ]
  };
})();
