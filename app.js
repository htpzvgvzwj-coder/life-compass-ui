const screenRoot = document.querySelector("#screen-root");
const modalLayer = document.querySelector("#modal-layer");
const authLayer = document.querySelector("#onboarding-layer");
const authForm = document.querySelector("#onboarding-form");
const authEmailInput = document.querySelector("#auth-email");
const authUsernameInput = document.querySelector("#onboarding-username");
const authAdminPassInput = document.querySelector("#auth-admin-pass");
const authError = document.querySelector("#onboarding-error");
const characterCreationLayer = document.querySelector("#character-creation-layer");
const characterCreationForm = document.querySelector("#character-creation-form");
const openingNarrativeLayer = document.querySelector("#opening-narrative-layer");
const openingNarrativeContinueButton = document.querySelector("#opening-narrative-continue");
const navItems = [...document.querySelectorAll(".nav-item")];
const viewButtons = [...document.querySelectorAll(".view-button")];
const staticScreens = [...document.querySelectorAll("[data-static-screen]")];

const portraitLayer = document.querySelector("#portrait-layer");
const portraitImageEl = document.querySelector("#portrait-image");
const portraitNameEl = document.querySelector("#portrait-name");

const ADMIN_PASSCODE = "STEADY-ADMIN";
// AI Coach (Future Mirror bible Ch.8) - built after Blueprint/Reflection/
// Roadmap exist on purpose, so it has real context to reference instead of
// being a generic chatbot. Proactively references specific real context
// rather than waiting to be reminded - the "remembers you" feeling is the
// practical version of the future-self-continuity mechanism this whole
// product is built on. Tone adapts to personalBlueprint.personality/workStyle
// in context, but never fabricates a reference that isn't in realSavedFacts.
const COMPASS_SYSTEM_PROMPT = "You are Compass AI, this app's AI Coach - you augment the user's judgment, you don't replace it (never issue a verdict on a life decision - end with a question that hands it back to them). Proactively reference specific real context from realSavedFacts or personalBlueprint when relevant (a Roadmap milestone, a recent reflection, their values or work style) rather than only answering generically - this is what makes you feel like you remember them, not a fresh chatbot every time. Adapt your tone to personalBlueprint.personality and workStyle if present (e.g. more direct for a driven/fast-pace style, more exploratory and unhurried for a reflective/deliberate style). Integrity rule, non-negotiable: never state or imply you remember something that is not actually present in the current conversation, savedUserProfile, personalBlueprint, or realSavedFacts - if asked about something you have no real data on, say so plainly instead of inventing a plausible-sounding memory. Do not invent facts about the user. If you are unsure, ask a short follow-up question.";
// Future Self module (Future Mirror bible Ch.4) - grounded in Hershfield's
// future self-continuity research: vividness matters more than certainty
// framing. Never phrase as "you will be X" - always "if you continue on this
// path, you may be approaching something like X."
const FUTURE_SELF_SYSTEM_PROMPT = "You are the Future Self module inside Compass's Future Mirror. You write a vivid, specific, first-person, present-tense scene of what the user's future self might be living, grounded only in their real saved data. This is never a prediction - always conditional (\"if you continue,\" \"this path suggests,\" \"you may be\"), never deterministic (\"you will be\"). Prioritize a vivid narrated scene over a dry stat summary - vividness is what makes this effective, not certainty. Be honest about low confidence when the user's saved data is thin rather than fabricating specific detail to sound impressive.";
const DETERMINISTIC_PHRASES = ["you will be", "you will have", "you'll be", "you'll have", "you are going to be", "guaranteed", "definitely will"];
const COMMUNITY_COMPOSE_ASSIST_SYSTEM_PROMPT = "You help reword a single Community post for a youth self-growth app so it is kinder, clearer, and safer to publish. Keep the same meaning and rough length. Remove any full name, address, school schedule, phone number, or password. Do not add new claims or advice that wasn't already implied. Reply with only the reworded post text, no preamble, no quotes, no markdown.";
const COMPASS_API_ERROR = "Sorry, Compass AI is having trouble responding right now. Please try again.";
const COMPASS_API_URL = window.location.protocol === "file:" ? "http://localhost:5179/api/compass-chat" : "/api/compass-chat";

// Future Scan station catalog - all 10 stations are fully implemented; each
// opens as a modal from the grid in futureScanStationGrid() (see
// modals.futureScanStation for the per-station view dispatch). Each station
// belongs to one of FUTURE_SCAN_GROUPS below, purely for how the grid is
// organized - it doesn't change what a station does.
const FUTURE_SCAN_STATIONS = [
  { id: "identityScan", title: "Future Identity Scan", blurb: "See which future self this choice moves you toward.", group: "now", icon: "icon-profile.png" },
  { id: "valuesCheck", title: "Values Consistency Check", blurb: "Compare this choice against the values you've already saved.", group: "now", icon: "icon-balance.png" },
  { id: "hiddenCosts", title: "Hidden Cost Scanner", blurb: "See what this choice actually spends - sleep, focus, confidence.", group: "now", icon: "icon-warning.png" },
  { id: "noActionFuture", title: "No-Action Future", blurb: "See where staying exactly the same leads.", group: "now", icon: "icon-safety.png" },
  { id: "pressureTest", title: "Choice Pressure Test", blurb: "Check whether pressure, fear, or comparison is driving this.", group: "context", icon: "icon-boundary.png" },
  { id: "conflictMap", title: "Future Conflict Map", blurb: "See which of your goals are actually in tension here.", group: "context", icon: "icon-decide.png" },
  { id: "signalRadar", title: "Future Signal Radar", blurb: "Rate how ready you feel right now - not a score, a moment check.", group: "context", icon: "icon-mood.png" },
  { id: "pastSelfCheck", title: "Past-Self Consistency Check", blurb: "See what you chose in similar moments before.", group: "time", icon: "icon-guide.png" },
  { id: "driftDetector", title: "Drift Detector", blurb: "See if you're slowly drifting from where you said you wanted to go.", group: "time", icon: "icon-transport.png" },
  { id: "checkBack", title: "Check-Back", blurb: "Come back later and see if the prediction matched real life.", group: "time", icon: "icon-time.png" }
];

const FUTURE_SCAN_GROUPS = [
  { id: "now", title: "Right now", subtitle: "What this choice actually is." },
  { id: "context", title: "Context check", subtitle: "Why you're choosing this, right now." },
  { id: "time", title: "Across time", subtitle: "Past patterns, current trend, future check-in." }
];

const FUTURE_IDENTITY_OPTIONS = [
  "Independent adult", "Confident communicator", "Financially stable person",
  "Strong student", "Healthy and balanced person", "Someone my family can trust",
  "Creative builder", "Future leader"
];

// Picking a pressure source is optional (unlike identity picks) - the AI can
// also read pressure/fear/comparison straight off the raw scanContext, so a
// user shouldn't be blocked from running this just because none of the
// presets fit.
const FUTURE_SCAN_PRESSURE_OPTIONS = [
  "Peer pressure", "Family expectation", "Fear of missing out",
  "Fear of failing", "Comparing myself to others", "Feeling rushed"
];

const FUTURE_SCAN_SIGNAL_DIMENSIONS = [
  { id: "energy", label: "Energy" },
  { id: "clarity", label: "Clarity" },
  { id: "confidence", label: "Confidence" },
  { id: "urgency", label: "Urgency" }
];
const FUTURE_SCAN_SIGNAL_LEVELS = ["Low", "Medium", "High"];

const FUTURE_SCAN_CHECKBACK_HORIZONS = [
  { id: "1w", label: "In 1 week", days: 7 },
  { id: "1m", label: "In 1 month", days: 30 },
  { id: "3m", label: "In 3 months", days: 90 }
];

// Same "augment judgment, never decide for them, never invent a memory that
// isn't real" rules as COMPASS_SYSTEM_PROMPT, scoped to Future Scan's
// specific job.
const FUTURE_SCAN_SYSTEM_PROMPT = "You are Future Scan, a module inside Compass's Future Mirror. Your job is to help the user see the truth about a real choice before they make it - not to decide for them. Ground every claim only in the scanContext and saved profile data you are given; never invent a memory, pattern, or fact that isn't actually present in what you were told. Never state or imply a recommended choice (no \"you should\", no \"the better option is\"). Be concise, concrete, and youth-friendly. Avoid clinical or diagnostic language, especially around emotional or mental state - this is not a mental health assessment.";

// Build Mode 2.0 is a goal-based AI coach router. It must work for any youth
// growth goal (not just interview/study/money): the app keeps the coach
// catalog and safety boundaries, while AI dynamically chooses the coach and
// writes the training path from the user's real goal/context.
const BUILD_MODE_SYSTEM_PROMPT = "You are Build Mode, a goal-based AI coach router inside Compass. The user may bring ANY practical growth goal: interview, study, money, family conversation, confidence, career direction, scholarship, entrepreneurship, independence, wellness, opportunity planning, or something unusual. First match the goal to the most useful coach; if no specialist fits, use Custom Growth Coach. Then create a training path, not a proof log and not a static checklist. Keep every training step concrete, interactive, and immediately usable. Ground everything only in the user's stated goal, saved profile/context, and current training conversation. Never invent memories, traits, achievements, mood, or history. Never guarantee outcomes; use possible/likely language. Do not diagnose mental health or act as a therapist, parent, teacher, employer, or emergency service. If the user mentions danger or serious self-harm risk, respond safely and encourage contacting a trusted person or emergency support. Return strict JSON whenever JSON is requested.";

const BUILD_COACH_TYPES = [
  { id: "interview", name: "Interview Coach", use: "interviews, internships, scholarship interviews, job interviews, self-introduction, STAR stories" },
  { id: "study", name: "Study Coach", use: "exams, revision, focus, assignment planning, active recall, procrastination around schoolwork" },
  { id: "money", name: "Money Coach", use: "saving, spending discipline, budgeting, receipts, part-time income, independent living cost" },
  { id: "communication", name: "Communication Coach", use: "talking to parents, teachers, friends, saying no, difficult conversations, boundaries" },
  { id: "confidence", name: "Confidence Coach", use: "presentation fear, social confidence, fear of failure, speaking up, self-expression" },
  { id: "career", name: "Career Coach", use: "career direction, course choices, portfolio, skills, internships, future industry exploration" },
  { id: "wellness", name: "Wellness Coach", use: "stress, sleep, energy, burnout risk, routine reset, daily balance; not therapy or diagnosis" },
  { id: "relationship", name: "Relationship Coach", use: "friendship conflict, peer pressure, support circle, healthy relationship boundaries" },
  { id: "independence", name: "Independence Coach", use: "adult life, responsibility, routines, time management, family responsibility, self-management" },
  { id: "opportunity", name: "Opportunity Coach", use: "scholarships, competitions, volunteer work, learn-and-earn, application planning" },
  { id: "entrepreneurship", name: "Entrepreneurship Coach", use: "small business, side hustle, content creation, idea testing, early customer learning" },
  { id: "clarity", name: "Clarity Coach", use: "unclear goals, feeling lost, choosing what to build first, exploring direction" },
  { id: "custom", name: "Custom Growth Coach", use: "any practical youth growth goal that does not fit another coach cleanly" }
];

// Real-life moments (not a self-assessment, not scored) - concrete, relatable
// situations a user can recognize themselves in and tap straight into
// coaching. Categories mirror the subset of BUILD_COACH_TYPES that map to
// core adult-independence gaps; Interview/Study/Entrepreneurship/Opportunity/
// Clarity/Custom stay reachable via free-text goal entry as before.
const BUILD_LIFE_MOMENT_CATEGORIES = [
  { id: "independence", label: "Independence", icon: "icon-home.png" },
  { id: "money", label: "Money", icon: "icon-money.png" },
  { id: "communication", label: "Communication", icon: "icon-chat.png" },
  { id: "career", label: "Career", icon: "icon-work.png" },
  { id: "wellness", label: "Wellness", icon: "icon-health.png" },
  { id: "relationships", label: "Relationships", icon: "icon-support.png" }
];

const BUILD_LIFE_MOMENTS = {
  independence: [
    "I've never cooked a full meal for myself from scratch",
    "I don't know how to do laundry properly, including reading care labels",
    "I've never booked my own doctor or dentist appointment",
    "I wouldn't know what to do if a landlord or roommate ignored a real problem",
    "I don't have a routine that keeps my space liveable without someone reminding me"
  ],
  money: [
    "I don't have a budget I actually stick to",
    "I don't really understand how credit cards or interest work",
    "I've never had to decide between paying a bill and something I wanted",
    "I don't know what I'd do if I got hit with a big unexpected expense right now",
    "I've never opened or managed my own bank account"
  ],
  communication: [
    "I find it hard to say no to my parents, teachers, or friends and hold my ground",
    "I don't know how I'd raise it if a boss or landlord treated me unfairly",
    "I avoid conflict instead of actually addressing it",
    "I don't know how to ask for help without feeling like a burden",
    "I've never had to have a hard conversation with someone I depend on"
  ],
  career: [
    "I don't have an updated resume",
    "I've never done a real job interview, only imagined one",
    "I'm not sure what I actually want to do for work",
    "I don't know how to follow up after applying somewhere",
    "I've never negotiated pay, hours, or anything at work"
  ],
  wellness: [
    "I don't know when a symptom means 'see a doctor' versus 'wait it out'",
    "I don't have a way to handle stress that isn't just avoiding it",
    "I've never had to manage my own sleep or eating without someone else structuring it",
    "I don't know what my own health coverage actually covers",
    "I push through burnout instead of noticing it early"
  ],
  relationships: [
    "I don't have an adult outside my family I could call in a real emergency",
    "I don't know how to end a friendship or relationship that isn't good for me",
    "I struggle to make new friends outside school or a set group",
    "I don't know how to ask someone for real support without over-explaining",
    "I find it hard to trust people enough to actually rely on them"
  ]
};

// Real Cost of Living Calculator - deliberately separate from LifeVerse's
// abstract game-balanced economy. Every figure here is a general real-world
// Singapore estimate, presented as a range, not a simulation output. Reuses
// the LifeVerse map's real district names (life-sim.js) for tone
// consistency only - no cost data is shared with or derived from LifeVerse.
const COST_OF_LIVING_HOUSING = [
  { id: "family", label: "Staying with family", central: [0, 0], suburban: [0, 0] },
  { id: "shared-room", label: "Room in a shared flat", central: [900, 1400], suburban: [700, 1100] },
  { id: "studio", label: "Studio apartment", central: [2500, 3800], suburban: [1800, 2500] },
  { id: "one-bedroom", label: "1-bedroom condo", central: [3500, 5000], suburban: [2500, 3200] }
];
const COST_OF_LIVING_DISTRICT_TIERS = [
  { id: "central", label: "Central (Orchard Road, Marina Bay, Raffles Place, Clarke Quay)" },
  { id: "suburban", label: "Suburban (Woodlands, Punggol, HDB Hub)" }
];
const COST_OF_LIVING_TRANSPORT = [
  { id: "public", label: "Public transport (bus/MRT)", range: [120, 150] },
  { id: "cycling", label: "Cycling or walking", range: [20, 50] },
  { id: "car", label: "Own car or motorbike", range: [800, 1500] }
];
const COST_OF_LIVING_LIFESTYLE = [
  { id: "frugal", label: "Frugal - mostly cook or hawker food", food: [300, 450], incidentals: [100, 200] },
  { id: "moderate", label: "Moderate - a mix of cooking and eating out", food: [500, 700], incidentals: [150, 300] },
  { id: "comfortable", label: "Comfortable - eat out often", food: [800, 1200], incidentals: [250, 450] }
];
const COST_OF_LIVING_UTILITIES_RANGE = [100, 180];
const COST_OF_LIVING_PHONE_RANGE = [20, 40];
const COST_OF_LIVING_ONE_TIME_NOTES = [
  "Rental deposit: usually 1-2 months' rent, paid upfront.",
  "Agent fee: often about half a month's rent if you use an agent.",
  "Utility or wifi setup deposit or activation fee.",
  "Basic furniture and setup if the place is unfurnished."
];

function computeCostOfLiving(draft) {
  const housing = COST_OF_LIVING_HOUSING.find((item) => item.id === draft.housing) || COST_OF_LIVING_HOUSING[0];
  const transport = COST_OF_LIVING_TRANSPORT.find((item) => item.id === draft.transport) || COST_OF_LIVING_TRANSPORT[0];
  const lifestyle = COST_OF_LIVING_LIFESTYLE.find((item) => item.id === draft.lifestyle) || COST_OF_LIVING_LIFESTYLE[1];
  const rent = housing[draft.district] || housing.central;
  const rows = [
    { label: "Housing", range: rent },
    { label: "Transport", range: transport.range },
    { label: "Food", range: lifestyle.food },
    { label: "Utilities & wifi", range: COST_OF_LIVING_UTILITIES_RANGE },
    { label: "Phone", range: COST_OF_LIVING_PHONE_RANGE },
    { label: "Personal & incidentals", range: lifestyle.incidentals }
  ];
  const total = rows.reduce((sum, row) => [sum[0] + row.range[0], sum[1] + row.range[1]], [0, 0]);
  return { rows, total };
}

const inspireCategories = [
  "All",
  "Entrepreneurs",
  "Athletes",
  "Scientists",
  "Leaders",
  "Creators",
  "Young Achievers"
];

const defaultUserProfile = {
  username: "",
  email: "",
  role: "user",
  voicePreference: "female",
  name: "",
  ageGroup: "",
  studentStatus: "",
  goals: "",
  interests: "",
  stressTriggers: "",
  supportStyle: "",
  dreamUniversity: "",
  dreamCareer: "",
  dreamLifestyle: "",
  visionBoard: "",
  background: "",
  startingTrait: "",
  difficulty: "standard",
  characterCreated: false
};

function lifeVerseEngine() {
  return window.LifeVerseGame || null;
}

function createDefaultLifeVerseState() {
  // Called once at module-load time to seed defaultTrackerState, before the
  // real userProfile const further down the file is initialized - must stay
  // on the static default here. Character-creation choices are applied later,
  // for real, via the opening-narrative "Begin" handler which calls
  // createInitialState({ profile: userProfile, applyCharacterCreation: true })
  // directly, well after the whole script has finished loading.
  const engine = lifeVerseEngine();
  return engine && engine.createInitialState ? engine.createInitialState({ profile: defaultUserProfile }) : null;
}

const defaultTrackerState = {
  mood: {
    label: "Calm",
    score: 72,
    note: "Clear enough to plan the next step.",
    history: [58, 66, 61, 72, 69, 74, 72],
    entries: []
  },
  receipts: [
    { merchant: "RapidKL", category: "Transport", amount: 3.5, method: "Card", time: "8:20 AM" },
    { merchant: "Campus cafe", category: "Food", amount: 12.8, method: "E-wallet", time: "12:45 PM" }
  ],
  assessment: null,
  missionProgress: [],
  roleplaySessions: [],
  supportContacts: [],
  journalEntries: [],
  challengeProgress: [],
  savedOpportunities: [],
  futureMirror: {
    saved: []
  },
  // Future Mirror upgrade (separate system from LifeVerse - no shared state,
  // no cross-reads, per the Future Mirror bible's scope boundary). Blueprint
  // is versioned/append-only: every other Future Mirror module reads from
  // blueprint.history[blueprint.history.length-1] rather than keeping its
  // own copy of "what the user is like".
  blueprint: {
    history: []
  },
  reflectionEntries: [],
  decisions: [],
  roadmapGoals: [],
  futureSelfSnapshots: [],
  // Future Scan ("Prep Mode" reimagined) - additive third mode inside Future
  // Mirror, alongside Decision Simulator/Life Compass. One record per scan
  // session accumulates every station's result rather than 10 separate
  // arrays. Plugs into the existing reflection-resurfacing system
  // (allReflectionLikeEntries/dueForResurfacing) as a third _source.
  futureScans: [],
  // Build Mode - a goal-based coach router and training path. Multiple
  // entries can be active at once because a user may want different coaches
  // for different goals.
  buildMode: {
    entries: []
  },
  careerStudio: {
    interviewSessions: [],
    resume: null
  },
  lifeVerse: createDefaultLifeVerseState(),
  lifeSim: {
    stats: {
      money: 500,
      health: 70,
      stress: 30,
      skills: 10,
      happiness: 60,
      daysPassed: 0
    },
    currentLocation: null,
    lastActivity: "",
    consequences: [],
    reflection: "",
    consequenceToastUntil: 0,
    reportPromptReady: false
  },
  activeRoleplaySessionId: null,
  systemTutorialsSeen: {},
  moodSuggestion: null
};

const dailyMissions = [
  { id: "save-rm5", title: "Save S$5 today", description: "Put aside a small amount before spending on wants.", category: "Money", is_active: true },
  { id: "message-trusted", title: "Message one trusted person", description: "Send a simple check-in or ask how they are doing.", category: "Support", is_active: true },
  { id: "sleep-before-12", title: "Sleep before 12am", description: "Protect tomorrow's energy with one earlier bedtime.", category: "Health", is_active: true },
  { id: "handled-well", title: "Write one thing you handled well", description: "Name one moment you managed with effort or courage.", category: "Reflection", is_active: true },
  { id: "check-spending", title: "Check today's spending", description: "Look at what you paid today and choose one small adjustment.", category: "Money", is_active: true },
  { id: "drink-water", title: "Drink water", description: "Drink one full glass of water and notice your energy.", category: "Health", is_active: true },
  { id: "gratitude", title: "Write one thing you are grateful for", description: "Keep it honest and small. One line is enough.", category: "Reflection", is_active: true }
];

const roleplayScenarios = [
  { id: "peer-pressure", title: "Saying no to peer pressure", opening: "Come on, everyone is doing it. Why are you being so serious?", skill: "Boundary setting" },
  { id: "asking-help", title: "Asking for help", opening: "You said you wanted to talk. What kind of help do you need?", skill: "Clear help-seeking" },
  { id: "job-interview", title: "Job interview practice", opening: "Tell me about yourself and why you want this role.", skill: "Confidence and preparation" },
  { id: "parents-teachers", title: "Talking to parents or teachers", opening: "I can listen, but I need you to explain what has been going on.", skill: "Honest communication" },
  { id: "handling-conflict", title: "Handling conflict", opening: "I feel like you ignored what I said. What do you want to say about that?", skill: "Repair and calm response" },
  { id: "budget-decision", title: "Budget decision practice", opening: "You want to buy it today, but rent and transport are also coming up. What is your plan?", skill: "Money decision-making" }
];

const lifeSimLocations = [
  { id: "home", name: "Home", description: "Your HDB home base. Rest, reset, and manage your routine." },
  { id: "gym", name: "Gym", description: "A neighbourhood gym for discipline, strength, and stress control." },
  { id: "work", name: "Office", description: "A bright office tower where skills and money grow, but pressure can rise too." },
  { id: "food", name: "Hawker Centre", description: "A hawker-centre-inspired place for everyday meals and small happiness." },
  { id: "mall", name: "Orchard Road", description: "A colourful shopping belt with tempting spending choices." },
  { id: "park", name: "Park", description: "A green space for slowing down, breathing, and balancing stress." },
  { id: "library", name: "Library", description: "A quiet study space with shelves, desks, and focus-friendly corners." },
  { id: "hospital", name: "Hospital", description: "A clean care space with reception, waiting seats, and health support cues." },
  { id: "cafe", name: "Cafe", description: "A warm small cafe for reflection, laptops, and gentle social energy." },
  { id: "beach", name: "Sentosa", description: "A calm coastal escape for recovery, perspective, and fresh air." },
  { id: "airport", name: "Airport", description: "A travel gateway that hints at future mobility, planning, and opportunity." },
  { id: "train", name: "Train Station", description: "A transit hub with gates, route boards, and daily movement through the city." },
  { id: "university", name: "University Town", description: "A campus area for long-term learning, lectures, and student life." },
  { id: "marina-bay", name: "Marina Bay", description: "The city's financial skyline - ambition, pressure, and the clearest symbol of \"making it\"." },
  { id: "chinatown", name: "Chinatown", description: "A shophouse street of red and gold, where heritage and daily life sit side by side." },
  { id: "little-india", name: "Little India", description: "A vivid, spice-scented street lined with colourful shopfronts and a small temple." },
  { id: "bugis", name: "Bugis", description: "A street market meets a modern junction - bargains, crowds, and city energy." },
  { id: "raffles-place", name: "Raffles Place", description: "The historic CBD - banks, trading floors, and the older, taller heart of the city's economy." },
  { id: "clarke-quay", name: "Clarke Quay", description: "A riverside strip of restored shophouses turned restaurants and bars - nightlife, socialising, and letting off steam." },
  { id: "punggol", name: "Punggol", description: "A northeast waterfront new town built around the Punggol Waterway - modern HDB estates, a light-rail line, and quieter family life." },
  { id: "hdb-hub", name: "HDB Hub", description: "Government and housing services - taxes, CPF, and BTO applications. The unglamorous paperwork side of being an adult." },
  { id: "woodlands", name: "Woodlands", description: "A northern regional town built around its transport hub, a big mall, HDB estates, and the checkpoint to Malaysia." }
];

const lifeSimActivities = {
  home: [{ id: "rest", name: "Rest", durationMinutes: 480, effect: { health: 10, stress: -10, daysPassed: 1 } }],
  gym: [{ id: "exercise", name: "Exercise", durationMinutes: 90, effect: { health: 8, stress: -3, money: -10, daysPassed: 1 } }],
  work: [{ id: "work-shift", name: "Work Shift", durationMinutes: 480, effect: { money: 80, stress: 10, skills: 2, daysPassed: 1 } }],
  food: [{ id: "eat-meal", name: "Eat Meal", durationMinutes: 45, effect: { health: 3, happiness: 5, money: -12, daysPassed: 1 } }],
  mall: [{ id: "shopping", name: "Shopping", durationMinutes: 90, effect: { happiness: 8, money: -50, stress: -2, daysPassed: 1 } }],
  park: [{ id: "relax", name: "Relax", durationMinutes: 60, effect: { stress: -8, happiness: 5, daysPassed: 1 } }]
};

const defaultSupportContacts = [];

const opportunityCategories = [
  "All",
  "Jobs",
  "Internships",
  "Scholarships",
  "Competitions",
  "Volunteer Opportunities",
  "Learn & Earn"
];

const opportunityItems = [
  { id: "part-time-jobs", category: "Jobs", type: "Part-time jobs", title: "Part-time job starter list", description: "Cafe, retail, event crew, tutoring, and campus helper roles that fit around study time.", tags: ["income", "student", "flexible"], applyUrl: "https://www.google.com/search?q=part+time+jobs+for+students+near+me" },
  { id: "student-jobs", category: "Jobs", type: "Student jobs", title: "Student-friendly work options", description: "Roles that build confidence, communication, and basic money habits without overloading school.", tags: ["student", "confidence", "money"], applyUrl: "https://www.google.com/search?q=student+jobs+near+me" },
  { id: "remote-jobs", category: "Jobs", type: "Remote jobs", title: "Remote beginner work", description: "Search for virtual assistant, transcription, social media, tutoring, and data entry roles carefully.", tags: ["remote", "skills", "income"], applyUrl: "https://www.google.com/search?q=remote+jobs+for+students" },
  { id: "entry-level-jobs", category: "Jobs", type: "Entry-level jobs", title: "Entry-level career path", description: "Find roles that train beginners and help build a resume after school, college, or university.", tags: ["career", "entry-level", "resume"], applyUrl: "https://www.google.com/search?q=entry+level+jobs+for+fresh+graduates" },
  { id: "business-internship", category: "Internships", type: "Business", title: "Business internship search", description: "Explore operations, admin, project coordination, and startup assistant internships.", tags: ["business", "career", "internship"], applyUrl: "https://www.google.com/search?q=business+internship+for+students" },
  { id: "marketing-internship", category: "Internships", type: "Marketing", title: "Marketing internship search", description: "Practice content calendars, campaigns, copywriting, analytics, and brand communication.", tags: ["marketing", "content", "communication"], applyUrl: "https://www.google.com/search?q=marketing+internship+for+students" },
  { id: "technology-internship", category: "Internships", type: "Technology", title: "Technology internship search", description: "Look for web, app, QA, IT support, data, and product internships with beginner-friendly teams.", tags: ["technology", "coding", "product"], applyUrl: "https://www.google.com/search?q=technology+internship+for+students" },
  { id: "design-internship", category: "Internships", type: "Design", title: "Design internship search", description: "Build portfolio evidence through UI, graphic design, brand, product, or social content work.", tags: ["design", "portfolio", "creative"], applyUrl: "https://www.google.com/search?q=design+internship+for+students" },
  { id: "social-impact-internship", category: "Internships", type: "Social Impact", title: "Social impact internship", description: "Explore NGOs, youth programs, education, environment, and community development placements.", tags: ["impact", "community", "leadership"], applyUrl: "https://www.google.com/search?q=social+impact+internship+for+students" },
  { id: "local-scholarships", category: "Scholarships", type: "Local scholarships", title: "Local scholarship tracker", description: "Search local foundations, companies, universities, and community scholarship programs.", tags: ["scholarship", "local", "education"], applyUrl: "https://www.google.com/search?q=local+scholarships+for+students" },
  { id: "international-scholarships", category: "Scholarships", type: "International scholarships", title: "International scholarship shortlist", description: "Find overseas scholarships and prepare requirements early: grades, essays, activities, and references.", tags: ["international", "education", "future"], applyUrl: "https://www.google.com/search?q=international+scholarships+for+students" },
  { id: "university-scholarships", category: "Scholarships", type: "University scholarships", title: "University financial aid", description: "Check each university's scholarship page, deadlines, required documents, and interview needs.", tags: ["university", "study", "financial aid"], applyUrl: "https://www.google.com/search?q=university+scholarships+financial+aid" },
  { id: "government-scholarships", category: "Scholarships", type: "Government scholarships", title: "Government scholarship prep", description: "Track eligibility, documents, leadership evidence, essays, and application deadlines.", tags: ["government", "education", "leadership"], applyUrl: "https://www.google.com/search?q=government+scholarships+for+students" },
  { id: "innovation-challenges", category: "Competitions", type: "Innovation challenges", title: "Innovation challenge finder", description: "Pitch solutions for real problems and build proof for your portfolio or scholarship profile.", tags: ["innovation", "portfolio", "problem-solving"], applyUrl: "https://www.google.com/search?q=student+innovation+challenge" },
  { id: "business-competitions", category: "Competitions", type: "Business competitions", title: "Business competition finder", description: "Practice pitching, market research, financial thinking, and team communication.", tags: ["business", "entrepreneurship", "pitching"], applyUrl: "https://www.google.com/search?q=student+business+competition" },
  { id: "hackathons", category: "Competitions", type: "Hackathons", title: "Hackathon search", description: "Join beginner-friendly tech challenges to practice coding, design, product, and teamwork.", tags: ["hackathon", "coding", "teamwork"], applyUrl: "https://www.google.com/search?q=student+hackathons" },
  { id: "leadership-programs", category: "Competitions", type: "Leadership programs", title: "Leadership program list", description: "Find youth councils, student leadership camps, fellowships, and public speaking programs.", tags: ["leadership", "confidence", "network"], applyUrl: "https://www.google.com/search?q=youth+leadership+programs" },
  { id: "ngo-volunteer", category: "Volunteer Opportunities", type: "NGOs", title: "NGO volunteer roles", description: "Support education, food aid, mental health, disability, animal welfare, or community projects.", tags: ["volunteer", "ngo", "community"], applyUrl: "https://www.google.com/search?q=NGO+volunteer+opportunities+for+youth" },
  { id: "community-service", category: "Volunteer Opportunities", type: "Community service", title: "Community service projects", description: "Help with tutoring, clean-ups, events, elderly support, food drives, or local campaigns.", tags: ["service", "community", "leadership"], applyUrl: "https://www.google.com/search?q=community+service+opportunities+for+students" },
  { id: "environmental-projects", category: "Volunteer Opportunities", type: "Environmental projects", title: "Environmental action projects", description: "Explore recycling, beach clean-ups, tree planting, climate education, and local green teams.", tags: ["environment", "impact", "teamwork"], applyUrl: "https://www.google.com/search?q=environmental+volunteer+projects+for+youth" },
  { id: "youth-organizations", category: "Volunteer Opportunities", type: "Youth organizations", title: "Youth organization directory", description: "Join groups that build leadership, communication, teamwork, and social impact experience.", tags: ["youth", "leadership", "network"], applyUrl: "https://www.google.com/search?q=youth+organizations+near+me" },
  { id: "canva-skills", category: "Learn & Earn", type: "Canva skills", title: "Canva design micro-skill", description: "Learn poster, social media, presentation, and resume design for small freelance tasks.", tags: ["canva", "design", "income"], applyUrl: "https://www.google.com/search?q=learn+Canva+skills+for+freelancing" },
  { id: "video-editing", category: "Learn & Earn", type: "Video editing", title: "Video editing starter path", description: "Learn short-form editing, captions, pacing, thumbnails, and portfolio clips for creators.", tags: ["video", "content", "creative"], applyUrl: "https://www.google.com/search?q=learn+video+editing+for+beginners" },
  { id: "coding-skills", category: "Learn & Earn", type: "Coding", title: "Coding beginner path", description: "Start with websites, small apps, automation, or school project tools that become portfolio work.", tags: ["coding", "technology", "portfolio"], applyUrl: "https://www.google.com/search?q=learn+coding+for+beginners+students" },
  { id: "content-creation", category: "Learn & Earn", type: "Content creation", title: "Content creation portfolio", description: "Build writing, filming, editing, and publishing skills around a topic you care about.", tags: ["content", "marketing", "creative"], applyUrl: "https://www.google.com/search?q=content+creation+skills+for+beginners" },
  { id: "entrepreneurship", category: "Learn & Earn", type: "Entrepreneurship", title: "Mini entrepreneurship project", description: "Test a small service, product, or community idea with low risk and honest feedback.", tags: ["entrepreneurship", "business", "income"], applyUrl: "https://www.google.com/search?q=student+entrepreneurship+ideas" }
];

const inspireCoverImages = {
  "Entrepreneurs": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
  "Athletes": "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80",
  "Scientists": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=900&q=80",
  "Leaders": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80",
  "Creators": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
  "Young Achievers": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80"
};

const inspireStorySeeds = [
  {
    person: "Steve Jobs",
    title: "Focus, taste, and learning from failure",
    category: "Entrepreneurs",
    preview: "A creative comeback story about focus, product taste, and treating failure as information.",
    focus: "Jobs built a reputation for simplifying complex technology into products people could understand. His path also included public failure and a return that required patience, sharper focus, and better judgment.",
    keyLessons: ["Failure is information, not identity.", "Focus means saying no to distractions.", "Good taste improves when you study good work."],
    reflectionQuestion: "What recent mistake can you turn into one useful lesson?",
    actionChallenge: "Pick one project and remove one unnecessary thing from it today.",
    blogUrl: "https://www.britannica.com/biography/Steve-Jobs"
  },
  {
    person: "Elon Musk",
    title: "Big goals, small tests, and responsible risk",
    category: "Entrepreneurs",
    preview: "A practical look at ambition, systems thinking, and breaking huge ideas into experiments.",
    focus: "Musk's work in electric cars, rockets, and technology shows how big goals become more realistic when they are broken into testable engineering problems.",
    keyLessons: ["Break big goals into testable problems.", "Learn from technical setbacks quickly.", "Balance ambition with health and responsibility."],
    reflectionQuestion: "What big goal can you shrink into one experiment this week?",
    actionChallenge: "Write one risky idea, then write the safest small test for it.",
    blogUrl: "https://www.britannica.com/biography/Elon-Musk"
  },
  {
    person: "Jack Ma",
    title: "Rejection, resilience, and long-term learning",
    category: "Entrepreneurs",
    preview: "How repeated rejection can become fuel for communication, learning, and patience.",
    focus: "Jack Ma's public story often includes rejection, learning English through practice, and building Alibaba after many early setbacks.",
    keyLessons: ["Rejection can train resilience.", "Communication is a career skill.", "Long-term learning beats one lucky moment."],
    reflectionQuestion: "Where have you been rejected, and what skill can it teach you?",
    actionChallenge: "Practice one difficult explanation out loud for two minutes.",
    blogUrl: "https://www.britannica.com/biography/Jack-Ma"
  },
  {
    person: "Sara Blakely",
    title: "Confidence from trying before you feel ready",
    category: "Entrepreneurs",
    preview: "A founder story about testing ideas, handling embarrassment, and building courage through action.",
    focus: "Sara Blakely built Spanx from a simple product insight and persistent testing, showing that confidence can follow action rather than come before it.",
    keyLessons: ["Prototype before everything feels perfect.", "Embarrassment fades faster than regret.", "Customer problems can reveal business ideas."],
    reflectionQuestion: "What small idea are you waiting too long to test?",
    actionChallenge: "Ask one person for feedback on an idea you care about.",
    blogUrl: "https://www.sarapblakelyfoundation.org/"
  },
  {
    person: "Oprah Winfrey",
    title: "Voice, empathy, and turning pain into purpose",
    category: "Creators",
    preview: "How self-belief, storytelling, and empathy can become leadership strengths.",
    focus: "Oprah Winfrey's career shows the power of communication, emotional honesty, and building a platform around human stories.",
    keyLessons: ["Your voice can become a strength.", "Empathy can be leadership.", "Pain can become purpose with support and boundaries."],
    reflectionQuestion: "What part of your story could help someone feel less alone?",
    actionChallenge: "Write one honest paragraph about something you have learned the hard way.",
    blogUrl: "https://www.britannica.com/biography/Oprah-Winfrey"
  },
  {
    person: "Kobe Bryant",
    title: "Practice, pressure, and calm confidence",
    category: "Athletes",
    preview: "How consistent preparation can become confidence when life feels high-pressure.",
    focus: "Kobe Bryant became known for intense preparation and review. The healthier lesson is to practice steadily, recover properly, and let confidence grow from repetition.",
    keyLessons: ["Practice builds trust in yourself.", "Pressure is easier when basics are repeated.", "Recovery protects performance."],
    reflectionQuestion: "What basic skill would make your life easier if you practiced it weekly?",
    actionChallenge: "Do one 15-minute practice block today, then write what improved.",
    blogUrl: "https://www.britannica.com/biography/Kobe-Bryant"
  },
  {
    person: "Michael Jordan",
    title: "Using setbacks without becoming them",
    category: "Athletes",
    preview: "A sports story about discipline, feedback, and turning disappointment into training.",
    focus: "Michael Jordan's career is often used to show how disappointment can become a reason to train smarter instead of a reason to quit.",
    keyLessons: ["Setbacks are feedback.", "Greatness needs habits, not only talent.", "Competitive energy needs direction."],
    reflectionQuestion: "What feedback have you avoided because it felt personal?",
    actionChallenge: "Choose one weak area and practice it for 10 focused minutes.",
    blogUrl: "https://www.britannica.com/biography/Michael-Jordan"
  },
  {
    person: "Cristiano Ronaldo",
    title: "Consistency, standards, and body discipline",
    category: "Athletes",
    preview: "A lesson in routine, training standards, and protecting your energy for long-term goals.",
    focus: "Cristiano Ronaldo's longevity is connected to training discipline, recovery, and clear standards for performance.",
    keyLessons: ["Consistency compounds over time.", "Health habits support ambition.", "Standards work best when they are realistic."],
    reflectionQuestion: "Which daily routine would support your future self most?",
    actionChallenge: "Set one simple body-care standard for the next seven days.",
    blogUrl: "https://www.britannica.com/biography/Cristiano-Ronaldo"
  },
  {
    person: "Serena Williams",
    title: "Strength, identity, and staying in the arena",
    category: "Athletes",
    preview: "How confidence can grow while facing pressure, criticism, and high expectations.",
    focus: "Serena Williams' career shows excellence under scrutiny and the importance of identity, preparation, and self-respect.",
    keyLessons: ["Self-respect matters under pressure.", "Preparation protects confidence.", "You can belong even when people doubt you."],
    reflectionQuestion: "Where do you need to act like you belong?",
    actionChallenge: "Write one sentence that reminds you of your worth before a hard task.",
    blogUrl: "https://www.britannica.com/biography/Serena-Williams"
  },
  {
    person: "Simone Biles",
    title: "Courage to protect your wellbeing",
    category: "Athletes",
    preview: "A powerful example of excellence, boundaries, and choosing safety under pressure.",
    focus: "Simone Biles helped many young people understand that strength includes knowing when to pause, ask for support, and protect mental and physical safety.",
    keyLessons: ["Boundaries can be brave.", "Health is part of performance.", "Asking for support can protect your future."],
    reflectionQuestion: "What pressure needs a healthier boundary in your life?",
    actionChallenge: "Name one boundary you can communicate calmly this week.",
    blogUrl: "https://www.britannica.com/biography/Simone-Biles"
  },
  {
    person: "Albert Einstein",
    title: "Curiosity before certainty",
    category: "Scientists",
    preview: "A story about questioning assumptions and letting curiosity guide deeper learning.",
    focus: "Einstein's work is connected to imagination, patience, and asking questions that others might ignore.",
    keyLessons: ["Curiosity can be a study strategy.", "Deep thinking needs quiet time.", "Questions can be more powerful than quick answers."],
    reflectionQuestion: "What topic would you understand better if you asked a different question?",
    actionChallenge: "Write three questions about one subject before searching for answers.",
    blogUrl: "https://www.britannica.com/biography/Albert-Einstein"
  },
  {
    person: "Marie Curie",
    title: "Persistence, evidence, and quiet courage",
    category: "Scientists",
    preview: "A lesson in patient research, intellectual courage, and building knowledge carefully.",
    focus: "Marie Curie's scientific work required discipline, evidence, and persistence in a field where women faced many barriers.",
    keyLessons: ["Evidence matters more than noise.", "Persistence can be quiet.", "Barriers can be challenged with skill and support."],
    reflectionQuestion: "What work deserves more patient effort from you?",
    actionChallenge: "Spend 20 minutes improving one skill without checking for praise.",
    blogUrl: "https://www.britannica.com/biography/Marie-Curie"
  },
  {
    person: "Nikola Tesla",
    title: "Imagination, invention, and practical focus",
    category: "Scientists",
    preview: "How original ideas need both imagination and practical follow-through.",
    focus: "Tesla is remembered for bold ideas and inventions. His story also reminds young people that creativity needs structure to become useful.",
    keyLessons: ["Ideas need systems.", "Imagination can solve real problems.", "Protect your focus from distraction."],
    reflectionQuestion: "What creative idea needs a simple plan?",
    actionChallenge: "Draw or write the first rough version of one idea today.",
    blogUrl: "https://www.britannica.com/biography/Nikola-Tesla"
  },
  {
    person: "Katherine Johnson",
    title: "Precision, preparation, and earned confidence",
    category: "Scientists",
    preview: "A NASA story about mathematical skill, trust, and doing excellent work under pressure.",
    focus: "Katherine Johnson's calculations supported major space missions, showing how preparation and precision can create trust.",
    keyLessons: ["Small details can matter greatly.", "Skill builds confidence.", "Quiet excellence can change history."],
    reflectionQuestion: "Where would careful preparation make you feel safer?",
    actionChallenge: "Check one important task twice before submitting it.",
    blogUrl: "https://www.nasa.gov/people/katherine-johnson/"
  },
  {
    person: "Jane Goodall",
    title: "Patience, observation, and care for the world",
    category: "Scientists",
    preview: "A story about learning through observation and turning care into long-term action.",
    focus: "Jane Goodall's work shows how careful observation, patience, and care can grow into a lifelong mission.",
    keyLessons: ["Observation is a powerful skill.", "Care becomes stronger through action.", "Long-term work starts with small attention."],
    reflectionQuestion: "What problem do you care enough about to observe closely?",
    actionChallenge: "Notice one pattern in your environment and write what it teaches you.",
    blogUrl: "https://janegoodall.org/our-story/about-jane/"
  },
  {
    person: "Malala Yousafzai",
    title: "Turning fear into a purpose for education",
    category: "Leaders",
    preview: "How a clear purpose helped Malala turn fear into action for education.",
    focus: "Malala became known globally for defending girls' education. Her story shows that courage is not the absence of fear; it is choosing a value and finding safe allies.",
    keyLessons: ["Purpose can make hard choices clearer.", "Courage grows better with allies.", "A small voice can become powerful when it is consistent."],
    reflectionQuestion: "What is one value you want your decisions to protect this month?",
    actionChallenge: "Write one sentence about a cause you care about, then share it with one trusted person.",
    blogUrl: "https://www.britannica.com/biography/Malala-Yousafzai"
  },
  {
    person: "Michelle Obama",
    title: "Discipline, identity, and staying grounded",
    category: "Leaders",
    preview: "Confidence can be trained through preparation, values, and self-respect.",
    focus: "Michelle Obama's public work highlights education, preparation, family support, and values-led leadership.",
    keyLessons: ["Preparation reduces fear.", "Values make decisions easier before pressure arrives.", "Confidence is built through repeated choices."],
    reflectionQuestion: "Which value do you want people to feel when they interact with you?",
    actionChallenge: "Choose one decision today and make it based on your values, not pressure.",
    blogUrl: "https://www.britannica.com/biography/Michelle-Obama"
  },
  {
    person: "Nelson Mandela",
    title: "Patience, forgiveness, and principled leadership",
    category: "Leaders",
    preview: "A leadership story about endurance, dignity, and long-term commitment to justice.",
    focus: "Mandela's life is often studied for endurance, forgiveness, and choosing a larger purpose through extremely difficult conditions.",
    keyLessons: ["Patience can be strategic.", "Dignity matters in conflict.", "Leadership serves something bigger than ego."],
    reflectionQuestion: "What conflict needs more dignity from you?",
    actionChallenge: "Respond to one difficult message with calm and clarity instead of heat.",
    blogUrl: "https://www.britannica.com/biography/Nelson-Mandela"
  },
  {
    person: "Martin Luther King Jr.",
    title: "A voice for justice and disciplined hope",
    category: "Leaders",
    preview: "How clear communication and organized action can move people toward change.",
    focus: "Martin Luther King Jr. showed how vision, language, and organized action can help people work toward justice.",
    keyLessons: ["Hope needs action.", "Words can organize courage.", "Peaceful discipline can be powerful."],
    reflectionQuestion: "What change do you want to speak about more clearly?",
    actionChallenge: "Write a short message about one issue you care about without attacking anyone.",
    blogUrl: "https://www.britannica.com/biography/Martin-Luther-King-Jr"
  },
  {
    person: "Greta Thunberg",
    title: "Starting small and speaking consistently",
    category: "Leaders",
    preview: "A youth changemaker story about consistency, climate action, and using your voice.",
    focus: "Greta Thunberg's activism shows that youth voices can create attention when they are consistent and connected to a clear issue.",
    keyLessons: ["Consistency builds visibility.", "Youth voices matter.", "Action becomes stronger when it is specific."],
    reflectionQuestion: "What issue would you show up for consistently?",
    actionChallenge: "Choose one small action for an issue you care about and repeat it this week.",
    blogUrl: "https://www.britannica.com/biography/Greta-Thunberg"
  },
  {
    person: "Young founders",
    title: "Building before you feel official",
    category: "Young Achievers",
    preview: "How young founders turn school problems, community needs, and simple ideas into projects.",
    focus: "Many young founders begin with a small problem they understand personally, then test a basic solution before asking for wider support.",
    keyLessons: ["Start with a problem close to you.", "A simple prototype is enough to learn.", "Ask users before building too much."],
    reflectionQuestion: "What problem do people your age complain about often?",
    actionChallenge: "Write a one-page idea for a project that helps one group of people.",
    blogUrl: "https://www.google.com/search?q=young+founders+success+stories"
  },
  {
    person: "Student innovators",
    title: "Turning school projects into real-world skills",
    category: "Young Achievers",
    preview: "A reminder that assignments can become portfolios, confidence, and future opportunities.",
    focus: "Student innovators often use class projects as a starting point for practical skills, teamwork, and public portfolios.",
    keyLessons: ["Projects can become proof of skill.", "Feedback improves ideas.", "Teamwork teaches independence."],
    reflectionQuestion: "Which school project could become portfolio evidence?",
    actionChallenge: "Improve one old assignment and save it as proof of a skill.",
    blogUrl: "https://www.google.com/search?q=student+innovators+stories"
  },
  {
    person: "Scholarship winners",
    title: "Preparation, purpose, and asking early",
    category: "Young Achievers",
    preview: "How students use planning, essays, mentors, and deadlines to open new opportunities.",
    focus: "Scholarship winners often succeed through early preparation, clear personal stories, and asking teachers or mentors for feedback.",
    keyLessons: ["Deadlines need early action.", "Your story matters.", "Mentors can improve your application."],
    reflectionQuestion: "What opportunity would become easier if you started earlier?",
    actionChallenge: "List one scholarship, program, or competition and its first requirement.",
    blogUrl: "https://www.google.com/search?q=scholarship+winners+advice+students"
  },
  {
    person: "Youth leaders",
    title: "Leading without needing to be perfect",
    category: "Young Achievers",
    preview: "How young leaders build trust by listening, organizing, and taking responsibility.",
    focus: "Youth leaders do not need to know everything. They build trust by listening well, organizing clearly, and following through on small promises.",
    keyLessons: ["Leadership starts with responsibility.", "Listening makes action smarter.", "Trust grows when promises are kept."],
    reflectionQuestion: "Where can you take one small responsibility this week?",
    actionChallenge: "Volunteer for one task and complete it on time.",
    blogUrl: "https://www.google.com/search?q=youth+leaders+success+stories"
  }
];

const defaultContentState = {
  notice: "Build one steady habit today: ask for help early, keep transport money safe, and rest before hard choices.",
  stories: inspireStorySeeds.map(createInspireStory)
};

const defaultSettingsState = {
  features: {
    assessments: true,
    futureMirror: true,
    compass: true,
    growth: true,
    opportunities: true,
    stories: true,
    receipts: true
  }
};

const defaultChatState = {
  messages: [
    {
      from: "assistant",
      text: "Hi, I am Compass AI. Ask me anything you need help with: study, planning, motivation, emotions, app features, or everyday decisions."
    }
  ],
  documents: []
};

const responseOptions = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half", value: 2 },
  { label: "Nearly every day", value: 3 }
];

const futureReadinessCategories = [
  "Financial Readiness",
  "Decision-Making Skills",
  "Emotional Resilience",
  "Life Direction & Purpose",
  "Relationship & Communication Skills",
  "Independence & Responsibility"
];

const scenarioOptions = {
  socialMedia: [
    { label: "Continue scrolling.", value: 0 },
    { label: "Study later.", value: 1 },
    { label: "Set a time limit and start studying.", value: 2 },
    { label: "Remove distractions and follow my plan.", value: 3 }
  ],
  delayedMoney: [
    { label: "$50 today.", value: 0 },
    { label: "Probably $50 today.", value: 1 },
    { label: "Probably $100 later.", value: 2 },
    { label: "$100 later.", value: 3 }
  ],
  riskInitiative: [
    { label: "Start immediately without planning.", value: 0 },
    { label: "Wait until everything is perfect.", value: 1 },
    { label: "Research and test a small version first.", value: 2 },
    { label: "Learn from experienced people and create a plan.", value: 3 }
  ],
  failure: [
    { label: "Give up.", value: 0 },
    { label: "Blame circumstances.", value: 1 },
    { label: "Reflect and improve.", value: 2 },
    { label: "Seek help and create a better strategy.", value: 3 }
  ],
  futureIdentity: [
    { label: "Being wealthy.", value: 1 },
    { label: "Having social status.", value: 0 },
    { label: "Having meaningful relationships.", value: 2 },
    { label: "Becoming the best version of myself.", value: 3 }
  ],
  responsibility: [
    { label: "Avoid it until someone reminds me.", value: 0 },
    { label: "Do it only when it becomes urgent.", value: 1 },
    { label: "Plan a small step and ask if needed.", value: 2 },
    { label: "Take ownership and follow through.", value: 3 }
  ]
};

const assessmentItems = [
  { id: "interest", domain: "Life Direction & Purpose", legacyDomain: "Mood", text: "Little interest or enjoyment in things you usually care about" },
  { id: "low_mood", domain: "Emotional Resilience", legacyDomain: "Mood", text: "Feeling down, empty, hopeless, or unusually low" },
  { id: "sleep", domain: "Independence & Responsibility", legacyDomain: "Mood", text: "Sleep problems that affect school, work, choices, or responsibility" },
  { id: "energy", domain: "Independence & Responsibility", legacyDomain: "Mood", text: "Low energy that makes normal tasks harder" },
  { id: "focus", domain: "Decision-Making Skills", legacyDomain: "Mood", text: "Trouble focusing on school, work, decisions, or conversations" },
  { id: "nervous", domain: "Emotional Resilience", legacyDomain: "Anxiety", text: "Feeling nervous, tense, or on edge" },
  { id: "worry", domain: "Emotional Resilience", legacyDomain: "Anxiety", text: "Worrying a lot or finding it hard to stop worrying" },
  { id: "relax", domain: "Emotional Resilience", legacyDomain: "Anxiety", text: "Difficulty relaxing even when there is time to rest" },
  { id: "irritable", domain: "Relationship & Communication Skills", legacyDomain: "Anxiety", text: "Feeling restless, irritated, or easily overwhelmed by small things" },
  { id: "overwhelmed", domain: "Independence & Responsibility", legacyDomain: "Stress", text: "Feeling that demands are piling up faster than you can handle" },
  { id: "control", domain: "Decision-Making Skills", legacyDomain: "Stress", text: "Feeling unable to control important parts of your day" },
  { id: "cope", domain: "Emotional Resilience", legacyDomain: "Stress", text: "Feeling confident that you can cope with problems", reverse: true },
  { id: "cheerful", domain: "Emotional Resilience", legacyDomain: "Wellbeing", text: "Feeling cheerful or emotionally lighter", reverse: true },
  { id: "calm", domain: "Emotional Resilience", legacyDomain: "Wellbeing", text: "Feeling calm and able to breathe through the day", reverse: true },
  { id: "active", domain: "Independence & Responsibility", legacyDomain: "Wellbeing", text: "Feeling active enough to participate in life", reverse: true },
  { id: "support", domain: "Relationship & Communication Skills", legacyDomain: "Support", text: "Having someone safe to talk to when life gets heavy", reverse: true },
  { id: "belonging", domain: "Relationship & Communication Skills", legacyDomain: "Support", text: "Feeling accepted or connected to at least one person or place", reverse: true },
  { id: "safety", domain: "Emotional Resilience", legacyDomain: "Safety", text: "Feeling unsafe, at risk of harm, or worried you may hurt yourself" },
  { id: "financial_decisions", domain: "Financial Readiness", text: "I think about needs, savings, and consequences before spending money", reverse: true },
  { id: "career_choices", domain: "Life Direction & Purpose", text: "I make career or study choices by comparing options, values, and future impact", reverse: true },
  { id: "family_responsibilities", domain: "Independence & Responsibility", text: "I can handle family or home responsibilities without waiting for pressure", reverse: true },
  { id: "relationship_priorities", domain: "Relationship & Communication Skills", text: "I can balance friendships, family, boundaries, and personal goals", reverse: true },
  { id: "work_life_balance", domain: "Independence & Responsibility", text: "I protect rest, study/work, relationships, and health instead of letting one area take over", reverse: true },
  { id: "future_planning", domain: "Life Direction & Purpose", text: "I have a clear idea of what kind of future I am trying to build", reverse: true },
  { id: "social_media_discipline", domain: "Decision-Making Skills", text: "You planned to study tonight but spent hours scrolling social media. What would you do?", options: scenarioOptions.socialMedia, directScore: true },
  { id: "delayed_gratification", domain: "Financial Readiness", text: "You can receive $50 today or $100 one month later. What would you choose?", options: scenarioOptions.delayedMoney, directScore: true },
  { id: "risk_initiative", domain: "Decision-Making Skills", text: "You want to start a small business. What would you do first?", options: scenarioOptions.riskInitiative, directScore: true },
  { id: "failure_response", domain: "Emotional Resilience", text: "You failed an important exam. What would you do?", options: scenarioOptions.failure, directScore: true },
  { id: "future_identity", domain: "Life Direction & Purpose", text: "Imagine yourself 10 years from now. Which outcome would make you most proud?", options: scenarioOptions.futureIdentity, directScore: true },
  { id: "independence_choice", domain: "Independence & Responsibility", text: "A responsibility is clearly yours, but nobody is checking yet. What would you do?", options: scenarioOptions.responsibility, directScore: true }
];

let activeTab = "home";
let isCompassResponding = false;
let futureMirrorMode = "scan";

// Future Scan - third Future Mirror mode ("help the user see the truth before
// they choose", not a checklist and not another open-ended chat - Compass AI
// already covers that). Entry flow (raw input -> one AI clarifying question ->
// scanContext) seeds every station; stations are opened as modals from the
// grid in futureScanStationGrid(). See modals.futureScanStation.
let futureScanStage = "entry"; // "entry" | "clarify" | "stations"
let isFutureScanLoading = false;
let futureScanError = "";
let futureScanRawInput = "";
let futureScanClarifyQuestion = "";
let futureScanClarifyChips = [];
let futureScanClarifyAnswer = "";
let activeFutureScan = null; // in-progress record, same shape as a trackerState.futureScans entry
let futureScanStationLoading = ""; // station id currently running, "" if none
let futureScanStationError = "";
let futureScanIdentityPicks = [];
let futureScanPressurePicks = [];
let futureScanPressureOtherText = "";
let futureScanSignalPicks = {}; // { energy: "Low"|"Medium"|"High", clarity, confidence, urgency }
let futureScanCheckBackHorizon = ""; // selected horizon id, before scheduling
let futureScanCheckBackReportText = "";
let isFutureScanSynthesisLoading = false;
let futureScanSynthesisError = "";
let futureScanSuggestedStationIds = [];

// Build Mode - activeBuildEntryId tracks which coach plan is open. Training
// sessions are stored inside each entry; the open session id is only live UI
// state.
let buildModeGoalInput = "";
let isBuildModeLoading = false;
let buildModeError = "";
let buildMomentCategory = "independence";
let costOfLivingDraft = { housing: "shared-room", district: "suburban", transport: "public", lifestyle: "moderate" };
let costOfLivingResult = null;
let activeBuildEntryId = null;
let activeBuildTrainingSessionId = null;
let isBuildTrainingLoading = false;
let buildTrainingError = "";
let buildTrainingDraft = "";

let assessmentStep = 0;
let assessmentDraft = { answers: {}, freeText: "", preferences: [] };

// Discover Yourself (Future Mirror bible Ch.3) - three short sessions rather
// than one long form, each producing a new Blueprint version. Personality/
// motivation/learning/work/decision fields are scenario-based ("what do you
// do first"), not self-labeling, per the bible's explicit reasoning that
// people are bad at naming their own style on a form.
const BLUEPRINT_VALUE_OPTIONS = ["Growth", "Stability", "Connection", "Independence", "Achievement", "Creativity", "Fairness", "Adventure"];
const BLUEPRINT_STRENGTH_OPTIONS = ["Written communication", "Pattern recognition", "Empathy", "Organisation", "Creativity", "Persistence", "Leadership", "Technical problem-solving"];

const BLUEPRINT_PERSONALITY_SCENARIO = {
  question: "Your plans change suddenly and without warning. What's closest to how you react?",
  options: [
    { value: "adaptive-fast", label: "Adjust quickly and keep moving", style: "adaptive", pace: "fast" },
    { value: "reflective-deliberate", label: "Need a short pause to reset before continuing", style: "reflective", pace: "deliberate" },
    { value: "driven-fast", label: "Feel frustrated but push through anyway", style: "driven", pace: "fast" },
    { value: "collaborative-deliberate", label: "Look to someone else for the new plan", style: "collaborative", pace: "deliberate" }
  ]
};
const BLUEPRINT_MOTIVATION_SCENARIO = {
  question: "What actually gets you to follow through on something hard?",
  options: [
    { value: "external-accountability", label: "Knowing someone else is checking in on my progress" },
    { value: "internal-purpose", label: "A clear personal reason why it matters to me" },
    { value: "competition", label: "Comparing my progress against others or a target" },
    { value: "small-rewards", label: "Breaking it into small wins with a reward at each step" }
  ]
};
const BLUEPRINT_LEARNING_SCENARIO = {
  question: "You're learning something totally new. What helps most?",
  options: [
    { value: "example-first", label: "Seeing a worked example before the theory" },
    { value: "step-by-step", label: "Clear step-by-step instructions" },
    { value: "trial-and-error", label: "Just trying it and adjusting as I go" },
    { value: "discussion", label: "Talking it through with someone else" }
  ]
};
const BLUEPRINT_WORK_SCENARIO = {
  question: "Your ideal way to actually get something done is...",
  options: [
    { value: "deep-focus-blocks", label: "One long uninterrupted focus block" },
    { value: "short-bursts", label: "Short bursts with breaks in between" },
    { value: "collaborative", label: "Working alongside other people" },
    { value: "flexible", label: "Whenever inspiration hits, on my own schedule" }
  ]
};
const BLUEPRINT_DECISION_SCENARIO = {
  question: "You're given a new task with unclear instructions. What do you do first?",
  options: [
    { value: "research-heavy", label: "Research and gather information before doing anything" },
    { value: "ask-someone", label: "Ask someone who might already know" },
    { value: "just-start", label: "Just start and adjust as I go" },
    { value: "quick-plan", label: "Make a quick plan, then go" }
  ]
};

const BLUEPRINT_SESSIONS = [
  { id: 1, title: "Values & Personality", description: "What matters most to you, and how you tend to handle change." },
  { id: 2, title: "Strengths & Motivation", description: "What you're good at, and what actually gets you to follow through." },
  { id: 3, title: "How you learn, work, and decide", description: "Three quick scenario questions - no self-labeling." }
];

let blueprintActiveSession = 1;
let blueprintDraft = { values: [], personalityChoice: "", strengths: [], strengthsOther: "", motivationChoice: "", learningChoice: "", workChoice: "", decisionChoice: "" };
let blueprintMicroInsightText = "";
let inspireSearch = "";
let inspireCategory = "All";
let opportunityCategory = "All";
let lifeSimInstance = null;
const userProfile = loadJson("steadyUserProfile", defaultUserProfile);
const trackerState = normalizeTrackerState(loadJson(scopedKey("steadyTrackerState"), defaultTrackerState));
const contentState = normalizeContentState(loadJson("steadyContentState", defaultContentState));
const settingsState = normalizeSettingsState(loadJson("steadySettingsState", defaultSettingsState));
const chatState = normalizeChatState(loadSessionJson(scopedKey("steadyChatState"), defaultChatState));

function loadJson(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : {};
    return { ...fallback, ...parsed };
  } catch {
    return { ...fallback };
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in some file previews. The prototype still works in memory.
  }
}

function loadSessionJson(key, fallback) {
  try {
    const saved = sessionStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : {};
    return { ...fallback, ...parsed };
  } catch {
    return { ...fallback };
  }
}

function saveSessionJson(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Session storage can be unavailable in some previews. The prototype still works in memory.
  }
}

function currentUserId() {
  return String(userProfile.email || "guest").trim().toLowerCase();
}

function scopedKey(baseKey) {
  return `${baseKey}:${currentUserId()}`;
}

function loadScopedTrackerState() {
  return normalizeTrackerState(loadJson(scopedKey("steadyTrackerState"), defaultTrackerState));
}

function applyScopedTrackerState() {
  Object.keys(trackerState).forEach((key) => delete trackerState[key]);
  Object.assign(trackerState, loadScopedTrackerState());
}

function loadScopedChatState() {
  return normalizeChatState(loadSessionJson(scopedKey("steadyChatState"), defaultChatState));
}

function applyScopedChatState() {
  Object.keys(chatState).forEach((key) => delete chatState[key]);
  Object.assign(chatState, loadScopedChatState());
}

function normalizeTrackerState(state) {
  const fallback = JSON.parse(JSON.stringify(defaultTrackerState));
  return {
    mood: { ...fallback.mood, ...(state.mood || {}), entries: Array.isArray(state.mood && state.mood.entries) ? state.mood.entries : fallback.mood.entries },
    receipts: Array.isArray(state.receipts) ? state.receipts : fallback.receipts,
    assessment: state.assessment || state.wellbeing || null,
    missionProgress: Array.isArray(state.missionProgress) ? state.missionProgress : fallback.missionProgress,
    roleplaySessions: Array.isArray(state.roleplaySessions) ? state.roleplaySessions : fallback.roleplaySessions,
    supportContacts: Array.isArray(state.supportContacts) ? state.supportContacts : defaultSupportContacts,
    journalEntries: Array.isArray(state.journalEntries) ? state.journalEntries : fallback.journalEntries,
    challengeProgress: Array.isArray(state.challengeProgress) ? state.challengeProgress : fallback.challengeProgress,
    savedOpportunities: Array.isArray(state.savedOpportunities) ? state.savedOpportunities : fallback.savedOpportunities,
    futureMirror: {
      ...fallback.futureMirror,
      ...(state.futureMirror || {}),
      saved: Array.isArray(state.futureMirror && state.futureMirror.saved) ? state.futureMirror.saved : fallback.futureMirror.saved
    },
    blueprint: {
      history: Array.isArray(state.blueprint && state.blueprint.history) ? state.blueprint.history : fallback.blueprint.history
    },
    reflectionEntries: Array.isArray(state.reflectionEntries) ? state.reflectionEntries : fallback.reflectionEntries,
    decisions: Array.isArray(state.decisions) ? state.decisions : fallback.decisions,
    roadmapGoals: Array.isArray(state.roadmapGoals) ? state.roadmapGoals : fallback.roadmapGoals,
    futureSelfSnapshots: Array.isArray(state.futureSelfSnapshots) ? state.futureSelfSnapshots : fallback.futureSelfSnapshots,
    futureScans: Array.isArray(state.futureScans) ? state.futureScans : fallback.futureScans,
    buildMode: {
      entries: Array.isArray(state.buildMode && state.buildMode.entries) ? state.buildMode.entries : fallback.buildMode.entries
    },
    careerStudio: {
      interviewSessions: Array.isArray(state.careerStudio && state.careerStudio.interviewSessions) ? state.careerStudio.interviewSessions : fallback.careerStudio.interviewSessions,
      resume: (state.careerStudio && state.careerStudio.resume && typeof state.careerStudio.resume === "object") ? state.careerStudio.resume : fallback.careerStudio.resume
    },
    lifeVerse: normalizeLifeVerseState(state.lifeVerse || fallback.lifeVerse),
    lifeSim: normalizeLifeSimState(state.lifeSim || fallback.lifeSim),
    activeRoleplaySessionId: state.activeRoleplaySessionId || null,
    systemTutorialsSeen: (state.systemTutorialsSeen && typeof state.systemTutorialsSeen === "object") ? state.systemTutorialsSeen : {},
    moodSuggestion: state.moodSuggestion || null
  };
}

function latestBlueprint() {
  const history = trackerState.blueprint && Array.isArray(trackerState.blueprint.history) ? trackerState.blueprint.history : [];
  return history.length ? history[history.length - 1] : null;
}

function normalizeLifeVerseState(state = {}) {
  const engine = lifeVerseEngine();
  return engine && engine.normalizeState ? engine.normalizeState(state, { profile: userProfile || defaultUserProfile }) : state;
}

function normalizeLifeSimState(state = {}) {
  const fallback = JSON.parse(JSON.stringify(defaultTrackerState.lifeSim));
  const stats = { ...fallback.stats, ...(state.stats || {}) };
  return {
    ...fallback,
    ...state,
    stats: {
      money: Number.isFinite(Number(stats.money)) ? Number(stats.money) : fallback.stats.money,
      health: clampStat(stats.health, 0, 100),
      stress: clampStat(stats.stress, 0, 100),
      skills: clampStat(stats.skills, 0, 100),
      happiness: clampStat(stats.happiness, 0, 100),
      daysPassed: Math.max(0, Math.round(Number(stats.daysPassed) || 0))
    },
    currentLocation: state.currentLocation || null,
    lastActivity: state.lastActivity || "",
    consequences: Array.isArray(state.consequences) ? state.consequences.filter(Boolean) : (state.consequence ? [String(state.consequence)] : []),
    reflection: state.reflection || "",
    consequenceToastUntil: Math.max(0, Math.round(Number(state.consequenceToastUntil) || 0)),
    reportPromptReady: Boolean(state.reportPromptReady)
  };
}

function clampStat(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function slugifyStory(value) {
  return String(value || "story")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createInspireStory(seed = {}, index = 0) {
  const category = inspireCategories.includes(seed.category) ? seed.category : "Young Achievers";
  const person = seed.person || "Inspiring person";
  const title = seed.title || `${person} story`;
  const lessons = Array.isArray(seed.keyLessons) && seed.keyLessons.length
    ? seed.keyLessons
    : ["Start with one small action.", "Ask for support early.", "Review what worked and repeat it."];
  const searchText = encodeURIComponent(`${person} interview motivation`);
  return {
    id: seed.id || slugifyStory(person),
    person,
    title,
    category,
    preview: seed.preview || "A practical story for building confidence, discipline, and independence.",
    coverImage: seed.coverImage || inspireCoverImages[category] || "assets/bg-learn-feature.png",
    readTime: seed.readTime || `${3 + (index % 3)} min`,
    youtubeUrl: seed.youtubeUrl || `https://www.youtube.com/results?search_query=${searchText}`,
    blogUrl: seed.blogUrl || `https://www.google.com/search?q=${encodeURIComponent(`${person} biography life lessons`)}`,
    podcastUrl: seed.podcastUrl || "",
    quote: seed.quote || lessons[0],
    body: seed.body || `${person}'s story is useful for youth independence because it turns success into something practical instead of something distant. ${seed.focus || "The most important lesson is to notice the habits, support systems, and decisions behind the public result."} For a young person, this does not mean copying someone else's life. It means choosing one lesson, testing it in a safe way, and building evidence that you can handle the next step.`,
    keyDecisions: Array.isArray(seed.keyDecisions) && seed.keyDecisions.length
      ? seed.keyDecisions
      : [`Chose to keep learning through pressure and uncertainty.`, `Focused on a clear problem, skill, or cause instead of chasing quick attention.`],
    afterDecisions: seed.afterDecisions || `Those decisions did not create instant success. They created momentum, feedback, stronger skills, and more opportunities over time.`,
    keyLessons: lessons,
    reflectionQuestion: seed.reflectionQuestion || "What part of this story can you apply safely today?",
    actionChallenge: seed.actionChallenge || "Choose one practical action and do it for 10 minutes.",
    published: seed.published !== false
  };
}

function normalizeContentState(state) {
  const savedStories = Array.isArray(state.stories) ? state.stories : [];
  const mergedStories = savedStories.map(normalizeStory);
  defaultContentState.stories.forEach((story) => {
    if (!mergedStories.some((item) => item.id === story.id)) mergedStories.push(story);
  });
  return {
    notice: state.notice || defaultContentState.notice,
    stories: mergedStories.length ? mergedStories : defaultContentState.stories.map(normalizeStory)
  };
}

function normalizeStory(story = {}) {
  const fallback = defaultContentState.stories.find((item) => item.id === story.id) || {};
  const fullStory = {
    ...fallback,
    ...story,
    preview: story.preview || story.quote || fallback.preview || "A short lesson for building a steadier life.",
    coverImage: story.coverImage || story.cover_image_url || fallback.coverImage || "assets/bg-learn-feature.png",
    readTime: story.readTime || story.read_time || fallback.readTime || "3 min",
    youtubeUrl: story.youtubeUrl || story.videoUrl || story.video_url || fallback.youtubeUrl || "",
    blogUrl: story.blogUrl || story.articleUrl || story.blog_url || fallback.blogUrl || "",
    podcastUrl: story.podcastUrl || story.podcast_url || fallback.podcastUrl || "",
    keyDecisions: Array.isArray(story.keyDecisions) ? story.keyDecisions : Array.isArray(fallback.keyDecisions) ? fallback.keyDecisions : ["Chose a difficult but meaningful direction.", "Built skill through repeated practice."],
    afterDecisions: story.afterDecisions || story.after_decisions || fallback.afterDecisions || "The decision created learning, feedback, and new possibilities over time.",
    keyLessons: Array.isArray(story.keyLessons) ? story.keyLessons : story.lesson ? [story.lesson] : fallback.keyLessons || ["Take one small step you can repeat."],
    reflectionQuestion: story.reflectionQuestion || story.reflection_question || fallback.reflectionQuestion || "What part of this story can you apply safely today?",
    actionChallenge: story.actionChallenge || story.action_challenge || fallback.actionChallenge || "Choose one practical action and do it for 10 minutes.",
    published: story.published !== false
  };
  fullStory.category = inspireCategories.includes(fullStory.category) && fullStory.category !== "All" ? fullStory.category : mapLegacyCategory(fullStory.category);
  return fullStory;
}

function mapLegacyCategory(category) {
  const value = String(category || "").toLowerCase();
  if (value.includes("sport") || value.includes("athlete") || value.includes("confidence")) return "Athletes";
  if (value.includes("science") || value.includes("innov") || value.includes("technology")) return "Scientists";
  if (value.includes("creative") || value.includes("creator") || value.includes("storytelling")) return "Creators";
  if (value.includes("lead") || value.includes("change") || value.includes("courage")) return "Leaders";
  if (value.includes("business") || value.includes("entrepreneur")) return "Entrepreneurs";
  if (value.includes("young") || value.includes("study") || value.includes("student") || value.includes("scholar")) return "Young Achievers";
  return "Leaders";
}

function normalizeSettingsState(state) {
  return {
    features: { ...defaultSettingsState.features, ...(state.features || {}) }
  };
}

function normalizeChatState(state) {
  return {
    messages: Array.isArray(state.messages) && state.messages.length ? state.messages : defaultChatState.messages,
    documents: Array.isArray(state.documents) ? state.documents : []
  };
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function cleanUsername(value) {
  return String(value || "").trim().replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 18);
}

function isGmailAddress(value) {
  return /^[^\s@]+@(gmail\.com|googlemail\.com)$/i.test(String(value || "").trim());
}

function saveUserProfile() {
  saveJson("steadyUserProfile", userProfile);
}

function saveTrackerState() {
  saveJson(scopedKey("steadyTrackerState"), trackerState);
}

function saveContentState() {
  saveJson("steadyContentState", contentState);
}

function saveSettingsState() {
  saveJson("steadySettingsState", settingsState);
}

function saveChatState() {
  if (Array.isArray(chatState.messages) && chatState.messages.length > 41) {
    const greeting = chatState.messages[0] && chatState.messages[0].from === "assistant" ? [chatState.messages[0]] : [];
    const recent = chatState.messages.slice(-40);
    chatState.messages = [...greeting, ...recent.filter((message) => message !== greeting[0])];
  }
  saveSessionJson(scopedKey("steadyChatState"), chatState);
}

function resetChatState() {
  chatState.messages = JSON.parse(JSON.stringify(defaultChatState.messages));
  chatState.documents = [];
  saveChatState();
}

function isAdmin() {
  return userProfile.role === "admin";
}

function displayName() {
  return escapeHTML(userProfile.username || "friend");
}

function cleanText(value, limit = 2000) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, limit);
}

// Shared by every AI call site that asks for strict-JSON replies (Future
// Scan, Build Mode, Blueprint, resume polish, roadmap generation, etc) -
// tries a clean parse first, then falls back to extracting the outermost
// {...} in case the model wrapped the JSON in prose/markdown.
function extractJsonObject(text) {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function compassProfileForAI() {
  const fields = {
    name: userProfile.name,
    ageGroup: userProfile.ageGroup,
    studentStatus: userProfile.studentStatus,
    goals: userProfile.goals,
    interests: userProfile.interests,
    stressTriggers: userProfile.stressTriggers,
    supportStyle: userProfile.supportStyle,
    dreamUniversity: userProfile.dreamUniversity,
    dreamCareer: userProfile.dreamCareer,
    dreamLifestyle: userProfile.dreamLifestyle,
    visionBoard: userProfile.visionBoard
  };
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, cleanText(value, 900)]).filter(([, value]) => value));
}

function hasCompassProfile() {
  return Object.keys(compassProfileForAI()).length > 0;
}

function userInitial() {
  return escapeHTML(((userProfile.username || "S").trim().charAt(0) || "S").toUpperCase());
}

function greetingWord() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatCurrency(value) {
  return `S$${Number(value || 0).toFixed(2)}`;
}

function todaySpendTotal() {
  return trackerState.receipts.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function todayMission() {
  const active = dailyMissions.filter((mission) => mission.is_active);
  if (!active.length) return null;
  const seed = dateKey().split("-").join("");
  return active[Number(seed) % active.length];
}

function todayMissionProgress() {
  const mission = todayMission();
  if (!mission) return null;
  return trackerState.missionProgress.find((item) => item.user_id === currentUserId() && item.date === dateKey() && item.mission_id === mission.id) || null;
}

function weeklyMissionCount() {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  return trackerState.missionProgress.filter((item) => {
    const itemDate = new Date(`${item.date}T00:00:00`);
    return item.user_id === currentUserId() && itemDate >= new Date(dateKey(weekAgo)) && itemDate <= new Date(`${dateKey(now)}T23:59:59`);
  }).length;
}

function dailyMissionCard() {
  const mission = todayMission();
  if (!mission) {
    return `
      <section class="mission-card">
        <p class="eyebrow">Daily Mission</p>
        <h3>No mission today. Check back tomorrow.</h3>
      </section>
    `;
  }
  const completed = todayMissionProgress();
  return `
    <section class="mission-card ${completed ? "is-complete" : ""}">
      <div>
        <p class="eyebrow">Daily Mission</p>
        <h3>${escapeHTML(mission.title)}</h3>
        <p>${escapeHTML(completed ? "Nice. You completed today's mission." : mission.description)}</p>
        <span>${weeklyMissionCount()} daily missions completed this week</span>
      </div>
      <button class="${completed ? "secondary-action" : "primary-action"} compact-action" type="button" data-complete-mission ${completed ? "disabled" : ""}>
        ${completed ? "Done" : "Mark as Done"}
      </button>
    </section>
  `;
}

function moodSuggestionSummary() {
  const suggestion = trackerState.moodSuggestion;
  if (!suggestion) return "";
  return `
    <section class="suggestion-card" data-open="moodGuidance">
      <img src="assets/icon-spark.png" alt="">
      <div>
        <p class="eyebrow">Energy suggestion</p>
        <h3>${escapeHTML(suggestion.title)}</h3>
        <p>${escapeHTML(suggestion.summary)}</p>
      </div>
    </section>
  `;
}

function showAuthIfNeeded() {
  if (!userProfile.email) {
    authLayer.classList.add("is-open");
    authLayer.setAttribute("aria-hidden", "false");
    setTimeout(() => authEmailInput.focus(), 80);
  }
}

function hideAuth() {
  authLayer.classList.remove("is-open");
  authLayer.setAttribute("aria-hidden", "true");
}

function featureEnabled(key) {
  return settingsState.features[key] !== false;
}

function featureCard({ title, text, icon, tab, modal, adminOnly = false }) {
  if (adminOnly && !isAdmin()) return "";
  const action = tab ? `data-tab-jump="${tab}"` : `data-open="${modal}"`;
  return `
    <button class="feature-card" type="button" ${action}>
      <img src="assets/${icon}" alt="">
      <span>${title}</span>
      <p>${text}</p>
    </button>
  `;
}

const growthChallenges = [
  { id: "confidence-7", title: "7-Day Confidence Challenge", focus: "Practice one small brave action each day." },
  { id: "study-focus-7", title: "7-Day Study Focus Challenge", focus: "Protect a short focus block and review what worked." },
  { id: "gratitude-7", title: "7-Day Gratitude Challenge", focus: "Notice one honest good thing each day." }
];

function growthActionAttributes(item) {
  if (item.modal) return `data-open="${escapeHTML(item.modal)}"`;
  if (item.tab) return `data-tab-jump="${escapeHTML(item.tab)}"`;
  if (item.prompt) return `data-growth-prompt="${escapeHTML(cleanText(item.prompt, 1800))}"`;
  return "";
}

function growthHubSection({ title, subtitle, icon, tone = "", items = [] }) {
  return `
    <section class="growth-hub-card ${tone}">
      <div class="growth-hub-head">
        <div class="growth-icon"><img src="assets/${icon}" alt=""></div>
        <div>
          <h3>${escapeHTML(title)}</h3>
          <p>${escapeHTML(subtitle)}</p>
        </div>
      </div>
      <div class="growth-chip-grid">
        ${items.map((item) => `
          <button class="growth-chip" type="button" ${growthActionAttributes(item)}>
            <strong>${escapeHTML(item.title)}</strong>
            <span>${escapeHTML(item.text)}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function latestRealMoodEntry() {
  return (trackerState.mood.entries || []).find((entry) => entry.user_id === currentUserId() || !entry.user_id) || null;
}

function realGrowthFacts() {
  const facts = [];
  const blueprint = latestBlueprint();
  if (blueprint) {
    facts.push(`Personal Blueprint v${blueprint.version}: values ${blueprint.values.join(", ") || "not set"}; strengths ${blueprint.strengths.join(", ") || "not set"}; personality ${blueprint.personality && blueprint.personality.style ? `${blueprint.personality.style} (${blueprint.personality.pace} pace)` : "not set"}; motivation style ${blueprint.motivationStyle || "not set"}; learning style ${blueprint.learningStyle || "not set"}; work style ${blueprint.workStyle || "not set"}; decision style ${blueprint.decisionStyle || "not set"}`);
  }
  const profileFields = [
    ["Goals", userProfile.goals],
    ["Dream university", userProfile.dreamUniversity],
    ["Dream career", userProfile.dreamCareer],
    ["Dream lifestyle", userProfile.dreamLifestyle],
    ["Vision board", userProfile.visionBoard],
    ["Interests", userProfile.interests],
    ["Stress triggers", userProfile.stressTriggers],
    ["Preferred support style", userProfile.supportStyle]
  ];
  profileFields.forEach(([label, value]) => {
    if (cleanText(value, 400)) facts.push(`${label}: ${cleanText(value, 400)}`);
  });
  const latestMood = latestRealMoodEntry();
  if (latestMood) {
    facts.push(`Latest mood log: ${latestMood.label}, energy ${latestMood.score}/100, note: ${cleanText(latestMood.note, 260)}, logged ${latestMood.display_time || latestMood.created_at || "recently"}`);
  }
  if (trackerState.assessment) {
    const breakdown = Array.isArray(trackerState.assessment.domainBars)
      ? trackerState.assessment.domainBars.map((item) => `${item.label} ${item.value}/100`).join(", ")
      : "";
    facts.push(`Latest Future Readiness Assessment: ${trackerState.assessment.level}, score ${trackerState.assessment.score}/100${breakdown ? `, breakdown: ${breakdown}` : ""}, next step: ${cleanText(trackerState.assessment.nextStep, 260)}`);
  }
  const missionCount = trackerState.missionProgress.filter((item) => item.user_id === currentUserId()).length;
  if (missionCount) facts.push(`Daily missions completed: ${missionCount}`);
  const roadmapGoals = myRoadmapGoals();
  if (roadmapGoals.length) {
    const nextMilestone = roadmapGoals.flatMap((goal) => goal.milestones.filter((m) => m.status !== "done").map((m) => ({ ...m, goalTitle: goal.title }))).sort((a, b) => a.month - b.month)[0];
    facts.push(`Life Roadmap goals: ${roadmapGoals.map((g) => g.title).join(", ")}.${nextMilestone ? ` Next open milestone: "${nextMilestone.title}" (month ${nextMilestone.month} of "${nextMilestone.goalTitle}").` : ""}`);
  }
  const journalCount = trackerState.journalEntries.filter((entry) => entry.user_id === currentUserId()).length;
  if (journalCount) facts.push(`Journal entries written: ${journalCount}`);
  const nativeReflections = trackerState.reflectionEntries.filter((entry) => entry.user_id === currentUserId());
  if (nativeReflections.length) {
    const byMode = nativeReflections.reduce((acc, entry) => { acc[entry.mode] = (acc[entry.mode] || 0) + 1; return acc; }, {});
    facts.push(`Reflection Engine entries: ${Object.entries(byMode).map(([mode, count]) => `${count} ${mode}`).join(", ")}. Most recent: "${cleanText(nativeReflections[0].content, 220)}"`);
  }
  const activeChallenges = trackerState.challengeProgress.filter((item) => item.user_id === currentUserId());
  if (activeChallenges.length) facts.push(`Active challenges: ${activeChallenges.map((item) => item.title).join(", ")}`);
  return facts;
}

function realGrowthFactsText() {
  const facts = realGrowthFacts();
  return facts.length ? facts.join(" | ") : "No saved Compass data yet.";
}

// Knowledge Vault / Life Dashboard - the capstone Future Mirror module. It
// does not hold its own data store: every section reads the SAME per-module
// arrays/functions the other 8 modules already write to (Blueprint history,
// futureSelfSnapshots, reflectionEntries + Decision Journal, roadmapGoals,
// careerStudio). This is a read-only aggregation view, so there is no new
// source of truth to keep in sync and nothing here can drift from what the
// other modules actually show.
function knowledgeVaultStats() {
  return [
    { label: "Blueprint versions", count: trackerState.blueprint.history.length },
    { label: "Future Self snapshots", count: trackerState.futureSelfSnapshots.length },
    { label: "Reflections & decisions", count: allReflectionLikeEntries().length },
    { label: "Roadmap goals", count: myRoadmapGoals().length },
    { label: "Interview sessions", count: trackerState.careerStudio.interviewSessions.length }
  ];
}

function knowledgeVaultBlueprintSection() {
  const blueprint = latestBlueprint();
  if (!blueprint) {
    return `<div class="vault-empty-row"><span>No Personal Blueprint yet.</span><button class="secondary-action compact-action" type="button" data-open="discoverYourself">Start</button></div>`;
  }
  return `
    <div class="vault-entry-row">
      <strong>Blueprint v${blueprint.version}</strong>
      <span>Values: ${escapeHTML(blueprint.values.join(", ") || "not set")} - Strengths: ${escapeHTML(blueprint.strengths.join(", ") || "not set")}</span>
      <button class="text-action" type="button" data-open="discoverYourself">View / update</button>
    </div>
  `;
}

function knowledgeVaultFutureSelfSection() {
  const snapshots = FUTURE_SELF_HORIZONS.map((horizon) => ({ horizon, snapshot: latestFutureSelfSnapshot(horizon.value) })).filter((item) => item.snapshot);
  if (!snapshots.length) {
    return `<div class="vault-empty-row"><span>No Future Self snapshots yet.</span><button class="secondary-action compact-action" type="button" data-tab-jump="future">Start</button></div>`;
  }
  return snapshots.map(({ horizon, snapshot }) => `
    <div class="vault-entry-row">
      <strong>${escapeHTML(horizon.label)}</strong>
      <span>${escapeHTML(cleanText(snapshot.narrative, 160))}</span>
      <button class="text-action" type="button" data-open="futureSelfView">View</button>
    </div>
  `).join("");
}

function knowledgeVaultReflectionSection() {
  const entries = allReflectionLikeEntries().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
  if (!entries.length) {
    return `<div class="vault-empty-row"><span>No reflections or saved decisions yet.</span></div>`;
  }
  return entries.map((entry) => `
    <div class="vault-entry-row">
      <strong>${escapeHTML(entry.mode === "decisionJournal" ? "Decision Journal" : entry.mode)}</strong>
      <span>${escapeHTML(cleanText(entry.content, 160))}</span>
      <span class="tiny-note">${escapeHTML(entry.displayTime || "")}</span>
    </div>
  `).join("");
}

function knowledgeVaultRoadmapSection() {
  const goals = myRoadmapGoals();
  if (!goals.length) {
    return `<div class="vault-empty-row"><span>No Life Roadmap goals yet.</span><button class="secondary-action compact-action" type="button" data-open="roadmapView">Start</button></div>`;
  }
  return goals.map((goal) => {
    const done = goal.milestones.filter((m) => m.status === "done").length;
    return `
      <div class="vault-entry-row">
        <strong>${escapeHTML(goal.title)}</strong>
        <span>${done}/${goal.milestones.length} milestones done</span>
        <button class="text-action" type="button" data-open="roadmapView">View</button>
      </div>
    `;
  }).join("");
}

function knowledgeVaultCareerSection() {
  const sessions = trackerState.careerStudio.interviewSessions;
  const resume = trackerState.careerStudio.resume;
  const rows = [];
  if (sessions.length) {
    const done = sessions.filter((s) => s.completedAt).length;
    rows.push(`<div class="vault-entry-row"><strong>Interview Practice</strong><span>${done} completed of ${sessions.length} started</span><button class="text-action" type="button" data-open="careerStudio">View</button></div>`);
  }
  if (resume && resume.polishedText) {
    rows.push(`<div class="vault-entry-row"><strong>Resume</strong><span>Last updated ${escapeHTML(new Date(resume.updatedAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }))}</span><button class="text-action" type="button" data-open="careerStudio">View</button></div>`);
  }
  if (!rows.length) {
    return `<div class="vault-empty-row"><span>No Career Studio activity yet.</span><button class="secondary-action compact-action" type="button" data-open="careerStudio">Start</button></div>`;
  }
  return rows.join("");
}

function knowledgeVaultExportText() {
  const lines = [`Future Mirror Knowledge Vault - exported ${new Date().toLocaleString()}`, ""];
  const blueprint = latestBlueprint();
  lines.push("PERSONAL BLUEPRINT", blueprint ? `v${blueprint.version} - values: ${blueprint.values.join(", ") || "not set"}; strengths: ${blueprint.strengths.join(", ") || "not set"}; work style: ${blueprint.workStyle || "not set"}; decision style: ${blueprint.decisionStyle || "not set"}` : "Not started.", "");
  lines.push("FUTURE SELF SNAPSHOTS");
  const snapshots = trackerState.futureSelfSnapshots;
  lines.push(snapshots.length ? snapshots.map((s) => `- [${s.horizon}] ${s.narrative}`).join("\n") : "None yet.", "");
  lines.push("REFLECTIONS & DECISION JOURNAL");
  const entries = allReflectionLikeEntries();
  lines.push(entries.length ? entries.map((e) => `- [${e.mode}, ${e.displayTime || ""}] ${e.content}`).join("\n") : "None yet.", "");
  lines.push("LIFE ROADMAP");
  const goals = myRoadmapGoals();
  lines.push(goals.length ? goals.map((g) => `- ${g.title}: ${g.milestones.filter((m) => m.status === "done").length}/${g.milestones.length} milestones done`).join("\n") : "None yet.", "");
  lines.push("CAREER STUDIO");
  const sessions = trackerState.careerStudio.interviewSessions;
  const resume = trackerState.careerStudio.resume;
  lines.push(`Interview sessions: ${sessions.length}${resume && resume.polishedText ? "\nResume: saved" : ""}`, "");
  return lines.join("\n");
}

function downloadKnowledgeVaultExport() {
  const text = knowledgeVaultExportText();
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "future-mirror-knowledge-vault.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function growthPromptFromData(request) {
  const facts = realGrowthFactsText();
  if (facts === "No saved Compass data yet.") {
    return `I have not added enough saved data yet. Help me choose what to track first for ${request}.`;
  }
  return `Use only my saved Compass data and do not invent anything. My data: ${facts}. Please help me with ${request}.`;
}

function growthSuggestionCard() {
  const facts = realGrowthFacts();
  if (!facts.length) {
    return `
      <section class="growth-suggestion-card">
        <div>
          <p class="eyebrow">AI Growth Suggestions</p>
          <h3>Add one real signal first</h3>
          <p>Save a goal, log a mood, write a journal entry, or start a challenge so Compass can suggest next steps from real data.</p>
        </div>
        <button class="secondary-action compact-action" type="button" data-open="growthGoals">Add goal</button>
      </section>
    `;
  }
  const latestMood = latestRealMoodEntry();
  const hasGoal = Boolean(cleanText(userProfile.goals, 20) || cleanText(userProfile.dreamCareer, 20));
  const hasJournal = trackerState.journalEntries.some((entry) => entry.user_id === currentUserId());
  let title = "Turn your data into one next step";
  let summary = "Compass can help you choose a realistic action from what you already saved.";
  if (latestMood && Number(latestMood.score) < 50) {
    title = "Start with energy before pressure";
    summary = "Your latest mood log shows lower energy, so the next step should be small, physical, and easy to begin.";
  } else if (hasGoal) {
    title = "Convert one dream into a 20-minute action";
    summary = "You have saved goal information, so the best next move is a tiny proof step, not a huge plan.";
  } else if (hasJournal) {
    title = "Use your reflection to spot a pattern";
    summary = "Your journal gives Compass real context to find one repeated blocker or strength.";
  }
  return `
    <section class="growth-suggestion-card">
      <div>
        <p class="eyebrow">AI Growth Suggestions</p>
        <h3>${escapeHTML(title)}</h3>
        <p>${escapeHTML(summary)}</p>
      </div>
      <button class="primary-action compact-action" type="button" data-growth-prompt="${escapeHTML(growthPromptFromData("one practical next step for this week"))}">Ask Compass</button>
    </section>
  `;
}

function growthOverviewStats() {
  const journalCount = trackerState.journalEntries.filter((entry) => entry.user_id === currentUserId()).length;
  const challengeCount = trackerState.challengeProgress.filter((item) => item.user_id === currentUserId()).length;
  return `
    <div class="growth-stat-grid">
      <span><strong>${cleanText(userProfile.goals, 20) ? "Saved" : "Empty"}</strong>Goals</span>
      <span><strong>${journalCount}</strong>Journal</span>
      <span><strong>${weeklyMissionCount()}</strong>Week wins</span>
      <span><strong>${challengeCount}</strong>Challenges</span>
    </div>
  `;
}

function challengeCards() {
  return growthChallenges.map((challenge) => {
    const active = trackerState.challengeProgress.find((item) => item.user_id === currentUserId() && item.id === challenge.id);
    return `
      <article class="challenge-card ${active ? "is-active" : ""}">
        <div>
          <h4>${escapeHTML(challenge.title)}</h4>
          <p>${escapeHTML(active ? `Started ${active.started_display}` : challenge.focus)}</p>
        </div>
        <button class="${active ? "secondary-action" : "primary-action"} compact-action" type="button" data-start-challenge="${escapeHTML(challenge.id)}">
          ${active ? "Restart" : "Start"}
        </button>
      </article>
    `;
  }).join("");
}

function badgeCards() {
  const completedMissions = trackerState.missionProgress.filter((item) => item.user_id === currentUserId()).length;
  const journalCount = trackerState.journalEntries.filter((entry) => entry.user_id === currentUserId()).length;
  const contacts = trackerState.supportContacts.filter((contact) => contact.user_id === currentUserId() || !contact.user_id).length;
  const badges = [
    ["First Mission", completedMissions > 0, "Complete one daily mission."],
    ["Reflective Starter", journalCount > 0, "Write one journal entry."],
    ["Support Ready", contacts > 0, "Add one trusted contact."],
    ["Challenge Started", trackerState.challengeProgress.some((item) => item.user_id === currentUserId()), "Start a 7-day challenge."]
  ];
  return badges.map(([title, unlocked, text]) => `
    <article class="badge-card ${unlocked ? "is-unlocked" : ""}">
      <span>${unlocked ? "Unlocked" : "Locked"}</span>
      <strong>${escapeHTML(title)}</strong>
      <p>${escapeHTML(text)}</p>
    </article>
  `).join("");
}

function progressReportCards() {
  const latestMood = latestRealMoodEntry();
  return `
    <div class="progress-report-grid">
      <article>
        <p class="eyebrow">Mood trend</p>
        <h4>${latestMood ? `${escapeHTML(latestMood.label)} - ${Number(latestMood.score)} energy` : "No mood log yet"}</h4>
        <p>${latestMood ? escapeHTML(latestMood.note) : "Log a mood to build a trend from real entries."}</p>
      </article>
      <article>
        <p class="eyebrow">Goal progress</p>
        <h4>${cleanText(userProfile.goals, 20) ? "Goal saved" : "No goal saved"}</h4>
        <p>${cleanText(userProfile.goals, 140) || "Add a personal goal or dream direction first."}</p>
      </article>
      <article>
        <p class="eyebrow">Challenge progress</p>
        <h4>${trackerState.challengeProgress.filter((item) => item.user_id === currentUserId()).length} active</h4>
        <p>Start or restart a 7-day challenge when you want structure.</p>
      </article>
    </div>
  `;
}

function visibleOpportunities() {
  return opportunityItems.filter((item) => opportunityCategory === "All" || item.category === opportunityCategory);
}

function savedOpportunityRecord(id) {
  return trackerState.savedOpportunities.find((item) => item.user_id === currentUserId() && item.opportunity_id === id) || null;
}

function savedOpportunityCount() {
  return trackerState.savedOpportunities.filter((item) => item.user_id === currentUserId()).length;
}

function opportunityProfileFacts() {
  const fields = [
    ["Age group", userProfile.ageGroup],
    ["Interests", userProfile.interests],
    ["Goals", userProfile.goals],
    ["Career aspiration", userProfile.dreamCareer],
    ["Student status", userProfile.studentStatus]
  ];
  return fields
    .map(([label, value]) => cleanText(value, 400) ? `${label}: ${cleanText(value, 400)}` : "")
    .filter(Boolean);
}

function opportunityRecommendationPrompt() {
  const facts = opportunityProfileFacts();
  const growthFacts = realGrowthFacts();
  const categoryList = opportunityCategories.filter((category) => category !== "All").join(", ");
  if (!facts.length && !growthFacts.length) {
    return `I have not filled in my age, interests, goals, or career aspiration yet. Ask me a few short questions, then recommend suitable opportunities from these categories: ${categoryList}. Keep it practical and youth-friendly.`;
  }
  const allFacts = facts.concat(growthFacts);
  return `Use only this saved data and do not invent anything: ${allFacts.join(" | ")}. Recommend suitable youth opportunities from these categories: ${categoryList}. Include 3 best-fit options, why they fit (referencing my saved values/strengths/goals where relevant), what to prepare, and one safe next step.`;
}

function opportunityRecommendationCard() {
  const facts = opportunityProfileFacts();
  return `
    <section class="opportunity-ai-card">
      <div>
        <p class="eyebrow">AI Recommendations</p>
        <h3>${facts.length ? "Find opportunities that match your direction" : "Personalize your opportunity search"}</h3>
        <p>${facts.length ? "Compass can use your saved age group, interests, goals, and career aspiration to suggest next steps." : "Save your age group, interests, goals, or dream career first for better recommendations."}</p>
      </div>
      <div class="opportunity-ai-actions">
        <button class="primary-action compact-action" type="button" data-opportunity-ai>Ask Compass</button>
        <button class="secondary-action compact-action" type="button" data-open="growthGoals">Edit goals</button>
      </div>
    </section>
  `;
}

function opportunityStats() {
  return `
    <div class="opportunity-stat-row">
      <span><strong>${opportunityItems.length}</strong>Opportunities</span>
      <span><strong>${savedOpportunityCount()}</strong>Saved</span>
      <span><strong>${opportunityCategories.length - 1}</strong>Categories</span>
    </div>
  `;
}

function opportunityCards() {
  const items = visibleOpportunities();
  if (!items.length) {
    return `
      <section class="empty-feature">
        <img src="assets/icon-work.png" alt="">
        <div><strong>No opportunities found</strong><p>Try another category.</p></div>
      </section>
    `;
  }
  return items.map((item) => {
    const saved = savedOpportunityRecord(item.id);
    return `
      <article class="opportunity-card ${saved ? "is-saved" : ""}">
        <div class="opportunity-card-top">
          <span class="category-badge">${escapeHTML(item.category)}</span>
          <span class="opportunity-type">${escapeHTML(item.type)}</span>
        </div>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description)}</p>
        <div class="opportunity-tags">
          ${(item.tags || []).map((tag) => `<span>${escapeHTML(tag)}</span>`).join("")}
        </div>
        <div class="opportunity-actions">
          <button class="${saved ? "secondary-action" : "primary-action"} compact-action" type="button" data-save-opportunity="${escapeHTML(item.id)}">${saved ? "Saved" : "Save for later"}</button>
          <button class="secondary-action compact-action" type="button" data-open-link="${escapeHTML(item.applyUrl)}">Apply</button>
          <button class="text-action" type="button" data-share-opportunity="${escapeHTML(item.id)}">Share</button>
        </div>
      </article>
    `;
  }).join("");
}

function shareOpportunityText(item) {
  return `${item.title}\n${item.description}\nApply/search: ${item.applyUrl}`;
}

function futureMirrorHomeHero() {
  return `
    <header class="future-home-hero">
      <div class="future-orb" aria-hidden="true"></div>
      <div class="future-home-copy">
        <p class="eyebrow">Future Mirror</p>
        <h2>Your future is built by today's choices.</h2>
        <p>Explore how your choices today may influence your future.</p>
        <button class="primary-action mint-action" type="button" data-tab-jump="future">Try Future Mirror</button>
      </div>
    </header>
  `;
}

function todayChoiceCard() {
  const latest = trackerState.futureMirror && trackerState.futureMirror.latest;
  return `
    <section class="today-choice-card">
      <div>
        <p class="eyebrow">Today's Choice</p>
        <h3>${latest ? escapeHTML(latest.question) : "What decision is asking for your attention?"}</h3>
        <p>${latest ? "Review your latest simulated paths or run a new mirror before choosing." : "Try one decision question and compare possible short-term and long-term impact."}</p>
      </div>
      <button class="secondary-action compact-action" type="button" data-tab-jump="future">${latest ? "View mirror" : "Start"}</button>
    </section>
  `;
}

function growthProgressHomeSummary() {
  const latest = latestRealMoodEntry();
  const mission = todayMission();
  const completed = todayMissionProgress();
  return `
    <section class="home-summary-card">
      <p class="eyebrow">Reflection progress</p>
      <div class="home-summary-grid">
        <span><strong>${weeklyMissionCount()}</strong>Week wins</span>
        <span><strong>${trackerState.journalEntries.filter((entry) => entry.user_id === currentUserId()).length}</strong>Journal</span>
        <span><strong>${latest ? Number(latest.score) : trackerState.mood.score}</strong>Energy</span>
      </div>
      ${mission ? `
        <div class="home-mission-mini">
          <div>
            <strong>${escapeHTML(mission.title)}</strong>
            <p>${escapeHTML(completed ? "Nice. You completed today's mission." : mission.description)}</p>
          </div>
          <button class="${completed ? "secondary-action" : "primary-action"} compact-action" type="button" data-complete-mission ${completed ? "disabled" : ""}>${completed ? "Done" : "Mark done"}</button>
        </div>
      ` : ""}
      <button class="text-action" type="button" data-tab-jump="future">Open Future Mirror</button>
    </section>
  `;
}

function futureReflectionHomeSummary() {
  const saved = savedFutureDecisions();
  const reflected = saved.filter((item) => item.lesson || item.whatHappened).length;
  return `
    <section class="home-summary-card future-home-summary">
      <p class="eyebrow">Future Reflection</p>
      <div class="home-summary-grid">
        <span><strong>${saved.length}</strong>Saved decisions</span>
        <span><strong>${reflected}</strong>Reflected</span>
        <span><strong>${trackerState.futureMirror.latest ? "Ready" : "New"}</strong>Mirror</span>
      </div>
      <p>${saved.length ? "Revisit decisions later and compare what you expected with what actually happened." : "Save a Future Mirror result, then return later to record what happened and what you learned."}</p>
      <button class="text-action" type="button" data-tab-jump="future">Open Future Reflection</button>
    </section>
  `;
}

function compassQuickAccessCard() {
  return `
    <section class="compass-home-card">
      <div>
        <p class="eyebrow">Compass AI</p>
        <h3>Talk through the next move.</h3>
        <p>Use Compass AI to reflect on a Future Mirror result or turn an Inspire lesson into action.</p>
      </div>
      <button class="primary-action compact-action" type="button" data-tab-jump="compass">Open chat</button>
    </section>
  `;
}

function todayInsightCard() {
  const latestMood = latestRealMoodEntry();
  const latestMirror = trackerState.futureMirror && trackerState.futureMirror.latest;
  let title = "Every choice writes your future.";
  let text = "Choose one decision, one growth action, and one reflection today.";
  if (latestMirror) {
    title = "Your latest mirror is ready to use.";
    text = "Connect that decision to your goals, journal, mood, or one small challenge before the day ends.";
  } else if (latestMood) {
    title = `${latestMood.label} energy can still guide a good choice.`;
    text = Number(latestMood.score) < 50
      ? "Keep today's action small and kind. A low-energy day still counts when you choose one steady step."
      : "Use the energy you logged to protect one focused action that supports your future.";
  }
  return `
    <section class="today-insight-card">
      <p class="eyebrow">Today's Insight</p>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(text)}</p>
      <div class="today-insight-actions">
        <button class="secondary-action compact-action" type="button" data-open="mood">Check in</button>
        <button class="secondary-action compact-action" type="button" data-open="journal">Reflect</button>
      </div>
    </section>
  `;
}

function futureScoreHomeCard() {
  const latest = trackerState.futureMirror && trackerState.futureMirror.latest;
  const score = latest && latest.futureScore ? latest.futureScore : null;
  const overall = score ? Number(score.overall || 0) : Math.round((Number(trackerState.mood.score || 0) + Math.min(100, weeklyMissionCount() * 20)) / 2);
  return `
    <section class="future-score-home-card">
      <div class="future-score-ring small-ring" style="--score:${overall}">
        <strong>${overall}</strong>
      </div>
      <div>
        <p class="eyebrow">Future Score</p>
        <h3>${score ? "Based on your latest Future Mirror" : "Start with one mirror to personalize this"}</h3>
        <p>${escapeHTML(score ? score.explanation : "This score becomes more meaningful when Future Mirror connects to your goals, mood, journal, and challenges.")}</p>
      </div>
      <button class="text-action" type="button" data-tab-jump="future">${score ? "View score" : "Try Future Mirror"}</button>
    </section>
  `;
}

function homeQuickAccessGrid() {
  const items = [
    ["icon-chat.png", "Compass AI", "Ask, plan, reflect", "compass"],
    ["icon-learn.png", "Growth", "Goals, journal, mood", "growth"],
    ["icon-balance.png", "Life Sim", "Play adult-life choices", "simulator"],
    ["icon-support.png", "Community", "Groups and support", "community"],
    ["icon-work.png", "Opportunities", "Scholarships and internships", "opportunities"]
  ];
  return `
    <section class="home-quick-access">
      <div class="section-row">
        <div>
          <p class="eyebrow">Quick Access</p>
          <h3>All tools stay connected to Future Mirror.</h3>
        </div>
      </div>
      <div class="home-quick-grid">
        ${items.map(([icon, title, text, tab]) => `
          <button type="button" data-tab-jump="${tab}">
            <img src="assets/${icon}" alt="">
            <strong>${title}</strong>
            <span>${text}</span>
          </button>
        `).join("")}
        <button type="button" data-jump-future-scan>
          <img src="assets/icon-guide.png" alt="">
          <strong>Future Scan</strong>
          <span>See the truth before you choose</span>
        </button>
        <button type="button" data-jump-build-mode>
          <img src="assets/icon-decide.png" alt="">
          <strong>Build Mode</strong>
          <span>AI coach training</span>
        </button>
      </div>
    </section>
  `;
}

function lifeVerseState() {
  trackerState.lifeVerse = normalizeLifeVerseState(trackerState.lifeVerse || createDefaultLifeVerseState());
  return trackerState.lifeVerse;
}

// Community actions (posting, joining a squad, sharing a milestone) nudge the
// user's own LifeVerse simulation - this is what makes Community feel
// connected to the rest of the app instead of a bolted-on forum.
function bumpCommunityTrust(amount) {
  const state = lifeVerseState();
  state.npcSimulation.communityTrust = window.LifeVerseGame.clamp(Number(state.npcSimulation.communityTrust || 0) + amount);
  saveTrackerState();
  syncCommunityProfileSnapshot();
}

async function syncCommunityProfileSnapshot() {
  if (!hasCommunitySession()) return;
  const client = getCommunitySupabaseClient();
  if (!client) return;
  const state = lifeVerseState();
  try {
    await client.from("profiles").update({
      community_trust_snapshot: Math.round(state.npcSimulation.communityTrust || 0),
      community_mood_snapshot: state.world ? state.world.communityMood : null
    }).eq("id", communityUserId());
  } catch (error) {
    console.error("[Community] syncCommunityProfileSnapshot failed", error);
  }
}

async function syncCommunityBadges() {
  if (!hasCommunitySession()) return;
  const client = getCommunitySupabaseClient();
  if (!client) return;
  const state = lifeVerseState();
  const communityBadges = (state.progression.achievements || [])
    .filter((achievement) => achievement.id.startsWith("community-"))
    .map((achievement) => ({ id: achievement.id, title: achievement.title, unlockedAt: achievement.unlockedAt }));
  try {
    await client.from("profiles").update({ badges: communityBadges }).eq("id", communityUserId());
  } catch (error) {
    console.error("[Community] syncCommunityBadges failed", error);
  }
}

// Non-ranking contribution badges (idea 9) - reuses the existing, already
// idempotent LifeVerseGame.addAchievement. Never surfaced as a leaderboard,
// just unordered chips on post/squad cards.
function checkCommunityAchievements() {
  if (!hasCommunitySession()) return;
  const state = lifeVerseState();
  const myId = communityUserId();
  const myPosts = communityPostsCacheSnapshot().filter((post) => post.author_id === myId && post.status === "published");
  const mySquadMemberships = communitySquadMembersCacheSnapshot().filter((member) => member.user_id === myId);
  const myConnections = communityAccountabilityConnectionsSnapshot().filter((connection) => connection.status === "accepted" && (connection.requester_id === myId || connection.recipient_id === myId));

  let unlockedAny = false;
  if (myPosts.length >= 1 && window.LifeVerseGame.addAchievement(state, "community-first-post", "First Post", "Published your first Community post.")) unlockedAny = true;
  if (myPosts.length >= 5 && window.LifeVerseGame.addAchievement(state, "community-five-posts", "Steady Voice", "Published 5 Community posts.")) unlockedAny = true;
  if (mySquadMemberships.length >= 1 && window.LifeVerseGame.addAchievement(state, "community-squad-joined", "Joined a Squad", "Joined your first Community squad.")) unlockedAny = true;
  if (myPosts.some((post) => post.post_type === "milestone") && window.LifeVerseGame.addAchievement(state, "community-milestone-share", "Milestone Shared", "Shared a completed roadmap milestone with the Community.")) unlockedAny = true;
  if (myConnections.length >= 1 && window.LifeVerseGame.addAchievement(state, "community-accountability-connected", "Found an Accountability Partner", "Connected with an accountability partner in Community.")) unlockedAny = true;

  if (unlockedAny) {
    saveTrackerState();
    syncCommunityBadges();
  }
}

// First deliberate crossing of the Future Mirror <-> LifeVerse boundary
// ("separate system from LifeVerse - no shared state, no cross-reads" per
// the comment near defaultTrackerState.futureMirror). Future Scan's
// noActionFuture/hiddenCosts stations use this to ground their AI narrative
// in a real simulated outcome instead of a purely imagined one. Always
// clones lifeVerseState() and discards the clone after use - the user's
// real LifeVerse save is never read-written here, only read-copied.
function lifeVerseNoActionSnapshot(days) {
  const clone = JSON.parse(JSON.stringify(lifeVerseState()));
  let result = window.LifeVerseGame.dispatchLifeVerseCommand(clone, {
    type: "FastForwardCommand",
    actor: "future-scan",
    payload: { days }
  });
  // Standalone (non-live-game) use: a scripted mid-window intervention would
  // normally pause for the player to choose - here there's no player to ask,
  // so auto-resolve with the first listed choice to always get a complete
  // event instead of leaving the clone mid-decision.
  let guard = 0;
  while (result.pendingIntervention && guard < 5) {
    result = window.LifeVerseGame.dispatchLifeVerseCommand(clone, {
      type: "ResolveFastForwardInterventionCommand",
      actor: "future-scan",
      payload: { choiceId: result.pendingIntervention.choices[0].id }
    });
    guard += 1;
  }
  return { state: clone, event: result.event };
}

function syncLifeSimFromLifeVerse() {
  const state = lifeVerseState();
  if (!state) return;
  const stats = lifeSimStats();
  stats.money = Math.round(Number(state.finance.money) || 0);
  stats.health = clampStat(state.health.physical);
  stats.stress = clampStat(state.needs.stress);
  stats.skills = clampStat(Math.round((state.player.skills.career + state.player.skills.learning + state.player.skills.lifeManagement) / 3));
  stats.happiness = clampStat(Math.round((state.needs.purpose + state.relationships.support + state.mentalWellbeing.motivation) / 3));
  stats.daysPassed = Math.max(0, Number(state.time.day || 1) - 1);
}

function lifeVerseViewModel() {
  const engine = lifeVerseEngine();
  const state = lifeVerseState();
  return engine && engine.getViewModel ? engine.getViewModel(state) : null;
}

function lifeVerseGameShell() {
  const state = lifeVerseState();
  const view = lifeVerseViewModel();
  if (!state || !view) {
    return `
      <section class="lifeverse-shell">
        <p class="eyebrow">LifeVerse</p>
        <h3>LifeVerse is loading.</h3>
        <p>Refresh once if the game systems do not appear.</p>
      </section>
    `;
  }
  return `
    <section class="lifeverse-shell volume04-world-first" data-lifeverse-shell data-lifeverse-view="${escapeHTML(state.activeView || "today")}">
      ${lifeVerseTopHud(state, view)}
      ${lifeVerseCriticalNeeds(state)}
      ${lifeVerseWorldFirstContext(state, view)}
      ${lifeVerseGameDock(state)}
      ${lifeVerseOverlayPanel(state, view)}
      ${lifeVerseConsequenceToast()}
    </section>
  `;
}

function lifeVerseTopHud(state, view) {
  const hud = lifeVerseEngine()?.lifeVerseUx?.getMinimalHud
    ? lifeVerseEngine().lifeVerseUx.getMinimalHud(state)
    : {
      time: view.time.time,
      day: view.time.dayOfWeek,
      date: view.time.date,
      money: state.finance.money,
      health: state.health.physical,
      energy: state.needs.energy,
      objective: view.needsSummary || "Choose one grounded action."
    };
  return `
    <div class="lifeverse-hud">
      <div class="lifeverse-time-card" aria-label="In-game time">
        <span>${escapeHTML(hud.day)}</span>
        <strong>${escapeHTML(hud.time)}</strong>
        <small>${escapeHTML(hud.date)}</small>
      </div>
      <div class="lifeverse-hud-stats" aria-label="Minimal status">
        <span><small>Money</small><strong>${formatCurrency(hud.money)}</strong></span>
        <span><small>Health</small><strong>${Math.round(hud.health)}</strong></span>
        <span><small>Energy</small><strong>${Math.round(hud.energy)}</strong></span>
      </div>
      <div class="lifeverse-objective-pill">
        <small>Current reminder</small>
        <strong>${escapeHTML(hud.objective)}</strong>
      </div>
    </div>
  `;
}

function lifeVerseCriticalNeeds(state) {
  const critical = lifeVerseEngine()?.lifeVerseUx?.getCriticalNeeds
    ? lifeVerseEngine().lifeVerseUx.getCriticalNeeds(state)
    : [];
  if (!critical.length) return "";
  return `
    <aside class="lifeverse-dynamic-hud" aria-label="Needs warning">
      ${critical.slice(0, 3).map((need) => `
        <span class="lifeverse-need-pill is-${escapeHTML(need.severity || "warning")}">
          <strong>${escapeHTML(need.label)}</strong>${Math.round(need.value)}/100
        </span>
      `).join("")}
    </aside>
  `;
}

function lifeVerseWorldFirstContext(state) {
  const location = trackerState.lifeSim.currentLocation;
  const locationInfo = lifeSimLocations.find((item) => item.id === location);
  const activities = lifeVerseActivitiesForLocation(location);
  const interactions = lifeVerseEngine()?.lifeVerseUx?.getLocationInteractions
    ? lifeVerseEngine().lifeVerseUx.getLocationInteractions(state, location, activities)
    : [];
  if (!locationInfo && !interactions.length && !activities.length) {
    return `<div class="lifeverse-subtle-hint" aria-label="Explore hint">Move near a place to interact</div>`;
  }
  return `
    <section class="lifeverse-context-prompt ${locationInfo ? "" : "is-exploring"}" aria-label="Context interaction">
      <div>
        <p class="eyebrow">${locationInfo ? "Context interaction" : "Explore mode"}</p>
        <h3>${escapeHTML(locationInfo ? locationInfo.name : "Walk toward a place")}</h3>
        <span>${escapeHTML(locationInfo ? locationInfo.description : "The world is the primary interface. Move near a recognizable LifeVerse place.")}</span>
      </div>
      <div class="lifeverse-context-actions">
        ${interactions.length ? interactions.map(lifeVerseContextButton).join("") : activities.slice(0, 2).map(lifeVerseActivityCard).join("")}
      </div>
    </section>
  `;
}

function lifeVerseContextButton(action) {
  if (action.fastForwardDays) {
    return `
      <button class="lifeverse-context-button" type="button" data-lifeverse-fast-forward="${escapeHTML(action.fastForwardDays)}">
        <strong>${escapeHTML(action.object)}</strong>
        <span>${escapeHTML(action.hint)}</span>
      </button>
    `;
  }
  if (action.activityId) {
    return `
      <button class="lifeverse-context-button" type="button" data-lifeverse-activity="${escapeHTML(action.activityId)}">
        <strong>${escapeHTML(action.object)}</strong>
        <span>${escapeHTML(action.hint)}</span>
      </button>
    `;
  }
  return `
    <button class="lifeverse-context-button" type="button" data-lifeverse-system-action="${escapeHTML(action.systemId)}:${escapeHTML(action.actionId)}">
      <strong>${escapeHTML(action.object)}</strong>
      <span>${escapeHTML(action.hint)}</span>
    </button>
  `;
}

function lifeVerseGameDock(state) {
  const items = [
    ["phone", "Phone"],
    ["journal", "Journal"],
    ["map", "Map"],
    ["pause", "Pause"]
  ];
  const active = state.activeView || "today";
  return `
    <nav class="lifeverse-game-dock" aria-label="LifeVerse in-game tools">
      ${items.map(([id, label]) => `
        <button type="button" data-lifeverse-tab="${id}" class="${active === id ? "is-active" : ""}">
          <span>${label.slice(0, 2)}</span>
          <strong>${label}</strong>
        </button>
      `).join("")}
    </nav>
  `;
}

function lifeVerseInterventionPanel(state) {
  const pending = state.simulation.pendingIntervention;
  return `
    <section class="lifeverse-overlay-panel lifeverse-intervention-panel" data-lifeverse-intervention>
      <div class="lifeverse-panel-head">
        <div>
          <p class="eyebrow">A decision point</p>
          <h3>${escapeHTML(pending.title)}</h3>
        </div>
      </div>
      <p class="lifeverse-note">${escapeHTML(pending.prompt)}</p>
      <div class="lifeverse-intervention-choices">
        ${(pending.choices || []).map((choice) => `
          <button type="button" data-lifeverse-intervention-choice="${escapeHTML(choice.id)}">
            <strong>${escapeHTML(choice.label)}</strong>
            <span>${escapeHTML(choice.description)}</span>
          </button>
        `).join("")}
      </div>
      <p class="lifeverse-note">Fast Forward is paused until you choose.</p>
    </section>
  `;
}

function lifeVerseOverlayPanel(state, view) {
  if (state.simulation && state.simulation.pendingIntervention) return lifeVerseInterventionPanel(state);
  const active = state.activeView || "today";
  if (active === "phone") return lifeVersePhonePanel(state);
  if (active === "journal") return lifeVerseJournalPanel(state, view);
  if (active === "map" || active === "world") return lifeVerseMapPanel(state);
  if (active === "pause" || active === "profile") return lifeVersePausePanel(state, view);
  if (active === "fastForward") return lifeVerseFastForwardPanel(state, view);
  if (active === "report") return lifeVerseReportPanel(state, view);
  if (active === "life") return lifeVerseLifePanel(state, view);
  return "";
}

function lifeVerseCloseOverlayButton() {
  return `<button class="lifeverse-mini-button" type="button" data-lifeverse-tab="today">Return to world</button>`;
}

function lifeVersePhonePanel(state) {
  const apps = lifeVerseEngine()?.lifeVerseUx?.getPhoneApps
    ? lifeVerseEngine().lifeVerseUx.getPhoneApps(state)
    : [];
  return `
    <section class="lifeverse-phone-overlay lifeverse-overlay-panel" aria-label="In-game phone">
      <div class="lifeverse-phone-device">
        <div class="lifeverse-phone-head">
          <span>${escapeHTML(state.player.name || "Player")}'s Phone</span>
          ${lifeVerseCloseOverlayButton()}
        </div>
        <div class="lifeverse-phone-apps">
          ${apps.map((app) => lifeVersePhoneAppButton(app)).join("")}
        </div>
        <div class="lifeverse-phone-card">
          <p class="eyebrow">Quick life actions</p>
          <button type="button" data-lifeverse-tab="fastForward"><strong>Open Calendar Fast Forward</strong><span>Preview how repeated days may compound.</span></button>
          <button type="button" data-lifeverse-system-action="finance:set-week-budget"><strong>Set weekly budget</strong><span>Plan this week's money before pressure rises.</span></button>
          <button type="button" data-lifeverse-system-action="mentalWellbeing:stress-reset"><strong>Take a stress reset</strong><span>Calm pressure before the next choice.</span></button>
        </div>
      </div>
    </section>
  `;
}

function lifeVersePhoneAppButton(app) {
  const attrs = app.target
    ? `data-tab-jump="${escapeHTML(app.target)}"`
    : `data-lifeverse-tab="${escapeHTML(app.view || "phone")}"`;
  return `
    <button type="button" class="lifeverse-phone-app" data-lifeverse-phone-action="${escapeHTML(app.id)}" ${attrs}>
      <i>${escapeHTML(app.icon)}</i>
      <strong>${escapeHTML(app.title)}</strong>
      <span>${escapeHTML(app.text)}</span>
    </button>
  `;
}

function lifeVerseJournalPanel(state, view) {
  const report = view.latestReport;
  return `
    <section class="lifeverse-overlay-panel lifeverse-journal-panel">
      <div class="lifeverse-panel-head">
        <div>
          <p class="eyebrow">Journal</p>
          <h3>Reflection after living, not during living.</h3>
        </div>
        ${lifeVerseCloseOverlayButton()}
      </div>
      ${lifeVerseScheduleRail(state)}
      ${lifeVerseTodayLog(state)}
      <div class="lifeverse-section-title"><strong>Recent traces</strong><span>${(state.traces || []).length} total</span></div>
      <div class="lifeverse-report-list">
        ${(state.traces || []).slice(-5).reverse().map((trace) => `
          <span><b>${escapeHTML(trace.cause)}</b>${escapeHTML(trace.reflectionPrompt || "What can this teach you?")}</span>
        `).join("") || `<span>No traces yet. Live one action first.</span>`}
      </div>
      <div class="lifeverse-journal-actions">
        <button type="button" data-lifeverse-report-now>Create Life Report</button>
        ${report ? `<button type="button" data-lifeverse-tab="report">Read latest report</button>` : ""}
      </div>
    </section>
  `;
}

function lifeVerseTodayLog(state) {
  const items = (state.events || []).slice(-8).reverse();
  if (!items.length) {
    return `
      <div class="lifeverse-today-log">
        <div class="lifeverse-section-title"><strong>Today's log</strong><span>No events yet</span></div>
        <p>Live one action to start building today's story.</p>
      </div>
    `;
  }
  return `
    <div class="lifeverse-today-log">
      <div class="lifeverse-section-title"><strong>Today's log</strong><span>${items.length} recent</span></div>
      ${items.map((event) => `
        <article class="lifeverse-today-log-entry">
          <strong>${escapeHTML(event.title)}</strong>
          <ul>${(event.consequences || []).map((line) => `<li>${escapeHTML(line)}</li>`).join("") || `<li>${escapeHTML(event.summary || "Something changed.")}</li>`}</ul>
          ${event.reflection ? `<p class="lifeverse-today-log-reflection">${escapeHTML(event.reflection)}</p>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function lifeVerseMapPanel(state) {
  const locations = lifeSimLocations.map((location) => ({
    ...location,
    active: trackerState.lifeSim.currentLocation === location.id
  }));
  return `
    <section class="lifeverse-overlay-panel lifeverse-map-panel">
      <div class="lifeverse-panel-head">
        <div>
          <p class="eyebrow">Map</p>
          <h3>${escapeHTML(state.world.district)}</h3>
        </div>
        ${lifeVerseCloseOverlayButton()}
      </div>
      <div class="lifeverse-map-grid">
        ${locations.map((location) => `
          <article class="${location.active ? "is-current" : ""}">
            <strong>${escapeHTML(location.name)}</strong>
            <span>${escapeHTML(location.description)}</span>
            ${location.active
              ? `<span class="lifeverse-map-current-tag">You are here</span>`
              : `<button type="button" class="lifeverse-mini-button" data-lifeverse-travel="${escapeHTML(location.id)}">Take the MRT here</button>`}
          </article>
        `).join("")}
      </div>
      ${lifeVerseWorldPanel(state, { compact: true })}
    </section>
  `;
}

function lifeVersePausePanel(state, view) {
  return `
    <section class="lifeverse-overlay-panel lifeverse-pause-panel">
      <div class="lifeverse-panel-head">
        <div>
          <p class="eyebrow">Pause</p>
          <h3>Game controls and progress.</h3>
        </div>
        ${lifeVerseCloseOverlayButton()}
      </div>
      <div class="lifeverse-pause-actions">
        <button type="button" data-lifeverse-tab="phone">Continue</button>
        <button type="button" data-lifeverse-tab="profile">Progress profile</button>
        <button type="button" data-lifeverse-tab="fastForward">Fast Forward</button>
        <button type="button" data-lifeverse-reset>Reset LifeVerse</button>
        <button type="button" data-tab-jump="home">Exit to Compass</button>
      </div>
      ${lifeVerseProfilePanel(state, view)}
    </section>
  `;
}

function lifeVerseNeedsBars(state) {
  const needs = [
    ["energy", "Energy"],
    ["hunger", "Food"],
    ["sleep", "Sleep"],
    ["social", "Social"],
    ["stress", "Stress"],
    ["purpose", "Purpose"]
  ];
  return `
    <div class="lifeverse-needs-grid">
      ${needs.map(([key, label]) => {
        const value = Math.round(Number(state.needs[key]) || 0);
        const inverse = key === "stress";
        const tone = inverse ? (value > 70 ? "danger" : value > 45 ? "warn" : "good") : (value < 35 ? "danger" : value < 55 ? "warn" : "good");
        return `
          <div class="lifeverse-need ${tone}">
            <span>${label}</span>
            <i><b style="width:${value}%"></b></i>
            <strong>${value}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function lifeVerseActivitiesForLocation(locationId) {
  const engine = lifeVerseEngine();
  const state = lifeVerseState();
  return engine && engine.getAvailableActivities ? engine.getAvailableActivities(state, { locationId }) : [];
}

function lifeVerseActivityCard(activity) {
  const duration = lifeVerseEngine()?.durationLabel ? lifeVerseEngine().durationLabel(activity.durationMinutes) : `${activity.durationMinutes} min`;
  return `
    <button class="lifeverse-activity-card" type="button" data-lifeverse-activity="${escapeHTML(activity.id)}">
      <span>${escapeHTML(activity.category)}</span>
      <strong>${escapeHTML(activity.title)}</strong>
      <small>${escapeHTML(duration)} - ${escapeHTML(activity.consequence)}</small>
    </button>
  `;
}

function lifeVerseScheduleRail(state) {
  const items = (state.schedule || []).slice(-4).reverse();
  if (!items.length) {
    return `
      <div class="lifeverse-schedule">
        <div class="lifeverse-section-title"><strong>Today schedule</strong><span>No actions yet</span></div>
        <p>Choose one activity to start living the day.</p>
      </div>
    `;
  }
  return `
    <div class="lifeverse-schedule">
      <div class="lifeverse-section-title"><strong>Today schedule</strong><span>${items.length} recent</span></div>
      ${items.map((item) => `
        <article>
          <strong>${escapeHTML(item.title)}</strong>
          <span>${escapeHTML(item.start)} -> ${escapeHTML(item.end)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function lifeVerseLifePanel(state, view) {
  const systems = (view && view.systems && view.systems.length)
    ? view.systems
    : (lifeVerseEngine()?.systems ? lifeVerseEngine().systems().map((system) => ({
      id: system.id,
      title: system.title,
      chapter: system.chapter,
      summary: typeof system.summary === "function" ? system.summary(state) : "",
      metrics: typeof system.metrics === "function" ? system.metrics(state) : [],
      actions: system.actions || []
    })) : []);
  return `
    <section class="lifeverse-panel">
      <div class="lifeverse-panel-head">
        <div>
          <p class="eyebrow">Life</p>
          <h3>Choose one life decision and see what it costs, supports, or delays.</h3>
        </div>
      </div>
      <div class="lifeverse-system-stack">
        ${systems.length ? systems.map(lifeVerseSystemCard).join("") : `
          <div class="lifeverse-empty">
            <strong>Life systems are loading</strong>
            <span>Refresh once if Career, Education, Finance, Housing, and Transport do not appear.</span>
          </div>
        `}
      </div>
    </section>
  `;
}

const SYSTEM_TUTORIAL_HINTS = {
  career: "Career tracks your job readiness, performance, and burnout. Preparation and consistency matter more than luck here.",
  education: "Education builds skills and qualifications over time - it pays off later, not immediately.",
  finance: "Finance is your money, savings, debt, credit, and investments. Small habits here compound into big outcomes.",
  housing: "Housing affects your comfort, cost of living, and how far you commute every day.",
  transportation: "Transportation is how you get around - it trades money, time, and stress against each other.",
  relationships: "Relationships track the people supporting you. Neglect them and support quietly disappears.",
  health: "Health reflects sleep, food, and activity over time - it rarely drops from one bad day, only from a bad pattern.",
  mentalWellbeing: "Mental wellbeing tracks stress, motivation, and burnout risk - protect it before it protects itself.",
  economy: "Economy is the world around you - inflation and job market shift on their own, and you adapt to them.",
  npcSimulation: "NPC Simulation is the community around you - neighbours keep living their own lives whether you visit or not.",
  worldSimulation: "World Simulation is the wider city - it evolves in the background and quietly shapes every other system.",
  progression: "Progression reflects long-term growth across every system, not a simple level-up counter."
};

function lifeVerseSystemTutorialHint(system) {
  if (trackerState.systemTutorialsSeen[system.id]) return "";
  const hint = SYSTEM_TUTORIAL_HINTS[system.id];
  if (!hint) return "";
  return `
    <div class="lifeverse-system-tutorial" data-lifeverse-system-tutorial="${escapeHTML(system.id)}">
      <span>${escapeHTML(hint)}</span>
      <button type="button" data-dismiss-system-tutorial="${escapeHTML(system.id)}">Got it</button>
    </div>
  `;
}

function lifeVerseSystemCard(system) {
  return `
    <article class="lifeverse-system-card">
      <div class="lifeverse-system-head">
        <div>
          <span>${escapeHTML(system.chapter || "Volume 02")}</span>
          <strong>${escapeHTML(system.title || "Life system")}</strong>
          <small>${escapeHTML(system.summary || "")}</small>
        </div>
      </div>
      ${lifeVerseSystemTutorialHint(system)}
      <div class="lifeverse-system-metrics">
        ${(system.metrics || []).slice(0, 4).map(([label, value]) => `
          <span><small>${escapeHTML(label)}</small><b>${escapeHTML(value)}</b></span>
        `).join("")}
      </div>
      <div class="lifeverse-system-actions">
        ${(system.actions || []).map((action) => `
          <button type="button" data-lifeverse-system-action="${escapeHTML(system.id)}:${escapeHTML(action.id)}">
            <strong>${escapeHTML(action.title)}</strong>
            <span>${escapeHTML(lifeVerseActionMeta(action))}</span>
            <small>${escapeHTML(action.description)}</small>
          </button>
        `).join("")}
      </div>
    </article>
  `;
}

function lifeVerseActionMeta(action) {
  const duration = lifeVerseEngine()?.durationLabel ? lifeVerseEngine().durationLabel(action.durationMinutes || 30) : `${action.durationMinutes || 30} min`;
  const effects = action.effects || {};
  const parts = [duration];
  if (effects.finance && Number(effects.finance.money)) parts.push(`Money ${Number(effects.finance.money) > 0 ? "+" : ""}${formatCurrency(effects.finance.money)}`);
  if (effects.needs && Number(effects.needs.stress)) parts.push(`Stress ${Number(effects.needs.stress) > 0 ? "+" : ""}${effects.needs.stress}`);
  if (effects.career) parts.push("Career impact");
  if (effects.education) parts.push("Education impact");
  if (effects.housing) parts.push("Housing impact");
  if (effects.transportation) parts.push("Transport impact");
  if (effects.relationships) parts.push("Relationship impact");
  if (effects.health) parts.push("Health impact");
  if (effects.mentalWellbeing) parts.push("Wellbeing impact");
  if (effects.economy || effects.worldSimulation) parts.push("World impact");
  if (effects.npcSimulation) parts.push("NPC impact");
  if (effects.progression) parts.push("Progression impact");
  return parts.join(" - ");
}

function lifeVerseWorldPanel(state) {
  return `
    <section class="lifeverse-panel">
      <div class="lifeverse-panel-head">
        <div>
          <p class="eyebrow">World</p>
          <h3>${escapeHTML(state.world.district)}</h3>
        </div>
      </div>
      <div class="lifeverse-world-list">
        <article><span>Weather</span><strong>${escapeHTML(state.world.weather)}</strong></article>
        <article><span>Economy</span><strong>${escapeHTML(state.world.economy)}</strong></article>
        <article><span>Cost of living</span><strong>${Math.round(state.world.costOfLiving)}/100</strong></article>
        <article><span>Transport load</span><strong>${escapeHTML(state.world.transportLoad)}</strong></article>
        <article><span>Community mood</span><strong>${escapeHTML(state.world.communityMood)}</strong></article>
        <article><span>Job market</span><strong>${Math.round(state.economy.jobMarket)}/100</strong></article>
        <article><span>Inflation pressure</span><strong>${Math.round(state.economy.inflation)}/100</strong></article>
        <article><span>Community trust</span><strong>${Math.round(state.npcSimulation.communityTrust)}/100</strong></article>
        <article><span>World climate</span><strong>${escapeHTML(state.worldSimulation.economyClimate)}</strong></article>
        <article><span>Housing market pressure</span><strong>${Math.round(state.worldSimulation.housingMarketPressure)}/100</strong></article>
        <article><span>Transport reliability</span><strong>${Math.round(state.worldSimulation.transportationReliability)}/100</strong></article>
        <article><span>Education opportunity</span><strong>${Math.round(state.worldSimulation.educationOpportunityLevel)}/100</strong></article>
        <article><span>Public health</span><strong>${Math.round(state.worldSimulation.publicHealthCondition)}/100</strong></article>
        <article><span>Social trust</span><strong>${Math.round(state.worldSimulation.socialTrustLevel)}/100</strong></article>
        <article><span>District activity</span><strong>${Math.round(state.worldSimulation.districtActivityLevel)}/100</strong></article>
      </div>
      ${(state.worldSimulation.randomEvents || []).length ? `
        <div class="lifeverse-section-title"><strong>Latest world event</strong><span>${escapeHTML(state.worldSimulation.randomEvents[0].title)}</span></div>
        <p class="lifeverse-note">${escapeHTML(state.worldSimulation.randomEvents[0].summary)}</p>
      ` : ""}
      <div class="lifeverse-section-title"><strong>District NPCs</strong><span>${(state.npcs || []).length} simulated lives</span></div>
      <div class="lifeverse-world-list">
        ${(state.npcs || []).slice(0, 4).map((npc) => `
          <article>
            <span>${escapeHTML(npc.role)} - ${escapeHTML(npc.location)}</span>
            <strong>${escapeHTML(npc.name)}</strong>
            <small>${escapeHTML(npc.lastDecision)} - Relationship ${Math.round(npc.relationship)}/100</small>
          </article>
        `).join("")}
      </div>
      <p class="lifeverse-note">District conditions can shape money, transport, housing, health, relationships, and opportunity over time.</p>
    </section>
  `;
}

function lifeVerseFastForwardPanel(state) {
  const timeline = lifeVerseEngine()?.lifeVerseUx?.getFastForwardTimeline
    ? lifeVerseEngine().lifeVerseUx.getFastForwardTimeline(30)
    : [];
  return `
    <section class="lifeverse-overlay-panel lifeverse-fast-forward-panel">
      <div class="lifeverse-panel-head">
        <div>
          <p class="eyebrow">Fast Forward</p>
          <h3>Watch time pass through routines, pressure, and consequence.</h3>
        </div>
        ${lifeVerseCloseOverlayButton()}
      </div>
      <div class="lifeverse-time-lapse">
        ${timeline.map((item, index) => `
          <article>
            <i>${index + 1}</i>
            <span>${escapeHTML(item)}</span>
          </article>
        `).join("")}
      </div>
      <div class="lifeverse-fast-grid">
        <button type="button" data-lifeverse-fast-forward="7"><strong>7 days</strong><span>One week of routine</span></button>
        <button type="button" data-lifeverse-fast-forward="30"><strong>30 days</strong><span>One month of costs and habits</span></button>
        <button type="button" data-lifeverse-fast-forward="180"><strong>6 months</strong><span>Compounding study, work, money, and health patterns</span></button>
        <button type="button" data-lifeverse-fast-forward="365"><strong>1 year</strong><span>Long-term adult-life consequences</span></button>
        <button type="button" data-lifeverse-fast-forward="1825"><strong>5 years</strong><span>Major direction, stability, and opportunity effects</span></button>
      </div>
      <p class="lifeverse-note">Fast Forward is not prediction. It simulates possible consequences from current stats and habits.</p>
    </section>
  `;
}

function lifeVerseReportPanel(state, view) {
  const report = view.latestReport;
  if (!report) {
    return `
      <section class="lifeverse-overlay-panel lifeverse-report-panel">
        <div class="lifeverse-panel-head">
          <div>
            <p class="eyebrow">Life Report</p>
            <h3>No report yet.</h3>
          </div>
          ${lifeVerseCloseOverlayButton()}
          <button class="lifeverse-mini-button" type="button" data-lifeverse-report-now>Create report</button>
        </div>
        <p class="lifeverse-note">Make choices or use Fast Forward, then Life Report will explain what happened and why.</p>
      </section>
    `;
  }
  return `
    <section class="lifeverse-overlay-panel lifeverse-report-panel">
      <div class="lifeverse-panel-head">
        <div>
          <p class="eyebrow">Life Report</p>
          <h3>${escapeHTML(report.title)}</h3>
          <span>${escapeHTML(report.createdAt)}</span>
        </div>
        ${lifeVerseCloseOverlayButton()}
      </div>
      <div class="lifeverse-memory-report">
        ${(lifeVerseEngine()?.lifeVerseUx?.getReportChapters
          ? lifeVerseEngine().lifeVerseUx.getReportChapters(report)
          : []).map((chapter, index) => `
          <article>
            <i>${String(index + 1).padStart(2, "0")}</i>
            <div>
              <strong>${escapeHTML(chapter.title)}</strong>
              ${(chapter.items || []).slice(0, 5).map((item) => `<span>${escapeHTML(item)}</span>`).join("")}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function lifeVerseReportList(title, items = []) {
  return `
    <div class="lifeverse-report-list">
      <strong>${escapeHTML(title)}</strong>
      ${(items || []).map((item) => `<span>${escapeHTML(item)}</span>`).join("")}
    </div>
  `;
}

function lifeVerseProfilePanel(state, view) {
  return `
    <section class="lifeverse-panel">
      <div class="lifeverse-panel-head">
        <div>
          <p class="eyebrow">Profile</p>
          <h3>${escapeHTML(state.player.name)} - ${escapeHTML(state.player.lifeStage)}</h3>
          <span>${escapeHTML(state.player.emotionalState)} - Independence ${state.progression.independenceIndex}/100</span>
        </div>
        <button class="lifeverse-mini-button" type="button" data-lifeverse-reset>Reset LifeVerse</button>
      </div>
      <div class="lifeverse-life-grid compact">
        <article>
          <span>Life level</span>
          <strong>${Math.round(state.progression.lifeLevel)} - ${Math.round(state.progression.lifeXp)} XP</strong>
          <small>XP grows through decisions, reflection, and Fast Forward learning.</small>
        </article>
        <article>
          <span>Stability</span>
          <strong>${Math.round(state.progression.stabilityScore)}/100</strong>
          <small>Finance, housing, health, and transport reliability.</small>
        </article>
        <article>
          <span>Resilience</span>
          <strong>${Math.round(state.progression.resilienceScore)}/100</strong>
          <small>Recovery, stress handling, support, and burnout protection.</small>
        </article>
        <article>
          <span>Opportunity</span>
          <strong>${Math.round(state.progression.opportunityScore)}/100</strong>
          <small>Career, education, network, and world opportunity.</small>
        </article>
        <article>
          <span>Legacy</span>
          <strong>${Math.round(state.progression.legacyScore)}/100</strong>
          <small>Trust, community contribution, milestones, and achievements.</small>
        </article>
        ${Object.entries(state.player.capability).map(([key, value]) => `
          <article>
            <span>${escapeHTML(key.replace(/([A-Z])/g, " $1"))}</span>
            <strong>${Math.round(value)}/100</strong>
            <small>Capability grows through repeated behaviour.</small>
          </article>
        `).join("")}
      </div>
      ${(state.progression.achievements || []).length ? `
        <div class="lifeverse-section-title"><strong>Achievements</strong><span>${state.progression.achievements.length} unlocked</span></div>
        <div class="lifeverse-world-list">
          ${(state.progression.achievements || []).slice(0, 3).map((achievement) => `
            <article>
              <span>${escapeHTML(achievement.unlockedAt || "LifeVerse")}</span>
              <strong>${escapeHTML(achievement.title)}</strong>
              <small>${escapeHTML(achievement.description)}</small>
            </article>
          `).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

function lifeSimStats() {
  trackerState.lifeSim = normalizeLifeSimState(trackerState.lifeSim);
  return trackerState.lifeSim.stats;
}

function lifeSimStatCards() {
  const verse = lifeVerseState();
  if (verse) {
    return [
      ["Money", formatCurrency(verse.finance.money), "money", "$"],
      ["Energy", Math.round(verse.needs.energy), "health", "E"],
      ["Stress", Math.round(verse.needs.stress), "stress", "S"],
      ["Skill", Math.round((verse.player.skills.career + verse.player.skills.learning + verse.player.skills.lifeManagement) / 3), "skills", "K"],
      ["Purpose", Math.round(verse.needs.purpose), "happiness", "+"],
      ["Day", verse.time.day, "days", "D"]
    ].map(([label, value, key, icon]) => `
      <span class="sim-stat ${key}">
        <i>${icon}</i>
        <small>${label}</small>
        <strong data-sim-stat="${key}">${value}</strong>
      </span>
    `).join("");
  }
  const stats = lifeSimStats();
  return [
    ["Money", `$${stats.money}`, "money", "$"],
    ["Health", stats.health, "health", "H"],
    ["Stress", stats.stress, "stress", "S"],
    ["Skills", stats.skills, "skills", "K"],
    ["Happy", stats.happiness, "happiness", "+"],
    ["Days", stats.daysPassed, "days", "D"]
  ].map(([label, value, key, icon]) => `
    <span class="sim-stat ${key}">
      <i>${icon}</i>
      <small>${label}</small>
      <strong data-sim-stat="${key}">${value}</strong>
    </span>
  `).join("");
}

function lifeSimLocationPanel() {
  const location = lifeSimLocations.find((item) => item.id === trackerState.lifeSim.currentLocation);
  if (!location) {
    return `
      <div class="life-sim-location-card is-empty" data-sim-location-card>
        <p class="eyebrow">Explore mode</p>
        <h3>Find a glowing zone.</h3>
        <p class="muted">Move near a recognizable place. Every location has real things to do there.</p>
        <div class="sim-activity-list" data-sim-activity-list></div>
      </div>
    `;
  }
  return `
    <div class="life-sim-location-card" data-sim-location-card>
      <p class="eyebrow">Current location</p>
      <h3 data-sim-location-title>${escapeHTML(location.name)}</h3>
      <p class="muted" data-sim-location-description>${escapeHTML(location.description)}</p>
      <div class="sim-activity-list" data-sim-activity-list>${lifeSimActivityButtons(location.id)}</div>
    </div>
  `;
}

function lifeSimActivityButtons(locationId) {
  const verseActivities = lifeVerseActivitiesForLocation(locationId);
  if (verseActivities.length) {
    return verseActivities.map((activity) => `
      <button class="sim-activity-button" type="button" data-lifeverse-activity="${escapeHTML(activity.id)}">
        <strong>${escapeHTML(activity.title)}</strong>
        <span>${escapeHTML(lifeVerseActivityImpactText(activity))}</span>
      </button>
    `).join("");
  }
  const activities = lifeSimActivities[locationId] || [];
  if (!activities.length) return `<p class="muted">No activity available here yet.</p>`;
  return activities.map((activity) => `
    <button class="sim-activity-button" type="button" data-sim-activity="${activity.id}" data-sim-location="${locationId}">
      <strong>${escapeHTML(activity.name)}</strong>
      <span>${escapeHTML(lifeSimEffectText(activity.effect))}</span>
    </button>
  `).join("");
}

function lifeVerseActivityImpactText(activity) {
  const effects = activity.effects || {};
  const labels = [];
  if (effects.finance && Number(effects.finance.money)) labels.push(`Money ${Number(effects.finance.money) > 0 ? "+" : ""}${effects.finance.money}`);
  if (effects.needs && Number(effects.needs.energy)) labels.push(`Energy ${Number(effects.needs.energy) > 0 ? "+" : ""}${effects.needs.energy}`);
  if (effects.needs && Number(effects.needs.stress)) labels.push(`Stress ${Number(effects.needs.stress) > 0 ? "+" : ""}${effects.needs.stress}`);
  if (effects.health && Number(effects.health.physical)) labels.push(`Health ${Number(effects.health.physical) > 0 ? "+" : ""}${effects.health.physical}`);
  if (effects.skills) labels.push("Skills +");
  return `${lifeVerseEngine()?.durationLabel ? lifeVerseEngine().durationLabel(activity.durationMinutes) : `${activity.durationMinutes} min`} | ${labels.join(" | ") || "Routine impact"}`;
}

function lifeSimEffectText(effect = {}) {
  const labels = [
    ["Money", effect.money],
    ["Health", effect.health],
    ["Stress", effect.stress],
    ["Skills", effect.skills],
    ["Happiness", effect.happiness],
    ["Days", effect.daysPassed]
  ].filter(([, value]) => Number(value));
  return labels.map(([label, value]) => `${label} ${Number(value) > 0 ? "+" : ""}${value}`).join(" | ");
}

function markLifeVerseConsequence(lastActivity, consequences, options = {}) {
  trackerState.lifeSim.lastActivity = lastActivity || "";
  trackerState.lifeSim.consequences = Array.isArray(consequences) ? consequences.filter(Boolean) : (consequences ? [String(consequences)] : []);
  trackerState.lifeSim.reflection = options.reflection || "";
  trackerState.lifeSim.consequenceToastUntil = Date.now() + 6000;
  trackerState.lifeSim.reportPromptReady = Boolean(options.reportPromptReady);
}

function lifeVerseConsequenceToast(now = Date.now()) {
  const sim = trackerState.lifeSim || {};
  if (!(sim.consequences || []).length || Number(sim.consequenceToastUntil || 0) <= now) return "";
  return `
    <aside class="lifeverse-consequence-toast" aria-live="polite">
      <p class="eyebrow">${sim.reportPromptReady ? "Fast Forward finished" : "What just happened"}</p>
      <strong>${escapeHTML(sim.lastActivity || "LifeVerse update")}</strong>
      <ul>${sim.consequences.map((line) => `<li>${escapeHTML(line)}</li>`).join("")}</ul>
      ${sim.reflection ? `<p class="lifeverse-toast-reflection">${escapeHTML(sim.reflection)}</p>` : ""}
      ${sim.reportPromptReady ? `<button type="button" data-lifeverse-tab="report">View Life Report</button>` : ""}
    </aside>
  `;
}

function applyLifeSimChanges(effect = {}) {
  const stats = lifeSimStats();
  stats.money = Math.round(Number(stats.money || 0) + Number(effect.money || 0));
  stats.health = clampStat(stats.health + Number(effect.health || 0));
  stats.stress = clampStat(stats.stress + Number(effect.stress || 0));
  stats.skills = clampStat(stats.skills + Number(effect.skills || 0));
  stats.happiness = clampStat(stats.happiness + Number(effect.happiness || 0));
  stats.daysPassed = Math.max(0, Math.round(Number(stats.daysPassed || 0) + Number(effect.daysPassed || 0)));
}

function lifeSimConsequence(stats) {
  if (stats.money < 0) return "You are in debt. Your rent and daily spending became difficult to manage.";
  if (stats.health < 30) return "Your health declined because you did not maintain healthy habits.";
  if (stats.stress > 80) return "Your stress became too high and affected your daily life.";
  if (stats.skills > 50 && stats.stress < 70) return "Your skills improved and you became more prepared for better opportunities.";
  if (stats.money > 1500 && stats.health > 60) return "You built a stable routine and improved your adult life.";
  return "Your adult-life routine stayed balanced, but the next month still depends on your choices. Keep watching money, health, stress, and growth.";
}

function updateLifeSimDom() {
  const shell = document.querySelector("[data-lifeverse-shell]");
  if (shell) {
    shell.outerHTML = lifeVerseGameShell();
  }
  const stats = lifeSimStats();
  const statMap = {
    money: `$${stats.money}`,
    health: stats.health,
    stress: stats.stress,
    skills: stats.skills,
    happiness: stats.happiness,
    days: stats.daysPassed
  };
  Object.entries(statMap).forEach(([key, value]) => {
    document.querySelectorAll(`[data-sim-stat="${key}"]`).forEach((node) => {
      node.textContent = value;
    });
  });

  const location = lifeSimLocations.find((item) => item.id === trackerState.lifeSim.currentLocation);
  const title = document.querySelector("[data-sim-location-title]");
  const description = document.querySelector("[data-sim-location-description]");
  const activityList = document.querySelector("[data-sim-activity-list]");
  const card = document.querySelector("[data-sim-location-card]");
  if (location) {
    if (card) card.classList.remove("is-empty");
    if (title) title.textContent = location.name;
    if (description) description.textContent = location.description;
    if (activityList) activityList.innerHTML = lifeSimActivityButtons(location.id);
  } else if (card) {
    card.classList.add("is-empty");
    card.innerHTML = `
      <p class="eyebrow">Explore mode</p>
      <h3>Find a glowing zone.</h3>
      <p class="muted">Move near a recognizable place. Some locations have playable actions now; others are visual spaces for this remaster.</p>
      <div class="sim-activity-list" data-sim-activity-list></div>
    `;
  }
}

function performLifeVerseActivity(activityId) {
  const engine = lifeVerseEngine();
  const state = lifeVerseState();
  if (!engine || !state || !activityId) return null;
  const runActivity = engine.performActivityCommand || engine.performActivity;
  if (!runActivity) return null;
  const result = runActivity(state, activityId, {
    locationId: trackerState.lifeSim.currentLocation || ""
  });
  if (result && !result.error) {
    trackerState.lifeVerse = result.state;
    trackerState.lifeVerse.activeView = "today";
    syncLifeSimFromLifeVerse();
    markLifeVerseConsequence(result.activity.title, result.event.consequences, { reflection: result.event.reflection });
    if (engine.saveLifeVerseState) engine.saveLifeVerseState(trackerState.lifeVerse, { slot: "autosave" });
  }
  return result;
}

function performLifeVerseSystemAction(systemId, actionId) {
  const engine = lifeVerseEngine();
  const state = lifeVerseState();
  if (!engine || !state || !systemId || !actionId) return null;
  const runAction = engine.performSystemActionCommand || engine.performSystemAction;
  if (!runAction) return null;
  const result = runAction(state, systemId, actionId);
  if (result && !result.error) {
    trackerState.lifeVerse = result.state;
    trackerState.lifeVerse.activeView = "today";
    syncLifeSimFromLifeVerse();
    markLifeVerseConsequence(result.action.title, result.event.consequences, { reflection: result.event.reflection });
    if (engine.saveLifeVerseState) engine.saveLifeVerseState(trackerState.lifeVerse, { slot: "autosave" });
  } else if (result && result.error) {
    markLifeVerseConsequence("Action unavailable", result.error);
  }
  return result;
}

function fastForwardLifeVerse(days = 30) {
  const engine = lifeVerseEngine();
  const state = lifeVerseState();
  if (!engine || !state) return null;
  const runFastForward = engine.fastForwardCommand || engine.fastForward;
  if (!runFastForward) return null;
  const result = runFastForward(state, days);
  if (result && !result.error) {
    trackerState.lifeVerse = result.state;
    if (result.pendingIntervention) {
      // Fast Forward paused partway through - hold on "today" so the
      // intervention panel (which lifeVerseOverlayPanel shows unconditionally
      // while a decision is pending) is what the player actually sees.
      trackerState.lifeVerse.activeView = "today";
      syncLifeSimFromLifeVerse();
      if (engine.saveLifeVerseState) engine.saveLifeVerseState(trackerState.lifeVerse, { slot: "autosave" });
      return result;
    }
    trackerState.lifeVerse.activeView = "today";
    syncLifeSimFromLifeVerse();
    markLifeVerseConsequence(`${days} Days Later`, result.event.consequences, { reflection: result.event.reflection, reportPromptReady: true });
    if (engine.saveLifeVerseState) engine.saveLifeVerseState(trackerState.lifeVerse, { slot: "autosave" });
  }
  return result;
}

function resolveLifeVerseIntervention(choiceId) {
  const engine = lifeVerseEngine();
  const state = lifeVerseState();
  if (!engine || !state) return null;
  const resolve = engine.resolveFastForwardInterventionCommand || engine.resolveFastForwardIntervention;
  if (!resolve) return null;
  const result = resolve(state, choiceId);
  if (result && !result.error) {
    trackerState.lifeVerse = result.state;
    trackerState.lifeVerse.activeView = "today";
    syncLifeSimFromLifeVerse();
    markLifeVerseConsequence("Decision made", result.event.consequences, { reflection: result.event.reflection, reportPromptReady: true });
    if (engine.saveLifeVerseState) engine.saveLifeVerseState(trackerState.lifeVerse, { slot: "autosave" });
  }
  return result;
}

function createLifeVerseReport() {
  const engine = lifeVerseEngine();
  const state = lifeVerseState();
  if (!engine || !state) return null;
  const runReport = engine.generateLifeReportCommand || engine.generateLifeReport;
  if (!runReport) return null;
  const report = runReport(state, { type: "reflection" });
  trackerState.lifeVerse = state;
  trackerState.lifeVerse.activeView = "report";
  markLifeVerseConsequence(report.title, report.overview);
  if (engine.saveLifeVerseState) engine.saveLifeVerseState(trackerState.lifeVerse, { slot: "autosave" });
  return report;
}

function resetLifeVerse() {
  const engine = lifeVerseEngine();
  trackerState.lifeVerse = engine && engine.reset ? engine.reset({ profile: userProfile }) : createDefaultLifeVerseState();
  syncLifeSimFromLifeVerse();
  trackerState.lifeSim.lastActivity = "";
  trackerState.lifeSim.consequences = [];
  trackerState.lifeSim.reflection = "";
  trackerState.lifeSim.consequenceToastUntil = 0;
  trackerState.lifeSim.reportPromptReady = false;
}

function destroyLifeSim() {
  if (lifeSimInstance && typeof lifeSimInstance.destroy === "function") {
    lifeSimInstance.destroy();
  }
  lifeSimInstance = null;
}

function enterLifeSimMode() {
  document.body.classList.add("life-sim-active");
  const root = document.documentElement;
  if (root.requestFullscreen && !document.fullscreenElement) {
    root.requestFullscreen().catch(() => {});
  }
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape").catch(() => {});
  }
}

function exitLifeSimMode() {
  document.body.classList.remove("life-sim-active");
  if (screen.orientation && screen.orientation.unlock) {
    try {
      screen.orientation.unlock();
    } catch (error) {
      // Some browsers expose unlock but do not allow it outside installed PWAs.
    }
  }
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

// renderScreen("simulator") replaces #screen-root's innerHTML wholesale on
// every overlay change (map/journal/pause all live in that same template),
// which destroys and recreates #life-sim-root along with it - mountLifeSim()
// always has to build a brand new CompassLifeSim instance, there is no
// "already mounted, just update" path. That's fine for stats (those live in
// trackerState.lifeVerse, untouched by remounts) but it means any 3D-only
// state - like the player's physical position - resets to the default spawn
// every time, silently undoing a teleport requested just before the remount.
// Route the destination through the remount instead of fighting it.
let pendingTeleportLocationId = null;

function mountLifeSim() {
  const root = document.querySelector("#life-sim-root");
  if (!root) return;
  destroyLifeSim();
  if (!window.CompassLifeSim || typeof window.CompassLifeSim.mount !== "function") {
    root.innerHTML = `<div class="sim-canvas-fallback"><strong>3D simulator is unavailable</strong><span>Refresh the page once, then open Life Sim again.</span></div>`;
    return;
  }
  const initialLocationId = pendingTeleportLocationId;
  pendingTeleportLocationId = null;
  lifeSimInstance = window.CompassLifeSim.mount(root, {
    getLifeVerseState: () => lifeVerseState(),
    initialLocationId,
    onLocationChange(location) {
      trackerState.lifeSim.currentLocation = location ? location.id : null;
      saveTrackerState();
      updateLifeSimDom();
    }
  });
}

function lifeVersePresentationPause(kind = "soft", duration = 420) {
  const game = document.querySelector("[data-life-sim-game]");
  if (!game) return Promise.resolve();
  const overlay = document.createElement("div");
  overlay.className = `lifeverse-transition-flash is-${kind}`;
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = kind === "fast-forward"
    ? `<span>Time is moving...</span>`
    : kind === "report-open"
      ? `<span>Opening reflection...</span>`
      : `<span>LifeVerse</span>`;
  game.appendChild(overlay);
  game.classList.add(`is-${kind}-presentation`);
  return new Promise((resolve) => {
    window.setTimeout(() => {
      overlay.classList.add("is-leaving");
      window.setTimeout(() => {
        overlay.remove();
        game.classList.remove(`is-${kind}-presentation`);
        resolve();
      }, 180);
    }, duration);
  });
}

function growthHubPreviewCard() {
  return `
    <section class="growth-preview-card">
      <div>
        <p class="eyebrow">Growth Hub preview</p>
        <h3>Goals, reflection, opportunities, and lessons.</h3>
        <p>Keep building the person your future choices are pointing toward.</p>
      </div>
      <div class="growth-preview-actions">
        <button class="secondary-action compact-action" type="button" data-tab-jump="future">Future Mirror</button>
        <button class="secondary-action compact-action" type="button" data-tab-jump="stories">Inspire Hub</button>
      </div>
    </section>
  `;
}

const FUTURE_SELF_HORIZONS = [
  { value: "1yr", label: "1 year from now" },
  { value: "3yr", label: "3 years from now" },
  { value: "5yr", label: "5 years from now" },
  { value: "age30", label: "Around age 30" }
];

function latestFutureSelfSnapshot(horizon) {
  const list = trackerState.futureSelfSnapshots.filter((snap) => !horizon || snap.horizon === horizon);
  return list.length ? list[list.length - 1] : null;
}

function containsDeterministicLanguage(text) {
  const lower = String(text || "").toLowerCase();
  return DETERMINISTIC_PHRASES.some((phrase) => lower.includes(phrase));
}

function futureSelfPrompt(blueprint, horizon, previousSnapshot) {
  const horizonLabel = (FUTURE_SELF_HORIZONS.find((item) => item.value === horizon) || {}).label || horizon;
  const facts = realGrowthFactsText();
  return `Write a Future Self snapshot as strict JSON only, no markdown. Shape:
{
  "narrative": "string - a vivid, specific, first-person present-tense scene, 120-220 words, conditional language only",
  "domains": {
    "lifestyle": "string",
    "career": "string",
    "skills": "string",
    "finance": "string",
    "relationships": "string",
    "dailyRoutine": "string"
  },
  "confidenceNote": "string - honest about how specific this can be given how much saved data exists"
}
Horizon: ${horizonLabel}
User's real saved data (use only this, do not invent beyond it): ${facts}
${previousSnapshot ? `Previous snapshot narrative for the same horizon, for continuity (mention what's changed if relevant): ${previousSnapshot.narrative}` : "No previous snapshot for this horizon yet."}
Rules: Never write "you will be" or any deterministic claim - always "if you continue," "this path suggests," "you may be." If saved data is thin, say so honestly in confidenceNote rather than fabricating specific detail.`;
}

function normalizeFutureSelfSnapshot(parsed, horizon, blueprint, previousSnapshot) {
  const domains = (parsed && parsed.domains) || {};
  return {
    id: `fs-${Date.now()}`,
    user_id: currentUserId(),
    horizon,
    generatedAt: new Date().toISOString(),
    displayTime: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    basedOnBlueprintVersion: blueprint ? blueprint.version : 0,
    narrative: cleanText((parsed && parsed.narrative) || "If you keep building on what you've saved so far, this future comes into focus - update your Blueprint and add a few reflections for a more specific scene.", 1400),
    domains: {
      lifestyle: cleanText(domains.lifestyle || "This may become clearer as more of your saved data builds up.", 260),
      career: cleanText(domains.career || "This may become clearer as more of your saved data builds up.", 260),
      skills: cleanText(domains.skills || "This may become clearer as more of your saved data builds up.", 260),
      finance: cleanText(domains.finance || "This may become clearer as more of your saved data builds up.", 260),
      relationships: cleanText(domains.relationships || "This may become clearer as more of your saved data builds up.", 260),
      dailyRoutine: cleanText(domains.dailyRoutine || "This may become clearer as more of your saved data builds up.", 260)
    },
    confidenceNote: cleanText((parsed && parsed.confidenceNote) || "This snapshot will get more specific as you add more to your Blueprint and reflections.", 260),
    previousSnapshotId: previousSnapshot ? previousSnapshot.id : null
  };
}

let isFutureSelfLoading = false;
let futureSelfError = "";
let futureSelfActiveHorizon = "1yr";

async function generateFutureSelfSnapshot(horizon) {
  const blueprint = latestBlueprint();
  if (!blueprint) {
    futureSelfError = "Complete Discover Yourself first - Future Self needs your Blueprint to be meaningful, not generic.";
    openModal("futureSelfView");
    return;
  }
  futureSelfActiveHorizon = horizon;
  futureSelfError = "";
  isFutureSelfLoading = true;
  openModal("futureSelfView");
  const previousSnapshot = latestFutureSelfSnapshot(horizon);
  try {
    const reply = await requestCompassDirect(FUTURE_SELF_SYSTEM_PROMPT, futureSelfPrompt(blueprint, horizon, previousSnapshot));
    const parsed = extractJsonObject(reply);
    const snapshot = normalizeFutureSelfSnapshot(parsed, horizon, blueprint, previousSnapshot);
    if (containsDeterministicLanguage(snapshot.narrative)) {
      snapshot.narrative = snapshot.narrative.replace(/you will be/gi, "you may be").replace(/you'll be/gi, "you may be").replace(/you are going to be/gi, "you may be approaching");
    }
    trackerState.futureSelfSnapshots.push(snapshot);
    saveTrackerState();
  } catch (error) {
    console.error("[Future Self] Request failed", error);
    futureSelfError = "Future Self is having trouble generating a snapshot right now. Please try again.";
  } finally {
    isFutureSelfLoading = false;
    openModal("futureSelfView");
  }
}

// Reflection Engine (Future Mirror bible Ch.5) - one data store, four trigger
// modes. Decision-journal-mode entries already existed before this bible as
// trackerState.futureMirror.saved (a working "generate a comparison, save it,
// reflect on it later" flow) - rather than migrate that already-working code
// into a new parallel array, allReflectionLikeEntries() merges both stores
// into one read view, so blind-spot inference, Knowledge Vault, and the
// resurfacing mechanic all see one unified picture, per the bible's "one
// engine" acceptance criteria, without a risky rewrite of working code. This
// is a deliberate deviation from a literal single-array schema - reported
// here rather than done silently.
const REFLECTION_RESURFACE_DAYS = { daily: 30, weeklyLetter: 14, decisionJournal: 90, milestoneLetter: 90 };
const DAILY_REFLECTION_PROMPTS = [
  { id: "mood", label: "How would you describe your mood today, and why?" },
  { id: "stress", label: "What's taking up the most mental space right now?" },
  { id: "growth", label: "What's one thing you did today that your future self would thank you for?" },
  { id: "procrastination", label: "What did you put off today, and what made it easy to avoid?" }
];

function createReflectionEntry(mode, content, options = {}) {
  const now = new Date();
  const resurfaceDays = options.resurfaceDays != null ? options.resurfaceDays : REFLECTION_RESURFACE_DAYS[mode] || 30;
  const entry = {
    id: `refl-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    user_id: currentUserId(),
    mode,
    createdAt: now.toISOString(),
    displayTime: now.toLocaleString([], { month: "short", day: "numeric" }),
    resurfaceAt: new Date(now.getTime() + resurfaceDays * 86400000).toISOString(),
    resurfacedAt: null,
    dismissedAt: null,
    ignoredCount: 0,
    content: cleanText(content, 1200),
    linkedDecisionId: options.linkedDecisionId || null,
    tags: options.tags || [mode]
  };
  trackerState.reflectionEntries.unshift(entry);
  saveTrackerState();
  return entry;
}

function allReflectionLikeEntries() {
  const native = trackerState.reflectionEntries.filter((entry) => entry.user_id === currentUserId()).map((entry) => ({ ...entry, _source: "reflection" }));
  const decisions = savedFutureDecisions().map((item) => ({
    id: item.id,
    user_id: item.user_id,
    mode: "decisionJournal",
    createdAt: item.generated_at,
    displayTime: item.display_time,
    resurfaceAt: item.resurfaceAt || new Date(new Date(item.generated_at).getTime() + REFLECTION_RESURFACE_DAYS.decisionJournal * 86400000).toISOString(),
    resurfacedAt: item.resurfacedAt || null,
    dismissedAt: item.dismissedAt || null,
    ignoredCount: item.ignoredCount || 0,
    content: item.decisionMade || item.question,
    tags: ["decision"],
    _source: "futureMirror"
  }));
  const checkBacks = trackerState.futureScans
    .filter((scan) => scan.user_id === currentUserId() && scan.stations && scan.stations.checkBack && scan.stations.checkBack.status === "scheduled")
    .map((scan) => {
      const checkBack = scan.stations.checkBack;
      return {
        id: `${scan.id}-checkback`,
        user_id: scan.user_id,
        mode: "futureScanCheckBack",
        createdAt: checkBack.scheduledAt,
        displayTime: checkBack.dueDisplayTime,
        resurfaceAt: checkBack.resurfaceAt,
        resurfacedAt: checkBack.resurfacedAt || null,
        dismissedAt: checkBack.dismissedAt || null,
        ignoredCount: checkBack.ignoredCount || 0,
        content: `Check back: "${scan.scanContext.rawInput}"`,
        tags: ["futureScan"],
        _source: "futureScan",
        _scanId: scan.id
      };
    });
  return [...native, ...decisions, ...checkBacks];
}

function dueForResurfacing() {
  const now = Date.now();
  return allReflectionLikeEntries().filter((entry) => !entry.dismissedAt && new Date(entry.resurfaceAt).getTime() <= now);
}

function resurfaceEntryAction(id, action) {
  const merged = allReflectionLikeEntries().find((entry) => entry.id === id);
  if (!merged) return;
  if (merged._source === "reflection") {
    const original = trackerState.reflectionEntries.find((entry) => entry.id === id);
    if (!original) return;
    if (action === "engage") {
      original.resurfacedAt = new Date().toISOString();
    } else {
      original.ignoredCount = (original.ignoredCount || 0) + 1;
      if (original.ignoredCount >= 3) {
        original.dismissedAt = new Date().toISOString();
      } else {
        original.resurfaceAt = new Date(Date.now() + (REFLECTION_RESURFACE_DAYS[original.mode] || 30) * 86400000 * (original.ignoredCount + 1)).toISOString();
      }
    }
  } else if (merged._source === "futureMirror") {
    const original = trackerState.futureMirror.saved.find((item) => item.id === id);
    if (!original) return;
    if (action === "engage") {
      original.resurfacedAt = new Date().toISOString();
    } else {
      original.ignoredCount = (original.ignoredCount || 0) + 1;
      if (original.ignoredCount >= 3) {
        original.dismissedAt = new Date().toISOString();
      } else {
        original.resurfaceAt = new Date(Date.now() + REFLECTION_RESURFACE_DAYS.decisionJournal * 86400000 * (original.ignoredCount + 1)).toISOString();
      }
    }
  } else if (merged._source === "futureScan") {
    const scan = trackerState.futureScans.find((item) => item.id === merged._scanId);
    const checkBack = scan && scan.stations && scan.stations.checkBack;
    if (!checkBack) return;
    if (action === "engage") {
      checkBack.resurfacedAt = new Date().toISOString();
    } else {
      checkBack.ignoredCount = (checkBack.ignoredCount || 0) + 1;
      if (checkBack.ignoredCount >= 3) {
        checkBack.dismissedAt = new Date().toISOString();
      } else {
        checkBack.resurfaceAt = new Date(Date.now() + 7 * 86400000 * (checkBack.ignoredCount + 1)).toISOString();
      }
    }
  }
  saveTrackerState();
}

function resurfacingCard() {
  const due = dueForResurfacing().slice(0, 3);
  if (!due.length) return "";
  return `
    <section class="future-reflection-list resurfacing-card">
      <div class="section-row">
        <div><p class="eyebrow">Worth another look</p><h3>Reflections resurfaced for you</h3></div>
        <span>${due.length}</span>
      </div>
      ${due.map((entry) => `
        <article class="future-reflection-item">
          <div>
            <strong>${escapeHTML(entry.mode === "decisionJournal" ? "A decision you journaled" : entry.mode === "weeklyLetter" ? "A letter to your past self" : entry.mode === "milestoneLetter" ? "A milestone letter" : entry.mode === "futureScanCheckBack" ? "A Future Scan check-back" : "A daily reflection")}</strong>
            <p>${escapeHTML(entry.content)}</p>
            <small>${escapeHTML(entry.displayTime || "")} - how does it look now?</small>
          </div>
          <div class="profile-actions">
            <button class="secondary-action compact-action" type="button" data-resurface-action="${escapeHTML(entry.id)}:engage">Reflect again</button>
            <button class="text-action" type="button" data-resurface-action="${escapeHTML(entry.id)}:dismiss">Not now</button>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

let dailyReflectionPromptIndex = 0;

// Life Roadmap (Future Mirror bible Ch.7) - one data model, three views
// (timeline/calendar/long-horizon) rather than three separate features with
// separate state. Pacing respects the Blueprint's motivation style instead
// of one default pace for everyone.
const ROADMAP_SYSTEM_PROMPT = "You are the Life Roadmap module inside Compass's Future Mirror. Break a goal into a realistic milestone sequence. Be concrete and practical, not generic. Respect the user's motivation style when pacing milestones: external-accountability likes frequent check-ins, internal-purpose likes fewer purpose-tied milestones, competition likes comparison points, small-rewards likes many small wins.";
const ROADMAP_HORIZONS = [
  { value: "3-month", label: "3 months", months: 3 },
  { value: "1-year", label: "1 year", months: 12 },
  { value: "2-year", label: "2 years", months: 24 }
];
let roadmapView = "timeline";
let isRoadmapLoading = false;
let roadmapError = "";

function roadmapPrompt(title, horizonMonths, pacingProfile) {
  return `Create a milestone roadmap as strict JSON only, no markdown. Shape:
{
  "milestones": [ { "month": 1, "title": "string", "requires": "string - skills/projects/actions needed" } ]
}
Goal: ${title}
Horizon: ${horizonMonths} months
User's motivation style (pace milestones to fit this): ${pacingProfile || "not set - use a balanced default pace"}
User's real saved data: ${realGrowthFactsText()}
Rules: Space milestones sensibly across the ${horizonMonths}-month horizon (do not put one per month if that's unrealistic for the goal). Each milestone must be concrete and actionable, not vague.`;
}

async function generateRoadmapGoal(title, horizonValue) {
  const horizon = ROADMAP_HORIZONS.find((item) => item.value === horizonValue) || ROADMAP_HORIZONS[1];
  const blueprint = latestBlueprint();
  roadmapError = "";
  isRoadmapLoading = true;
  openModal("roadmapView");
  try {
    const reply = await requestCompassDirect(ROADMAP_SYSTEM_PROMPT, roadmapPrompt(title, horizon.months, blueprint ? blueprint.motivationStyle : ""));
    const parsed = extractJsonObject(reply);
    const milestones = Array.isArray(parsed && parsed.milestones) ? parsed.milestones.slice(0, 24) : [];
    const goal = {
      id: `goal-${Date.now()}`,
      user_id: currentUserId(),
      title: cleanText(title, 160),
      horizon: horizon.value,
      createdAt: new Date().toISOString(),
      pacingProfile: blueprint ? blueprint.motivationStyle : "",
      milestones: milestones.length ? milestones.map((item, index) => ({
        id: `ms-${Date.now()}-${index}`,
        month: Math.max(1, Math.min(horizon.months, Number(item.month || index + 1))),
        title: cleanText(item.title || "Milestone", 200),
        requires: cleanText(item.requires || "", 200),
        status: "pending"
      })) : [{ id: `ms-${Date.now()}-0`, month: 1, title: "Define the first concrete step toward this goal", requires: "", status: "pending" }]
    };
    trackerState.roadmapGoals.push(goal);
    saveTrackerState();
  } catch (error) {
    console.error("[Life Roadmap] Request failed", error);
    roadmapError = "Life Roadmap is having trouble generating milestones right now. Please try again.";
  } finally {
    isRoadmapLoading = false;
    openModal("roadmapView");
  }
}

function myRoadmapGoals() {
  return trackerState.roadmapGoals.filter((goal) => goal.user_id === currentUserId());
}

function setMilestoneStatus(goalId, milestoneId, status) {
  const goal = trackerState.roadmapGoals.find((item) => item.id === goalId);
  if (!goal) return;
  const milestone = goal.milestones.find((item) => item.id === milestoneId);
  if (!milestone) return;
  milestone.status = status;
  saveTrackerState();
  if (status === "done") {
    milestoneJustCompleted = { goalTitle: goal.title, milestoneTitle: milestone.title };
  }
}

let milestoneJustCompleted = null;

function roadmapTimelineView() {
  const goals = myRoadmapGoals();
  if (!goals.length) return `<p class="muted">No roadmap goals yet. Create one above and it'll break into concrete monthly steps.</p>`;
  return goals.map((goal) => `
    <article class="future-reflection-item roadmap-goal-card">
      <div style="width:100%">
        <strong>${escapeHTML(goal.title)}</strong>
        <small>${escapeHTML((ROADMAP_HORIZONS.find((item) => item.value === goal.horizon) || {}).label || goal.horizon)} horizon${goal.pacingProfile ? ` - paced for ${escapeHTML(goal.pacingProfile)} motivation` : ""}</small>
        <div class="mirror-timeline">
          ${goal.milestones.sort((a, b) => a.month - b.month).map((milestone) => `
            <div class="timeline-step milestone-step is-${milestone.status}">
              <span>Month ${milestone.month}</span>
              <p><strong>${escapeHTML(milestone.title)}</strong>${milestone.requires ? ` - ${escapeHTML(milestone.requires)}` : ""}</p>
              <div class="profile-actions">
                ${milestone.status !== "in-progress" ? `<button class="text-action" type="button" data-set-milestone-status="${escapeHTML(goal.id)}:${escapeHTML(milestone.id)}:in-progress">In progress</button>` : ""}
                ${milestone.status !== "done" ? `<button class="text-action" type="button" data-set-milestone-status="${escapeHTML(goal.id)}:${escapeHTML(milestone.id)}:done">Mark done</button>` : `<span class="risk-pill calm">Done</span>`}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </article>
  `).join("");
}

function roadmapCalendarView() {
  const goals = myRoadmapGoals();
  const byMonth = {};
  goals.forEach((goal) => goal.milestones.forEach((milestone) => {
    const key = milestone.month;
    byMonth[key] = byMonth[key] || [];
    byMonth[key].push({ goalTitle: goal.title, ...milestone });
  }));
  const months = Object.keys(byMonth).map(Number).sort((a, b) => a - b);
  if (!months.length) return `<p class="muted">No roadmap goals yet.</p>`;
  return months.map((month) => `
    <article class="future-reflection-item">
      <div>
        <strong>Month ${month}</strong>
        ${byMonth[month].map((item) => `<p>${escapeHTML(item.goalTitle)}: ${escapeHTML(item.title)} ${item.status === "done" ? "(done)" : item.status === "in-progress" ? "(in progress)" : ""}</p>`).join("")}
      </div>
    </article>
  `).join("");
}

function roadmapLongHorizonView() {
  const goals = myRoadmapGoals();
  if (!goals.length) return `<p class="muted">No roadmap goals yet.</p>`;
  const snapshot = latestFutureSelfSnapshot();
  return `
    ${goals.map((goal) => {
      const done = goal.milestones.filter((m) => m.status === "done").length;
      return `
        <article class="future-reflection-item">
          <div>
            <strong>${escapeHTML(goal.title)}</strong>
            <p>${done}/${goal.milestones.length} milestones done - ${escapeHTML((ROADMAP_HORIZONS.find((item) => item.value === goal.horizon) || {}).label || goal.horizon)} horizon</p>
          </div>
        </article>
      `;
    }).join("")}
    ${snapshot ? `<p class="tiny-note">Your Future Self snapshot (${escapeHTML((FUTURE_SELF_HORIZONS.find((item) => item.value === snapshot.horizon) || {}).label || snapshot.horizon)}) was generated before some of this roadmap progress - consider regenerating it to reflect where you actually are now.</p>` : `<button class="secondary-action compact-action" type="button" data-open="futureSelfView">See how this connects to your Future Self</button>`}
  `;
}

// Career Studio - Interview Practice (Future Mirror bible Ch.9). Reuses the
// existing roleplay session/chat-bubble UI pattern, but real AI-generated
// persona responses instead of roleplay's simple keyword-matched replies,
// since interviewer style needs to genuinely differ by persona. Voice/tone
// feedback is the lightweight version confirmed with the user: response
// timing + filler-word counts from the transcript, not new audio
// infrastructure - gracefully degrades to transcript-content feedback plus
// these two light signals, per Ch.17.
const INTERVIEW_PERSONAS = [
  {
    id: "bank-competency",
    label: "Structured (bank/finance)",
    description: "Formal, STAR-method, follows a checklist, presses for specific numbers and outcomes.",
    systemPrompt: "You are a structured competency-based interviewer at a bank/finance firm. Formal tone. Ask one question at a time, follow the STAR method (situation, task, action, result), and press the candidate for specific numbers, outcomes, and evidence rather than accepting vague answers. Stay strictly professional, no small talk."
  },
  {
    id: "startup-conversational",
    label: "Conversational (early-stage startup)",
    description: "Informal, tangential, curious about passion and scrappiness over credentials.",
    systemPrompt: "You are a founder interviewing at an early-stage startup. Informal, conversational tone, some tangents. You care more about scrappiness, genuine passion, and how someone thinks on their feet than polished credentials. Ask follow-ups that probe how they'd handle ambiguity or a lack of resources."
  },
  {
    id: "corporate-hr",
    label: "Polite screener (corporate HR)",
    description: "Moderate formality, checklist-driven behavioral questions, courteous.",
    systemPrompt: "You are a corporate HR screener conducting a first-round behavioral interview. Moderately formal, polite, checklist-driven. Ask standard behavioral questions (teamwork, conflict, deadlines) one at a time and a brief, courteous follow-up to each answer."
  }
];
const INTERVIEW_TURNS_TARGET = 4;
const FILLER_WORD_PATTERN = /\b(um+|uh+|like|you know|kind of|sort of)\b/gi;

let activeInterviewSessionId = null;
let isInterviewLoading = false;
let interviewError = "";
let interviewQuestionShownAt = 0;

function activeInterviewSession() {
  return trackerState.careerStudio.interviewSessions.find((session) => session.id === activeInterviewSessionId) || null;
}

function countFillerWords(text) {
  const matches = String(text || "").match(FILLER_WORD_PATTERN);
  return matches ? matches.length : 0;
}

async function startInterviewSession(personaId) {
  const persona = INTERVIEW_PERSONAS.find((item) => item.id === personaId) || INTERVIEW_PERSONAS[0];
  isInterviewLoading = true;
  interviewError = "";
  const session = {
    id: `int-${Date.now()}`,
    user_id: currentUserId(),
    persona: persona.id,
    startedAt: new Date().toISOString(),
    completedAt: null,
    transcript: [],
    feedback: []
  };
  trackerState.careerStudio.interviewSessions.push(session);
  activeInterviewSessionId = session.id;
  openModal("interviewPractice");
  try {
    const reply = await requestCompassDirect(persona.systemPrompt + " This is the very first question of the interview - a natural opener.", "Ask your opening interview question. Reply with only the question, no preamble.");
    session.transcript.push({ turn: 1, sender: "interviewer", text: cleanText(reply, 400) });
    saveTrackerState();
    interviewQuestionShownAt = Date.now();
  } catch (error) {
    console.error("[Interview Practice] Failed to start", error);
    interviewError = "Couldn't start the interview right now. Please try again.";
  } finally {
    isInterviewLoading = false;
    openModal("interviewPractice");
  }
}

async function sendInterviewAnswer(text) {
  const session = activeInterviewSession();
  if (!session) return;
  const persona = INTERVIEW_PERSONAS.find((item) => item.id === session.persona) || INTERVIEW_PERSONAS[0];
  const respondedAfterMs = interviewQuestionShownAt ? Date.now() - interviewQuestionShownAt : null;
  const fillerWordCount = countFillerWords(text);
  session.transcript.push({ turn: session.transcript.length + 1, sender: "candidate", text: cleanText(text, 900), respondedAfterMs, fillerWordCount });
  saveTrackerState();
  const answeredTurns = session.transcript.filter((t) => t.sender === "candidate").length;
  isInterviewLoading = true;
  openModal("interviewPractice");
  try {
    if (answeredTurns >= INTERVIEW_TURNS_TARGET) {
      await finishInterviewSession(session, persona);
    } else {
      const history = session.transcript.map((t) => `${t.sender === "interviewer" ? "Interviewer" : "Candidate"}: ${t.text}`).join("\n");
      const reply = await requestCompassDirect(persona.systemPrompt, `Interview so far:\n${history}\n\nAsk your next question or a natural follow-up, in character. Reply with only the question/follow-up, no preamble.`);
      session.transcript.push({ turn: session.transcript.length + 1, sender: "interviewer", text: cleanText(reply, 400) });
      saveTrackerState();
      interviewQuestionShownAt = Date.now();
    }
  } catch (error) {
    console.error("[Interview Practice] Failed to continue", error);
    interviewError = "Couldn't get the next question right now. Please try again.";
  } finally {
    isInterviewLoading = false;
    openModal("interviewPractice");
  }
}

async function finishInterviewSession(session, persona) {
  const history = session.transcript.map((t) => `Turn ${t.turn} (${t.sender}): ${t.text}${t.sender === "candidate" ? ` [responded after ${t.respondedAfterMs ? Math.round(t.respondedAfterMs / 1000) + "s" : "unknown"}, ${t.fillerWordCount || 0} filler words]` : ""}`).join("\n");
  const feedbackPrompt = `Full interview transcript with timing/filler-word signals:\n${history}\n\nGive feedback as strict JSON only: { "feedback": [ { "momentRef": "string quoting or referencing a specific turn", "observation": "string", "suggestion": "string" } ] }. Reference specific moments/turns, not just an aggregate score. Include the timing and filler-word signals where they're actually notable (e.g. a long pause or many filler words on a specific turn) - do not fabricate audio/tone detail beyond what the transcript, timing, and filler-word counts actually show.`;
  try {
    const reply = await requestCompassDirect(persona.systemPrompt, feedbackPrompt);
    const parsed = extractJsonObject(reply);
    session.feedback = Array.isArray(parsed && parsed.feedback) ? parsed.feedback.slice(0, 6).map((item) => ({
      momentRef: cleanText(item.momentRef || "", 160),
      observation: cleanText(item.observation || "", 260),
      suggestion: cleanText(item.suggestion || "", 260)
    })) : [];
  } catch (error) {
    console.error("[Interview Practice] Feedback generation failed", error);
  }
  session.completedAt = new Date().toISOString();
  saveTrackerState();
}

function interviewPersonaPicker() {
  return INTERVIEW_PERSONAS.map((persona) => `
    <button class="wide-action" type="button" data-start-interview="${escapeHTML(persona.id)}">
      <img src="assets/icon-boundary.png" alt="">
      <span><strong>${escapeHTML(persona.label)}</strong><small>${escapeHTML(persona.description)}</small></span>
    </button>
  `).join("");
}

// Career Studio - Resume Builder (Ch.9). Standard pattern: the user writes
// their real experience/education in plain language, AI only cleans up
// wording/structure - it is explicitly instructed not to invent employers,
// dates, or achievements, so the output stays trustworthy.
let isResumeLoading = false;
let resumeError = "";

function saveResumeDraft() {
  const existing = trackerState.careerStudio.resume || {};
  const fullNameInput = modalLayer.querySelector("#resume-full-name");
  const headlineInput = modalLayer.querySelector("#resume-headline");
  const experienceInput = modalLayer.querySelector("#resume-experience");
  const educationInput = modalLayer.querySelector("#resume-education");
  const skillsInput = modalLayer.querySelector("#resume-skills");
  const resume = {
    fullName: fullNameInput ? fullNameInput.value.trim().slice(0, 80) : (existing.fullName || ""),
    headline: headlineInput ? headlineInput.value.trim().slice(0, 120) : (existing.headline || ""),
    rawExperience: experienceInput ? experienceInput.value.trim().slice(0, 3000) : (existing.rawExperience || ""),
    rawEducation: educationInput ? educationInput.value.trim().slice(0, 1500) : (existing.rawEducation || ""),
    rawSkills: skillsInput ? skillsInput.value.trim().slice(0, 500) : (existing.rawSkills || ""),
    polishedText: existing.polishedText || "",
    updatedAt: new Date().toISOString()
  };
  trackerState.careerStudio.resume = resume;
  saveTrackerState();
  return resume;
}

async function polishResumeWithAI() {
  const resume = saveResumeDraft();
  if (!resume.headline && !resume.rawExperience && !resume.rawEducation) {
    resumeError = "Add a headline, some experience, or education first - there's nothing to polish yet.";
    openModal("resumeBuilder");
    return;
  }
  isResumeLoading = true;
  resumeError = "";
  openModal("resumeBuilder");
  try {
    const systemPrompt = "You are a professional resume writer. Write clean, honest resume content using only the facts given - never invent employers, dates, titles, or achievements that were not provided. Use strong action verbs and only quantify what was actually stated. Plain text only, no markdown symbols like ** or #.";
    const userPrompt = `Candidate facts:\nName: ${resume.fullName || "(not given)"}\nHeadline: ${resume.headline || "(not given)"}\nExperience (raw notes):\n${resume.rawExperience || "(none provided)"}\nEducation (raw notes):\n${resume.rawEducation || "(none provided)"}\nSkills (raw notes):\n${resume.rawSkills || "(none provided)"}\n\nOther real saved context about this person, for tone/emphasis only - do not invent resume line items from it:\n${realGrowthFactsText()}\n\nWrite a plain-text resume with sections in this order: NAME/HEADLINE, SUMMARY (2-3 sentences), EXPERIENCE (bullet points per role using dashes), EDUCATION, SKILLS.`;
    const reply = await requestCompassDirect(systemPrompt, userPrompt);
    resume.polishedText = cleanText(reply, 4000);
    resume.updatedAt = new Date().toISOString();
    trackerState.careerStudio.resume = resume;
    saveTrackerState();
  } catch (error) {
    console.error("[Resume Builder] Polish failed", error);
    resumeError = "Couldn't polish the resume right now. Please try again.";
  } finally {
    isResumeLoading = false;
    openModal("resumeBuilder");
  }
}

function resumeBuilderView() {
  const resume = trackerState.careerStudio.resume || {};
  return `
    <label>Full name<input type="text" id="resume-full-name" value="${escapeHTML(resume.fullName || "")}" placeholder="Your name"></label>
    <label>Headline<input type="text" id="resume-headline" value="${escapeHTML(resume.headline || "")}" placeholder="e.g. Recent graduate, Marketing"></label>
    <label>Experience (plain language - role, dates, what you did)<textarea id="resume-experience" rows="4" placeholder="e.g. Cafe barista, 2024-2025, handled orders and cash register, trained 2 new staff">${escapeHTML(resume.rawExperience || "")}</textarea></label>
    <label>Education<textarea id="resume-education" rows="2" placeholder="e.g. XYZ Secondary School, graduated 2025">${escapeHTML(resume.rawEducation || "")}</textarea></label>
    <label>Skills (comma separated)<input type="text" id="resume-skills" value="${escapeHTML(resume.rawSkills || "")}" placeholder="e.g. Excel, communication, Canva"></label>
    ${resumeError ? `<p class="form-error">${escapeHTML(resumeError)}</p>` : ""}
    <div class="modal-action-row">
      <button class="secondary-action compact-action" type="button" data-save-resume-draft>Save draft</button>
      <button class="primary-action compact-action" type="button" data-polish-resume ${isResumeLoading ? "disabled" : ""}>${isResumeLoading ? "Polishing..." : "Polish with AI"}</button>
    </div>
    ${resume.polishedText ? `
      <div class="resume-preview-card">
        <div class="modal-action-row"><strong>Preview</strong><button class="secondary-action compact-action" type="button" data-copy-resume>Copy text</button></div>
        <pre class="resume-preview-text">${escapeHTML(resume.polishedText)}</pre>
      </div>
    ` : ""}
  `;
}

// Career Studio - Job Matching (Ch.9). Deterministic, not AI-based: a fit
// score against a fixed catalog of well-known role archetypes, computed from
// the user's real saved Personal Blueprint (values/strengths/work/decision
// style). Standard, explainable scoring - no novel design needed here.
const WORK_STYLE_LABEL_BY_VALUE = Object.fromEntries(BLUEPRINT_WORK_SCENARIO.options.map((option) => [option.value, option.label]));
const DECISION_STYLE_LABEL_BY_VALUE = Object.fromEntries(BLUEPRINT_DECISION_SCENARIO.options.map((option) => [option.value, option.label]));

const CAREER_ROLE_ARCHETYPES = [
  { id: "data-analyst", title: "Data & Research Analyst", description: "Finding patterns in information and turning them into clear answers.", values: ["Growth", "Achievement"], strengths: ["Pattern recognition", "Technical problem-solving"], workStyle: ["deep-focus-blocks"], decisionStyle: ["research-heavy"] },
  { id: "ux-product-designer", title: "UX / Product Designer", description: "Shaping how a product looks, feels, and solves real user problems.", values: ["Creativity", "Growth"], strengths: ["Creativity", "Empathy"], workStyle: ["flexible", "collaborative"], decisionStyle: ["quick-plan"] },
  { id: "software-engineer", title: "Software Engineer", description: "Building and problem-solving with code, usually in focused stretches.", values: ["Growth", "Achievement", "Independence"], strengths: ["Technical problem-solving", "Pattern recognition", "Persistence"], workStyle: ["deep-focus-blocks"], decisionStyle: ["research-heavy", "just-start"] },
  { id: "marketing-brand", title: "Marketing & Brand", description: "Telling a story about a product or idea that gets people to care.", values: ["Creativity", "Connection", "Adventure"], strengths: ["Creativity", "Written communication"], workStyle: ["collaborative", "flexible"], decisionStyle: ["quick-plan"] },
  { id: "people-hr", title: "People & HR", description: "Helping people do their best work and resolving what gets in the way.", values: ["Connection", "Fairness"], strengths: ["Empathy", "Organisation", "Leadership"], workStyle: ["collaborative"], decisionStyle: ["ask-someone"] },
  { id: "operations-pm", title: "Operations / Project Management", description: "Keeping many moving parts on track toward a deadline.", values: ["Stability", "Achievement"], strengths: ["Organisation", "Leadership", "Persistence"], workStyle: ["short-bursts", "deep-focus-blocks"], decisionStyle: ["quick-plan"] },
  { id: "sales-partnerships", title: "Sales & Partnerships", description: "Building relationships and making the case for why something is worth it.", values: ["Achievement", "Adventure", "Connection"], strengths: ["Leadership", "Written communication"], workStyle: ["collaborative", "flexible"], decisionStyle: ["just-start"] },
  { id: "finance-accounting", title: "Finance / Accounting", description: "Making sure the numbers are right and the plan is sound.", values: ["Stability", "Fairness"], strengths: ["Organisation", "Pattern recognition"], workStyle: ["deep-focus-blocks"], decisionStyle: ["research-heavy"] },
  { id: "teaching-training", title: "Teaching / Training", description: "Helping other people understand something you already know.", values: ["Connection", "Growth"], strengths: ["Empathy", "Written communication", "Leadership"], workStyle: ["collaborative"], decisionStyle: ["ask-someone"] },
  { id: "creative-content", title: "Creative / Content", description: "Making things - writing, video, design - that people want to consume.", values: ["Creativity", "Adventure"], strengths: ["Creativity", "Written communication"], workStyle: ["flexible"], decisionStyle: ["just-start"] }
];

function scoreCareerRole(role, blueprint) {
  const matchedValues = role.values.filter((value) => blueprint.values.includes(value));
  const matchedStrengths = role.strengths.filter((strength) => blueprint.strengths.includes(strength));
  const workMatch = role.workStyle.includes(blueprint.workStyle);
  const decisionMatch = role.decisionStyle.includes(blueprint.decisionStyle);
  const score = matchedValues.length * 2 + matchedStrengths.length * 2 + (workMatch ? 1 : 0) + (decisionMatch ? 1 : 0);
  const max = role.values.length * 2 + role.strengths.length * 2 + 2;
  const percent = max ? Math.round((score / max) * 100) : 0;
  const matchedTraits = [...matchedValues, ...matchedStrengths];
  if (workMatch) matchedTraits.push(WORK_STYLE_LABEL_BY_VALUE[blueprint.workStyle] || blueprint.workStyle);
  if (decisionMatch) matchedTraits.push(DECISION_STYLE_LABEL_BY_VALUE[blueprint.decisionStyle] || blueprint.decisionStyle);
  return { role, percent, matchedTraits };
}

function jobMatchResults() {
  const blueprint = latestBlueprint();
  if (!blueprint) return null;
  return CAREER_ROLE_ARCHETYPES.map((role) => scoreCareerRole(role, blueprint)).sort((a, b) => b.percent - a.percent).slice(0, 5);
}

function jobMatchingView() {
  const results = jobMatchResults();
  if (!results) {
    return `
      <div class="empty-state-card">
        <p class="muted">Job matching uses your saved Personal Blueprint (values, strengths, work style) - complete that first.</p>
        <button class="primary-action" type="button" data-close-and-open="discoverYourself">Start Discover Yourself</button>
      </div>
    `;
  }
  return `
    <p class="muted">Based on your saved Personal Blueprint - a starting point for exploration, not a verdict on what you should do.</p>
    <div class="action-stack">
      ${results.map((result) => `
        <div class="job-match-card">
          <div class="modal-action-row"><strong>${escapeHTML(result.role.title)}</strong><span class="risk-pill calm">${result.percent}% fit</span></div>
          <p class="muted">${escapeHTML(result.role.description)}</p>
          ${result.matchedTraits.length ? `<div class="chip-row">${result.matchedTraits.map((trait) => `<span class="mini-chip">${escapeHTML(trait)}</span>`).join("")}</div>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function futureSelfEntryCard() {
  const snapshot = latestFutureSelfSnapshot();
  return `
    <section class="mirror-form-card future-self-entry-card">
      <img class="future-self-entry-icon" src="assets/icon-time.png" alt="">
      <p class="eyebrow">Future Self</p>
      <h3>${snapshot ? "See your future self again" : "Meet your future self"}</h3>
      <p class="muted">${snapshot ? `Last generated ${escapeHTML(snapshot.displayTime)} - ${escapeHTML((FUTURE_SELF_HORIZONS.find((item) => item.value === snapshot.horizon) || {}).label || "")}.` : "See where today's path may lead."}</p>
      <button class="secondary-action compact-action" type="button" data-open="futureSelfView">${snapshot ? "View Future Self" : "Start Future Self"}</button>
    </section>
  `;
}

function costOfLivingEntryCard() {
  return `
    <section class="mirror-form-card future-self-entry-card">
      <img class="future-self-entry-icon" src="assets/icon-money.png" alt="">
      <p class="eyebrow">Real Cost of Living</p>
      <h3>What does independent living actually cost?</h3>
      <p class="muted">Real Singapore estimates, not a game or a guess.</p>
      <button class="secondary-action compact-action" type="button" data-open="costOfLiving">Calculate</button>
    </section>
  `;
}

function savedFutureDecisions() {
  return (trackerState.futureMirror.saved || []).filter((item) => item.user_id === currentUserId());
}

function futureReflectionList() {
  const items = savedFutureDecisions().slice(0, 8);
  return `
    <section class="future-reflection-list">
      <div class="section-row">
        <div>
          <p class="eyebrow">Future Reflection</p>
          <h3>Saved decisions</h3>
        </div>
        <span>${items.length} saved</span>
      </div>
      ${items.length ? items.map((item) => `
        <article class="future-reflection-item">
          <div>
            <strong>${escapeHTML(item.question)}</strong>
            <p>${escapeHTML(item.decisionMade || "Reflection not added yet")}</p>
            ${item.lesson ? `<small>Lesson: ${escapeHTML(item.lesson)}</small>` : ""}
          </div>
          <button class="secondary-action compact-action" type="button" data-open="futureReflection" data-reflection-id="${escapeHTML(item.id)}">Reflect</button>
        </article>
      `).join("") : `
        <section class="empty-feature">
          <img src="assets/icon-spark.png" alt="">
          <div><strong>No saved decisions yet</strong><p>Past Future Mirror decisions you saved will show up here.</p></div>
        </section>
      `}
    </section>
  `;
}

function growthCommunityPrompt() {
  const result = trackerState.futureMirror && trackerState.futureMirror.latest;
  if (!result) return "I am using Future Mirror to think about a choice. What question should I ask a trusted friend, mentor, teacher, or support person?";
  return `Future Mirror reflection: ${result.question}\nI am comparing: ${(result.paths || []).map((path) => path.choice).join(" vs ")}\nQuestion for discussion: Which option seems more aligned with my goals, and what small action should I take today?`;
}

function latestAssessmentSummary() {
  const result = trackerState.assessment;
  if (!result) {
    return `
      <section class="empty-feature">
        <img src="assets/icon-assessment.png" alt="">
        <div>
          <strong>No Future Readiness result yet</strong>
          <p>Take the assessment to understand money, decisions, resilience, independence, relationships, and life direction.</p>
        </div>
      </section>
    `;
  }
  return `
    <section class="wellbeing-summary">
      <div class="wellbeing-mini-ring" style="--score:${result.score}">
        <strong>${result.score}</strong>
        <span>${result.level}</span>
      </div>
      <div>
        <p class="eyebrow">Latest Future Readiness Assessment</p>
        <h3>${escapeHTML(result.headline)}</h3>
        <p class="muted">${escapeHTML(result.summary)}</p>
        <button class="text-action" type="button" data-open="assessmentResult">View result</button>
      </div>
    </section>
  `;
}

function moodBars() {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return trackerState.mood.history.slice(-7).map((score, index, arr) => `
    <span class="mood-day ${index === arr.length - 1 ? "is-today" : ""}">
      <i style="height:${Math.max(22, Math.min(96, score))}%"></i>
      ${labels[index] || ""}
    </span>
  `).join("");
}

function generateMoodSuggestion(label, score, note) {
  const lower = `${label} ${note}`.toLowerCase();
  if (lower.includes("money") || lower.includes("spend") || lower.includes("debt")) {
    return {
      title: "Use a 10-minute money reset",
      summary: "Write needs, wants, and transport money before the next payment.",
      detail: "This uses cognitive offloading: move the worry from your head onto paper. Then choose one action only, such as pausing one want purchase or checking today's receipts.",
      technique: "Cognitive offloading + implementation intention"
    };
  }
  if (score < 45 || lower.includes("tired") || lower.includes("sleep")) {
    return {
      title: "Start with a tiny energy action",
      summary: "Do one low-friction action: water, light, stretch, or a 5-minute walk.",
      detail: "Behavioral activation works best when the first step is small enough to begin even with low motivation. Pick a cue: after opening the app, drink water or stand near sunlight for two minutes.",
      technique: "Behavioral activation"
    };
  }
  if (lower.includes("stress") || lower.includes("anxious") || lower.includes("overwhelm")) {
    return {
      title: "Shrink the problem into one next step",
      summary: "Name the worry, choose one controllable action, then message support if needed.",
      detail: "This combines cognitive reappraisal with an if-then plan. Try: If I feel stuck after 10 minutes, then I will ask one trusted person for help.",
      technique: "Cognitive strategy + implementation intention"
    };
  }
  return {
    title: "Build motivation through one win",
    summary: "Choose a small action that gives competence: finish, tidy, send, or plan one thing.",
    detail: "Self-determination theory highlights competence, autonomy, and relatedness. Pick one action you choose yourself, make it small enough to complete, then connect with someone if you need momentum.",
    technique: "Self-determination theory"
  };
}

function supportContactCards() {
  const contacts = trackerState.supportContacts.filter((contact) => contact.user_id === currentUserId() || !contact.user_id);
  if (!contacts.length) {
    return `
      <section class="empty-feature">
        <img src="assets/icon-support.png" alt="">
        <div><strong>Add someone you trust so Compass can help you reach out when needed.</strong><p>Your contacts stay private to your account in this prototype.</p></div>
      </section>
    `;
  }
  return contacts.map((contact) => `
    <article class="support-contact-card">
      <div>
        <p class="eyebrow">${escapeHTML(contact.relationship)}</p>
        <h3>${escapeHTML(contact.name)}</h3>
        <p>${escapeHTML(contact.preferred_contact_method)} - ${escapeHTML(contact.phone)}</p>
        ${contact.note ? `<small>${escapeHTML(contact.note)}</small>` : ""}
      </div>
      <div class="support-contact-actions">
        <button class="secondary-action compact-action" type="button" data-message-contact="${escapeHTML(contact.id)}">Message this person</button>
        <button class="text-action" type="button" data-edit-contact="${escapeHTML(contact.id)}">Edit</button>
        <button class="text-action danger-text" type="button" data-delete-contact="${escapeHTML(contact.id)}">Delete</button>
      </div>
    </article>
  `).join("");
}

function roleplayScenarioCards() {
  return roleplayScenarios.map((scenario) => `
    <button class="wide-action" type="button" data-start-roleplay="${scenario.id}">
      <img src="assets/icon-boundary.png" alt="">
      <span><strong>${escapeHTML(scenario.title)}</strong><small>${escapeHTML(scenario.skill)}</small></span>
    </button>
  `).join("");
}

function activeRoleplaySession() {
  return trackerState.roleplaySessions.find((session) => session.id === trackerState.activeRoleplaySessionId) || null;
}

function roleplayMessages(session) {
  return (session.messages || []).map((message) => `
    <div class="chat-bubble ${message.sender === "user" ? "is-user" : "is-ai"}">
      <span>${message.sender === "user" ? displayName() : "Compass Roleplay"}</span>
      <p>${escapeHTML(message.message)}</p>
    </div>
  `).join("");
}

function roleplayReply(session, userText) {
  const text = userText.toLowerCase();
  if (text.includes("unsafe") || text.includes("hurt") || text.includes("emergency")) {
    return "Let's pause the practice. If someone may be unsafe, contact a trusted person or emergency support now. What is one safe person you can reach?";
  }
  if (session.scenario_type === "peer-pressure") return "I hear you, but why not just try it once? Give me a clear no and a reason that protects your boundary.";
  if (session.scenario_type === "asking-help") return "Thank you for saying that. What is the specific help you want from me today?";
  if (session.scenario_type === "job-interview") return "Good start. Can you give one example of a strength you used in school, work, or home life?";
  if (session.scenario_type === "parents-teachers") return "I want to understand. What is the main thing you need me to hear without interrupting?";
  if (session.scenario_type === "handling-conflict") return "That sounds calmer. Can you say what you need next without blaming me?";
  if (session.scenario_type === "budget-decision") return "That plan needs a number. How much must stay untouched for transport, food, or bills?";
  return "That is a thoughtful reply. Try making it shorter, clearer, and kinder.";
}

function roleplayReflection(session) {
  const userMessages = (session.messages || []).filter((message) => message.sender === "user").map((message) => message.message).join(" ");
  const boundary = /no|can't|cannot|not comfortable|limit/i.test(userMessages);
  const asksHelp = /help|need|can you|please/i.test(userMessages);
  const specific = /\d|today|tomorrow|because|plan|rm|time/i.test(userMessages);
  return {
    wentWell: boundary ? "You stated a boundary or limit clearly." : asksHelp ? "You practiced asking for help directly." : "You stayed engaged and replied calmly.",
    improve: specific ? "Next time, keep the same clarity but make the reply shorter." : "Add one specific detail, such as time, amount, or the exact help you need.",
    nextStep: "Try the same scenario once more, or use Support Circle if this is a real situation."
  };
}

function receiptRows(limit = 5) {
  const rows = trackerState.receipts.slice(0, limit);
  if (!rows.length) {
    return `
      <div class="empty-panel">
        <img src="assets/icon-receipt.png" alt="">
        <div><strong>No payments recorded yet</strong><p>Scan a receipt or enter the amount after paying.</p></div>
      </div>
    `;
  }
  return rows.map((item) => `
    <div class="receipt-row">
      <img src="assets/icon-receipt.png" alt="">
      <div>
        <strong>${escapeHTML(item.merchant)}</strong>
        <p>${escapeHTML(item.category)} - ${escapeHTML(item.method)} - ${escapeHTML(item.time)}</p>
      </div>
      <span>${formatCurrency(item.amount)}</span>
    </div>
  `).join("");
}

function moodTrackerPanel() {
  const latestEntry = trackerState.mood.entries && trackerState.mood.entries[0];
  return `
    <section class="tracker-panel">
      <div class="tracker-panel-head">
        <div>
          <p class="eyebrow">Mood tracker</p>
          <h3>${escapeHTML(trackerState.mood.label)} today</h3>
          <p class="muted">${escapeHTML(trackerState.mood.note)}</p>
          ${latestEntry ? `<p class="tiny-note">Last logged: ${escapeHTML(latestEntry.display_time)}</p>` : ""}
        </div>
        <button class="secondary-action compact-action" type="button" data-open="mood">Log mood</button>
      </div>
      <div class="mood-chart">${moodBars()}</div>
    </section>
  `;
}

function supportStressSuggestion() {
  const assessmentScore = trackerState.assessment ? trackerState.assessment.score : 0;
  if (trackerState.mood.score >= 55 && assessmentScore < 42) return "";
  return `
    <section class="support-nudge">
      <img src="assets/icon-support.png" alt="">
      <div>
        <strong>You seem stressed. Do you want to contact someone from your support circle?</strong>
        <p>Reaching out early is a strong move, not a failure.</p>
      </div>
      <button class="secondary-action compact-action" type="button" data-open="supportCircle">Open</button>
    </section>
  `;
}

function receiptTrackerPanel() {
  return `
    <section class="tracker-panel receipt-panel">
      <div class="tracker-panel-head">
        <div>
          <p class="eyebrow">Receipt record</p>
          <h3>${formatCurrency(todaySpendTotal())} paid today</h3>
        <p class="muted">Scan or enter a payment. Compass updates today's spending automatically.</p>
        </div>
        <button class="secondary-action compact-action" type="button" data-open="receipt">Add receipt</button>
      </div>
      <div class="receipt-list">${receiptRows()}</div>
    </section>
  `;
}

function calculateAssessmentResult(answers) {
  const domains = Object.fromEntries(futureReadinessCategories.map((category) => [category, { total: 0, max: 0 }]));
  let readinessTotal = 0;
  let maxTotal = 0;
  let safetyFlag = false;

  assessmentItems.forEach((item) => {
    const raw = Number(answers[item.id] || 0);
    const readiness = item.directScore ? raw : item.reverse ? raw : 3 - raw;
    if (!domains[item.domain]) domains[item.domain] = { total: 0, max: 0 };
    domains[item.domain].total += readiness;
    domains[item.domain].max += 3;
    readinessTotal += readiness;
    maxTotal += 3;
    if (item.id === "safety" && raw > 0) safetyFlag = true;
  });

  const score = Math.round((readinessTotal / maxTotal) * 100);
  const domainBars = Object.entries(domains).map(([label, data]) => ({
    label,
    value: Math.round((data.total / data.max) * 100)
  }));

  let level = "Future building";
  let headline = "You are building future readiness step by step.";
  let summary = "Your answers show some prepared areas and some areas that need steady practice before adulthood feels easier.";
  let nextStep = "Choose your lowest category and build one small habit for the next seven days.";

  if (score >= 82) {
    level = "Strong readiness";
    headline = "You show strong future readiness.";
    summary = "Your answers suggest solid preparation for decision-making, responsibility, resilience, and future planning.";
    nextStep = "Protect your strengths by turning one goal into a clear plan with dates, support, and a backup option.";
  } else if (score >= 65) {
    level = "Growing readiness";
    headline = "You are developing useful adulthood skills.";
    summary = "Your answers suggest a good base, with a few areas that could become stronger through practice and reflection.";
    nextStep = "Use Future Mirror to compare one real decision and connect it to your goals or money habits.";
  } else if (score < 45) {
    level = "Needs support";
    headline = "Your future readiness needs more support and structure.";
    summary = safetyFlag
      ? "This app cannot handle emergencies. Please contact local emergency services or a trusted adult now if you may be unsafe."
      : "Your answers suggest adulthood skills may feel heavy right now. This is not a diagnosis. It is a signal to build support, routines, and small next steps.";
    nextStep = safetyFlag
      ? "Pause the app and contact emergency help, a trusted adult, school counsellor, or local crisis support immediately."
      : "Pick one category, ask for support from one safe person, and start with a 10-minute habit instead of a huge change.";
  }

  const aiInsights = createFutureReadinessInsights({ score, domainBars, answers, safetyFlag });

  return {
    score,
    readinessScore: score,
    level,
    headline,
    summary,
    nextStep,
    domainBars,
    aiInsights,
    answers,
    type: "future-readiness",
    updatedAt: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  };
}

function createFutureReadinessInsights({ score, domainBars, answers, safetyFlag }) {
  const sorted = [...domainBars].sort((a, b) => b.value - a.value);
  const strongest = sorted[0] || { label: "Decision-Making Skills", value: score };
  const weakest = sorted[sorted.length - 1] || { label: "Financial Readiness", value: score };
  const typed = cleanText(answers.freeText || "", 160);
  const strengths = strongest.value >= 70
    ? `You demonstrate strong ${strongest.label.toLowerCase()}, which can help you make steadier choices under pressure.`
    : "You already have some readiness signals. The next step is to make them more consistent through small routines.";
  const growthAreas = safetyFlag
    ? "Your safety response needs immediate care and real-world support before any future planning."
    : weakest.label === "Financial Readiness"
      ? "You may benefit from improving financial planning habits such as saving, delaying impulse spending, and separating needs from wants."
      : weakest.label === "Emotional Resilience"
        ? "You may benefit from strengthening stress recovery habits, asking for help earlier, and building a calmer response to setbacks."
        : weakest.label === "Decision-Making Skills"
          ? "You may benefit from slowing down decisions, reducing distractions, and comparing short-term comfort with long-term impact."
          : `You may benefit from strengthening ${weakest.label.toLowerCase()} with one small weekly habit.`;
  const futureReflection = typed
    ? `Your written reflection suggests this matters right now: "${typed}". Small improvements in ${weakest.label.toLowerCase()} today could create more freedom and confidence in your future.`
    : `Small improvements in ${weakest.label.toLowerCase()} today could create more freedom, confidence, and better options in your future.`;
  return { strengths, growthAreas, futureReflection, strongest, weakest };
}

function readinessIconLabel(label) {
  const icons = {
    "Financial Readiness": "ðŸ’°",
    "Decision-Making Skills": "ðŸ§ ",
    "Emotional Resilience": "â¤ï¸",
    "Life Direction & Purpose": "ðŸŽ¯",
    "Relationship & Communication Skills": "ðŸ¤",
    "Independence & Responsibility": "ðŸš€"
  };
  return `${icons[label] || "ðŸ”®"} ${label}`;
}

function weakestReadinessCategory(result) {
  const bars = Array.isArray(result && result.domainBars) ? result.domainBars : [];
  return [...bars].sort((a, b) => Number(a.value) - Number(b.value))[0] || { label: "Financial Readiness", value: 0 };
}

function readinessDiscussionPrompt(result) {
  if (!result) return "Help me understand my Future Readiness Assessment result.";
  const breakdown = (result.domainBars || []).map((item) => `${item.label}: ${item.value}/100`).join(" | ");
  const insights = result.aiInsights || {};
  return `Help me understand my Future Readiness Assessment. Score: ${result.score}/100. Breakdown: ${breakdown}. Strengths: ${insights.strengths || ""}. Growth areas: ${insights.growthAreas || ""}. Future reflection: ${insights.futureReflection || ""}. Give me 3 realistic actions for this week and do not treat this as a personality type.`;
}

function assessmentRows(result) {
  return result.domainBars.map((item) => `
    <div class="struggle-row">
      <span>${escapeHTML(readinessIconLabel(item.label))}</span>
      <i><b style="width:${item.value}%"></b></i>
      <strong>${item.value}</strong>
    </div>
  `).join("");
}

function captureAssessmentDraft() {
  assessmentItems.forEach((item) => {
    const selected = modalLayer.querySelector(`input[name="assessment-${item.id}"]:checked`);
    if (selected) assessmentDraft.answers[item.id] = Number(selected.value);
  });
  const freeText = modalLayer.querySelector("#assessment-free-text");
  if (freeText) assessmentDraft.freeText = freeText.value.trim();
  assessmentDraft.preferences = [...modalLayer.querySelectorAll('input[name="assessment-preference"]:checked')].map((input) => input.value);
}

function captureBlueprintDraft() {
  // Only overwrite a field if the currently-rendered session actually has
  // those inputs - each session renders a different subset of the form, and
  // an unconditional overwrite would wipe out an earlier session's answers
  // with an empty array once that session's inputs leave the DOM.
  if (modalLayer.querySelector('input[name="blueprint-value"]')) {
    blueprintDraft.values = [...modalLayer.querySelectorAll('input[name="blueprint-value"]:checked')].map((input) => input.value);
  }
  const personality = modalLayer.querySelector('input[name="blueprint-personality"]:checked');
  if (personality) blueprintDraft.personalityChoice = personality.value;
  if (modalLayer.querySelector('input[name="blueprint-strength"]')) {
    blueprintDraft.strengths = [...modalLayer.querySelectorAll('input[name="blueprint-strength"]:checked')].map((input) => input.value);
  }
  const strengthOther = modalLayer.querySelector("#blueprint-strength-other");
  if (strengthOther) blueprintDraft.strengthsOther = strengthOther.value.trim();
  const motivation = modalLayer.querySelector('input[name="blueprint-motivation"]:checked');
  if (motivation) blueprintDraft.motivationChoice = motivation.value;
  const learning = modalLayer.querySelector('input[name="blueprint-learning"]:checked');
  if (learning) blueprintDraft.learningChoice = learning.value;
  const work = modalLayer.querySelector('input[name="blueprint-work"]:checked');
  if (work) blueprintDraft.workChoice = work.value;
  const decision = modalLayer.querySelector('input[name="blueprint-decision"]:checked');
  if (decision) blueprintDraft.decisionChoice = decision.value;
}

// Blind spots (Ch.3): never asked directly on a form - inferred gently from
// patterns already visible in Journal/Reflection entries, and always
// presented as an observation with evidence, never a diagnosis (Ch.12).
const BLIND_SPOT_PATTERNS = [
  { id: "conflict-avoidance", keywords: ["avoid", "didn't say anything", "didn't bring it up", "kept quiet", "didn't want to make it awkward"], observation: "avoiding a conversation" },
  { id: "procrastination", keywords: ["put it off", "procrastinat", "kept delaying", "waited until the last", "ran out of time"], observation: "putting off something important until late" },
  { id: "self-doubt", keywords: ["not good enough", "imposter", "don't deserve", "everyone else is better"], observation: "doubting your own ability even when things went well" },
  { id: "overcommitting", keywords: ["said yes even though", "too much on my plate", "overcommitted", "spread too thin"], observation: "saying yes to more than felt manageable" }
];

function inferBlindSpots() {
  const texts = [
    ...trackerState.journalEntries.filter((entry) => entry.user_id === currentUserId()).map((entry) => entry.content || entry.text || ""),
    ...allReflectionLikeEntries().map((entry) => entry.content || "")
  ].map((text) => String(text || "").toLowerCase());
  if (!texts.length) return [];
  return BLIND_SPOT_PATTERNS.map((pattern) => {
    const matchCount = texts.filter((text) => pattern.keywords.some((keyword) => text.includes(keyword))).length;
    return matchCount >= 2 ? { observation: `mentioned ${pattern.observation} in ${matchCount} recent entries`, confirmedByUser: false } : null;
  }).filter(Boolean);
}

function saveBlueprintSession(sessionId) {
  captureBlueprintDraft();
  const previous = latestBlueprint();
  const history = trackerState.blueprint.history;
  const nextVersion = {
    version: (previous ? previous.version : 0) + 1,
    versionedAt: new Date().toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }),
    values: blueprintDraft.values.length ? blueprintDraft.values.slice(0, 3) : (previous ? previous.values : []),
    personality: (() => {
      const option = BLUEPRINT_PERSONALITY_SCENARIO.options.find((item) => item.value === blueprintDraft.personalityChoice);
      return option ? { style: option.style, pace: option.pace } : (previous ? previous.personality : { style: "", pace: "" });
    })(),
    personalityChoice: blueprintDraft.personalityChoice || (previous ? previous.personalityChoice : ""),
    strengths: blueprintDraft.strengths.length ? blueprintDraft.strengths.slice(0, 3) : (previous ? previous.strengths : []),
    strengthsOther: blueprintDraft.strengthsOther,
    blindSpots: inferBlindSpots(),
    motivationStyle: blueprintDraft.motivationChoice || (previous ? previous.motivationStyle : ""),
    motivationChoice: blueprintDraft.motivationChoice,
    learningStyle: blueprintDraft.learningChoice || (previous ? previous.learningStyle : ""),
    learningChoice: blueprintDraft.learningChoice,
    workStyle: blueprintDraft.workChoice || (previous ? previous.workStyle : ""),
    workChoice: blueprintDraft.workChoice,
    decisionStyle: blueprintDraft.decisionChoice || (previous ? previous.decisionStyle : ""),
    decisionChoice: blueprintDraft.decisionChoice
  };
  history.push(nextVersion);
  saveTrackerState();
  return nextVersion;
}

function blueprintMicroInsight(version) {
  if (version.values.length) return `Your top value looks like ${version.values[0].toLowerCase()} - we'll check in on how your choices reflect that over time.`;
  if (version.strengths.length) return `${version.strengths[0]} stands out as a strength - future modules will build on it.`;
  if (version.decisionStyle) return `You tend to decide by "${BLUEPRINT_DECISION_SCENARIO.options.find((option) => option.value === version.decisionStyle)?.label.toLowerCase()}" - that shapes how Decision Compass will frame things for you.`;
  return "Your Blueprint is saved and ready for the rest of Future Mirror to use.";
}

function blueprintSummaryCard() {
  const version = latestBlueprint();
  const insight = blueprintMicroInsightText;
  blueprintMicroInsightText = "";
  if (!version) {
    return `
      <section class="growth-hero-card blueprint-card">
        <div>
          <p class="eyebrow">Discover Yourself</p>
          <h3>Build the foundation everything else reads from.</h3>
          <p>Three short sessions - values, strengths, and how you learn/work/decide. Future Self, Decision Compass, Roadmap, and AI Coach all get more useful once this exists.</p>
        </div>
        <button class="primary-action" type="button" data-open="discoverYourself">Start Discover Yourself</button>
      </section>
    `;
  }
  return `
    <section class="growth-hero-card blueprint-card">
      <div>
        <p class="eyebrow">Your Blueprint - v${version.version}</p>
        <h3>${version.values.length ? `Values: ${escapeHTML(version.values.join(", "))}` : "Blueprint saved"}</h3>
        <p>${escapeHTML(insight || `${version.strengths.length ? `Strengths: ${version.strengths.join(", ")}.` : ""} ${version.personality && version.personality.style ? `Personality: ${version.personality.style}, ${version.personality.pace} pace.` : ""}`.trim() || "Keep building this out - more sessions make every other module more useful.")}</p>
        ${version.blindSpots.length ? `<p class="tiny-note">Noticed pattern: ${escapeHTML(version.blindSpots[0].observation)} - does that feel accurate to you?</p>` : ""}
      </div>
      <button class="secondary-action compact-action" type="button" data-open="discoverYourself">Update Blueprint</button>
    </section>
  `;
}

function visibleStories() {
  return contentState.stories.filter((story) => isAdmin() || story.published !== false);
}

function filteredStories() {
  const query = inspireSearch.trim().toLowerCase();
  return visibleStories().filter((story) => {
    const categoryMatch = inspireCategory === "All" || story.category === inspireCategory;
    const textMatch = !query || [story.title, story.person, story.category, story.preview, story.body].join(" ").toLowerCase().includes(query);
    return categoryMatch && textMatch;
  });
}

function storyCards(stories = filteredStories()) {
  if (!stories.length) {
    return `
      <section class="empty-feature inspire-empty">
        <img src="assets/icon-stories.png" alt="">
        <div>
          <strong>No Inspire Hub content found</strong>
          <p>Try another search or category.</p>
        </div>
      </section>
    `;
  }
  return stories.map((story) => `
    <article class="inspire-card ${story.published === false ? "is-unpublished" : ""}">
      <div class="inspire-cover" style="background-image:url('${escapeHTML(story.coverImage)}')">
        <span class="category-badge">${escapeHTML(story.category)}</span>
        ${story.youtubeUrl ? `<span class="video-badge">Video</span>` : ""}
      </div>
      <div class="inspire-card-body">
        <div>
          <p class="inspire-person">${escapeHTML(story.person)} - ${escapeHTML(story.readTime)}</p>
          <h3>${escapeHTML(story.title)}</h3>
          <p>${escapeHTML(story.preview)}</p>
        </div>
        <div class="inspire-actions">
          <button class="primary-action compact-action" type="button" data-story-id="${escapeHTML(story.id)}">Read Story</button>
          <button class="secondary-action compact-action" type="button" data-open-link="${escapeHTML(story.youtubeUrl || story.blogUrl || "")}" ${story.youtubeUrl || story.blogUrl ? "" : "disabled"}>Watch Video</button>
          <button class="secondary-action compact-action" type="button" data-story-ai-action="discuss" data-story-ai-id="${escapeHTML(story.id)}">Reflect</button>
          <button class="text-action" type="button" data-story-id="${escapeHTML(story.id)}">Learn More</button>
        </div>
        ${isAdmin() ? `
          <div class="story-admin-actions">
            <span class="publish-dot ${story.published === false ? "off" : ""}">${story.published === false ? "Unpublished" : "Published"}</span>
            <button class="text-action" type="button" data-edit-story="${escapeHTML(story.id)}">Edit</button>
            <button class="text-action danger-text" type="button" data-delete-story="${escapeHTML(story.id)}">Delete</button>
          </div>
        ` : ""}
      </div>
    </article>
  `).join("");
}

function featuredStoryCard(useFallback = true) {
  const story = filteredStories()[0] || (useFallback ? visibleStories()[0] : null);
  if (!story) return "";
  return `
    <section class="featured-story" style="background-image:url('${escapeHTML(story.coverImage)}')">
      <div>
        <p class="feature-label">Featured story</p>
        <span class="category-badge">${escapeHTML(story.category)}</span>
        <h3>${escapeHTML(story.title)}</h3>
        <p>${escapeHTML(story.preview)}</p>
        <div class="featured-meta">
          <span>${escapeHTML(story.person)}</span>
          <span>${escapeHTML(story.readTime)}</span>
          ${story.youtubeUrl ? "<span>Video available</span>" : ""}
        </div>
        <div class="featured-actions">
          <button class="primary-action compact-action" type="button" data-story-id="${escapeHTML(story.id)}">Read Story</button>
          <button class="secondary-action compact-action" type="button" data-story-ai-action="discuss" data-story-ai-id="${escapeHTML(story.id)}">Reflect</button>
        </div>
      </div>
    </section>
  `;
}

function storyOfTheDay() {
  const stories = visibleStories().filter((story) => story.published !== false);
  if (!stories.length) return null;
  const seed = Number(dateKey().replace(/\D/g, "")) || 0;
  return stories[seed % stories.length];
}

function storyOfTheDayCard() {
  const story = storyOfTheDay();
  if (!story) return "";
  const lesson = (story.keyLessons && story.keyLessons[0]) || story.preview;
  return `
    <section class="story-day-card" style="background-image:url('${escapeHTML(story.coverImage)}')">
      <div>
        <p class="feature-label">Story of the Day</p>
        <span class="category-badge">${escapeHTML(story.category)}</span>
        <h3>${escapeHTML(story.person)}</h3>
        <p>${escapeHTML(lesson)}</p>
        <button class="primary-action compact-action" type="button" data-story-ai-action="discuss" data-story-ai-id="${escapeHTML(story.id)}">What can I learn from this?</button>
      </div>
    </section>
  `;
}

function storyDiscussionPrompt(story) {
  if (!story) return "Help me discuss one Inspire Hub story and apply the lesson safely.";
  const lessons = (story.keyLessons || []).slice(0, 3).join("; ");
  return `I want to discuss this Inspire Hub story: ${story.title} about ${story.person}. Category: ${story.category}. Key decisions: ${(story.keyDecisions || []).join("; ")}. What happened after those decisions: ${story.afterDecisions}. Key lessons: ${lessons}. Reflection question: ${story.reflectionQuestion}. Action challenge: ${story.actionChallenge}. Start by asking me: "What inspired you most from this story?" Then help me reflect realistically.`;
}

function storyReflectionPrompt(story, mode) {
  if (!story) return "Help me reflect on an Inspire Hub story realistically.";
  const context = `Story context only: ${story.title} about ${story.person}. Category: ${story.category}. Short hook: ${story.preview}. Key decisions: ${(story.keyDecisions || []).join("; ")}. What happened after those decisions: ${story.afterDecisions}. Key lessons: ${(story.keyLessons || []).join("; ")}. Reflection question: ${story.reflectionQuestion}. Action challenge: ${story.actionChallenge}.`;
  if (mode === "apply") {
    return `${context}\nHelp me apply this lesson to my own life. Ask one short question if needed, then create a practical personal action plan. Example style: "How can you apply ${story.person}'s focus principle to your studies this week?" Do not invent facts about me.`;
  }
  if (mode === "reality") {
    return `${context}\nGive me a Reality Check. Separate what is realistic to copy from what is not realistic to copy. Include realistic to copy: discipline, learning habits, persistence, and decision patterns. Include not realistic to copy: expecting huge success quickly, copying extreme work habits without balance, or ignoring privilege, timing, team support, and luck. Keep it supportive and grounded.`;
  }
  if (mode === "plan") {
    return `${context}\nGenerate a Personal Action Plan with exactly 3 small actions I can take this week based on this story. Keep actions realistic, balanced, and suitable for a young person.`;
  }
  return storyDiscussionPrompt(story);
}

function storyExternalLinks(story) {
  const links = [
    ["Watch video", story.youtubeUrl],
    ["Read article", story.blogUrl],
    ["Listen podcast", story.podcastUrl]
  ].filter(([, url]) => url);
  if (!links.length) return "";
  return `
    <div class="external-link-grid">
      ${links.map(([label, url]) => `
        <button class="secondary-action compact-action" type="button" data-open-link="${escapeHTML(url)}">${escapeHTML(label)}</button>
      `).join("")}
    </div>
  `;
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

// Deterministic, never AI-generated - built directly from real stored fields
// so it can never fabricate a reference (Ch.8 integrity requirement). Checked
// in priority order: an overdue Roadmap milestone, a recent Reflection entry,
// a resurfaced Decision, then a Blueprint-based opener, else the generic
// default (per Ch.17: honest about thin data rather than faking specificity).
function coachProactiveOpener() {
  const overdueMilestone = myRoadmapGoals().flatMap((goal) => goal.milestones.filter((m) => m.status !== "done").map((m) => ({ ...m, goalTitle: goal.title }))).sort((a, b) => a.month - b.month)[0];
  if (overdueMilestone) return `Your next Roadmap milestone is "${overdueMilestone.title}" for "${overdueMilestone.goalTitle}" - how's that going?`;
  const recentReflection = trackerState.reflectionEntries.filter((entry) => entry.user_id === currentUserId())[0];
  if (recentReflection) return `Last time you wrote a ${recentReflection.mode === "daily" ? "daily reflection" : recentReflection.mode === "weeklyLetter" ? "weekly letter" : "reflection"} about: "${cleanText(recentReflection.content, 140)}" - want to pick up from there, or something else on your mind?`;
  const due = dueForResurfacing()[0];
  if (due) return `A decision you journaled a while back just resurfaced - "${cleanText(due.content, 140)}" - how does it look now?`;
  const blueprint = latestBlueprint();
  if (blueprint && blueprint.values.length) return `You told Discover Yourself that ${blueprint.values[0].toLowerCase()} matters most to you right now - what's on your mind today?`;
  return defaultChatState.messages[0].text;
}

function applyCoachProactiveOpener() {
  if (chatState.messages.length === 1 && chatState.messages[0].from === "assistant" && chatState.messages[0].text === defaultChatState.messages[0].text) {
    const opener = coachProactiveOpener();
    if (opener !== defaultChatState.messages[0].text) {
      chatState.messages[0] = { from: "assistant", text: opener };
      saveChatState();
    }
  }
}

function chatMessages() {
  const messages = chatState.messages.map((message) => `
    <div class="chat-bubble ${message.from === "user" ? "is-user" : "is-ai"}">
      <span>${message.from === "user" ? displayName() : "Compass AI"}</span>
      <p>${escapeHTML(message.text)}</p>
    </div>
  `).join("");
  const typing = isCompassResponding ? `
    <div class="chat-bubble is-ai is-typing">
      <span>Compass AI</span>
      <p><i></i><i></i><i></i></p>
    </div>
  ` : "";
  return messages + typing;
}

function uploadedDocumentStatus() {
  const documents = Array.isArray(chatState.documents) ? chatState.documents : [];
  if (!documents.length) {
    return `<p class="tiny-note">No PDF uploaded for this chat session.</p>`;
  }
  return documents.map((doc) => `
    <div class="document-pill">
      <span>${escapeHTML(doc.fileName)}</span>
      <small>${(doc.chunks || []).length} chunks ready</small>
    </div>
  `).join("");
}

function chunkDocumentText(text, fileName) {
  const clean = cleanText(text, 60000);
  const chunks = [];
  const size = 900;
  const overlap = 140;
  for (let start = 0; start < clean.length; start += size - overlap) {
    const chunk = clean.slice(start, start + size).trim();
    if (chunk.length > 80) {
      chunks.push({
        id: `chunk-${Date.now()}-${chunks.length}`,
        fileName,
        text: chunk
      });
    }
  }
  return chunks.slice(0, 80);
}

function tokenizeQuery(text) {
  const stopWords = new Set(["the", "and", "for", "with", "that", "this", "from", "what", "when", "where", "which", "about", "into", "your", "you", "are", "can", "how", "why", "tell", "please", "help", "does"]);
  return cleanText(text, 1000)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function retrieveDocumentChunks(question) {
  const terms = tokenizeQuery(question);
  if (!terms.length || !Array.isArray(chatState.documents) || !chatState.documents.length) return [];
  const scored = [];
  chatState.documents.forEach((doc) => {
    (doc.chunks || []).forEach((chunk) => {
      const lower = chunk.text.toLowerCase();
      let score = 0;
      terms.forEach((term) => {
        const matches = lower.match(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"));
        if (matches) score += matches.length;
      });
      if (score > 0) scored.push({ ...chunk, score });
    });
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, 4).map(({ score, ...chunk }) => chunk);
}

async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return window.pdfjsLib;
}

async function extractPdfText(file) {
  try {
    const pdfjsLib = await loadPdfJs();
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pageTexts = [];
    const maxPages = Math.min(pdf.numPages, 30);
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(content.items.map((item) => item.str || "").join(" "));
    }
    return pageTexts.join("\n").replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error("[Compass AI] PDF extraction failed", error);
    return roughExtractPdfText(file);
  }
}

async function roughExtractPdfText(file) {
  try {
    const buffer = await file.arrayBuffer();
    const raw = new TextDecoder("latin1").decode(buffer);
    const matches = [...raw.matchAll(/\(([^()]{2,})\)/g)]
      .map((match) => match[1].replace(/\\[nrtbf()\\]/g, " "))
      .filter((text) => /[A-Za-z0-9]/.test(text));
    return cleanText(matches.join(" "), 60000);
  } catch (error) {
    console.error("[Compass AI] fallback PDF extraction failed", error);
    return "";
  }
}

async function handlePdfUpload(file) {
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    chatState.messages.push({ from: "assistant", text: "Please upload a PDF file so I can read it for this chat session.", local: true });
    saveChatState();
    renderScreen("compass");
    return;
  }
  chatState.messages.push({ from: "assistant", text: `Reading ${file.name}...`, local: true });
  saveChatState();
  renderScreen("compass");
  const text = await extractPdfText(file);
  chatState.messages = chatState.messages.filter((message) => message.text !== `Reading ${file.name}...`);
  if (!text || text.length < 80) {
    chatState.messages.push({ from: "assistant", text: "I could not extract readable text from that PDF. If it is a scanned image, try uploading a text-based PDF or paste the key notes into chat.", local: true });
    saveChatState();
    renderScreen("compass");
    return;
  }
  const documentRecord = {
    id: `doc-${Date.now()}`,
    fileName: file.name,
    uploadedAt: new Date().toISOString(),
    chunks: chunkDocumentText(text, file.name)
  };
  chatState.documents = [documentRecord, ...(chatState.documents || [])].slice(0, 3);
  chatState.messages.push({ from: "assistant", text: `${file.name} is ready. Ask me questions about the uploaded document.`, local: true });
  saveChatState();
  renderScreen("compass");
}

function adminStudio() {
  if (!isAdmin()) {
    return `
      <section class="profile-card">
        <p class="eyebrow">Admin tools</p>
        <h3>Admin access required</h3>
        <p class="muted">Users can access features but cannot edit stories, app settings, or system content.</p>
      </section>
    `;
  }
  return `
    <section class="admin-panel">
      <div class="section-row">
        <h3>Admin Studio</h3>
        <button class="secondary-action compact-action" type="button" data-open="storyEditor">Add Inspire content</button>
      </div>
      <label class="admin-field">
        Home notice
        <textarea id="admin-notice">${escapeHTML(contentState.notice)}</textarea>
      </label>
      <div class="feature-toggle-grid">
        ${Object.entries(settingsState.features).map(([key, enabled]) => `
          <label class="toggle-check">
            <input type="checkbox" data-feature-toggle="${key}" ${enabled ? "checked" : ""}>
            <span>${key}</span>
          </label>
        `).join("")}
      </div>
      <button class="primary-action" type="button" data-save-admin-settings>Save admin changes</button>
    </section>
  `;
}

function growthPartnerCard() {
  const interests = cleanText(userProfile.interests, 120) || "your interests";
  const goals = cleanText(userProfile.goals || userProfile.dreamCareer, 140) || "your current growth goal";
  return `
    <section class="growth-partner-card">
      <div>
        <p class="eyebrow">Growth Partner Matching</p>
        <h3>Find someone with a similar direction, not a dating match.</h3>
        <p>Compass can use your saved interests and goals to suggest what kind of study partner, accountability buddy, or mentor group may fit.</p>
        <div class="partner-match-preview">
          <span><strong>Interests</strong>${escapeHTML(interests)}</span>
          <span><strong>Goal direction</strong>${escapeHTML(goals)}</span>
        </div>
      </div>
      <button class="primary-action compact-action" type="button" data-growth-prompt="${escapeHTML(growthPromptFromData("a safe growth partner match description and first message"))}">Find match style</button>
    </section>
  `;
}

function futureScanEntrySection() {
  if (futureScanStage === "clarify") return futureScanClarifySection();
  if (futureScanStage === "stations" && activeFutureScan) return futureScanStationGrid();

  const recentEntries = allReflectionLikeEntries()
    .filter((entry) => entry.user_id === currentUserId() && cleanText(entry.content, 1))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 4);
  const pastScans = myFutureScans();

  return `
    <h3>See the truth before you choose.</h3>
    <p class="muted">Future Scan isn't a checklist - it's a set of quick, honest looks at one real choice, grounded in what you've actually saved here.</p>
    <label>What's on your mind?
      <textarea id="scan-raw-input" placeholder="Example: Whether to take a part-time job this year">${escapeHTML(futureScanRawInput)}</textarea>
    </label>
    ${recentEntries.length ? `
      <p class="eyebrow">Or scan something you already wrote</p>
      <div class="mirror-example-row">
        ${recentEntries.map((entry) => `<button type="button" data-scan-from-entry="${escapeHTML(entry.id)}">${escapeHTML(cleanText(entry.content, 60))}</button>`).join("")}
      </div>
    ` : ""}
    ${futureScanError ? `<p class="form-error">${escapeHTML(futureScanError)}</p>` : ""}
    <button class="primary-action mirror-run-action" type="button" data-start-future-scan ${isFutureScanLoading ? "disabled" : ""}>${isFutureScanLoading ? "Thinking..." : "Start Future Scan"}</button>
    ${pastScans.length ? `
      <p class="eyebrow">Or continue a past scan</p>
      <div class="action-stack future-scan-grid">
        ${pastScans.slice(0, 3).map((scan) => `
          <button type="button" class="wide-action" data-open-past-scan="${escapeHTML(scan.id)}">
            <span><strong>${escapeHTML(cleanText(scan.scanContext.rawInput, 60))}</strong><small>${Object.keys(scan.stations || {}).length} station(s) done - ${escapeHTML(new Date(scan.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }))}</small></span>
          </button>
        `).join("")}
      </div>
      <button class="text-action" type="button" data-open="pastFutureScans">See all ${pastScans.length} past scan${pastScans.length === 1 ? "" : "s"}</button>
    ` : ""}
  `;
}

function futureScanClarifySection() {
  return `
    <h3>${escapeHTML(futureScanClarifyQuestion || "Let me make sure I understand.")}</h3>
    ${futureScanClarifyChips.length ? `
      <div class="mirror-example-row">
        ${futureScanClarifyChips.map((chip) => `<button type="button" class="${futureScanClarifyAnswer === chip ? "is-selected" : ""}" data-scan-clarify-chip="${escapeHTML(chip)}">${escapeHTML(chip)}</button>`).join("")}
      </div>
    ` : ""}
    <label>Or answer in your own words
      <input id="scan-clarify-answer" type="text" placeholder="Type a short answer" value="${escapeHTML(futureScanClarifyAnswer)}">
    </label>
    ${futureScanError ? `<p class="form-error">${escapeHTML(futureScanError)}</p>` : ""}
    <button class="primary-action mirror-run-action" type="button" data-submit-future-scan-clarify ${isFutureScanLoading ? "disabled" : ""}>${isFutureScanLoading ? "Setting up your scan..." : "Continue"}</button>
  `;
}

function futureScanStationGrid() {
  if (!activeFutureScan) return "";
  return `
    <h3>Your Future Scan</h3>
    <p class="muted">"${escapeHTML(cleanText(activeFutureScan.scanContext.rawInput, 140))}"</p>
    ${futureScanSignalBanner()}
    ${futureScanSynthesisCard()}
    ${futureScanSuggestedSection()}
    ${FUTURE_SCAN_GROUPS.map((group) => `
      <div class="future-scan-group">
        <p class="eyebrow future-scan-group-title">${escapeHTML(group.title)}</p>
        <p class="tiny-note future-scan-group-subtitle">${escapeHTML(group.subtitle)}</p>
        <div class="action-stack future-scan-grid">
          ${FUTURE_SCAN_STATIONS.filter((station) => station.group === group.id).map((station) => {
            const done = activeFutureScan.stations && activeFutureScan.stations[station.id];
            return `
              <button class="wide-action" type="button" data-open="futureScanStation" data-open-payload="${escapeHTML(station.id)}">
                <img src="assets/${escapeHTML(station.icon)}" alt="">
                <span><strong>${escapeHTML(station.title)}</strong><small>${escapeHTML(station.blurb)}</small></span>
                ${done ? `<span class="risk-pill calm">Done</span>` : ""}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `).join("")}
    <div class="profile-actions">
      <button class="secondary-action compact-action" type="button" data-reset-future-scan>Start a new scan</button>
      <button class="text-action" type="button" data-open="pastFutureScans">View past scans</button>
    </div>
  `;
}

// Suggested stations are picked once, by the same AI call that generates the
// clarifying question (no extra request) - the ids are saved on
// scanContext.suggestedStationIds so they persist across reopening the scan
// later from history. This is a shortcut row, not a replacement for the
// grouped grid below it - the stations still appear in their normal group too.
function futureScanSuggestedSection() {
  if (!activeFutureScan) return "";
  const suggestedIds = (activeFutureScan.scanContext && activeFutureScan.scanContext.suggestedStationIds) || [];
  const suggested = FUTURE_SCAN_STATIONS.filter((station) => suggestedIds.includes(station.id));
  if (!suggested.length) return "";
  return `
    <div class="future-scan-group future-scan-suggested">
      <p class="eyebrow future-scan-group-title">Suggested for this</p>
      <p class="tiny-note future-scan-group-subtitle">Picked for this specific situation, not a fixed default.</p>
      <div class="action-stack future-scan-grid">
        ${suggested.map((station) => {
          const done = activeFutureScan.stations && activeFutureScan.stations[station.id];
          return `
            <button class="wide-action" type="button" data-open="futureScanStation" data-open-payload="${escapeHTML(station.id)}">
              <img src="assets/${escapeHTML(station.icon)}" alt="">
              <span><strong>${escapeHTML(station.title)}</strong><small>${escapeHTML(station.blurb)}</small></span>
              ${done ? `<span class="risk-pill calm">Done</span>` : ""}
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

// Synthesis is an on-demand AI call (not automatic - futureScanStationGrid()
// re-renders on every station open/close, so firing this for free would spam
// requests) that combines whatever stations the user has already run into
// one coherent read. Gated behind >=3 completed stations so there's actually
// something to synthesize; cached on activeFutureScan.synthesis and marked
// stale (not hidden) once the set of completed stations changes.
function futureScanSynthesisCard() {
  if (!activeFutureScan) return "";
  const completedIds = Object.keys(activeFutureScan.stations || {}).sort();
  if (completedIds.length < 3) return "";
  const synthesis = activeFutureScan.synthesis;
  const isStale = synthesis && synthesis.basedOn !== completedIds.join(",");
  return `
    <div class="future-scan-synthesis-card">
      ${synthesis ? `
        <p class="eyebrow">Synthesis${isStale ? " - new results since this was generated" : ""}</p>
        <p><strong>${escapeHTML(synthesis.headline)}</strong></p>
        <p class="muted">${escapeHTML(synthesis.reading)}</p>
      ` : `
        <p class="eyebrow">Synthesis</p>
        <p class="muted">You've run ${completedIds.length} stations on this situation - want the full picture instead of one at a time?</p>
      `}
      ${futureScanSynthesisError ? `<p class="form-error">${escapeHTML(futureScanSynthesisError)}</p>` : ""}
      <button class="secondary-action compact-action" type="button" data-run-scan-synthesis ${isFutureScanSynthesisLoading ? "disabled" : ""}>${isFutureScanSynthesisLoading ? "Synthesizing..." : synthesis ? (isStale ? "Refresh synthesis" : "Re-run synthesis") : "Generate synthesis"}</button>
    </div>
  `;
}

async function runFutureScanSynthesis() {
  if (!activeFutureScan) return;
  const completedIds = Object.keys(activeFutureScan.stations || {}).sort();
  if (completedIds.length < 3) return;
  futureScanSynthesisError = "";
  isFutureScanSynthesisLoading = true;
  renderScreen("future");
  try {
    const prompt = `${scanContextText(null)} You have combined findings from ${completedIds.length} Future Scan stations the user has already run on this same situation (listed above). Write one clear, honest synthesis of what these results, taken together, suggest - where they agree, where they create tension with each other, and what that adds up to. Only build on what's already stated above, don't add new claims that weren't in any station's result. Never tell them what to choose - end by handing the decision back to them. Respond as strict JSON only: {"headline":"string","reading":"string"}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed) throw new Error("Synthesis reply was not valid JSON.");
    const result = {
      headline: cleanText(parsed.headline || "Here's how it all adds up.", 200),
      reading: cleanText(parsed.reading || "", 500),
      basedOn: completedIds.join(","),
      generatedAt: new Date().toISOString()
    };
    activeFutureScan.synthesis = result;
    const stored = trackerState.futureScans.find((item) => item.id === activeFutureScan.id);
    if (stored) stored.synthesis = result;
    saveTrackerState();
  } catch (error) {
    console.error("[Future Scan] Synthesis failed", error);
    futureScanSynthesisError = "The synthesis is having trouble running right now. Please try again.";
  } finally {
    isFutureScanSynthesisLoading = false;
    renderScreen("future");
  }
}

// Cross-station signal - a per-station "caution|positive|neutral" read, taken
// straight from that station's own already-saved result (never a fresh AI
// call), so a banner can point out when several independently-run stations
// happen to agree. signalRadar and checkBack are deliberately excluded:
// Signal Radar is explicitly "not a score" in its own framing, and Check-Back
// is retrospective, not a read on the choice itself - folding either into an
// aggregate would contradict what that station promises the user.
function futureScanStationSignal(stationId, result) {
  if (!result) return null;
  switch (stationId) {
    case "identityScan": {
      if (!result.identities.length) return null;
      const toward = result.identities.filter((item) => item.direction === "toward").length;
      const away = result.identities.filter((item) => item.direction === "away").length;
      if (away > toward) return "caution";
      if (toward > away) return "positive";
      return "neutral";
    }
    case "valuesCheck": {
      if (!result.checks.length) return null;
      const aligned = result.checks.filter((item) => item.alignment === "aligned").length;
      const tension = result.checks.filter((item) => item.alignment === "tension").length;
      if (tension > aligned) return "caution";
      if (aligned > tension) return "positive";
      return "neutral";
    }
    case "hiddenCosts":
      return result.costs.length ? (result.costs.some((item) => item.severity >= 70) ? "caution" : "neutral") : null;
    case "pressureTest":
      return result.pressureLevel === "high" ? "caution" : result.pressureLevel === "low" ? "positive" : "neutral";
    case "conflictMap": {
      if (!result.conflicts.length) return null;
      if (result.conflicts.some((item) => item.tension === "strong")) return "caution";
      if (result.conflicts.some((item) => item.tension === "mild")) return "neutral";
      return "positive";
    }
    case "pastSelfCheck": {
      if (!result.patterns.length) return null;
      const consistent = result.patterns.filter((item) => item.comparison === "consistent").length;
      const inconsistent = result.patterns.filter((item) => item.comparison === "inconsistent").length;
      if (inconsistent > consistent) return "caution";
      if (consistent > inconsistent) return "positive";
      return "neutral";
    }
    case "driftDetector":
      return result.drift === "drifting" ? "caution" : result.drift === "onTrack" ? "positive" : "neutral";
    default:
      return null;
  }
}

function futureScanSignalBanner() {
  if (!activeFutureScan) return "";
  const signals = FUTURE_SCAN_STATIONS
    .map((station) => futureScanStationSignal(station.id, activeFutureScan.stations[station.id]))
    .filter(Boolean);
  if (signals.length < 3) return "";
  const caution = signals.filter((item) => item === "caution").length;
  const positive = signals.filter((item) => item === "positive").length;
  if (caution >= 2 && caution > positive) {
    return `<div class="future-scan-signal-banner caution"><strong>${caution} of ${signals.length}</strong> stations you've run are flagging caution here - might be worth a closer look before deciding.</div>`;
  }
  if (positive >= 2 && positive > caution) {
    return `<div class="future-scan-signal-banner positive"><strong>${positive} of ${signals.length}</strong> stations you've run are lining up in favor of this - a consistent signal so far.</div>`;
  }
  return `<div class="future-scan-signal-banner mixed">The stations you've run so far are giving mixed signals - might be worth checking a couple more angles.</div>`;
}

const screens = {
  home: () => `
    ${futureMirrorHomeHero()}
    ${todayInsightCard()}
    ${futureScoreHomeCard()}
    ${homeQuickAccessGrid()}
    ${dailyMissionCard()}
    ${moodSuggestionSummary()}
    ${futureReflectionHomeSummary()}
    ${storyOfTheDayCard()}
    ${compassQuickAccessCard()}
  `,

  future: () => `
    <header class="screen-head compact-head mirror-head">
      <div>
        <p class="eyebrow">Future Mirror</p>
        <h2 class="screen-title">Your future is built by today's choices.</h2>
        <p class="screen-subtitle">Compare paths before you choose.</p>
      </div>
      <div class="avatar"><img src="assets/icon-spark.png" alt=""></div>
    </header>

    ${futureSelfEntryCard()}
    ${costOfLivingEntryCard()}

    <section class="mirror-form-card">
      <div class="home-quick-grid mirror-mode-grid">
        <button type="button" class="${futureMirrorMode === "scan" ? "is-selected" : ""}" data-future-mirror-mode="scan">
          <img src="assets/icon-guide.png" alt="">
          <strong>Future Scan</strong>
        </button>
        <button type="button" class="${futureMirrorMode === "build" ? "is-selected" : ""}" data-future-mirror-mode="build">
          <img src="assets/icon-decide.png" alt="">
          <strong>Build Mode</strong>
        </button>
      </div>
      ${futureMirrorMode === "build" ? buildModeEntrySection() : futureScanEntrySection()}
    </section>

    ${savedFutureDecisions().length ? futureReflectionList() : ""}
  `,

  assess: () => `
    <header class="screen-head compact-head">
      <div>
        <p class="eyebrow">Future Readiness Assessment</p>
        <h2 class="screen-title">Prepare for adulthood and future success.</h2>
        <p class="screen-subtitle">Assess money habits, decision-making, resilience, relationships, independence, and life direction.</p>
      </div>
      <div class="avatar"><img src="assets/icon-assessment.png" alt=""></div>
    </header>

    <div class="action-stack">
      <button class="wide-action dark-action" type="button" data-open="assessment">
        <img src="assets/icon-assessment.png" alt="">
        <span><strong>Start Future Readiness Assessment</strong><small>Prepare for adulthood</small></span>
      </button>
      <button class="wide-action" type="button" data-open="mood">
        <img src="assets/icon-mood.png" alt="">
        <span><strong>Log mood</strong><small>Track today in 30 seconds</small></span>
      </button>
      <button class="wide-action" type="button" data-open="supportCircle">
        <img src="assets/icon-support.png" alt="">
        <span><strong>Support Circle</strong><small>Reach trusted people when stress is high</small></span>
      </button>
    </div>

    ${latestAssessmentSummary()}
    ${moodTrackerPanel()}
    ${supportStressSuggestion()}
    ${featureEnabled("receipts") ? receiptTrackerPanel() : ""}
  `,

  compass: () => `
    <header class="screen-head compact-head compass-head">
      <div>
        <p class="eyebrow">Compass AI</p>
        <h2 class="screen-title">Chat like a real conversation.</h2>
        <p class="screen-subtitle">Ask about study, planning, motivation, app help, emotions, or everyday decisions.</p>
      </div>
      <div class="ai-avatar"><img src="assets/icon-chat.png" alt=""></div>
    </header>
    <div class="suggested-prompts">
      ${["Help me think through a decision", "Reflect on an Inspire story", "Reality-check my goal", "Turn a lesson into action"].map((prompt) => `
        <button type="button" data-chat-prompt="${escapeHTML(prompt)}">${escapeHTML(prompt)}</button>
      `).join("")}
    </div>
    <section class="chat-room">
      <div class="chat-messages" id="chat-messages">${chatMessages()}</div>
      <div class="chat-input-row">
        <button class="voice-button" type="button" data-voice-chat aria-label="Voice input">Mic</button>
        <label class="voice-button file-chat-button" aria-label="Upload PDF">
          PDF
          <input id="chat-pdf-input" type="file" accept="application/pdf" data-pdf-upload>
        </label>
        <input id="chat-input" type="text" placeholder="Ask Compass AI...">
        <button class="primary-action send-action" type="button" data-send-chat ${isCompassResponding ? "disabled" : ""}>Send</button>
      </div>
    </section>
    <section class="quick-card">
      <h3>Memory controls</h3>
      <p class="muted">Compass only uses this chat, your saved AI profile, and uploaded PDFs. It does not invent hidden memory.</p>
      ${uploadedDocumentStatus()}
      <div class="profile-actions">
        <button class="secondary-action" type="button" data-open="compassProfile">Edit AI profile</button>
        <button class="secondary-action" type="button" data-clear-chat>Clear chat</button>
      </div>
    </section>
  `,

  growth: () => `
    <header class="screen-head compact-head growth-head">
      <div>
        <p class="eyebrow">Growth Hub</p>
        <h2 class="screen-title">Personal growth tools connected to your future.</h2>
        <p class="screen-subtitle">Well-being, assessments, goals, vision board, journal, mood tracking, challenges, badges, receipts, and reports stay here.</p>
      </div>
      <div class="avatar"><img src="assets/icon-spark.png" alt=""></div>
    </header>

    <section class="growth-hero-card">
      <div>
        <p class="eyebrow">Your growth map</p>
        <h3>Build independence one honest step at a time.</h3>
        <p>Future Mirror connects to these tools so decisions become goals, reflections, habits, and progress.</p>
      </div>
      ${growthOverviewStats()}
    </section>

    ${blueprintSummaryCard()}

    ${resurfacingCard()}

    ${growthSuggestionCard()}

    ${growthHubSection({
      title: "Goals & Dreams",
      subtitle: "Save the future you are aiming toward.",
      icon: "icon-learn.png",
      tone: "goals-tone",
      items: [
        { title: "Discover Yourself", text: "Build your Personal Blueprint - the foundation for everything else here.", modal: "discoverYourself" },
        { title: "Life Roadmap", text: "Turn a goal into concrete monthly milestones.", modal: "roadmapView" },
        { title: "Personal goals", text: "Write what you want to build.", modal: "growthGoals" },
        { title: "Vision Board", text: "Collect your direction in one place.", modal: "growthGoals" },
        { title: "Dream university", text: "Save your study direction.", modal: "growthGoals" },
        { title: "Dream career", text: "Name the work life you want.", modal: "growthGoals" },
        { title: "Dream lifestyle", text: "Define balance, money, and health.", modal: "growthGoals" },
        { title: "Future Mirror", text: "Simulate decision impact.", tab: "future" },
        { title: "Life Simulator", text: "Explore adult-life choices in 3D.", tab: "simulator" },
        { title: "Opportunity Hub", text: "Find scholarships, internships, and skill paths.", tab: "opportunities" },
        { title: "AI goal planning", text: "Turn dreams into next steps.", prompt: growthPromptFromData("a simple goal plan with one next action") }
      ]
    })}

    ${growthHubSection({
      title: "Reflection",
      subtitle: "Understand mood, thoughts, and daily patterns.",
      icon: "icon-checkin.png",
      tone: "reflection-tone",
      items: [
        { title: "Daily reflection", text: "A 3-minute rotating prompt - mood, stress, growth, or procrastination.", modal: "dailyReflection" },
        { title: "Weekly letter", text: "A short note to you, next week.", modal: "weeklyLetter" },
        { title: "Milestone letter", text: "Write to your future self, further out.", modal: "milestoneLetter" },
        { title: "Daily Check-In", text: "Log today's mood and energy.", modal: "mood" },
        { title: "Mood tracking", text: "Review how you have been feeling.", modal: "mood" },
        { title: "Future Readiness Assessment", text: "Adulthood, decisions, money, resilience.", modal: "assessment" },
        { title: "Well-being check-in", text: "Mental wellness and emotional pressure.", modal: "assessment" },
        { title: "Growth assessment", text: "Self-awareness and future planning.", modal: "assessment" },
        { title: "Journal", text: "Write what happened and what you learned.", modal: "journal" },
        { title: "AI reflection insight", text: "Ask Compass to find one pattern.", prompt: growthPromptFromData("a reflection insight from my real saved data") }
      ]
    })}

    ${growthHubSection({
      title: "Challenges & Badges",
      subtitle: "Small 7-day challenges without childish pressure.",
      icon: "icon-boundary.png",
      tone: "challenge-tone",
      items: [
        { title: "7-Day Confidence Challenge", text: "Practice one brave action.", modal: "challengeHub" },
        { title: "7-Day Study Focus Challenge", text: "Protect one focus block.", modal: "challengeHub" },
        { title: "7-Day Gratitude Challenge", text: "Notice one honest good thing.", modal: "challengeHub" },
        { title: "AI Roleplay Practice", text: "Practice real-life situations safely.", modal: "roleplayList" },
        { title: "Streaks", text: "View simple progress counts.", modal: "badges" },
        { title: "Achievements & Badges", text: "See what you have unlocked.", modal: "badges" }
      ]
    })}

    ${growthHubSection({
      title: "Career Studio",
      subtitle: "Practice for the real thing before it counts.",
      icon: "icon-work.png",
      tone: "career-tone",
      items: [
        { title: "Career Studio", text: "Interview practice, resume builder, and job matching.", modal: "careerStudio" }
      ]
    })}

    ${growthHubSection({
      title: "Progress",
      subtitle: "Review your growth without clutter.",
      icon: "icon-balance.png",
      tone: "progress-tone",
      items: [
        { title: "Weekly AI Report", text: "Summarize this week's real data.", prompt: growthPromptFromData("a short weekly growth report") },
        { title: "Monthly Growth Report", text: "Plan next month's direction.", prompt: growthPromptFromData("a monthly growth report and next focus") },
        { title: "Mood trend", text: "See your latest mood pattern.", modal: "growthProgress" },
        { title: "Goal progress", text: "Review saved dreams and goals.", modal: "growthProgress" },
        { title: "Challenge progress", text: "Check 7-day challenge status.", modal: "growthProgress" },
        { title: "Receipt record", text: "Track what you paid today.", modal: "receipt" },
        { title: "Knowledge Vault", text: "Everything Future Mirror knows about you, in one place.", modal: "knowledgeVault" }
      ]
    })}
  `,

  simulator: () => `
    <section class="life-sim-game" data-life-sim-game>
      <div id="life-sim-root" class="life-sim-root" aria-label="Anime-style 3D Singapore adult-life simulator"></div>

      <div class="life-sim-rotate" aria-hidden="true">
        <strong>Rotate your phone</strong>
        <span>Life Sim is designed for full-screen landscape play.</span>
      </div>

      <header class="life-sim-game-topbar">
        <div>
          <p class="eyebrow">LifeVerse</p>
          <h2>Playable Adult Life Simulator</h2>
        </div>
        <button class="sim-exit-button" type="button" data-tab-jump="home">Exit</button>
      </header>

      ${lifeVerseGameShell()}

      <div class="life-sim-controls-note">
        <strong>Move</strong>
        <span>Joystick / WASD</span>
        <strong>Look</strong>
        <span>Drag right side</span>
      </div>

      <div class="sim-joystick" data-sim-joystick aria-hidden="true">
        <span data-sim-joystick-knob></span>
      </div>

      <div class="sim-look-pad" data-sim-look-pad aria-hidden="true">
        <span>Drag to rotate</span>
      </div>
    </section>
  `,

  opportunities: () => `
    <header class="screen-head compact-head opportunity-head">
      <div>
        <p class="eyebrow">Opportunity Hub</p>
        <h2 class="screen-title">Build your future outside the app.</h2>
        <p class="screen-subtitle">Discover jobs, internships, scholarships, competitions, volunteering, and learn-to-earn paths.</p>
      </div>
      <div class="avatar"><img src="assets/icon-work.png" alt=""></div>
    </header>

    <section class="opportunity-hero-card">
      <div>
        <p class="eyebrow">Future builder</p>
        <h3>Find the next door you can actually open.</h3>
        <p>Save useful options, apply through external links, or ask Compass AI to recommend what fits your age, interests, goals, and career direction.</p>
      </div>
      ${opportunityStats()}
    </section>

    ${opportunityRecommendationCard()}

    <div class="category-tabs opportunity-tabs">
      ${opportunityCategories.map((category) => `
        <button type="button" data-opportunity-category="${escapeHTML(category)}" class="${category === opportunityCategory ? "is-selected" : ""}">${escapeHTML(category)}</button>
      `).join("")}
    </div>

    <div class="content-rail-title"><strong>${escapeHTML(opportunityCategory === "All" ? "All opportunities" : opportunityCategory)}</strong><span>${visibleOpportunities().length} items</span></div>
    <div class="opportunity-feed">${opportunityCards()}</div>

    ${communityOpportunitiesRail()}
  `,

  community: () => (hasCommunitySession() ? communityAuthedScreen() : communityAuthGateScreen()),

  stories: () => `
    <header class="screen-head compact-head inspire-head">
      <div>
        <p class="eyebrow">Inspire Hub</p>
        <h2 class="screen-title">Stories, videos, and lessons that move you.</h2>
        <p class="screen-subtitle">Explore creators, athletes, leaders, entrepreneurs, and people who turned pressure into growth.</p>
      </div>
      <div class="avatar"><img src="assets/icon-stories.png" alt=""></div>
    </header>
    ${isAdmin() ? `<button class="primary-action" type="button" data-open="storyEditor">Add Inspire content</button>` : ""}
    ${storyOfTheDayCard()}
    <div class="inspire-search-row">
      <input id="inspire-search" type="search" placeholder="Search name, topic, category..." value="${escapeHTML(inspireSearch)}">
    </div>
    <div class="category-tabs inspire-tabs">
      ${inspireCategories.map((category) => `
        <button type="button" data-inspire-category="${escapeHTML(category)}" class="${category === inspireCategory ? "is-selected" : ""}">${escapeHTML(category)}</button>
      `).join("")}
    </div>
    ${featuredStoryCard(false)}
    <div class="content-rail-title"><strong>Recommended stories</strong><span>${filteredStories().length} items</span></div>
    <div class="inspire-feed">${storyCards()}</div>
  `,

  settings: () => `
    <header class="screen-head compact-head">
      <div>
        <p class="eyebrow">Profile</p>
        <h2 class="screen-title">Account, guide, and controls</h2>
        <p class="screen-subtitle">Manage your account, understand icons, and access admin permissions.</p>
      </div>
      <div class="avatar">${userInitial()}</div>
    </header>
    <section class="profile-hero">
      <div class="avatar">${userInitial()}</div>
      <div>
        <strong>${displayName()}</strong>
        <p>${escapeHTML(userProfile.email)} - ${escapeHTML(userProfile.role)} role</p>
        <span class="risk-pill warn demo-account-badge">Demo account - saved on this device only</span>
      </div>
    </section>
    <div class="profile-actions">
      <button class="secondary-action" type="button" data-open="username">Edit profile</button>
      <button class="secondary-action" type="button" data-open="guide">Guide / Help</button>
    </div>
    <section class="profile-card">
      <div class="toggle-row"><span>Login method</span><strong>Local demo (not verified)</strong></div>
      <div class="toggle-row"><span>Role permissions</span><strong>${isAdmin() ? "Admin" : "User"}</strong></div>
      <div class="toggle-row"><span>Progress storage</span><strong>This browser only</strong></div>
    </section>
    <section class="profile-card">
      <p class="eyebrow">Compass AI voice</p>
      <div class="voice-choice-grid">
        ${["female", "male", "off"].map((voice) => `
          <label class="check-option">
            <input type="radio" name="voice-preference" value="${voice}" ${userProfile.voicePreference === voice ? "checked" : ""}>
            <span>${voice === "off" ? "Text only" : `${voice} voice`}</span>
          </label>
        `).join("")}
      </div>
      <button class="secondary-action signout-action" type="button" data-save-voice>Save voice preference</button>
    </section>
    <div class="profile-actions">
      <button class="secondary-action" type="button" data-open="supportCircle">Support Circle</button>
      <button class="secondary-action" type="button" data-open="receiptPlan">Receipt Plan</button>
      <button class="secondary-action" type="button" data-open="compassProfile">Compass AI Profile</button>
    </div>
    ${adminStudio()}
    <button class="secondary-action signout-action" type="button" data-sign-out>Sign out</button>
  `
};

const modals = {
  username: () => `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="username-title">
      <div class="modal-top">
        <span class="risk-pill calm">Profile</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="username-title">Edit your profile</h3>
      <div class="username-form">
        <label>Username<input id="profile-username-input" type="text" maxlength="18" value="${escapeHTML(userProfile.username)}"></label>
        <label>Gmail address<input id="profile-email-input" type="email" value="${escapeHTML(userProfile.email)}"></label>
        <p class="form-error" id="profile-username-error" aria-live="polite"></p>
        <button class="primary-action" type="button" data-save-profile>Save profile</button>
      </div>
    </div>
  `,

  compassProfile: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="compass-profile-title">
      <div class="modal-top">
        <span class="risk-pill calm">Compass AI profile</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="compass-profile-title">What Compass may remember</h3>
      <p class="muted">Fill only what you want Compass AI to use. Empty fields are not sent to the AI.</p>
      <div class="admin-form">
        <label>Name<input id="ai-profile-name" type="text" value="${escapeHTML(userProfile.name)}" placeholder="Optional"></label>
        <label>Age group
          <select id="ai-profile-age">
            ${["", "Under 13", "13-15", "16-18", "19-21", "22+"].map((value) => `
              <option value="${escapeHTML(value)}" ${userProfile.ageGroup === value ? "selected" : ""}>${value || "Prefer not to say"}</option>
            `).join("")}
          </select>
        </label>
        <label>Student status
          <select id="ai-profile-student">
            ${["", "Secondary school", "College / university", "Working student", "Working", "Not studying now"].map((value) => `
              <option value="${escapeHTML(value)}" ${userProfile.studentStatus === value ? "selected" : ""}>${value || "Prefer not to say"}</option>
            `).join("")}
          </select>
        </label>
        <label>Goals<textarea id="ai-profile-goals" placeholder="Example: improve study routine, save money, manage stress">${escapeHTML(userProfile.goals)}</textarea></label>
        <label>Interests<textarea id="ai-profile-interests" placeholder="Example: design, football, music, coding">${escapeHTML(userProfile.interests)}</textarea></label>
        <label>Stress triggers<textarea id="ai-profile-stress" placeholder="Example: exams, family conflict, money pressure">${escapeHTML(userProfile.stressTriggers)}</textarea></label>
        <label>Preferred support style<textarea id="ai-profile-support" placeholder="Example: short steps, gentle encouragement, direct advice">${escapeHTML(userProfile.supportStyle)}</textarea></label>
        <p class="tiny-note">Compass AI will not assume anything from empty fields.</p>
      </div>
      <button class="primary-action" type="button" data-save-ai-profile>Save AI profile</button>
    </div>
  `,

  assessment: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="assessment-title">
      <div class="modal-top">
        <span class="risk-pill calm">Future Readiness Assessment</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="assessment-title">Understand where you are today and prepare for the future you want.</h3>
      <p class="muted">This is not a personality test. It helps you reflect on adulthood readiness, decisions, money, resilience, relationships, independence, and future planning.</p>
      <div class="assessment-progress">
        <span>Step ${assessmentStep + 1} of ${assessmentItems.length + 2}</span>
        <i><b style="width:${Math.round(((assessmentStep + 1) / (assessmentItems.length + 2)) * 100)}%"></b></i>
      </div>
      <div class="assessment-form">
        ${assessmentItems.map((item, index) => `
          <section class="assessment-item ${assessmentStep === index ? "is-active" : ""}" data-assessment-step="${index}">
            <strong>${index + 1}. ${escapeHTML(item.text)}</strong>
            <p>${escapeHTML(item.domain)} category${item.legacyDomain ? ` - adapted from ${escapeHTML(item.legacyDomain)} check-in` : ""}</p>
            <div class="scale-grid">
              ${(item.options || responseOptions).map((option) => `
                <label class="scale-option">
                  <input type="radio" name="assessment-${item.id}" value="${option.value}" ${Number(assessmentDraft.answers[item.id] ?? 0) === option.value ? "checked" : ""}>
                  <span>${option.label}</span>
                </label>
              `).join("")}
            </div>
          </section>
        `).join("")}
        <section class="assessment-item ${assessmentStep === assessmentItems.length ? "is-active" : ""}" data-assessment-step="${assessmentItems.length}">
          <strong>${assessmentItems.length + 1}. What future-readiness challenge do you want to understand better?</strong>
          <textarea id="assessment-free-text" placeholder="Example: I want to save money but I keep spending when I feel stressed.">${escapeHTML(assessmentDraft.freeText || "")}</textarea>
        </section>
        <section class="assessment-item ${assessmentStep === assessmentItems.length + 1 ? "is-active" : ""}" data-assessment-step="${assessmentItems.length + 1}">
          <strong>${assessmentItems.length + 2}. Which future-building patterns do you want to strengthen?</strong>
          <p>Choose any that fit. This helps Compass make the readiness insight more practical.</p>
          <div class="option-grid">
            ${[
              ["plan", "Planning before acting"],
              ["people", "Communicating clearly"],
              ["logic", "Thinking through consequences"],
              ["creative", "Trying small experiments"],
              ["quiet", "Reflecting before reacting"],
              ["action", "Following through"]
            ].map(([value, label]) => `
              <label class="check-option">
                <input type="checkbox" name="assessment-preference" value="${value}" ${(assessmentDraft.preferences || []).includes(value) ? "checked" : ""}>
                <span>${label}</span>
              </label>
            `).join("")}
          </div>
        </section>
      </div>
      <div class="assessment-footer">
        <button class="secondary-action" type="button" data-prev-assessment ${assessmentStep === 0 ? "disabled" : ""}>Back</button>
        ${assessmentStep < assessmentItems.length + 1
          ? `<button class="primary-action" type="button" data-next-assessment>Next</button>`
          : `<button class="primary-action" type="button" data-submit-assessment>Generate Future Readiness Score</button>`}
      </div>
    </div>
  `,

  discoverYourself: () => {
    const session = BLUEPRINT_SESSIONS.find((item) => item.id === blueprintActiveSession) || BLUEPRINT_SESSIONS[0];
    const existing = latestBlueprint();
    return `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="discover-yourself-title">
      <div class="modal-top">
        <span class="risk-pill calm">Discover Yourself</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="discover-yourself-title">${escapeHTML(session.title)}</h3>
      <p class="muted">This builds your Personal Blueprint - the foundation Future Self, Decision Compass, Roadmap, and AI Coach all read from. Short sessions, not one long form.</p>
      <div class="assessment-progress">
        <span>Session ${blueprintActiveSession} of ${BLUEPRINT_SESSIONS.length}</span>
        <i><b style="width:${Math.round((blueprintActiveSession / BLUEPRINT_SESSIONS.length) * 100)}%"></b></i>
      </div>
      <div class="assessment-form">
        ${blueprintActiveSession === 1 ? `
          <section class="assessment-item is-active">
            <strong>1. Pick up to 3 values that matter most to you right now</strong>
            <div class="option-grid">
              ${BLUEPRINT_VALUE_OPTIONS.map((value) => `
                <label class="check-option">
                  <input type="checkbox" name="blueprint-value" value="${escapeHTML(value)}" ${blueprintDraft.values.includes(value) ? "checked" : ""}>
                  <span>${escapeHTML(value)}</span>
                </label>
              `).join("")}
            </div>
          </section>
          <section class="assessment-item is-active">
            <strong>2. ${escapeHTML(BLUEPRINT_PERSONALITY_SCENARIO.question)}</strong>
            <div class="scale-grid">
              ${BLUEPRINT_PERSONALITY_SCENARIO.options.map((option) => `
                <label class="scale-option">
                  <input type="radio" name="blueprint-personality" value="${escapeHTML(option.value)}" ${blueprintDraft.personalityChoice === option.value ? "checked" : ""}>
                  <span>${escapeHTML(option.label)}</span>
                </label>
              `).join("")}
            </div>
          </section>
        ` : ""}
        ${blueprintActiveSession === 2 ? `
          <section class="assessment-item is-active">
            <strong>1. Pick up to 3 strengths that fit you</strong>
            <div class="option-grid">
              ${BLUEPRINT_STRENGTH_OPTIONS.map((value) => `
                <label class="check-option">
                  <input type="checkbox" name="blueprint-strength" value="${escapeHTML(value)}" ${blueprintDraft.strengths.includes(value) ? "checked" : ""}>
                  <span>${escapeHTML(value)}</span>
                </label>
              `).join("")}
            </div>
            <textarea id="blueprint-strength-other" placeholder="Anything else? (optional)">${escapeHTML(blueprintDraft.strengthsOther || "")}</textarea>
          </section>
          <section class="assessment-item is-active">
            <strong>2. ${escapeHTML(BLUEPRINT_MOTIVATION_SCENARIO.question)}</strong>
            <div class="scale-grid">
              ${BLUEPRINT_MOTIVATION_SCENARIO.options.map((option) => `
                <label class="scale-option">
                  <input type="radio" name="blueprint-motivation" value="${escapeHTML(option.value)}" ${blueprintDraft.motivationChoice === option.value ? "checked" : ""}>
                  <span>${escapeHTML(option.label)}</span>
                </label>
              `).join("")}
            </div>
          </section>
        ` : ""}
        ${blueprintActiveSession === 3 ? `
          <section class="assessment-item is-active">
            <strong>1. ${escapeHTML(BLUEPRINT_LEARNING_SCENARIO.question)}</strong>
            <div class="scale-grid">
              ${BLUEPRINT_LEARNING_SCENARIO.options.map((option) => `
                <label class="scale-option">
                  <input type="radio" name="blueprint-learning" value="${escapeHTML(option.value)}" ${blueprintDraft.learningChoice === option.value ? "checked" : ""}>
                  <span>${escapeHTML(option.label)}</span>
                </label>
              `).join("")}
            </div>
          </section>
          <section class="assessment-item is-active">
            <strong>2. ${escapeHTML(BLUEPRINT_WORK_SCENARIO.question)}</strong>
            <div class="scale-grid">
              ${BLUEPRINT_WORK_SCENARIO.options.map((option) => `
                <label class="scale-option">
                  <input type="radio" name="blueprint-work" value="${escapeHTML(option.value)}" ${blueprintDraft.workChoice === option.value ? "checked" : ""}>
                  <span>${escapeHTML(option.label)}</span>
                </label>
              `).join("")}
            </div>
          </section>
          <section class="assessment-item is-active">
            <strong>3. ${escapeHTML(BLUEPRINT_DECISION_SCENARIO.question)}</strong>
            <div class="scale-grid">
              ${BLUEPRINT_DECISION_SCENARIO.options.map((option) => `
                <label class="scale-option">
                  <input type="radio" name="blueprint-decision" value="${escapeHTML(option.value)}" ${blueprintDraft.decisionChoice === option.value ? "checked" : ""}>
                  <span>${escapeHTML(option.label)}</span>
                </label>
              `).join("")}
            </div>
          </section>
        ` : ""}
      </div>
      <div class="assessment-footer">
        <button class="secondary-action" type="button" data-prev-blueprint-session ${blueprintActiveSession === 1 ? "disabled" : ""}>Back</button>
        <button class="primary-action" type="button" data-save-blueprint-session="${blueprintActiveSession}">${blueprintActiveSession < BLUEPRINT_SESSIONS.length ? "Save & continue" : "Save Blueprint"}</button>
      </div>
      ${existing ? `<p class="tiny-note">Blueprint v${existing.version} saved ${escapeHTML(existing.versionedAt)}. Saving again creates a new version - your history is kept, not overwritten.</p>` : ""}
    </div>
  `;
  },

  futureSelfView: () => {
    const blueprint = latestBlueprint();
    const snapshot = latestFutureSelfSnapshot(futureSelfActiveHorizon);
    const previous = snapshot && snapshot.previousSnapshotId
      ? trackerState.futureSelfSnapshots.find((item) => item.id === snapshot.previousSnapshotId)
      : null;
    return `
    <div class="modal-card assessment-modal future-self-modal" role="dialog" aria-modal="true" aria-labelledby="future-self-title">
      <div class="modal-top">
        <span class="risk-pill calm">Future Self</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="future-self-title">Not a prediction - a vivid look at where this path may lead.</h3>
      ${!blueprint ? `
        <p class="muted">Future Self needs your Personal Blueprint to be meaningful rather than generic.</p>
        <button class="primary-action" type="button" data-close-and-open="discoverYourself">Start Discover Yourself</button>
      ` : `
        <div class="mirror-example-row">
          ${FUTURE_SELF_HORIZONS.map((option) => `<button type="button" class="${futureSelfActiveHorizon === option.value ? "is-selected" : ""}" data-future-self-horizon="${escapeHTML(option.value)}">${escapeHTML(option.label)}</button>`).join("")}
        </div>
        ${isFutureSelfLoading ? `
          <section class="mirror-loading-card">
            <p class="eyebrow">Future Self is imagining</p>
            <h3>Writing a scene from this path...</h3>
            <div class="mirror-loading-dots"><i></i><i></i><i></i></div>
          </section>
        ` : futureSelfError ? `
          <section class="mirror-error-card"><h3>${escapeHTML(futureSelfError)}</h3></section>
        ` : snapshot ? `
          <section class="future-letter-card">
            <p class="eyebrow">${escapeHTML((FUTURE_SELF_HORIZONS.find((item) => item.value === snapshot.horizon) || {}).label || snapshot.horizon)} - based on Blueprint v${snapshot.basedOnBlueprintVersion}</p>
            <p>${escapeHTML(snapshot.narrative)}</p>
            <p class="tiny-note">${escapeHTML(snapshot.confidenceNote)}</p>
          </section>
          <div class="mirror-list-grid future-self-domains">
            ${Object.entries(snapshot.domains).map(([key, value]) => `
              <div><strong>${escapeHTML(key.charAt(0).toUpperCase() + key.slice(1))}</strong><p>${escapeHTML(value)}</p></div>
            `).join("")}
          </div>
          ${previous ? `
            <section class="future-reflection-list">
              <div class="section-row"><div><p class="eyebrow">Since your last snapshot</p><h3>${escapeHTML(previous.displayTime)}</h3></div></div>
              <p class="muted">${escapeHTML(previous.narrative)}</p>
            </section>
          ` : ""}
          <button class="secondary-action compact-action" type="button" data-open="milestoneLetter">Write to this future self</button>
        ` : `
          <section class="mirror-empty-card"><p>Pick a horizon and generate your first snapshot.</p></section>
        `}
        <button class="primary-action mirror-run-action" type="button" data-generate-future-self="${escapeHTML(futureSelfActiveHorizon)}" ${isFutureSelfLoading ? "disabled" : ""}>${snapshot ? "Regenerate this snapshot" : "Generate my Future Self"}</button>
      `}
    </div>
  `;
  },

  dailyReflection: () => {
    const prompt = DAILY_REFLECTION_PROMPTS[dailyReflectionPromptIndex % DAILY_REFLECTION_PROMPTS.length];
    return `
    <div class="modal-card dark-modal" role="dialog" aria-modal="true" aria-labelledby="daily-reflection-title">
      <div class="modal-top">
        <span class="risk-pill light">Daily reflection - 3 minutes</span>
        <button class="ghost-circle light" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="daily-reflection-title">${escapeHTML(prompt.label)}</h3>
      <textarea id="daily-reflection-text" placeholder="A few honest sentences is enough."></textarea>
      <button class="primary-action mint-action" type="button" data-save-daily-reflection="${escapeHTML(prompt.id)}">Save reflection</button>
    </div>
  `;
  },

  weeklyLetter: () => `
    <div class="modal-card dark-modal" role="dialog" aria-modal="true" aria-labelledby="weekly-letter-title">
      <div class="modal-top">
        <span class="risk-pill light">Weekly letter</span>
        <button class="ghost-circle light" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="weekly-letter-title">Write a short note to you, next week</h3>
      <p class="muted">Lower effort than a journal entry, higher frequency than a milestone letter. It'll resurface in about 2 weeks.</p>
      <textarea id="weekly-letter-text" placeholder="Dear next-week me, right now I'm..."></textarea>
      <button class="primary-action mint-action" type="button" data-save-weekly-letter>Send to next week</button>
    </div>
  `,

  milestoneLetter: () => `
    <div class="modal-card dark-modal" role="dialog" aria-modal="true" aria-labelledby="milestone-letter-title">
      <div class="modal-top">
        <span class="risk-pill light">Milestone letter</span>
        <button class="ghost-circle light" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="milestone-letter-title">Write to your future self, further out</h3>
      <p class="muted">Lower frequency, higher emotional weight - this resurfaces in about 3 months.</p>
      <textarea id="milestone-letter-text" placeholder="Dear future me..."></textarea>
      <button class="primary-action mint-action" type="button" data-save-milestone-letter>Save milestone letter</button>
    </div>
  `,

  roadmapView: () => `
    <div class="modal-card assessment-modal future-self-modal" role="dialog" aria-modal="true" aria-labelledby="roadmap-title">
      <div class="modal-top">
        <span class="risk-pill calm">Life Roadmap</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="roadmap-title">Turn a goal into concrete monthly steps</h3>
      <div class="admin-form">
        <label>Goal<input id="roadmap-goal-title" type="text" placeholder="Example: Land a junior design role"></label>
        <label>Horizon
          <select id="roadmap-goal-horizon">
            ${ROADMAP_HORIZONS.map((option) => `<option value="${escapeHTML(option.value)}">${escapeHTML(option.label)}</option>`).join("")}
          </select>
        </label>
      </div>
      <button class="primary-action mirror-run-action" type="button" data-generate-roadmap ${isRoadmapLoading ? "disabled" : ""}>${isRoadmapLoading ? "Breaking it down..." : "Generate roadmap"}</button>
      ${roadmapError ? `<p class="form-error">${escapeHTML(roadmapError)}</p>` : ""}
      ${milestoneJustCompleted ? `
        <section class="mirror-empty-card">
          <p class="eyebrow">Milestone reached</p>
          <h3>"${escapeHTML(milestoneJustCompleted.milestoneTitle)}" - want to reflect on it?</h3>
          <textarea id="milestone-reflection-note" placeholder="Optional - what made this happen, what's next?"></textarea>
          <button class="secondary-action compact-action" type="button" data-reflect-on-milestone data-milestone-title-value="${escapeHTML(milestoneJustCompleted.milestoneTitle)}" data-goal-title-value="${escapeHTML(milestoneJustCompleted.goalTitle)}">Save reflection</button>
          ${hasCommunitySession()
            ? `<button class="secondary-action compact-action" type="button" data-share-milestone-community data-milestone-title-value="${escapeHTML(milestoneJustCompleted.milestoneTitle)}" data-goal-title-value="${escapeHTML(milestoneJustCompleted.goalTitle)}">Share to Community</button>`
            : `<button class="secondary-action compact-action" type="button" data-tab-jump="community">Sign in to Community to share this</button>`}
        </section>
      ` : ""}
      <div class="mirror-example-row mode-toggle-row">
        <button type="button" class="${roadmapView === "timeline" ? "is-selected" : ""}" data-roadmap-view="timeline">Timeline</button>
        <button type="button" class="${roadmapView === "calendar" ? "is-selected" : ""}" data-roadmap-view="calendar">Calendar</button>
        <button type="button" class="${roadmapView === "longHorizon" ? "is-selected" : ""}" data-roadmap-view="longHorizon">Long-horizon</button>
      </div>
      <div class="future-reflection-list">
        ${roadmapView === "calendar" ? roadmapCalendarView() : roadmapView === "longHorizon" ? roadmapLongHorizonView() : roadmapTimelineView()}
      </div>
    </div>
  `,

  futureScanStation: (stationId) => {
    const station = FUTURE_SCAN_STATIONS.find((item) => item.id === stationId);
    if (!station || !activeFutureScan) {
      return `
        <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="future-scan-station-title">
          <div class="modal-top">
            <span class="risk-pill calm">Future Scan</span>
            <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
          </div>
          <h3 id="future-scan-station-title">Start a Future Scan first</h3>
        </div>
      `;
    }
    const body = {
      identityScan: futureScanIdentityView,
      valuesCheck: futureScanValuesView,
      hiddenCosts: futureScanHiddenCostsView,
      noActionFuture: futureScanNoActionView,
      pressureTest: futureScanPressureView,
      conflictMap: futureScanConflictView,
      signalRadar: futureScanSignalView,
      pastSelfCheck: futureScanPastSelfView,
      driftDetector: futureScanDriftView,
      checkBack: futureScanCheckBackView
    }[stationId];
    return `
      <div class="modal-card assessment-modal future-self-modal" role="dialog" aria-modal="true" aria-labelledby="future-scan-station-title">
        <div class="modal-top">
          <span class="risk-pill calm">Future Scan</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="future-scan-station-title">${escapeHTML(station.title)}</h3>
        <p class="muted">${escapeHTML(station.blurb)}</p>
        ${body ? body() : `<p class="muted">This station is coming soon.</p>`}
      </div>
    `;
  },

  pastFutureScans: () => {
    const scans = myFutureScans();
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="past-scans-title">
        <div class="modal-top">
          <span class="risk-pill calm">Future Scan</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="past-scans-title">Your past scans</h3>
        ${scans.length ? `
          <div class="future-reflection-list">
            ${scans.map((scan) => `
              <article class="future-reflection-item">
                <div>
                  <strong>${escapeHTML(cleanText(scan.scanContext.rawInput, 100))}</strong>
                  <p>${Object.keys(scan.stations || {}).length} station(s) done${scan.synthesis ? " - synthesis generated" : ""}</p>
                  <small>${escapeHTML(new Date(scan.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}</small>
                </div>
                <div class="profile-actions">
                  <button class="secondary-action compact-action" type="button" data-open-past-scan="${escapeHTML(scan.id)}">Open</button>
                </div>
              </article>
            `).join("")}
          </div>
        ` : `<p class="muted">No past scans yet.</p>`}
      </div>
    `;
  },

  buildEntry: (entryId) => buildEntryModal(entryId),
  buildTraining: (sessionId) => buildTrainingModal(sessionId),

  knowledgeVault: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="knowledge-vault-title">
      <div class="modal-top">
        <span class="risk-pill calm">Knowledge Vault</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="knowledge-vault-title">Everything Future Mirror knows about you</h3>
      <p class="muted">One place to see it all - nothing here is stored separately, it's the same data from each module below.</p>
      <div class="opportunity-stat-row">
        ${knowledgeVaultStats().map((stat) => `<span><strong>${stat.count}</strong>${escapeHTML(stat.label)}</span>`).join("")}
      </div>
      <div class="vault-section"><h4>Personal Blueprint</h4>${knowledgeVaultBlueprintSection()}</div>
      <div class="vault-section"><h4>Future Self</h4>${knowledgeVaultFutureSelfSection()}</div>
      <div class="vault-section"><h4>Reflections & Decision Journal</h4>${knowledgeVaultReflectionSection()}</div>
      <div class="vault-section"><h4>Life Roadmap</h4>${knowledgeVaultRoadmapSection()}</div>
      <div class="vault-section"><h4>Career Studio</h4>${knowledgeVaultCareerSection()}</div>
      <button class="secondary-action compact-action" type="button" data-export-vault>Download my data (.txt)</button>
    </div>
  `,

  careerStudio: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="career-studio-title">
      <div class="modal-top">
        <span class="risk-pill calm">Career Studio</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="career-studio-title">Practice for the real thing</h3>
      <p class="muted">Three tools that work together - practice how you sound, write what you've done, and see which roles fit your Blueprint.</p>
      <div class="action-stack">
        <button class="wide-action" type="button" data-open="interviewPractice">
          <img src="assets/icon-boundary.png" alt="">
          <span><strong>Interview Practice</strong><small>Timed mock interviews with 3 realistic interviewer styles.</small></span>
        </button>
        <button class="wide-action" type="button" data-open="resumeBuilder">
          <img src="assets/icon-work.png" alt="">
          <span><strong>Resume Builder</strong><small>Write your real experience - AI cleans up wording, never invents facts.</small></span>
        </button>
        <button class="wide-action" type="button" data-open="jobMatching">
          <img src="assets/icon-learn.png" alt="">
          <span><strong>Job Matching</strong><small>See which role archetypes fit your saved Personal Blueprint.</small></span>
        </button>
      </div>
    </div>
  `,

  resumeBuilder: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="resume-builder-title">
      <div class="modal-top">
        <span class="risk-pill calm">Resume Builder</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="resume-builder-title">Build your resume</h3>
      <p class="muted">Write your real experience and education in your own words - Compass AI cleans up the wording and structure, without inventing anything you didn't provide.</p>
      <div class="admin-form">
        ${resumeBuilderView()}
      </div>
    </div>
  `,

  jobMatching: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="job-matching-title">
      <div class="modal-top">
        <span class="risk-pill calm">Job Matching</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="job-matching-title">Role fit, based on your Blueprint</h3>
      ${jobMatchingView()}
    </div>
  `,

  interviewPractice: () => {
    const session = activeInterviewSession();
    if (!session) {
      return `
        <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="interview-title">
          <div class="modal-top">
            <span class="risk-pill calm">Interview Practice</span>
            <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
          </div>
          <h3 id="interview-title">Pick an interviewer style</h3>
          <p class="muted">Each persona genuinely questions differently - not one generic interviewer.</p>
          <div class="action-stack">${interviewPersonaPicker()}</div>
        </div>
      `;
    }
    const persona = INTERVIEW_PERSONAS.find((item) => item.id === session.persona) || INTERVIEW_PERSONAS[0];
    const isDone = Boolean(session.completedAt);
    return `
      <div class="modal-card assessment-modal roleplay-card" role="dialog" aria-modal="true" aria-labelledby="interview-chat-title">
        <div class="modal-top">
          <span class="risk-pill calm">${escapeHTML(persona.label)}</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="interview-chat-title">Interview Practice</h3>
        <section class="chat-room roleplay-room">
          <div class="chat-messages">
            ${session.transcript.map((turn) => `
              <div class="chat-bubble ${turn.sender === "candidate" ? "is-user" : "is-ai"}">
                <span>${turn.sender === "candidate" ? displayName() : persona.label}</span>
                <p>${escapeHTML(turn.text)}</p>
              </div>
            `).join("")}
            ${isInterviewLoading ? `<span class="typing-dot">Interviewer is thinking...</span>` : ""}
          </div>
          ${!isDone ? `
            <div class="chat-input-row">
              <input id="interview-answer-input" type="text" placeholder="Type your answer...">
              <button class="primary-action send-action" type="button" data-send-interview-answer ${isInterviewLoading ? "disabled" : ""}>Send</button>
            </div>
          ` : ""}
        </section>
        ${interviewError ? `<p class="form-error">${escapeHTML(interviewError)}</p>` : ""}
        ${isDone ? `
          <div class="advice-stack">
            <h3>Feedback on this interview</h3>
            ${session.feedback.length ? session.feedback.map((item) => `
              <div><strong>${escapeHTML(item.momentRef)}</strong><span>${escapeHTML(item.observation)} ${escapeHTML(item.suggestion)}</span></div>
            `).join("") : `<div><strong>Overall</strong><span>Feedback is being generated - if this stays empty, try finishing the interview again.</span></div>`}
          </div>
          <button class="secondary-action" type="button" data-close>Done</button>
        ` : ""}
      </div>
    `;
  },

  assessmentResult: () => {
    const result = trackerState.assessment;
    const insights = result && result.aiInsights ? result.aiInsights : {};
    if (!result) {
      return `
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="assessment-empty-title">
          <div class="modal-top">
            <span class="risk-pill calm">Future Readiness</span>
            <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
          </div>
          <h3 id="assessment-empty-title">No Future Readiness Assessment yet</h3>
          <p class="muted">Complete the readiness assessment first to understand where you are today and prepare for the future you want.</p>
          <button class="primary-action" type="button" data-open="assessment">Start assessment</button>
        </div>
      `;
    }
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="assessment-result-title">
        <div class="modal-top">
          <span class="risk-pill calm">Future Readiness Result</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="assessment-result-title">ðŸ”® Future Readiness Score</h3>
        <p class="muted">${escapeHTML(result.summary)}</p>
        <div class="wellbeing-output">
          <div class="wellbeing-ring" style="--score:${result.score}">
            <strong>${result.score}</strong>
            <span>${escapeHTML(result.level)}</span>
          </div>
          <div class="output-copy">
            <p class="eyebrow">${escapeHTML(result.updatedAt || "Latest result")}</p>
            <h4>${escapeHTML(result.headline)}</h4>
            <p>${escapeHTML(result.nextStep)}</p>
          </div>
        </div>
        <section class="readiness-breakdown-card">
          <p class="eyebrow">Category breakdown</p>
          <div class="struggle-map readiness-map">${assessmentRows(result)}</div>
        </section>
        <p class="eyebrow readiness-insight-title">Compass AI insights</p>
        <section class="readiness-insight-grid">
          <article>
            <strong>Strengths</strong>
            <p>${escapeHTML(insights.strengths || "You have readiness signals that can become stronger with practice.")}</p>
          </article>
          <article>
            <strong>Growth Areas</strong>
            <p>${escapeHTML(insights.growthAreas || "Choose one category and build a small weekly habit.")}</p>
          </article>
          <article>
            <strong>Future Reflection</strong>
            <p>${escapeHTML(insights.futureReflection || "Small choices today can create more freedom and confidence in your future.")}</p>
          </article>
        </section>
        <div class="profile-actions">
          <button class="primary-action" type="button" data-explore-readiness-future>Explore My Future</button>
          <button class="secondary-action" type="button" data-readiness-ai>Discuss with Compass AI</button>
          <button class="secondary-action" type="button" data-open="assessment">Retake assessment</button>
        </div>
        <p class="tiny-note">This is future-readiness guidance, not a diagnosis or prediction. If there is immediate danger, contact local emergency services or a trusted adult now.</p>
      </div>
    `;
  },

  mood: () => `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="mood-title">
      <div class="modal-top">
        <span class="risk-pill calm">Mood tracker</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="mood-title">How are you feeling today?</h3>
      <div class="mood-choice-grid">
        ${["Calm", "Okay", "Tired", "Stressed"].map((label) => `
          <button class="mood-choice ${trackerState.mood.label === label ? "is-selected" : ""}" type="button" data-mood-choice="${label}">
            <img src="assets/icon-mood.png" alt=""><span>${label}</span>
          </button>
        `).join("")}
      </div>
      <div class="slider-row"><span>Energy</span><input id="mood-score" type="range" min="0" max="100" value="${trackerState.mood.score}"></div>
      <textarea id="mood-note" aria-label="Mood note">${escapeHTML(trackerState.mood.note)}</textarea>
      <button class="primary-action" type="button" data-save-mood>Save mood</button>
    </div>
  `,

  receipt: () => `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
      <div class="modal-top">
        <span class="risk-pill">Receipt auto record</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="receipt-title">Record what you paid today</h3>
      <p class="muted">Upload or scan a receipt, confirm the total, and Compass adds it to today's spending.</p>
      <label class="upload-box">
        <img src="assets/icon-receipt.png" alt="">
        <span>Receipt image</span>
        <input id="receipt-file" type="file" accept="image/*">
      </label>
      <button class="secondary-action" type="button" data-demo-receipt>Auto read demo receipt</button>
      <div class="receipt-form">
        <label>Merchant<input id="receipt-merchant" type="text" value="Campus bookstore"></label>
        <label>Amount paid<input id="receipt-amount" type="number" min="0" step="0.01" value="18.90"></label>
        <label>Category<select id="receipt-category"><option>Food</option><option selected>Study</option><option>Transport</option><option>Health</option><option>Other</option></select></label>
        <label>Payment method<select id="receipt-method"><option>E-wallet</option><option selected>Card</option><option>Cash</option></select></label>
      </div>
      <button class="primary-action" type="button" data-save-receipt>Record payment</button>
    </div>
  `,

  supportCircle: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="support-title">
      <div class="modal-top">
        <span class="risk-pill calm">Support Circle</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="support-title">Trusted people</h3>
      <p class="muted">Save people you can contact when stress, safety, or decisions feel heavy.</p>
      <button class="primary-action" type="button" data-open="supportEditor">Add trusted person</button>
      <div class="support-contact-list">${supportContactCards()}</div>
    </div>
  `,

  supportEditor: (id) => {
    const contact = trackerState.supportContacts.find((item) => item.id === id) || {
      id: "",
      name: "",
      relationship: "Friend",
      phone: "",
      preferred_contact_method: "SMS",
      note: ""
    };
    return `
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="support-editor-title">
        <div class="modal-top">
          <span class="risk-pill calm">Support contact</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="support-editor-title">${contact.id ? "Edit contact" : "Add trusted person"}</h3>
        <div class="admin-form">
          <input id="contact-id" type="hidden" value="${escapeHTML(contact.id)}">
          <label>Name<input id="contact-name" type="text" value="${escapeHTML(contact.name)}"></label>
          <label>Relationship
            <select id="contact-relationship">
              ${["Friend", "Parent / Guardian", "Teacher", "Counsellor", "Emergency Contact"].map((type) => `<option ${contact.relationship === type ? "selected" : ""}>${type}</option>`).join("")}
            </select>
          </label>
          <label>Phone or message ID<input id="contact-phone" type="text" value="${escapeHTML(contact.phone)}" placeholder="+60123456789"></label>
          <label>Preferred method
            <select id="contact-method">
              ${["SMS", "WhatsApp", "Phone", "Copy details"].map((method) => `<option ${contact.preferred_contact_method === method ? "selected" : ""}>${method}</option>`).join("")}
            </select>
          </label>
          <label>Optional note<textarea id="contact-note">${escapeHTML(contact.note)}</textarea></label>
          <p class="form-error" id="contact-error" aria-live="polite"></p>
        </div>
        <button class="primary-action" type="button" data-save-contact>Save contact</button>
      </div>
    `;
  },

  roleplayList: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="roleplay-title">
      <div class="modal-top">
        <span class="risk-pill calm">AI Roleplay Practice</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="roleplay-title">Practice real-life situations</h3>
      <p class="muted">Compass AI plays the other person. Keep it safe, short, and realistic.</p>
      <div class="action-stack">${roleplayScenarioCards()}</div>
    </div>
  `,

  roleplayChat: () => {
    const session = activeRoleplaySession();
    if (!session) return modals.roleplayList();
    const scenario = roleplayScenarios.find((item) => item.id === session.scenario_type);
    return `
      <div class="modal-card assessment-modal roleplay-card" role="dialog" aria-modal="true" aria-labelledby="roleplay-chat-title">
        <div class="modal-top">
          <span class="risk-pill calm">Roleplay</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <div class="roleplay-character-row">
          <img class="roleplay-portrait" src="${PORTRAITS.event.src}" alt="${escapeHTML(PORTRAITS.event.label)}">
          <div class="roleplay-character-info">
            <span class="roleplay-character-name">${escapeHTML(PORTRAITS.event.label)}</span>
            <h3 id="roleplay-chat-title">${escapeHTML(scenario ? scenario.title : "Practice")}</h3>
          </div>
        </div>
        <section class="chat-room roleplay-room">
          <div class="chat-messages">${roleplayMessages(session)}<span class="typing-dot" id="roleplay-loading" hidden>Compass is thinking...</span></div>
          <div class="chat-input-row">
            <input id="roleplay-input" type="text" placeholder="Type your reply...">
            <button class="primary-action send-action" type="button" data-send-roleplay>Send</button>
          </div>
        </section>
        <button class="secondary-action signout-action" type="button" data-finish-roleplay>Finish Practice</button>
      </div>
    `;
  },

  roleplayReflection: () => {
    const session = activeRoleplaySession();
    const reflection = session ? roleplayReflection(session) : { wentWell: "You practiced.", improve: "Try again with one specific detail.", nextStep: "Choose another scenario." };
    return `
      <div class="modal-card roleplay-card" role="dialog" aria-modal="true" aria-labelledby="roleplay-reflection-title">
        <div class="modal-top">
          <span class="risk-pill calm">Practice reflection</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <div class="roleplay-character-row">
          <img class="roleplay-portrait" src="${PORTRAITS.event.src}" alt="${escapeHTML(PORTRAITS.event.label)}">
          <div class="roleplay-character-info">
            <span class="roleplay-character-name">${escapeHTML(PORTRAITS.event.label)}</span>
          </div>
        </div>
        <h3 id="roleplay-reflection-title">You finished the practice</h3>
        <div class="advice-stack">
          <div><strong>What went well</strong><span>${escapeHTML(reflection.wentWell)}</span></div>
          <div><strong>One thing to improve</strong><span>${escapeHTML(reflection.improve)}</span></div>
          <div><strong>Suggested next step</strong><span>${escapeHTML(reflection.nextStep)}</span></div>
        </div>
        <button class="primary-action" type="button" data-close>Done</button>
      </div>
    `;
  },

  moodGuidance: () => {
    const suggestion = trackerState.moodSuggestion || generateMoodSuggestion(trackerState.mood.label, trackerState.mood.score, trackerState.mood.note);
    return `
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="mood-guidance-title">
        <div class="modal-top">
          <span class="risk-pill calm">Personal guidance</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="mood-guidance-title">${escapeHTML(suggestion.title)}</h3>
        <p class="muted">${escapeHTML(suggestion.summary)}</p>
        <div class="support-note"><strong>${escapeHTML(suggestion.technique)}</strong><p>${escapeHTML(suggestion.detail)}</p></div>
      </div>
    `;
  },

  receiptPlan: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-plan-title">
      <div class="modal-top">
        <span class="risk-pill">Receipt plan</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="receipt-plan-title">Receipt Record improvement plan</h3>
      <div class="advice-stack">
        <div><strong>1. Spending categories</strong><span>Auto-group needs, wants, transport, food, study, and health.</span></div>
        <div><strong>2. Weekly insight</strong><span>Show where money went and one realistic adjustment.</span></div>
        <div><strong>3. Budget guardrails</strong><span>Warn gently when transport or food money may be at risk.</span></div>
        <div><strong>4. Receipt OCR later</strong><span>Connect real image reading when backend services are available.</span></div>
      </div>
    </div>
  `,

  guide: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <div class="modal-top">
        <span class="risk-pill calm">Guide / Help</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="guide-title">How to use Compass</h3>
      <div class="guide-list">
        ${[
          ["icon-home.png", "Home", "A quick dashboard of the main features."],
          ["icon-spark.png", "Future Mirror", "Compare possible impacts of today's choices. It is a simulator, not a prediction tool."],
          ["icon-learn.png", "Growth", "Well-being, assessments, goals, vision board, journal, mood tracking, challenges, badges, and reports."],
          ["icon-stories.png", "Inspire Hub", "Read successful people stories and use AI Reflection to apply lessons realistically."],
          ["icon-support.png", "Community", "Join growth communities, goal groups, partner matching, and anonymous support."],
          ["icon-work.png", "Opportunity Hub", "Explore scholarships, internships, competitions, volunteering, and learn-and-earn resources."],
          ["icon-balance.png", "Life Sim", "Play the anime-style adult-life simulator, choose daily activities, and fast-forward consequences."],
          ["icon-chat.png", "Compass AI", "Discuss decisions, story lessons, reality checks, and action plans."],
          ["icon-support.png", "Support Circle", "Save trusted people for moments when decisions feel heavy."],
          ["icon-settings.png", "Profile", "Manage account, guide, permissions, and admin tools."],
          ["icon-admin.png", "Admin Studio", "Admins can add Inspire Hub content, edit content, and enable or disable features."]
        ].map(([icon, title, text]) => `
          <div class="guide-item"><img src="assets/${icon}" alt=""><div><strong>${title}</strong><p>${text}</p></div></div>
        `).join("")}
      </div>
    </div>
  `,

  futureReflection: (id) => {
    const item = savedFutureDecisions().find((decision) => decision.id === id) || savedFutureDecisions()[0];
    if (!item) {
      return `
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="future-reflection-empty-title">
          <div class="modal-top">
            <span class="risk-pill calm">Future Reflection</span>
            <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
          </div>
          <h3 id="future-reflection-empty-title">No saved decision yet</h3>
          <p class="muted">Generate and save a Future Mirror first.</p>
        </div>
      `;
    }
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="future-reflection-title">
        <div class="modal-top">
          <span class="risk-pill calm">Future Reflection</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="future-reflection-title">${escapeHTML(item.question)}</h3>
        <p class="muted">Revisit the decision later and turn experience into learning.</p>
        <div class="admin-form">
          <input id="future-reflection-id" type="hidden" value="${escapeHTML(item.id)}">
          <label>What decision did I make?<textarea id="future-decision-made">${escapeHTML(item.decisionMade || "")}</textarea></label>
          <label>What happened?<textarea id="future-what-happened">${escapeHTML(item.whatHappened || "")}</textarea></label>
          <label>What did I learn?<textarea id="future-lesson">${escapeHTML(item.lesson || "")}</textarea></label>
        </div>
        <button class="primary-action" type="button" data-save-future-reflection>Save reflection</button>
      </div>
    `;
  },

  storyReader: (id) => {
    const story = contentState.stories.find((item) => item.id === id) || contentState.stories[0];
    return `
      <div class="modal-card story-reader-modal" role="dialog" aria-modal="true" aria-labelledby="story-title">
        <div class="modal-top">
          <span class="risk-pill">${escapeHTML(story.category)}</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <div class="story-reader-cover" style="background-image:url('${escapeHTML(story.coverImage)}')"></div>
        <h3 id="story-title">${escapeHTML(story.title)}</h3>
        <p class="muted">${escapeHTML(story.person)} - ${escapeHTML(story.category)} - ${escapeHTML(story.readTime)}</p>
        <div class="quote-block">${escapeHTML(story.quote || story.preview)}</div>
        <p>${escapeHTML(story.body)}</p>
        <div class="support-note">
          <strong>Key decisions they made</strong>
          <ul>${(story.keyDecisions || []).map((decision) => `<li>${escapeHTML(decision)}</li>`).join("")}</ul>
        </div>
        <div class="support-note">
          <strong>What happened after those decisions</strong>
          <p>${escapeHTML(story.afterDecisions)}</p>
        </div>
        <div class="support-note">
          <strong>Key lessons</strong>
          <ul>${(story.keyLessons || []).map((lesson) => `<li>${escapeHTML(lesson)}</li>`).join("")}</ul>
        </div>
        <div class="advice-stack">
          <div><strong>Reflection question</strong><span>${escapeHTML(story.reflectionQuestion)}</span></div>
          <div><strong>Action challenge</strong><span>${escapeHTML(story.actionChallenge)}</span></div>
        </div>
        <div class="related-block">
          <strong>Related videos and articles</strong>
          ${storyExternalLinks(story)}
        </div>
        <div class="story-ai-action-grid">
          <button class="primary-action" type="button" data-story-ai-action="discuss" data-story-ai-id="${escapeHTML(story.id)}">Discuss With Compass AI</button>
          <button class="secondary-action" type="button" data-story-ai-action="apply" data-story-ai-id="${escapeHTML(story.id)}">Apply This Lesson</button>
          <button class="secondary-action" type="button" data-story-ai-action="reality" data-story-ai-id="${escapeHTML(story.id)}">Reality Check</button>
          <button class="secondary-action" type="button" data-story-ai-action="plan" data-story-ai-id="${escapeHTML(story.id)}">Personal Action Plan</button>
        </div>
      </div>
    `;
  },

  storyEditor: (id) => {
    const story = contentState.stories.find((item) => item.id === id) || {
      id: "",
      person: "",
      title: "",
      category: "Entrepreneurs",
      preview: "",
      coverImage: "",
      readTime: "3 min",
      youtubeUrl: "",
      blogUrl: "",
      podcastUrl: "",
      quote: "",
      body: "",
      keyDecisions: [],
      afterDecisions: "",
      keyLessons: [],
      reflectionQuestion: "",
      actionChallenge: "",
      published: true
    };
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="story-editor-title">
        <div class="modal-top">
          <span class="risk-pill light-admin">Admin Inspire content</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="story-editor-title">${story.id ? "Edit Inspire Hub content" : "Add Inspire Hub content"}</h3>
        <div class="admin-form">
          <input id="story-id" type="hidden" value="${escapeHTML(story.id)}">
          <label>Person<input id="story-person" type="text" value="${escapeHTML(story.person)}"></label>
          <label>Title<input id="story-title-input" type="text" value="${escapeHTML(story.title)}"></label>
          <label>Category
            <select id="story-category">
              ${inspireCategories.filter((category) => category !== "All").map((category) => `
                <option value="${escapeHTML(category)}" ${story.category === category ? "selected" : ""}>${escapeHTML(category)}</option>
              `).join("")}
            </select>
          </label>
          <label>Short preview<textarea id="story-preview">${escapeHTML(story.preview || "")}</textarea></label>
          <label>Full article content<textarea id="story-body">${escapeHTML(story.body || "")}</textarea></label>
          <label>Cover image URL<input id="story-cover" type="url" value="${escapeHTML(story.coverImage || "")}"></label>
          <label>YouTube / video URL<input id="story-youtube" type="url" value="${escapeHTML(story.youtubeUrl || "")}"></label>
          <label>Blog / article URL<input id="story-blog" type="url" value="${escapeHTML(story.blogUrl || "")}"></label>
          <label>Podcast URL<input id="story-podcast" type="url" value="${escapeHTML(story.podcastUrl || "")}"></label>
          <label>Key decisions<textarea id="story-decisions" placeholder="One decision per line">${escapeHTML((story.keyDecisions || []).join("\n"))}</textarea></label>
          <label>What happened after those decisions<textarea id="story-after-decisions">${escapeHTML(story.afterDecisions || "")}</textarea></label>
          <label>Key lessons<textarea id="story-lessons" placeholder="One lesson per line">${escapeHTML((story.keyLessons || []).join("\n"))}</textarea></label>
          <label>Reflection question<textarea id="story-reflection">${escapeHTML(story.reflectionQuestion || "")}</textarea></label>
          <label>Action challenge<textarea id="story-challenge">${escapeHTML(story.actionChallenge || "")}</textarea></label>
          <label>Reading time<input id="story-read-time" type="text" value="${escapeHTML(story.readTime || "3 min")}"></label>
          <label>Inspirational quote<textarea id="story-quote">${escapeHTML(story.quote || "")}</textarea></label>
          <label class="toggle-check admin-publish-toggle">
            <input id="story-published" type="checkbox" ${story.published !== false ? "checked" : ""}>
            <span>Published</span>
          </label>
          <p class="form-error" id="story-error" aria-live="polite"></p>
        </div>
        <button class="primary-action" type="button" data-save-story>Save Inspire content</button>
      </div>
    `;
  },

  costOfLiving: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="cost-of-living-title">
      <div class="modal-top">
        <span class="risk-pill calm">Real Cost of Living</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="cost-of-living-title">What does independent living actually cost?</h3>
      <p class="muted">General estimates based on typical Singapore costs - actual prices vary by exact location, timing, and personal choices. Use this as a starting point, not an exact budget.</p>
      <div class="admin-form">
        <label>Housing
          <select id="col-housing">
            ${COST_OF_LIVING_HOUSING.map((item) => `<option value="${escapeHTML(item.id)}" ${costOfLivingDraft.housing === item.id ? "selected" : ""}>${escapeHTML(item.label)}</option>`).join("")}
          </select>
        </label>
        <label>Area
          <select id="col-district">
            ${COST_OF_LIVING_DISTRICT_TIERS.map((item) => `<option value="${escapeHTML(item.id)}" ${costOfLivingDraft.district === item.id ? "selected" : ""}>${escapeHTML(item.label)}</option>`).join("")}
          </select>
        </label>
        <label>Transport
          <select id="col-transport">
            ${COST_OF_LIVING_TRANSPORT.map((item) => `<option value="${escapeHTML(item.id)}" ${costOfLivingDraft.transport === item.id ? "selected" : ""}>${escapeHTML(item.label)}</option>`).join("")}
          </select>
        </label>
        <label>Lifestyle
          <select id="col-lifestyle">
            ${COST_OF_LIVING_LIFESTYLE.map((item) => `<option value="${escapeHTML(item.id)}" ${costOfLivingDraft.lifestyle === item.id ? "selected" : ""}>${escapeHTML(item.label)}</option>`).join("")}
          </select>
        </label>
      </div>
      <button class="primary-action" type="button" data-calc-cost-of-living>Calculate</button>
      ${costOfLivingResult ? `
        <div class="future-reflection-list">
          ${costOfLivingResult.rows.map((row) => `<p class="tiny-note"><strong>${escapeHTML(row.label)}</strong>: $${row.range[0]}-${row.range[1]}/month</p>`).join("")}
        </div>
        <p class="muted"><strong>Estimated total: $${costOfLivingResult.total[0]}-${costOfLivingResult.total[1]}/month</strong></p>
        <div class="future-reflection-list">
          <p class="eyebrow">Often forgotten one-time costs</p>
          ${COST_OF_LIVING_ONE_TIME_NOTES.map((note) => `<p class="tiny-note">${escapeHTML(note)}</p>`).join("")}
        </div>
      ` : ""}
    </div>
  `,

  growthGoals: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="growth-goals-title">
      <div class="modal-top">
        <span class="risk-pill calm">Goals & Dreams</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="growth-goals-title">Save your direction</h3>
      <p class="muted">Compass AI may use these only if you save them. Empty fields are ignored.</p>
      <div class="admin-form">
        <label>Personal goals<textarea id="growth-goals-input" placeholder="Example: improve study routine, save money, build confidence">${escapeHTML(userProfile.goals)}</textarea></label>
        <label>Vision Board notes<textarea id="growth-vision-input" placeholder="Images, ideas, places, habits, people, or words that inspire you">${escapeHTML(userProfile.visionBoard)}</textarea></label>
        <label>Dream university<input id="growth-university-input" type="text" value="${escapeHTML(userProfile.dreamUniversity)}" placeholder="Optional"></label>
        <label>Dream career<input id="growth-career-input" type="text" value="${escapeHTML(userProfile.dreamCareer)}" placeholder="Optional"></label>
        <label>Dream lifestyle<textarea id="growth-lifestyle-input" placeholder="What does a healthy, independent life look like?">${escapeHTML(userProfile.dreamLifestyle)}</textarea></label>
      </div>
      <button class="primary-action" type="button" data-save-growth-goals>Save growth goals</button>
    </div>
  `,

  journal: () => {
    const entries = trackerState.journalEntries.filter((entry) => entry.user_id === currentUserId()).slice(0, 5);
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="journal-title">
        <div class="modal-top">
          <span class="risk-pill calm">Journal</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="journal-title">Write one honest reflection</h3>
        <p class="muted">Short is enough. What happened, what did you feel, and what did you learn?</p>
        <textarea id="journal-entry-input" class="journal-input" placeholder="Today I noticed..."></textarea>
        <p class="form-error" id="journal-error" aria-live="polite"></p>
        <button class="primary-action" type="button" data-save-journal>Save journal entry</button>
        <div class="journal-list">
          ${entries.length ? entries.map((entry) => `
            <article class="journal-entry">
              <strong>${escapeHTML(entry.display_time)}</strong>
              <p>${escapeHTML(entry.text)}</p>
            </article>
          `).join("") : `
            <section class="empty-feature">
              <img src="assets/icon-checkin.png" alt="">
              <div><strong>No journal entries yet</strong><p>Save one reflection to start seeing patterns.</p></div>
            </section>
          `}
        </div>
      </div>
    `;
  },

  challengeHub: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="challenge-title">
      <div class="modal-top">
        <span class="risk-pill calm">Challenges & Badges</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="challenge-title">Choose a 7-day challenge</h3>
      <p class="muted">Simple, calm challenges. No pressure, no childish scoring.</p>
      <div class="challenge-list">${challengeCards()}</div>
    </div>
  `,

  badges: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="badges-title">
      <div class="modal-top">
        <span class="risk-pill calm">Progress</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="badges-title">Streaks, achievements, and badges</h3>
      <p class="muted">Progress stays simple and respectful. Badges unlock from real actions.</p>
      <div class="badge-grid">${badgeCards()}</div>
    </div>
  `,

  growthProgress: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="growth-progress-title">
      <div class="modal-top">
        <span class="risk-pill calm">Growth reports</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="growth-progress-title">Progress from real entries</h3>
      <p class="muted">This view avoids fake memory. It only shows saved Compass data.</p>
      ${progressReportCards()}
      <div class="profile-actions">
        <button class="secondary-action" type="button" data-growth-prompt="${escapeHTML(growthPromptFromData("a weekly growth report"))}">Weekly AI Report</button>
        <button class="secondary-action" type="button" data-growth-prompt="${escapeHTML(growthPromptFromData("a monthly growth report"))}">Monthly Report</button>
      </div>
    </div>
  `,

  growthCommunity: () => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="growth-community-title">
      <div class="modal-top">
        <span class="risk-pill calm">Reflection prompt</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="growth-community-title">Discuss your mirror safely</h3>
      <p class="muted">Share a reflection question with a trusted peer, mentor, teacher, or support circle. Avoid posting private details publicly.</p>
      <div class="quote-block">${escapeHTML(growthCommunityPrompt())}</div>
      <div class="profile-actions">
        <button class="secondary-action" type="button" data-copy-community-prompt>Copy prompt</button>
        <button class="secondary-action" type="button" data-open="supportCircle">Support Circle</button>
      </div>
    </div>
  `,

  communityGroup: (id) => communityGroupModal(id),

  communityPost: (payload = "") => communityPostModal(payload),

  communityCreateSquad: () => communityCreateSquadModal(),

  communityAccountabilityRequest: (targetUserId) => communityAccountabilityRequestModal(targetUserId),

  communityMentorApply: () => communityMentorApplyModal(),

  communityOpportunitySubmit: () => communityOpportunitySubmitModal(),

  safety: (reason = "") => `
    <div class="modal-card dark-modal" role="dialog" aria-modal="true" aria-labelledby="safety-title">
      <div class="modal-top">
        <span class="risk-pill light">Safety check</span>
        <button class="ghost-circle light" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="safety-title">Make the next move safer</h3>
      ${reason ? `<p class="muted">${escapeHTML(reason)}</p>` : ""}
      <p>If there is immediate danger, contact local emergency services or a trusted adult now.</p>
      <div class="safety-list">
        <label><input type="checkbox" checked> Tell a trusted person where you are.</label>
        <label><input type="checkbox"> Keep transport money separate.</label>
        <label><input type="checkbox"> Save emergency contacts.</label>
      </div>
      <button class="primary-action mint-action" type="button" data-close>Create safety note</button>
    </div>
  `
};

function getScreen(tab) {
  const screen = screens[tab] || screens.home;
  return typeof screen === "function" ? screen() : screen;
}

function getModal(name, payload) {
  const modal = modals[name];
  return typeof modal === "function" ? modal(payload) : modal;
}

function refreshStaticScreens() {
  staticScreens.forEach((screen) => {
    screen.innerHTML = getScreen(screen.dataset.staticScreen);
  });
}

function bindRenderedNavigation(container) {
  container.querySelectorAll("[data-tab-jump]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const targetTab = button.dataset.tabJump;
      if (targetTab === "simulator") setLifeVerseDefaultWorldView();
      if (targetTab) renderScreen(targetTab);
    });
  });
}

function setLifeVerseDefaultWorldView() {
  trackerState.lifeVerse = lifeVerseState();
  trackerState.lifeVerse.activeView = "today";
  if (trackerState.lifeSim) trackerState.lifeSim.reportPromptReady = false;
}

// Volume 5 Anime World Remaster, step 3: a 2D character-portrait overlay for
// dialogue, special events, and Life Report. Lives outside #screen-root and
// #modal-layer on purpose - those get their innerHTML replaced wholesale on
// every re-render (chat send, roleplay reply, tab switch), which would tear
// down and rebuild an <img> living inside them and cause a visible flicker
// every single time.
// The roleplay modal renders its "event" portrait inline in its own template
// instead (see modals.roleplayChat/roleplayReflection) - a modal is a fresh
// render every time it opens, so there's no persistent-overlay flicker risk
// there, and the VN-style layout (portrait next to the dialogue) reads better
// than a small badge floating in the corner behind the modal backdrop.
// Art: Breezy's "Visual Novel Sprites!" (CC0) - see assets/portraits/CREDITS.md
// for the license and the role-to-character pairing rationale.
const PORTRAITS = {
  compass: { label: "Compass AI", src: "assets/portraits/compass-cyrus.png" },
  event: { label: "Practice Partner", src: "assets/portraits/event-lyn.png" },
  report: { label: "Life Report", src: "assets/portraits/report-oak.png" }
};

// "report" is not a top-level tab - Life Report is a sub-view inside the
// "simulator" tab (trackerState.lifeVerse.activeView === "report"), reached via
// data-lifeverse-tab="report" buttons that call renderScreen("simulator").
function computeActivePortraitId(tab) {
  if (tab === "compass") return "compass";
  if (tab === "simulator" && trackerState.lifeVerse && trackerState.lifeVerse.activeView === "report") return "report";
  return null;
}
const PORTRAIT_SWAP_MS = 220;
let currentPortraitId = null;
let portraitSwapTimer = null;

function setPortraitContent(id) {
  const portrait = PORTRAITS[id];
  if (!portrait || !portraitImageEl) return;
  portraitImageEl.src = portrait.src;
  portraitImageEl.alt = portrait.label;
  if (portraitNameEl) portraitNameEl.textContent = portrait.label;
  currentPortraitId = id;
}

function showPortrait(id) {
  if (!portraitLayer || !PORTRAITS[id]) return;
  window.clearTimeout(portraitSwapTimer);
  if (currentPortraitId === id) {
    portraitLayer.classList.add("is-visible");
    return;
  }
  const wasVisible = portraitLayer.classList.contains("is-visible");
  if (wasVisible) {
    portraitLayer.classList.remove("is-visible");
    portraitSwapTimer = window.setTimeout(() => {
      setPortraitContent(id);
      portraitLayer.classList.add("is-visible");
    }, PORTRAIT_SWAP_MS);
  } else {
    setPortraitContent(id);
    portraitLayer.classList.add("is-visible");
  }
}

function hidePortrait() {
  if (!portraitLayer) return;
  window.clearTimeout(portraitSwapTimer);
  portraitLayer.classList.remove("is-visible");
  currentPortraitId = null;
}

function renderScreen(tab) {
  activeTab = tab;
  // community.js/community-supabase.js load before app.js as separate
  // <script> tags, so they can't see the `activeTab` lexical binding - they
  // read window.activeTab instead to decide whether to re-render after an
  // async refresh resolves. Without this mirror, window.activeTab is always
  // undefined and those re-render checks silently never fire.
  window.activeTab = tab;
  if (tab === "compass") applyCoachProactiveOpener();
  if (tab === "simulator") {
    enterLifeSimMode();
  } else {
    destroyLifeSim();
    exitLifeSimMode();
  }
  screenRoot.innerHTML = getScreen(tab);
  bindRenderedNavigation(screenRoot);
  const navTab = tab === "assess" || tab === "compass" ? "home" : tab === "simulator" ? "growth" : tab;
  navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.tab === navTab));
  const activePortraitId = computeActivePortraitId(tab);
  if (activePortraitId) showPortrait(activePortraitId);
  else hidePortrait();
  if (tab === "compass") {
    const chatMessagesEl = document.querySelector("#chat-messages");
    if (chatMessagesEl) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }
  if (tab === "simulator") {
    requestAnimationFrame(mountLifeSim);
  }
}

function openModal(name, payload) {
  if (name === "assessment" && !modalLayer.classList.contains("is-open")) {
    assessmentStep = 0;
    assessmentDraft = { answers: {}, freeText: "", preferences: [] };
  }
  if (name === "interviewPractice" && !modalLayer.classList.contains("is-open")) {
    activeInterviewSessionId = null;
    interviewError = "";
  }
  if (name === "resumeBuilder" && !modalLayer.classList.contains("is-open")) {
    resumeError = "";
  }
  if (name === "roadmapView" && !modalLayer.classList.contains("is-open")) {
    roadmapView = "timeline";
    roadmapError = "";
    milestoneJustCompleted = null;
  }
  if (name === "costOfLiving" && !modalLayer.classList.contains("is-open")) {
    costOfLivingResult = null;
  }
  if (name === "discoverYourself" && !modalLayer.classList.contains("is-open")) {
    blueprintActiveSession = 1;
    const existing = latestBlueprint();
    blueprintDraft = existing
      ? { values: [...existing.values], personalityChoice: existing.personalityChoice || "", strengths: [...existing.strengths], strengthsOther: existing.strengthsOther || "", motivationChoice: existing.motivationChoice || "", learningChoice: existing.learningChoice || "", workChoice: existing.workChoice || "", decisionChoice: existing.decisionChoice || "" }
      : { values: [], personalityChoice: "", strengths: [], strengthsOther: "", motivationChoice: "", learningChoice: "", workChoice: "", decisionChoice: "" };
  }
  // futureScanStationError is a single shared var across all 10 stations (by
  // design, so a run function's own openModal() calls during its
  // loading/finally lifecycle don't wipe out the error they just set) - but
  // that means it must be cleared on a genuinely fresh open, or a stale error
  // from a previously failed station bleeds into the next station's modal.
  if (name === "futureScanStation" && !modalLayer.classList.contains("is-open")) {
    futureScanStationError = "";
  }
  modalLayer.innerHTML = getModal(name, payload) || "";
  modalLayer.classList.add("is-open");
  modalLayer.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modalLayer.classList.remove("is-open");
  modalLayer.setAttribute("aria-hidden", "true");
  modalLayer.innerHTML = "";
}

function speak(text) {
  if (userProfile.voicePreference === "off") return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = userProfile.voicePreference === "male" ? 0.82 : 1.08;
  const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
  const preferred = voices.find((voice) => {
    const name = voice.name.toLowerCase();
    return userProfile.voicePreference === "male"
      ? name.includes("male") || name.includes("david") || name.includes("mark")
      : name.includes("female") || name.includes("zira") || name.includes("samantha");
  });
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.speak(utterance);
}

async function requestCompassAI(question) {
  const documentChunks = retrieveDocumentChunks(question);
  const blueprint = latestBlueprint();
  const context = {
    savedUserProfile: compassProfileForAI(),
    personalBlueprint: blueprint ? { values: blueprint.values, strengths: blueprint.strengths, personality: blueprint.personality, motivationStyle: blueprint.motivationStyle, workStyle: blueprint.workStyle, decisionStyle: blueprint.decisionStyle } : null,
    realSavedFacts: realGrowthFacts(),
    uploadedDocumentChunks: documentChunks
  };
  const history = chatState.messages.slice(-24).filter((message) => !message.local && message.text !== COMPASS_API_ERROR).slice(-20).map((message) => ({
    role: message.from === "assistant" ? "assistant" : "user",
    content: message.text
  }));
  const response = await fetch(COMPASS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt: COMPASS_SYSTEM_PROMPT,
      messages: history,
      context
    })
  });
  if (!response.ok) {
    let errorDetail = "";
    try {
      const errorBody = await response.json();
      errorDetail = errorBody.detail || errorBody.error || JSON.stringify(errorBody);
    } catch {
      errorDetail = await response.text();
    }
    console.error("[Compass AI] Backend error", {
      status: response.status,
      statusText: response.statusText,
      detail: errorDetail
    });
    throw new Error(`Compass API failed with ${response.status}`);
  }
  const data = await response.json();
  const reply = String(data.reply || "").trim();
  if (!reply) throw new Error("Empty Compass reply");
  return reply;
}

async function requestCompassDirect(systemPrompt, userPrompt) {
  const response = await fetch(COMPASS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      context: {
        savedUserProfile: compassProfileForAI(),
        uploadedDocumentChunks: []
      }
    })
  });
  if (!response.ok) {
    let errorDetail = "";
    try {
      const errorBody = await response.json();
      errorDetail = errorBody.detail || errorBody.error || JSON.stringify(errorBody);
    } catch {
      errorDetail = await response.text();
    }
    console.error("[Future Mirror] Backend error", {
      status: response.status,
      statusText: response.statusText,
      detail: errorDetail
    });
    throw new Error(`Future Mirror API failed with ${response.status}`);
  }
  const data = await response.json();
  const reply = String(data.reply || "").trim();
  if (!reply) throw new Error("Empty Future Mirror reply");
  return reply;
}


// ---- Future Scan ---------------------------------------------------------

// One-line, factual summary of a station's own already-saved result - used
// to feed later stations what earlier ones found, so a Drift Detector run
// after a Conflict Map doesn't contradict it. Always built from the real
// saved result, never invented, so it stays inside the "ground everything in
// what's actually there" rule the whole feature runs on.
function summarizeFutureScanStationResult(stationId, result) {
  if (!result) return "";
  switch (stationId) {
    case "identityScan":
      return result.headline ? `Identity Scan found: ${result.headline}` : "";
    case "valuesCheck": {
      const aligned = result.checks.filter((item) => item.alignment === "aligned").map((item) => item.value);
      const tension = result.checks.filter((item) => item.alignment === "tension").map((item) => item.value);
      if (!aligned.length && !tension.length) return "";
      const parts = [];
      if (aligned.length) parts.push(`aligns with ${aligned.join(", ")}`);
      if (tension.length) parts.push(`is in tension with ${tension.join(", ")}`);
      return `Values Check found: this choice ${parts.join(" and ")}.`;
    }
    case "hiddenCosts": {
      const top = [...result.costs].sort((a, b) => b.severity - a.severity).slice(0, 2).map((item) => item.label);
      return top.length ? `Hidden Cost Scanner found: the biggest costs were ${top.join(", ")}.` : "";
    }
    case "noActionFuture":
      return result.timeline && result.timeline["1 year"] ? `No-Action Future found: if nothing changes, in 1 year - ${result.timeline["1 year"]}` : "";
    case "pressureTest":
      return result.headline ? `Pressure Test found: ${result.pressureLevel} outside pressure - ${result.headline}` : "";
    case "conflictMap":
      return result.headline ? `Conflict Map found: ${result.headline}` : "";
    case "signalRadar":
      return result.headline ? `Signal Radar found: ${result.headline}` : "";
    case "pastSelfCheck":
      return result.headline ? `Past-Self Check found: ${result.headline}` : "";
    case "driftDetector":
      return result.headline ? `Drift Detector found: ${result.drift} - ${result.headline}` : "";
    case "checkBack":
      return result.status === "completed" && result.headline ? `Check-Back found: ${result.headline}` : "";
    default:
      return "";
  }
}

function scanContextText(currentStationId) {
  if (!activeFutureScan) return "";
  const { rawInput, clarifyingQuestion, clarifyingAnswer } = activeFutureScan.scanContext;
  const base = `The user's situation: "${rawInput}". Clarifying question asked: "${clarifyingQuestion}" Their answer: "${clarifyingAnswer}".`;
  const priorFindings = FUTURE_SCAN_STATIONS
    .filter((station) => station.id !== currentStationId)
    .map((station) => summarizeFutureScanStationResult(station.id, activeFutureScan.stations[station.id]))
    .filter(Boolean);
  return priorFindings.length
    ? `${base} Other Future Scan stations already run on this same situation (for coherence - don't just repeat these, but don't contradict them without reason): ${priorFindings.join(" ")}`
    : base;
}

function saveFutureScanStation(stationId, result) {
  if (!activeFutureScan) return;
  activeFutureScan.stations = activeFutureScan.stations || {};
  activeFutureScan.stations[stationId] = result;
  const stored = trackerState.futureScans.find((item) => item.id === activeFutureScan.id);
  if (stored) stored.stations = activeFutureScan.stations;
  saveTrackerState();
}

function resetFutureScan() {
  futureScanStage = "entry";
  futureScanRawInput = "";
  futureScanClarifyQuestion = "";
  futureScanClarifyChips = [];
  futureScanClarifyAnswer = "";
  futureScanIdentityPicks = [];
  futureScanPressurePicks = [];
  futureScanPressureOtherText = "";
  futureScanSignalPicks = {};
  futureScanCheckBackHorizon = "";
  futureScanCheckBackReportText = "";
  futureScanSuggestedStationIds = [];
  activeFutureScan = null;
  futureScanError = "";
  futureScanStationError = "";
  futureScanSynthesisError = "";
  renderScreen("future");
}

function myFutureScans() {
  return trackerState.futureScans
    .filter((scan) => scan.user_id === currentUserId())
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function openPastFutureScan(scanId) {
  const scan = myFutureScans().find((item) => item.id === scanId);
  if (!scan) return;
  activeFutureScan = scan;
  futureScanStage = "stations";
  closeModal();
  renderScreen("future");
}

async function startFutureScan(rawInputOverride) {
  const inputEl = document.querySelector("#scan-raw-input");
  const rawInput = cleanText(rawInputOverride || (inputEl ? inputEl.value : ""), 300);
  if (!rawInput) {
    futureScanError = "Tell me what's on your mind first.";
    renderScreen("future");
    return;
  }
  futureScanRawInput = rawInput;
  futureScanError = "";
  isFutureScanLoading = true;
  renderScreen("future");
  try {
    const stationCatalogText = FUTURE_SCAN_STATIONS.map((station) => `${station.id} (${station.title}: ${station.blurb})`).join("; ");
    const prompt = `The user is about to use Future Scan on this real situation: "${rawInput}". Saved context, if any: ${realGrowthFactsText()}. Ask exactly ONE short clarifying question that would make the scan more specific and useful (not generic small talk), plus 2 or 3 short tap-to-answer quick-reply options for that question. Also pick 1 to 3 station ids from this catalog that seem most useful to run FIRST for this specific situation (only pick ones that are genuinely relevant, not a fixed default set - it's fine to pick just 1): ${stationCatalogText}. Respond as strict JSON only: {"question":"string","chips":["string","string","string"],"suggestedStationIds":["string"]}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed || !parsed.question) throw new Error("Future Scan clarifying question was not valid JSON.");
    futureScanClarifyQuestion = cleanText(parsed.question, 200);
    futureScanClarifyChips = Array.isArray(parsed.chips) ? parsed.chips.slice(0, 3).map((chip) => cleanText(chip, 60)).filter(Boolean) : [];
    const validStationIds = FUTURE_SCAN_STATIONS.map((station) => station.id);
    futureScanSuggestedStationIds = Array.isArray(parsed.suggestedStationIds)
      ? parsed.suggestedStationIds.filter((id) => validStationIds.includes(id)).slice(0, 3)
      : [];
    futureScanStage = "clarify";
  } catch (error) {
    console.error("[Future Scan] Clarify request failed", error);
    futureScanError = "Future Scan is having trouble starting right now. Please try again.";
  } finally {
    isFutureScanLoading = false;
    renderScreen("future");
  }
}

async function submitFutureScanClarify(answerOverride) {
  const inputEl = document.querySelector("#scan-clarify-answer");
  const answer = cleanText(answerOverride || futureScanClarifyAnswer || (inputEl ? inputEl.value : ""), 200);
  if (!answer) {
    futureScanError = "Pick a quick reply or type a short answer.";
    renderScreen("future");
    return;
  }
  futureScanClarifyAnswer = answer;
  futureScanError = "";
  activeFutureScan = {
    id: `future-scan-${Date.now()}`,
    user_id: currentUserId(),
    createdAt: new Date().toISOString(),
    scanContext: {
      rawInput: futureScanRawInput,
      clarifyingQuestion: futureScanClarifyQuestion,
      clarifyingAnswer: answer,
      suggestedStationIds: futureScanSuggestedStationIds.slice()
    },
    stations: {},
    synthesis: null,
    resurfaceAt: null,
    resurfacedAt: null,
    dismissedAt: null,
    ignoredCount: 0
  };
  trackerState.futureScans.push(activeFutureScan);
  saveTrackerState();
  futureScanStage = "stations";
  renderScreen("future");
}

function futureScanIdentityView() {
  const result = activeFutureScan.stations.identityScan;
  return `
    <div class="mood-choice-grid">
      ${FUTURE_IDENTITY_OPTIONS.map((option) => `
        <button type="button" class="mood-choice ${futureScanIdentityPicks.includes(option) ? "is-selected" : ""}" data-scan-identity-pick="${escapeHTML(option)}">${escapeHTML(option)}</button>
      `).join("")}
    </div>
    ${futureScanStationError ? `<p class="form-error">${escapeHTML(futureScanStationError)}</p>` : ""}
    <button class="primary-action mirror-run-action" type="button" data-run-scan-identity ${futureScanStationLoading === "identityScan" ? "disabled" : ""}>${futureScanStationLoading === "identityScan" ? "Scanning..." : result ? "Re-scan" : "Run Identity Scan"}</button>
    ${result ? `
      <div class="future-reflection-list">
        <p><strong>${escapeHTML(result.headline)}</strong></p>
        <p class="muted">${escapeHTML(result.reading)}</p>
        ${result.identities.map((item) => `<p class="tiny-note"><strong>${escapeHTML(item.name)}</strong> - ${escapeHTML(item.direction)}: ${escapeHTML(item.reason)}</p>`).join("")}
      </div>
    ` : ""}
  `;
}

async function runFutureScanIdentity() {
  if (!futureScanIdentityPicks.length) {
    futureScanStationError = "Pick at least one identity that matters to you.";
    openModal("futureScanStation", "identityScan");
    return;
  }
  futureScanStationError = "";
  futureScanStationLoading = "identityScan";
  openModal("futureScanStation", "identityScan");
  const blueprint = latestBlueprint();
  try {
    const prompt = `${scanContextText("identityScan")} The user picked these future identities as ones they want to become: ${futureScanIdentityPicks.join(", ")}. Saved Blueprint, if any: ${blueprint ? JSON.stringify({ values: blueprint.values, strengths: blueprint.strengths, workStyle: blueprint.workStyle }) : "none saved yet"}. For each picked identity, say briefly whether their situation moves them toward, away from, or is neutral to it, and why - only using the real context given, don't invent anything not stated. Respond as strict JSON only: {"headline":"string","reading":"string","identities":[{"name":"string","direction":"toward|away|neutral","reason":"string"}]}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed) throw new Error("Identity Scan reply was not valid JSON.");
    const result = {
      headline: cleanText(parsed.headline || "Here's how this choice lines up with who you want to become.", 200),
      reading: cleanText(parsed.reading || "", 400),
      identities: Array.isArray(parsed.identities) ? parsed.identities.slice(0, 3).map((item) => ({
        name: cleanText(item.name || "", 60),
        direction: ["toward", "away", "neutral"].includes(item.direction) ? item.direction : "neutral",
        reason: cleanText(item.reason || "", 200)
      })).filter((item) => item.name) : [],
      picks: futureScanIdentityPicks.slice(),
      generatedAt: new Date().toISOString()
    };
    saveFutureScanStation("identityScan", result);
  } catch (error) {
    console.error("[Future Scan] Identity scan failed", error);
    futureScanStationError = "This scan is having trouble running right now. Please try again.";
  } finally {
    futureScanStationLoading = "";
    openModal("futureScanStation", "identityScan");
  }
}

function futureScanValuesView() {
  const blueprint = latestBlueprint();
  const result = activeFutureScan.stations.valuesCheck;
  if (!blueprint || !Array.isArray(blueprint.values) || !blueprint.values.length) {
    return `
      <p class="muted">Complete your Personal Blueprint first - this check compares your choice against the values you saved there, not generic ones.</p>
      <button class="secondary-action compact-action" type="button" data-open="discoverYourself">Start Blueprint</button>
    `;
  }
  return `
    <p class="eyebrow">Your saved values</p>
    <div class="mirror-example-row">${blueprint.values.map((value) => `<span class="mood-chip">${escapeHTML(value)}</span>`).join("")}</div>
    ${futureScanStationError ? `<p class="form-error">${escapeHTML(futureScanStationError)}</p>` : ""}
    <button class="primary-action mirror-run-action" type="button" data-run-scan-values ${futureScanStationLoading === "valuesCheck" ? "disabled" : ""}>${futureScanStationLoading === "valuesCheck" ? "Checking..." : result ? "Re-check" : "Run Values Check"}</button>
    ${result ? `
      <div class="future-reflection-list">
        ${result.checks.map((item) => `<p class="tiny-note"><strong>${escapeHTML(item.value)}</strong> - ${escapeHTML(item.alignment)}: ${escapeHTML(item.reason)}</p>`).join("")}
      </div>
    ` : ""}
  `;
}

async function runFutureScanValues() {
  const blueprint = latestBlueprint();
  if (!blueprint) return;
  futureScanStationError = "";
  futureScanStationLoading = "valuesCheck";
  openModal("futureScanStation", "valuesCheck");
  try {
    const prompt = `${scanContextText("valuesCheck")} The user's saved values, in their own words: ${blueprint.values.join(", ")}. For EACH value, say whether this choice aligns with it, creates tension with it, or is unrelated - quote back the value exactly as given, don't invent new values. Respond as strict JSON only: {"checks":[{"value":"string","alignment":"aligned|tension|unrelated","reason":"string"}]}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed || !Array.isArray(parsed.checks)) throw new Error("Values check reply was not valid JSON.");
    const result = {
      checks: parsed.checks.slice(0, 6).map((item) => ({
        value: cleanText(item.value || "", 60),
        alignment: ["aligned", "tension", "unrelated"].includes(item.alignment) ? item.alignment : "unrelated",
        reason: cleanText(item.reason || "", 200)
      })).filter((item) => item.value),
      generatedAt: new Date().toISOString()
    };
    saveFutureScanStation("valuesCheck", result);
  } catch (error) {
    console.error("[Future Scan] Values check failed", error);
    futureScanStationError = "This check is having trouble running right now. Please try again.";
  } finally {
    futureScanStationLoading = "";
    openModal("futureScanStation", "valuesCheck");
  }
}

// Maps the Hidden Cost Scanner's 6 labels onto real LifeVerse state fields.
// betterWhenHigh: true means the field going DOWN over the simulated window
// is the cost (e.g. sleep draining); false means the field going UP is the
// cost (burnoutRisk rising). scaleFactor turns a raw 30-day point delta into
// a 0-100 severity - tuned so a typical drift lands in a believable 20-70
// band rather than always pinning to 0 or 100.
const HIDDEN_COST_FIELD_MAP = [
  { label: "Sleep", get: (state) => state.needs.sleep, betterWhenHigh: true },
  { label: "Energy", get: (state) => state.needs.energy, betterWhenHigh: true },
  { label: "Focus", get: (state) => state.mentalWellbeing.burnoutRisk, betterWhenHigh: false },
  { label: "Confidence", get: (state) => state.mentalWellbeing.confidence, betterWhenHigh: true },
  { label: "Future opportunity", get: (state) => state.career.readiness, betterWhenHigh: true },
  { label: "Relationships", get: (state) => state.relationships.support, betterWhenHigh: true }
];
const HIDDEN_COST_SCALE_FACTOR = 2.5;

function computeHiddenCostSeverities() {
  const before = lifeVerseState();
  const beforeValues = HIDDEN_COST_FIELD_MAP.map((field) => Number(field.get(before)) || 0);
  const { state: after } = lifeVerseNoActionSnapshot(30);
  return HIDDEN_COST_FIELD_MAP.map((field, index) => {
    const afterValue = Number(field.get(after)) || 0;
    const delta = field.betterWhenHigh ? beforeValues[index] - afterValue : afterValue - beforeValues[index];
    return { label: field.label, severity: Math.max(0, Math.min(100, Math.round(delta * HIDDEN_COST_SCALE_FACTOR))) };
  });
}

function futureScanHiddenCostsView() {
  const result = activeFutureScan.stations.hiddenCosts;
  return `
    ${futureScanStationError ? `<p class="form-error">${escapeHTML(futureScanStationError)}</p>` : ""}
    <button class="primary-action mirror-run-action" type="button" data-run-scan-costs ${futureScanStationLoading === "hiddenCosts" ? "disabled" : ""}>${futureScanStationLoading === "hiddenCosts" ? "Scanning..." : result ? "Re-scan" : "Run Hidden Cost Scanner"}</button>
    ${result ? `
      <div class="scan-simulated-title">
        <span class="risk-pill calm">Simulated</span>
        <small>${result.personalized ? "Based on your LifeVerse profile" : "Based on a general starting-adult simulation"}</small>
      </div>
      <div class="struggle-map">
        ${result.costs.map((cost, index) => `
          <div class="struggle-row scan-cost-row" style="animation-delay:${index * 120}ms">
            <span>${escapeHTML(cost.label)}</span>
            <i><b style="width:${cost.severity}%"></b></i>
            <strong>${cost.severity}</strong>
          </div>
        `).join("")}
      </div>
      <div class="future-reflection-list">
        ${result.costs.map((cost) => `<p class="tiny-note"><strong>${escapeHTML(cost.label)}</strong>: ${escapeHTML(cost.reason)}</p>`).join("")}
      </div>
    ` : ""}
  `;
}

async function runFutureScanHiddenCosts() {
  futureScanStationError = "";
  futureScanStationLoading = "hiddenCosts";
  openModal("futureScanStation", "hiddenCosts");
  try {
    const severities = computeHiddenCostSeverities();
    const severitiesText = severities.map((item) => `${item.label}: severity ${item.severity}/100`).join("; ");
    const prompt = `${scanContextText("hiddenCosts")}\n\nCompass's own life simulation engine computed these real severities for this user if this pattern continues for about a month: ${severitiesText}.\n\nFor EACH of these exact labels, in this exact order, write a one-sentence reason grounded in the real severity number and the user's specific real situation - do not invent a different severity, only explain why it lands there for them. Respond as strict JSON only: {"costs":[{"label":"string","reason":"string"}]}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed || !Array.isArray(parsed.costs)) throw new Error("Hidden cost reply was not valid JSON.");
    const reasonByLabel = new Map(parsed.costs.map((item) => [cleanText(item.label || "", 40).toLowerCase(), cleanText(item.reason || "", 160)]));
    const result = {
      costs: severities.map((item) => ({
        label: item.label,
        severity: item.severity,
        reason: reasonByLabel.get(item.label.toLowerCase()) || "This reflects how this pattern affects that part of your life if it continues."
      })),
      personalized: Boolean(userProfile.characterCreated),
      generatedAt: new Date().toISOString()
    };
    saveFutureScanStation("hiddenCosts", result);
  } catch (error) {
    console.error("[Future Scan] Hidden cost scan failed", error);
    futureScanStationError = "This scan is having trouble running right now. Please try again.";
  } finally {
    futureScanStationLoading = "";
    openModal("futureScanStation", "hiddenCosts");
  }
}

function futureScanNoActionView() {
  const result = activeFutureScan.stations.noActionFuture;
  return `
    ${futureScanStationError ? `<p class="form-error">${escapeHTML(futureScanStationError)}</p>` : ""}
    <button class="primary-action mirror-run-action" type="button" data-run-scan-noaction ${futureScanStationLoading === "noActionFuture" ? "disabled" : ""}>${futureScanStationLoading === "noActionFuture" ? "Scanning..." : result ? "Re-scan" : "Run No-Action Future"}</button>
    ${result ? `
      <div class="scan-simulated-block">
        <div class="scan-simulated-title">
          <span class="risk-pill calm">Simulated</span>
          <small>${result.personalized ? "Based on your LifeVerse profile" : "Based on a general starting-adult simulation"}</small>
        </div>
        <div class="scan-timeline-row">
          ${FUTURE_SCAN_NO_ACTION_CHECKPOINTS.map(([key]) => `
            <div class="mirror-timeline-card scan-timeline-card">
              <p class="eyebrow">${escapeHTML(key)}</p>
              <p>${escapeHTML((result.simulated && result.simulated[key] && result.simulated[key].summary) || "")}</p>
            </div>
          `).join("")}
        </div>
      </div>
      <div class="scan-timeline-row">
        ${FUTURE_SCAN_NO_ACTION_CHECKPOINTS.map(([key]) => `
          <div class="mirror-timeline-card scan-timeline-card">
            <p class="eyebrow">${escapeHTML(key)}</p>
            <p>${escapeHTML(result.timeline[key] || "")}</p>
          </div>
        `).join("")}
      </div>
    ` : ""}
  `;
}

const FUTURE_SCAN_NO_ACTION_CHECKPOINTS = [["1 week", 7], ["1 month", 30], ["6 months", 180], ["1 year", 365]];

async function runFutureScanNoAction() {
  futureScanStationError = "";
  futureScanStationLoading = "noActionFuture";
  openModal("futureScanStation", "noActionFuture");
  try {
    const simulated = {};
    FUTURE_SCAN_NO_ACTION_CHECKPOINTS.forEach(([label, days]) => {
      const { event } = lifeVerseNoActionSnapshot(days);
      simulated[label] = {
        summary: event ? cleanText(event.summary, 200) : "",
        consequences: event && Array.isArray(event.consequences) ? event.consequences.slice(0, 3) : []
      };
    });
    const factsBlock = FUTURE_SCAN_NO_ACTION_CHECKPOINTS
      .map(([label]) => `${label}: ${simulated[label].consequences.join(" ") || simulated[label].summary}`)
      .join("\n");
    const prompt = `${scanContextText("noActionFuture")}\n\nReal simulated outcome data for this user if nothing changes, from Compass's own life simulation engine:\n${factsBlock}\n\nIf the user changes NOTHING and keeps doing exactly what they're doing now regarding this situation, describe what that realistically looks like at each checkpoint. Use the real simulated data above as the primary basis for each entry - do not contradict it, but add interpretation relevant to their specific real-life situation. Be concrete, not generic. Respond as strict JSON only: {"timeline":{"1 week":"string","1 month":"string","6 months":"string","1 year":"string"}}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed || !parsed.timeline) throw new Error("No-Action Future reply was not valid JSON.");
    const result = {
      timeline: {
        "1 week": cleanText(parsed.timeline["1 week"] || "", 200),
        "1 month": cleanText(parsed.timeline["1 month"] || "", 200),
        "6 months": cleanText(parsed.timeline["6 months"] || "", 200),
        "1 year": cleanText(parsed.timeline["1 year"] || "", 200)
      },
      simulated,
      personalized: Boolean(userProfile.characterCreated),
      generatedAt: new Date().toISOString()
    };
    saveFutureScanStation("noActionFuture", result);
  } catch (error) {
    console.error("[Future Scan] No-action future failed", error);
    futureScanStationError = "This scan is having trouble running right now. Please try again.";
  } finally {
    futureScanStationLoading = "";
    openModal("futureScanStation", "noActionFuture");
  }
}

function futureScanPressureView() {
  const result = activeFutureScan.stations.pressureTest;
  return `
    <div class="mood-choice-grid">
      ${FUTURE_SCAN_PRESSURE_OPTIONS.map((option) => `
        <button type="button" class="mood-choice ${futureScanPressurePicks.includes(option) ? "is-selected" : ""}" data-scan-pressure-pick="${escapeHTML(option)}">${escapeHTML(option)}</button>
      `).join("")}
    </div>
    <div class="admin-form">
      <label>Anything else pushing this decision? (optional)
        <input id="scan-pressure-other" type="text" placeholder="Type a short note" value="${escapeHTML(futureScanPressureOtherText)}">
      </label>
    </div>
    ${futureScanStationError ? `<p class="form-error">${escapeHTML(futureScanStationError)}</p>` : ""}
    <button class="primary-action mirror-run-action" type="button" data-run-scan-pressure ${futureScanStationLoading === "pressureTest" ? "disabled" : ""}>${futureScanStationLoading === "pressureTest" ? "Checking..." : result ? "Re-check" : "Run Pressure Test"}</button>
    ${result ? `
      <span class="risk-pill ${result.pressureLevel === "high" ? "danger" : result.pressureLevel === "medium" ? "warn" : "calm"}">${escapeHTML(result.pressureLevel)} outside pressure</span>
      <div class="future-reflection-list">
        <p><strong>${escapeHTML(result.headline)}</strong></p>
        <p class="muted">${escapeHTML(result.reading)}</p>
        ${result.sources.filter((item) => item.present).map((item) => `<p class="tiny-note"><strong>${escapeHTML(item.name)}</strong>: ${escapeHTML(item.note)}</p>`).join("")}
      </div>
    ` : ""}
  `;
}

async function runFutureScanPressure() {
  const otherInput = document.querySelector("#scan-pressure-other");
  futureScanPressureOtherText = cleanText(otherInput ? otherInput.value : futureScanPressureOtherText, 140);
  futureScanStationError = "";
  futureScanStationLoading = "pressureTest";
  openModal("futureScanStation", "pressureTest");
  try {
    const picksText = futureScanPressurePicks.length ? futureScanPressurePicks.join(", ") : "none flagged by the user";
    const prompt = `${scanContextText("pressureTest")} The user flagged these pressure sources as present: ${picksText}.${futureScanPressureOtherText ? ` They also noted: "${futureScanPressureOtherText}".` : ""} Based on the real situation described, assess how much external pressure, fear, or comparison (versus their own genuine reasoning) seems to be driving this choice. Only comment on sources that are actually supported by what they told you - if they flagged none and the raw context doesn't suggest pressure either, say so honestly rather than inventing pressure. Respond as strict JSON only: {"headline":"string","reading":"string","pressureLevel":"low|medium|high","sources":[{"name":"string","present":true,"note":"string"}]}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed) throw new Error("Pressure test reply was not valid JSON.");
    const result = {
      headline: cleanText(parsed.headline || "Here's a read on what's really driving this.", 200),
      reading: cleanText(parsed.reading || "", 400),
      pressureLevel: ["low", "medium", "high"].includes(parsed.pressureLevel) ? parsed.pressureLevel : "low",
      sources: Array.isArray(parsed.sources) ? parsed.sources.slice(0, 6).map((item) => ({
        name: cleanText(item.name || "", 60),
        present: Boolean(item.present),
        note: cleanText(item.note || "", 200)
      })).filter((item) => item.name) : [],
      picks: futureScanPressurePicks.slice(),
      generatedAt: new Date().toISOString()
    };
    saveFutureScanStation("pressureTest", result);
  } catch (error) {
    console.error("[Future Scan] Pressure test failed", error);
    futureScanStationError = "This check is having trouble running right now. Please try again.";
  } finally {
    futureScanStationLoading = "";
    openModal("futureScanStation", "pressureTest");
  }
}

function futureScanConflictView() {
  const goals = myRoadmapGoals();
  const result = activeFutureScan.stations.conflictMap;
  if (!goals.length) {
    return `
      <p class="muted">No Life Roadmap goals saved yet - this map compares your choice against real goals you've set, not generic ones.</p>
      <button class="secondary-action compact-action" type="button" data-open="roadmapView">Open Life Roadmap</button>
    `;
  }
  return `
    <p class="eyebrow">Your active goals</p>
    <div class="mirror-example-row">${goals.map((goal) => `<span class="mood-chip">${escapeHTML(goal.title)}</span>`).join("")}</div>
    ${futureScanStationError ? `<p class="form-error">${escapeHTML(futureScanStationError)}</p>` : ""}
    <button class="primary-action mirror-run-action" type="button" data-run-scan-conflict ${futureScanStationLoading === "conflictMap" ? "disabled" : ""}>${futureScanStationLoading === "conflictMap" ? "Mapping..." : result ? "Re-map" : "Run Conflict Map"}</button>
    ${result ? `
      <div class="future-reflection-list">
        <p><strong>${escapeHTML(result.headline)}</strong></p>
        <p class="muted">${escapeHTML(result.reading)}</p>
        ${result.conflicts.map((item) => `<p class="tiny-note"><span class="risk-pill ${item.tension === "strong" ? "danger" : item.tension === "mild" ? "warn" : "calm"}">${escapeHTML(item.tension)}</span> <strong>${escapeHTML(item.goal)}</strong> - ${escapeHTML(item.reason)}</p>`).join("")}
      </div>
    ` : ""}
  `;
}

async function runFutureScanConflict() {
  const goals = myRoadmapGoals();
  if (!goals.length) return;
  futureScanStationError = "";
  futureScanStationLoading = "conflictMap";
  openModal("futureScanStation", "conflictMap");
  try {
    const goalsText = goals.map((goal) => `"${goal.title}" (${(goal.milestones || []).filter((item) => item.status !== "done").length} open milestones)`).join("; ");
    const prompt = `${scanContextText("conflictMap")} The user's saved Life Roadmap goals: ${goalsText}. For EACH goal, say whether this choice is in strong tension, mild tension, or no tension with it, and why - quote the goal title back exactly, don't invent new goals. Respond as strict JSON only: {"headline":"string","reading":"string","conflicts":[{"goal":"string","tension":"none|mild|strong","reason":"string"}]}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed || !Array.isArray(parsed.conflicts)) throw new Error("Conflict map reply was not valid JSON.");
    const result = {
      headline: cleanText(parsed.headline || "Here's where this choice sits against your goals.", 200),
      reading: cleanText(parsed.reading || "", 300),
      conflicts: parsed.conflicts.slice(0, 8).map((item) => ({
        goal: cleanText(item.goal || "", 80),
        tension: ["none", "mild", "strong"].includes(item.tension) ? item.tension : "none",
        reason: cleanText(item.reason || "", 200)
      })).filter((item) => item.goal),
      generatedAt: new Date().toISOString()
    };
    saveFutureScanStation("conflictMap", result);
  } catch (error) {
    console.error("[Future Scan] Conflict map failed", error);
    futureScanStationError = "This map is having trouble running right now. Please try again.";
  } finally {
    futureScanStationLoading = "";
    openModal("futureScanStation", "conflictMap");
  }
}

function futureScanSignalView() {
  const result = activeFutureScan.stations.signalRadar;
  return `
    ${FUTURE_SCAN_SIGNAL_DIMENSIONS.map((dimension) => `
      <div class="admin-form">
        <label>${escapeHTML(dimension.label)}
          <div class="mirror-example-row">
            ${FUTURE_SCAN_SIGNAL_LEVELS.map((level) => `<button type="button" class="${futureScanSignalPicks[dimension.id] === level ? "is-selected" : ""}" data-scan-signal-pick="${dimension.id}:${level}">${level}</button>`).join("")}
          </div>
        </label>
      </div>
    `).join("")}
    ${futureScanStationError ? `<p class="form-error">${escapeHTML(futureScanStationError)}</p>` : ""}
    <button class="primary-action mirror-run-action" type="button" data-run-scan-signal ${futureScanStationLoading === "signalRadar" ? "disabled" : ""}>${futureScanStationLoading === "signalRadar" ? "Reading..." : result ? "Re-check" : "Run Signal Radar"}</button>
    ${result ? `
      <div class="future-reflection-list">
        <p><strong>${escapeHTML(result.headline)}</strong></p>
        <p class="muted">${escapeHTML(result.reading)}</p>
      </div>
    ` : ""}
  `;
}

async function runFutureScanSignal() {
  const picked = FUTURE_SCAN_SIGNAL_DIMENSIONS.filter((dimension) => futureScanSignalPicks[dimension.id]);
  if (!picked.length) {
    futureScanStationError = "Rate at least one signal below.";
    openModal("futureScanStation", "signalRadar");
    return;
  }
  futureScanStationError = "";
  futureScanStationLoading = "signalRadar";
  openModal("futureScanStation", "signalRadar");
  try {
    const signalsText = picked.map((dimension) => `${dimension.label}: ${futureScanSignalPicks[dimension.id]}`).join(", ");
    const prompt = `${scanContextText("signalRadar")} The user just self-rated how they feel RIGHT NOW, in this moment, not as a permanent trait: ${signalsText}. Write a short, honest read of what this moment-in-time combination might mean for making this specific choice right now - this is not a score or a judgment of them as a person, just a check on timing. Respond as strict JSON only: {"headline":"string","reading":"string"}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed) throw new Error("Signal radar reply was not valid JSON.");
    const result = {
      headline: cleanText(parsed.headline || "Here's a read on your moment.", 200),
      reading: cleanText(parsed.reading || "", 400),
      signals: { ...futureScanSignalPicks },
      generatedAt: new Date().toISOString()
    };
    saveFutureScanStation("signalRadar", result);
  } catch (error) {
    console.error("[Future Scan] Signal radar failed", error);
    futureScanStationError = "This reading is having trouble running right now. Please try again.";
  } finally {
    futureScanStationLoading = "";
    openModal("futureScanStation", "signalRadar");
  }
}

function futureScanPastSelfHistory() {
  return allReflectionLikeEntries()
    .filter((entry) => entry.user_id === currentUserId() && entry._source !== "futureScan" && cleanText(entry.content, 1))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 6);
}

function futureScanPastSelfView() {
  const history = futureScanPastSelfHistory();
  const result = activeFutureScan.stations.pastSelfCheck;
  if (history.length < 2) {
    return `<p class="muted">Not enough history yet - keep journaling and reflecting, and this check gets sharper the more you save here.</p>`;
  }
  return `
    <p class="muted">Compares this choice against ${history.length} things you've actually written before - nothing invented.</p>
    ${futureScanStationError ? `<p class="form-error">${escapeHTML(futureScanStationError)}</p>` : ""}
    <button class="primary-action mirror-run-action" type="button" data-run-scan-pastself ${futureScanStationLoading === "pastSelfCheck" ? "disabled" : ""}>${futureScanStationLoading === "pastSelfCheck" ? "Comparing..." : result ? "Re-check" : "Run Past-Self Check"}</button>
    ${result ? `
      <div class="future-reflection-list">
        <p><strong>${escapeHTML(result.headline)}</strong></p>
        <p class="muted">${escapeHTML(result.reading)}</p>
        ${result.patterns.map((item) => `<p class="tiny-note"><span class="risk-pill ${item.comparison === "consistent" ? "calm" : item.comparison === "inconsistent" ? "danger" : "light"}">${escapeHTML(item.comparison)}</span> ${escapeHTML(item.reason)}</p>`).join("")}
      </div>
    ` : ""}
  `;
}

async function runFutureScanPastSelf() {
  const history = futureScanPastSelfHistory();
  if (history.length < 2) return;
  futureScanStationError = "";
  futureScanStationLoading = "pastSelfCheck";
  openModal("futureScanStation", "pastSelfCheck");
  try {
    const historyText = history.map((entry, index) => `${index + 1}. (${entry.displayTime || ""}) "${cleanText(entry.content, 160)}"`).join(" ");
    const prompt = `${scanContextText("pastSelfCheck")} Things the user has actually written before, most recent first: ${historyText} Compare the CURRENT situation against these real past moments - where do they show a consistent pattern, and where does this choice seem to break from what they've said before? Only reference the entries given, never invent a past moment that isn't listed. Respond as strict JSON only: {"headline":"string","reading":"string","patterns":[{"comparison":"consistent|inconsistent|unclear","reason":"string"}]}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed || !Array.isArray(parsed.patterns)) throw new Error("Past-self check reply was not valid JSON.");
    const result = {
      headline: cleanText(parsed.headline || "Here's how this compares to your own history.", 200),
      reading: cleanText(parsed.reading || "", 400),
      patterns: parsed.patterns.slice(0, 5).map((item) => ({
        comparison: ["consistent", "inconsistent", "unclear"].includes(item.comparison) ? item.comparison : "unclear",
        reason: cleanText(item.reason || "", 220)
      })).filter((item) => item.reason),
      generatedAt: new Date().toISOString()
    };
    saveFutureScanStation("pastSelfCheck", result);
  } catch (error) {
    console.error("[Future Scan] Past-self check failed", error);
    futureScanStationError = "This check is having trouble running right now. Please try again.";
  } finally {
    futureScanStationLoading = "";
    openModal("futureScanStation", "pastSelfCheck");
  }
}

function futureScanDriftView() {
  const blueprint = latestBlueprint();
  const result = activeFutureScan.stations.driftDetector;
  if (!blueprint) {
    return `
      <p class="muted">Complete your Personal Blueprint first - drift is measured against the direction you actually said you wanted, not a generic one.</p>
      <button class="secondary-action compact-action" type="button" data-open="discoverYourself">Start Blueprint</button>
    `;
  }
  return `
    <p class="muted">Compares this choice against your saved values, goals, and recent reflections.</p>
    ${futureScanStationError ? `<p class="form-error">${escapeHTML(futureScanStationError)}</p>` : ""}
    <button class="primary-action mirror-run-action" type="button" data-run-scan-drift ${futureScanStationLoading === "driftDetector" ? "disabled" : ""}>${futureScanStationLoading === "driftDetector" ? "Scanning..." : result ? "Re-scan" : "Run Drift Detector"}</button>
    ${result ? `
      <span class="risk-pill ${result.drift === "drifting" ? "danger" : result.drift === "onTrack" ? "calm" : "light"}">${escapeHTML(result.drift)}</span>
      <div class="future-reflection-list">
        <p><strong>${escapeHTML(result.headline)}</strong></p>
        <p class="muted">${escapeHTML(result.reading)}</p>
        ${result.signals.map((item) => `<p class="tiny-note"><strong>${escapeHTML(item.label)}</strong>: ${escapeHTML(item.note)}</p>`).join("")}
      </div>
    ` : ""}
  `;
}

async function runFutureScanDrift() {
  const blueprint = latestBlueprint();
  if (!blueprint) return;
  futureScanStationError = "";
  futureScanStationLoading = "driftDetector";
  openModal("futureScanStation", "driftDetector");
  try {
    const goals = myRoadmapGoals();
    const recentReflections = futureScanPastSelfHistory();
    const context = [
      `Saved values: ${blueprint.values.join(", ")}.`,
      goals.length ? `Roadmap goals: ${goals.map((goal) => goal.title).join(", ")}.` : "No roadmap goals saved.",
      recentReflections.length ? `Recent things they've written, most recent first: ${recentReflections.map((entry) => `"${cleanText(entry.content, 140)}"`).join(" ")}` : "No recent reflections saved."
    ].join(" ");
    const prompt = `${scanContextText("driftDetector")} The user's saved direction: ${context} Based ONLY on this real saved data, does the current situation suggest they're on track toward that stated direction, slowly drifting from it, or is it unclear/not enough signal? Be honest if there isn't enough real data to tell either way - don't invent a trend that isn't actually supported. Respond as strict JSON only: {"headline":"string","reading":"string","drift":"onTrack|drifting|unclear","signals":[{"label":"string","note":"string"}]}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed) throw new Error("Drift detector reply was not valid JSON.");
    const result = {
      headline: cleanText(parsed.headline || "Here's where this choice sits relative to your direction.", 200),
      reading: cleanText(parsed.reading || "", 400),
      drift: ["onTrack", "drifting", "unclear"].includes(parsed.drift) ? parsed.drift : "unclear",
      signals: Array.isArray(parsed.signals) ? parsed.signals.slice(0, 5).map((item) => ({
        label: cleanText(item.label || "", 60),
        note: cleanText(item.note || "", 200)
      })).filter((item) => item.label) : [],
      generatedAt: new Date().toISOString()
    };
    saveFutureScanStation("driftDetector", result);
  } catch (error) {
    console.error("[Future Scan] Drift detector failed", error);
    futureScanStationError = "This scan is having trouble running right now. Please try again.";
  } finally {
    futureScanStationLoading = "";
    openModal("futureScanStation", "driftDetector");
  }
}

function futureScanCheckBackView() {
  const result = activeFutureScan.stations.checkBack;
  if (!result) {
    return `
      <p class="muted">Pick when to check back. Future Scan saves a short snapshot of where things stand now, then later asks what actually happened.</p>
      <div class="mirror-example-row">
        ${FUTURE_SCAN_CHECKBACK_HORIZONS.map((horizon) => `<button type="button" class="${futureScanCheckBackHorizon === horizon.id ? "is-selected" : ""}" data-scan-checkback-horizon="${horizon.id}">${escapeHTML(horizon.label)}</button>`).join("")}
      </div>
      ${futureScanStationError ? `<p class="form-error">${escapeHTML(futureScanStationError)}</p>` : ""}
      <button class="primary-action mirror-run-action" type="button" data-run-scan-checkback-schedule ${futureScanStationLoading === "checkBack" ? "disabled" : ""}>${futureScanStationLoading === "checkBack" ? "Scheduling..." : "Schedule Check-Back"}</button>
    `;
  }
  if (result.status === "scheduled") {
    const due = new Date(result.resurfaceAt).getTime() <= Date.now();
    return `
      <p class="eyebrow">Snapshot saved ${escapeHTML(result.scheduledDisplayTime || "")}</p>
      <p class="tiny-note">${escapeHTML(result.predictionNote)}</p>
      <p class="muted">${due ? "It's time - what actually happened?" : `We'll check back around ${escapeHTML(result.dueDisplayTime || "")}. You can also report back early any time.`}</p>
      <div class="admin-form">
        <label>What actually happened?
          <textarea id="scan-checkback-report" placeholder="Tell me what really happened">${escapeHTML(futureScanCheckBackReportText)}</textarea>
        </label>
      </div>
      ${futureScanStationError ? `<p class="form-error">${escapeHTML(futureScanStationError)}</p>` : ""}
      <button class="primary-action mirror-run-action" type="button" data-run-scan-checkback-report ${futureScanStationLoading === "checkBack" ? "disabled" : ""}>${futureScanStationLoading === "checkBack" ? "Comparing..." : "Compare with what I predicted"}</button>
    `;
  }
  return `
    <div class="future-reflection-list">
      <p><strong>${escapeHTML(result.headline)}</strong></p>
      <p class="muted">${escapeHTML(result.reading)}</p>
      <p class="tiny-note">Your snapshot: ${escapeHTML(result.predictionNote)}</p>
      <p class="tiny-note">What happened: ${escapeHTML(result.actualOutcome)}</p>
    </div>
    <button class="secondary-action compact-action" type="button" data-reset-scan-checkback>Schedule another check-back</button>
  `;
}

async function scheduleFutureScanCheckBack() {
  if (!futureScanCheckBackHorizon) {
    futureScanStationError = "Pick when you'd like to check back.";
    openModal("futureScanStation", "checkBack");
    return;
  }
  const horizon = FUTURE_SCAN_CHECKBACK_HORIZONS.find((item) => item.id === futureScanCheckBackHorizon);
  futureScanStationError = "";
  futureScanStationLoading = "checkBack";
  openModal("futureScanStation", "checkBack");
  try {
    const prompt = `${scanContextText("checkBack")} The user is about to wait ${horizon.label.toLowerCase()} before checking back on this. Write one short, concrete sentence capturing what they seem to expect or be hoping for right now, grounded only in what they told you - this becomes a snapshot they'll compare against reality later, so don't guess wildly beyond what's stated. Respond as strict JSON only: {"predictionNote":"string"}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed || !parsed.predictionNote) throw new Error("Check-back scheduling reply was not valid JSON.");
    const resurfaceAt = new Date(Date.now() + horizon.days * 86400000).toISOString();
    const result = {
      status: "scheduled",
      horizonId: horizon.id,
      predictionNote: cleanText(parsed.predictionNote, 260),
      scheduledAt: new Date().toISOString(),
      scheduledDisplayTime: new Date().toLocaleString([], { month: "short", day: "numeric" }),
      resurfaceAt,
      dueDisplayTime: new Date(resurfaceAt).toLocaleString([], { month: "short", day: "numeric" }),
      resurfacedAt: null,
      dismissedAt: null,
      ignoredCount: 0
    };
    saveFutureScanStation("checkBack", result);
    futureScanCheckBackHorizon = "";
  } catch (error) {
    console.error("[Future Scan] Check-back scheduling failed", error);
    futureScanStationError = "Scheduling is having trouble right now. Please try again.";
  } finally {
    futureScanStationLoading = "";
    openModal("futureScanStation", "checkBack");
  }
}

async function submitFutureScanCheckBackReport() {
  const existing = activeFutureScan.stations.checkBack;
  if (!existing) return;
  const textarea = document.querySelector("#scan-checkback-report");
  const report = cleanText(textarea ? textarea.value : futureScanCheckBackReportText, 500);
  if (!report) {
    futureScanStationError = "Tell me what actually happened first.";
    openModal("futureScanStation", "checkBack");
    return;
  }
  futureScanCheckBackReportText = report;
  futureScanStationError = "";
  futureScanStationLoading = "checkBack";
  openModal("futureScanStation", "checkBack");
  try {
    const prompt = `${scanContextText("checkBack")} Earlier snapshot of what the user seemed to expect: "${existing.predictionNote}". What actually happened, in their own words: "${report}". Compare the two honestly - where did reality match what they expected, and where did it differ? Be supportive but honest, not falsely encouraging. Respond as strict JSON only: {"headline":"string","reading":"string"}`;
    const reply = await requestCompassDirect(FUTURE_SCAN_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed) throw new Error("Check-back comparison reply was not valid JSON.");
    const result = {
      ...existing,
      status: "completed",
      actualOutcome: report,
      headline: cleanText(parsed.headline || "Here's how it compared.", 200),
      reading: cleanText(parsed.reading || "", 400),
      completedAt: new Date().toISOString()
    };
    saveFutureScanStation("checkBack", result);
    futureScanCheckBackReportText = "";
  } catch (error) {
    console.error("[Future Scan] Check-back comparison failed", error);
    futureScanStationError = "This comparison is having trouble running right now. Please try again.";
  } finally {
    futureScanStationLoading = "";
    openModal("futureScanStation", "checkBack");
  }
}

function resetFutureScanCheckBack() {
  if (!activeFutureScan) return;
  delete activeFutureScan.stations.checkBack;
  const stored = trackerState.futureScans.find((item) => item.id === activeFutureScan.id);
  if (stored && stored.stations) delete stored.stations.checkBack;
  saveTrackerState();
  futureScanCheckBackReportText = "";
  futureScanCheckBackHorizon = "";
  openModal("futureScanStation", "checkBack");
}

// ---- Build Mode -----------------------------------------------------------

function buildCoachCatalogText() {
  return BUILD_COACH_TYPES.map((coach) => `${coach.name}: ${coach.use}`).join("\n");
}

function buildLifeMomentsSection() {
  const moments = BUILD_LIFE_MOMENTS[buildMomentCategory] || [];
  return `
    <p class="eyebrow">Real-life moments</p>
    <div class="category-tabs build-moment-tabs">
      ${BUILD_LIFE_MOMENT_CATEGORIES.map((category) => `
        <button type="button" data-build-moment-category="${escapeHTML(category.id)}" class="${category.id === buildMomentCategory ? "is-selected" : ""}">
          <img src="assets/${escapeHTML(category.icon)}" alt="">
          ${escapeHTML(category.label)}
        </button>
      `).join("")}
    </div>
    <div class="mirror-example-row build-goal-chip-row">
      ${moments.map((moment) => `<button type="button" data-build-goal-chip="${escapeHTML(moment)}">${escapeHTML(moment)}</button>`).join("")}
    </div>
  `;
}

function buildSafeId(value, fallback) {
  const base = cleanText(value || fallback, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || fallback;
}

function buildGoalTokens(value) {
  return cleanText(value, 500)
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 2);
}

function localBuildCoachForGoal(goal) {
  const goalText = cleanText(goal, 500).toLowerCase();
  const tokens = buildGoalTokens(goalText);
  const scored = BUILD_COACH_TYPES.map((coach) => {
    const haystack = `${coach.id} ${coach.name} ${coach.use}`.toLowerCase();
    const tokenScore = tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
    const phraseScore = goalText && haystack.includes(goalText) ? 3 : 0;
    return { coach, score: tokenScore + phraseScore };
  }).sort((a, b) => b.score - a.score);
  return scored[0] && scored[0].score > 0
    ? scored[0].coach
    : BUILD_COACH_TYPES.find((coach) => coach.id === "custom");
}

function localBuildTrainingPath(goal, coach) {
  const shortGoal = cleanText(goal, 140) || "your goal";
  const coachName = coach && coach.name ? coach.name : "Custom Growth Coach";
  return normalizeTrainingPath([
    {
      id: "clarify-real-situation",
      title: "Clarify Your Real Situation",
      purpose: `Make "${shortGoal}" specific enough to practice instead of staying vague.`,
      trainingType: "coach conversation",
      openingPrompt: `Tell me the real situation behind "${shortGoal}". What is happening now, and what result would feel successful?`,
      coachInstructions: `${coachName} should ask one useful question at a time, identify the real barrier, and turn the answer into a practical next move.`,
      nextStep: "Share the real situation in your own words."
    },
    {
      id: "practice-one-scenario",
      title: "Practice One Real Scenario",
      purpose: "Turn the goal into a realistic practice conversation, decision, or planning drill.",
      trainingType: "guided practice",
      openingPrompt: `Let's practice one realistic moment connected to "${shortGoal}". Describe the moment you want to handle better, or ask me for an example first.`,
      coachInstructions: `${coachName} should roleplay, give examples, or adapt the practice based on what the user asks for.`,
      nextStep: "Choose one real situation to rehearse."
    },
    {
      id: "build-next-step",
      title: "Build the Next Step",
      purpose: "Create one small action the user can actually do this week.",
      trainingType: "action planning",
      openingPrompt: `What is one small step you could take this week for "${shortGoal}"? If you are unsure, I can suggest a low-pressure first step.`,
      coachInstructions: `${coachName} should make the plan realistic, safe, and flexible. Avoid pressure and avoid fake guarantees.`,
      nextStep: "Pick one action small enough to complete this week."
    }
  ], 3);
}

function createLocalBuildEntry(goal, reason = "") {
  const coach = localBuildCoachForGoal(goal);
  const trainingPath = localBuildTrainingPath(goal, coach);
  return ensureBuildEntryShape({
    id: `build-${Date.now()}`,
    user_id: currentUserId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    goal,
    coachType: coach.name,
    coachReason: reason
      ? `${coach.name} can still guide this goal while live AI is reconnecting.`
      : `${coach.name} fits the words and direction in your goal.`,
    goalSummary: cleanText(goal, 220),
    missingContext: ["What makes this goal difficult right now?", "What would a successful result look like?"],
    trainingPath,
    trainingSessions: [],
    nextStep: trainingPath[0] ? trainingPath[0].nextStep : "Start with one real situation.",
    status: "active"
  });
}

function normalizeTrainingModule(module, index, usedIds = new Set()) {
  const rawTitle = cleanText(module && module.title ? module.title : `Training ${index + 1}`, 80);
  const fallbackId = buildSafeId(rawTitle, `training-${index + 1}`);
  const rawId = buildSafeId(module && module.id ? module.id : fallbackId, fallbackId);
  let id = rawId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${rawId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return {
    id,
    title: rawTitle,
    purpose: cleanText(module && module.purpose ? module.purpose : "Practice one useful step for this goal.", 220),
    trainingType: cleanText(module && module.trainingType ? module.trainingType : "custom", 40),
    openingPrompt: cleanText(module && module.openingPrompt ? module.openingPrompt : "Tell me what you have tried so far, and I will guide the next practice step.", 280),
    coachInstructions: cleanText(module && module.coachInstructions ? module.coachInstructions : "Guide the user through one practical training step. Ask one question at a time.", 360),
    nextStep: cleanText(module && module.nextStep ? module.nextStep : "Start this training when you are ready.", 180)
  };
}

function normalizeTrainingPath(items, maxItems = 6) {
  const usedIds = new Set();
  return (Array.isArray(items) ? items : [])
    .slice(0, maxItems)
    .map((item, index) => normalizeTrainingModule(item, index, usedIds));
}

function normalizeBuildTrainingSession(session) {
  if (!session || typeof session !== "object") return null;
  const startedAt = Number.isNaN(new Date(session.startedAt).getTime()) ? new Date().toISOString() : session.startedAt;
  const messages = Array.isArray(session.messages)
    ? session.messages.map((message) => ({
        sender: message && message.sender === "user" ? "user" : "assistant",
        message: cleanText(message && message.message ? message.message : "", 900),
        createdAt: message && message.createdAt ? message.createdAt : startedAt,
        // pendingAi marks a message as still waiting for enhanceBuildTrainingReply()
        // to swap in the live AI reply - it MUST survive normalization, or every
        // render between the immediate local reply and the live reply arriving
        // erases the flag, enhanceBuildTrainingReply's lookup then finds nothing,
        // and the real AI reply is silently discarded (this was the actual bug:
        // the coach looked stuck on generic canned replies even though the AI
        // call itself was succeeding).
        ...(message && message.pendingAi ? { pendingAi: true } : {})
      })).filter((message) => message.message).slice(-40)
    : [];
  return {
    id: cleanText(session.id || `build-session-${Date.now()}`, 80),
    trainingId: cleanText(session.trainingId || "", 80),
    title: cleanText(session.title || "Training session", 90),
    trainingType: cleanText(session.trainingType || "custom", 40),
    startedAt,
    completedAt: session.completedAt || null,
    nextStep: cleanText(session.nextStep || "Continue this training when you are ready.", 220),
    messages: messages.length ? messages : [{ sender: "assistant", message: "Tell me where you want to continue, and I will guide the next practice step.", createdAt: startedAt }]
  };
}

function buildDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function ensureBuildEntryShape(entry) {
  if (!entry || typeof entry !== "object") return entry;
  entry.coachType = cleanText(entry.coachType || "Custom Growth Coach", 80);
  entry.coachReason = cleanText(entry.coachReason || "This coach fits the goal you entered.", 220);
  entry.goalSummary = cleanText(entry.goalSummary || entry.goal || "A practical growth goal.", 220);
  entry.missingContext = Array.isArray(entry.missingContext) ? entry.missingContext.map((item) => cleanText(item, 120)).filter(Boolean).slice(0, 3) : [];
  entry.trainingPath = normalizeTrainingPath(entry.trainingPath, 6);
  if (!entry.trainingPath.length && entry.actionBridge) {
    entry.trainingPath = normalizeTrainingPath([
      {
        id: "action-bridge",
        title: "Start the first action",
        purpose: entry.betterChoice || "Begin with the first concrete step.",
        trainingType: "planning",
        openingPrompt: entry.actionBridge.today || entry.actionBridge.fiveMinute || "Tell me what part feels hardest to start.",
        coachInstructions: "Help the user turn this older saved action bridge into one practical training step.",
        nextStep: entry.actionBridge.thisWeek || "Continue with the next small action this week."
      }
    ], 1);
  }
  entry.trainingSessions = Array.isArray(entry.trainingSessions)
    ? entry.trainingSessions.map(normalizeBuildTrainingSession).filter(Boolean).slice(0, 30)
    : [];
  entry.nextStep = cleanText(entry.nextStep || (entry.trainingPath[0] && entry.trainingPath[0].nextStep) || "Choose a training to begin.", 220);
  entry.status = entry.status || "active";
  return entry;
}

function myBuildEntries() {
  return trackerState.buildMode.entries
    .map(ensureBuildEntryShape)
    .filter((entry) => entry.user_id === currentUserId())
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function activeBuildEntry() {
  if (!activeBuildEntryId) return null;
  return myBuildEntries().find((entry) => entry.id === activeBuildEntryId) || null;
}

function openBuildEntry(entryId) {
  activeBuildEntryId = entryId;
  activeBuildTrainingSessionId = null;
  buildTrainingError = "";
  openModal("buildEntry", entryId);
}

function buildModeEntrySection() {
  const entries = myBuildEntries();
  return `
    <label>What are you trying to build?
      <textarea id="build-goal-input" placeholder="Example: prepare for an interview, talk to my parents, save money.">${escapeHTML(buildModeGoalInput)}</textarea>
    </label>
    ${buildLifeMomentsSection()}
    ${buildModeError ? `<p class="form-error">${escapeHTML(buildModeError)}</p>` : ""}
    <button class="primary-action mirror-run-action" type="button" data-start-build-entry ${isBuildModeLoading ? "disabled" : ""}>${isBuildModeLoading ? "Matching your coach..." : "Match My Coach"}</button>
    ${entries.length ? `
      <p class="eyebrow">Your coach plans</p>
      <div class="action-stack build-plan-list">
        ${entries.map((entry) => `
          <button class="wide-action" type="button" data-open-build-entry="${escapeHTML(entry.id)}">
            <img src="assets/icon-decide.png" alt="">
            <span><strong>${escapeHTML(cleanText(entry.goal, 70))}</strong><small>${escapeHTML(entry.coachType)} - ${entry.trainingPath.length} training${entry.trainingPath.length === 1 ? "" : "s"}</small></span>
          </button>
        `).join("")}
      </div>
    ` : ""}
  `;
}

function buildCoachCard(entry) {
  return `
    <section class="build-coach-card">
      <p class="eyebrow">Matched Coach</p>
      <h4>${escapeHTML(entry.coachType)}</h4>
      <p>${escapeHTML(entry.coachReason)}</p>
      <small>${escapeHTML(entry.goalSummary)}</small>
    </section>
  `;
}

function buildMissingContextSection(entry) {
  if (!entry.missingContext.length) return "";
  return `
    <div class="future-reflection-list">
      <p class="eyebrow">Helpful context to add later</p>
      ${entry.missingContext.map((item) => `<p class="tiny-note">${escapeHTML(item)}</p>`).join("")}
    </div>
  `;
}

function buildTrainingPathSection(entry) {
  if (!entry.trainingPath.length) return `<p class="muted">No training path was generated. Try creating a new coach plan.</p>`;
  return `
    <p class="eyebrow">Training Path</p>
    <div class="build-training-grid">
      ${entry.trainingPath.map((module, index) => `
        <article class="build-training-card">
          <span>${String(index + 1).padStart(2, "0")} - ${escapeHTML(module.trainingType)}</span>
          <h4>${escapeHTML(module.title)}</h4>
          <p>${escapeHTML(module.purpose)}</p>
          <button class="secondary-action compact-action" type="button" data-start-build-training="${escapeHTML(module.id)}">Start training</button>
        </article>
      `).join("")}
    </div>
  `;
}

function buildTrainingSessionById(entry, sessionId) {
  return entry && Array.isArray(entry.trainingSessions)
    ? entry.trainingSessions.find((session) => session.id === sessionId)
    : null;
}

function buildTrainingModuleById(entry, trainingId) {
  return entry && Array.isArray(entry.trainingPath)
    ? entry.trainingPath.find((module) => module.id === trainingId)
    : null;
}

function activeBuildTrainingSession() {
  const entry = activeBuildEntry();
  return buildTrainingSessionById(entry, activeBuildTrainingSessionId);
}

function buildCoachFreedomPrompts() {
  return [
    "Ask me one question first",
    "Give me a realistic example",
    "Change this training to fit my situation",
    "Make this less rigid and more practical"
  ];
}

function buildSessionListSection(entry) {
  const sessions = (entry.trainingSessions || []).slice(0, 5);
  if (!sessions.length) return "";
  return `
    <p class="eyebrow">Recent training</p>
    <div class="future-reflection-list">
      ${sessions.map((session) => `
        <article class="future-reflection-item">
          <div>
            <strong>${escapeHTML(session.title)}</strong>
            <p>${escapeHTML(session.nextStep || "Continue when ready.")}</p>
            <small>${session.completedAt ? "Completed" : "In progress"} - ${escapeHTML(buildDateLabel(session.startedAt))}</small>
          </div>
          <button class="secondary-action compact-action" type="button" data-open-build-training="${escapeHTML(session.id)}">Open</button>
        </article>
      `).join("")}
    </div>
  `;
}

function buildNextStepSection(entry) {
  return `
    <div class="future-reflection-list">
      <p class="eyebrow">Next Step</p>
      <p>${escapeHTML(entry.nextStep)}</p>
    </div>
  `;
}

function buildEntryModal(entryId) {
  const entry = myBuildEntries().find((item) => item.id === entryId);
  if (!entry) {
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="build-entry-title">
        <div class="modal-top">
          <span class="risk-pill calm">Build Mode</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="build-entry-title">This build isn't available.</h3>
      </div>
    `;
  }
  return `
    <div class="modal-card assessment-modal future-self-modal" role="dialog" aria-modal="true" aria-labelledby="build-entry-title">
      <div class="modal-top">
        <span class="risk-pill calm">Build Mode</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="build-entry-title">${escapeHTML(cleanText(entry.goal, 80))}</h3>
      ${buildCoachCard(entry)}
      ${buildMissingContextSection(entry)}
      ${buildTrainingPathSection(entry)}
      ${buildSessionListSection(entry)}
      ${buildNextStepSection(entry)}
    </div>
  `;
}

async function startBuildEntry() {
  const inputEl = document.querySelector("#build-goal-input");
  const goal = cleanText(inputEl ? inputEl.value : buildModeGoalInput, 200);
  if (!goal) {
    buildModeError = "Tell me what you want to work on first.";
    renderScreen("future");
    return;
  }
  buildModeGoalInput = goal;
  buildModeError = "";
  isBuildModeLoading = true;
  renderScreen("future");
  try {
    const prompt = `User goal: "${goal}".
Saved real context, if any:
${realGrowthFactsText()}

Coach catalog:
${buildCoachCatalogText()}

Match the best coach for this goal. Do NOT limit yourself to interview, study, or money; choose the coach that fits the user's actual need, or Custom Growth Coach if no specialist fits. Create a training path with 3 to 5 interactive trainings. Training modules should be things the user can actually practice with AI: roleplay, script-builder, planning drill, active recall, decision simulation, application planner, routine builder, confidence exposure, etc. Avoid proof logs, scores, badges, and generic advice.

Respond as strict JSON only:
{"coachType":"string","coachReason":"string","goalSummary":"string","missingContext":["string"],"trainingPath":[{"id":"short-kebab-id","title":"string","purpose":"string","trainingType":"string","openingPrompt":"string","coachInstructions":"string","nextStep":"string"}],"nextStep":"string"}`;
    const reply = await requestCompassDirect(BUILD_MODE_SYSTEM_PROMPT, prompt);
    const parsed = extractJsonObject(reply);
    if (!parsed || !Array.isArray(parsed.trainingPath)) throw new Error("Coach router reply was not valid JSON.");
    const trainingPath = normalizeTrainingPath(parsed.trainingPath, 5);
    if (!trainingPath.length) throw new Error("Coach router returned no training modules.");
    const entry = ensureBuildEntryShape({
      id: `build-${Date.now()}`,
      user_id: currentUserId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      goal,
      coachType: cleanText(parsed.coachType || "Custom Growth Coach", 80),
      coachReason: cleanText(parsed.coachReason || "", 240),
      goalSummary: cleanText(parsed.goalSummary || goal, 220),
      missingContext: Array.isArray(parsed.missingContext) ? parsed.missingContext : [],
      trainingPath,
      trainingSessions: [],
      nextStep: cleanText(parsed.nextStep || trainingPath[0].nextStep, 220),
      status: "active"
    });
    trackerState.buildMode.entries.push(entry);
    saveTrackerState();
    buildModeGoalInput = "";
    openBuildEntry(entry.id);
  } catch (error) {
    console.error("[Build Mode] Coach matching failed", error);
    const fallbackEntry = createLocalBuildEntry(goal, error && error.message ? error.message : "AI unavailable");
    trackerState.buildMode.entries.push(fallbackEntry);
    saveTrackerState();
    buildModeGoalInput = "";
    buildModeError = "";
    openBuildEntry(fallbackEntry.id);
  } finally {
    isBuildModeLoading = false;
    renderScreen("future");
  }
}

function startBuildTraining(trainingId) {
  const entry = activeBuildEntry();
  if (!entry) return;
  const module = buildTrainingModuleById(entry, trainingId);
  if (!module) return;
  const session = {
    id: `build-session-${Date.now()}`,
    trainingId: module.id,
    title: module.title,
    trainingType: module.trainingType,
    startedAt: new Date().toISOString(),
    completedAt: null,
    nextStep: module.nextStep,
    messages: [
      { sender: "assistant", message: module.openingPrompt, createdAt: new Date().toISOString() }
    ]
  };
  entry.trainingSessions.unshift(session);
  entry.updatedAt = new Date().toISOString();
  saveTrackerState();
  activeBuildTrainingSessionId = session.id;
  buildTrainingError = "";
  buildTrainingDraft = "";
  openModal("buildTraining", session.id);
}

function openBuildTraining(sessionId) {
  const entry = activeBuildEntry();
  if (!entry) return;
  const session = buildTrainingSessionById(entry, sessionId);
  if (!session) return;
  activeBuildTrainingSessionId = session.id;
  buildTrainingError = "";
  buildTrainingDraft = "";
  openModal("buildTraining", session.id);
}

function buildTrainingModal(sessionId) {
  const entry = activeBuildEntry();
  const session = buildTrainingSessionById(entry, sessionId);
  if (!entry || !session) {
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="build-training-title">
        <div class="modal-top">
          <span class="risk-pill calm">Training</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="build-training-title">This training isn't available.</h3>
      </div>
    `;
  }
  const messages = (session.messages || []).filter((message) => cleanText(message && message.message, 900));
  return `
    <div class="modal-card assessment-modal future-self-modal build-training-modal" role="dialog" aria-modal="true" aria-labelledby="build-training-title">
      <div class="modal-top">
        <span class="risk-pill calm">${escapeHTML(entry.coachType)}</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="build-training-title">${escapeHTML(session.title)}</h3>
      <p class="muted">${escapeHTML(entry.goalSummary)}</p>
      <section class="build-free-coach-note">
        <strong>You are not locked into this exercise.</strong>
        <span>Tell the coach your real situation, ask for another approach, or change direction anytime.</span>
      </section>
      <div class="build-training-chat">
        ${messages.map((message) => `
          <div class="build-training-message ${message.sender === "user" ? "is-user" : "is-ai"}">
            <p>${escapeHTML(message.message)}</p>
          </div>
        `).join("")}
        ${isBuildTrainingLoading ? `<div class="build-training-message is-ai"><p>Coach is thinking...</p></div>` : ""}
      </div>
      ${buildTrainingError ? `<p class="form-error">${escapeHTML(buildTrainingError)}</p>` : ""}
      ${session.completedAt ? `<p class="tiny-note"><strong>Next:</strong> ${escapeHTML(session.nextStep || entry.nextStep)}</p>` : `
        <div class="build-coach-prompt-row">
          ${buildCoachFreedomPrompts().map((prompt) => `<button type="button" data-build-coach-prompt="${escapeHTML(prompt)}" ${isBuildTrainingLoading ? "disabled" : ""}>${escapeHTML(prompt)}</button>`).join("")}
        </div>
        <textarea id="build-training-input" placeholder="Say anything. Add context, ask a question, or tell the coach to change direction." data-build-training-draft>${escapeHTML(buildTrainingDraft)}</textarea>
        <button class="primary-action mirror-run-action" type="button" data-send-build-training ${isBuildTrainingLoading ? "disabled" : ""}>${isBuildTrainingLoading ? "Training..." : "Send freely"}</button>
        <p class="tiny-note">Tip: Ctrl + Enter sends without losing your text.</p>
      `}
      <div class="profile-actions">
        <button class="secondary-action compact-action" type="button" data-open-build-entry="${escapeHTML(entry.id)}">Back to plan</button>
        ${session.completedAt ? "" : `<button class="secondary-action compact-action" type="button" data-finish-build-training>Finish training</button>`}
      </div>
    </div>
  `;
}

function buildTrainingSafetyReply() {
  return {
    reply: "I want to keep this safe. If there is immediate danger or you might hurt yourself or someone else, contact a trusted person now and use local emergency support. If this is not immediate danger, tell me what happened in one sentence and we will slow the situation down together.",
    nextStep: "Contact a trusted person if there is any immediate risk."
  };
}

function buildTrainingExampleFor(entry, module) {
  const goal = cleanText(entry && entry.goal ? entry.goal : "your goal", 140);
  const coachType = cleanText(entry && entry.coachType ? entry.coachType : "coach", 80).toLowerCase();
  const title = cleanText(module && module.title ? module.title : "this training", 90);
  const goalText = goal.toLowerCase();
  if (goalText.includes("business") || coachType.includes("entrepreneur")) {
    return `Here is a realistic example for "${goal}": instead of saying "I want to start a business", the user chooses one small test. Example: "I want to sell affordable study planners to students who keep missing deadlines. This week I will ask 5 students what they struggle with, then make one simple sample." Your turn: what customer, problem, and tiny test would fit you?`;
  }
  if (goalText.includes("interview") || coachType.includes("interview")) {
    return `Here is a realistic example for "${goal}": the user prepares one STAR story instead of memorising perfect answers. Situation: group project conflict. Task: keep the team moving. Action: clarify roles and message the group. Result: submission finished on time. Your turn: what real experience could become your strongest story?`;
  }
  if (goalText.includes("study") || goalText.includes("exam") || coachType.includes("study")) {
    return `Here is a realistic example for "${goal}": the user stops planning the whole subject and starts with one 25-minute active recall block. They close distractions, write what they remember, check mistakes, then repeat the weakest part. Your turn: what topic would you test yourself on first?`;
  }
  if (goalText.includes("money") || goalText.includes("save") || coachType.includes("money")) {
    return `Here is a realistic example for "${goal}": the user does not try to become perfect with money. They pick one leak, like drinks or delivery food, set a weekly limit, and move a small amount into savings first. Your turn: where does money disappear fastest for you?`;
  }
  return `Here is a realistic example for "${goal}": the user turns "${title}" into one real situation, one small practice, and one next action. They do not try to fix everything today. They choose the first moment where the goal shows up, practise the response, then test it in real life. Your turn: what is the first real moment where this goal shows up for you?`;
}

function buildTrainingQuestionFor(entry, module) {
  const goal = cleanText(entry && entry.goal ? entry.goal : "your goal", 140);
  const moduleTitle = cleanText(module && module.title ? module.title : "this training", 90);
  return `Let's make this useful for your real life. For "${goal}", what is the exact situation you want help with in "${moduleTitle}"? You can answer with one sentence, for example: who is involved, what is difficult, and what result you want.`;
}

function buildTrainingAdaptiveReply(entry, session, module, userText) {
  const text = cleanText(userText, 900);
  const lower = text.toLowerCase();
  if (/(self[-\s]?harm|suicide|kill myself|hurt myself|danger|abuse|emergency)/i.test(text)) {
    return buildTrainingSafetyReply();
  }
  if (lower.includes("example") || lower.includes("sample")) {
    return {
      reply: buildTrainingExampleFor(entry, module),
      nextStep: "Adapt the example into your own real situation."
    };
  }
  if (lower.includes("question") || lower.includes("ask me")) {
    return {
      reply: buildTrainingQuestionFor(entry, module),
      nextStep: "Answer the coach question with your real context."
    };
  }
  if (lower.includes("change") || lower.includes("fit") || lower.includes("less rigid") || lower.includes("different")) {
    return {
      reply: `Yes, we can change direction. We do not need to follow the original exercise. For "${cleanText(entry.goal, 140)}", choose the style you want now: a realistic example, a roleplay, a step-by-step plan, or help deciding what to do first. Which one would help you most?`,
      nextStep: "Choose the training style that fits the current need."
    };
  }
  return {
    reply: `I hear you: "${text}". Let's turn that into practice. The useful move is to make it smaller and more concrete: what is one real situation, one action you can control, and one sign that the action worked? For your goal "${cleanText(entry.goal, 140)}", tell me the part that feels hardest right now, and I will coach the next step from there.`,
    nextStep: "Name the hardest part so the coach can adapt the practice."
  };
}

function requestBuildCoachReply(prompt, timeoutMs = 6500) {
  let timeoutId = 0;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("Build coach request timed out.")), timeoutMs);
  });
  return Promise.race([
    requestCompassDirect(BUILD_MODE_SYSTEM_PROMPT, prompt),
    timeout
  ]).finally(() => window.clearTimeout(timeoutId));
}

async function enhanceBuildTrainingReply(entryId, sessionId, assistantCreatedAt, prompt) {
  try {
    const reply = await requestBuildCoachReply(prompt, 9000);
    const parsed = extractJsonObject(reply);
    const coachReply = cleanText(parsed && parsed.reply ? parsed.reply : reply, 900);
    if (!coachReply) return;
    const entry = trackerState.buildMode.entries.find((item) => item.id === entryId && item.user_id === currentUserId());
    const session = buildTrainingSessionById(entry, sessionId);
    if (!entry || !session || session.completedAt) return;
    const pendingMessage = (session.messages || []).find((message) => (
      message.sender === "assistant" &&
      message.createdAt === assistantCreatedAt &&
      message.pendingAi === true
    ));
    if (!pendingMessage) return;
    pendingMessage.message = coachReply;
    pendingMessage.pendingAi = false;
    session.nextStep = cleanText(parsed && parsed.nextStep ? parsed.nextStep : session.nextStep || entry.nextStep, 220);
    if (parsed && parsed.finished === true) session.completedAt = new Date().toISOString();
    entry.nextStep = session.nextStep || entry.nextStep;
    entry.updatedAt = new Date().toISOString();
    saveTrackerState();
    if (activeBuildEntryId === entry.id && activeBuildTrainingSessionId === session.id && modalLayer.classList.contains("is-open")) {
      openModal("buildTraining", session.id);
    }
  } catch (error) {
    console.error("[Build Mode] Live coach refinement failed; local coach reply kept.", error);
  }
}

async function sendBuildTrainingReply(forcedText = "") {
  const entry = activeBuildEntry();
  const session = activeBuildTrainingSession();
  if (!entry || !session || session.completedAt) return;
  if (isBuildTrainingLoading) return;
  const input = modalLayer.querySelector("#build-training-input");
  const rawText = forcedText || (input ? input.value : buildTrainingDraft);
  const text = cleanText(rawText, 900);
  if (!text) {
    buildTrainingDraft = rawText || buildTrainingDraft;
    buildTrainingError = "Write a reply first.";
    openModal("buildTraining", session.id);
    return;
  }
  session.messages.push({ sender: "user", message: text, createdAt: new Date().toISOString() });
  buildTrainingDraft = "";
  saveTrackerState();
  buildTrainingError = "";
  const module = buildTrainingModuleById(entry, session.trainingId);
  const fallback = buildTrainingAdaptiveReply(entry, session, module, text);
  const assistantCreatedAt = new Date().toISOString();
  session.messages.push({ sender: "assistant", message: fallback.reply, createdAt: assistantCreatedAt, pendingAi: true });
  session.nextStep = cleanText(fallback.nextStep || session.nextStep || entry.nextStep, 220);
  entry.nextStep = session.nextStep || entry.nextStep;
  entry.updatedAt = new Date().toISOString();
  saveTrackerState();
  isBuildTrainingLoading = false;
  openModal("buildTraining", session.id);
  try {
    const transcript = session.messages.slice(-10).map((message) => `${message.sender}: ${message.message}`).join("\n");
    const prompt = `Coach plan:
Goal: ${entry.goal}
Matched coach: ${entry.coachType}
Goal summary: ${entry.goalSummary}
Training title: ${session.title}
Training type: ${session.trainingType}
Coach instructions: ${module ? module.coachInstructions : "Guide one practical training step."}

Conversation so far:
${transcript}

Respond as the coach. Keep it interactive: answer directly, give one concrete improvement or next practice move, then ask at most one next question if needed. The user is allowed to change the exercise, ask for examples, add context, or move to a different training angle. Do not force the original prompt. If they ask to change direction, adapt the training to the user's real need. Do not turn this into a checklist. This is training guidance, not a formal feedback scorecard and not a proof log. Prefer strict JSON only: {"reply":"string","nextStep":"string","finished":false}. If you cannot produce JSON, still answer naturally.`;
    void enhanceBuildTrainingReply(entry.id, session.id, assistantCreatedAt, prompt);
  } catch (error) {
    console.error("[Build Mode] Could not start live coach refinement; local coach reply kept.", error);
  }
}

function finishBuildTrainingSession() {
  const entry = activeBuildEntry();
  const session = activeBuildTrainingSession();
  if (!entry || !session) return;
  session.completedAt = new Date().toISOString();
  entry.nextStep = session.nextStep || entry.nextStep;
  entry.updatedAt = new Date().toISOString();
  saveTrackerState();
  renderScreen("future");
  openModal("buildEntry", entry.id);
}

async function sendChatMessage(text) {
  const clean = text.trim();
  if (!clean || isCompassResponding) return;
  chatState.messages.push({ from: "user", text: clean });
  saveChatState();
  isCompassResponding = true;
  renderScreen("compass");
  try {
    const reply = await requestCompassAI(clean);
    chatState.messages.push({ from: "assistant", text: reply });
    saveChatState();
    speak(reply);
  } catch (error) {
    console.error("[Compass AI] Request failed", error);
    chatState.messages.push({ from: "assistant", text: COMPASS_API_ERROR, local: true });
    saveChatState();
  } finally {
    isCompassResponding = false;
    renderScreen("compass");
  }
}

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = authEmailInput.value.trim();
  const username = cleanUsername(authUsernameInput.value);
  if (!isGmailAddress(email)) {
    authError.textContent = "Please enter a Gmail address.";
    return;
  }
  if (username.length < 2) {
    authError.textContent = "Please enter at least 2 characters for username.";
    return;
  }
  userProfile.email = email;
  userProfile.username = username;
  userProfile.role = authAdminPassInput.value.trim() === ADMIN_PASSCODE ? "admin" : "user";
  saveUserProfile();
  applyScopedTrackerState();
  applyScopedChatState();
  saveTrackerState();
  hideAuth();
  if (!userProfile.characterCreated) {
    showCharacterCreation();
  } else {
    renderScreen("home");
    refreshStaticScreens();
  }
});

function showCharacterCreation() {
  if (!characterCreationLayer) return;
  characterCreationLayer.classList.add("is-open");
  characterCreationLayer.setAttribute("aria-hidden", "false");
}

function hideCharacterCreation() {
  if (!characterCreationLayer) return;
  characterCreationLayer.classList.remove("is-open");
  characterCreationLayer.setAttribute("aria-hidden", "true");
}

function showOpeningNarrative() {
  if (!openingNarrativeLayer) return;
  openingNarrativeLayer.classList.add("is-open");
  openingNarrativeLayer.setAttribute("aria-hidden", "false");
}

function hideOpeningNarrative() {
  if (!openingNarrativeLayer) return;
  openingNarrativeLayer.classList.remove("is-open");
  openingNarrativeLayer.setAttribute("aria-hidden", "true");
}

if (characterCreationForm) {
  characterCreationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(characterCreationForm);
    userProfile.ageGroup = String(formData.get("ageGroup") || "young-adult");
    userProfile.background = String(formData.get("background") || "fresh-graduate");
    userProfile.startingTrait = String(formData.get("startingTrait") || "disciplined");
    userProfile.difficulty = String(formData.get("difficulty") || "standard");
    saveUserProfile();
    hideCharacterCreation();
    showOpeningNarrative();
  });
}

if (openingNarrativeContinueButton) {
  openingNarrativeContinueButton.addEventListener("click", () => {
    const engine = lifeVerseEngine();
    if (engine && engine.createInitialState) {
      trackerState.lifeVerse = engine.createInitialState({ profile: userProfile, applyCharacterCreation: true });
      saveTrackerState();
    }
    userProfile.characterCreated = true;
    saveUserProfile();
    hideOpeningNarrative();
    renderScreen("home");
    refreshStaticScreens();
  });
}

navItems.forEach((item) => {
  item.addEventListener("click", () => renderScreen(item.dataset.tab));
});

document.addEventListener("click", async (event) => {
  const opener = event.target.closest("[data-open]");
  const closer = event.target.closest("[data-close]");
  const tabJump = event.target.closest("[data-tab-jump]");
  const openLink = event.target.closest("[data-open-link]");
  const chatPrompt = event.target.closest("[data-chat-prompt]");
  const growthPrompt = event.target.closest("[data-growth-prompt]");
  const inspireCategoryButton = event.target.closest("[data-inspire-category]");
  const opportunityCategoryButton = event.target.closest("[data-opportunity-category]");
  const opportunityAi = event.target.closest("[data-opportunity-ai]");
  const futureMirrorModeButton = event.target.closest("[data-future-mirror-mode]");
  const scanFromEntry = event.target.closest("[data-scan-from-entry]");
  const startFutureScanButton = event.target.closest("[data-start-future-scan]");
  const scanClarifyChip = event.target.closest("[data-scan-clarify-chip]");
  const submitFutureScanClarifyButton = event.target.closest("[data-submit-future-scan-clarify]");
  const resetFutureScanButton = event.target.closest("[data-reset-future-scan]");
  const scanIdentityPick = event.target.closest("[data-scan-identity-pick]");
  const runScanIdentityButton = event.target.closest("[data-run-scan-identity]");
  const runScanValuesButton = event.target.closest("[data-run-scan-values]");
  const runScanCostsButton = event.target.closest("[data-run-scan-costs]");
  const runScanNoActionButton = event.target.closest("[data-run-scan-noaction]");
  const scanPressurePick = event.target.closest("[data-scan-pressure-pick]");
  const runScanPressureButton = event.target.closest("[data-run-scan-pressure]");
  const runScanConflictButton = event.target.closest("[data-run-scan-conflict]");
  const scanSignalPick = event.target.closest("[data-scan-signal-pick]");
  const runScanSignalButton = event.target.closest("[data-run-scan-signal]");
  const runScanPastSelfButton = event.target.closest("[data-run-scan-pastself]");
  const runScanDriftButton = event.target.closest("[data-run-scan-drift]");
  const scanCheckBackHorizonButton = event.target.closest("[data-scan-checkback-horizon]");
  const runScanCheckBackScheduleButton = event.target.closest("[data-run-scan-checkback-schedule]");
  const runScanCheckBackReportButton = event.target.closest("[data-run-scan-checkback-report]");
  const resetScanCheckBackButton = event.target.closest("[data-reset-scan-checkback]");
  const runScanSynthesisButton = event.target.closest("[data-run-scan-synthesis]");
  const openPastScanButton = event.target.closest("[data-open-past-scan]");
  const jumpFutureScanButton = event.target.closest("[data-jump-future-scan]");
  const jumpBuildModeButton = event.target.closest("[data-jump-build-mode]");
  const buildGoalChipButton = event.target.closest("[data-build-goal-chip]");
  const buildMomentCategoryButton = event.target.closest("[data-build-moment-category]");
  const startBuildEntryButton = event.target.closest("[data-start-build-entry]");
  const openBuildEntryButton = event.target.closest("[data-open-build-entry]");
  const startBuildTrainingButton = event.target.closest("[data-start-build-training]");
  const openBuildTrainingButton = event.target.closest("[data-open-build-training]");
  const sendBuildTrainingButton = event.target.closest("[data-send-build-training]");
  const buildCoachPromptButton = event.target.closest("[data-build-coach-prompt]");
  const finishBuildTrainingButton = event.target.closest("[data-finish-build-training]");
  const saveFutureReflection = event.target.closest("[data-save-future-reflection]");
  const copyCommunityPrompt = event.target.closest("[data-copy-community-prompt]");
  const clearChat = event.target.closest("[data-clear-chat]");
  const moodChoice = event.target.closest("[data-mood-choice]");
  const sendChat = event.target.closest("[data-send-chat]");
  const voiceChat = event.target.closest("[data-voice-chat]");
  const submitAssessment = event.target.closest("[data-submit-assessment]");
  const exploreReadinessFuture = event.target.closest("[data-explore-readiness-future]");
  const readinessAi = event.target.closest("[data-readiness-ai]");
  const nextAssessment = event.target.closest("[data-next-assessment]");
  const prevAssessment = event.target.closest("[data-prev-assessment]");
  const saveBlueprintSessionButton = event.target.closest("[data-save-blueprint-session]");
  const prevBlueprintSession = event.target.closest("[data-prev-blueprint-session]");
  const closeAndOpen = event.target.closest("[data-close-and-open]");
  const futureSelfHorizonButton = event.target.closest("[data-future-self-horizon]");
  const generateFutureSelfButton = event.target.closest("[data-generate-future-self]");
  const saveDailyReflectionButton = event.target.closest("[data-save-daily-reflection]");
  const saveWeeklyLetterButton = event.target.closest("[data-save-weekly-letter]");
  const saveMilestoneLetterButton = event.target.closest("[data-save-milestone-letter]");
  const resurfaceActionButton = event.target.closest("[data-resurface-action]");
  const generateRoadmapButton = event.target.closest("[data-generate-roadmap]");
  const roadmapViewButton = event.target.closest("[data-roadmap-view]");
  const setMilestoneStatusButton = event.target.closest("[data-set-milestone-status]");
  const startInterviewButton = event.target.closest("[data-start-interview]");
  const sendInterviewAnswerButton = event.target.closest("[data-send-interview-answer]");
  const saveResumeDraftButton = event.target.closest("[data-save-resume-draft]");
  const polishResumeButton = event.target.closest("[data-polish-resume]");
  const copyResumeButton = event.target.closest("[data-copy-resume]");
  const exportVaultButton = event.target.closest("[data-export-vault]");
  const saveMood = event.target.closest("[data-save-mood]");
  const demoReceipt = event.target.closest("[data-demo-receipt]");
  const saveReceipt = event.target.closest("[data-save-receipt]");
  const saveProfile = event.target.closest("[data-save-profile]");
  const saveAiProfile = event.target.closest("[data-save-ai-profile]");
  const completeMission = event.target.closest("[data-complete-mission]");
  const saveVoice = event.target.closest("[data-save-voice]");
  const startRoleplay = event.target.closest("[data-start-roleplay]");
  const sendRoleplay = event.target.closest("[data-send-roleplay]");
  const finishRoleplay = event.target.closest("[data-finish-roleplay]");
  const saveContact = event.target.closest("[data-save-contact]");
  const editContact = event.target.closest("[data-edit-contact]");
  const deleteContact = event.target.closest("[data-delete-contact]");
  const messageContact = event.target.closest("[data-message-contact]");
  const saveGrowthGoals = event.target.closest("[data-save-growth-goals]");
  const calcCostOfLiving = event.target.closest("[data-calc-cost-of-living]");
  const saveJournal = event.target.closest("[data-save-journal]");
  const startChallenge = event.target.closest("[data-start-challenge]");
  const saveCommunityPost = event.target.closest("[data-save-community-post]");
  const communityAuthModeButton = event.target.closest("[data-community-auth-mode]");
  const communitySignUpButton = event.target.closest("[data-community-sign-up]");
  const communitySignInButton = event.target.closest("[data-community-sign-in]");
  const communitySignOutButton = event.target.closest("[data-community-sign-out]");
  const communityComposeAssistButton = event.target.closest("[data-community-compose-assist]");
  const joinSquadButton = event.target.closest("[data-join-squad]");
  const leaveSquadButton = event.target.closest("[data-leave-squad]");
  const saveSquadButton = event.target.closest("[data-save-squad]");
  const shareMilestoneCommunityButton = event.target.closest("[data-share-milestone-community]");
  const saveAccountabilityOptInButton = event.target.closest("[data-save-accountability-optin]");
  const sendAccountabilityRequestButton = event.target.closest("[data-send-accountability-request]");
  const acceptAccountabilityRequestButton = event.target.closest("[data-accept-accountability-request]");
  const declineAccountabilityRequestButton = event.target.closest("[data-decline-accountability-request]");
  const saveContactHintButton = event.target.closest("[data-save-contact-hint]");
  const submitMentorApplicationButton = event.target.closest("[data-submit-mentor-application]");
  const saveCommunityOpportunityButton = event.target.closest("[data-save-community-opportunity]");
  const saveOpportunity = event.target.closest("[data-save-opportunity]");
  const shareOpportunity = event.target.closest("[data-share-opportunity]");
  const storyReader = event.target.closest("[data-story-id]");
  const discussStory = event.target.closest("[data-discuss-story]");
  const storyAiAction = event.target.closest("[data-story-ai-action]");
  const editStory = event.target.closest("[data-edit-story]");
  const deleteStory = event.target.closest("[data-delete-story]");
  const saveStory = event.target.closest("[data-save-story]");
  const saveAdmin = event.target.closest("[data-save-admin-settings]");
  const signOut = event.target.closest("[data-sign-out]");
  const simActivity = event.target.closest("[data-sim-activity]");
  const simFastForward = event.target.closest("[data-sim-fast-forward]");
  const simReset = event.target.closest("[data-sim-reset]");
  const lifeVerseTab = event.target.closest("[data-lifeverse-tab]");
  const lifeVerseActivity = event.target.closest("[data-lifeverse-activity]");
  const lifeVerseSystemAction = event.target.closest("[data-lifeverse-system-action]");
  const lifeVerseFastForward = event.target.closest("[data-lifeverse-fast-forward]");
  const lifeVerseReportNow = event.target.closest("[data-lifeverse-report-now]");
  const lifeVerseReset = event.target.closest("[data-lifeverse-reset]");
  const lifeVerseTravel = event.target.closest("[data-lifeverse-travel]");
  const dismissSystemTutorial = event.target.closest("[data-dismiss-system-tutorial]");
  const lifeVerseInterventionChoice = event.target.closest("[data-lifeverse-intervention-choice]");

  if (opener) {
    if (opener.dataset.open === "communityPost") setPendingMilestoneShare(null);
    openModal(opener.dataset.open, opener.dataset.reflectionId || opener.dataset.openPayload || "");
  }
  if (dismissSystemTutorial) {
    trackerState.systemTutorialsSeen[dismissSystemTutorial.dataset.dismissSystemTutorial] = true;
    saveTrackerState();
    renderScreen("simulator");
  }
  if (lifeVerseTravel) {
    const destinationId = lifeVerseTravel.dataset.lifeverseTravel;
    // Closing the map overlay goes through renderScreen("simulator"), which
    // always remounts the 3D scene from scratch (see mountLifeSim) - calling
    // teleportTo() on the live instance here would just get thrown away.
    // Queue the destination so the remount itself spawns there instead.
    pendingTeleportLocationId = destinationId;
    trackerState.lifeSim.currentLocation = destinationId;
    saveTrackerState();
    trackerState.lifeVerse = lifeVerseState();
    trackerState.lifeVerse.activeView = "today";
    renderScreen("simulator");
  }
  if (tabJump) {
    if (tabJump.dataset.tabJump === "simulator") setLifeVerseDefaultWorldView();
    renderScreen(tabJump.dataset.tabJump);
  }
  if (openLink) {
    const url = safeExternalUrl(openLink.dataset.openLink);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }
  if (lifeVerseTab) {
    trackerState.lifeVerse = lifeVerseState();
    trackerState.lifeVerse.activeView = lifeVerseTab.dataset.lifeverseTab || "today";
    if (trackerState.lifeVerse.activeView === "journal" || trackerState.lifeVerse.activeView === "report") {
      trackerState.lifeSim.reportPromptReady = false;
    }
    saveTrackerState();
    renderScreen("simulator");
  }
  if (lifeVerseActivity) {
    const result = performLifeVerseActivity(lifeVerseActivity.dataset.lifeverseActivity);
    if (result && !result.error) {
      saveTrackerState();
      renderScreen("simulator");
      refreshStaticScreens();
    }
  }
  if (lifeVerseSystemAction) {
    const [systemId, actionId] = String(lifeVerseSystemAction.dataset.lifeverseSystemAction || "").split(":");
    const result = performLifeVerseSystemAction(systemId, actionId);
    if (result && !result.error) {
      saveTrackerState();
      renderScreen("simulator");
      refreshStaticScreens();
    }
  }
  if (lifeVerseFastForward) {
    const days = Number(lifeVerseFastForward.dataset.lifeverseFastForward || 30);
    await lifeVersePresentationPause("fast-forward", 620);
    const result = fastForwardLifeVerse(days);
    if (result && !result.error) {
      saveTrackerState();
      renderScreen("simulator");
      refreshStaticScreens();
    }
  }
  if (lifeVerseInterventionChoice) {
    const choiceId = lifeVerseInterventionChoice.dataset.lifeverseInterventionChoice;
    await lifeVersePresentationPause("fast-forward", 420);
    const result = resolveLifeVerseIntervention(choiceId);
    if (result && !result.error) {
      saveTrackerState();
      renderScreen("simulator");
      refreshStaticScreens();
    }
  }
  if (lifeVerseReportNow) {
    await lifeVersePresentationPause("report-open", 260);
    const report = createLifeVerseReport();
    if (report) {
      saveTrackerState();
      renderScreen("simulator");
      refreshStaticScreens();
    }
  }
  if (lifeVerseReset) {
    if (window.confirm("Reset LifeVerse game progress for this user?")) {
      resetLifeVerse();
      saveTrackerState();
      renderScreen("simulator");
      refreshStaticScreens();
    }
  }
  if (simActivity) {
    const locationId = simActivity.dataset.simLocation;
    const activity = (lifeSimActivities[locationId] || []).find((item) => item.id === simActivity.dataset.simActivity);
    if (activity) {
      applyLifeSimChanges(activity.effect);
      markLifeVerseConsequence(activity.name, `${activity.name} completed. ${lifeSimEffectText(activity.effect)}`);
      saveTrackerState();
      updateLifeSimDom();
      renderScreen("simulator");
      refreshStaticScreens();
    }
  }
  if (simFastForward) {
    fastForwardLifeVerse(30);
    saveTrackerState();
    renderScreen("simulator");
    refreshStaticScreens();
  }
  if (simReset) {
    if (window.confirm("Reset the Life Simulator stats to the MVP starting values?")) {
      trackerState.lifeSim = normalizeLifeSimState(defaultTrackerState.lifeSim);
      resetLifeVerse();
      saveTrackerState();
      renderScreen("simulator");
      refreshStaticScreens();
    }
  }
  if (chatPrompt) {
    await sendChatMessage(chatPrompt.dataset.chatPrompt || "");
  }
  if (growthPrompt) {
    const prompt = growthPrompt.dataset.growthPrompt || "";
    if (prompt) {
      closeModal();
      renderScreen("compass");
      await sendChatMessage(prompt);
    }
  }
  if (inspireCategoryButton) {
    inspireCategory = inspireCategoryButton.dataset.inspireCategory || "All";
    renderScreen("stories");
  }
  if (opportunityCategoryButton) {
    opportunityCategory = opportunityCategoryButton.dataset.opportunityCategory || "All";
    renderScreen("opportunities");
  }
  if (opportunityAi) {
    renderScreen("compass");
    await sendChatMessage(opportunityRecommendationPrompt());
  }
  if (saveFutureReflection) {
    const id = modalLayer.querySelector("#future-reflection-id") && modalLayer.querySelector("#future-reflection-id").value;
    const index = trackerState.futureMirror.saved.findIndex((item) => item.id === id && item.user_id === currentUserId());
    if (index >= 0) {
      trackerState.futureMirror.saved[index].decisionMade = cleanText(modalLayer.querySelector("#future-decision-made").value, 900);
      trackerState.futureMirror.saved[index].whatHappened = cleanText(modalLayer.querySelector("#future-what-happened").value, 900);
      trackerState.futureMirror.saved[index].lesson = cleanText(modalLayer.querySelector("#future-lesson").value, 900);
      trackerState.futureMirror.saved[index].reflected_at = new Date().toISOString();
      saveTrackerState();
      closeModal();
      renderScreen("future");
      refreshStaticScreens();
    }
  }
  if (copyCommunityPrompt) {
    const text = growthCommunityPrompt();
    if (navigator.share) {
      try {
        await navigator.share({ title: "Future Mirror reflection", text });
      } catch {
        // Sharing was cancelled.
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  }
  if (clearChat) {
    if (window.confirm("Clear this Compass AI chat and uploaded document memory?")) {
      resetChatState();
      renderScreen("compass");
    }
  }
  if (discussStory) {
    const story = contentState.stories.find((item) => item.id === discussStory.dataset.discussStory);
    closeModal();
    renderScreen("compass");
    await sendChatMessage(storyDiscussionPrompt(story));
  }
  if (storyAiAction) {
    const story = contentState.stories.find((item) => item.id === storyAiAction.dataset.storyAiId);
    closeModal();
    renderScreen("compass");
    await sendChatMessage(storyReflectionPrompt(story, storyAiAction.dataset.storyAiAction));
  }
  if (storyReader) openModal("storyReader", storyReader.dataset.storyId);
  if (editStory) openModal("storyEditor", editStory.dataset.editStory);
  if (editContact) openModal("supportEditor", editContact.dataset.editContact);

  if (saveOpportunity) {
    const id = saveOpportunity.dataset.saveOpportunity;
    const existing = savedOpportunityRecord(id);
    if (existing) {
      trackerState.savedOpportunities = trackerState.savedOpportunities.filter((item) => !(item.user_id === currentUserId() && item.opportunity_id === id));
    } else if (opportunityItems.some((item) => item.id === id)) {
      trackerState.savedOpportunities.unshift({
        id: `saved-opportunity-${Date.now()}`,
        user_id: currentUserId(),
        opportunity_id: id,
        saved_at: new Date().toISOString()
      });
    }
    saveTrackerState();
    renderScreen(activeTab);
    refreshStaticScreens();
  }

  if (shareOpportunity) {
    const opportunity = opportunityItems.find((item) => item.id === shareOpportunity.dataset.shareOpportunity);
    if (opportunity) {
      const text = shareOpportunityText(opportunity);
      if (navigator.share) {
        try {
          await navigator.share({ title: opportunity.title, text, url: opportunity.applyUrl });
        } catch {
          // Sharing was cancelled. No follow-up needed.
        }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    }
  }

  if (completeMission) {
    const mission = todayMission();
    if (mission && !todayMissionProgress()) {
      trackerState.missionProgress.push({
        id: `progress-${Date.now()}`,
        user_id: currentUserId(),
        mission_id: mission.id,
        date: dateKey(),
        completed_at: new Date().toISOString()
      });
      saveTrackerState();
      renderScreen(activeTab);
      refreshStaticScreens();
    }
  }

  if (saveVoice) {
    const selected = document.querySelector('input[name="voice-preference"]:checked');
    userProfile.voicePreference = selected ? selected.value : "female";
    saveUserProfile();
    renderScreen(activeTab);
    refreshStaticScreens();
  }

  if (startRoleplay) {
    const scenario = roleplayScenarios.find((item) => item.id === startRoleplay.dataset.startRoleplay);
    if (scenario) {
      const session = {
        id: `roleplay-${Date.now()}`,
        user_id: currentUserId(),
        scenario_type: scenario.id,
        started_at: new Date().toISOString(),
        completed_at: null,
        summary: "",
        messages: [{ id: `msg-${Date.now()}`, sender: "ai", message: scenario.opening, created_at: new Date().toISOString() }]
      };
      trackerState.roleplaySessions.push(session);
      trackerState.activeRoleplaySessionId = session.id;
      saveTrackerState();
      openModal("roleplayChat");
    }
  }

  if (sendRoleplay) {
    const session = activeRoleplaySession();
    const input = modalLayer.querySelector("#roleplay-input");
    const text = input ? input.value.trim() : "";
    if (!session || session.user_id !== currentUserId() || !text) return;
    sendRoleplay.disabled = true;
    const loading = modalLayer.querySelector("#roleplay-loading");
    if (loading) loading.hidden = false;
    session.messages.push({ id: `msg-${Date.now()}`, sender: "user", message: text, created_at: new Date().toISOString() });
    input.value = "";
    setTimeout(() => {
      try {
        session.messages.push({ id: `msg-${Date.now() + 1}`, sender: "ai", message: roleplayReply(session, text), created_at: new Date().toISOString() });
        saveTrackerState();
        openModal("roleplayChat");
      } catch {
        session.messages.push({ id: `msg-${Date.now() + 2}`, sender: "ai", message: "Compass had trouble replying. Please try again.", created_at: new Date().toISOString() });
        saveTrackerState();
        openModal("roleplayChat");
      }
    }, 500);
  }

  if (finishRoleplay) {
    const session = activeRoleplaySession();
    if (session && session.user_id === currentUserId()) {
      const reflection = roleplayReflection(session);
      session.completed_at = new Date().toISOString();
      session.summary = `${reflection.wentWell} ${reflection.improve}`;
      saveTrackerState();
      openModal("roleplayReflection");
    }
  }

  if (moodChoice) {
    modalLayer.querySelectorAll("[data-mood-choice]").forEach((button) => button.classList.toggle("is-selected", button === moodChoice));
  }

  if (nextAssessment) {
    captureAssessmentDraft();
    assessmentStep = Math.min(assessmentItems.length + 1, assessmentStep + 1);
    openModal("assessment");
  }

  if (prevAssessment) {
    captureAssessmentDraft();
    assessmentStep = Math.max(0, assessmentStep - 1);
    openModal("assessment");
  }

  if (submitAssessment) {
    captureAssessmentDraft();
    const answers = {};
    assessmentItems.forEach((item) => {
      const selected = modalLayer.querySelector(`input[name="assessment-${item.id}"]:checked`);
      answers[item.id] = Number(selected ? selected.value : assessmentDraft.answers[item.id] || 0);
    });
    answers.freeText = assessmentDraft.freeText || "";
    answers.preferences = assessmentDraft.preferences || [];
    trackerState.assessment = calculateAssessmentResult(answers);
    saveTrackerState();
    renderScreen(activeTab);
    refreshStaticScreens();
    openModal("assessmentResult");
  }

  if (futureMirrorModeButton) {
    futureMirrorMode = futureMirrorModeButton.dataset.futureMirrorMode;
    renderScreen("future");
  }

  if (scanFromEntry) {
    const entry = allReflectionLikeEntries().find((item) => item.id === scanFromEntry.dataset.scanFromEntry);
    if (entry) await startFutureScan(cleanText(entry.content, 300));
  }
  if (startFutureScanButton) await startFutureScan();
  if (scanClarifyChip) {
    futureScanClarifyAnswer = scanClarifyChip.dataset.scanClarifyChip;
    renderScreen("future");
  }
  if (submitFutureScanClarifyButton) await submitFutureScanClarify();
  if (resetFutureScanButton) resetFutureScan();
  if (scanIdentityPick) {
    const value = scanIdentityPick.dataset.scanIdentityPick;
    if (futureScanIdentityPicks.includes(value)) {
      futureScanIdentityPicks = futureScanIdentityPicks.filter((item) => item !== value);
    } else if (futureScanIdentityPicks.length < 3) {
      futureScanIdentityPicks = [...futureScanIdentityPicks, value];
    }
    openModal("futureScanStation", "identityScan");
  }
  if (runScanIdentityButton) await runFutureScanIdentity();
  if (runScanValuesButton) await runFutureScanValues();
  if (runScanCostsButton) await runFutureScanHiddenCosts();
  if (runScanNoActionButton) await runFutureScanNoAction();
  if (scanPressurePick) {
    const value = scanPressurePick.dataset.scanPressurePick;
    futureScanPressurePicks = futureScanPressurePicks.includes(value)
      ? futureScanPressurePicks.filter((item) => item !== value)
      : [...futureScanPressurePicks, value];
    openModal("futureScanStation", "pressureTest");
  }
  if (runScanPressureButton) await runFutureScanPressure();
  if (runScanConflictButton) await runFutureScanConflict();
  if (scanSignalPick) {
    const [dimensionId, level] = String(scanSignalPick.dataset.scanSignalPick).split(":");
    futureScanSignalPicks = { ...futureScanSignalPicks, [dimensionId]: level };
    openModal("futureScanStation", "signalRadar");
  }
  if (runScanSignalButton) await runFutureScanSignal();
  if (runScanPastSelfButton) await runFutureScanPastSelf();
  if (runScanDriftButton) await runFutureScanDrift();
  if (scanCheckBackHorizonButton) {
    futureScanCheckBackHorizon = scanCheckBackHorizonButton.dataset.scanCheckbackHorizon;
    openModal("futureScanStation", "checkBack");
  }
  if (runScanCheckBackScheduleButton) await scheduleFutureScanCheckBack();
  if (runScanCheckBackReportButton) await submitFutureScanCheckBackReport();
  if (resetScanCheckBackButton) resetFutureScanCheckBack();
  if (runScanSynthesisButton) await runFutureScanSynthesis();
  if (openPastScanButton) openPastFutureScan(openPastScanButton.dataset.openPastScan);
  if (jumpFutureScanButton) {
    futureMirrorMode = "scan";
    renderScreen("future");
  }
  if (jumpBuildModeButton) {
    futureMirrorMode = "build";
    renderScreen("future");
  }
  if (buildGoalChipButton) {
    buildModeGoalInput = buildGoalChipButton.dataset.buildGoalChip || "";
    renderScreen("future");
  }
  if (buildMomentCategoryButton) {
    buildMomentCategory = buildMomentCategoryButton.dataset.buildMomentCategory || "independence";
    renderScreen("future");
  }
  if (startBuildEntryButton) await startBuildEntry();
  if (openBuildEntryButton) openBuildEntry(openBuildEntryButton.dataset.openBuildEntry);
  if (startBuildTrainingButton) startBuildTraining(startBuildTrainingButton.dataset.startBuildTraining);
  if (openBuildTrainingButton) openBuildTraining(openBuildTrainingButton.dataset.openBuildTraining);
  if (sendBuildTrainingButton) await sendBuildTrainingReply();
  if (buildCoachPromptButton) await sendBuildTrainingReply(buildCoachPromptButton.dataset.buildCoachPrompt || "");
  if (finishBuildTrainingButton) finishBuildTrainingSession();

  if (prevBlueprintSession) {
    captureBlueprintDraft();
    blueprintActiveSession = Math.max(1, blueprintActiveSession - 1);
    openModal("discoverYourself");
  }

  if (saveBlueprintSessionButton) {
    const savedVersion = saveBlueprintSession(Number(saveBlueprintSessionButton.dataset.saveBlueprintSession));
    if (blueprintActiveSession < BLUEPRINT_SESSIONS.length) {
      blueprintActiveSession += 1;
      openModal("discoverYourself");
    } else {
      blueprintMicroInsightText = blueprintMicroInsight(savedVersion);
      closeModal();
      renderScreen(activeTab);
      refreshStaticScreens();
    }
  }

  if (closeAndOpen) {
    openModal(closeAndOpen.dataset.closeAndOpen);
  }

  if (futureSelfHorizonButton) {
    futureSelfActiveHorizon = futureSelfHorizonButton.dataset.futureSelfHorizon;
    futureSelfError = "";
    openModal("futureSelfView");
  }

  if (generateFutureSelfButton) {
    await generateFutureSelfSnapshot(generateFutureSelfButton.dataset.generateFutureSelf);
  }

  if (saveDailyReflectionButton) {
    const text = modalLayer.querySelector("#daily-reflection-text");
    const content = cleanText(text ? text.value : "", 1200);
    if (content) {
      createReflectionEntry("daily", content, { tags: ["daily", saveDailyReflectionButton.dataset.saveDailyReflection] });
      dailyReflectionPromptIndex += 1;
      closeModal();
      renderScreen(activeTab);
      refreshStaticScreens();
    }
  }

  if (saveWeeklyLetterButton) {
    const text = modalLayer.querySelector("#weekly-letter-text");
    const content = cleanText(text ? text.value : "", 1200);
    if (content) {
      createReflectionEntry("weeklyLetter", content);
      closeModal();
      renderScreen(activeTab);
      refreshStaticScreens();
    }
  }

  if (saveMilestoneLetterButton) {
    const text = modalLayer.querySelector("#milestone-letter-text");
    const content = cleanText(text ? text.value : "", 1400);
    if (content) {
      createReflectionEntry("milestoneLetter", content);
      closeModal();
      renderScreen(activeTab);
      refreshStaticScreens();
    }
  }

  if (resurfaceActionButton) {
    const [id, action] = resurfaceActionButton.dataset.resurfaceAction.split(":");
    const resurfacedEntry = allReflectionLikeEntries().find((item) => item.id === id);
    resurfaceEntryAction(id, action);
    if (action === "engage" && resurfacedEntry && resurfacedEntry._source === "futureScan") {
      // A resurfaced Check-Back is useless without a way back to it - jump
      // straight into that scan's Check-Back station instead of just marking
      // it read, so the user can actually report what happened.
      openPastFutureScan(resurfacedEntry._scanId);
      openModal("futureScanStation", "checkBack");
    } else {
      renderScreen(activeTab);
      refreshStaticScreens();
    }
  }

  if (generateRoadmapButton) {
    const titleInput = modalLayer.querySelector("#roadmap-goal-title");
    const horizonInput = modalLayer.querySelector("#roadmap-goal-horizon");
    const title = cleanText(titleInput ? titleInput.value : "", 160);
    if (title) await generateRoadmapGoal(title, horizonInput ? horizonInput.value : "1-year");
  }

  if (roadmapViewButton) {
    roadmapView = roadmapViewButton.dataset.roadmapView;
    openModal("roadmapView");
  }

  if (setMilestoneStatusButton) {
    const [goalId, milestoneId, status] = setMilestoneStatusButton.dataset.setMilestoneStatus.split(":");
    setMilestoneStatus(goalId, milestoneId, status);
    openModal("roadmapView");
  }

  if (event.target.closest("[data-reflect-on-milestone]")) {
    const button = event.target.closest("[data-reflect-on-milestone]");
    const content = `Reached a Roadmap milestone: "${button.dataset.milestoneTitleValue}" (goal: ${button.dataset.goalTitleValue}). `;
    createReflectionEntry("milestoneLetter", content + (modalLayer.querySelector("#milestone-reflection-note") ? modalLayer.querySelector("#milestone-reflection-note").value : ""), { resurfaceDays: 30, tags: ["roadmap-milestone"] });
    milestoneJustCompleted = null;
    openModal("roadmapView");
  }

  if (startInterviewButton) {
    await startInterviewSession(startInterviewButton.dataset.startInterview);
  }

  if (sendInterviewAnswerButton) {
    const input = modalLayer.querySelector("#interview-answer-input");
    const text = input ? input.value.trim() : "";
    if (text) {
      if (input) input.value = "";
      await sendInterviewAnswer(text);
    }
  }

  if (saveResumeDraftButton) {
    saveResumeDraft();
    openModal("resumeBuilder");
  }

  if (polishResumeButton) {
    await polishResumeWithAI();
  }

  if (copyResumeButton) {
    const resume = trackerState.careerStudio.resume;
    if (resume && resume.polishedText && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(resume.polishedText);
      } catch (error) {
        console.error("[Resume Builder] Clipboard copy failed", error);
      }
    }
  }

  if (exportVaultButton) {
    downloadKnowledgeVaultExport();
  }

  if (exploreReadinessFuture) {
    const result = trackerState.assessment;
    if (result) {
      const weakest = weakestReadinessCategory(result);
      closeModal();
      futureMirrorMode = "scan";
      await startFutureScan(`How can I improve my ${weakest.label.toLowerCase()} after scoring ${weakest.value}/100?`);
      refreshStaticScreens();
    }
  }

  if (readinessAi) {
    const result = trackerState.assessment;
    if (result) {
      closeModal();
      renderScreen("compass");
      await sendChatMessage(readinessDiscussionPrompt(result));
    }
  }

  if (sendChat) {
    const input = document.querySelector("#chat-input");
    await sendChatMessage(input ? input.value : "");
  }

  if (voiceChat) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const chatInput = document.querySelector("#chat-input");
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.onresult = (result) => {
        const transcript = result.results[0][0].transcript;
        if (chatInput) {
          chatInput.value = transcript;
          chatInput.focus();
        }
      };
      recognition.onerror = () => {
        chatState.messages.push({ from: "assistant", text: "Voice input had trouble listening. You can type your message instead.", local: true });
        saveChatState();
        renderScreen("compass");
      };
      recognition.start();
    } else {
      chatState.messages.push({ from: "assistant", text: "Voice input is not available in this browser. You can type your message instead.", local: true });
      saveChatState();
      renderScreen("compass");
    }
  }

  if (saveMood) {
    const selectedMood = modalLayer.querySelector("[data-mood-choice].is-selected");
    const score = Number(modalLayer.querySelector("#mood-score").value || 0);
    const note = modalLayer.querySelector("#mood-note").value.trim() || "Mood logged for today.";
    trackerState.mood.label = selectedMood ? selectedMood.dataset.moodChoice : trackerState.mood.label;
    trackerState.mood.score = score;
    trackerState.mood.note = note;
    trackerState.mood.history = [...trackerState.mood.history.slice(-6), score];
    trackerState.mood.entries.unshift({
      id: `mood-${Date.now()}`,
      user_id: currentUserId(),
      label: trackerState.mood.label,
      score,
      note,
      created_at: new Date().toISOString(),
      display_time: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    });
    trackerState.moodSuggestion = generateMoodSuggestion(trackerState.mood.label, score, note);
    saveTrackerState();
    closeModal();
    renderScreen(activeTab);
    refreshStaticScreens();
  }

  if (saveAiProfile) {
    userProfile.name = cleanText(modalLayer.querySelector("#ai-profile-name").value, 80);
    userProfile.ageGroup = cleanText(modalLayer.querySelector("#ai-profile-age").value, 40);
    userProfile.studentStatus = cleanText(modalLayer.querySelector("#ai-profile-student").value, 80);
    userProfile.goals = cleanText(modalLayer.querySelector("#ai-profile-goals").value, 900);
    userProfile.interests = cleanText(modalLayer.querySelector("#ai-profile-interests").value, 900);
    userProfile.stressTriggers = cleanText(modalLayer.querySelector("#ai-profile-stress").value, 900);
    userProfile.supportStyle = cleanText(modalLayer.querySelector("#ai-profile-support").value, 900);
    saveUserProfile();
    saveTrackerState();
    closeModal();
    renderScreen(activeTab);
    refreshStaticScreens();
  }

  if (saveGrowthGoals) {
    userProfile.goals = cleanText(modalLayer.querySelector("#growth-goals-input").value, 900);
    userProfile.visionBoard = cleanText(modalLayer.querySelector("#growth-vision-input").value, 900);
    userProfile.dreamUniversity = cleanText(modalLayer.querySelector("#growth-university-input").value, 120);
    userProfile.dreamCareer = cleanText(modalLayer.querySelector("#growth-career-input").value, 120);
    userProfile.dreamLifestyle = cleanText(modalLayer.querySelector("#growth-lifestyle-input").value, 900);
    saveUserProfile();
    saveTrackerState();
    closeModal();
    renderScreen(activeTab);
    refreshStaticScreens();
  }

  if (calcCostOfLiving) {
    costOfLivingDraft = {
      housing: modalLayer.querySelector("#col-housing").value,
      district: modalLayer.querySelector("#col-district").value,
      transport: modalLayer.querySelector("#col-transport").value,
      lifestyle: modalLayer.querySelector("#col-lifestyle").value
    };
    costOfLivingResult = computeCostOfLiving(costOfLivingDraft);
    openModal("costOfLiving");
  }

  if (saveJournal) {
    const input = modalLayer.querySelector("#journal-entry-input");
    const error = modalLayer.querySelector("#journal-error");
    const text = cleanText(input ? input.value : "", 1200);
    if (!text) {
      if (error) error.textContent = "Write at least one sentence before saving.";
      return;
    }
    trackerState.journalEntries.unshift({
      id: `journal-${Date.now()}`,
      user_id: currentUserId(),
      text,
      created_at: new Date().toISOString(),
      display_time: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    });
    trackerState.journalEntries = trackerState.journalEntries.slice(0, 80);
    saveTrackerState();
    openModal("journal");
    renderScreen(activeTab);
    refreshStaticScreens();
  }

  if (startChallenge) {
    const challenge = growthChallenges.find((item) => item.id === startChallenge.dataset.startChallenge);
    if (challenge) {
      const nextProgress = {
        id: challenge.id,
        user_id: currentUserId(),
        title: challenge.title,
        focus: challenge.focus,
        started_at: new Date().toISOString(),
        started_display: new Date().toLocaleDateString([], { month: "short", day: "numeric" }),
        completed_days: 0
      };
      trackerState.challengeProgress = trackerState.challengeProgress.filter((item) => !(item.user_id === currentUserId() && item.id === challenge.id));
      trackerState.challengeProgress.unshift(nextProgress);
      saveTrackerState();
      openModal("challengeHub");
      renderScreen(activeTab);
      refreshStaticScreens();
    }
  }

  if (saveCommunityPost) {
    const textInput = modalLayer.querySelector("#community-post-text");
    const groupInput = modalLayer.querySelector("#community-post-group");
    const error = modalLayer.querySelector("#community-post-error");
    const text = cleanText(textInput ? textInput.value : "", 1500);
    const squadId = groupInput ? groupInput.value : "";
    if (!text || text.length < 8) {
      if (error) error.textContent = "Write a short but clear post first.";
      return;
    }
    if (error) error.textContent = "";
    saveCommunityPost.disabled = true;
    saveCommunityPost.textContent = "Posting...";
    const pendingMilestone = getPendingMilestoneShare();
    try {
      const result = await submitCommunityPost({
        body: text,
        squadId,
        postType: pendingMilestone ? "milestone" : "general",
        relatedGoalTitle: pendingMilestone ? pendingMilestone.goalTitle : undefined,
        relatedMilestoneTitle: pendingMilestone ? pendingMilestone.milestoneTitle : undefined,
        themeWeek: CommunityMatching.isoWeekNumber(new Date())
      });
      setPendingMilestoneShare(null);
      await refreshCommunityData();
      closeModal();
      if (result.status === "blocked") {
        openModal("safety", result.reason);
      } else {
        bumpCommunityTrust(pendingMilestone ? 5 : 2);
        checkCommunityAchievements();
        renderScreen("community");
      }
      refreshStaticScreens();
    } catch (err) {
      saveCommunityPost.disabled = false;
      saveCommunityPost.textContent = "Post";
      if (error) error.textContent = err.message || "Could not publish your post right now.";
    }
  }

  if (communityAuthModeButton) {
    setCommunityAuthMode(communityAuthModeButton.dataset.communityAuthMode || "sign-in");
    setCommunityAuthError("");
    renderScreen("community");
  }

  if (communitySignUpButton) {
    const emailInput = document.querySelector("#community-auth-email");
    const passwordInput = document.querySelector("#community-auth-password");
    const usernameInput = document.querySelector("#community-auth-username");
    const email = cleanText(emailInput ? emailInput.value : "", 200);
    const password = passwordInput ? passwordInput.value : "";
    const username = usernameInput ? cleanUsername(usernameInput.value) : "";
    if (!email || password.length < 6) {
      setCommunityAuthError("Enter an email and a password with at least 6 characters.");
      renderScreen("community");
    } else {
      setCommunityAuthBusy(true);
      setCommunityAuthError("");
      renderScreen("community");
      try {
        const result = await communitySignUp(email, password, username);
        if (!result.session) {
          setCommunityAuthMode("sign-in");
          setCommunityAuthError("Account created. Check your email to confirm it, then sign in here.");
        }
      } catch (err) {
        setCommunityAuthError(err.message || "Could not create your account.");
      } finally {
        setCommunityAuthBusy(false);
        renderScreen("community");
      }
    }
  }

  if (communitySignInButton) {
    const emailInput = document.querySelector("#community-auth-email");
    const passwordInput = document.querySelector("#community-auth-password");
    const email = cleanText(emailInput ? emailInput.value : "", 200);
    const password = passwordInput ? passwordInput.value : "";
    if (!email || !password) {
      setCommunityAuthError("Enter your email and password.");
      renderScreen("community");
    } else {
      setCommunityAuthBusy(true);
      setCommunityAuthError("");
      renderScreen("community");
      try {
        await communitySignIn(email, password);
      } catch (err) {
        setCommunityAuthError(err.message || "Could not sign in.");
      } finally {
        setCommunityAuthBusy(false);
        renderScreen("community");
      }
    }
  }

  if (communitySignOutButton) {
    await communitySignOut();
    renderScreen("community");
  }

  if (communityComposeAssistButton) {
    const textInput = modalLayer.querySelector("#community-post-text");
    const suggestionBox = modalLayer.querySelector("#community-compose-suggestion");
    const draft = cleanText(textInput ? textInput.value : "", 1500);
    if (draft && suggestionBox) {
      communityComposeAssistButton.disabled = true;
      communityComposeAssistButton.textContent = "Thinking...";
      try {
        const suggestion = await requestCompassDirect(COMMUNITY_COMPOSE_ASSIST_SYSTEM_PROMPT, draft);
        suggestionBox.innerHTML = `
          <div class="quote-block">${escapeHTML(suggestion)}</div>
          <button class="secondary-action compact-action" type="button" data-use-community-suggestion>Use this wording</button>
        `;
        suggestionBox.dataset.suggestionText = suggestion;
      } catch {
        suggestionBox.innerHTML = `<p class="form-error">Could not get a suggestion right now.</p>`;
      } finally {
        communityComposeAssistButton.disabled = false;
        communityComposeAssistButton.textContent = "Improve my wording";
      }
    }
  }
  if (event.target.closest("[data-use-community-suggestion]")) {
    const suggestionBox = modalLayer.querySelector("#community-compose-suggestion");
    const textInput = modalLayer.querySelector("#community-post-text");
    if (suggestionBox && textInput && suggestionBox.dataset.suggestionText) {
      textInput.value = suggestionBox.dataset.suggestionText;
      suggestionBox.innerHTML = "";
    }
  }

  if (joinSquadButton) {
    const squadId = joinSquadButton.dataset.joinSquad;
    const ok = await joinSquad(squadId);
    if (ok) {
      bumpCommunityTrust(3);
      await refreshCommunityData();
      checkCommunityAchievements();
    }
    renderScreen("community");
    if (modalLayer.classList.contains("is-open")) openModal("communityGroup", squadId);
  }
  if (leaveSquadButton) {
    const squadId = leaveSquadButton.dataset.leaveSquad;
    await leaveSquad(squadId);
    await refreshCommunityData();
    renderScreen("community");
    if (modalLayer.classList.contains("is-open")) openModal("communityGroup", squadId);
  }

  if (saveSquadButton) {
    const titleInput = modalLayer.querySelector("#community-squad-title");
    const descriptionInput = modalLayer.querySelector("#community-squad-description");
    const tagsInput = modalLayer.querySelector("#community-squad-tags");
    const error = modalLayer.querySelector("#community-squad-error");
    const title = cleanText(titleInput ? titleInput.value : "", 80);
    const description = cleanText(descriptionInput ? descriptionInput.value : "", 400);
    const tags = (tagsInput ? tagsInput.value : "").split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 6);
    if (!title || !description) {
      if (error) error.textContent = "Add a title and description first.";
      return;
    }
    try {
      await createSquad({ title, description, tags });
      await refreshCommunityData();
      closeModal();
      renderScreen("community");
    } catch (err) {
      if (error) error.textContent = err.message || "Could not create that squad.";
    }
  }

  if (shareMilestoneCommunityButton) {
    setPendingMilestoneShare({
      goalTitle: shareMilestoneCommunityButton.dataset.goalTitleValue || "",
      milestoneTitle: shareMilestoneCommunityButton.dataset.milestoneTitleValue || ""
    });
    milestoneJustCompleted = null;
    closeModal();
    openModal("communityPost");
  }

  if (saveAccountabilityOptInButton) {
    const select = document.querySelector("#accountability-goal-select");
    const textInput = document.querySelector("#accountability-goal-text");
    const error = document.querySelector("#accountability-optin-error");
    let goalTitle = "";
    let roadmapStage = "starting";
    if (select) {
      const goal = myRoadmapGoals().find((item) => item.id === select.value);
      if (goal) {
        goalTitle = goal.title;
        roadmapStage = CommunityMatching.computeRoadmapStage(goal);
      }
    } else if (textInput) {
      goalTitle = cleanText(textInput.value, 200);
    }
    if (!goalTitle) {
      if (error) error.textContent = "Add a goal first.";
      return;
    }
    const goalTags = CommunityMatching.extractTags(goalTitle);
    try {
      await saveAccountabilityOptIn({ goalTitle, roadmapStage, goalTags });
      await refreshCommunityData();
      renderScreen("community");
    } catch (err) {
      if (error) error.textContent = err.message || "Could not save your opt-in.";
    }
  }

  if (sendAccountabilityRequestButton) {
    const targetUserId = sendAccountabilityRequestButton.dataset.sendAccountabilityRequest;
    const messageInput = modalLayer.querySelector("#community-accountability-message");
    const error = modalLayer.querySelector("#community-accountability-error");
    const message = cleanText(messageInput ? messageInput.value : "", 500);
    if (!message || message.length < 5) {
      if (error) error.textContent = "Write a short intro message first.";
      return;
    }
    try {
      await requestAccountabilityConnection(targetUserId, message);
      await refreshCommunityData();
      closeModal();
      renderScreen("community");
    } catch (err) {
      if (error) error.textContent = err.message || "Could not send that request.";
    }
  }

  if (acceptAccountabilityRequestButton) {
    await respondAccountabilityConnection(acceptAccountabilityRequestButton.dataset.acceptAccountabilityRequest, "accepted");
    await refreshCommunityData();
    checkCommunityAchievements();
    renderScreen("community");
  }
  if (declineAccountabilityRequestButton) {
    await respondAccountabilityConnection(declineAccountabilityRequestButton.dataset.declineAccountabilityRequest, "declined");
    await refreshCommunityData();
    renderScreen("community");
  }
  if (saveContactHintButton) {
    const connectionId = saveContactHintButton.dataset.saveContactHint;
    const hintInput = document.querySelector(`[data-contact-hint-input="${connectionId}"]`);
    const hint = cleanText(hintInput ? hintInput.value : "", 140);
    await saveAccountabilityContactHint(connectionId, hint);
    await refreshCommunityData();
    renderScreen("community");
  }

  if (submitMentorApplicationButton) {
    const bioInput = modalLayer.querySelector("#community-mentor-bio");
    const tagsInput = modalLayer.querySelector("#community-mentor-tags");
    const error = modalLayer.querySelector("#community-mentor-apply-error");
    const bio = cleanText(bioInput ? bioInput.value : "", 600);
    const focusTags = (tagsInput ? tagsInput.value : "").split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 6);
    if (bio.length < 40) {
      if (error) error.textContent = "Write a bit more about your experience first (at least 40 characters).";
      return;
    }
    try {
      await submitMentorApplication({ bio, focusTags });
      await refreshCommunityData();
      closeModal();
      renderScreen("community");
    } catch (err) {
      if (error) error.textContent = err.message || "Could not submit your mentor application right now.";
    }
  }

  if (saveCommunityOpportunityButton) {
    const titleInput = modalLayer.querySelector("#community-opportunity-title");
    const descriptionInput = modalLayer.querySelector("#community-opportunity-description");
    const linkInput = modalLayer.querySelector("#community-opportunity-link");
    const categorySelect = modalLayer.querySelector("#community-opportunity-category");
    const tagsInput = modalLayer.querySelector("#community-opportunity-tags");
    const error = modalLayer.querySelector("#community-opportunity-error");
    const title = cleanText(titleInput ? titleInput.value : "", 140);
    const description = cleanText(descriptionInput ? descriptionInput.value : "", 800);
    const link = (linkInput ? linkInput.value : "").trim();
    const category = categorySelect ? categorySelect.value : "";
    const tags = (tagsInput ? tagsInput.value : "").split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 8);
    if (!title || !description || !/^https?:\/\//i.test(link)) {
      if (error) error.textContent = "Add a title, description, and a valid link (starting with http:// or https://).";
      return;
    }
    saveCommunityOpportunityButton.disabled = true;
    saveCommunityOpportunityButton.textContent = "Sharing...";
    try {
      const result = await submitCommunityOpportunity({ title, description, link, category, tags });
      await refreshCommunityData();
      closeModal();
      if (result.status === "blocked") {
        openModal("safety", result.reason);
      } else {
        renderScreen("opportunities");
      }
    } catch (err) {
      saveCommunityOpportunityButton.disabled = false;
      saveCommunityOpportunityButton.textContent = "Share";
      if (error) error.textContent = err.message || "Could not share this opportunity right now.";
    }
  }

  if (demoReceipt) {
    modalLayer.querySelector("#receipt-merchant").value = "Campus cafe";
    modalLayer.querySelector("#receipt-amount").value = "14.60";
    modalLayer.querySelector("#receipt-category").value = "Food";
    modalLayer.querySelector("#receipt-method").value = "E-wallet";
  }

  if (saveReceipt) {
    const amount = Number(modalLayer.querySelector("#receipt-amount").value || 0);
    if (amount > 0) {
      const receipt = {
        id: `receipt-${Date.now()}`,
        merchant: modalLayer.querySelector("#receipt-merchant").value.trim() || "Receipt",
        amount,
        category: modalLayer.querySelector("#receipt-category").value,
        method: modalLayer.querySelector("#receipt-method").value,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      };
      trackerState.receipts.unshift(receipt);
      recordFinanceReceipt(receipt);
      saveTrackerState();
      closeModal();
      renderScreen(activeTab);
      refreshStaticScreens();
    }
  }

  if (saveProfile) {
    const username = cleanUsername(modalLayer.querySelector("#profile-username-input").value);
    const email = modalLayer.querySelector("#profile-email-input").value.trim();
    const error = modalLayer.querySelector("#profile-username-error");
    if (username.length < 2 || !isGmailAddress(email)) {
      error.textContent = "Use a username and Gmail address.";
      return;
    }
    userProfile.username = username;
    userProfile.email = email;
    saveUserProfile();
    applyScopedTrackerState();
    applyScopedChatState();
    saveTrackerState();
    closeModal();
    renderScreen(activeTab);
    refreshStaticScreens();
  }

  if (saveContact) {
    const id = modalLayer.querySelector("#contact-id").value || `contact-${Date.now()}`;
    const name = modalLayer.querySelector("#contact-name").value.trim();
    const phone = modalLayer.querySelector("#contact-phone").value.trim();
    const error = modalLayer.querySelector("#contact-error");
    if (!name || !phone) {
      error.textContent = "Add a name and at least one contact method.";
      return;
    }
    if (!/^[+()\-\s\dA-Za-z@.]{3,}$/.test(phone)) {
      error.textContent = "Contact method looks too short or unusual.";
      return;
    }
    const contact = {
      id,
      user_id: currentUserId(),
      name,
      relationship: modalLayer.querySelector("#contact-relationship").value,
      phone,
      preferred_contact_method: modalLayer.querySelector("#contact-method").value,
      note: modalLayer.querySelector("#contact-note").value.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const index = trackerState.supportContacts.findIndex((item) => item.id === id && (item.user_id === currentUserId() || !item.user_id));
    if (index >= 0) {
      contact.created_at = trackerState.supportContacts[index].created_at || contact.created_at;
      trackerState.supportContacts[index] = contact;
    } else {
      trackerState.supportContacts.unshift(contact);
    }
    saveTrackerState();
    openModal("supportCircle");
    refreshStaticScreens();
  }

  if (deleteContact) {
    const id = deleteContact.dataset.deleteContact;
    if (window.confirm("Delete this support contact?")) {
      trackerState.supportContacts = trackerState.supportContacts.filter((item) => !(item.id === id && (item.user_id === currentUserId() || !item.user_id)));
      saveTrackerState();
      openModal("supportCircle");
      refreshStaticScreens();
    }
  }

  if (messageContact) {
    const contact = trackerState.supportContacts.find((item) => item.id === messageContact.dataset.messageContact && (item.user_id === currentUserId() || !item.user_id));
    if (contact) {
      const raw = contact.phone.trim();
      const digits = raw.replace(/[^\d]/g, "");
      if (contact.preferred_contact_method === "WhatsApp" && digits) {
        window.location.href = `https://wa.me/${digits}`;
      } else if (contact.preferred_contact_method === "Phone" && raw) {
        window.location.href = `tel:${raw}`;
      } else if (contact.preferred_contact_method === "SMS" && raw) {
        window.location.href = `sms:${raw}`;
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(`${contact.name}: ${contact.phone}`);
      }
    }
  }

  if (saveStory && isAdmin()) {
    const id = modalLayer.querySelector("#story-id").value || `story-${Date.now()}`;
    const title = modalLayer.querySelector("#story-title-input").value.trim();
    const person = modalLayer.querySelector("#story-person").value.trim();
    const error = modalLayer.querySelector("#story-error");
    if (!title || !person) {
      error.textContent = "Add at least a title and person name.";
      return;
    }
    const keyLessons = modalLayer.querySelector("#story-lessons").value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6);
    const keyDecisions = modalLayer.querySelector("#story-decisions").value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 6);
    const nextStory = {
      id,
      person,
      title,
      category: modalLayer.querySelector("#story-category").value || "Entrepreneurs",
      preview: modalLayer.querySelector("#story-preview").value.trim() || "A short lesson for building a steadier life.",
      body: modalLayer.querySelector("#story-body").value.trim() || "Add the full story details here.",
      coverImage: safeExternalUrl(modalLayer.querySelector("#story-cover").value) || "assets/bg-learn-feature.png",
      youtubeUrl: safeExternalUrl(modalLayer.querySelector("#story-youtube").value),
      blogUrl: safeExternalUrl(modalLayer.querySelector("#story-blog").value),
      podcastUrl: safeExternalUrl(modalLayer.querySelector("#story-podcast").value),
      readTime: modalLayer.querySelector("#story-read-time").value.trim() || "3 min",
      quote: modalLayer.querySelector("#story-quote").value.trim() || "A small steady step can become a bigger change.",
      keyDecisions: keyDecisions.length ? keyDecisions : ["Write one important decision this person made."],
      afterDecisions: modalLayer.querySelector("#story-after-decisions").value.trim() || "Describe what happened after those decisions.",
      keyLessons: keyLessons.length ? keyLessons : ["Write one practical lesson."],
      reflectionQuestion: modalLayer.querySelector("#story-reflection").value.trim() || "What part of this story can you apply safely today?",
      actionChallenge: modalLayer.querySelector("#story-challenge").value.trim() || "Choose one practical action and do it for 10 minutes.",
      published: modalLayer.querySelector("#story-published").checked
    };
    const existingIndex = contentState.stories.findIndex((story) => story.id === id);
    if (existingIndex >= 0) {
      contentState.stories[existingIndex] = nextStory;
    } else {
      contentState.stories.unshift(nextStory);
    }
    saveContentState();
    closeModal();
    renderScreen(activeTab);
    refreshStaticScreens();
  }

  if (deleteStory && isAdmin()) {
    if (window.confirm("Delete this Inspire Hub item?")) {
      contentState.stories = contentState.stories.filter((story) => story.id !== deleteStory.dataset.deleteStory);
      saveContentState();
      renderScreen(activeTab);
      refreshStaticScreens();
    }
  }

  if (saveAdmin && isAdmin()) {
    contentState.notice = document.querySelector("#admin-notice").value.trim() || defaultContentState.notice;
    document.querySelectorAll("[data-feature-toggle]").forEach((input) => {
      settingsState.features[input.dataset.featureToggle] = input.checked;
    });
    saveContentState();
    saveSettingsState();
    renderScreen(activeTab);
    refreshStaticScreens();
  }

  if (signOut) {
    userProfile.email = "";
    userProfile.username = "";
    userProfile.role = "user";
    saveUserProfile();
    applyScopedTrackerState();
    applyScopedChatState();
    renderScreen("home");
    showAuthIfNeeded();
  }

  if (closer || event.target === modalLayer) closeModal();
});

document.addEventListener("input", (event) => {
  if (event.target && event.target.matches("[data-build-training-draft]")) {
    buildTrainingDraft = event.target.value;
  }
  if (event.target && event.target.id === "inspire-search") {
    inspireSearch = event.target.value;
    renderScreen("stories");
    const input = document.querySelector("#inspire-search");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
});

document.addEventListener("change", async (event) => {
  const upload = event.target && event.target.closest("[data-pdf-upload]");
  if (upload && upload.files && upload.files[0]) {
    await handlePdfUpload(upload.files[0]);
    upload.value = "";
  }
});

document.addEventListener("keydown", async (event) => {
  if (event.key === "Escape") closeModal();
  if (
    event.target &&
    event.target.matches("[data-build-training-draft]") &&
    event.key === "Enter" &&
    (event.ctrlKey || event.metaKey)
  ) {
    event.preventDefault();
    await sendBuildTrainingReply();
  }
  if (event.key === "Enter" && activeTab === "compass" && document.activeElement && document.activeElement.id === "chat-input") {
    await sendChatMessage(document.activeElement.value);
  }
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    viewButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    document.querySelector("#app-view")?.classList.toggle("is-active", button.dataset.view === "app");
    document.querySelector("#board-view")?.classList.toggle("is-active", button.dataset.view === "board");
  });
});

refreshStaticScreens();
const startupParams = new URLSearchParams(window.location.search);
const startupTab = startupParams.get("tab") || "home";
const startupLifeVerseView = startupParams.get("lifeverseView");
if (startupLifeVerseView) {
  trackerState.lifeVerse = lifeVerseState();
  trackerState.lifeVerse.activeView = startupLifeVerseView;
} else if (startupTab === "simulator") {
  setLifeVerseDefaultWorldView();
}
renderScreen(screens[startupTab] ? startupTab : "home");
showAuthIfNeeded();
