// Neon Aegis tuning constants: arena size, player stats, combat numbers and colours.
// Every balance value lives here so the rest of the game reads as rules, not magic numbers.

export const FIELD = { width: 960, height: 640 };

export const PLAYER = {
  radius: 14,
  speed: 315,
  maxHealth: 100,
  fireInterval: 0.16,
  bulletSpeed: 640,
  bulletDamage: 1,
  invulnerableSeconds: 0.9,
};

export const COMBO = {
  windowSeconds: 2.6,
  maxMultiplier: 8,
};

export const TOTAL_WAVES = 10;

export const BEST_KEY = 'neon-aegis-best-score';

export const STEP = 1 / 60;

export const COLORS = {
  background: '#05070f',
  grid: 'rgba(64, 120, 220, 0.13)',
  player: '#57f7ff',
  playerCore: '#eaffff',
  bullet: '#ffe066',
  health: '#3dff8f',
  shield: '#6ab8ff',
  danger: '#ff5470',
  text: '#e8f4ff',
  dimText: '#8fb3d9',
  chaser: '#ff5470',
  weaver: '#ff9f43',
  dasher: '#c86bff',
  tank: '#ff3860',
  boss: '#ff2d78',
  powerupRapid: '#ffe066',
  powerupShield: '#6ab8ff',
  powerupHealth: '#3dff8f',
  powerupTriple: '#ff9fde',
};
