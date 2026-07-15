(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  const locations = ["HDB void deck", "MRT station", "Food Court", "Mall", "Park", "Work district", "Library"];

  function rotateLocation(index, day) {
    return locations[(index + day) % locations.length];
  }

  function simulateNPCs(state, days = 1) {
    const safeDays = Math.max(1, Math.min(365, Math.round(Number(days) || 1)));
    const summaries = [];
    state.npcs = (state.npcs || []).map((npc, index) => {
      const focus = chooseFocus(npc, state);
      const relationshipDrift = state.relationships.neglectRisk > 60 ? -Math.ceil(safeDays * 0.12) : Math.ceil(state.npcSimulation.communityTrust * safeDays * 0.003);
      const wellbeingDrift = focus === "recovery" ? Math.ceil(safeDays * 0.18) : state.economy.costOfLivingIndex > 70 ? -Math.ceil(safeDays * 0.1) : Math.ceil(safeDays * 0.05);
      const moneyDelta = focus === "career" ? Math.round(safeDays * 8) : focus === "study" ? -Math.round(safeDays * 2) : 0;
      const progressDelta = focus === "career" || focus === "study" ? Math.ceil(safeDays * 0.2) : Math.ceil(safeDays * 0.08);
      const updated = {
        ...npc,
        scheduleFocus: focus.choice,
        lastUtilityScores: focus.scores,
        location: rotateLocation(index, state.time.day + safeDays),
        relationship: game.clamp(Number(npc.relationship || 0) + relationshipDrift),
        wellbeing: game.clamp(Number(npc.wellbeing || 0) + wellbeingDrift),
        money: Math.max(0, Math.round(Number(npc.money || 0) + moneyDelta - state.economy.costOfLivingIndex * safeDays * 0.02)),
        lifeProgress: game.clamp(Number(npc.lifeProgress || 0) + progressDelta),
        lastDecision: npcDecisionText(focus.choice, state)
      };
      summaries.push(`${updated.name} focused on ${focus.choice} near ${updated.location}.`);
      return updated;
    });
    state.npcSimulation.lastSimulatedDay = state.time.day;
    state.npcSimulation.communityTrust = game.clamp(state.npcSimulation.communityTrust + state.relationships.support * 0.01 - state.relationships.neglectRisk * 0.02);
    state.npcSimulation.socialOpportunities = game.clamp(state.npcSimulation.socialOpportunities + state.relationships.network * 0.02);
    state.npcSimulation.labourCompetition = game.clamp(state.npcSimulation.labourCompetition + Math.max(0, 60 - state.economy.jobMarket) * 0.03);
    return summaries;
  }

  // Utility AI (bible S11.6 / S16.5): every candidate action gets a score
  // built from the NPC's needs, personality, and world context; the highest
  // score wins. Personality shifts the weights rather than hard-branching on
  // NPC index, so the SAME conditions produce different choices for a
  // disciplined NPC vs a sociable one - "different personalities produce
  // different lifestyles" instead of every NPC following an identical script.
  function chooseFocus(npc, state) {
    const personality = npc.personality || {};
    const trait = (key) => Number(personality[key] || 50);

    const scores = {
      recovery: 15
        + Math.max(0, 100 - npc.wellbeing) * 0.5
        + Math.max(0, state.needs.stress - 50) * 0.3
        + Math.max(0, 50 - trait("patience")) * 0.2,
      study: 8
        + trait("discipline") * 0.35
        + trait("curiosity") * 0.3
        + state.npcSimulation.studyCulture * 0.2
        - trait("riskTolerance") * 0.05,
      career: 8
        + trait("responsibility") * 0.3
        + trait("riskTolerance") * 0.2
        + trait("discipline") * 0.15
        + Math.max(0, state.economy.jobMarket - 40) * 0.4,
      community: 8
        + trait("sociability") * 0.45
        + trait("optimism") * 0.15
        + Math.max(0, 50 - state.relationships.support) * 0.2,
      routine: 22 + trait("patience") * 0.2
    };

    let choice = "routine";
    let best = -Infinity;
    Object.keys(scores).forEach((key) => {
      if (scores[key] > best) {
        best = scores[key];
        choice = key;
      }
    });
    return { choice, scores };
  }

  function npcDecisionText(focus, state) {
    if (focus === "career") return state.economy.jobMarket > 60 ? "Applied for a better role" : "Protected current work hours";
    if (focus === "study") return "Built study progress around transport time";
    if (focus === "recovery") return "Chose rest because pressure was too high";
    if (focus === "community") return "Checked in with people nearby";
    return "Followed a normal daily routine";
  }

  function updateNpcRelationship(state, npcId, delta) {
    state.npcs = (state.npcs || []).map((npc) => npc.id === npcId
      ? { ...npc, relationship: game.clamp(Number(npc.relationship || 0) + Number(delta || 0)) }
      : npc);
  }

  game.npcSimulationSystem = {
    id: "npcSimulation",
    title: "NPC Simulation",
    chapter: "Chapter 16",
    summary(state) {
      return `${(state.npcs || []).length} district residents - community trust ${state.npcSimulation.communityTrust}/100.`;
    },
    metrics(state) {
      return [
        ["NPCs", (state.npcs || []).length],
        ["Community", state.npcSimulation.communityTrust],
        ["Social chances", state.npcSimulation.socialOpportunities],
        ["Competition", state.npcSimulation.labourCompetition]
      ];
    },
    actions: [
      {
        id: "greet-neighbour",
        title: "Greet a neighbour",
        description: "Turn the district from scenery into a social environment.",
        durationMinutes: 20,
        effects: {
          needs: { social: 4, stress: -2 },
          relationships: { support: 3, trust: 3, neglectRisk: -2 },
          npcSimulation: { communityTrust: 5, socialOpportunities: 3 },
          mentalWellbeing: { loneliness: -3, happiness: 2 },
          capability: { communication: 1 }
        },
        after(state) {
          updateNpcRelationship(state, "npc-auntie-lim", 7);
        },
        consequence: "A small social action increased community trust and made local support more visible.",
        reflection: "Who around you is easy to ignore but part of your real support world?"
      },
      {
        id: "study-with-peer",
        title: "Study with a peer",
        description: "Use another person's routine to strengthen your own study consistency.",
        durationMinutes: 100,
        effects: {
          needs: { energy: -7, social: 5, stress: 2, purpose: 8 },
          education: { studyConsistency: 6, learningEfficiency: 4, credits: 2 },
          relationships: { friends: 4, network: 2 },
          npcSimulation: { studyCulture: 5 },
          skills: { learning: 4, social: 1 },
          capability: { discipline: 2 }
        },
        after(state) {
          updateNpcRelationship(state, "npc-maya", 8);
        },
        consequence: "Peer study improved learning and social support at the same time.",
        reflection: "Which peer habit would make your own routine stronger?"
      },
      {
        id: "ask-mentor",
        title: "Ask a mentor for advice",
        description: "Use NPC experience to make career choices less random.",
        durationMinutes: 60,
        effects: {
          needs: { energy: -3, stress: -2, purpose: 8 },
          career: { readiness: 4, interviewPrep: 3, reputation: 2 },
          relationships: { network: 6, communication: 3 },
          npcSimulation: { socialOpportunities: 4, labourCompetition: -2 },
          skills: { career: 3 },
          capability: { decisionMaking: 2, communication: 2 }
        },
        after(state) {
          updateNpcRelationship(state, "npc-daniel", 8);
        },
        consequence: "Mentor advice connected NPC experience to your career readiness and decision-making.",
        reflection: "What advice is useful because it came from lived experience?"
      },
      {
        id: "observe-district-routine",
        title: "Observe district routines",
        description: "Notice how other people's schedules are shaped by work, transport, money, and recovery.",
        durationMinutes: 45,
        effects: {
          needs: { purpose: 4, stress: -1 },
          npcSimulation: { communityTrust: 2, socialOpportunities: 2 },
          transportation: { timeFlexibility: 1 },
          housing: { satisfaction: 1 },
          economy: { opportunityIndex: 1 },
          skills: { lifeManagement: 3 },
          capability: { decisionMaking: 2 }
        },
        after(state) {
          simulateNPCs(state, 1);
        },
        consequence: "Observing the world revealed how NPC lives connect to transport, work, housing, and wellbeing.",
        reflection: "Which adult routine looked sustainable, and which looked fragile?"
      }
    ]
  };

  game.simulateNPCs = simulateNPCs;
})();
