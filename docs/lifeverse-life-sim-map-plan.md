# LifeVerse Life Sim Map Plan

Version: 2026-07-22

## Purpose

Life Sim should feel like a playable adult-life simulator, not a dashboard and not a sightseeing prototype. The map is a compact Singapore-inspired district where youth players move through daily routines, make choices, and see how those choices affect money, time, health, relationships, education, career, and long-term readiness.

The target camera is a PUBG-style over-shoulder third-person view: low, close, landscape-first, with the player on the left third and the street opening forward.

## Supported Product Pillars

- Independent adulthood preparation
- Meaningful daily choices
- Interconnected life systems
- Long-term thinking
- Reflection through consequences
- Believable life simulation over artificial engagement

## Supported Learning Outcomes

- Understand that daily routes shape outcomes.
- Notice trade-offs between time, money, health, stress, learning, and relationships.
- Practice planning instead of reacting.
- See how world conditions and opportunity access affect adult life.
- Reflect on why a result happened, not only what changed.

## Map Philosophy

Do not build a full Singapore map yet. Build one compact symbolic Singapore district that feels dense, readable, and purposeful. Every location must communicate its function without relying only on labels.

The player should understand:

- Home is for rest, bills, family, housing, and responsibility.
- MRT is for commute choices and time pressure.
- Work is for income, burnout, skills, and opportunity.
- Food Court is for cheap food, health trade-offs, and spending.
- Mall is for temptation, lifestyle, and financial awareness.
- Park, Gym, Hospital, and Beach are for health, recovery, and stress.
- University, Library, and Cafe are for learning, focus, and future planning.
- Chinatown, Little India, Bugis, and Clarke Quay are for culture, social connection, and balance.
- Marina Bay and Airport are future-facing places tied to ambition and mobility.

## Camera Direction

Use the current `OVER_SHOULDER_CAMERA` as the default Life Sim camera.

Rules:

- FOV around 68.
- Camera distance around 5.2 world units.
- Shoulder offset around 1.18 world units.
- Player should sit on the left third.
- Look target should be several meters ahead, not directly on the player.
- Right side drag rotates camera.
- Left joystick moves character relative to camera direction.
- UI must not cover the street center or player silhouette.

Avoid:

- Top-down map view as the default.
- High floating camera.
- Centered character with no shoulder offset.
- Dashboard panels during normal exploration.

## District Plan

The machine-readable version lives in `assets/life-sim/map-plan.json`.

### 1. Heartland Independence

Zones:

- Home
- HDB Hub
- Woodlands
- Punggol

Purpose:

Housing, bills, neighborhood life, community, and daily responsibility.

Important visual cues:

- HDB blocks
- Void deck
- Mailbox and bill reminders
- Community board
- Walkways and local greenery

Connected systems:

- Housing
- Finance
- Relationships
- Needs
- Progression

### 2. Health And Recovery

Zones:

- Park
- Gym
- Hospital
- Beach

Purpose:

Energy, stress, illness, recovery, exercise, and self-care choices.

Important visual cues:

- Park loop
- Gym equipment
- Hospital drop-off
- Beach boardwalk
- Quiet recovery areas

Connected systems:

- Health
- Mental Wellbeing
- Needs
- Finance
- Time

### 3. Learning And Purpose

Zones:

- University
- Library
- Cafe

Purpose:

Education progress, focus, skill growth, reflection, and future direction.

Important visual cues:

- Lecture hall
- Library shelves
- Study tables
- Scholarship posters
- Quiet cafe seating

Connected systems:

- Education
- Career
- Mental Wellbeing
- Time
- Progression

### 4. Work And Money

Zones:

- Work
- Raffles Place
- Mall
- Food Court

Purpose:

Income, spending, career pressure, budget choices, and lifestyle trade-offs.

Important visual cues:

- Office tower
- CBD skyline
- Hawker stalls
- Sale banners
- ATM and shopfronts

Connected systems:

- Career
- Finance
- Needs
- Economy
- Life Report

### 5. Culture And Social Balance

Zones:

- Chinatown
- Little India
- Bugis
- Clarke Quay

Purpose:

Friendship, community, culture, identity, relationship maintenance, and social spending.

Important visual cues:

- Shophouse rows
- Temple street
- Lanterns
- Riverside seating
- Night social route

Connected systems:

- Relationships
- Mental Wellbeing
- Finance
- Time
- NPC Simulation

### 6. Mobility And Future Edge

Zones:

- Train Station
- Airport
- Marina Bay

Purpose:

Commute, future opportunity, long-term mobility, and ambition.

Important visual cues:

- MRT sign
- Ticket gates
- Airport terminal
- CBD skyline
- Opportunity billboard

Connected systems:

- Transportation
- Career
- Opportunity
- World Simulation
- Future Mirror

## Route Plan

Routes are more important than adding more places. The player should feel adult-life pressure through movement.

### Morning Commute

Path:

Home -> MRT -> Work

Alternate:

Home -> MRT -> University

Learning:

Save time or save money while managing energy.

### Money Pressure Loop

Path:

Work -> Food Court -> Mall -> Home

Learning:

Income can disappear through small daily spending.

### Health Reset Loop

Path:

Home -> Park -> Gym -> Food Court

Alternate:

Home -> Hospital -> Park

Learning:

Early recovery is cheaper than late recovery.

### Opportunity Day

Path:

University -> Library -> Cafe -> Raffles Place

Learning:

Preparation improves opportunity access.

### Social Balance Night

Path:

Work -> Clarke Quay -> Bugis -> Home

Learning:

Connection matters, but time, money, and sleep still count.

### Future Gateway

Path:

MRT -> Marina Bay -> Airport

Learning:

Future mobility depends on today's preparation.

## Objaverse Loading Plan

The map must stay playable even when optional assets are heavy, slow, missing, or malformed.

Rules:

- Do not preload every Objaverse model on Life Sim entry.
- Load only the spawn district and adjacent route first.
- Load far districts in the background.
- Load decorative props only when that category is actually used.
- Keep procedural fallbacks active until real assets finish.
- Never make gameplay logic depend on decorative mesh names.
- Every Objaverse asset needs `targetHeightMeters`.
- Every real mesh that affects movement needs a separate collision proxy.
- If an asset fails, log it and continue.

Suggested budgets:

- First playable entry: under 18 MB of critical assets.
- Full background load: under 45 MB.
- Near district concurrency: 3.
- Far district concurrency: 2.
- Shadow map: 1024.
- Pixel ratio cap: 1.35.

## Long-Term Consequences

The map should show consequences physically:

- Low money: visible bill/mail reminder at Home or HDB Hub.
- High stress: recovery places become highlighted.
- Poor health: Hospital suggestions become more visible.
- Low skills: opportunity doors stay locked or unclear.
- Strong preparation: Library, University, Raffles Place, and Airport show better opportunity prompts.
- Relationship neglect: social districts feel quieter.

## Reflection Opportunities

Reflection should trigger after a route, not only after a form.

Examples:

- "You worked late and skipped recovery. What did that trade-off cost?"
- "You saved money by eating cheaply. Did it affect your health or energy?"
- "You spent time preparing before seeking opportunity. What changed?"
- "You socialized after work. Did it restore you or drain you?"

## Technical Considerations

- Keep `life-sim.js` as renderer/controller for now.
- Use `assets/life-sim/map-plan.json` as the planning source for future data-driven extraction.
- Future step: move `locationZones`, routes, district metadata, and asset slots out of `life-sim.js`.
- Keep all gameplay actions routed through LifeVerse command/simulation systems.
- Keep asset loading behind the asset manager.
- Add tests before every new Objaverse batch.

## Red Lines

- Do not expand the map before the existing compact district feels meaningful.
- Do not add props that do not support a place identity or life choice.
- Do not block movement while optional models load.
- Do not put large UI panels over the over-shoulder street view.
- Do not allow one failed asset to break Life Sim.
