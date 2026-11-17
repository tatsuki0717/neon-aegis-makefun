// Enemy definitions and behaviours. Four kinds, each moving a different way:
// chaser steers straight at the player, weaver sine-weaves while closing in,
// dasher waits then lunges in a straight burst, tank crawls slowly with heavy armour
// and fires aimed bolts. The wave-10 boss is a tank-scaled Sentinel Core.

import { COLORS } from './config.js';

export const ENEMY_KINDS = {
  chaser: { radius: 15, health: 2, speed: 118, score: 100, damage: 12, color: COLORS.chaser },
  weaver: { radius: 14, health: 2, speed: 96, score: 150, damage: 12, color: COLORS.weaver },
  dasher: { radius: 13, health: 1, speed: 70, score: 200, damage: 10, color: COLORS.dasher },
  tank: { radius: 26, health: 9, speed: 42, score: 400, damage: 20, color: COLORS.tank },
  boss: { radius: 46, health: 60, speed: 30, score: 3000, damage: 25, color: COLORS.boss },
};

let nextEnemyId = 1;

export function createEnemy(kind, x, y, healthScale = 1) {
  const base = ENEMY_KINDS[kind];
  return {
    id: nextEnemyId++,
    kind, x, y,
    vx: 0, vy: 0,
    radius: base.radius,
    health: Math.round(base.health * healthScale),
    maxHealth: Math.round(base.health * healthScale),
    speed: base.speed,
    score: base.score,
    damage: base.damage,
    color: base.color,
    age: 0,
    phase: Math.random() * Math.PI * 2,
    dashState: 'stalk', // dasher only: stalk -> telegraph -> lunge -> recover
    dashTimer: 0.8 + Math.random() * 0.8,
    dashAngle: 0,
    shootTimer: 1.4 + Math.random(),
    hitFlash: 0,
  };
}

function steerToward(enemy, target, speed, dt, turn = 6) {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  const wantedVx = (dx / distance) * speed;
  const wantedVy = (dy / distance) * speed;
  const blend = Math.min(1, turn * dt);
  enemy.vx += (wantedVx - enemy.vx) * blend;
  enemy.vy += (wantedVy - enemy.vy) * blend;
}

export function updateChaser(enemy, player, dt) {
  steerToward(enemy, player, enemy.speed, dt);
}

export function updateWeaver(enemy, player, dt) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  const forwardX = dx / distance;
  const forwardY = dy / distance;
  const weave = Math.sin(enemy.age * 5 + enemy.phase) * 0.85;
  const vx = (forwardX + -forwardY * weave) * enemy.speed;
  const vy = (forwardY + forwardX * weave) * enemy.speed;
  enemy.vx += (vx - enemy.vx) * Math.min(1, 5 * dt);
  enemy.vy += (vy - enemy.vy) * Math.min(1, 5 * dt);
}

export function updateDasher(enemy, player, dt) {
  enemy.dashTimer -= dt;
  if (enemy.dashState === 'stalk') {
    steerToward(enemy, player, enemy.speed, dt);
    if (enemy.dashTimer <= 0) { enemy.dashState = 'telegraph'; enemy.dashTimer = 0.35; }
  } else if (enemy.dashState === 'telegraph') {
    enemy.vx *= 0.8; enemy.vy *= 0.8;
    const dx = player.x - enemy.x; const dy = player.y - enemy.y;
    enemy.dashAngle = Math.atan2(dy, dx);
    if (enemy.dashTimer <= 0) { enemy.dashState = 'lunge'; enemy.dashTimer = 0.42; }
  } else if (enemy.dashState === 'lunge') {
    enemy.vx = Math.cos(enemy.dashAngle) * 430;
    enemy.vy = Math.sin(enemy.dashAngle) * 430;
    if (enemy.dashTimer <= 0) { enemy.dashState = 'recover'; enemy.dashTimer = 0.5; }
  } else {
    enemy.vx *= 0.86; enemy.vy *= 0.86;
    if (enemy.dashTimer <= 0) { enemy.dashState = 'stalk'; enemy.dashTimer = 0.7 + Math.random() * 0.7; }
  }
}

export function updateTank(enemy, player, dt, spawnBolt) {
  steerToward(enemy, player, enemy.speed, dt, 2.5);
  enemy.shootTimer -= dt;
  if (enemy.shootTimer <= 0) {
    enemy.shootTimer = enemy.kind === 'boss' ? 1.1 : 1.9;
    spawnBolt(enemy, player);
    if (enemy.kind === 'boss') { spawnBolt(enemy, player, 0.35); spawnBolt(enemy, player, -0.35); }
  }
}

export function updateEnemy(enemy, player, dt, spawnBolt) {
  enemy.age += dt;
  if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
  if (enemy.kind === 'chaser') updateChaser(enemy, player, dt);
  else if (enemy.kind === 'weaver') updateWeaver(enemy, player, dt);
  else if (enemy.kind === 'dasher') updateDasher(enemy, player, dt);
  else updateTank(enemy, player, dt, spawnBolt);
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
}
