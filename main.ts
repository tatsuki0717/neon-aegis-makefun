// A working best-game-01 entry (Node 22, standard library only): the game is this directory's
// game/ folder, plain static files a desktop browser loads offline (game/index.html and its ES
// modules, no library and no network request), and the program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json, the summary the
// judge reads, with the vendored make.fun library. A starting point, not a winner: Block Dodger, a
// plain 2D canvas game where a paddle dodges falling blocks and catches coins, with a title screen,
// score, lives and levels, game over and restart, flat colours and no sound. Build your own game
// (any genre, any library you vendor under game/, or none), put your 3 or 4 PNG or JPEG screenshots
// in screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Neon Aegis hand-in self-check, written for this entry: the dossier is the
// only artefact the judge reads, so before this program exits it proves the
// dossier it just wrote is the current schema, that the screenshots the
// cover is drawn from are really in /output, and it logs a one-line summary
// of what was handed in. It writes nothing: /output keeps exactly the shape
// the starter produces, so a failure here means the hand-in is broken, not
// that the check changed it.
import { readFileSync, readdirSync, statSync } from 'node:fs';

function countGameFiles(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    total += name.isDirectory() ? countGameFiles(join(dir, name.name)) : 1;
  }
  return total;
}

const handedIn = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
if (handedIn.schema !== 'makefun/dossier/v1') {
  throw new Error(`Neon Aegis: unexpected dossier schema ${String(handedIn.schema)}`);
}
const shotNames = readdirSync(join(out, 'screenshots')).filter((name) => /\.(png|jpe?g)$/i.test(name));
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`Neon Aegis: expected 3 or 4 screenshots, found ${shotNames.length}`);
}
console.log(
  `Neon Aegis handed in: ${shotNames.length} screenshots, ${countGameFiles(join(out, 'game'))} game files, ` +
    `dossier ${statSync(join(out, 'dossier.json')).size} bytes.`,
);
