(function () {
  const game = window.LifeVerseGame || (window.LifeVerseGame = {});

  const activities = [
    {
      id: "morning-routine",
      title: "Morning routine",
      category: "Living",
      location: "home",
      durationMinutes: 45,
      effects: {
        needs: { energy: 4, hygiene: 18, stress: -4, purpose: 2 },
        capability: { responsibility: 1 },
        habits: { sleepRoutine: 1, reflection: 1 }
      },
      consequence: "A prepared morning made the rest of the day easier to manage.",
      reflection: "How did preparation change your next choice?"
    },
    {
      id: "rest",
      title: "Rest properly",
      category: "Health",
      location: "home",
      durationMinutes: 480,
      effects: {
        needs: { energy: 22, sleep: 24, stress: -12 },
        health: { sleepQuality: 6, physical: 2 },
        mentalWellbeing: { resilience: 3, motivation: 2 },
        habits: { sleepRoutine: 3 }
      },
      consequence: "Recovery improved energy, but it used a large block of time.",
      reflection: "Was rest avoidance or genuine recovery today?"
    },
    {
      id: "go-to-bed-on-time",
      title: "Go to bed on time",
      category: "Health",
      location: "home",
      durationMinutes: 20,
      effects: {
        needs: { sleep: 10, stress: -3 },
        health: { sleepQuality: 4 },
        habits: { sleepRoutine: 3 }
      },
      consequence: "Nothing happened tonight - which is exactly the point of a boring, consistent bedtime.",
      reflection: "What did you give up to make this happen?"
    },
    {
      id: "stay-up-late",
      title: "Stay up late anyway",
      category: "Living",
      location: "home",
      durationMinutes: 90,
      effects: {
        needs: { sleep: -14, stress: -4, purpose: 2 },
        mentalWellbeing: { motivation: 1 },
        habits: { sleepRoutine: -2 }
      },
      consequence: "Felt worth it in the moment - tomorrow morning will decide if it actually was.",
      reflection: "What were you actually avoiding by staying up?"
    },
    {
      id: "study-block",
      title: "Focused study block",
      category: "Education",
      location: "home",
      durationMinutes: 120,
      effects: {
        needs: { energy: -6, stress: 3, purpose: 8 },
        skills: { learning: 4, career: 1 },
        capability: { discipline: 2, decisionMaking: 1 },
        habits: { studyConsistency: 4 }
      },
      consequence: "Study increased long-term options while costing energy now.",
      reflection: "What helped you protect focus?"
    },
    {
      id: "work-shift",
      title: "Work shift",
      category: "Career",
      location: "work",
      durationMinutes: 480,
      effects: {
        finance: {},
        needs: { energy: -18, hunger: -12, stress: 12, social: -4 },
        career: { performance: 3, readiness: 2, burnoutRisk: 4 },
        skills: { career: 3, social: 1 },
        capability: { responsibility: 2 }
      },
      consequence: "Work improved income and experience, but pressure and fatigue increased.",
      reflection: "What did work give you, and what did it cost?"
    },
    {
      id: "eat-meal",
      title: "Eat a proper meal",
      category: "Health",
      location: "food",
      durationMinutes: 45,
      effects: {
        finance: { money: -12 },
        needs: { hunger: 26, energy: 5, stress: -2 },
        health: { nutrition: 4, physical: 1 }
      },
      consequence: "A meal cost money but protected energy and health.",
      reflection: "Was this spending aligned with your needs?"
    },
    {
      id: "cook-at-home",
      title: "Cook a meal at home",
      category: "Health",
      location: "home",
      durationMinutes: 75,
      effects: {
        finance: { money: -5 },
        needs: { hunger: 24, energy: -6, stress: -1 },
        health: { nutrition: 5, physical: 1 },
        skills: { lifeManagement: 2 },
        habits: { budgeting: 1 },
        capability: { responsibility: 1 }
      },
      consequence: "Cheaper than eating out, but it cost real time and effort instead of money.",
      reflection: "Which is actually scarcer for you right now - money or time?"
    },
    {
      id: "grocery-run",
      title: "Do a grocery run",
      category: "Living",
      location: "mall",
      durationMinutes: 50,
      effects: {
        finance: { money: -35 },
        needs: { energy: -4, purpose: 2 },
        capability: { responsibility: 1, decisionMaking: 1 }
      },
      consequence: "A bigger bill today, but cheaper meals for the rest of the week.",
      reflection: "Did you plan this trip, or just wing it?"
    },
    {
      id: "fix-something-at-home",
      title: "Fix something yourself",
      category: "Living",
      location: "home",
      durationMinutes: 60,
      effects: {
        needs: { energy: -8, stress: 3, purpose: 6 },
        housing: { maintenance: 10 },
        skills: { lifeManagement: 2 },
        capability: { responsibility: 1, decisionMaking: 1 }
      },
      consequence: "Cost nothing but time and patience - calling someone would have cost both money and waiting.",
      reflection: "Would you know who to call if this hadn't worked?"
    },
    {
      id: "volunteer-shift",
      title: "Volunteer for a few hours",
      category: "Relationship",
      location: "park",
      durationMinutes: 150,
      effects: {
        needs: { energy: -10, social: 8, stress: -4, purpose: 12 },
        relationships: { network: 3, trust: 2 },
        mentalWellbeing: { motivation: 3 },
        capability: { communication: 1, responsibility: 1 }
      },
      after(state) {
        state.npcSimulation.communityTrust = game.clamp(state.npcSimulation.communityTrust + 4);
      },
      consequence: "No pay, real cost in time and energy - and a kind of purpose money doesn't buy.",
      reflection: "What did you get out of this that a paid shift wouldn't have given you?"
    },
    {
      id: "catch-up-on-news",
      title: "Catch up on the news",
      category: "Reflection",
      location: "home",
      durationMinutes: 25,
      effects: {
        needs: { purpose: 3, stress: 1 },
        mentalWellbeing: { resilience: 1 },
        skills: { finance: 1 }
      },
      consequence: "Cheap and quick - knowing what's happening outside your own routine.",
      reflection: "Did this leave you more informed, or just more anxious?"
    },
    {
      id: "study-group-with-peers",
      title: "Study with a group",
      category: "Education",
      location: "library",
      durationMinutes: 120,
      effects: {
        needs: { energy: -6, social: 6, stress: -2, purpose: 5 },
        education: { studyConsistency: 6, learningEfficiency: 3 },
        relationships: { friends: 3, support: 1 },
        skills: { learning: 3, social: 1 },
        habits: { studyConsistency: 3 },
        capability: { communication: 1 }
      },
      consequence: "Slower than studying alone, some of the time, but harder to skip and easier to stay honest with.",
      reflection: "Do you actually focus better with people around, or just feel like you should?"
    },
    {
      id: "do-laundry-and-chores",
      title: "Do laundry and chores",
      category: "Living",
      location: "home",
      durationMinutes: 60,
      effects: {
        needs: { energy: -8, hygiene: 12, stress: -3, purpose: 2 },
        housing: { comfort: 3 },
        capability: { responsibility: 2 },
        habits: { reflection: 1 }
      },
      consequence: "Nobody notices chores when they're done - only when they aren't.",
      reflection: "What would this place look like after a month of skipping this?"
    },
    {
      id: "take-a-shower",
      title: "Take a shower",
      category: "Health",
      location: "home",
      durationMinutes: 20,
      effects: {
        needs: { hygiene: 20, stress: -3, energy: 2 },
        health: { physical: 1 }
      },
      consequence: "Ten minutes, and everything after it feels a little more manageable.",
      reflection: "How different does the rest of the day feel after this?"
    },
    {
      id: "personal-care-routine",
      title: "Proper personal care routine",
      category: "Health",
      location: "home",
      durationMinutes: 40,
      effects: {
        finance: { money: -6 },
        needs: { hygiene: 16, stress: -4, purpose: 2 },
        mentalWellbeing: { motivation: 2 },
        health: { physical: 1 }
      },
      consequence: "A small, unglamorous investment in feeling like yourself.",
      reflection: "How does taking care of yourself change how the rest of the day goes?"
    },
    {
      id: "exercise",
      title: "Exercise",
      category: "Health",
      location: "gym",
      durationMinutes: 90,
      effects: {
        finance: { money: -10 },
        needs: { energy: -8, stress: -8, purpose: 4, hygiene: -8 },
        health: { physical: 7, activity: 8 },
        mentalWellbeing: { motivation: 4, resilience: 3 },
        habits: { exercise: 5 },
        capability: { discipline: 1 }
      },
      consequence: "Exercise reduced stress and built health, but it required time, money and energy.",
      reflection: "What made movement worth the cost today?"
    },
    {
      id: "budget-review",
      title: "Review budget",
      category: "Finance",
      location: "home",
      durationMinutes: 45,
      effects: {
        needs: { stress: -4, purpose: 5 },
        finance: { confidence: 6 },
        skills: { finance: 5 },
        habits: { budgeting: 5 },
        capability: { decisionMaking: 2, responsibility: 1 }
      },
      consequence: "Budgeting did not create money immediately, but it improved financial awareness.",
      reflection: "What spending pattern became clearer?"
    },
    {
      id: "meet-friend",
      title: "Meet a trusted friend",
      category: "Relationship",
      location: "park",
      durationMinutes: 120,
      effects: {
        finance: { money: -8 },
        needs: { social: 20, stress: -8, purpose: 3, energy: -4 },
        relationships: { friends: 8, support: 4, trust: 3 },
        mentalWellbeing: { loneliness: -7, resilience: 3 },
        skills: { social: 2 },
        capability: { communication: 2 }
      },
      consequence: "Social support improved wellbeing, while time and a little money were spent.",
      reflection: "Did this connection support the person you want to become?"
    },
    {
      id: "call-family",
      title: "Call your family",
      category: "Relationship",
      location: "home",
      durationMinutes: 30,
      effects: {
        needs: { social: 8, stress: -3, purpose: 3 },
        relationships: { family: 8, support: 2 },
        capability: { communication: 1 }
      },
      consequence: "A short call costs almost nothing and keeps a real relationship from quietly going cold.",
      reflection: "How long had it actually been since the last one?"
    },
    {
      id: "host-friends-at-home",
      title: "Host friends at home",
      category: "Relationship",
      location: "home",
      durationMinutes: 150,
      effects: {
        finance: { money: -25 },
        needs: { energy: -8, social: 14, stress: -5, purpose: 4 },
        relationships: { friends: 6, support: 3 },
        housing: { satisfaction: 3 },
        capability: { communication: 1 }
      },
      consequence: "Cheaper than going out, and it made the place feel more like a home people actually visit.",
      reflection: "What made this feel different from meeting somewhere else?"
    },
    {
      id: "shopping",
      title: "Buy something you want",
      category: "Lifestyle",
      location: "mall",
      durationMinutes: 90,
      effects: {
        finance: { money: -50 },
        needs: { stress: -3, purpose: -1 },
        mentalWellbeing: { motivation: 1 }
      },
      consequence: "Shopping gave short-term relief, but reduced financial flexibility.",
      reflection: "Was this a need, a reward, or pressure?"
    },
    {
      id: "get-a-haircut",
      title: "Get a haircut",
      category: "Health",
      location: "mall",
      durationMinutes: 45,
      effects: {
        finance: { money: -20 },
        needs: { hygiene: 8, stress: -3, purpose: 2 },
        mentalWellbeing: { motivation: 2 }
      },
      consequence: "A small, recurring cost of looking after yourself in public.",
      reflection: "Did you put this off longer than you meant to?"
    },
    {
      id: "weekend-trip-to-the-beach",
      title: "Take a weekend trip to the beach",
      category: "Health",
      location: "beach",
      durationMinutes: 240,
      effects: {
        finance: { money: -15 },
        needs: { energy: 10, stress: -14, purpose: 6, social: 4 },
        health: { physical: 2 },
        mentalWellbeing: { resilience: 3, motivation: 3 }
      },
      consequence: "A real break, not a scrolling break - it cost a chunk of the day and a little money, and it worked.",
      reflection: "How often do you actually let yourself do this?"
    },
    {
      id: "take-a-short-getaway",
      title: "Take a short getaway",
      category: "Health",
      location: "airport",
      durationMinutes: 480,
      effects: {
        finance: { money: -120 },
        needs: { energy: 16, stress: -20, purpose: 8 },
        mentalWellbeing: { resilience: 5, motivation: 4 },
        relationships: { support: 2 }
      },
      canPerform(state) {
        return state.finance.money >= 120 || "You need at least $120 in cash for a short trip.";
      },
      consequence: "Real distance from routine, for a real price - a full day and a real dent in the budget.",
      reflection: "Did you need to get away, or were you avoiding something at home?"
    },
    // Everyday boundary-crossing choices (lifeverse-legal.js): probabilistic,
    // accumulating consequences rather than a guaranteed catch every time -
    // scoped to relatable, minor temptations, not serious/violent crime.
    // Every one of these has a real, safer alternative activity right next
    // to it, and both branches are narrated through the same dynamic
    // consequence pipeline as every other activity, so the choice is never
    // a silent stat change either way.
    {
      id: "pocket-something",
      title: "Pocket something instead of paying",
      category: "Risk",
      location: "mall",
      durationMinutes: 15,
      effects: {
        needs: { stress: 4 }
      },
      after(state) {
        game.resolveRiskyChoice(state, {
          id: "shoplifting",
          title: "Pocket something instead of paying",
          heatGain: 12,
          baseCatchChance: 0.15,
          seedSalt: 11
        });
      },
      consequence: "A quick decision, made in seconds, that isn't actually free.",
      reflection: "What made this feel worth the risk right now?"
    },
    {
      id: "tap-in-properly",
      title: "Tap in and ride the MRT",
      category: "Living",
      location: "train",
      durationMinutes: 30,
      effects: {
        finance: { money: -2 },
        needs: { energy: -2, purpose: 1 }
      },
      consequence: "A small, ordinary cost of getting around the city.",
      reflection: "How much does this add up to over a month?"
    },
    {
      id: "walk-or-cycle-commute",
      title: "Walk or cycle instead",
      category: "Living",
      location: "train",
      durationMinutes: 55,
      effects: {
        needs: { energy: -10, stress: -2, purpose: 2 },
        health: { physical: 2, activity: 4 },
        transportation: { monthlyCost: -5 }
      },
      consequence: "Free, and it cost time and energy instead of money.",
      reflection: "Is this a trade you'd make every day, or only sometimes?"
    },
    {
      id: "jump-fare-gate",
      title: "Jump the fare gate",
      category: "Risk",
      location: "train",
      durationMinutes: 10,
      effects: {
        needs: { stress: 3 }
      },
      after(state) {
        game.resolveRiskyChoice(state, {
          id: "fare-dodge",
          title: "Jump the fare gate",
          heatGain: 8,
          baseCatchChance: 0.1,
          seedSalt: 23
        });
      },
      consequence: "Saved a couple of dollars, if nobody was watching.",
      reflection: "Is this actually about the money, or something else?"
    },
    {
      id: "call-a-ride-home",
      title: "Call a ride home",
      category: "Living",
      location: "clarke-quay",
      durationMinutes: 30,
      effects: {
        finance: { money: -18 },
        needs: { energy: 4, stress: -4 }
      },
      consequence: "Cost more than driving yourself, but everyone got home the same way they left.",
      reflection: "Was this an easy call to make, or did it take convincing yourself?"
    },
    {
      id: "drive-home-after-drinking",
      title: "Drive home after drinking",
      category: "Risk",
      location: "clarke-quay",
      durationMinutes: 20,
      effects: {
        needs: { stress: 2 }
      },
      after(state) {
        game.resolveRiskyChoice(state, {
          id: "drink-driving",
          title: "Drive home after drinking",
          heatGain: 22,
          baseCatchChance: 0.2,
          seedSalt: 37
        });
      },
      consequence: "Faster and free - as long as nothing went wrong on the way.",
      reflection: "What would you tell a friend who was about to do this?"
    },
    {
      id: "journal-reflection",
      title: "Journal reflection",
      category: "Reflection",
      location: "home",
      durationMinutes: 30,
      effects: {
        needs: { stress: -5, purpose: 7 },
        mentalWellbeing: { resilience: 5, motivation: 2 },
        habits: { reflection: 6 },
        capability: { decisionMaking: 2 }
      },
      consequence: "Reflection helped turn experience into learning.",
      reflection: "What pattern should you notice before it becomes a problem?"
    },
    {
      id: "creative-hobby-time",
      title: "Spend time on a hobby",
      category: "Living",
      location: "home",
      durationMinutes: 60,
      effects: {
        needs: { stress: -6, purpose: 5, energy: -2 },
        mentalWellbeing: { motivation: 4, resilience: 2 },
        habits: { reflection: 1 }
      },
      consequence: "Nothing productive happened, and that was the point.",
      reflection: "When was the last time you did something just because you wanted to?"
    },
    // HDB Hub (new zone, life-sim.js/app.js): the unglamorous "adulting
    // paperwork" side of independence that the rest of the activity list
    // doesn't cover - none of these are fun, all of them are real, and none
    // has a wrong answer to game toward (same "small real tradeoff" shape
    // as every other activity here, not a puzzle with an optimal choice).
    {
      id: "file-taxes",
      title: "File your taxes",
      category: "Life Admin",
      location: "hdb-hub",
      durationMinutes: 90,
      effects: {
        finance: { money: -15, confidence: 4 },
        needs: { stress: 8, purpose: 4 },
        skills: { finance: 3 },
        capability: { responsibility: 2 },
        habits: { budgeting: 2 }
      },
      consequence: "Taxes got filed on time - a small cost now against a bigger problem avoided later.",
      reflection: "What made this easier or harder than you expected?"
    },
    {
      id: "fudge-tax-numbers",
      title: "Fudge the numbers on your taxes",
      category: "Risk",
      location: "hdb-hub",
      durationMinutes: 60,
      effects: {
        finance: { money: 20 },
        needs: { stress: 6 }
      },
      after(state) {
        game.resolveRiskyChoice(state, {
          id: "tax-fudge",
          title: "Fudge the numbers on your taxes",
          heatGain: 18,
          baseCatchChance: 0.08,
          seedSalt: 53
        });
      },
      consequence: "A little more cash today, on paper that might get a second look.",
      reflection: "What is the actual expected value here, once you count the risk?"
    },
    {
      id: "check-cpf-statement",
      title: "Check your CPF statement",
      category: "Life Admin",
      location: "hdb-hub",
      durationMinutes: 20,
      effects: {
        needs: { stress: -4, purpose: 2 },
        finance: { confidence: 3 },
        skills: { finance: 1 }
      },
      consequence: "A quick look at the real numbers replaced vague worry with an actual picture.",
      reflection: "Did checking change how you feel about the future, even a little?"
    },
    {
      id: "apply-bto",
      title: "Apply for a BTO flat",
      category: "Life Admin",
      location: "hdb-hub",
      durationMinutes: 120,
      effects: {
        finance: { money: -50, confidence: 2 },
        needs: { stress: 10, purpose: 12 },
        skills: { finance: 2, career: 1 },
        capability: { decisionMaking: 2, responsibility: 2 },
        habits: { budgeting: 1 }
      },
      consequence: "The application is in - a real step toward an independent home, with a real wait ahead.",
      reflection: "What does having your own place actually mean to you?"
    },
    // Remaining map locations that had zero attached gameplay (real
    // positioned zones on the map, but purely cosmetic set-dressing until
    // now) - one genuine daily-life activity each, same pattern as
    // everywhere else in this file.
    {
      id: "full-health-checkup",
      title: "Get a full health checkup",
      category: "Health",
      location: "hospital",
      durationMinutes: 120,
      canPerform(state) {
        return state.finance.money >= 60 || "You need at least $60 in cash for a full checkup.";
      },
      effects: {
        finance: { money: -60 },
        needs: { stress: -2, purpose: 3 },
        health: { illnessRisk: -10, medicalAccess: 10, physical: 2 },
        mentalWellbeing: { confidence: 2 }
      },
      consequence: "Prevention costs more up front than ignoring it - and far less than catching a problem late.",
      reflection: "When was the last time you did this before something forced you to?"
    },
    {
      id: "work-remotely-from-cafe",
      title: "Work remotely from a cafe",
      category: "Career",
      location: "cafe",
      durationMinutes: 150,
      effects: {
        finance: { money: -12 },
        needs: { energy: -5, social: 4, stress: -3, purpose: 4 },
        career: { performance: 2 },
        mentalWellbeing: { motivation: 2 }
      },
      consequence: "A change of scenery cost a coffee and produced a different kind of focus than home did.",
      reflection: "Was this about the work, or about not being alone with it?"
    },
    {
      id: "attend-a-lecture",
      title: "Sit in on a public lecture",
      category: "Education",
      location: "university",
      durationMinutes: 90,
      effects: {
        needs: { energy: -4, purpose: 6 },
        education: { learningEfficiency: 4, studyConsistency: 2 },
        skills: { learning: 3 },
        mentalWellbeing: { motivation: 2 }
      },
      consequence: "Free, and it stretched further than a short course - if you actually stayed for the whole thing.",
      reflection: "What idea from this is worth following up on?"
    },
    {
      id: "network-at-a-mixer",
      title: "Network at a professional mixer",
      category: "Career",
      location: "marina-bay",
      durationMinutes: 150,
      canPerform(state) {
        return state.finance.money >= 25 || "You need at least $25 in cash for this event.";
      },
      effects: {
        finance: { money: -25 },
        needs: { energy: -10, social: 8, stress: 4, purpose: 5 },
        career: { readiness: 3, reputation: 4 },
        relationships: { network: 4 },
        capability: { communication: 1 }
      },
      consequence: "Small talk with strangers is uncomfortable and, occasionally, exactly how doors open.",
      reflection: "Did you actually follow up with anyone, or just collect a business card?"
    },
    {
      id: "explore-chinatown-heritage",
      title: "Explore Chinatown's heritage streets",
      category: "Reflection",
      location: "chinatown",
      durationMinutes: 90,
      effects: {
        finance: { money: -10 },
        needs: { stress: -6, purpose: 5, social: 2 },
        mentalWellbeing: { resilience: 2 },
        relationships: { network: 1 }
      },
      consequence: "Slow, cheap, and grounding - a reminder that the city existed before your routine did.",
      reflection: "What does it change to know where the people around you actually came from?"
    },
    {
      id: "browse-little-india-market",
      title: "Browse Little India's markets",
      category: "Lifestyle",
      location: "little-india",
      durationMinutes: 75,
      effects: {
        finance: { money: -15 },
        needs: { stress: -4, purpose: 3, social: 3 },
        mentalWellbeing: { motivation: 1 }
      },
      consequence: "Spices and colour for a small price - a different rhythm than the mall's.",
      reflection: "How often do you spend time somewhere unfamiliar on purpose?"
    },
    {
      id: "bargain-hunt-at-bugis",
      title: "Bargain hunt at Bugis Street",
      category: "Lifestyle",
      location: "bugis",
      durationMinutes: 90,
      effects: {
        finance: { money: -18 },
        needs: { energy: -6, stress: -3, purpose: 2 },
        skills: { finance: 1 },
        capability: { decisionMaking: 1 }
      },
      consequence: "Cheaper than the mall if you actually negotiated - more time, less certainty on price.",
      reflection: "Did the haggling feel like a skill, or just awkward?"
    },
    {
      id: "watch-the-trading-floor",
      title: "Watch the CBD's trading-floor energy",
      category: "Reflection",
      location: "raffles-place",
      durationMinutes: 45,
      effects: {
        needs: { stress: 2, purpose: 5 },
        career: { readiness: 1 },
        mentalWellbeing: { motivation: 3 }
      },
      consequence: "Free to watch, and it either lit a fire or made the whole pace feel exhausting.",
      reflection: "Did this make you want more ambition, or less?"
    },
    {
      id: "walk-punggol-waterway",
      title: "Walk along Punggol Waterway",
      category: "Health",
      location: "punggol",
      durationMinutes: 70,
      effects: {
        needs: { energy: 4, stress: -8, purpose: 3 },
        health: { physical: 2, activity: 3 },
        mentalWellbeing: { resilience: 2 }
      },
      consequence: "Free, quiet, and unhurried - the opposite of most of the rest of the day.",
      reflection: "How much of your stress actually needs money to fix, versus just quiet?"
    },
    {
      id: "cross-border-errand-run",
      title: "Run errands at the Woodlands regional mall",
      category: "Living",
      location: "woodlands",
      durationMinutes: 100,
      effects: {
        finance: { money: -20 },
        needs: { energy: -6, purpose: 2 },
        capability: { responsibility: 1, decisionMaking: 1 }
      },
      consequence: "Practical, unglamorous, and cheaper out here than closer to the centre of the city.",
      reflection: "Was the trip out here worth the time it cost?"
    },
    // Ordinary daily-life verbs that were still missing: unwinding at home,
    // reading, phone/social media habits, a free/light exercise option
    // distinct from the gym, keeping in touch quickly, and closing out the
    // day - same shape as every other activity in this file.
    {
      id: "watch-tv-and-relax",
      title: "Watch something and unwind",
      category: "Living",
      location: "home",
      durationMinutes: 90,
      effects: {
        needs: { energy: 3, stress: -8, purpose: -2 },
        mentalWellbeing: { motivation: -1 }
      },
      consequence: "Real rest, but ninety minutes that didn't move anything else forward.",
      reflection: "Did you choose this, or did it just happen because it was easy?"
    },
    {
      id: "read-a-book",
      title: "Read a book",
      category: "Reflection",
      location: "home",
      durationMinutes: 60,
      effects: {
        needs: { stress: -5, purpose: 5 },
        skills: { learning: 2 },
        mentalWellbeing: { resilience: 2, motivation: 1 },
        habits: { reflection: 1 }
      },
      consequence: "Slower than a video, and it stayed with you longer.",
      reflection: "What idea from this will still matter next week?"
    },
    {
      id: "check-phone-and-social-media",
      title: "Check your phone and social media",
      category: "Living",
      location: "home",
      durationMinutes: 20,
      effects: {
        needs: { stress: -1, social: 3, purpose: -1 },
        mentalWellbeing: { loneliness: -2, motivation: -1 }
      },
      consequence: "A quick hit of connection, and a little comparison that came with it.",
      reflection: "Did you feel better or worse after, and did that surprise you?"
    },
    {
      id: "go-for-a-run",
      title: "Go for a run",
      category: "Health",
      location: "park",
      durationMinutes: 45,
      effects: {
        needs: { energy: -6, stress: -7, hygiene: -6 },
        health: { physical: 5, activity: 6 },
        mentalWellbeing: { motivation: 3, resilience: 2 },
        habits: { exercise: 4 },
        capability: { discipline: 1 }
      },
      consequence: "Free, and it cost nothing but the energy and the getting-yourself-out-the-door part.",
      reflection: "What's usually the actual obstacle - the run, or starting it?"
    },
    {
      id: "text-a-friend",
      title: "Text a friend to check in",
      category: "Relationship",
      location: "home",
      durationMinutes: 15,
      effects: {
        needs: { social: 5, stress: -2, purpose: 2 },
        relationships: { friends: 4, support: 1 },
        capability: { communication: 1 }
      },
      consequence: "Small and quick, but it's the small quick ones that keep a friendship from going quiet.",
      reflection: "Who have you been meaning to text back?"
    },
    {
      id: "tidy-up-before-bed",
      title: "Tidy up before bed",
      category: "Living",
      location: "home",
      durationMinutes: 20,
      effects: {
        needs: { energy: -3, stress: -3, hygiene: 4 },
        housing: { comfort: 3 },
        capability: { responsibility: 1 }
      },
      consequence: "A few minutes tonight so tomorrow morning doesn't start with a mess.",
      reflection: "How different does waking up feel on the mornings you did this?"
    },
    // A few more genuine gaps: professional mental health care (distinct
    // from the self-directed/peer support already modeled in
    // lifeverse-mental-wellbeing.js), an everyday money-check habit, paid
    // structured skill-building distinct from free hobby time, and a small
    // civic/community gesture that doesn't require a whole pet-ownership
    // system to feel real.
    {
      id: "see-a-counselor",
      title: "See a counselor",
      category: "Health",
      location: "hospital",
      durationMinutes: 60,
      canPerform(state) {
        return state.finance.money >= 45 || "You need at least $45 in cash for a counseling session.";
      },
      effects: {
        finance: { money: -45 },
        needs: { stress: -12, energy: -3, purpose: 4 },
        mentalWellbeing: { resilience: 6, burnoutRisk: -8, confidence: 3, index: 5 },
        capability: { decisionMaking: 1 }
      },
      consequence: "Different from talking to a friend - someone trained specifically to help you think this through.",
      reflection: "What almost stopped you from booking this?"
    },
    {
      id: "check-bank-and-set-savings-goal",
      title: "Check your bank balance and set a savings goal",
      category: "Finance",
      location: "home",
      durationMinutes: 15,
      effects: {
        needs: { stress: -2, purpose: 3 },
        finance: { confidence: 3 },
        skills: { finance: 1 },
        habits: { budgeting: 2 }
      },
      consequence: "A number you actually looked at, and a target instead of a vague hope.",
      reflection: "Is the goal realistic, or is it something you'll quietly abandon in two weeks?"
    },
    {
      id: "take-a-hobby-class",
      title: "Take a hobby class",
      category: "Education",
      location: "university",
      durationMinutes: 120,
      canPerform(state) {
        return state.finance.money >= 40 || "You need at least $40 in cash for this class.";
      },
      effects: {
        finance: { money: -40 },
        needs: { energy: -6, social: 6, stress: -5, purpose: 6 },
        education: { learningEfficiency: 2 },
        mentalWellbeing: { motivation: 3, happiness: 3 },
        skills: { learning: 2, social: 1 },
        capability: { discipline: 1 }
      },
      consequence: "Paid and structured, unlike free hobby time at home - a real class with other people in it.",
      reflection: "Would you have actually kept doing this without a scheduled class to show up to?"
    },
    {
      id: "help-a-neighbour",
      title: "Help a neighbour with something small",
      category: "Relationship",
      location: "home",
      durationMinutes: 40,
      effects: {
        needs: { energy: -4, social: 4, purpose: 6 },
        relationships: { network: 2, trust: 2 },
        mentalWellbeing: { motivation: 2 }
      },
      after(state) {
        state.npcSimulation.communityTrust = game.clamp(state.npcSimulation.communityTrust + 3);
      },
      consequence: "Small and unpaid, and it's exactly the kind of thing that makes a place feel like a community instead of just an address.",
      reflection: "When did someone last do this for you, unasked?"
    }
  ];

  function findActivity(id) {
    return activities.find((activity) => activity.id === id) || null;
  }

  function getAvailableActivities(state, options = {}) {
    const location = options.locationId || "";
    if (location) {
      return activities.filter((activity) => activity.location === location || activity.location === "any");
    }
    return activities;
  }

  function addFinance(state, delta = {}) {
    if (Number(delta.money)) state.finance.money = Math.round(state.finance.money + Number(delta.money));
    if (Number(delta.savings)) state.finance.savings = Math.max(0, Math.round(state.finance.savings + Number(delta.savings)));
    if (Number(delta.debt)) state.finance.debt = Math.max(0, Math.round(state.finance.debt + Number(delta.debt)));
    if (Number(delta.confidence)) state.finance.confidence = game.clamp(state.finance.confidence + Number(delta.confidence));
  }

  function addCareer(state, delta = {}) {
    Object.entries(delta).forEach(([key, value]) => {
      if (typeof state.career[key] === "number") state.career[key] = game.clamp(state.career[key] + Number(value || 0));
    });
  }

  function performActivity(state, activityId, options = {}) {
    const activity = findActivity(activityId);
    if (!activity) return { error: "Activity not found." };
    if (game.isInDetention && game.isInDetention(state)) {
      return { error: `You're in detention until day ${state.legal.detentionUntilDay}. Fast forward to serve the time.` };
    }
    if (activity.id === "work-shift" && !state.career.employed) {
      return { error: "You do not currently have a job - search for work before you can take a shift." };
    }
    if (typeof activity.canPerform === "function") {
      const allowed = activity.canPerform(state);
      if (allowed !== true) return { error: typeof allowed === "string" ? allowed : "This is not available yet." };
    }

    const before = game.getTimeSnapshot(state);
    if (game.decayNeeds) game.decayNeeds(state, activity.durationMinutes);
    if (game.advanceMinutes) game.advanceMinutes(state, activity.durationMinutes, activity.title);

    const effects = activity.effects || {};
    // Work-shift pay tracks the player's actual career.incomePerShift (raised by
    // promotions/category choice) instead of a flat number, so those systems
    // have a real, felt consequence rather than only moving an abstract stat.
    const financeEffects = activity.id === "work-shift"
      ? { ...effects.finance, money: Math.round(state.career.incomePerShift) }
      : (effects.finance || {});
    if (game.applyNeedEffects) game.applyNeedEffects(state, effects);
    addFinance(state, financeEffects);
    addCareer(state, effects.career || {});
    if (game.applyPlayerEffects) game.applyPlayerEffects(state, activity);

    const after = game.getTimeSnapshot(state);
    const scheduleEntry = {
      id: `act-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      activityId: activity.id,
      title: activity.title,
      category: activity.category,
      location: options.locationId || activity.location,
      start: before.stamp,
      end: after.stamp,
      durationMinutes: activity.durationMinutes
    };
    state.schedule = [...(state.schedule || []), scheduleEntry].slice(-40);

    let event = game.addEvent(state, {
      type: "activity",
      title: activity.title,
      summary: activity.consequence,
      systems: affectedSystems(activity),
      consequences: buildConsequences({ ...activity, effects: { ...effects, finance: financeEffects } }),
      reflection: activity.reflection,
      occurredAt: after.stamp
    });
    // Risky-choice activities (lifeverse-legal.js's resolveRiskyChoice) fire
    // their own follow-up event from this hook - when one does, it becomes
    // the primary result event (what the toast shows) since "did you get
    // caught" is the moment that actually matters, not the generic activity
    // flavour text above.
    if (typeof activity.after === "function") {
      const eventsBefore = state.events.length;
      activity.after(state, activity);
      if (state.events.length > eventsBefore) event = state.events[state.events.length - 1];
    }
    if (game.updateProgressionFromDecision) {
      game.updateProgressionFromDecision(state, activity, { systemId: "activity", systemTitle: activity.category || "Activity" });
    }
    return { state, activity, event, scheduleEntry };
  }

  function affectedSystems(activity) {
    const effects = activity.effects || {};
    const map = {
      needs: "Needs",
      finance: "Finance",
      career: "Career",
      health: "Health",
      mentalWellbeing: "Mental wellbeing",
      relationships: "Relationships",
      skills: "Player skills",
      habits: "Habits",
      capability: "Capability"
    };
    return Object.keys(effects).map((key) => map[key]).filter(Boolean);
  }

  function buildConsequences(activity) {
    const effects = activity.effects || {};
    const items = [`Used ${game.durationLabel ? game.durationLabel(activity.durationMinutes) : `${activity.durationMinutes} minutes`} of the day.`];
    if (effects.finance && Number(effects.finance.money)) items.push(`Money ${Number(effects.finance.money) > 0 ? "+" : ""}${effects.finance.money}.`);
    if (effects.needs && Number(effects.needs.stress)) items.push(`Stress ${Number(effects.needs.stress) > 0 ? "+" : ""}${effects.needs.stress}.`);
    if (effects.health && Number(effects.health.physical)) items.push(`Physical health ${Number(effects.health.physical) > 0 ? "+" : ""}${effects.health.physical}.`);
    return items;
  }

  game.activities = activities;
  game.findActivity = findActivity;
  game.getAvailableActivities = getAvailableActivities;
  game.performActivity = performActivity;
})();
