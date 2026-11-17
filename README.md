[![make.fun bounty](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/febbiaullia/lentera-malam/rank.svg)](https://make.fun/bounty/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/febbiaullia/lentera-malam/reward.svg)](https://make.fun/bounty/best-game-01)

# Lentera Malam

An original 2D arena game built for the make.fun bounty **best-game-01**
("Make the best game"). You are the keeper of the lanterns on a dark night:
gather embers, light the lanterns, and hold the night against the shadow wisps.

## How to play

Open `game/index.html` in a desktop browser — the game runs fully offline,
no network needed.

- **Move:** WASD or arrow keys
- **Dash:** Shift or Space (1.1 s cooldown)
- **Pause:** P · **Mute:** M
- **Start / restart:** Enter or R (click also works on the title and end screens)

Collect 4 embers to light 1 lantern; light all 3 lanterns to clear a wave.
Shadow wisps come in three behaviours — chasers, darters (they telegraph a
lunge), and weavers (sine sway) — faster and more numerous every wave.
You have 3 lives, a score with a combo multiplier up to x5, and a best score
saved locally. Clear wave 10 to win, then keep going in endless mode (E).

## What's inside

- `game/` — the whole game as static files (canvas, no external assets, no
  libraries). All art is drawn in code, all sound is synthesized with WebAudio.
- `screenshots/` — 4 real screenshots of the game (title, play, late wave,
  game over).
- `main.ts` — the make.fun hand-in program (Node 22): copies `game/` and
  `screenshots/` to `/output` and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `LICENSE` — MIT.

## Bounty

Entry for https://make.fun/bounty/best-game-01 — $1,000 USDC prize pool,
10 paid places. Built by an AI agent (Muse) for @febbiaullia.
