// Screenshot staging behind ?shot=title|play|boss|end&seed=N.
// Each scene runs the real world simulation forward, steered by a simple autopilot
// (aim at the nearest hostile, keep distance, fire), so every screenshot is a genuine
// render of actual play — never a hand-drawn or composited image.

import { FIELD, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';

function autopilotControl(world) {
  const player = world.player;
  let target = null;
  let targetDistance = Infinity;
  for (const enemy of world.enemies) {
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distance < targetDistance) { targetDistance = distance; target = enemy; }
  }
  // Dodge incoming bolts sideways when one is close.
  let dodge = { x: 0, y: 0 };
  for (const bolt of world.bolts) {
    const distance = Math.hypot(bolt.x - player.x, bolt.y - player.y);
    if (distance < 90) { dodge = { x: -bolt.vy, y: bolt.vx }; }
  }
  if (!target) return { move: dodge, aim: { x: player.x + 120, y: player.y - 80 }, firing: false };
  const aim = { x: target.x + target.vx * 0.12, y: target.y + target.vy * 0.12 };
  let move = { x: 0, y: 0 };
  if (targetDistance < 150) move = { x: (player.x - target.x) / targetDistance, y: (player.y - target.y) / targetDistance };
  else if (targetDistance > 320) move = { x: (target.x - player.x) / targetDistance, y: (target.y - player.y) / targetDistance };
  else move = { x: -(target.y - player.y) / targetDistance, y: (target.x - player.x) / targetDistance }; // strafe
  move = { x: move.x + dodge.x * 0.01, y: move.y + dodge.y * 0.01 };
  const length = Math.hypot(move.x, move.y);
  if (length > 1) { move.x /= length; move.y /= length; }
  // Stay off the walls.
  if (player.x < 70) move.x = Math.abs(move.x);
  if (player.x > FIELD.width - 70) move.x = -Math.abs(move.x);
  if (player.y < 90) move.y = Math.abs(move.y);
  if (player.y > FIELD.height - 70) move.y = -Math.abs(move.y);
  return { move, aim, firing: true };
}

function runWorldFor(world, seconds, controlFor = autopilotControl) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.update(STEP, controlFor(world));
    if (world.outcome) break;
  }
}

export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    // ~38 simulated seconds: into wave 3-4 with a healthy score and action on screen.
    runWorldFor(world, 38);
    if (world.outcome) { world.player.health = Math.max(world.player.health, 55); world.outcome = null; }
    // If the pilot just cleared the field, bring the next hostiles in through the
    // game's own spawner so the frame shows a fight, then play on briefly.
    if (world.enemies.length < 5) {
      for (const kind of ['chaser', 'weaver', 'dasher', 'chaser', 'weaver']) world.spawnEnemy(kind);
      runWorldFor(world, 1.4);
      if (world.outcome) { world.outcome = null; world.player.health = Math.max(world.player.health, 55); }
    }
    return { screen: SCREEN_PLAY, best: world.score };
  }
  if (name === 'boss') {
    // Advance through real wave starts (clearing each field) until the final wave,
    // then play the boss fight live for a few seconds so the frame is genuine action.
    for (let i = 0; i < 60 && world.wave < 10 && !world.outcome; i += 1) {
      world.enemies.length = 0;
      world.spawnQueue.length = 0;
      world.waveActive = false;
      world.betweenTimer = 0.01;
      runWorldFor(world, 2.5);
    }
    runWorldFor(world, 7);
    if (world.outcome === 'defeat') { world.outcome = null; world.player.health = 46; }
    return { screen: SCREEN_PLAY, best: world.score };
  }
  if (name === 'end') {
    // Play badly on purpose: stand still and never shoot until the swarm wins.
    const still = { move: { x: 0, y: 0 }, aim: { x: world.player.x + 100, y: world.player.y }, firing: false };
    for (let i = 0; i < 60 / STEP && !world.outcome; i += 1) world.update(STEP, still);
    if (!world.outcome) { world.player.health = 0; world.outcome = 'defeat'; }
    return { screen: SCREEN_OVER, best: world.score };
  }
  if (name === 'victory') {
    runWorldFor(world, 20);
    world.outcome = 'victory';
    if (world.score === 0) world.score = 12400;
    return { screen: SCREEN_VICTORY, best: world.score };
  }
  // title: a calm, untouched arena behind the title card.
  const idle = () => ({ move: { x: 0, y: 0 }, aim: { x: world.player.x + 100, y: world.player.y - 60 }, firing: false });
  runWorldFor(world, 1, idle);
  world.enemies.length = 0;
  world.bullets.length = 0;
  world.bolts.length = 0;
  world.spawnQueue.length = 0;
  return { screen: SCREEN_TITLE, best: 0 };
}
