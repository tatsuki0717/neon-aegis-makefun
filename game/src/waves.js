// Wave plans: what spawns, in what order, across the 10 finite waves.
// Difficulty escalates by count, mix, spawn pace and a small health scale;
// wave 10 ends with the Sentinel Core boss — clear it and the run is won.

import { TOTAL_WAVES } from './config.js';

function repeat(kind, count) { return Array.from({ length: count }, () => kind); }

export function createWavePlan(wave) {
  const plans = {
    1: [...repeat('chaser', 5)],
    2: [...repeat('chaser', 6), ...repeat('weaver', 2)],
    3: [...repeat('weaver', 4), ...repeat('chaser', 5), ...repeat('dasher', 1)],
    4: [...repeat('chaser', 6), ...repeat('dasher', 3), ...repeat('weaver', 3), 'tank'],
    5: [...repeat('weaver', 6), ...repeat('dasher', 4), ...repeat('chaser', 4), 'tank'],
    6: [...repeat('dasher', 5), ...repeat('chaser', 7), ...repeat('weaver', 4), 'tank'],
    7: [...repeat('chaser', 6), ...repeat('weaver', 6), ...repeat('dasher', 4), 'tank', 'tank'],
    8: [...repeat('weaver', 7), ...repeat('dasher', 6), ...repeat('chaser', 6), 'tank', 'tank'],
    9: [...repeat('dasher', 7), ...repeat('chaser', 8), ...repeat('weaver', 6), 'tank', 'tank', 'tank'],
    10: [...repeat('chaser', 6), ...repeat('weaver', 5), ...repeat('dasher', 5), 'tank', 'tank', 'boss'],
  };
  const list = plans[wave] ?? plans[TOTAL_WAVES];
  // Interleave deterministically so kinds arrive mixed, not in blocks.
  const mixed = [];
  const buckets = new Map();
  for (const kind of list) { if (!buckets.has(kind)) buckets.set(kind, []); buckets.get(kind).push(kind); }
  const queues = [...buckets.values()];
  let added = true;
  while (added) {
    added = false;
    for (const queue of queues) if (queue.length) { mixed.push(queue.shift()); added = true; }
  }
  return mixed;
}

export function waveHealthScale(wave) { return 1 + (wave - 1) * 0.12; }

export function waveSpawnInterval(wave) { return Math.max(0.45, 1.05 - wave * 0.06); }

export function isFinalWave(wave) { return wave >= TOTAL_WAVES; }

export function waveIntroText(wave) {
  if (wave === 1) return 'WAVE 1 — Swarm incoming';
  if (wave === TOTAL_WAVES) return 'FINAL WAVE — Destroy the Sentinel Core!';
  return `WAVE ${wave}`;
}
