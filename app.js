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
const COMPASS_SYSTEM_PROMPT = "You are Compass AI, a helpful AI coach for students and youth. Answer the user's actual question directly. Be supportive, practical, and clear. Do not invent facts about the user. Only use information from the current conversation, saved user profile, or uploaded documents. If you are unsure, ask a short follow-up question.";
const FUTURE_MIRROR_SYSTEM_PROMPT = "You are Future Mirror inside the Compass app. You are a decision impact simulator, not a prediction tool. Help youth compare how today's choices may shape possible future outcomes. Do not guarantee outcomes or claim to predict the future. Use language like possible outcomes, potential risks, likely impact, and possible long-term effects. Be supportive, practical, concise, and youth-friendly.";
const COMPASS_API_ERROR = "Sorry, Compass AI is having trouble responding right now. Please try again.";
const COMPASS_API_URL = window.location.protocol === "file:" ? "http://localhost:5179/api/compass-chat" : "/api/compass-chat";

const futureMirrorCategories = [
  "Education Mirror",
  "Career Mirror",
  "Financial Mirror",
  "Lifestyle Mirror",
  "Relationship Mirror",
  "Growth Mirror"
];

const futureMirrorExamples = [
  "Should I study tonight or play games?",
  "Should I apply for this internship?",
  "Should I save money or spend it?",
  "Should I join this challenge?"
];

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
  communityPosts: [],
  futureMirror: {
    latest: null,
    saved: []
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
    consequence: "",
    consequenceToastUntil: 0,
    reportPromptReady: false
  },
  activeRoleplaySessionId: null,
  systemTutorialsSeen: {},
  moodSuggestion: null
};

const dailyMissions = [
  { id: "save-rm5", title: "Save RM5 today", description: "Put aside a small amount before spending on wants.", category: "Money", is_active: true },
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
  { id: "marina-bay", name: "Marina Bay", description: "The city's financial skyline - ambition, pressure, and the clearest symbol of \"making it\"." }
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

const communityGroups = [
  {
    id: "study-focus",
    title: "Study Focus",
    description: "Share focus routines, exam pressure strategies, and realistic study blocks.",
    members: "1.8k",
    prompts: ["What study habit helped you this week?", "What distraction do you want to reduce?"]
  },
  {
    id: "leadership",
    title: "Leadership",
    description: "Practice communication, confidence, teamwork, and leading without ego.",
    members: "940",
    prompts: ["Where can you lead by helping first?", "What responsibility are you ready to try?"]
  },
  {
    id: "entrepreneurship",
    title: "Entrepreneurship",
    description: "Discuss small business ideas, experiments, customer learning, and responsible risk.",
    members: "1.2k",
    prompts: ["What small problem could you solve?", "What can you test without spending much money?"]
  },
  {
    id: "mental-wellness",
    title: "Mental Wellness",
    description: "Anonymous support, calm check-ins, and encouragement to reach trusted people.",
    members: "2.4k",
    prompts: ["What helped you feel 5% steadier today?", "Who is one safe person you can contact?"]
  },
  {
    id: "scholarships",
    title: "Scholarships",
    description: "Share scholarship preparation, essay ideas, deadlines, and interview practice.",
    members: "860",
    prompts: ["What scholarship requirement can you prepare early?", "What story shows your growth?"]
  },
  {
    id: "career-growth",
    title: "Career Growth",
    description: "Explore internships, portfolios, beginner skills, and career confidence.",
    members: "1.1k",
    prompts: ["What skill can you prove with a small project?", "What opportunity should you apply for?"]
  }
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
let isFutureMirrorLoading = false;
let futureMirrorError = "";
let futureMirrorDraft = null;
let assessmentStep = 0;
let assessmentDraft = { answers: {}, freeText: "", preferences: [] };
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
    communityPosts: Array.isArray(state.communityPosts) ? state.communityPosts : fallback.communityPosts,
    futureMirror: {
      ...fallback.futureMirror,
      ...(state.futureMirror || {}),
      saved: Array.isArray(state.futureMirror && state.futureMirror.saved) ? state.futureMirror.saved : fallback.futureMirror.saved
    },
    lifeVerse: normalizeLifeVerseState(state.lifeVerse || fallback.lifeVerse),
    lifeSim: normalizeLifeSimState(state.lifeSim || fallback.lifeSim),
    activeRoleplaySessionId: state.activeRoleplaySessionId || null,
    systemTutorialsSeen: (state.systemTutorialsSeen && typeof state.systemTutorialsSeen === "object") ? state.systemTutorialsSeen : {},
    moodSuggestion: state.moodSuggestion || null
  };
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
    consequence: state.consequence || "",
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
  return `RM ${Number(value || 0).toFixed(2)}`;
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
  const journalCount = trackerState.journalEntries.filter((entry) => entry.user_id === currentUserId()).length;
  if (journalCount) facts.push(`Journal entries written: ${journalCount}`);
  const activeChallenges = trackerState.challengeProgress.filter((item) => item.user_id === currentUserId());
  if (activeChallenges.length) facts.push(`Active challenges: ${activeChallenges.map((item) => item.title).join(", ")}`);
  return facts;
}

function realGrowthFactsText() {
  const facts = realGrowthFacts();
  return facts.length ? facts.join(" | ") : "No saved Compass data yet.";
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
  const categoryList = opportunityCategories.filter((category) => category !== "All").join(", ");
  if (!facts.length) {
    return `I have not filled in my age, interests, goals, or career aspiration yet. Ask me a few short questions, then recommend suitable opportunities from these categories: ${categoryList}. Keep it practical and youth-friendly.`;
  }
  return `Use only this saved profile data and do not invent anything: ${facts.join(" | ")}. Recommend suitable youth opportunities from these categories: ${categoryList}. Include 3 best-fit options, why they fit, what to prepare, and one safe next step.`;
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
      </div>
    </section>
  `;
}

function lifeVerseState() {
  trackerState.lifeVerse = normalizeLifeVerseState(trackerState.lifeVerse || createDefaultLifeVerseState());
  return trackerState.lifeVerse;
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
        <span><strong>${escapeHTML(need.label)}</strong>${Math.round(need.value)}/100</span>
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
        <p class="muted">Move near a recognizable place. Some locations have playable actions now; others are visual spaces for this remaster.</p>
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

function lifeSimLastResult() {
  const sim = trackerState.lifeSim || {};
  if (!sim.lastActivity && !sim.consequence) return "";
  return `
    <section class="life-sim-result-card">
      <p class="eyebrow">Latest consequence</p>
      <h3>${escapeHTML(sim.lastActivity || "30 days later")}</h3>
      <p>${escapeHTML(sim.consequence || "Your stats changed. Keep exploring how daily choices shape your routine.")}</p>
    </section>
  `;
}

function markLifeVerseConsequence(lastActivity, consequence, options = {}) {
  trackerState.lifeSim.lastActivity = lastActivity || "";
  trackerState.lifeSim.consequence = consequence || "";
  trackerState.lifeSim.consequenceToastUntil = Date.now() + 4000;
  trackerState.lifeSim.reportPromptReady = Boolean(options.reportPromptReady);
}

function lifeVerseConsequenceToast(now = Date.now()) {
  const sim = trackerState.lifeSim || {};
  if (!sim.consequence || Number(sim.consequenceToastUntil || 0) <= now) return "";
  return `
    <aside class="lifeverse-consequence-toast" aria-live="polite">
      <p class="eyebrow">${sim.reportPromptReady ? "Fast Forward finished" : "Consequence recorded"}</p>
      <strong>${escapeHTML(sim.lastActivity || "LifeVerse update")}</strong>
      <span>${escapeHTML(sim.consequence)}</span>
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
    markLifeVerseConsequence(result.activity.title, result.event.summary);
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
    markLifeVerseConsequence(result.action.title, result.event.summary);
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
    markLifeVerseConsequence(`${days} Days Later`, result.event.summary, { reportPromptReady: true });
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
    markLifeVerseConsequence("Decision made", result.event.summary, { reportPromptReady: true });
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
  trackerState.lifeSim.consequence = "";
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

function futureMirrorPrompt(question, category, pathA, pathB) {
  const profileFacts = realGrowthFactsText();
  return `Create a Future Mirror decision impact simulation as strict JSON only. Do not include markdown. The JSON shape must be:
{
  "question": "string",
  "category": "string",
  "summary": "string",
  "paths": [
    {
      "name": "Path A",
      "choice": "string",
      "benefits": ["string", "string"],
      "risks": ["string", "string"],
      "shortTermImpact": "string",
      "longTermImpact": "string",
      "goalAlignmentScore": 0
    }
  ],
  "timeline": {
    "1 month": "string",
    "6 months": "string",
    "1 year": "string",
    "3 years": "string"
  },
  "futureSelfLetter": "string",
  "futureScore": {
    "overall": 0,
    "explanation": "string",
    "categories": [
      { "name": "Learning", "score": 0, "reason": "string" },
      { "name": "Career", "score": 0, "reason": "string" },
      { "name": "Finance", "score": 0, "reason": "string" },
      { "name": "Health", "score": 0, "reason": "string" },
      { "name": "Relationships", "score": 0, "reason": "string" },
      { "name": "Mindset", "score": 0, "reason": "string" }
    ]
  },
  "reflectionQuestions": ["string", "string", "string"]
}
Decision question: ${question}
Category: ${category}
Path A: ${pathA}
Path B: ${pathB}
Saved user context, if any: ${profileFacts}
Rules: This is not prediction. Use possible outcome, potential risk, likely impact, and possible long-term effects. Include exactly two paths unless the question clearly needs a third. Scores must be 0-100 and should estimate alignment with the user's stated goals when available. Future Self Letter should sound emotional, realistic, encouraging, and connected to the user's goals, not dramatic or guaranteed. Future Score should explain why categories increase or decrease. End with these themes: which future feels closer to goals, which choice aligns with the person they want to become, and one small action today.`;
}

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

function normalizeFutureMirrorResult(parsed, fallback) {
  const safePaths = Array.isArray(parsed && parsed.paths) ? parsed.paths : [];
  return {
    id: `future-mirror-${Date.now()}`,
    user_id: currentUserId(),
    question: cleanText((parsed && parsed.question) || fallback.question, 260),
    category: futureMirrorCategories.includes(parsed && parsed.category) ? parsed.category : fallback.category,
    summary: cleanText((parsed && parsed.summary) || "Future Mirror compares possible impacts. It does not predict or guarantee outcomes.", 500),
    paths: safePaths.slice(0, 3).map((path, index) => ({
      name: cleanText(path.name || `Path ${String.fromCharCode(65 + index)}`, 40),
      choice: cleanText(path.choice || (index === 0 ? fallback.pathA : fallback.pathB), 180),
      benefits: Array.isArray(path.benefits) ? path.benefits.slice(0, 4).map((item) => cleanText(item, 180)).filter(Boolean) : ["Possible benefits depend on how consistently you act."],
      risks: Array.isArray(path.risks) ? path.risks.slice(0, 4).map((item) => cleanText(item, 180)).filter(Boolean) : ["Potential risks should be reviewed before choosing."],
      shortTermImpact: cleanText(path.shortTermImpact || "Possible short-term impact depends on your next action.", 260),
      longTermImpact: cleanText(path.longTermImpact || "Possible long-term effects depend on habits, support, and timing.", 260),
      goalAlignmentScore: Math.max(0, Math.min(100, Number(path.goalAlignmentScore || 0)))
    })).filter((path) => path.choice),
    timeline: {
      "1 month": cleanText(parsed && parsed.timeline && parsed.timeline["1 month"] || "Patterns may become clearer after repeated choices.", 260),
      "6 months": cleanText(parsed && parsed.timeline && parsed.timeline["6 months"] || "Small repeated actions may start shaping opportunities.", 260),
      "1 year": cleanText(parsed && parsed.timeline && parsed.timeline["1 year"] || "Longer-term effects depend on consistency and support.", 260),
      "3 years": cleanText(parsed && parsed.timeline && parsed.timeline["3 years"] || "This choice may become one part of a larger pattern, not a fixed destiny.", 260)
    },
    futureSelfLetter: cleanText(parsed && parsed.futureSelfLetter || "Dear me, I cannot promise exactly how life turns out, but I am proud when you choose the path that protects your growth, health, and values. Take one honest step today. It matters more than it looks.", 1200),
    futureScore: normalizeFutureScore(parsed && parsed.futureScore),
    reflectionQuestions: Array.isArray(parsed && parsed.reflectionQuestions) && parsed.reflectionQuestions.length
      ? parsed.reflectionQuestions.slice(0, 4).map((item) => cleanText(item, 220)).filter(Boolean)
      : [
        "Which future feels closer to your goals?",
        "Which choice aligns with the person you want to become?",
        "What is one small action you can take today?"
      ],
    generated_at: new Date().toISOString(),
    display_time: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  };
}

function normalizeFutureScore(score = {}) {
  const categoryNames = ["Learning", "Career", "Finance", "Health", "Relationships", "Mindset"];
  const sourceCategories = Array.isArray(score.categories) ? score.categories : [];
  const categories = categoryNames.map((name) => {
    const found = sourceCategories.find((item) => String(item.name || "").toLowerCase() === name.toLowerCase()) || {};
    return {
      name,
      score: Math.max(0, Math.min(100, Number(found.score || score[name.toLowerCase()] || 50))),
      reason: cleanText(found.reason || "This score depends on how the choice supports your habits, goals, and balance.", 220)
    };
  });
  const average = Math.round(categories.reduce((sum, item) => sum + item.score, 0) / categories.length);
  return {
    overall: Math.max(0, Math.min(100, Number(score.overall || average))),
    explanation: cleanText(score.explanation || "Scores rise when a choice supports learning, healthy routines, relationships, and future options. Scores fall when the choice creates avoidable risk or moves away from your goals.", 360),
    categories
  };
}

function futureMirrorPathCards(result) {
  return (result.paths || []).map((path) => `
    <article class="mirror-path-card">
      <div class="mirror-path-top">
        <span>${escapeHTML(path.name)}</span>
        <strong><small>Goal alignment</small>${Number(path.goalAlignmentScore || 0)}%</strong>
      </div>
      <h3>${escapeHTML(path.choice)}</h3>
      <div class="mirror-score-bar"><i style="width:${Number(path.goalAlignmentScore || 0)}%"></i></div>
      <div class="mirror-list-grid">
        <div><strong>Possible benefits</strong><ul>${(path.benefits || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></div>
        <div><strong>Potential risks</strong><ul>${(path.risks || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></div>
      </div>
      <div class="mirror-impact-grid">
        <div><strong>Short-term impact</strong><p>${escapeHTML(path.shortTermImpact)}</p></div>
        <div><strong>Long-term impact</strong><p>${escapeHTML(path.longTermImpact)}</p></div>
      </div>
    </article>
  `).join("");
}

function futureMirrorTimeline(result) {
  const timeline = result.timeline || {};
  const orderedTimeline = {
    "1 month": timeline["1 month"] || "Patterns may become clearer after repeated choices.",
    "6 months": timeline["6 months"] || "Small repeated actions may start shaping opportunities.",
    "1 year": timeline["1 year"] || "Longer-term effects depend on consistency and support.",
    "3 years": timeline["3 years"] || "This choice may become one part of a larger pattern, not a fixed destiny."
  };
  return `
    <section class="mirror-timeline-card">
      <p class="eyebrow">Future Timeline</p>
      <div class="mirror-timeline">
        ${Object.entries(orderedTimeline).map(([label, text]) => `
          <div class="timeline-step">
            <span>${escapeHTML(label)}</span>
            <p>${escapeHTML(text)}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function futureScoreCard(result) {
  const score = result.futureScore || normalizeFutureScore();
  return `
    <section class="future-score-card">
      <div class="future-score-top">
        <div>
          <p class="eyebrow">Future Score</p>
          <h3>${Number(score.overall || 0)}/100</h3>
        </div>
        <div class="future-score-ring" style="--score:${Number(score.overall || 0)}"><strong>${Number(score.overall || 0)}</strong></div>
      </div>
      <p>${escapeHTML(score.explanation)}</p>
      <div class="future-score-grid">
        ${(score.categories || []).map((item) => `
          <article>
            <strong>${escapeHTML(item.name)} <span>${Number(item.score || 0)}</span></strong>
            <i><b style="width:${Number(item.score || 0)}%"></b></i>
            <p>${escapeHTML(item.reason)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function futureSelfLetterCard(result) {
  return `
    <section class="future-letter-card">
      <p class="eyebrow">Future Self Letter</p>
      <h3>A note from the person you are becoming</h3>
      <p>${escapeHTML(result.futureSelfLetter || "")}</p>
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
          <div><strong>No saved decisions yet</strong><p>Generate a Future Mirror, then save it for later reflection.</p></div>
        </section>
      `}
    </section>
  `;
}

function futureMirrorResultCard() {
  const result = trackerState.futureMirror && trackerState.futureMirror.latest;
  if (isFutureMirrorLoading) {
    return `
      <section class="mirror-loading-card">
        <p class="eyebrow">Future Mirror is thinking</p>
        <h3>Simulating possible impacts...</h3>
        <p>Compass AI is comparing paths without predicting or guaranteeing the future.</p>
        <div class="mirror-loading-dots"><i></i><i></i><i></i></div>
      </section>
    `;
  }
  if (futureMirrorError) {
    return `
      <section class="mirror-error-card">
        <p class="eyebrow">Could not generate mirror</p>
        <h3>${escapeHTML(futureMirrorError)}</h3>
        <p>Check your local AI server and Groq API key, then try again.</p>
      </section>
    `;
  }
  if (!result) {
    return `
      <section class="mirror-empty-card">
        <p class="eyebrow">Decision impact simulator</p>
        <h3>Future Mirror is not a prediction tool.</h3>
        <p>It helps you compare possible benefits, potential risks, and likely impact so your next step feels clearer.</p>
      </section>
    `;
  }
  return `
    <section class="mirror-result-card">
      <p class="eyebrow">${escapeHTML(result.category)} - ${escapeHTML(result.display_time)}</p>
      <h3>${escapeHTML(result.question)}</h3>
      <p>${escapeHTML(result.summary)}</p>
      <p class="tiny-note">Future Mirror shows possible outcomes, not guaranteed results.</p>
    </section>
    <div class="mirror-path-grid">${futureMirrorPathCards(result)}</div>
    ${futureMirrorTimeline(result)}
    ${futureScoreCard(result)}
    ${futureSelfLetterCard(result)}
    <section class="mirror-reflection-card">
      <p class="eyebrow">Reflection questions</p>
      ${(result.reflectionQuestions || []).map((question) => `<h4>${escapeHTML(question)}</h4>`).join("")}
      <button class="primary-action compact-action" type="button" data-save-future-decision>Save this decision</button>
    </section>
    ${futureMirrorIntegrationCard()}
  `;
}

function futureMirrorIntegrationCard() {
  return `
    <section class="mirror-integration-card">
      <p class="eyebrow">Connect this mirror</p>
      <h3>Turn insight into growth data.</h3>
      <div class="mirror-integration-grid">
        <button type="button" data-discuss-mirror>Discuss with Compass AI</button>
        <button type="button" data-open="growthGoals">Connect to Goals</button>
        <button type="button" data-open="journal">Reflect in Journal</button>
        <button type="button" data-open="mood">Log mood impact</button>
        <button type="button" data-open="challengeHub">Start a Challenge</button>
        <button type="button" data-tab-jump="opportunities">Career Planning</button>
        <button type="button" data-tab-jump="stories">Learn from Inspire Hub</button>
        <button type="button" data-tab-jump="community">Ask Community</button>
        <button type="button" data-save-future-decision>Save for Future Reflection</button>
      </div>
    </section>
  `;
}

function futureMirrorDiscussionPrompt() {
  const result = trackerState.futureMirror && trackerState.futureMirror.latest;
  if (!result) return "Help me use Future Mirror for a decision I am facing.";
  const pathSummary = (result.paths || []).map((path) => `${path.name}: ${path.choice}, goal alignment ${path.goalAlignmentScore}%`).join(" | ");
  return `I want to discuss my Future Mirror result. Decision: ${result.question}. Category: ${result.category}. Paths: ${pathSummary}. Reflection questions: ${(result.reflectionQuestions || []).join(" ")}. Help me choose one small action today without pretending to predict the future.`;
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

function futureMirrorCategoryForReadiness(label) {
  if (label === "Financial Readiness") return "Financial Mirror";
  if (label === "Relationship & Communication Skills") return "Relationship Mirror";
  if (label === "Life Direction & Purpose") return "Career Mirror";
  if (label === "Emotional Resilience") return "Lifestyle Mirror";
  if (label === "Independence & Responsibility") return "Growth Mirror";
  return "Growth Mirror";
}

function futureReadinessMirrorDraft(result) {
  const weakest = weakestReadinessCategory(result);
  const category = weakest.label;
  const pathMap = {
    "Financial Readiness": ["Develop saving and planning habits", "Continue current spending habits"],
    "Decision-Making Skills": ["Use a decision checklist before acting", "Keep choosing based on impulse or pressure"],
    "Emotional Resilience": ["Build recovery habits and ask for support early", "Handle stress alone until it becomes heavy"],
    "Life Direction & Purpose": ["Create a small future plan and test one step", "Wait for direction to become clear by itself"],
    "Relationship & Communication Skills": ["Practice honest communication and boundaries", "Avoid difficult conversations"],
    "Independence & Responsibility": ["Take ownership of one weekly responsibility", "Wait until someone else reminds me"]
  };
  const paths = pathMap[category] || pathMap["Decision-Making Skills"];
  return {
    source: "Future Readiness Assessment",
    question: `How can I improve my ${category.toLowerCase()} after scoring ${weakest.value}/100?`,
    category: futureMirrorCategoryForReadiness(category),
    pathA: paths[0],
    pathB: paths[1],
    note: `Built from your Future Readiness Assessment. Lowest category: ${category} (${weakest.value}/100).`
  };
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

function visibleCommunityPosts() {
  return (trackerState.communityPosts || [])
    .filter((post) => post.user_id === currentUserId() || post.is_sample)
    .slice(0, 8);
}

function communityCards() {
  return communityGroups.map((group) => `
    <article class="community-card">
      <div class="community-card-top">
        <span class="category-badge">${escapeHTML(group.members)} members</span>
        <img src="assets/icon-support.png" alt="">
      </div>
      <h3>${escapeHTML(group.title)}</h3>
      <p>${escapeHTML(group.description)}</p>
      <div class="community-prompts">
        ${(group.prompts || []).map((prompt) => `<span>${escapeHTML(prompt)}</span>`).join("")}
      </div>
      <div class="community-actions">
        <button class="primary-action compact-action" type="button" data-open="communityGroup" data-open-payload="${escapeHTML(group.id)}">Open group</button>
        <button class="secondary-action compact-action" type="button" data-growth-prompt="${escapeHTML(`Help me connect with a ${group.title} growth community safely. Ask me one question about my goal and suggest a respectful first post.`)}">Ask Compass</button>
      </div>
    </article>
  `).join("");
}

function communityWall() {
  const posts = visibleCommunityPosts();
  return `
    <section class="community-wall-card">
      <div class="section-row">
        <div>
          <p class="eyebrow">Anonymous Support Wall</p>
          <h3>Share pressure without exposing private details.</h3>
        </div>
        <button class="secondary-action compact-action" type="button" data-open="communityPost">Post</button>
      </div>
      <div class="community-wall-list">
        ${posts.length ? posts.map((post) => `
          <article>
            <strong>${escapeHTML(post.group || "General support")}</strong>
            <p>${escapeHTML(post.text)}</p>
            <small>${escapeHTML(post.display_time || "Just now")}</small>
          </article>
        `).join("") : `
          <article class="empty-wall">
            <strong>No support posts yet</strong>
            <p>Write a calm anonymous note, question, or encouragement. Do not include private details.</p>
          </article>
        `}
      </div>
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

function futureMirrorQuestionValue() {
  if (futureMirrorDraft && futureMirrorDraft.question) return futureMirrorDraft.question;
  return trackerState.futureMirror.latest ? trackerState.futureMirror.latest.question : "";
}

function futureMirrorCategoryValue() {
  if (futureMirrorDraft && futureMirrorDraft.category) return futureMirrorDraft.category;
  return trackerState.futureMirror.latest ? trackerState.futureMirror.latest.category : "";
}

function futureMirrorDraftNotice() {
  if (!futureMirrorDraft) return "";
  return `
    <div class="support-note readiness-mirror-note">
      <strong>${escapeHTML(futureMirrorDraft.source || "Future Readiness Assessment")}</strong>
      <p>${escapeHTML(futureMirrorDraft.note || "Future Mirror is using your assessment result as context.")}</p>
    </div>
  `;
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
        <p class="screen-subtitle">A decision impact simulator for comparing possible paths. It does not predict or guarantee outcomes.</p>
      </div>
      <div class="avatar"><img src="assets/icon-spark.png" alt=""></div>
    </header>

    <section class="mirror-form-card">
      <p class="eyebrow">Try Future Mirror</p>
      <h3>Explore how your choices today may influence your future.</h3>
      ${futureMirrorDraftNotice()}
      <label>Decision question
        <textarea id="mirror-question" placeholder="Should I study tonight or play games?">${escapeHTML(futureMirrorQuestionValue())}</textarea>
      </label>
      <label>Mirror category
        <select id="mirror-category">
          ${futureMirrorCategories.map((category) => `<option value="${escapeHTML(category)}" ${futureMirrorCategoryValue() === category ? "selected" : ""}>${escapeHTML(category)}</option>`).join("")}
        </select>
      </label>
      <div class="mirror-path-inputs">
        <label>Path A<input id="mirror-path-a" type="text" placeholder="Example: Study tonight" value="${escapeHTML(futureMirrorDraft ? futureMirrorDraft.pathA || "" : "")}"></label>
        <label>Path B<input id="mirror-path-b" type="text" placeholder="Example: Play games" value="${escapeHTML(futureMirrorDraft ? futureMirrorDraft.pathB || "" : "")}"></label>
      </div>
      <div class="mirror-example-row">
        ${futureMirrorExamples.map((example) => `<button type="button" data-mirror-example="${escapeHTML(example)}">${escapeHTML(example)}</button>`).join("")}
      </div>
      <button class="primary-action mirror-run-action" type="button" data-run-future-mirror ${isFutureMirrorLoading ? "disabled" : ""}>${isFutureMirrorLoading ? "Generating..." : "Generate Future Mirror"}</button>
    </section>

    ${futureMirrorResultCard()}
    ${futureReflectionList()}
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

    ${growthSuggestionCard()}

    ${growthHubSection({
      title: "Goals & Dreams",
      subtitle: "Save the future you are aiming toward.",
      icon: "icon-learn.png",
      tone: "goals-tone",
      items: [
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
        { title: "Receipt record", text: "Track what you paid today.", modal: "receipt" }
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
  `,

  community: () => `
    <header class="screen-head compact-head community-head">
      <div>
        <p class="eyebrow">Growth Community</p>
        <h2 class="screen-title">Find people growing in the same direction.</h2>
        <p class="screen-subtitle">Not dating. Communities, goal groups, growth partners, and anonymous support for youth development.</p>
      </div>
      <div class="avatar"><img src="assets/icon-support.png" alt=""></div>
    </header>

    <section class="community-hero-card">
      <div>
        <p class="eyebrow">Connected growth</p>
        <h3>Future choices are easier when support is nearby.</h3>
        <p>Use Community to discuss goals, ask for encouragement, find accountability, and stay realistic.</p>
      </div>
      <div class="community-stat-row">
        <span><strong>${communityGroups.length}</strong>Communities</span>
        <span><strong>${visibleCommunityPosts().length}</strong>Posts</span>
        <span><strong>${trackerState.supportContacts.filter((contact) => contact.user_id === currentUserId() || !contact.user_id).length}</strong>Trusted people</span>
      </div>
    </section>

    ${growthPartnerCard()}

    <div class="content-rail-title"><strong>Growth communities</strong><span>Goal groups</span></div>
    <div class="community-grid">${communityCards()}</div>

    ${communityWall()}
  `,

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

  communityGroup: (id) => {
    const group = communityGroups.find((item) => item.id === id) || communityGroups[0];
    return `
      <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-group-title">
        <div class="modal-top">
          <span class="risk-pill calm">Growth Community</span>
          <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
        </div>
        <h3 id="community-group-title">${escapeHTML(group.title)}</h3>
        <p class="muted">${escapeHTML(group.description)}</p>
        <div class="advice-stack">
          ${(group.prompts || []).map((prompt, index) => `
            <div><strong>Discussion ${index + 1}</strong><span>${escapeHTML(prompt)}</span></div>
          `).join("")}
          <div><strong>Goal group</strong><span>Use this group to share one weekly goal, one blocker, and one realistic update.</span></div>
          <div><strong>Safety rule</strong><span>Do not share full name, address, school schedule, passwords, payment details, or private contact information publicly.</span></div>
        </div>
        <div class="profile-actions">
          <button class="primary-action" type="button" data-open="communityPost" data-open-payload="${escapeHTML(group.title)}">Write anonymous post</button>
          <button class="secondary-action" type="button" data-growth-prompt="${escapeHTML(`Help me write a respectful first post for the ${group.title} community. Keep it safe, short, and focused on growth.`)}">Ask Compass</button>
        </div>
      </div>
    `;
  },

  communityPost: (groupName = "") => `
    <div class="modal-card assessment-modal" role="dialog" aria-modal="true" aria-labelledby="community-post-title">
      <div class="modal-top">
        <span class="risk-pill calm">Anonymous support</span>
        <button class="ghost-circle" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="community-post-title">Write a safe support wall post</h3>
      <p class="muted">Keep it kind and anonymous. Do not include private personal details.</p>
      <div class="admin-form">
        <label>Community
          <select id="community-post-group">
            ${["General support", ...communityGroups.map((group) => group.title)].map((title) => `
              <option value="${escapeHTML(title)}" ${groupName === title ? "selected" : ""}>${escapeHTML(title)}</option>
            `).join("")}
          </select>
        </label>
        <label>Post<textarea id="community-post-text" placeholder="Example: I am trying to study more consistently this week. What helped you start when motivation was low?"></textarea></label>
        <p class="form-error" id="community-post-error" aria-live="polite"></p>
      </div>
      <button class="primary-action" type="button" data-save-community-post>Post anonymously</button>
    </div>
  `,

  safety: () => `
    <div class="modal-card dark-modal" role="dialog" aria-modal="true" aria-labelledby="safety-title">
      <div class="modal-top">
        <span class="risk-pill light">Safety check</span>
        <button class="ghost-circle light" type="button" data-close aria-label="Close">x</button>
      </div>
      <h3 id="safety-title">Make the next move safer</h3>
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
  const context = {
    savedUserProfile: compassProfileForAI(),
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

async function runFutureMirrorSimulation() {
  const questionInput = document.querySelector("#mirror-question");
  const categoryInput = document.querySelector("#mirror-category");
  const pathAInput = document.querySelector("#mirror-path-a");
  const pathBInput = document.querySelector("#mirror-path-b");
  const question = cleanText(questionInput ? questionInput.value : "", 260);
  const category = futureMirrorCategories.includes(categoryInput ? categoryInput.value : "") ? categoryInput.value : "Growth Mirror";
  const pathA = cleanText(pathAInput ? pathAInput.value : "", 180);
  const pathB = cleanText(pathBInput ? pathBInput.value : "", 180);
  futureMirrorError = "";
  if (!question || !pathA || !pathB) {
    futureMirrorError = "Add a decision question and at least two possible paths.";
    renderScreen("future");
    return;
  }
  isFutureMirrorLoading = true;
  renderScreen("future");
  try {
    const reply = await requestCompassDirect(FUTURE_MIRROR_SYSTEM_PROMPT, futureMirrorPrompt(question, category, pathA, pathB));
    const parsed = extractJsonObject(reply);
    const result = normalizeFutureMirrorResult(parsed || { summary: reply }, { question, category, pathA, pathB });
    if (!result.paths.length) {
      result.paths = [
        {
          name: "Path A",
          choice: pathA,
          benefits: ["This path may support progress if you follow through consistently."],
          risks: ["This path may still require energy, time, and support."],
          shortTermImpact: "Possible short-term impact depends on your immediate action.",
          longTermImpact: "Possible long-term effects depend on whether this becomes a repeated pattern.",
          goalAlignmentScore: 50
        },
        {
          name: "Path B",
          choice: pathB,
          benefits: ["This path may meet a different need or reduce pressure in the short term."],
          risks: ["This path may create trade-offs if it moves you away from your goals."],
          shortTermImpact: "Possible short-term impact depends on timing and context.",
          longTermImpact: "Possible long-term effects depend on habit, support, and opportunity cost.",
          goalAlignmentScore: 50
        }
      ];
    }
    trackerState.futureMirror.latest = result;
    futureMirrorDraft = null;
    saveTrackerState();
  } catch (error) {
    console.error("[Future Mirror] Request failed", error);
    futureMirrorError = "Future Mirror is having trouble generating insights right now. Please try again.";
  } finally {
    isFutureMirrorLoading = false;
    renderScreen("future");
    refreshStaticScreens();
  }
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
  const runFutureMirror = event.target.closest("[data-run-future-mirror]");
  const mirrorExample = event.target.closest("[data-mirror-example]");
  const discussMirror = event.target.closest("[data-discuss-mirror]");
  const saveFutureDecision = event.target.closest("[data-save-future-decision]");
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
  const saveJournal = event.target.closest("[data-save-journal]");
  const startChallenge = event.target.closest("[data-start-challenge]");
  const saveCommunityPost = event.target.closest("[data-save-community-post]");
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

  if (opener) openModal(opener.dataset.open, opener.dataset.reflectionId || opener.dataset.openPayload || "");
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
  if (mirrorExample) {
    const question = document.querySelector("#mirror-question");
    const pathA = document.querySelector("#mirror-path-a");
    const pathB = document.querySelector("#mirror-path-b");
    const example = mirrorExample.dataset.mirrorExample || "";
    if (question) question.value = example;
    if (pathA && pathB) {
      if (example.includes("study")) {
        pathA.value = "Study tonight";
        pathB.value = "Play games tonight";
      } else if (example.includes("internship")) {
        pathA.value = "Apply for the internship";
        pathB.value = "Wait and apply later";
      } else if (example.includes("save")) {
        pathA.value = "Save the money";
        pathB.value = "Spend the money now";
      } else if (example.includes("challenge")) {
        pathA.value = "Join the challenge";
        pathB.value = "Skip the challenge";
      }
    }
  }
  if (runFutureMirror) {
    await runFutureMirrorSimulation();
  }
  if (discussMirror) {
    renderScreen("compass");
    await sendChatMessage(futureMirrorDiscussionPrompt());
  }
  if (saveFutureDecision) {
    const latest = trackerState.futureMirror && trackerState.futureMirror.latest;
    if (latest) {
      const exists = savedFutureDecisions().some((item) => item.source_id === latest.id || item.question === latest.question);
      if (!exists) {
        trackerState.futureMirror.saved.unshift({
          ...latest,
          id: `saved-${Date.now()}`,
          source_id: latest.id,
          user_id: currentUserId(),
          saved_at: new Date().toISOString(),
          decisionMade: "",
          whatHappened: "",
          lesson: ""
        });
        trackerState.futureMirror.saved = trackerState.futureMirror.saved.slice(0, 30);
        saveTrackerState();
      }
      renderScreen("future");
      refreshStaticScreens();
    }
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

  if (exploreReadinessFuture) {
    const result = trackerState.assessment;
    if (result) {
      futureMirrorDraft = futureReadinessMirrorDraft(result);
      closeModal();
      renderScreen("future");
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
    const text = cleanText(textInput ? textInput.value : "", 500);
    if (!text || text.length < 8) {
      if (error) error.textContent = "Write a short but clear post first.";
      return;
    }
    trackerState.communityPosts.unshift({
      id: `community-${Date.now()}`,
      user_id: currentUserId(),
      group: groupInput ? groupInput.value : "General support",
      text,
      created_at: new Date().toISOString(),
      display_time: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    });
    trackerState.communityPosts = trackerState.communityPosts.slice(0, 60);
    saveTrackerState();
    closeModal();
    renderScreen("community");
    refreshStaticScreens();
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

