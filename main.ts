// Lentera Malam — entry program (Node 22, standard library only).
//
// It hands the game in: copies game/ and screenshots/ from beside this
// file into the output directory (/output, or MAKEFUN_OUTPUT_DIR
// outside the grader) and writes /output/dossier.json with the
// vendored make.fun library, which summarises the game for the judge.
//
// Usage (from this directory):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program runs twice by the grader and both runs must write the
// same bytes: it copies files only, writes no timestamps, and the
// dossier is a pure function of the files it reads.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps for this competition: the dossier text is
// capped at 160 KiB; screenshots at most 4 of at most 256 KiB each;
// game/ at most 993 files and 48 MiB in all, no path over 1000 bytes.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message) {
  throw new Error(`main.ts: ${message}`);
}

function buildEntry() {
  const gameDir = join(here, 'game');
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
  if (!existsSync(shotsDir)) fail('screenshots/ is missing');

  // Start from a clean output so a stale file can never leak in.
  mkdirSync(outDir, { recursive: true });
  rmSync(join(outDir, 'game'), { recursive: true, force: true });
  rmSync(join(outDir, 'screenshots'), { recursive: true, force: true });
  rmSync(join(outDir, 'dossier.json'), { force: true });

  cpSync(gameDir, join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  return { gameDir, shotsDir };
}

const { gameDir } = buildEntry();
console.log(`Lentera Malam: wrote ${outDir} from ${gameDir}`);
