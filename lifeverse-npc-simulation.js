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
      const focus = chooseFocus(npc, state, index);
      const relationshipDrift = state.relationships.neglectRisk > 60 ? -Math.ceil(safeDays * 0.12) : Math.ceil(state.npcSimulation.communityTrust * safeDays * 0.003);
      const wellbeingDrift = focus === "recovery" ? Math.ceil(safeDays * 0.18) : state.economy.costOfLivingIndex > 70 ? -Math.ceil(safeDays * 0.1) : Math.ceil(safeDays * 0.05);
      const moneyDelta = focus === "career" ? Math.round(safeDays * 8) : focus === "study" ? -Math.round(safeDays * 2) : 0;
      const progressDelta = focus === "career" || focus === "study" ? Math.ceil(safeDays * 0.2) : Math.ceil(safeDays * 0.08);
      const updated = {
        ...npc,
        scheduleFocus: focus,
        location: rotateLocation(index, state.time.day + safeDays),
        relationship: game.clamp(Number(npc.relationship || 0) + relationshipDrift),
        wellbeing: game.clamp(Number(npc.wellbeing || 0) + wellbeingDrift),
        money: Math.max(0, Math.round(Number(npc.money || 0) + moneyDelta - state.economy.costOfLivingIndex * safeDays * 0.02)),
        lifeProgress: game.clamp(Number(npc.lifeProgress || 0) + progressDelta),
        lastDecision: npcDecisionText(focus, state)
      };
      summaries.push(`${updated.name} focused on ${focus} near ${updated.location}.`);
      return updated;
    });
    state.npcSimulation.lastSimulatedDay = state.time.day;
    state.npcSimulation.communityTrust = game.clamp(state.npcSimulation.communityTrust + state.relationships.support * 0.01 - state.relationships.neglectRisk * 0.02);
    state.npcSimulation.socialOpportunities = game.clamp(state.npcSimulation.socialOpportunities + state.relationships.network * 0.02);
    state.npcSimulation.labourCompetition = game.clamp(state.npcSimulation.labourCompetition + Math.max(0, 60 - state.economy.jobMarket) * 0.03);
    return summaries;
  }

  function chooseFocus(npc, state, index) {
    if (state.needs.stress > 75 || npc.wellbeing < 35) return "recovery";
    if (index === 0 && state.npcSimulation.studyCulture >= 45) return "study";
    if (index === 1 && state.economy.jobMarket >= 45) return "career";
    if (state.relationships.support < 45) return "community";
    return npc.scheduleFocus || "routine";
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
