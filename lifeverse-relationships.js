(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  game.relationshipSystem = {
    id: "relationships",
    title: "Relationships",
    chapter: "Chapter 12",
    summary(state) {
      return `Support ${state.relationships.support}/100, friends ${state.relationships.friends}/100, neglect risk ${state.relationships.neglectRisk}/100.`;
    },
    metrics(state) {
      return [
        ["Support", state.relationships.support],
        ["Family", state.relationships.family],
        ["Friends", state.relationships.friends],
        ["Network", state.relationships.network]
      ];
    },
    actions: [
      {
        id: "meet-friends",
        title: "Meet friends after class",
        description: "Spend time and a little money to protect friendship and emotional support.",
        durationMinutes: 120,
        effects: {
          finance: { money: -12 },
          needs: { energy: -6, social: 14, stress: -7, purpose: 3 },
          relationships: { friends: 10, support: 5, trust: 4, neglectRisk: -6 },
          mentalWellbeing: { loneliness: -8, happiness: 6, motivation: 2 },
          transportation: { commuteStress: 2 },
          skills: { social: 3 },
          capability: { communication: 2 }
        },
        consequence: "Friendship support improved, but the choice used time, energy, transport, and spending money.",
        reflection: "Which relationship helps you make better life choices?"
      },
      {
        id: "family-dinner",
        title: "Spend time with family",
        description: "Choose presence at home instead of treating family as background noise.",
        durationMinutes: 90,
        effects: {
          needs: { social: 10, stress: -5, hunger: 6, energy: -3 },
          relationships: { family: 9, support: 5, trust: 3, neglectRisk: -5 },
          housing: { satisfaction: 2, comfort: 1 },
          mentalWellbeing: { loneliness: -5, resilience: 3 },
          capability: { communication: 2, responsibility: 1 }
        },
        consequence: "Family support became stronger and home felt more stable, but it required intentional time.",
        reflection: "What support do you receive at home that you sometimes overlook?"
      },
      {
        id: "have-a-hard-conversation-with-family",
        title: "Have a hard conversation with family",
        description: "Bring up the thing that's been sitting unspoken, instead of letting distance grow around it.",
        durationMinutes: 60,
        effects: {
          needs: { stress: 4, purpose: 5 },
          capability: { communication: 1 }
        },
        after(state) {
          const outcomeScore = state.player.capability.communication + state.player.skills.social * 0.5;
          const good = outcomeScore >= 70;
          if (good) {
            state.relationships.family = game.clamp(state.relationships.family + 15);
            state.relationships.trust = game.clamp(state.relationships.trust + 8);
            state.needs.stress = game.clamp(state.needs.stress - 6);
          } else {
            state.relationships.family = game.clamp(state.relationships.family + 3);
            state.needs.stress = game.clamp(state.needs.stress + 5);
          }
          if (game.addEvent) {
            game.addEvent(state, {
              type: "relationships",
              title: good ? "A real conversation with family" : "A tense conversation with family",
              summary: good ? "It was hard, and it actually helped." : "It was hard, and it stayed hard - but it's said now.",
              systems: ["Relationships"],
              consequences: good
                ? [`Family relationship is now ${state.relationships.family}/100.`, `Trust is now ${state.relationships.trust}/100.`]
                : [`Family relationship only moved to ${state.relationships.family}/100.`, "Communication skill still grew a little from just doing it."],
              reflection: good
                ? "What made it possible to actually say this?"
                : "What's still unsaid, even after this conversation?"
            });
          }
        },
        consequence: "Some conversations don't feel finished right after you have them - that doesn't mean they didn't matter.",
        reflection: "How long had this actually been sitting unspoken?"
      },
      {
        id: "networking-chat",
        title: "Talk to someone in your field",
        description: "Build a real professional connection instead of relying only on applications.",
        durationMinutes: 75,
        effects: {
          needs: { energy: -5, stress: 4, social: 5, purpose: 7 },
          relationships: { network: 9, communication: 4, trust: 2 },
          career: { reputation: 5, readiness: 3, interviewPrep: 2 },
          education: { portfolio: 2 },
          skills: { career: 3, social: 3 },
          capability: { communication: 3, decisionMaking: 1 }
        },
        consequence: "Networking created opportunity knowledge that supports career and education decisions.",
        reflection: "What did you learn from another person's path that you could apply realistically?"
      },
      {
        id: "dating-values",
        title: "Clarify dating and relationship values",
        description: "Reflect on boundaries, respect, time, and balance before entering a serious relationship.",
        durationMinutes: 45,
        effects: {
          needs: { stress: -3, purpose: 6 },
          relationships: { valuesClarity: 9, communication: 4, trust: 2 },
          mentalWellbeing: { confidence: 4, resilience: 3, purposeClarity: 5 },
          capability: { decisionMaking: 2, communication: 2 }
        },
        consequence: "Relationship values became clearer, lowering the risk of choosing from pressure or loneliness.",
        reflection: "What boundary protects your future self?"
      }
    ]
  };
})();
