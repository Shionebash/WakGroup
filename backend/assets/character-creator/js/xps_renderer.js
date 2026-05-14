/**
 * XPS Particle System Renderer
 * Preview-focused Canvas 2D runtime for Wakfu aura effects.
 */

class XpsParticleSystem {
  constructor(xpsData, textureImg) {
    this.xpsData = xpsData || {};
    this.texture = textureImg;
    this.particles = [];
    this.time = 0;
    this.systemDuration = Math.max(0, (this.xpsData.duration_ms || 0) / 1000);
    this.emitterStates = this._buildEmitterStates(this.xpsData.emitters || []);
  }

  update(dt) {
    if (!(dt > 0)) return;

    if (this.systemDuration > 0) {
      const nextTime = this.time + dt;
      if (nextTime >= this.systemDuration) {
        this.reset(nextTime % this.systemDuration);
      } else {
        this.time = nextTime;
      }
    } else {
      this.time += dt;
    }

    const expired = [];

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.age += dt;
      particle.rotationVelocity = 0;
      particle.directionFollowsVelocity = false;
      this._applyAffectors(particle, dt);

      if (!particle.curve) {
        particle.pos[0] += particle.vel[0] * dt;
        particle.pos[1] += particle.vel[1] * dt;
        particle.pos[2] += particle.vel[2] * dt;
      }

      particle.angle += particle.rotationVelocity * dt * Math.PI / 180;
      if (particle.directionFollowsVelocity) {
        particle.angle = Math.atan2(particle.vel[1], particle.vel[0] || 0.0001);
      }

      particle.color[3] = Math.max(0, Math.min(1, particle.color[3]));
      if (particle.age >= particle.maxAge) {
        expired.push(particle);
        this.particles.splice(i, 1);
      }
    }

    for (const particle of expired) {
      this._spawnSubEmitters(particle);
    }

    const emitters = this.xpsData.emitters || [];
    for (let i = 0; i < emitters.length; i++) {
      this._spawnParticles(emitters[i], this.emitterStates[i], dt);
    }
  }

  render(ctx, cx, cy, characterHeight, pass = 'front') {
    if (!this.texture || !this.texture.complete) return;
    if (this.xpsData.behind_mobile && pass !== 'behind') return;
    if (!this.xpsData.behind_mobile && pass !== 'front') return;

    const scaleFactor = (characterHeight || 80) / 80;
    ctx.save();
    ctx.globalCompositeOperation = this.xpsData.src_blend === 1 ? 'lighter' : 'source-over';

    for (const particle of this.particles) {
      if (particle.color[3] <= 0) continue;

      const model = particle.model;
      const sx = cx + particle.pos[0] * scaleFactor;
      const sy = cy - particle.pos[1] * scaleFactor;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(particle.angle);
      ctx.scale(particle.scale[0] * scaleFactor, particle.scale[1] * scaleFactor);
      this._tintedDraw(ctx, model, particle.color[0], particle.color[1], particle.color[2], particle.color[3]);
      ctx.restore();
    }

    ctx.restore();
  }

  reset(nextTime = 0) {
    this.particles = [];
    this.time = nextTime;
    this.emitterStates = this._buildEmitterStates(this.xpsData.emitters || []);
  }

  _buildEmitterStates(emitters) {
    return emitters.map(emitter => ({
      spawnAccumulator: 0,
      nextSpawnDelay: this._randomSpawnInterval(emitter),
      subEmitterStates: this._buildEmitterStates(emitter.sub_emitters || []),
    }));
  }

  _spawnParticles(emitter, state, dt, anchor = null) {
    if (!emitter || !state) return;

    const startTime = emitter.start_spawn_time || 0;
    const rawEndTime = emitter.end_spawn_time || 0;
    const endTime = rawEndTime > 0 ? rawEndTime : Infinity;
    if (this.time < startTime || this.time > endTime) return;

    state.spawnAccumulator += dt;
    while (state.spawnAccumulator >= state.nextSpawnDelay) {
      state.spawnAccumulator -= state.nextSpawnDelay;
      state.nextSpawnDelay = this._randomSpawnInterval(emitter);

      const maxPerSpawn = Math.max(1, emitter.max_per_spawn || 1);
      const spawnCount = this._randomSpawnCount(maxPerSpawn);
      for (let i = 0; i < spawnCount; i++) {
        if (this.particles.length >= (emitter.max_particles || 100)) {
          return;
        }
        this._createParticle(emitter, state, anchor);
      }
    }
  }

  _spawnSubEmitters(particle) {
    const subEmitters = particle.emitter?.sub_emitters || [];
    const subStates = particle.emitterState?.subEmitterStates || [];
    for (let i = 0; i < subEmitters.length; i++) {
      const subEmitter = subEmitters[i];
      const subState = subStates[i];
      if (!subEmitter || !subState) continue;

      const maxPerSpawn = Math.max(1, subEmitter.max_per_spawn || 1);
      const spawnCount = this._randomSpawnCount(maxPerSpawn);
      for (let count = 0; count < spawnCount; count++) {
        if (this.particles.length >= (subEmitter.max_particles || 100)) {
          return;
        }
        this._createParticle(subEmitter, subState, particle);
      }
    }
  }

  _createParticle(emitter, emitterState, anchor) {
    const model = this._pickModel(emitter.models);
    if (!model) return;

    const anchorPos = anchor?.pos || [0, 0, 0];
    const anchorVel = anchor?.vel || [0, 0, 0];
    const vel = [
      (emitter.velocity_x || 0) + this._randCentered(emitter.velocity_random_x || 0),
      (emitter.velocity_y || 0) + this._randCentered(emitter.velocity_random_y || 0),
      (emitter.velocity_z || 0) + this._randCentered(emitter.velocity_random_z || 0),
    ];

    this.particles.push({
      emitter,
      emitterState,
      model,
      age: 0,
      maxAge: Math.max(0.01, (emitter.particle_lifetime || 1) + this._randCentered(emitter.particle_lifetime_random || 0)),
      pos: [
        anchorPos[0] + (emitter.offset_x || 0) + this._randCentered(emitter.offset_random_x || 0),
        anchorPos[1] + (emitter.offset_y || 0) + this._randCentered(emitter.offset_random_y || 0),
        anchorPos[2] + (emitter.offset_z || 0) + this._randCentered(emitter.offset_random_z || 0),
      ],
      vel: [
        vel[0] + (anchor ? anchorVel[0] : 0),
        vel[1] + (anchor ? anchorVel[1] : 0),
        vel[2] + (anchor ? anchorVel[2] : 0),
      ],
      scale: [
        (model.scale_x ?? 1) + this._randCentered(model.scale_random_x || 0),
        (model.scale_y ?? 1) + this._randCentered(model.scale_random_y || 0),
      ],
      color: [
        (model.red ?? 1) + this._randCentered(model.red_random || 0),
        (model.green ?? 1) + this._randCentered(model.green_random || 0),
        (model.blue ?? 1) + this._randCentered(model.blue_random || 0),
        (model.alpha ?? 1) + this._randCentered(model.alpha_random || 0),
      ],
      angle: ((model.rotation || 0) + this._randCentered(model.rotation_random || 0)) * Math.PI / 180,
      rotationVelocity: 0,
      directionFollowsVelocity: false,
      curve: null,
    });
  }

  _passesConditions(aff, particle) {
    if (!Array.isArray(aff.conditions) || aff.conditions.length === 0) return true;
    for (const cond of aff.conditions) {
      if (cond.type === 'LifeCondition') {
        if (particle.age < (cond.min || 0) || particle.age > (cond.max || Infinity)) return false;
      }
    }
    return true;
  }

  _applyAffectors(particle, dt) {
    const emitter = particle.emitter;
    if (!emitter || !Array.isArray(emitter.affectors)) return;

    for (const aff of emitter.affectors) {
      if (!aff || aff.skipped) continue;
      if (!this._passesConditions(aff, particle)) continue;

      switch (aff.type) {
        case 'ColorFader': {
          const fadeStep = (aff.speed || 0) * dt;
          particle.color[0] += (aff.red || 0) * fadeStep;
          particle.color[1] += (aff.green || 0) * fadeStep;
          particle.color[2] += (aff.blue || 0) * fadeStep;
          particle.color[3] += (aff.alpha || 0) * fadeStep;
          break;
        }
        case 'BoostForce':
          particle.vel[0] += (aff.x || 0) * dt;
          particle.vel[1] += (aff.y || 0) * dt;
          particle.vel[2] += (aff.z || 0) * dt;
          break;
        case 'LinearForce':
          particle.vel[0] += (aff.force_x || 0) * dt;
          particle.vel[1] += (aff.force_y || 0) * dt;
          particle.vel[2] += (aff.force_z || 0) * dt;
          break;
        case 'FrictionalForce': {
          const friction = Math.max(0, 1 - (aff.friction || 0) * dt);
          particle.vel[0] *= friction;
          particle.vel[1] *= friction;
          particle.vel[2] *= friction;
          break;
        }
        case 'Rotation':
          particle.rotationVelocity += (aff.angle_z || aff.angle_x || 0);
          break;
        case 'RotationInterpolation':
          particle.rotationVelocity += (aff.angle_z || aff.angle_x || 0);
          break;
        case 'Deformer':
          particle.scale[0] += (aff.growth_x || 0) * dt;
          particle.scale[1] += (aff.growth_y || 0) * dt;
          particle.angle += (aff.angle || 0) * dt;
          break;
        case 'CirclePath': {
          const radialSpeed = (aff.radial_speed || 0) * dt;
          const x = particle.pos[0];
          const z = particle.pos[2];
          particle.vel[0] = -z * radialSpeed;
          particle.vel[2] = x * radialSpeed;
          break;
        }
        case 'RotorForce': {
          const angle = (aff.speed || 0) * dt;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const px = particle.pos[0];
          const pz = particle.pos[2];
          particle.pos[0] = px * cos - pz * sin;
          particle.pos[2] = px * sin + pz * cos;
          break;
        }
        case 'AttractionForce': {
          const dx = this._resolveAttractionAxis(aff.offset_x, aff.attraction_x) - particle.pos[0];
          const dy = this._resolveAttractionAxis(aff.offset_y, aff.attraction_y) - particle.pos[1];
          const dz = this._resolveAttractionAxis(aff.offset_z, aff.attraction_z) - particle.pos[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001;
          const attractSpeed = aff.intensity || aff.speed || 0;
          particle.vel[0] += (dx / dist) * attractSpeed * dt;
          particle.vel[1] += (dy / dist) * attractSpeed * dt;
          particle.vel[2] += (dz / dist) * attractSpeed * dt;
          break;
        }
        case 'DirectionFollower':
          particle.directionFollowsVelocity = true;
          break;
        case 'Curve':
          particle.curve = aff;
          break;
        case 'Rebound':
          this._applyRebound(particle, aff);
          break;
        case 'LightRadiusDeformer':
          break;
        default:
          break;
      }
    }

    if (particle.curve) {
      const t = Math.max(0, Math.min(1, particle.age / particle.maxAge));
      this._applyCurve(particle, particle.curve, t);
    }
  }

  _resolveAttractionAxis(primary, secondary) {
    if (typeof primary === 'number') return primary;
    if (typeof secondary === 'number') return secondary;
    return 0;
  }

  _applyCurve(particle, curve, t) {
    const p0 = curve.start_pos || [0, 0, 0];
    const p1 = [
      p0[0] + (curve.start_vel?.[0] || 0),
      p0[1] + (curve.start_vel?.[1] || 0),
      p0[2] + (curve.start_vel?.[2] || 0),
    ];
    const p3 = curve.end_pos || p0;
    const p2 = [
      p3[0] - (curve.end_vel?.[0] || 0),
      p3[1] - (curve.end_vel?.[1] || 0),
      p3[2] - (curve.end_vel?.[2] || 0),
    ];

    particle.pos[0] = this._cubicBezier(p0[0], p1[0], p2[0], p3[0], t);
    particle.pos[1] = this._cubicBezier(p0[1], p1[1], p2[1], p3[1], t);
    particle.pos[2] = this._cubicBezier(p0[2], p1[2], p2[2], p3[2], t);
  }

  _cubicBezier(a, b, c, d, t) {
    const mt = 1 - t;
    return (
      mt * mt * mt * a +
      3 * mt * mt * t * b +
      3 * mt * t * t * c +
      t * t * t * d
    );
  }

  _applyRebound(particle, aff) {
    this._reboundAxis(particle.pos, particle.vel, 0, aff.min_x, aff.max_x, aff.restitution_x);
    this._reboundAxis(particle.pos, particle.vel, 1, aff.min_y, aff.max_y, aff.restitution_y);
    this._reboundAxis(particle.pos, particle.vel, 2, aff.min_z, aff.max_z, aff.restitution_z);
  }

  _reboundAxis(pos, vel, axis, min, max, restitution) {
    if (typeof min === 'number' && pos[axis] < min) {
      pos[axis] = min;
      vel[axis] = Math.abs(vel[axis]) * (restitution || 0);
    }
    if (typeof max === 'number' && pos[axis] > max) {
      pos[axis] = max;
      vel[axis] = -Math.abs(vel[axis]) * (restitution || 0);
    }
  }

  _randomSpawnCount(maxPerSpawn) {
    if (maxPerSpawn <= 1) return 1;
    return 1 + Math.floor(Math.random() * maxPerSpawn);
  }

  _randomSpawnInterval(emitter) {
    const base = emitter.spawn_frequency > 0 ? emitter.spawn_frequency : Infinity;
    if (!Number.isFinite(base)) return Infinity;
    const jitter = Math.max(0, emitter.spawn_frequency_random || 0) * Math.random();
    return Math.max(0.001, base + jitter);
  }

  _pickModel(models) {
    if (!Array.isArray(models) || models.length === 0) return null;
    return models[Math.floor(Math.random() * models.length)] || null;
  }

  _tintedDraw(ctx, model, r, g, b, a) {
    const halfW = model.half_width || 16;
    const halfH = model.half_height || 16;
    const srcX = (model.tex_left || 0) * this.texture.width;
    const srcY = (model.tex_top || 0) * this.texture.height;
    const srcW = ((model.tex_right || 1) - (model.tex_left || 0)) * this.texture.width;
    const srcH = ((model.tex_bottom || 1) - (model.tex_top || 0)) * this.texture.height;
    const dw = halfW * 2;
    const dh = halfH * 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (r >= 0.95 && g >= 0.95 && b >= 0.95) {
      ctx.globalAlpha = a;
      ctx.drawImage(this.texture, srcX, srcY, srcW, srcH, -halfW, -halfH, dw, dh);
      return;
    }

    if (!this._oc) {
      this._oc = document.createElement('canvas');
      this._ox = this._oc.getContext('2d');
    }
    if (this._oc.width < dw) this._oc.width = dw;
    if (this._oc.height < dh) this._oc.height = dh;
    const ox = this._ox;
    ox.imageSmoothingEnabled = true;
    ox.imageSmoothingQuality = 'high';
    ox.clearRect(0, 0, dw, dh);

    ox.globalCompositeOperation = 'source-over';
    ox.globalAlpha = 1;
    ox.drawImage(this.texture, srcX, srcY, srcW, srcH, 0, 0, dw, dh);

    ox.globalCompositeOperation = 'multiply';
    ox.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    ox.fillRect(0, 0, dw, dh);

    ox.globalCompositeOperation = 'destination-in';
    ox.drawImage(this.texture, srcX, srcY, srcW, srcH, 0, 0, dw, dh);
    ox.globalCompositeOperation = 'source-over';

    ctx.globalAlpha = a;
    ctx.drawImage(this._oc, 0, 0, dw, dh, -halfW, -halfH, dw, dh);
  }

  _randCentered(amount) {
    return amount ? amount * (Math.random() - 0.5) : 0;
  }
}

if (typeof window !== 'undefined') {
  window.XpsParticleSystem = XpsParticleSystem;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { XpsParticleSystem };
}
