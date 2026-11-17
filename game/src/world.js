// Game world simulation: player movement and firing, spawning, bullets, enemy bolts,
// power-ups, collisions, combo scoring, screen shake and win/lose state.
// No rendering and no audio here — update() returns event flags main.js turns into sound.

import { COMBO, FIELD, PLAYER, TOTAL_WAVES } from './config.js';
import { createEnemy, updateEnemy } from './enemies.js';
import { createWavePlan, isFinalWave, waveHealthScale, waveSpawnInterval } from './waves.js';
import { ParticleSystem } from './particles.js';

export const EVENT_SHOOT = 1;
export const EVENT_ENEMY_HIT = 2;
export const EVENT_EXPLOSION = 4;
export const EVENT_PLAYER_HIT = 8;
export const EVENT_POWERUP = 16;
export const EVENT_WAVE_START = 32;
export const EVENT_VICTORY = 64;
export const EVENT_GAME_OVER = 128;

const POWERUP_KINDS = ['rapid', 'shield', 'health', 'triple'];
const POWERUP_SECONDS = 8;

export class GameWorld {
  constructor() {
    this.particles = new ParticleSystem();
    this.reset();
  }

  reset() {
    this.player = {
      x: FIELD.width / 2, y: FIELD.height / 2,
      vx: 0, vy: 0, angle: -Math.PI / 2,
      health: PLAYER.maxHealth, radius: PLAYER.radius,
      fireTimer: 0, invulnerableTimer: 0,
      rapidTimer: 0, tripleTimer: 0, shieldTimer: 0,
    };
    this.enemies = [];
    this.bullets = [];
    this.bolts = [];
    this.powerups = [];
    this.particles.clear();
    this.score = 0;
    this.kills = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.betweenTimer = 1.2;
    this.waveActive = false;
    this.shake = 0;
    this.time = 0;
    this.outcome = null; // 'victory' | 'defeat'
    this.bossSpawned = false;
  }

  startNextWave(events) {
    this.wave += 1;
    this.spawnQueue = createWavePlan(this.wave);
    this.spawnTimer = 0.2;
    this.waveActive = true;
    this.bossSpawned = this.spawnQueue.includes('boss') ? false : this.bossSpawned;
    return events | EVENT_WAVE_START;
  }

  spawnPosition() {
    // Spawn on the arena edges, never on top of the player.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const side = Math.floor(Math.random() * 4);
      const x = side === 0 ? 30 : side === 1 ? FIELD.width - 30 : 40 + Math.random() * (FIELD.width - 80);
      const y = side === 2 ? 30 : side === 3 ? FIELD.height - 30 : 40 + Math.random() * (FIELD.height - 80);
      if (Math.hypot(x - this.player.x, y - this.player.y) > 190) return { x, y };
    }
    return { x: 40, y: 40 };
  }

  spawnEnemy(kind) {
    const { x, y } = this.spawnPosition();
    const enemy = createEnemy(kind, x, y, waveHealthScale(this.wave));
    if (kind === 'boss') this.bossSpawned = true;
    this.enemies.push(enemy);
  }

  spawnBolt(enemy, target, angleOffset = 0) {
    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x) + angleOffset;
    this.bolts.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 235, vy: Math.sin(angle) * 235, radius: 5, age: 0 });
  }

  maybeDropPowerup(x, y) {
    if (Math.random() > 0.16) return;
    const kind = POWERUP_KINDS[Math.floor(Math.random() * POWERUP_KINDS.length)];
    this.powerups.push({ x, y, kind, radius: 11, age: 0 });
  }

  applyPowerup(kind) {
    if (kind === 'rapid') this.player.rapidTimer = POWERUP_SECONDS;
    else if (kind === 'triple') this.player.tripleTimer = POWERUP_SECONDS;
    else if (kind === 'shield') this.player.shieldTimer = POWERUP_SECONDS;
    else if (kind === 'health') this.player.health = Math.min(PLAYER.maxHealth, this.player.health + 30);
  }

  registerKill(enemy) {
    this.comboCount += 1;
    this.comboTimer = COMBO.windowSeconds;
    this.multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(this.comboCount / 4));
    const gained = enemy.score * this.multiplier;
    this.score += gained;
    this.kills += 1;
    this.particles.spawnFloatingText(enemy.x, enemy.y - 10, `+${gained}`, '#ffe066');
  }

  damagePlayer(amount, events) {
    if (this.player.invulnerableTimer > 0 || this.outcome) return events;
    if (this.player.shieldTimer > 0) {
      this.player.invulnerableTimer = 0.5;
      this.particles.spawnExplosion(this.player.x, this.player.y, '#6ab8ff', 8, 160);
      return events | EVENT_ENEMY_HIT;
    }
    this.player.health -= amount;
    this.player.invulnerableTimer = PLAYER.invulnerableSeconds;
    this.shake = Math.min(14, this.shake + 9);
    this.particles.spawnExplosion(this.player.x, this.player.y, '#ff5470', 14, 240);
    if (this.player.health <= 0) {
      this.player.health = 0;
      this.outcome = 'defeat';
      return events | EVENT_PLAYER_HIT | EVENT_GAME_OVER;
    }
    return events | EVENT_PLAYER_HIT;
  }

  fireBullets() {
    const player = this.player;
    const angles = player.tripleTimer > 0
      ? [player.angle - 0.16, player.angle, player.angle + 0.16]
      : [player.angle];
    for (const angle of angles) {
      this.bullets.push({
        x: player.x + Math.cos(player.angle) * 18,
        y: player.y + Math.sin(player.angle) * 18,
        vx: Math.cos(angle) * PLAYER.bulletSpeed,
        vy: Math.sin(angle) * PLAYER.bulletSpeed,
        radius: 4, damage: PLAYER.bulletDamage, age: 0,
      });
    }
  }

  update(dt, control) {
    let events = 0;
    if (this.outcome) { this.particles.update(dt); return events; }
    this.time += dt;
    const player = this.player;

    // Combo decay.
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) { this.comboCount = 0; this.multiplier = 1; } }

    // Player movement and aim.
    const move = control.move;
    player.vx = move.x * PLAYER.speed;
    player.vy = move.y * PLAYER.speed;
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y + player.vy * dt));
    player.angle = Math.atan2(control.aim.y - player.y, control.aim.x - player.x);
    if (move.x !== 0 || move.y !== 0) this.particles.spawnTrail(player.x - Math.cos(player.angle) * 14, player.y - Math.sin(player.angle) * 14, 'rgba(87,247,255,0.7)');

    // Timers.
    for (const key of ['invulnerableTimer', 'rapidTimer', 'tripleTimer', 'shieldTimer']) {
      if (player[key] > 0) player[key] -= dt;
    }

    // Firing.
    player.fireTimer -= dt;
    if (control.firing && player.fireTimer <= 0) {
      this.fireBullets();
      player.fireTimer = player.rapidTimer > 0 ? PLAYER.fireInterval * 0.45 : PLAYER.fireInterval;
      events |= EVENT_SHOOT;
    }

    // Wave flow.
    if (!this.waveActive) {
      this.betweenTimer -= dt;
      if (this.betweenTimer <= 0) events = this.startNextWave(events);
    } else if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy(this.spawnQueue.shift());
        this.spawnTimer = waveSpawnInterval(this.wave);
      }
    } else if (this.enemies.length === 0) {
      if (isFinalWave(this.wave)) {
        this.outcome = 'victory';
        events |= EVENT_VICTORY;
      } else {
        this.waveActive = false;
        this.betweenTimer = 2.4;
        this.score += 250 * this.wave; // wave clear bonus
      }
    }

    // Enemies.
    for (const enemy of this.enemies) updateEnemy(enemy, player, dt, (e, t, off) => this.spawnBolt(e, t, off));
    for (const enemy of this.enemies) {
      enemy.x = Math.min(FIELD.width - enemy.radius, Math.max(enemy.radius, enemy.x));
      enemy.y = Math.min(FIELD.height - enemy.radius, Math.max(enemy.radius, enemy.y));
    }

    // Bullets vs enemies.
    for (const bullet of this.bullets) { bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.age += dt; }
    for (const bolt of this.bolts) { bolt.x += bolt.vx * dt; bolt.y += bolt.vy * dt; bolt.age += dt; }
    const deadEnemies = new Set();
    for (const bullet of this.bullets) {
      if (bullet.age > 1.2) continue;
      for (const enemy of this.enemies) {
        if (deadEnemies.has(enemy)) continue;
        if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < bullet.radius + enemy.radius) {
          bullet.age = 99;
          enemy.health -= bullet.damage;
          enemy.hitFlash = 0.09;
          events |= EVENT_ENEMY_HIT;
          if (enemy.health <= 0) {
            deadEnemies.add(enemy);
            this.registerKill(enemy);
            this.maybeDropPowerup(enemy.x, enemy.y);
            this.particles.spawnExplosion(enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 42 : 16, 300);
            this.shake = Math.min(12, this.shake + (enemy.kind === 'tank' || enemy.kind === 'boss' ? 7 : 3));
            events |= EVENT_EXPLOSION;
          }
          break;
        }
      }
    }
    this.enemies = this.enemies.filter((enemy) => !deadEnemies.has(enemy));
    this.bullets = this.bullets.filter((bullet) => bullet.age <= 1.2 && bullet.x > -20 && bullet.x < FIELD.width + 20 && bullet.y > -20 && bullet.y < FIELD.height + 20);
    this.bolts = this.bolts.filter((bolt) => bolt.age < 5 && bolt.x > -20 && bolt.x < FIELD.width + 20 && bolt.y > -20 && bolt.y < FIELD.height + 20);

    // Enemy contact and bolts vs player.
    for (const enemy of this.enemies) {
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.radius + player.radius) {
        events = this.damagePlayer(enemy.damage, events);
        enemy.health -= 2; // ramming hurts the enemy too
        if (enemy.health <= 0 && !deadEnemies.has(enemy)) {
          deadEnemies.add(enemy);
          this.enemies = this.enemies.filter((candidate) => candidate !== enemy);
          this.particles.spawnExplosion(enemy.x, enemy.y, enemy.color, 14, 260);
        }
        if (this.outcome) break;
      }
    }
    for (const bolt of this.bolts) {
      if (Math.hypot(bolt.x - player.x, bolt.y - player.y) < bolt.radius + player.radius) {
        bolt.age = 99;
        events = this.damagePlayer(8, events);
        if (this.outcome) break;
      }
    }
    this.bolts = this.bolts.filter((bolt) => bolt.age < 5);

    // Power-ups.
    for (const powerup of this.powerups) powerup.age += dt;
    this.powerups = this.powerups.filter((powerup) => powerup.age < 14);
    for (const powerup of [...this.powerups]) {
      if (Math.hypot(powerup.x - player.x, powerup.y - player.y) < powerup.radius + player.radius + 4) {
        this.applyPowerup(powerup.kind);
        this.particles.spawnFloatingText(player.x, player.y - 24, powerup.kind.toUpperCase() + '!', '#3dff8f');
        this.powerups = this.powerups.filter((candidate) => candidate !== powerup);
        events |= EVENT_POWERUP;
      }
    }

    if (this.shake > 0) this.shake = Math.max(0, this.shake - 42 * dt);
    this.particles.update(dt);
    return events;
  }

  enemiesRemaining() { return this.spawnQueue.length + this.enemies.length; }
  totalWaves() { return TOTAL_WAVES; }
}
