(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  function recalculateCreditScore(state) {
    const finance = state.finance;
    const liquid = Math.max(0, finance.money) + Math.max(0, finance.savings);
    const debtRatio = finance.debt / Math.max(200, liquid + finance.debt);
    const savingsHealth = Math.min(1, finance.savings / 2000);
    const budgetingHabit = (state.player.habits.budgeting || 0) / 100;
    const investmentHealth = Math.min(1, (finance.investments.bonds + finance.investments.stocks + finance.investments.property) / 3000);
    // Payment history is a genuine formula input (not a one-off edit to
    // creditScore itself) precisely because this function fully recomputes
    // the score from scratch on nearly every finance action and every Fast
    // Forward chunk - a direct nudge to creditScore would just get
    // overwritten by the next call. Folding missed statement payments in
    // here is what makes them actually stick.
    const missedPayments = (finance.creditCard && finance.creditCard.missedPayments) || 0;
    const paymentHistoryPenalty = Math.min(1, missedPayments * 0.15);
    const raw = 300
      + (1 - debtRatio) * 300
      + savingsHealth * 130
      + budgetingHabit * 90
      + investmentHealth * 50
      - paymentHistoryPenalty * 100;
    finance.creditScore = Math.max(300, Math.min(850, Math.round(raw)));
    return finance.creditScore;
  }

  function creditTier(score) {
    if (score >= 740) return "Excellent";
    if (score >= 670) return "Good";
    if (score >= 580) return "Fair";
    return "Poor";
  }

  game.financeSystem = {
    id: "finance",
    title: "Finance",
    chapter: "Chapter 09",
    summary(state) {
      return `$${state.finance.money} cash, $${state.finance.savings} savings, $${state.finance.debt} debt, credit ${creditTier(state.finance.creditScore)}.`;
    },
    metrics(state) {
      const base = [
        ["Confidence", state.finance.confidence],
        ["Savings", state.finance.savings],
        ["Debt", state.finance.debt],
        ["Credit score", state.finance.creditScore]
      ];
      if (state.finance.creditCard && state.finance.creditCard.collectionsRisk > 0) {
        base.push(["Collections risk", state.finance.creditCard.collectionsRisk]);
      }
      return base;
    },
    actions: [
      {
        id: "set-week-budget",
        title: "Set weekly budget",
        description: "Plan spending before the week spends for you.",
        durationMinutes: 45,
        effects: {
          needs: { stress: -5, purpose: 6 },
          finance: { confidence: 8, dailyLivingCost: -1 },
          skills: { finance: 5 },
          habits: { budgeting: 6 },
          capability: { responsibility: 2, decisionMaking: 2 }
        },
        consequence: "Budgeting reduced uncertainty and made future spending easier to understand.",
        reflection: "Which expense needs a boundary this week?",
        after(state) {
          recalculateCreditScore(state);
        }
      },
      {
        id: "save-emergency-money",
        title: "Move money to emergency savings",
        description: "Trade short-term spending freedom for future stability.",
        durationMinutes: 20,
        effects: {
          finance: { money: -50, savings: 50, confidence: 5 },
          needs: { stress: -3, purpose: 5 },
          habits: { budgeting: 4 },
          capability: { responsibility: 2 }
        },
        consequence: "Savings increased future flexibility, but reduced money available today.",
        reflection: "What emergency would this protect you from?",
        after(state) {
          recalculateCreditScore(state);
        }
      },
      {
        id: "use-credit",
        title: "Buy now using credit",
        description: "Solve a want today by creating a future payment.",
        durationMinutes: 20,
        effects: {
          finance: { debt: 70, confidence: -5 },
          needs: { stress: 7, purpose: -3 },
          mentalWellbeing: { motivation: 1 }
        },
        consequence: "Credit gave immediate access, but increased future pressure.",
        reflection: "Was this debt creating opportunity or only delaying discomfort?",
        after(state) {
          recalculateCreditScore(state);
        }
      },
      {
        id: "buy-bonds",
        title: "Buy government bonds",
        description: "Lock money into a stable, low-volatility investment for steady long-term growth.",
        durationMinutes: 30,
        canPerform(state) {
          return state.finance.money >= 200 || "You need at least $200 in cash to buy bonds.";
        },
        effects: {
          needs: { stress: -2, purpose: 6 },
          finance: { confidence: 3 },
          skills: { finance: 4 },
          habits: { budgeting: 2 },
          capability: { decisionMaking: 2 }
        },
        after(state) {
          state.finance.money = Math.max(0, Math.round(state.finance.money - 200));
          state.finance.investments.bonds = Math.max(0, Math.round(state.finance.investments.bonds + 200));
          recalculateCreditScore(state);
        },
        consequence: "Bonds trade easy access to cash for a stable, predictable return over time.",
        reflection: "What long-term goal is this money now working toward instead of sitting idle?"
      },
      {
        id: "invest-in-stocks",
        title: "Invest in the stock market",
        description: "Accept real volatility for a higher potential return than bonds or savings.",
        durationMinutes: 30,
        canPerform(state) {
          return state.finance.money >= 150 || "You need at least $150 in cash to invest in stocks.";
        },
        effects: {
          needs: { stress: 5, purpose: 7 },
          skills: { finance: 5 },
          capability: { decisionMaking: 2 }
        },
        after(state) {
          state.finance.money = Math.max(0, Math.round(state.finance.money - 150));
          state.finance.investments.stocks = Math.max(0, Math.round(state.finance.investments.stocks + 150));
          recalculateCreditScore(state);
        },
        consequence: "Stocks can grow faster than bonds, but the value can also fall - this is real risk, not free money.",
        reflection: "Could you emotionally handle this money losing value for a while before it recovers?"
      },
      {
        id: "invest-in-property",
        title: "Invest in property",
        description: "Commit a large amount of capital toward long-term wealth building.",
        durationMinutes: 60,
        canPerform(state) {
          if (state.finance.creditScore < 600) return "Property investment usually needs a fair credit score (600+) to access reasonable terms.";
          return (state.finance.money + state.finance.savings) >= 2000 || "You need at least $2,000 across cash and savings for a property investment.";
        },
        effects: {
          needs: { stress: 8, purpose: 10 },
          finance: { confidence: 6 },
          skills: { finance: 6, lifeManagement: 3 },
          capability: { decisionMaking: 3, responsibility: 2 }
        },
        after(state) {
          let remaining = 2000;
          const fromSavings = Math.min(state.finance.savings, remaining);
          state.finance.savings = Math.max(0, Math.round(state.finance.savings - fromSavings));
          remaining -= fromSavings;
          state.finance.money = Math.max(0, Math.round(state.finance.money - remaining));
          state.finance.investments.property = Math.max(0, Math.round(state.finance.investments.property + 2000));
          recalculateCreditScore(state);
        },
        consequence: "Property investment used most of your available capital, but it builds wealth over a much longer horizon than everyday spending.",
        reflection: "What did you give up in flexibility today to build something for years from now?"
      },
      {
        id: "buy-health-insurance",
        title: "Buy health insurance",
        description: "Pay a modest amount now so an illness or accident cannot suddenly drain your savings.",
        durationMinutes: 25,
        canPerform(state) {
          return !state.finance.insurance.health || "You already have health insurance active.";
        },
        effects: {
          finance: { money: -60, confidence: 5 },
          needs: { stress: -4, purpose: 4 },
          capability: { responsibility: 2 }
        },
        after(state) {
          state.finance.insurance.health = true;
          recalculateCreditScore(state);
        },
        consequence: "Health insurance cost money today, but a future illness or accident will now cost you far less.",
        reflection: "What unexpected event would hurt the most if you had no protection at all?"
      },
      {
        id: "buy-home-insurance",
        title: "Buy home insurance",
        description: "Protect your home and belongings from fire, theft, or disaster with a small upfront cost.",
        durationMinutes: 25,
        canPerform(state) {
          return !state.finance.insurance.home || "You already have home insurance active.";
        },
        effects: {
          finance: { money: -50, confidence: 4 },
          needs: { stress: -3, purpose: 4 },
          housing: { satisfaction: 2 },
          capability: { responsibility: 2 }
        },
        after(state) {
          state.finance.insurance.home = true;
          recalculateCreditScore(state);
        },
        consequence: "Home insurance is a small recurring cost that protects against a much larger, unpredictable loss.",
        reflection: "Is this an expense, or is it actually a form of planning?"
      },
      {
        id: "review-pay-stub",
        title: "Review your pay stub",
        description: "Understand how much of your income already goes toward tax before you plan a budget around it.",
        durationMinutes: 20,
        effects: {
          needs: { purpose: 4 },
          mentalWellbeing: { confidence: 2 },
          skills: { finance: 3 },
          capability: { decisionMaking: 1 }
        },
        after(state) {
          state.finance.taxAwareness = game.clamp(state.finance.taxAwareness + 15);
        },
        consequence: "Income tax is deducted before money ever reaches your hands - budgeting from take-home pay, not gross pay, avoids a nasty surprise.",
        reflection: "Were you planning your spending around gross income or what you actually keep?"
      },
      {
        id: "file-taxes",
        title: "File your taxes",
        description: "Settle what you owe (or get back) based on your recent income and spending.",
        durationMinutes: 90,
        canPerform(state) {
          if (!state.finance.lastTaxFiledDay) return true;
          return (state.time.day - state.finance.lastTaxFiledDay) >= 30 || "Taxes were already filed recently - this is usually done periodically, not every day.";
        },
        effects: {
          needs: { stress: 4, purpose: 6 },
          skills: { finance: 4 },
          capability: { responsibility: 2, decisionMaking: 1 }
        },
        after(state) {
          const taxableBase = Math.max(0, state.finance.money - 100);
          const rate = 0.08 + (state.finance.taxAwareness / 100) * 0.02;
          const taxOwed = Math.round(taxableBase * rate);
          state.finance.money = Math.max(0, Math.round(state.finance.money - taxOwed));
          state.finance.lastTaxFiledDay = state.time.day;
          state.finance.totalTaxPaid = Math.max(0, Math.round((state.finance.totalTaxPaid || 0) + taxOwed));
          state.finance.lastTaxOwed = taxOwed;
          recalculateCreditScore(state);
        },
        consequence: "Filing taxes reduced available cash, but it funds public services like roads, healthcare access, and schools that the whole simulation runs on.",
        reflection: "Did understanding your pay stub earlier make this filing less stressful?"
      },
      {
        id: "check-credit-score",
        title: "Check your credit score",
        description: "See how debt, savings, and budgeting habits are shaping your financial reputation.",
        durationMinutes: 15,
        effects: {
          needs: { purpose: 3 },
          capability: { decisionMaking: 1 }
        },
        after(state) {
          recalculateCreditScore(state);
        },
        consequence: "Credit score is not something you can buy directly - it moves slowly based on debt, savings, and consistent budgeting.",
        reflection: "Which single habit would most improve this score if you kept it up for a month?"
      },
      {
        id: "pay-down-credit-card",
        title: "Pay down credit card debt",
        description: "Put extra cash toward the balance instead of just the minimum, and repair a strained payment history.",
        durationMinutes: 20,
        canPerform(state) {
          if (state.finance.debt <= 0) return "You do not currently have any debt to pay down.";
          return state.finance.money >= 50 || "You need at least $50 in cash to make a real dent.";
        },
        effects: {
          needs: { stress: -3, purpose: 2 },
          capability: { responsibility: 1 }
        },
        after(state) {
          const payment = Math.min(state.finance.money, 50, state.finance.debt);
          state.finance.money = Math.max(0, Math.round(state.finance.money - payment));
          state.finance.debt = Math.max(0, Math.round(state.finance.debt - payment));
          state.finance.creditCard.missedPayments = Math.max(0, state.finance.creditCard.missedPayments - 1);
          state.finance.creditCard.collectionsRisk = game.clamp(state.finance.creditCard.collectionsRisk - 15);
          recalculateCreditScore(state);
        },
        consequence: "Extra payments toward the balance now mean less interest and a cleaner payment history later.",
        reflection: "What would it take to make this a regular habit instead of a one-off?"
      }
    ]
  };

  game.recalculateCreditScore = recalculateCreditScore;
  game.creditTier = creditTier;
})();
