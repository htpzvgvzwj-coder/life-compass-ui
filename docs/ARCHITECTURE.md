# LifeVerse Architecture (rewrite, started 2026-07-23)

## Status

All `lifeverse-*.js` files predate the engineering charter below and are
considered **void** — reference material at best, not a base to build on.
They are being replaced one system at a time. See `TODO.md` for progress.

Rewritten so far: **Time** (`lifeverse-time.js`).

## Charter summary

This is a continuously-running world simulation, not a scripted game.
The player is an ordinary person in the world; the world does not start
or stop for them. NPCs follow the exact same rules as the player.

- No scripted events, no fixed plot, no random events. Only systems
  running continuously — events are what falls out of systems
  interacting over time.
- Every system must model the *process* that produces an outcome, not
  the outcome itself.
- No new game rules, features, or design changes without proposing them
  and getting explicit confirmation first.

## Module conventions

- Global namespace: `window.LifeVerseGame`. Each system owns a
  sub-namespace (e.g. `game.time`), not a flat pile of top-level
  functions — this is the one deliberate deviation from the pre-charter
  files, which attached everything directly to `game.*`.
- Systems are pure functions over an explicit `state` argument owned by
  the caller. No system holds its own hidden mutable singleton. This is
  what makes systems independently testable and swappable (including
  swapping out the AI driving NPC decisions).
- A system must not reference another system's namespace. Cross-system
  coordination (e.g. "what should run this tick") belongs to a future
  scheduler/orchestration system, not inside individual systems.

## LOD (level of detail) principle

No system may be added unless it can define a dormant state.

| State | Where | Behavior |
|---|---|---|
| Full | Player's immediate vicinity | Full AI, animation, physics, behavior |
| Simplified | Farther away | State/position updates, light decision-making, no heavy computation |
| Dormant | Player cannot reach it | No AI, no physics, no rendering — state is just held |

The Time system itself is the one exception to "per-system LOD": there is
a single global clock, not one per distance band. It exists precisely so
that other systems have a consistent signal (`totalMinutes`) to decide
their own LOD/tick cadence against. That scheduling logic doesn't live in
the Time system — seeAPI.md's boundary note.

## NPC behavior chain

Every NPC action must be traceable through:

Environment → Perception → Memory → Thought → Decision → Action

No teleporting, no information without a perception source, no emotion or
goal change without a cause in that chain.

## Art principle

Highest sense of life, not highest fidelity. Lived-in over pristine:
wear, history, evidence of use. Detail density over model precision.
