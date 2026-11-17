// Canvas renderer: arena, player drone, enemies, bullets, particles and every screen —
// play HUD, title, pause, game over and victory. Logical space is FIELD (960x640),
// scaled to fit the window with a letterbox and an optional screen-shake offset.

import { COLORS, FIELD, PLAYER, TOTAL_WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.dpr = dpr;
    this.scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    this.offsetX = (window.innerWidth - FIELD.width * this.scale) / 2;
    this.offsetY = (window.innerHeight - FIELD.height * this.scale) / 2;
  }

  toArenaPoint(clientX, clientY) {
    return {
      x: (clientX - this.offsetX) / this.scale,
      y: (clientY - this.offsetY) / this.scale,
    };
  }

  begin(world) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    const shakeX = world.shake ? (Math.random() - 0.5) * world.shake : 0;
    const shakeY = world.shake ? (Math.random() - 0.5) * world.shake : 0;
    ctx.translate(this.offsetX + shakeX * this.scale, this.offsetY + shakeY * this.scale);
    ctx.scale(this.scale, this.scale);
  }

  drawArena(world) {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, 80, FIELD.width / 2, FIELD.height / 2, 620);
    gradient.addColorStop(0, '#0a1230');
    gradient.addColorStop(1, '#05070f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.height); ctx.stroke(); }
    for (let y = 0; y <= FIELD.height; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(87, 247, 255, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, FIELD.width - 3, FIELD.height - 3);
  }

  drawPlayer(world) {
    const ctx = this.ctx;
    const player = world.player;
    if (player.invulnerableTimer > 0 && Math.floor(world.time * 18) % 2 === 0 && world.outcome !== 'defeat') return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    if (player.shieldTimer > 0) {
      ctx.strokeStyle = COLORS.shield;
      ctx.globalAlpha = 0.75 + Math.sin(world.time * 6) * 0.2;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(19, 0); ctx.lineTo(-12, 11); ctx.lineTo(-7, 0); ctx.lineTo(-12, -11); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.playerCore;
    ctx.beginPath(); ctx.arc(2, 0, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawEnemy(enemy, world) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const flash = enemy.hitFlash > 0;
    ctx.fillStyle = flash ? '#ffffff' : enemy.color;
    ctx.strokeStyle = flash ? '#ffffff' : enemy.color;
    if (enemy.kind === 'chaser') {
      ctx.rotate(Math.atan2(enemy.vy, enemy.vx));
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-11, 10); ctx.lineTo(-6, 0); ctx.lineTo(-11, -10); ctx.closePath(); ctx.fill();
    } else if (enemy.kind === 'weaver') {
      ctx.rotate(enemy.age * 3);
      ctx.beginPath();
      for (let i = 0; i < 4; i += 1) { ctx.rotate(Math.PI / 2); ctx.moveTo(0, 0); ctx.lineTo(5, -5); ctx.lineTo(15, 0); ctx.lineTo(5, 5); }
      ctx.fill();
    } else if (enemy.kind === 'dasher') {
      const angle = enemy.dashState === 'stalk' ? Math.atan2(enemy.vy, enemy.vx) : enemy.dashAngle;
      ctx.rotate(angle);
      if (enemy.dashState === 'telegraph') { ctx.shadowColor = enemy.color; ctx.shadowBlur = 16; }
      ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-10, 7); ctx.lineTo(-13, 0); ctx.lineTo(-10, -7); ctx.closePath(); ctx.fill();
    } else { // tank and boss: heavy hexagon with a core
      ctx.rotate(enemy.age * 0.7);
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        const px = Math.cos(angle) * enemy.radius; const py = Math.sin(angle) * enemy.radius;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a0510';
      ctx.beginPath(); ctx.arc(0, 0, enemy.radius * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? '#ffffff' : '#ffd166';
      ctx.beginPath(); ctx.arc(0, 0, enemy.radius * 0.22, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (enemy.maxHealth > 2 && enemy.health < enemy.maxHealth) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, enemy.radius * 2, 4);
      ctx.fillStyle = '#3dff8f';
      ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, enemy.radius * 2 * (enemy.health / enemy.maxHealth), 4);
    }
  }

  drawEntities(world) {
    const ctx = this.ctx;
    for (const powerup of world.powerups) this.drawPowerup(powerup, world);
    for (const enemy of world.enemies) this.drawEnemy(enemy, world);
    ctx.fillStyle = '#ff8fa3';
    for (const bolt of world.bolts) { ctx.beginPath(); ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = COLORS.bullet;
    for (const bullet of world.bullets) { ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2); ctx.fill(); }
    if (world.outcome !== 'defeat') this.drawPlayer(world);
    for (const particle of world.particles.particles) {
      ctx.globalAlpha = 1 - particle.age / particle.life;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const text of world.particles.texts) {
      ctx.globalAlpha = 1 - text.age / text.life;
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.globalAlpha = 1;
  }

  drawPowerup(powerup, world) {
    const ctx = this.ctx;
    const colors = { rapid: COLORS.powerupRapid, shield: COLORS.powerupShield, health: COLORS.powerupHealth, triple: COLORS.powerupTriple };
    const labels = { rapid: 'R', shield: 'S', health: '+', triple: 'T' };
    const bob = Math.sin(world.time * 4 + powerup.age * 2) * 3;
    ctx.save();
    ctx.translate(powerup.x, powerup.y + bob);
    ctx.strokeStyle = colors[powerup.kind];
    ctx.fillStyle = 'rgba(5,10,24,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = colors[powerup.kind];
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(labels[powerup.kind], 0, 1);
    ctx.restore();
  }

  drawHud(world, muted) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(3, 6, 16, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, 52);
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`SCORE ${world.score}`, 16, 27);
    ctx.fillStyle = '#ffe066';
    ctx.fillText(`x${world.multiplier} COMBO`, 215, 27);
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${Math.max(1, world.wave)}/${TOTAL_WAVES}`, FIELD.width / 2, 27);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.dimText;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(`HOSTILES ${world.enemiesRemaining()}`, FIELD.width - 16, 20);
    ctx.fillText(muted ? 'SOUND OFF (M)' : 'SOUND ON (M)', FIELD.width - 16, 39);
    // Health bar.
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(340, 42, 280, 6);
    ctx.fillStyle = world.player.health > 30 ? COLORS.health : COLORS.danger;
    ctx.fillRect(340, 42, 280 * (world.player.health / PLAYER.maxHealth), 6);
    if (!world.waveActive && !world.outcome && world.wave > 0) {
      ctx.fillStyle = '#ffe066';
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`WAVE ${world.wave} CLEAR!`, FIELD.width / 2, 110);
    }
  }

  drawCentered(lines) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(3, 6, 16, 0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    let y = 170;
    for (const line of lines) {
      ctx.fillStyle = line.color || COLORS.text;
      ctx.font = `${line.weight || 700} ${line.size || 24}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(line.text, FIELD.width / 2, y);
      y += (line.gap || 40);
    }
  }

  drawTitle(world, best) {
    this.drawArena(world);
    this.drawEntities(world);
    this.drawCentered([
      { text: 'NEON AEGIS', size: 64, weight: 900, color: COLORS.player, gap: 62 },
      { text: 'ARENA SURVIVAL', size: 26, weight: 800, color: '#ffe066', gap: 58 },
      { text: 'Pilot the last Aegis drone. Survive all 10 waves', size: 21, color: COLORS.text, gap: 30 },
      { text: 'and destroy the Sentinel Core.', size: 21, color: COLORS.text, gap: 52 },
      { text: 'MOVE  WASD / Arrow Keys      AIM  Mouse', size: 19, color: COLORS.dimText, gap: 28 },
      { text: 'SHOOT  Click / Space      PAUSE  P      SOUND  M', size: 19, color: COLORS.dimText, gap: 52 },
      { text: 'Enemies:  Chasers hunt you · Weavers zigzag · Dashers lunge · Tanks shoot back', size: 16, color: COLORS.dimText, gap: 28 },
      { text: 'Grab power-ups:  R rapid fire · T triple shot · S shield · + repair', size: 16, color: COLORS.dimText, gap: 56 },
      { text: 'CLICK or press ENTER to launch', size: 24, weight: 800, color: '#3dff8f', gap: 44 },
      { text: best > 0 ? `BEST SCORE  ${best}` : '', size: 18, color: '#ffe066' },
    ]);
  }

  drawPause() {
    this.drawCentered([
      { text: 'PAUSED', size: 48, weight: 900, color: COLORS.player, gap: 60 },
      { text: 'Press P or ENTER to resume', size: 22, color: COLORS.text },
    ]);
  }

  drawGameOver(world, best) {
    this.drawCentered([
      { text: 'GAME OVER', size: 56, weight: 900, color: COLORS.danger, gap: 64 },
      { text: `The swarm overran the arena on Wave ${world.wave}`, size: 21, color: COLORS.text, gap: 54 },
      { text: `FINAL SCORE  ${world.score}`, size: 32, weight: 800, color: '#ffe066', gap: 40 },
      { text: `Kills ${world.kills}   ·   Best ${best}`, size: 20, color: COLORS.dimText, gap: 62 },
      { text: 'Press ENTER or click to try again', size: 23, weight: 800, color: '#3dff8f' },
    ]);
  }

  drawVictory(world, best) {
    this.drawCentered([
      { text: 'VICTORY!', size: 60, weight: 900, color: '#3dff8f', gap: 64 },
      { text: 'The Sentinel Core is destroyed — the arena is clear!', size: 21, color: COLORS.text, gap: 54 },
      { text: `FINAL SCORE  ${world.score}`, size: 32, weight: 800, color: '#ffe066', gap: 40 },
      { text: `Kills ${world.kills}   ·   Health left ${Math.round(world.player.health)}%   ·   Best ${best}`, size: 20, color: COLORS.dimText, gap: 62 },
      { text: 'Press ENTER or click to play again', size: 23, weight: 800, color: COLORS.player },
    ]);
  }

  draw(world, screen, best, muted) {
    this.begin(world);
    if (screen === SCREEN_TITLE) { this.drawTitle(world, best); return; }
    this.drawArena(world);
    this.drawEntities(world);
    this.drawHud(world, muted);
    if (screen === SCREEN_PAUSED) this.drawPause();
    else if (screen === SCREEN_OVER) this.drawGameOver(world, best);
    else if (screen === SCREEN_VICTORY) this.drawVictory(world, best);
  }
}
