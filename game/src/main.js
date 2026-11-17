// Neon Aegis — boot and the main loop. Fixed-step simulation (1/60 s), screen state
// machine (title -> play <-> paused -> game over / victory), sound from world events,
// and the ?shot= staging mode the screenshots are taken with.

import { BEST_KEY, STEP } from './config.js';
import { GameWorld, EVENT_EXPLOSION, EVENT_GAME_OVER, EVENT_PLAYER_HIT, EVENT_POWERUP, EVENT_SHOOT, EVENT_VICTORY, EVENT_WAVE_START, EVENT_ENEMY_HIT } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, Input } from './input.js';
import { Renderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';
import { SoundEngine } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = new Renderer(canvas);
const world = new GameWorld();
const sound = new SoundEngine();
const input = new Input(canvas, (x, y) => renderer.toArenaPoint(x, y));

window.addEventListener('resize', () => renderer.resize());

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}

function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage may be unavailable */ }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best, false);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) { status.textContent = message; }

  function startGame() {
    sound.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Wave 1 incoming.');
  }

  function finishRun() {
    if (world.score > best) { best = world.score; saveBest(best); }
    screen = world.outcome === 'victory' ? SCREEN_VICTORY : SCREEN_OVER;
    announce(world.outcome === 'victory' ? `Victory. Score ${world.score}.` : `Game over. Score ${world.score}.`);
  }

  function playEvents(events) {
    if (events & EVENT_SHOOT) sound.playShoot();
    if (events & EVENT_ENEMY_HIT) sound.playEnemyHit();
    if (events & EVENT_EXPLOSION) sound.playExplosion();
    if (events & EVENT_PLAYER_HIT) sound.playPlayerHit();
    if (events & EVENT_POWERUP) sound.playPowerup();
    if (events & EVENT_WAVE_START) sound.playWaveStart();
    if (events & EVENT_VICTORY) sound.playVictory();
    if (events & EVENT_GAME_OVER) sound.playGameOver();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) announce(sound.toggleMute() ? 'Sound off.' : 'Sound on.');
    if (actions & ACTION_CONFIRM) sound.unlock();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_VICTORY)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
    else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
  }

  function control() {
    return { move: input.movementVector(), aim: input.mouse, firing: input.isFiring() };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        const events = world.update(STEP, control());
        playEvents(events);
        accumulator -= STEP;
        if (world.outcome) finishRun();
      }
    } else {
      accumulator = 0;
      if (screen === SCREEN_TITLE) world.particles.update(STEP);
    }
    renderer.draw(world, screen, best, sound.muted);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  announce('Neon Aegis. Click or press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
