// Particle system: explosion sparks, muzzle flashes, engine trail and floating score text.
// Pure simulation data here; render.js paints the particles this system produces.

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.texts = [];
  }

  clear() {
    this.particles.length = 0;
    this.texts.length = 0;
  }

  spawnExplosion(x, y, color, count = 16, speed = 260) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 40 + Math.random() * speed;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.35 + Math.random() * 0.4,
        age: 0,
        size: 2 + Math.random() * 3,
        color,
      });
    }
  }

  spawnTrail(x, y, color) {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
      life: 0.3, age: 0, size: 2.5, color,
    });
  }

  spawnFloatingText(x, y, text, color) {
    this.texts.push({ x, y, text, color, age: 0, life: 0.9 });
  }

  update(dt) {
    for (const particle of this.particles) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.92;
      particle.vy *= 0.92;
    }
    this.particles = this.particles.filter((particle) => particle.age < particle.life);
    for (const text of this.texts) { text.age += dt; text.y -= 34 * dt; }
    this.texts = this.texts.filter((text) => text.age < text.life);
  }
}
