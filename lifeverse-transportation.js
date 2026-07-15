(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  game.transportationSystem = {
    id: "transportation",
    title: "Transportation",
    chapter: "Chapter 11",
    summary(state) {
      return `${state.transportation.mode} - ${state.housing.commuteMinutes} min commute, reliability ${state.transportation.reliability}/100.`;
    },
    metrics(state) {
      return [
        ["Reliability", state.transportation.reliability],
        ["Commute stress", state.transportation.commuteStress],
        ["Flexibility", state.transportation.timeFlexibility],
        ["Monthly cost", state.transportation.monthlyCost],
        ["Vehicle condition", state.transportation.ownsVehicle ? state.transportation.vehicleMaintenance : "No vehicle"]
      ];
    },
    actions: [
      {
        id: "plan-commute",
        title: "Plan tomorrow's commute",
        description: "Check travel time before the morning becomes rushed.",
        durationMinutes: 25,
        effects: {
          needs: { stress: -4, purpose: 3 },
          transportation: { reliability: 5, commuteStress: -5, timeFlexibility: 3 },
          habits: { reflection: 1 },
          capability: { responsibility: 1 }
        },
        consequence: "Commute planning lowered tomorrow's uncertainty and protected time.",
        reflection: "What morning risk did planning remove?"
      },
      {
        id: "choose-public-transport",
        title: "Use MRT and bus",
        description: "Spend less money but accept crowding and fixed routes.",
        durationMinutes: 45,
        effects: {
          finance: { money: -4 },
          needs: { energy: -3, stress: 3 },
          transportation: { reliability: 2, commuteStress: 2, environmentalImpact: -2 },
          health: { activity: 1 }
        },
        after(state) {
          state.transportation.mode = "MRT and bus";
          state.transportation.selectedMode = "public-transport";
        },
        consequence: "Public transport kept costs low, but required patience and time awareness.",
        reflection: "How did travel cost affect the rest of your day?"
      },
      {
        id: "take-ride-hailing",
        title: "Take ride-hailing",
        description: "Save energy and time by spending more money.",
        durationMinutes: 25,
        effects: {
          finance: { money: -22 },
          needs: { energy: 3, stress: -4 },
          transportation: { commuteStress: -6, timeFlexibility: 5, environmentalImpact: 3 },
          habits: { budgeting: -1 }
        },
        after(state) {
          state.transportation.mode = "Ride-hailing";
          state.transportation.selectedMode = "ride-hailing";
        },
        consequence: "Ride-hailing reduced immediate stress, but increased daily spending.",
        reflection: "Was convenience solving a real need or becoming a habit?"
      },
      {
        id: "buy-vehicle-cash",
        title: "Buy a vehicle (pay in full)",
        description: "Own your own transport outright - a large one-time cost for lasting flexibility.",
        durationMinutes: 180,
        canPerform(state) {
          if (state.transportation.ownsVehicle) return "You already own a vehicle.";
          return state.finance.money >= 1800 || "You need at least $1,800 in cash to buy a vehicle outright.";
        },
        effects: {
          needs: { purpose: 5 },
          transportation: { commuteStress: -10, timeFlexibility: 15, environmentalImpact: 8 },
          capability: { responsibility: 1, decisionMaking: 1 }
        },
        after(state) {
          state.finance.money = Math.max(0, Math.round(state.finance.money - 1800));
          state.transportation.ownsVehicle = true;
          state.transportation.vehicleMaintenance = 85;
          state.transportation.mode = "Own vehicle";
          state.transportation.selectedMode = "own-vehicle";
          state.transportation.monthlyCost = Math.max(0, Math.round(state.transportation.monthlyCost + 60));
        },
        consequence: "Owning a vehicle outright removes a monthly loan payment, but the upfront cost used most of your available cash.",
        reflection: "What did paying in full free you from having to worry about later?"
      },
      {
        id: "finance-vehicle-loan",
        title: "Finance a vehicle with a loan",
        description: "Get a vehicle now and pay it off over time - more accessible today, more debt over time.",
        durationMinutes: 150,
        canPerform(state) {
          if (state.transportation.ownsVehicle) return "You already own a vehicle.";
          return state.finance.creditScore >= 580 || "You need at least a fair credit score (580+) to qualify for vehicle financing.";
        },
        effects: {
          needs: { stress: 4, purpose: 5 },
          transportation: { commuteStress: -8, timeFlexibility: 12, environmentalImpact: 8 },
          capability: { decisionMaking: 1 }
        },
        after(state) {
          state.finance.debt = Math.max(0, Math.round(state.finance.debt + 1800));
          state.transportation.vehicleLoanBalance = 1800;
          state.transportation.ownsVehicle = true;
          state.transportation.vehicleMaintenance = 85;
          state.transportation.mode = "Own vehicle (financed)";
          state.transportation.selectedMode = "own-vehicle";
          state.transportation.monthlyCost = Math.max(0, Math.round(state.transportation.monthlyCost + 90));
          if (game.recalculateCreditScore) game.recalculateCreditScore(state);
        },
        consequence: "Financing got you a vehicle today, but the loan balance and higher monthly cost will follow you until it's paid off.",
        reflection: "Does the flexibility this buys you outweigh carrying more debt?"
      },
      {
        id: "maintain-vehicle",
        title: "Get the vehicle serviced",
        description: "Pay for regular maintenance before a small problem becomes an expensive breakdown.",
        durationMinutes: 90,
        canPerform(state) {
          return state.transportation.ownsVehicle || "You do not own a vehicle to service.";
        },
        effects: {
          needs: { purpose: 3 },
          transportation: { reliability: 5 },
          capability: { responsibility: 1 }
        },
        after(state) {
          state.finance.money = Math.max(0, Math.round(state.finance.money - 80));
          state.transportation.vehicleMaintenance = game.clamp(state.transportation.vehicleMaintenance + 25);
        },
        consequence: "Regular servicing is a small, predictable cost - the alternative is an unpredictable, usually larger one.",
        reflection: "Is this the kind of cost that is easy to postpone until it is not optional anymore?"
      },
      {
        id: "secure-parking",
        title: "Secure a parking spot",
        description: "Rent a dedicated space instead of losing time and patience circling for one every day.",
        durationMinutes: 45,
        canPerform(state) {
          if (!state.transportation.ownsVehicle) return "You need a vehicle before parking matters.";
          return !state.transportation.parkingSecured || "You already have a secured parking spot.";
        },
        effects: {
          needs: { stress: -4, purpose: 2 },
          transportation: { commuteStress: -6, timeFlexibility: 6 },
          capability: { decisionMaking: 1 }
        },
        after(state) {
          state.transportation.parkingSecured = true;
          state.transportation.monthlyCost = Math.max(0, Math.round(state.transportation.monthlyCost + 25));
        },
        consequence: "A secured spot removes a small daily uncertainty at the cost of a small recurring fee.",
        reflection: "How much was the daily search for parking actually costing you in stress?"
      },
      {
        id: "sell-vehicle",
        title: "Sell the vehicle",
        description: "Trade ownership and flexibility back for cash and a lighter monthly budget.",
        durationMinutes: 120,
        canPerform(state) {
          return state.transportation.ownsVehicle || "You do not own a vehicle to sell.";
        },
        effects: {
          needs: { stress: 3 },
          transportation: { commuteStress: 8, timeFlexibility: -10, environmentalImpact: -8 }
        },
        after(state) {
          const saleValue = Math.round(1800 * (state.transportation.vehicleMaintenance / 100) * 0.6);
          const loanRemaining = state.transportation.vehicleLoanBalance || 0;
          const hadParking = state.transportation.parkingSecured;
          const payoff = Math.min(saleValue, loanRemaining);
          state.finance.debt = Math.max(0, Math.round(state.finance.debt - payoff));
          state.finance.money = Math.max(0, Math.round(state.finance.money + (saleValue - payoff)));
          state.transportation.monthlyCost = Math.max(0, Math.round(state.transportation.monthlyCost - (loanRemaining > 0 ? 90 : 60) - (hadParking ? 25 : 0)));
          state.transportation.ownsVehicle = false;
          state.transportation.parkingSecured = false;
          state.transportation.vehicleLoanBalance = 0;
          state.transportation.vehicleMaintenance = 70;
          state.transportation.mode = "MRT and bus";
          state.transportation.selectedMode = "public-transport";
          if (game.recalculateCreditScore) game.recalculateCreditScore(state);
        },
        consequence: "Selling recovered some cash based on the vehicle's condition, and removed its ongoing monthly cost - but also its convenience.",
        reflection: "Did keeping the vehicle maintained pay off in what it sold for?"
      }
    ]
  };
})();
