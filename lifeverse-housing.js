(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  game.housingSystem = {
    id: "housing",
    title: "Housing",
    chapter: "Chapter 10",
    summary(state) {
      return `${state.housing.type} - comfort ${state.housing.comfort}/100, affordability ${state.housing.affordability}/100.`;
    },
    metrics(state) {
      const base = [
        ["Stability", state.housing.stability],
        ["Comfort", state.housing.comfort],
        ["Affordability", state.housing.affordability],
        ["Commute", state.housing.commuteMinutes],
        ["Furniture", state.housing.furnitureLevel],
        ["Neighbourhood ties", state.housing.communityTies]
      ];
      if (state.housing.lease && state.housing.lease.active) {
        base.push(
          ["Lease days left", Math.max(0, state.housing.lease.endsDay - state.time.day)],
          ["Landlord relationship", state.housing.lease.landlordRelationship],
          ["Eviction risk", state.housing.lease.evictionRisk]
        );
      }
      return base;
    },
    actions: [
      {
        id: "sign-a-lease",
        title: "Sign a lease",
        description: "Take on a real, formal housing commitment - a deposit, a monthly rent, and a landlord who expects to be paid on time.",
        durationMinutes: 150,
        canPerform(state) {
          if (state.housing.lease.active) return "You already have an active lease.";
          return state.finance.money >= 300 || "You need at least $300 in cash to cover the deposit.";
        },
        effects: {
          needs: { energy: -8, stress: 6, purpose: 10 },
          capability: { decisionMaking: 2, responsibility: 2 }
        },
        after(state) {
          state.finance.money = Math.max(0, Math.round(state.finance.money - 300));
          state.housing.type = "Own leased apartment";
          state.housing.selectedOption = "leased-apartment";
          state.housing.monthlyCost = 300;
          state.housing.lease = {
            active: true,
            termDays: 180,
            startedDay: state.time.day,
            endsDay: state.time.day + 180,
            depositAmount: 300,
            landlordRelationship: 60,
            missedPayments: 0,
            evictionRisk: 0
          };
          if (game.addAchievement) game.addAchievement(state, "first-lease-signed", "First Lease Signed", "Signed a real lease with its own term, deposit, and rent obligations.");
          if (game.addMilestone) game.addMilestone(state, "Signed first lease", "Took on a formal housing commitment with real stakes.");
        },
        consequence: "A $300 deposit paid, $300/month due, a 180-day term, and a landlord who now expects to be paid on time.",
        reflection: "What happens if you can't make a payment?"
      },
      {
        id: "talk-to-landlord",
        title: "Talk to your landlord",
        description: "Keep the relationship with the person who controls your housing in good shape.",
        durationMinutes: 30,
        canPerform(state) {
          return state.housing.lease.active || "You do not currently have an active lease to manage.";
        },
        effects: {
          needs: { social: 3, stress: -2, purpose: 2 },
          capability: { communication: 1 }
        },
        after(state) {
          state.housing.lease.landlordRelationship = game.clamp(state.housing.lease.landlordRelationship + 10);
          state.housing.lease.evictionRisk = game.clamp(state.housing.lease.evictionRisk - 15);
        },
        consequence: "A little communication before a problem grows is cheaper than fixing it after.",
        reflection: "Is this a relationship you've been avoiding?"
      },
      {
        id: "clean-maintain-home",
        title: "Clean and maintain home",
        description: "Use time to improve the place that supports every day.",
        durationMinutes: 90,
        effects: {
          needs: { energy: -6, hygiene: 8, stress: -5, purpose: 4 },
          housing: { comfort: 7, maintenance: 8, satisfaction: 5 },
          health: { physical: 1 },
          habits: { reflection: 1 },
          capability: { responsibility: 2 }
        },
        consequence: "Home maintenance improved comfort and reduced background stress.",
        reflection: "How does your environment affect your decisions?"
      },
      {
        id: "compare-rental-options",
        title: "Compare rental options",
        description: "Study cost, commute, safety, and comfort before moving.",
        durationMinutes: 120,
        effects: {
          needs: { energy: -5, stress: 4, purpose: 8 },
          housing: { affordability: 4, safety: 2 },
          transportation: { timeFlexibility: 2 },
          skills: { finance: 2, lifeManagement: 4 },
          capability: { decisionMaking: 3 }
        },
        consequence: "Comparing housing options made trade-offs clearer before committing money.",
        reflection: "Which housing trade-off matters most for your current life?"
      },
      {
        id: "move-near-work",
        title: "Move closer to work",
        description: "Pay more rent to reduce commute stress and regain time.",
        durationMinutes: 240,
        effects: {
          finance: { money: -180, dailyLivingCost: 4 },
          needs: { energy: -12, stress: -6, purpose: 5 },
          housing: { comfort: 6, commuteMinutes: -15, affordability: -10, monthlyCost: 180, satisfaction: 5 },
          transportation: { commuteStress: -8, monthlyCost: -20, timeFlexibility: 8 },
          mentalWellbeing: { motivation: 3 }
        },
        after(state) {
          state.housing.type = "Small room near work";
          state.housing.selectedOption = "near-work-room";
        },
        consequence: "Moving reduced commute pressure but increased recurring housing costs.",
        reflection: "Did buying time create enough value to justify the rent?"
      },
      {
        id: "buy-furniture",
        title: "Buy furniture and home essentials",
        description: "Turn an empty room into somewhere you actually want to spend time.",
        durationMinutes: 90,
        canPerform(state) {
          return state.finance.money >= 120 || "You need at least $120 in cash to furnish the place properly.";
        },
        effects: {
          needs: { energy: -5, purpose: 4 },
          housing: { comfort: 6, satisfaction: 6 },
          capability: { responsibility: 1 }
        },
        after(state) {
          state.finance.money = Math.max(0, Math.round(state.finance.money - 120));
          state.housing.furnitureLevel = game.clamp(state.housing.furnitureLevel + 20);
        },
        consequence: "A properly furnished home raises daily comfort, but furniture is a real, one-time cash cost.",
        reflection: "Did this purchase make the space feel more like yours?"
      },
      {
        id: "pay-utility-bills",
        title: "Pay utility bills",
        description: "Keep electricity, water, and basic services running without interruption.",
        durationMinutes: 20,
        effects: {
          needs: { hygiene: 4, purpose: 2 },
          housing: { comfort: 2 },
          capability: { responsibility: 1 }
        },
        after(state) {
          const overdue = Math.max(0, state.time.day - state.housing.lastUtilityPaidDay - 30);
          const bill = Math.round(35 + overdue * 1.5);
          state.finance.money = Math.max(0, Math.round(state.finance.money - bill));
          state.housing.lastUtilityPaidDay = state.time.day;
        },
        consequence: "Paying on time avoids a larger bill later - utilities left unpaid too long quietly cost more, not less.",
        reflection: "Is this the kind of bill that is easy to forget until it becomes a real problem?"
      },
      {
        id: "upgrade-internet",
        title: "Upgrade home internet",
        description: "Pay for a faster, more reliable connection that supports remote study and work.",
        durationMinutes: 45,
        canPerform(state) {
          if (state.housing.internetConnected) return "Home internet is already upgraded.";
          return state.finance.money >= 80 || "You need at least $80 in cash to upgrade the connection.";
        },
        effects: {
          needs: { purpose: 4 },
          education: { learningEfficiency: 5 },
          career: { readiness: 3 },
          skills: { learning: 2 },
          capability: { decisionMaking: 1 }
        },
        after(state) {
          state.finance.money = Math.max(0, Math.round(state.finance.money - 80));
          state.housing.internetConnected = true;
          state.housing.monthlyCost = Math.max(0, Math.round(state.housing.monthlyCost + 15));
        },
        consequence: "A reliable connection removes a recurring source of friction from both study and work, for a small recurring cost.",
        reflection: "How much time has a slow or unreliable connection cost you in the past?"
      },
      {
        id: "find-roommate",
        title: "Find a roommate",
        description: "Share the space and the rent - and take on a new relationship to manage.",
        durationMinutes: 120,
        canPerform(state) {
          return !state.housing.hasRoommate || "You already have a roommate.";
        },
        effects: {
          needs: { energy: -6, social: 6, stress: 5, purpose: 5 },
          relationships: { network: 2 },
          capability: { communication: 2 }
        },
        after(state) {
          state.housing.hasRoommate = true;
          state.housing.roommateRelationship = 45;
          state.housing.monthlyCost = Math.max(0, Math.round(state.housing.monthlyCost * 0.65));
          state.housing.affordability = game.clamp(state.housing.affordability + 8);
        },
        consequence: "Splitting the cost of a home immediately improves affordability, but shared space adds a relationship you now have to maintain.",
        reflection: "What boundary will matter most for sharing this space well?"
      },
      {
        id: "manage-roommate-relationship",
        title: "Check in with your roommate",
        description: "Keep a shared living arrangement running smoothly with a short, honest conversation.",
        durationMinutes: 30,
        canPerform(state) {
          return state.housing.hasRoommate || "You do not currently have a roommate.";
        },
        effects: {
          needs: { social: 4, stress: -3, purpose: 3 },
          relationships: { support: 2, communication: 2 },
          capability: { communication: 1 }
        },
        after(state) {
          state.housing.roommateRelationship = game.clamp(state.housing.roommateRelationship + 10);
        },
        consequence: "A little regular communication prevents small shared-living frictions from becoming resentment.",
        reflection: "What would happen to this arrangement if you never had this conversation?"
      },
      {
        id: "end-roommate-arrangement",
        title: "End the roommate arrangement",
        description: "Trade a lower monthly cost for full privacy and control over the space again.",
        durationMinutes: 60,
        canPerform(state) {
          return state.housing.hasRoommate || "You do not currently have a roommate to move out.";
        },
        effects: {
          needs: { stress: 4, purpose: 2 },
          housing: { comfort: 3 }
        },
        after(state) {
          state.housing.hasRoommate = false;
          state.housing.roommateRelationship = 0;
          state.housing.monthlyCost = Math.max(0, Math.round(state.housing.monthlyCost / 0.65));
          state.housing.affordability = game.clamp(state.housing.affordability - 8);
        },
        consequence: "Regaining full privacy raised the monthly cost back up - shared housing was trading space for affordability.",
        reflection: "Was the trade-off worth reversing, or did circumstances just change?"
      },
      {
        id: "get-to-know-neighbourhood",
        title: "Get to know the neighbourhood",
        description: "Spend unhurried time noticing the people and rhythms nearby.",
        durationMinutes: 60,
        effects: {
          needs: { social: 4, stress: -3, purpose: 4 },
          housing: { safety: 2, satisfaction: 2 },
          mentalWellbeing: { loneliness: -3 },
          capability: { communication: 1 }
        },
        after(state) {
          state.housing.communityTies = game.clamp(state.housing.communityTies + 10);
          state.npcSimulation.communityTrust = game.clamp(state.npcSimulation.communityTrust + 3);
        },
        consequence: "A place starts to feel like home once its people stop being strangers.",
        reflection: "Which neighbour would you actually recognise by name?"
      },
      {
        id: "join-neighbourhood-watch",
        title: "Join the neighbourhood watch",
        description: "Take on a small civic responsibility that makes the whole block a little safer.",
        durationMinutes: 90,
        canPerform(state) {
          return state.housing.communityTies >= 40 || "Build more familiarity with the neighbourhood first - this needs some existing trust to join.";
        },
        effects: {
          needs: { energy: -6, purpose: 8 },
          housing: { safety: 6 },
          relationships: { network: 3, trust: 2 },
          capability: { responsibility: 2, communication: 1 }
        },
        after(state) {
          state.housing.communityTies = game.clamp(state.housing.communityTies + 6);
          state.npcSimulation.communityTrust = game.clamp(state.npcSimulation.communityTrust + 5);
        },
        consequence: "Formal civic participation compounds on top of informal familiarity - safety here was built, not given.",
        reflection: "What does this neighbourhood owe you, and what do you owe it?"
      }
    ]
  };
})();
